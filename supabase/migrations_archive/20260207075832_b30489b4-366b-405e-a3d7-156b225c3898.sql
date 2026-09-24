-- Create product_addons table
CREATE TABLE public.product_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  selection_type TEXT NOT NULL DEFAULT 'checkbox',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;

-- Viewable by everyone
CREATE POLICY "Product addons are viewable by everyone"
ON public.product_addons
FOR SELECT
USING (true);

-- Admins can manage all
CREATE POLICY "Admins can manage all product addons"
ON public.product_addons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Farmers can insert their own product addons
CREATE POLICY "Farmers can insert their product addons"
ON public.product_addons
FOR INSERT
WITH CHECK (product_id IN (
  SELECT p.id FROM products p
  JOIN farmers f ON p.farmer_id = f.id
  WHERE f.user_id = auth.uid()
));

-- Farmers can update their own product addons
CREATE POLICY "Farmers can update their product addons"
ON public.product_addons
FOR UPDATE
USING (product_id IN (
  SELECT p.id FROM products p
  JOIN farmers f ON p.farmer_id = f.id
  WHERE f.user_id = auth.uid()
));

-- Farmers can delete their own product addons
CREATE POLICY "Farmers can delete their product addons"
ON public.product_addons
FOR DELETE
USING (product_id IN (
  SELECT p.id FROM products p
  JOIN farmers f ON p.farmer_id = f.id
  WHERE f.user_id = auth.uid()
));