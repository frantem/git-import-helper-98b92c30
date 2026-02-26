
-- Fix 1: Restrict storage upload policies by role

-- Drop overly permissive upload policies
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload farmer avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

-- Sellers/admins only for product-images
CREATE POLICY "Sellers can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
  AND (
    public.has_role(auth.uid(), 'seller'::public.app_role) 
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Sellers/admins only for farmer-avatars
CREATE POLICY "Sellers can upload farmer avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'farmer-avatars' 
  AND auth.role() = 'authenticated'
  AND (
    public.has_role(auth.uid(), 'seller'::public.app_role) 
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Any authenticated user for avatars, but enforce folder path
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: Add database CHECK constraints for input validation

-- Price and stock constraints
ALTER TABLE products ADD CONSTRAINT positive_price CHECK (price >= 0);
ALTER TABLE products ADD CONSTRAINT positive_old_price CHECK (old_price IS NULL OR old_price >= 0);
ALTER TABLE products ADD CONSTRAINT valid_stock CHECK (stock >= 0);

-- Order constraints
ALTER TABLE orders ADD CONSTRAINT positive_total CHECK (total_amount >= 0);
ALTER TABLE order_items ADD CONSTRAINT positive_quantity CHECK (quantity > 0);
ALTER TABLE order_items ADD CONSTRAINT positive_unit_price CHECK (unit_price >= 0);

-- Text length limits
ALTER TABLE products ADD CONSTRAINT title_length CHECK (length(title) <= 200);
ALTER TABLE products ADD CONSTRAINT description_length CHECK (description IS NULL OR length(description) <= 2000);
ALTER TABLE profiles ADD CONSTRAINT name_length CHECK (full_name IS NULL OR length(full_name) <= 100);
ALTER TABLE farmers ADD CONSTRAINT farmer_name_length CHECK (length(name) <= 200);
ALTER TABLE orders ADD CONSTRAINT notes_length CHECK (notes IS NULL OR length(notes) <= 1000);
ALTER TABLE orders ADD CONSTRAINT address_length CHECK (delivery_address IS NULL OR length(delivery_address) <= 500);
