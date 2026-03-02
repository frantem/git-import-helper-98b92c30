CREATE POLICY "Sellers can update orders for self_pickup delivery"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN farmers f ON f.id = oi.farmer_id
    WHERE oi.order_id = orders.id
      AND f.user_id = auth.uid()
  )
  AND delivery_type = 'self_pickup'
);