-- LOCUS больше не маркетплейс: убираем таблицы городской витрины.
-- Перед удалением данные выгружены в /home/hermes/backups/*_before_drop.json.
-- Сохраняем всё, что нужно конструктору витрин: farmers, products, orders,
-- order_items, отзывы, посты, промо, роли, профили, OTP и настройки.

drop table if exists public.homepage_block_products cascade;
drop table if exists public.homepage_blocks cascade;
drop table if exists public.banners cascade;
drop table if exists public.favorites cascade;
drop table if exists public.pickup_points cascade;
drop table if exists public.product_categories cascade;
drop table if exists public.categories cascade;
drop table if exists public.seller_applications cascade;

drop function if exists public.get_orders_count_by_dates(date, date);
