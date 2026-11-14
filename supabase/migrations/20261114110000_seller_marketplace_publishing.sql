-- Публикация витрины в общем каталоге Витебска.
-- По умолчанию off: новые продавцы сначала наполняют свой магазин.
-- Включать могут только продавцы еды — одежда и крафт живут по личным ссылкам.

alter table public.farmers
  add column if not exists published_to_marketplace boolean not null default false;

-- Существующих продавцов еды с активными товарами оставляем в каталоге,
-- чтобы городская витрина не опустела.
update public.farmers f
   set published_to_marketplace = true
 where f.store_type = 'food'
   and exists (
     select 1 from public.products p
      where p.farmer_id = f.id and p.is_active = true and p.is_deleted = false
   );

create or replace function public.toggle_marketplace_publishing(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_farmer_id uuid;
  v_store_type text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id, store_type into v_farmer_id, v_store_type
    from public.farmers
   where user_id = auth.uid()
   limit 1;

  if v_farmer_id is null then
    raise exception 'FARMER_NOT_FOUND';
  end if;

  -- Одежда и крафт не могут публиковаться в продуктовом маркетплейсе
  if coalesce(v_store_type, 'food') <> 'food' and p_enabled then
    raise exception 'APPAREL_CANNOT_PUBLISH_TO_FOOD_MARKETPLACE';
  end if;

  update public.farmers
     set published_to_marketplace = p_enabled
   where id = v_farmer_id;

  return p_enabled;
end;
$$;

grant execute on function public.toggle_marketplace_publishing(boolean) to authenticated;
