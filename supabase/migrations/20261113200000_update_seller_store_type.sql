-- Продавец может сменить тип витрины (еда ↔ одежда/крафт) из кабинета.
-- Меняет только свою запись: проверка по user_id.

create or replace function public.update_seller_store_type(p_store_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_store_type not in ('food', 'apparel', 'craft') then
    raise exception 'TYPE_INVALID';
  end if;

  update public.farmers
     set store_type = p_store_type
   where user_id = v_uid
  returning id into v_id;

  if v_id is null then
    raise exception 'STORE_NOT_FOUND';
  end if;

  return jsonb_build_object('id', v_id, 'store_type', p_store_type);
end;
$$;

grant execute on function public.update_seller_store_type(text) to authenticated;
