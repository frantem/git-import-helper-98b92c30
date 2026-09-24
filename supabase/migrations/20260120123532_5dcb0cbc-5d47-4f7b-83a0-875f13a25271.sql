-- Add discount_percent column to product_variants table
ALTER TABLE public.product_variants 
ADD COLUMN discount_percent integer DEFAULT 0;