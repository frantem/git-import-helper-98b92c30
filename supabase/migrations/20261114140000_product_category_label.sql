-- Категории товаров у продавца: как в Shopify — продавец сам называет разделы.
-- Глобальные категории маркетплейса удалены, поэтому категория живёт строкой на товаре.
alter table public.products
  add column if not exists category_label text;

create index if not exists products_farmer_category_idx
  on public.products (farmer_id, category_label)
  where is_deleted = false;
