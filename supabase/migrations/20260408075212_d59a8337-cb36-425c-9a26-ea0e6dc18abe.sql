
-- Drop existing blanket write policies
DROP POLICY IF EXISTS "Auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth update" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete" ON storage.objects;

-- Sellers can manage product-images in their own folder
CREATE POLICY "Sellers manage own product images" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Sellers can manage farmer-avatars in their own folder
CREATE POLICY "Sellers manage own farmer avatars" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'farmer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'farmer-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can manage their own avatars
CREATE POLICY "Users manage own avatars" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only admins can manage banners
CREATE POLICY "Admins manage banners" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'banners'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'banners'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
  );

-- Only admins can manage site-assets
CREATE POLICY "Admins manage site assets" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin')
  );
