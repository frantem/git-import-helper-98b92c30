
-- 1. Add slug column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Transliteration function (RU -> latin)
CREATE OR REPLACE FUNCTION public.generate_product_slug(_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  result TEXT;
BEGIN
  IF _title IS NULL OR length(trim(_title)) = 0 THEN
    RETURN NULL;
  END IF;
  result := lower(_title);
  -- Cyrillic -> Latin (GOST 7.79-2000 simplified)
  result := translate(result,
    'абвгдезийклмнопрстуфхыэ',
    'abvgdezijklmnoprstufhye');
  result := replace(result, 'ё', 'yo');
  result := replace(result, 'ж', 'zh');
  result := replace(result, 'ц', 'c');
  result := replace(result, 'ч', 'ch');
  result := replace(result, 'ш', 'sh');
  result := replace(result, 'щ', 'sch');
  result := replace(result, 'ъ', '');
  result := replace(result, 'ь', '');
  result := replace(result, 'ю', 'yu');
  result := replace(result, 'я', 'ya');
  -- Remove anything not [a-z0-9 -]
  result := regexp_replace(result, '[^a-z0-9 \-]+', '', 'g');
  -- Collapse whitespace and hyphens
  result := regexp_replace(result, '[\s\-]+', '-', 'g');
  result := trim(both '-' from result);
  -- Limit length
  IF length(result) > 80 THEN
    result := substring(result from 1 for 80);
    result := trim(both '-' from result);
  END IF;
  IF length(result) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN result;
END;
$$;

-- 3. Ensure unique slug (append -2, -3 if collision)
CREATE OR REPLACE FUNCTION public.ensure_unique_product_slug(_base TEXT, _self_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  candidate TEXT;
  i INT := 2;
BEGIN
  IF _base IS NULL THEN
    RETURN NULL;
  END IF;
  candidate := _base;
  WHILE EXISTS (
    SELECT 1 FROM public.products
    WHERE slug = candidate AND (_self_id IS NULL OR id <> _self_id)
  ) LOOP
    candidate := _base || '-' || i;
    i := i + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 4. Trigger: auto-generate slug on insert or when title changes
CREATE OR REPLACE FUNCTION public.products_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base TEXT;
BEGIN
  -- Only auto-generate if slug is empty, or title changed and slug wasn't manually set
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := public.generate_product_slug(NEW.title);
    NEW.slug := public.ensure_unique_product_slug(base, NEW.id);
  ELSIF TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title AND NEW.slug = OLD.slug THEN
    -- Title changed and user didn't change slug — regenerate
    base := public.generate_product_slug(NEW.title);
    NEW.slug := public.ensure_unique_product_slug(base, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_set_slug ON public.products;
CREATE TRIGGER trg_products_set_slug
BEFORE INSERT OR UPDATE OF title, slug ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.products_set_slug();

-- 5. Backfill existing rows
DO $$
DECLARE
  r RECORD;
  base TEXT;
BEGIN
  FOR r IN SELECT id, title FROM public.products WHERE slug IS NULL OR length(trim(slug)) = 0 LOOP
    base := public.generate_product_slug(r.title);
    UPDATE public.products SET slug = public.ensure_unique_product_slug(base, r.id) WHERE id = r.id;
  END LOOP;
END $$;

-- 6. Unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx ON public.products(slug) WHERE slug IS NOT NULL;
