CREATE TABLE public.review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review_images" ON public.review_images
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own review_images" ON public.review_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_images.review_id AND reviews.user_id = auth.uid())
  );

INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true);

CREATE POLICY "Anyone can read review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');

CREATE POLICY "Auth users can upload review images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'review-images' AND auth.uid() IS NOT NULL);