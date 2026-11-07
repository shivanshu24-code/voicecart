-- Core tenant tables: shops, products, shop_hours.
-- Browsers never touch these directly. The backend calls Supabase with the
-- signed-in user's token, so RLS still applies to every query.

create extension if not exists citext;

create table public.shops (
  id            uuid primary key default gen_random_uuid(),
  -- Always the verified caller; never accepted from a request body.
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  -- Null until publish, so a draft can exist before a slug is chosen.
  slug          citext unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category      text not null default 'other'
                check (category in ('grocery', 'clothing', 'electronics', 'bakery', 'other')),
  description   text check (char_length(description) <= 2000),
  phone         text,
  whatsapp      text,
  address       text,
  logo_url      text,
  banner_url    text,
  template      text not null default 'generic',
  primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  timezone      text not null default 'Asia/Kolkata',
  locale        text not null default 'en',
  -- Per-field owner confirmation, e.g. {"phone": true}. Publish checks this.
  confirmed_fields jsonb not null default '{}'::jsonb,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 160),
  description   text check (char_length(description) <= 2000),
  category      text,
  -- Integer paise avoids float rounding. Null means price on request.
  price_paise   integer check (price_paise >= 0),
  unit          text,
  image_url     text,
  attributes    jsonb not null default '{}'::jsonb,
  sort_order    integer not null default 0,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Several slots per day, because many shops close in the afternoon.
create table public.shop_hours (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops (id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  slot          smallint not null default 0 check (slot >= 0),
  open_time     time,
  close_time    time,
  is_closed     boolean not null default false,
  unique (shop_id, day_of_week, slot),
  check (is_closed or (open_time is not null and close_time is not null))
);

create index shops_owner_id_idx on public.shops (owner_id);
create index products_shop_id_idx on public.products (shop_id, sort_order);
create index shop_hours_shop_id_idx on public.shop_hours (shop_id);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shops_set_updated_at before update on public.shops
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.shop_hours enable row level security;

-- Ownership lookup, wrapped so product and hours policies stay short.
create function public.owns_shop(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shops s
    where s.id = target and s.owner_id = (select auth.uid())
  );
$$;
revoke execute on function public.owns_shop(uuid) from public, anon;
grant execute on function public.owns_shop(uuid) to authenticated;

create policy shops_owner_select on public.shops for select to authenticated
  using (owner_id = (select auth.uid()));
create policy shops_owner_insert on public.shops for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy shops_owner_update on public.shops for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy shops_owner_delete on public.shops for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy products_owner_all on public.products for all to authenticated
  using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));
create policy shop_hours_owner_all on public.shop_hours for all to authenticated
  using (public.owns_shop(shop_id)) with check (public.owns_shop(shop_id));

-- RLS filters rows, not columns, so access is also limited by column.
-- Owners cannot set owner_id, slug, is_published or confirmed_fields directly;
-- those change only through server-side publish and review flows.
revoke all on public.shops, public.products, public.shop_hours from anon, authenticated;

grant select, delete on public.shops to authenticated;
grant insert (name, category, description, phone, whatsapp, address, locale)
  on public.shops to authenticated;
grant update (name, category, description, phone, whatsapp, address, logo_url,
              banner_url, template, primary_color, locale)
  on public.shops to authenticated;
grant select, insert, update, delete on public.products, public.shop_hours to authenticated;

-- Anonymous visitors get only these views: published shops, public columns,
-- no owner_id. They run as the view owner, so anon needs no base-table access.
create view public.public_shops as
  select id, name, slug, category, description, phone, whatsapp, address,
         logo_url, banner_url, template, primary_color, timezone, locale
  from public.shops
  where is_published and slug is not null;

create view public.public_products as
  select p.id, p.shop_id, p.name, p.description, p.category, p.price_paise,
         p.unit, p.image_url, p.attributes, p.sort_order, p.is_available
  from public.products p
  join public.shops s on s.id = p.shop_id
  where s.is_published and s.slug is not null;

create view public.public_shop_hours as
  select h.shop_id, h.day_of_week, h.slot, h.open_time, h.close_time, h.is_closed
  from public.shop_hours h
  join public.shops s on s.id = h.shop_id
  where s.is_published and s.slug is not null;

grant select on public.public_shops, public.public_products, public.public_shop_hours
  to anon, authenticated;
