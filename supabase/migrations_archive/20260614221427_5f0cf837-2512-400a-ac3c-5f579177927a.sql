
ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS pickup_slots jsonb,
  ADD COLUMN IF NOT EXISTS max_orders_per_day integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS busy_dates jsonb,
  ADD COLUMN IF NOT EXISTS vacation_dates jsonb,
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS telegram_link_code text;

UPDATE public.farmers f
SET pickup_slots = p.pickup_slots,
    max_orders_per_day = COALESCE(p.max_orders_per_day, 5),
    busy_dates = p.busy_dates,
    vacation_dates = p.vacation_dates,
    telegram_chat_id = p.telegram_chat_id,
    telegram_link_code = p.telegram_link_code
FROM public.profiles p
WHERE p.user_id = f.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS farmers_telegram_link_code_uniq
  ON public.farmers (telegram_link_code)
  WHERE telegram_link_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_seller_pickup_settings(farmer_ids uuid[])
 RETURNS TABLE(farmer_id uuid, pickup_slots jsonb, max_orders_per_day integer, busy_dates jsonb, vacation_dates jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS farmer_id,
    f.pickup_slots,
    COALESCE(f.max_orders_per_day, 5) AS max_orders_per_day,
    f.busy_dates,
    f.vacation_dates
  FROM public.farmers f
  WHERE f.id = ANY(farmer_ids);
END;
$function$;
