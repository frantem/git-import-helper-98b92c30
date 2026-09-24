
ALTER TABLE public.site_visits
  ADD COLUMN referrer text,
  ADD COLUMN user_agent text,
  ADD COLUMN duration_seconds integer;

-- Allow anyone to update their own visit record (for duration tracking)
CREATE POLICY "Anyone can update their own visit"
  ON public.site_visits FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
