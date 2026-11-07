-- Several photos per product. image_url stays as the first one, the cover.
-- Option and choice photos live inside the options and choices lists.

alter table public.products
  add column images jsonb not null default '[]'::jsonb,
  add constraint products_images_list check (jsonb_typeof(images) = 'array');

create or replace view public.public_products as
  select p.id, p.shop_id, p.name, p.description, p.category, p.price_paise,
         p.unit, p.image_url, p.attributes, p.sort_order, p.is_available,
         p.price_max_paise, p.price_from, p.options, p.choices, p.images
  from public.products p
  join public.shops s on s.id = p.shop_id
  where s.is_published and s.slug is not null;
