

## Problem

The seller can't see the "Выдан" button because the `order:orders(...)` join in the order_items query returns `null`. The `orders` table RLS only allows SELECT for admins and buyers (`buyer_id = auth.uid()`). The seller is neither, so `item.order` is always `null`, which means:

1. `item.order?.delivery_type === "self_pickup"` is never true
2. The "Выдан" section never renders

## Fix

Add an RLS SELECT policy on the `orders` table so sellers can read orders that contain their products:

```sql
CREATE POLICY "Sellers can read orders with their items"
ON orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN farmers f ON f.id = oi.farmer_id
    WHERE oi.order_id = orders.id
      AND f.user_id = auth.uid()
  )
);
```

This single migration is all that's needed. The frontend code already correctly:
- Shows "Собран" button per item
- Groups self_pickup items by order after all are collected
- Shows "Выдан" button for ready orders

No frontend changes required.

