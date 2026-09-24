-- Create product_images table for multiple product photos
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Everyone can view product images
CREATE POLICY "Product images are viewable by everyone"
ON public.product_images
FOR SELECT
USING (true);

-- Farmers can manage their product images
CREATE POLICY "Farmers can insert their product images"
ON public.product_images
FOR INSERT
WITH CHECK (
  product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Farmers can update their product images"
ON public.product_images
FOR UPDATE
USING (
  product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Farmers can delete their product images"
ON public.product_images
FOR DELETE
USING (
  product_id IN (
    SELECT p.id FROM products p
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

-- Admins can manage all product images
CREATE POLICY "Admins can manage all product images"
ON public.product_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));