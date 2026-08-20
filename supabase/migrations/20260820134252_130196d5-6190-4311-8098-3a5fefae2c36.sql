CREATE POLICY "Sellers manage own seller-page media"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'seller-page'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (storage.foldername(name))[1] = 'seller-page'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );