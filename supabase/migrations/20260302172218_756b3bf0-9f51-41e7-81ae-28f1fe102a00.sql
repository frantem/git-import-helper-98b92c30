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