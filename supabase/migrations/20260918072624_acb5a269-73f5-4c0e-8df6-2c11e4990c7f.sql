ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS delivery_terms text;

DROP FUNCTION IF EXISTS public.get_seller_pickup_settings(uuid[]);

CREATE FUNCTION public.get_seller_pickup_settings(farmer_ids uuid[])
RETURNS TABLE(farmer_id uuid, pickup_slots jsonb, max_orders_per_day integer, busy_dates jsonb, vacation_dates jsonb, pickup_enabled boolean, delivery_enabled boolean, delivery_terms text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.pickup_slots,
    f.max_orders_per_day,
    f.busy_dates,
    f.vacation_dates,
    f.pickup_enabled,
    f.delivery_enabled,
    f.delivery_terms
  FROM public.farmers f
  WHERE f.id = ANY(farmer_ids)
$$;