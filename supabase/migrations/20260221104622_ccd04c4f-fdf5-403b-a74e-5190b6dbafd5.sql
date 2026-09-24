
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
    new_slug := upper(encode(gen_random_bytes(4), 'hex'));
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_slug = new_slug) INTO slug_exists;
    EXIT WHEN NOT slug_exists;
  END LOOP;
  NEW.order_slug := new_slug;
  RETURN NEW;
END;
$function$;
