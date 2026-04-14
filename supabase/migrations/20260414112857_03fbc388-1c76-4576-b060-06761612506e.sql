-- Allow users to delete their own reviews
CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Allow users to delete images of their own reviews
CREATE POLICY "Users can delete own review_images" ON public.review_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE reviews.id = review_images.review_id
        AND reviews.user_id = auth.uid()
    )
  );