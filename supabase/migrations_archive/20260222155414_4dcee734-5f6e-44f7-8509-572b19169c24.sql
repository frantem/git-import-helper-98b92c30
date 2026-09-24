
-- Function to get seller pickup settings by farmer_ids (bypasses RLS on profiles)
CREATE OR REPLACE FUNCTION public.get_seller_pickup_settings(farmer_ids uuid[])
RETURNS TABLE(
  farmer_id uuid,
  pickup_slots jsonb,
  max_orders_per_day integer,
  busy_dates date[],
  vacation_dates date[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id AS farmer_id,
    p.pickup_slots,
    COALESCE(p.max_orders_per_day, 5) AS max_orders_per_day,
    p.busy_dates,
    p.vacation_dates
  FROM farmers f
  JOIN profiles p ON p.user_id = f.user_id
  WHERE f.id = ANY(farmer_ids);
$$;

-- Function to count orders per farmer per date (for max_orders_per_day check)
CREATE OR REPLACE FUNCTION public.get_orders_count_by_dates(p_farmer_ids uuid[], p_check_dates date[])
RETURNS TABLE(
  farmer_id uuid,
  order_date date,
  order_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    oi.farmer_id,
    o.created_at::date AS order_date,
    COUNT(DISTINCT o.id) AS order_count
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.farmer_id = ANY(p_farmer_ids)
    AND o.created_at::date = ANY(p_check_dates)
    AND o.status NOT IN ('cancelled', 'rejected')
  GROUP BY oi.farmer_id, o.created_at::date;
$$;
