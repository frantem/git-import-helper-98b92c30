INSERT INTO app_settings (key, value) VALUES
  ('seo_default_title', 'Locus — Маркетплейс натуральных продуктов с единой доставкой в Беларуси'),
  ('seo_default_description', 'Свежие фермерские продукты с доставкой в Витебске. Овощи, фрукты, мёд, молочные продукты напрямую от производителей.'),
  ('google_verification', '')
ON CONFLICT (key) DO NOTHING;