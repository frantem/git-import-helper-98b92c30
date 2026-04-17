-- Create public bucket for category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

-- Admin-only write access
CREATE POLICY "Admin can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can update category images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'category-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin can delete category images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);