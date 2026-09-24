ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS about_text text,
  ADD COLUMN IF NOT EXISTS hero_media_url text,
  ADD COLUMN IF NOT EXISTS hero_media_type text,
  ADD COLUMN IF NOT EXISTS location_label text;

CREATE TABLE IF NOT EXISTS public.seller_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_promos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  image_url text,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seller_posts_farmer_idx ON public.seller_posts(farmer_id, sort_order);
CREATE INDEX IF NOT EXISTS seller_promos_farmer_idx ON public.seller_promos(farmer_id, sort_order);

GRANT SELECT ON public.seller_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_posts TO authenticated;
GRANT ALL ON public.seller_posts TO service_role;
GRANT SELECT ON public.seller_promos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_promos TO authenticated;
GRANT ALL ON public.seller_promos TO service_role;

ALTER TABLE public.seller_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_promos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active seller posts"
  ON public.seller_posts FOR SELECT
  USING (is_active = true);

CREATE POLICY "Owners can view own seller posts"
  ON public.seller_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()));

CREATE POLICY "Owners can manage own seller posts"
  ON public.seller_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()));

CREATE POLICY "Admins can manage seller posts"
  ON public.seller_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Public can view active seller promos"
  ON public.seller_promos FOR SELECT
  USING (is_active = true);

CREATE POLICY "Owners can view own seller promos"
  ON public.seller_promos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()));

CREATE POLICY "Owners can manage own seller promos"
  ON public.seller_promos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()));

CREATE POLICY "Admins can manage seller promos"
  ON public.seller_promos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));