-- Price ranges, "starting at" prices, and product variety for every kind of shop.
-- options: choices that change the price, e.g. [{"label": "1 kg", "price_paise": 85000, "is_available": true}]
-- choices: choices that keep the price, e.g. [{"name": "Colour", "values": ["Blue", "Red"]}]
-- With options, price_paise holds the lowest option so existing queries still work.

alter table public.products
  add column price_max_paise integer,
  add column price_from boolean not null default false,
  add column options jsonb not null default '[]'::jsonb,
  add column choices jsonb not null default '[]'::jsonb,
  add constraint products_price_range check (
    price_max_paise is null or (price_paise is not null and price_max_paise >= price_paise)
  ),
  add constraint products_options_list check (jsonb_typeof(options) = 'array'),
  add constraint products_choices_list check (jsonb_typeof(choices) = 'array');

-- New columns go last: "create or replace view" can only add to the end.
create or replace view public.public_products as
  select p.id, p.shop_id, p.name, p.description, p.category, p.price_paise,
         p.unit, p.image_url, p.attributes, p.sort_order, p.is_available,
         p.price_max_paise, p.price_from, p.options, p.choices
  from public.products p
  join public.shops s on s.id = p.shop_id
  where s.is_published and s.slug is not null;

-- Same as before, but it now saves product groups, ranges and variety too.
create or replace function public.commit_onboarding(p_session uuid, p_owner uuid, p_profile jsonb)
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

  insert into public.products (
    shop_id, name, description, category, price_paise, price_max_paise, price_from,
    unit, options, choices, sort_order
  )
  select v_shop, p.name, p.description, p.category, p.price_paise, p.price_max_paise,
         coalesce(p.price_from, false), p.unit,
         coalesce(p.options, '[]'::jsonb), coalesce(p.choices, '[]'::jsonb), p.sort_order
  from jsonb_to_recordset(p_profile -> 'products') as p (
    name text, description text, category text, price_paise integer, price_max_paise integer,
    price_from boolean, unit text, options jsonb, choices jsonb, sort_order integer
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
