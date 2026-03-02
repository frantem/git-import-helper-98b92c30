
-- 1. Security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.can_seller_update_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN farmers f ON f.id = oi.farmer_id
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.order_id = _order_id
      AND f.user_id = auth.uid()
      AND o.delivery_type = 'self_pickup'
  );
$$;

-- 2. Replace the recursive policy
DROP POLICY IF EXISTS "Sellers can update orders for self_pickup delivery" ON orders;

CREATE POLICY "Sellers can update orders for self_pickup delivery"
ON orders FOR UPDATE TO authenticated
USING (public.can_seller_update_order(id));
