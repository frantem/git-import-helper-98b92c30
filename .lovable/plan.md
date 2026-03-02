

## Problem

The RLS policy "Sellers can update orders for self_pickup delivery" on the `orders` table contains a subquery that joins `order_items` back to `orders`, causing infinite recursion. This blocks ALL updates to the `orders` table, including admin actions like "Подтвердить".

## Fix

1. **Create a security definer function** `can_seller_update_order(order_id uuid)` that checks if the current user is a farmer with items in the given order and the order's `delivery_type` is `self_pickup`. Since it runs as `SECURITY DEFINER`, it bypasses RLS and avoids recursion.

2. **Drop the broken policy** "Sellers can update orders for self_pickup delivery" and **recreate it** using the new function.

### SQL Migration

```sql
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
```

No frontend changes needed -- the admin "Подтвердить" button will work again immediately after this migration.

