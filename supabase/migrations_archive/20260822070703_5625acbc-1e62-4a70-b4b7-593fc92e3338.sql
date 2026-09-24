ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS unique_fact text,
  ADD COLUMN IF NOT EXISTS delivery_note text,
  ADD COLUMN IF NOT EXISTS contacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'forest';

CREATE OR REPLACE FUNCTION public.get_farmer_public_stats(_farmer_id uuid)
RETURNS TABLE(orders_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT oi.order_id)::bigint
  FROM public.order_items oi
  WHERE oi.farmer_id = _farmer_id
    AND oi.status <> 'cancelled'
$$;

GRANT EXECUTE ON FUNCTION public.get_farmer_public_stats(uuid) TO anon, authenticated;