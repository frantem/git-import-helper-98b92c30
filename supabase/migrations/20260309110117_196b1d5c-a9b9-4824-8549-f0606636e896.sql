-- Public read for all buckets
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));

-- Authenticated users can upload
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));

-- Authenticated users can update
CREATE POLICY "Auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));

-- Authenticated users can delete
CREATE POLICY "Auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));