-- Мгновенное создание витрины без модерации.
-- Пользователь уже вошёл по телефону (verify-otp), поэтому берём auth.uid().
-- Витрина создаётся с выбранным типом, ролью seller и 30-дневным триалом
-- (триал выставляет триггер initialize_seller_trial_before_insert).

create or replace function public.create_seller_store(
  p_name text,
  p_store_type text default 'food'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_slug text;
  v_try text;
  v_suffix int := 1;
  v_id uuid;
  v_existing record;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'NAME_REQUIRED';
  end if;

  if char_length(v_name) > 60 then
    raise exception 'NAME_TOO_LONG';
  end if;

  if p_store_type not in ('food', 'apparel', 'craft') then
    raise exception 'TYPE_INVALID';
  end if;

  -- У пользователя уже есть магазин: второй не создаём, ведём в существующий
  select id, slug into v_existing from public.farmers where user_id = v_uid limit 1;
  if found then
    return jsonb_build_object('id', v_existing.id, 'slug', v_existing.slug, 'created', false);
  end if;

  -- Транслит названия в адрес витрины
  v_slug := lower(translate(v_name,
    'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
    'abvgdeejziyklmnoprstufhccss_y_eua'));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := btrim(v_slug, '-');
  if v_slug = '' then
    v_slug := 'store';
  end if;
  v_slug := left(v_slug, 32);

  v_try := v_slug;
  while exists (select 1 from public.farmers where slug = v_try) loop
    v_suffix := v_suffix + 1;
    v_try := v_slug || '-' || v_suffix;
  end loop;
  v_slug := v_try;

  insert into public.farmers (name, slug, user_id, store_type, plan)
  values (v_name, v_slug, v_uid, p_store_type, 'free')
  returning id into v_id;

  insert into public.user_roles (user_id, role)
  values (v_uid, 'seller')
  on conflict (user_id, role) do nothing;

  update public.profiles
     set full_name = coalesce(nullif(btrim(full_name), ''), v_name)
   where user_id = v_uid;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'created', true);
end;
$$;

revoke all on function public.create_seller_store(text, text) from public;
grant execute on function public.create_seller_store(text, text) to authenticated;
