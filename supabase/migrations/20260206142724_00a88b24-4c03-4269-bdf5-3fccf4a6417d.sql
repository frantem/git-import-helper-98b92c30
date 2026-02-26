
-- Create product_custom_fields table
CREATE TABLE public.product_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'select')),
  label TEXT NOT NULL,
  placeholder TEXT,
  max_length INTEGER DEFAULT 50,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_custom_fields
CREATE POLICY "Custom fields are viewable by everyone"
  ON public.product_custom_fields FOR SELECT
  USING (true);

CREATE POLICY "Farmers can insert their product custom fields"
  ON public.product_custom_fields FOR INSERT
  WITH CHECK (product_id IN (
    SELECT p.id FROM products p JOIN farmers f ON p.farmer_id = f.id WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "Farmers can update their product custom fields"
  ON public.product_custom_fields FOR UPDATE
  USING (product_id IN (
    SELECT p.id FROM products p JOIN farmers f ON p.farmer_id = f.id WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "Farmers can delete their product custom fields"
  ON public.product_custom_fields FOR DELETE
  USING (product_id IN (
    SELECT p.id FROM products p JOIN farmers f ON p.farmer_id = f.id WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all product custom fields"
  ON public.product_custom_fields FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create product_custom_field_options table
CREATE TABLE public.product_custom_field_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.product_custom_fields(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.product_custom_field_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_custom_field_options
CREATE POLICY "Custom field options are viewable by everyone"
  ON public.product_custom_field_options FOR SELECT
  USING (true);

CREATE POLICY "Farmers can insert their custom field options"
  ON public.product_custom_field_options FOR INSERT
  WITH CHECK (field_id IN (
    SELECT cf.id FROM product_custom_fields cf
    JOIN products p ON cf.product_id = p.id
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "Farmers can update their custom field options"
  ON public.product_custom_field_options FOR UPDATE
  USING (field_id IN (
    SELECT cf.id FROM product_custom_fields cf
    JOIN products p ON cf.product_id = p.id
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "Farmers can delete their custom field options"
  ON public.product_custom_field_options FOR DELETE
  USING (field_id IN (
    SELECT cf.id FROM product_custom_fields cf
    JOIN products p ON cf.product_id = p.id
    JOIN farmers f ON p.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all custom field options"
  ON public.product_custom_field_options FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add custom_fields JSONB column to order_items
ALTER TABLE public.order_items ADD COLUMN custom_fields JSONB;
