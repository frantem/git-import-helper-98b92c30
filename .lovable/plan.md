

## Problem

The SELECT policy "Sellers can read orders with their items" added in the last migration causes infinite recursion. It queries `order_items` which has RLS policies that query back to `orders`.

This blocks ALL operations on the `orders` table, including INSERT (checkout).

## Fix

Replace the inline policy with a `SECURITY DEFINER` function (same pattern used for the update policy):

### SQL Migration

```sql
-- 1. Create security definer function for seller order reads
CREATE OR REPLACE FUNCTION public.can_seller_read_order(_order_id uuid)
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
    WHERE oi.order_id = _order_id
      AND f.user_id = auth.uid()
  );
$$;

-- 2. Replace the recursive policy
DROP POLICY IF EXISTS "Sellers can read orders with their items" ON orders;

CREATE POLICY "Sellers can read orders with their items"
ON orders FOR SELECT TO authenticated
USING (public.can_seller_read_order(id));
```

No frontend changes needed. The checkout will work again immediately.

