-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('farmer-avatars', 'farmer-avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- RLS policies for product-images bucket
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for farmer-avatars bucket
CREATE POLICY "Farmer avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'farmer-avatars');

CREATE POLICY "Authenticated users can upload farmer avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'farmer-avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own farmer avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'farmer-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for avatars bucket
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin can manage categories (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update and delete all products
CREATE POLICY "Admins can update all products"
ON public.products FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all products"
ON public.products FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));