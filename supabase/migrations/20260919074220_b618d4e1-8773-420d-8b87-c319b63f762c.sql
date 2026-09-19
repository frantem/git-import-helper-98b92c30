CREATE POLICY "Sellers can insert own order items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = order_items.farmer_id AND f.user_id = auth.uid()));

CREATE POLICY "Sellers can delete own order items"
ON public.order_items FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = order_items.farmer_id AND f.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.can_seller_update_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN farmers f ON f.id = oi.farmer_id
    WHERE oi.order_id = _order_id
      AND f.user_id = auth.uid()
  );
$function$;