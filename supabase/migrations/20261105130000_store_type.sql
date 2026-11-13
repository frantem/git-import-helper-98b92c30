-- Тип витрины: еда, одежда или крафт.
-- По умолчанию 'food', чтобы существующие продавцы еды не менялись.

alter table public.farmers
  add column if not exists store_type text not null default 'food';

alter table public.farmers
  drop constraint if exists farmers_store_type_check;

alter table public.farmers
  add constraint farmers_store_type_check
  check (store_type in ('food', 'apparel', 'craft'));
