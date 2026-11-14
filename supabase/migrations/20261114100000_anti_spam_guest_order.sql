-- Антиспам в оформлении заказа: бессмысленные повторы в имени и адресе,
-- проверка реального кода оператора РБ. Клиент проверяет то же самое,
-- здесь — вторая линия защиты на случай прямых вызовов RPC.

CREATE OR REPLACE FUNCTION public.create_guest_order(p_farmer_id uuid, p_items jsonb, p_name text, p_phone text, p_delivery_type text, p_address text DEFAULT NULL::text, p_comment text DEFAULT NULL::text, p_contact_method text DEFAULT 'call'::text, p_payment_method text DEFAULT 'cash'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_item jsonb;
  v_product record;
  v_variant record;
  v_item_price integer;
  v_qty integer;
  v_recent integer;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_name text := btrim(coalesce(p_name, ''));
begin
  if p_payment_method not in ('cash', 'erip') then
    raise exception 'PAYMENT_INVALID';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'NAME_REQUIRED';
  end if;

  -- Бессмысленный повтор букв: «Ййййй», «Еееееее», «аааа»
  if v_name ~* '^(.)\1+$' or v_name ~ '(.)\1{3,}' then
    raise exception 'NAME_INVALID';
  end if;

  if v_phone !~ '^\+375[0-9]{9}$' then
    raise exception 'PHONE_INVALID';
  end if;

  -- Не все цифры одинаковые и код оператора из реально выдаваемых в РБ
  if v_phone ~ '^\+375(\d)\1{8}$'
     or v_phone !~ '^\+375(25|29|33|44|17|21|22|23|16|15)[0-9]{7}$' then
    raise exception 'PHONE_INVALID';
  end if;

  if p_delivery_type not in ('courier', 'self', 'europochta', 'belpost') then
    raise exception 'DELIVERY_INVALID';
  end if;

  if p_delivery_type <> 'self' and char_length(btrim(coalesce(p_address, ''))) < 5 then
    raise exception 'ADDRESS_REQUIRED';
  end if;

  if p_delivery_type <> 'self'
     and (btrim(coalesce(p_address, '')) ~* '^(.)\1+$' or btrim(coalesce(p_address, '')) ~ '(.)\1{3,}') then
    raise exception 'ADDRESS_INVALID';
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

    -- Цена фасовки берётся из product_variants, иначе — базовая цена товара
    v_item_price := v_product.price;
    if coalesce(v_item ->> 'variant_id', '') <> '' then
      select price into v_variant
        from public.product_variants
       where id = (v_item ->> 'variant_id')::uuid
         and product_id = v_product.id;
      if found and v_variant.price is not null then
        v_item_price := v_variant.price;
      end if;
    end if;

    v_total := v_total + v_item_price * v_qty;
  end loop;

  insert into public.orders (
    buyer_id, total_amount, status, delivery_type, delivery_address,
    delivery_cost, notes, payment_method, confirmation_method,
    guest_name, guest_phone, guest_contact_method
  ) values (
    auth.uid(), v_total, 'pending', p_delivery_type,
    case when p_delivery_type <> 'self' then btrim(p_address) else null end,
    0, nullif(btrim(coalesce(p_comment, '')), ''), coalesce(nullif(p_payment_method, ''), 'cash'), coalesce(nullif(p_contact_method, ''), 'call'),
    v_name, v_phone, coalesce(nullif(p_contact_method, ''), 'call')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::int;

    select id, price, farmer_id
      into v_product
      from public.products
     where id = (v_item ->> 'product_id')::uuid;

    v_item_price := v_product.price;
    if coalesce(v_item ->> 'variant_id', '') <> '' then
      select price into v_variant
        from public.product_variants
       where id = (v_item ->> 'variant_id')::uuid
         and product_id = v_product.id;
      if found and v_variant.price is not null then
        v_item_price := v_variant.price;
      end if;
    end if;

    insert into public.order_items (order_id, product_id, farmer_id, quantity, unit_price, status)
    values (v_order_id, v_product.id, v_product.farmer_id, v_qty, v_item_price, 'pending');
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'total', v_total,
    'code', upper(substr(replace(v_order_id::text, '-', ''), 1, 6))
  );
end;
$function$
