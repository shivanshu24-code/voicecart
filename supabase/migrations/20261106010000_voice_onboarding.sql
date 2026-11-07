-- Voice onboarding: conversations, AI usage records and daily quotas.
-- Owners can read their own sessions and messages. All writes go through the
-- backend, so conversation state and usage records can't be edited from a browser.

create table public.onboarding_sessions (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references public.shops (id) on delete cascade,
  owner_id       uuid not null references auth.users (id) on delete cascade,
  status         text not null default 'active' check (status in ('active', 'completed')),
  language       text not null default 'en',
  -- Draft only. Reaches shops/products/shop_hours after the owner reviews it.
  collected_data jsonb not null default '{}'::jsonb,
  consent_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index onboarding_one_active_per_shop
  on public.onboarding_sessions (shop_id) where status = 'active';
create index onboarding_sessions_owner_id_idx on public.onboarding_sessions (owner_id);

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.onboarding_sessions (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null check (char_length(content) <= 4000),
  created_at  timestamptz not null default now()
);

create index messages_session_id_idx on public.messages (session_id, created_at);

create table public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  shop_id       uuid references public.shops (id) on delete set null,
  provider      text not null,
  operation     text not null,
  input_tokens  integer,
  output_tokens integer,
  audio_bytes   integer,
  created_at    timestamptz not null default now()
);

create index ai_usage_user_id_idx on public.ai_usage (user_id, created_at);

create table public.ai_daily_quota (
  user_id   uuid not null references auth.users (id) on delete cascade,
  day       date not null default (now() at time zone 'Asia/Kolkata')::date,
  requests  integer not null default 1,
  primary key (user_id, day)
);

create trigger onboarding_sessions_set_updated_at before update on public.onboarding_sessions
  for each row execute function public.set_updated_at();

alter table public.onboarding_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_daily_quota enable row level security;

revoke all on public.onboarding_sessions, public.messages, public.ai_usage, public.ai_daily_quota
  from anon, authenticated;
grant select on public.onboarding_sessions, public.messages to authenticated;

create policy sessions_owner_select on public.onboarding_sessions for select to authenticated
  using (owner_id = (select auth.uid()));
create policy messages_owner_select on public.messages for select to authenticated
  using (exists (
    select 1 from public.onboarding_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

-- One atomic statement, so parallel requests can't slip past the limit.
create function public.consume_ai_quota(p_user uuid, p_limit integer) returns boolean
language plpgsql set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  insert into public.ai_daily_quota as q (user_id, day)
  values (p_user, v_today)
  on conflict (user_id, day) do update set requests = q.requests + 1
  where q.requests < p_limit;
  return found;
end;
$$;

-- Saves reviewed data in one transaction: it all lands, or none of it does.
create function public.commit_onboarding(p_session uuid, p_owner uuid, p_profile jsonb)
returns uuid
language plpgsql set search_path = '' as $$
declare
  v_shop uuid;
begin
  select shop_id into v_shop
  from public.onboarding_sessions
  where id = p_session and owner_id = p_owner and status = 'active'
  for update;

  if v_shop is null then
    raise exception 'session_not_active';
  end if;

  update public.shops set
    name = p_profile ->> 'name',
    category = p_profile ->> 'category',
    description = p_profile ->> 'description',
    phone = p_profile ->> 'phone',
    whatsapp = p_profile ->> 'whatsapp',
    address = p_profile ->> 'address',
    confirmed_fields = p_profile -> 'confirmed_fields'
  where id = v_shop and owner_id = p_owner;

  insert into public.products (shop_id, name, description, price_paise, unit, sort_order)
  select v_shop, p.name, p.description, p.price_paise, p.unit, p.sort_order
  from jsonb_to_recordset(p_profile -> 'products') as p (
    name text, description text, price_paise integer, unit text, sort_order integer
  )
  where not exists (
    select 1 from public.products e
    where e.shop_id = v_shop and lower(e.name) = lower(p.name)
  );

  if jsonb_array_length(p_profile -> 'hours') > 0 then
    delete from public.shop_hours where shop_id = v_shop;
    insert into public.shop_hours (shop_id, day_of_week, slot, open_time, close_time, is_closed)
    select v_shop, h.day_of_week, h.slot, h.open_time, h.close_time, h.is_closed
    from jsonb_to_recordset(p_profile -> 'hours') as h (
      day_of_week smallint, slot smallint, open_time time, close_time time, is_closed boolean
    );
  end if;

  update public.onboarding_sessions set status = 'completed' where id = p_session;

  return v_shop;
end;
$$;

revoke execute on function public.consume_ai_quota(uuid, integer) from public, anon, authenticated;
revoke execute on function public.commit_onboarding(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, integer) to service_role;
grant execute on function public.commit_onboarding(uuid, uuid, jsonb) to service_role;
