ALTER TABLE public.seller_posts ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.ensure_unique_seller_post_slug(_farmer_id uuid, _base text, _self_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
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
    SELECT 1 FROM public.seller_posts
    WHERE farmer_id = _farmer_id AND slug = candidate AND (_self_id IS NULL OR id <> _self_id)
  ) LOOP
    candidate := _base || '-' || i;
    i := i + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.seller_posts_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := public.generate_product_slug(NEW.title);
    IF base IS NULL THEN
      base := 'post';
    END IF;
    NEW.slug := public.ensure_unique_seller_post_slug(NEW.farmer_id, base, NEW.id);
  ELSIF TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title AND NEW.slug = OLD.slug THEN
    base := COALESCE(public.generate_product_slug(NEW.title), 'post');
    NEW.slug := public.ensure_unique_seller_post_slug(NEW.farmer_id, base, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_posts_set_slug ON public.seller_posts;
CREATE TRIGGER trg_seller_posts_set_slug
BEFORE INSERT OR UPDATE ON public.seller_posts
FOR EACH ROW EXECUTE FUNCTION public.seller_posts_set_slug();

UPDATE public.seller_posts SET slug = NULL WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seller_posts_farmer_slug_key ON public.seller_posts (farmer_id, slug);