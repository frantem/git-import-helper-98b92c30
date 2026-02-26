-- Create product_variants table for size/volume options
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label text NOT NULL,
  price integer NOT NULL,
  unit text NOT NULL DEFAULT 'шт',
  sort_order integer DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Everyone can view variants
CREATE POLICY "Product variants are viewable by everyone"
  ON public.product_variants FOR SELECT USING (true);

-- Farmers can insert their product variants
CREATE POLICY "Farmers can insert their product variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- Farmers can update their product variants
CREATE POLICY "Farmers can update their product variants"
  ON public.product_variants FOR UPDATE
  USING (product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- Farmers can delete their product variants
CREATE POLICY "Farmers can delete their product variants"
  ON public.product_variants FOR DELETE
  USING (product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- Admins can manage all variants
CREATE POLICY "Admins can manage all product variants"
  ON public.product_variants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);