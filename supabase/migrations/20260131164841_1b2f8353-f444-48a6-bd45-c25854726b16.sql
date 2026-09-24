-- Create product_categories junction table for many-to-many relationship
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Product categories are viewable by everyone"
ON public.product_categories FOR SELECT
USING (true);

CREATE POLICY "Farmers can insert their product categories"
ON public.product_categories FOR INSERT
WITH CHECK (
  product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Farmers can delete their product categories"
ON public.product_categories FOR DELETE
USING (
  product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all product categories"
ON public.product_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing data from products.category_id
INSERT INTO public.product_categories (product_id, category_id)
SELECT id, category_id FROM public.products WHERE category_id IS NOT NULL;

-- Create index for better query performance
CREATE INDEX idx_product_categories_product_id ON public.product_categories(product_id);
CREATE INDEX idx_product_categories_category_id ON public.product_categories(category_id);