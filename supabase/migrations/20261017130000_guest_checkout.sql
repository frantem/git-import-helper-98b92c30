-- Гостевой заказ с витрины продавца (/seller/:slug).
-- Только аддитивные изменения: колонки для контактов гостя, buyer_id становится nullable,
-- плюс SECURITY DEFINER-функция, которая создаёт заказ и позиции атомарно.
-- Цены считаются по products.price на сервере, чтобы их нельзя было подменить из браузера.

alter table public.orders alter column buyer_id drop not null;

alter table public.orders add column if not exists guest_name text;
alter table public.orders add column if not exists guest_phone text;
alter table public.orders add column if not exists guest_contact_method text;

create or replace function public.create_guest_order(
  p_farmer_id uuid,
  p_items jsonb,
  p_name text,
  p_phone text,
  p_delivery_type text,
  p_address text default null,
  p_comment text default null,
  p_contact_method text default 'call'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_recent integer;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_name text := btrim(coalesce(p_name, ''));
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'NAME_REQUIRED';
  end if;

  if v_phone !~ '^\+375[0-9]{9}$' then
    raise exception 'PHONE_INVALID';
  end if;

  if p_delivery_type not in ('courier', 'self') then
    raise exception 'DELIVERY_INVALID';
  end if;

  if p_delivery_type = 'courier' and char_length(btrim(coalesce(p_address, ''))) < 5 then
    raise exception 'ADDRESS_REQUIRED';
  end if;

  if not exists (
    select 1 from public.farmers
    where id = p_farmer_id and coalesce(is_blocked, false) = false
  ) then
    raise exception 'FARMER_NOT_FOUND';
  end if;

  -- Простая защита от спама формой: не больше трёх заказов с телефона за 10 минут
  select count(*) into v_recent
  from public.orders
  where guest_phone = v_phone
    and created_at > now() - interval '10 minutes';
  if v_recent >= 3 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'QTY_INVALID';
    end if;

    select id, price, farmer_id
      into v_product
      from public.products
     where id = (v_item ->> 'product_id')::uuid
       and is_active = true
       and is_deleted = false;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if v_product.farmer_id <> p_farmer_id then
      raise exception 'PRODUCT_FOREIGN';
    end if;

    v_total := v_total + v_product.price * v_qty;
  end loop;

  insert into public.orders (
    buyer_id, total_amount, status, delivery_type, delivery_address,
    delivery_cost, notes, payment_method, confirmation_method,
    guest_name, guest_phone, guest_contact_method
  ) values (
    auth.uid(), v_total, 'pending', p_delivery_type,
    case when p_delivery_type = 'courier' then btrim(p_address) else null end,
    0, nullif(btrim(coalesce(p_comment, '')), ''), 'cash', coalesce(nullif(p_contact_method, ''), 'call'),
    v_name, v_phone, coalesce(nullif(p_contact_method, ''), 'call')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;

    select id, price, farmer_id
      into v_product
      from public.products
     where id = (v_item ->> 'product_id')::uuid;

    insert into public.order_items (order_id, product_id, farmer_id, quantity, unit_price, status)
    values (v_order_id, v_product.id, v_product.farmer_id, v_qty, v_product.price, 'pending');
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'code', upper(substr(replace(v_order_id::text, '-', ''), 1, 6))
  );
end;
$$;

revoke all on function public.create_guest_order(uuid, jsonb, text, text, text, text, text, text) from public;
grant execute on function public.create_guest_order(uuid, jsonb, text, text, text, text, text, text) to anon, authenticated;
