-- Telegram fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS telegram_link_code text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_link_code_uniq
  ON public.profiles (telegram_link_code)
  WHERE telegram_link_code IS NOT NULL;

-- Confirmed_at on order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- RPC: confirm all items of a farmer in given order
CREATE OR REPLACE FUNCTION public.confirm_order_items_for_farmer(_order_id uuid, _farmer_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.order_items
     SET confirmed_at = now()
   WHERE order_id = _order_id
     AND farmer_id = _farmer_id
     AND confirmed_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- RPC: if all items confirmed, set order.status='confirmed'. Returns true if order is fully confirmed.
CREATE OR REPLACE FUNCTION public.mark_order_confirmed_if_all(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count int;
BEGIN
  SELECT COUNT(*) INTO pending_count
    FROM public.order_items
   WHERE order_id = _order_id
     AND confirmed_at IS NULL;

  IF pending_count = 0 THEN
    UPDATE public.orders
       SET status = 'confirmed', updated_at = now()
     WHERE id = _order_id
       AND status = 'pending';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- Allow callers (seller via RLS, or service role for webhook) — RPCs are SECURITY DEFINER so grants are enough
GRANT EXECUTE ON FUNCTION public.confirm_order_items_for_farmer(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.mark_order_confirmed_if_all(uuid) TO authenticated, anon, service_role;