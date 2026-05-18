
-- Add slug column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index for slug
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_idx ON public.products (slug);

-- Function to generate slug from text (basic Cyrillic to Latin transliteration + cleaning)
CREATE OR REPLACE FUNCTION public.slugify(t text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  result := lower(t);
  -- Transliteration
  result := replace(result, 'а', 'a');
  result := replace(result, 'б', 'b');
  result := replace(result, 'в', 'v');
  result := replace(result, 'г', 'g');
  result := replace(result, 'д', 'd');
  result := replace(result, 'е', 'e');
  result := replace(result, 'ё', 'yo');
  result := replace(result, 'ж', 'zh');
  result := replace(result, 'з', 'z');
  result := replace(result, 'и', 'i');
  result := replace(result, 'й', 'y');
  result := replace(result, 'к', 'k');
  result := replace(result, 'л', 'l');
  result := replace(result, 'м', 'm');
  result := replace(result, 'н', 'n');
  result := replace(result, 'о', 'o');
  result := replace(result, 'п', 'p');
  result := replace(result, 'р', 'r');
  result := replace(result, 'с', 's');
  result := replace(result, 'т', 't');
  result := replace(result, 'у', 'u');
  result := replace(result, 'ф', 'f');
  result := replace(result, 'х', 'h');
  result := replace(result, 'ц', 'ts');
  result := replace(result, 'ч', 'ch');
  result := replace(result, 'ш', 'sh');
  result := replace(result, 'щ', 'sch');
  result := replace(result, 'ъ', '');
  result := replace(result, 'ы', 'y');
  result := replace(result, 'ь', '');
  result := replace(result, 'э', 'e');
  result := replace(result, 'ю', 'yu');
  result := replace(result, 'я', 'ya');

  -- Remove special chars and replace spaces with dashes
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(both '-' from result);

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing products with slugs
UPDATE public.products
SET slug = slugify(title) || '-' || substr(id::text, 1, 4)
WHERE slug IS NULL;

-- Create a trigger to auto-generate slug for new products if not provided
CREATE OR REPLACE FUNCTION public.on_product_insert_update_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := slugify(NEW.title) || '-' || substr(NEW.id::text, 1, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_product_insert_slug
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.on_product_insert_update_slug();
