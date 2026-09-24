-- Create table to link homepage blocks with specific products
CREATE TABLE IF NOT EXISTS public.homepage_block_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.homepage_blocks(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(block_id, product_id)
);

-- Enable RLS
ALTER TABLE public.homepage_block_products ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Homepage block products are viewable by everyone"
ON public.homepage_block_products
FOR SELECT
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage homepage block products"
ON public.homepage_block_products
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));