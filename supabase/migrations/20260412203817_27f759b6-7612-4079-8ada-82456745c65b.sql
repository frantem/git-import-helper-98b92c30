ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS seo_keywords text;

INSERT INTO public.app_settings (key, value) VALUES
  ('product_title_template', '{name} купить в Витебске — Locus'),
  ('category_title_template', '{name} — натуральные продукты с доставкой в Витебске')
ON CONFLICT (key) DO NOTHING;