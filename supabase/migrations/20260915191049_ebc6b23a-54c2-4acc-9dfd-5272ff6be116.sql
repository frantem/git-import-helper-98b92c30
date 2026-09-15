ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS pickup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_cost integer,
  ADD COLUMN IF NOT EXISTS free_delivery_from integer;

DROP FUNCTION IF EXISTS public.get_seller_pickup_settings(uuid[]);

CREATE OR REPLACE FUNCTION public.get_seller_pickup_settings(farmer_ids uuid[])
 RETURNS TABLE(farmer_id uuid, pickup_slots jsonb, max_orders_per_day integer, busy_dates jsonb, vacation_dates jsonb, pickup_enabled boolean, delivery_enabled boolean, delivery_cost integer, free_delivery_from integer)
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
    f.vacation_dates,
    f.pickup_enabled,
    f.delivery_enabled,
    f.delivery_cost,
    f.free_delivery_from
  FROM public.farmers f
  WHERE f.id = ANY(farmer_ids);
END;
$function$;