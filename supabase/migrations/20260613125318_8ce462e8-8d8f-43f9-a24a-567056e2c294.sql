
-- 1) Farmers: restrict sensitive address columns from anonymous role.
--    Authenticated users (buyers at checkout) and service_role keep full access.
REVOKE SELECT ON public.farmers FROM anon;
GRANT SELECT (
  id, user_id, name, description, district, village,
  photo_url, city, slug, rating, is_blocked, created_at
) ON public.farmers TO anon;
GRANT SELECT ON public.farmers TO authenticated;
GRANT ALL ON public.farmers TO service_role;

-- 2) Storage: review-images bucket.
-- Drop overly broad SELECT policy that allowed any client to list every file.
DROP POLICY IF EXISTS "Anyone can read review images" ON storage.objects;
-- Drop existing permissive INSERT and replace with owner-scoped one.
DROP POLICY IF EXISTS "Auth users can upload review images" ON storage.objects;

CREATE POLICY "Owner can read own review images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner can upload review images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner can update own review images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner can delete own review images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Storage: category-images bucket.
-- Bucket is public, so getPublicUrl still serves files. Drop the broad SELECT
-- that allowed listing all files. Admin policies for upload/update/delete remain.
DROP POLICY IF EXISTS "Anyone can view category images" ON storage.objects;
