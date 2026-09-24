-- 1. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Update function to use extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_order_slug()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  new_slug text;
  slug_exists boolean;
BEGIN
  IF NEW.order_slug IS NOT NULL AND NEW.order_slug <> '' THEN
    RETURN NEW;
  END IF;
  LOOP
    new_slug := upper(encode(extensions.gen_random_bytes(4), 'hex'));
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_slug = new_slug) INTO slug_exists;
    EXIT WHEN NOT slug_exists;
  END LOOP;
  NEW.order_slug := new_slug;
  RETURN NEW;
END;
$function$;

-- 3. Create trigger
DROP TRIGGER IF EXISTS trigger_generate_order_slug ON orders;
CREATE TRIGGER trigger_generate_order_slug
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_slug();

-- 4. Fix existing empty slugs
UPDATE orders SET order_slug = upper(encode(extensions.gen_random_bytes(4), 'hex'))
WHERE order_slug = '';