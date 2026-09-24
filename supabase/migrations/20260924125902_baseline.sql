-- Baseline: фактическая схема проекта locus, снята с прода 2026-09-24.
-- Команда: supabase db dump --schema public
-- Заменяет 94 миграции из supabase/migrations_archive/: они описывали только то,
-- что Lovable успел записать в файлы, и не переигрываются в чистой базе
-- (часть объектов создавалась напрямую в базе, мимо файлов).




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."can_seller_read_order"("_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN farmers f ON f.id = oi.farmer_id
    WHERE oi.order_id = _order_id
      AND f.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."can_seller_read_order"("_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_seller_update_order"("_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN farmers f ON f.id = oi.farmer_id
    WHERE oi.order_id = _order_id
      AND f.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."can_seller_update_order"("_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_order_items_for_farmer"("_order_id" "uuid", "_farmer_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.order_items
     SET confirmed_at = now()
   WHERE order_id = _order_id
     AND farmer_id = _farmer_id
     AND confirmed_at IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."confirm_order_items_for_farmer"("_order_id" "uuid", "_farmer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_unique_product_slug"("_base" "text", "_self_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."ensure_unique_product_slug"("_base" "text", "_self_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_unique_seller_post_slug"("_farmer_id" "uuid", "_base" "text", "_self_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."ensure_unique_seller_post_slug"("_farmer_id" "uuid", "_base" "text", "_self_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_product_slug"("_title" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."generate_product_slug"("_title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_buyer_profiles_for_seller"("_buyer_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "full_name" "text", "phone" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT DISTINCT p.user_id, p.full_name, p.phone
  FROM profiles p
  WHERE p.user_id = ANY(_buyer_ids)
    AND EXISTS (
      SELECT 1
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN farmers f ON f.id = oi.farmer_id
      WHERE o.buyer_id = p.user_id
        AND f.user_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."get_buyer_profiles_for_seller"("_buyer_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_farmer_public_stats"("_farmer_id" "uuid") RETURNS TABLE("orders_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT count(DISTINCT oi.order_id)::bigint
  FROM public.order_items oi
  WHERE oi.farmer_id = _farmer_id
    AND oi.status <> 'cancelled'
$$;


ALTER FUNCTION "public"."get_farmer_public_stats"("_farmer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orders_count_by_dates"("p_farmer_ids" "uuid"[], "p_check_dates" "text"[]) RETURNS TABLE("farmer_id" "uuid", "order_date" "text", "order_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.farmer_id,
    to_char(o.created_at, 'YYYY-MM-DD') AS order_date,
    COUNT(*) AS order_count
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.farmer_id = ANY(p_farmer_ids)
    AND to_char(o.created_at, 'YYYY-MM-DD') = ANY(p_check_dates)
    AND o.status NOT IN ('cancelled')
  GROUP BY oi.farmer_id, to_char(o.created_at, 'YYYY-MM-DD');
END;
$$;


ALTER FUNCTION "public"."get_orders_count_by_dates"("p_farmer_ids" "uuid"[], "p_check_dates" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_profile_names"("_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "full_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT p.user_id, p.full_name
  FROM profiles p
  WHERE p.user_id = ANY(_user_ids);
$$;


ALTER FUNCTION "public"."get_public_profile_names"("_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seller_pickup_settings"("farmer_ids" "uuid"[]) RETURNS TABLE("farmer_id" "uuid", "pickup_slots" "jsonb", "max_orders_per_day" integer, "busy_dates" "jsonb", "vacation_dates" "jsonb", "pickup_enabled" boolean, "delivery_enabled" boolean, "delivery_terms" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    f.id,
    f.pickup_slots,
    f.max_orders_per_day,
    f.busy_dates,
    f.vacation_dates,
    f.pickup_enabled,
    f.delivery_enabled,
    f.delivery_terms
  FROM public.farmers f
  WHERE f.id = ANY(farmer_ids)
$$;


ALTER FUNCTION "public"."get_seller_pickup_settings"("farmer_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_order_confirmed_if_all"("_order_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  pending_count int;
BEGIN
  SELECT COUNT(*) INTO pending_count
    FROM public.order_items
   WHERE order_id = _order_id
     AND confirmed_at IS NULL;

  IF pending_count = 0 THEN
    UPDATE public.orders
       SET status = 'confirmed', updated_at = now()
     WHERE id = _order_id
       AND status = 'pending';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."mark_order_confirmed_if_all"("_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."products_set_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."products_set_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seller_posts_set_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."seller_posts_set_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "discount_text" "text",
    "image_url" "text" NOT NULL,
    "link_url" "text",
    "link_category" "text",
    "link_product_id" "text",
    "color_gradient" "text" DEFAULT 'from-black/60 to-black/30'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "emoji" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "seo_title" "text",
    "seo_description" "text",
    "seo_keywords" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_change_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "new_email" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_change_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "district" "text" DEFAULT ''::"text",
    "village" "text",
    "photo_url" "text",
    "city" "text",
    "street" "text",
    "rating" numeric,
    "is_blocked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text",
    "address_details" "text",
    "pickup_slots" "jsonb",
    "max_orders_per_day" integer DEFAULT 5,
    "busy_dates" "jsonb",
    "vacation_dates" "jsonb",
    "telegram_chat_id" "text",
    "telegram_link_code" "text",
    "tagline" "text",
    "about_text" "text",
    "hero_media_url" "text",
    "hero_media_type" "text",
    "location_label" "text",
    "posts_block_title" "text",
    "unique_fact" "text",
    "delivery_note" "text",
    "contacts" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "theme" "text" DEFAULT 'forest'::"text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "trial_started_at" timestamp with time zone,
    "trial_ends_at" timestamp with time zone,
    "pickup_enabled" boolean DEFAULT true NOT NULL,
    "delivery_enabled" boolean DEFAULT false NOT NULL,
    "delivery_cost" integer,
    "free_delivery_from" integer,
    "delivery_terms" "text"
);


ALTER TABLE "public"."farmers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homepage_block_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "block_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."homepage_block_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homepage_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "emoji" "text",
    "block_type" "text" DEFAULT 'all'::"text" NOT NULL,
    "category_filter" "text",
    "max_items" integer DEFAULT 4,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."homepage_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "farmer_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" integer NOT NULL,
    "variant_label" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "custom_fields" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone,
    "settled_at" timestamp with time zone,
    "settled_by" "uuid"
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "pickup_point_id" "uuid",
    "total_amount" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "delivery_type" "text" DEFAULT 'pickup'::"text" NOT NULL,
    "delivery_address" "text",
    "delivery_cost" integer DEFAULT 0,
    "delivery_date" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "estimated_delivery_time" "text",
    "referrer_farmer_id" "uuid",
    "payment_method" "text" DEFAULT 'cash'::"text" NOT NULL,
    "confirmation_method" "text" DEFAULT 'call'::"text" NOT NULL
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "code_hash" "text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "verified" boolean DEFAULT false NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."phone_otp_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_send_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."phone_send_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pickup_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "working_hours" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pickup_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" integer DEFAULT 0 NOT NULL,
    "selection_type" "text" DEFAULT 'checkbox'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_custom_field_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "field_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."product_custom_field_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_custom_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "field_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "label" "text" NOT NULL,
    "placeholder" "text",
    "max_length" integer,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_custom_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "price" integer NOT NULL,
    "unit" "text" DEFAULT 'шт'::"text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "discount_percent" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "price" integer DEFAULT 0 NOT NULL,
    "old_price" integer,
    "unit" "text" DEFAULT 'шт'::"text" NOT NULL,
    "image_url" "text",
    "farmer_id" "uuid",
    "category_id" "uuid",
    "stock" integer DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_new" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "prep_time_minutes" integer DEFAULT 0 NOT NULL,
    "composition" "text",
    "calories" numeric,
    "protein" numeric,
    "fat" numeric,
    "carbs" numeric,
    "shelf_life" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "order_lead_time_hours" integer DEFAULT 0 NOT NULL,
    "slug" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "email" "text",
    "delivery_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone_verified" boolean DEFAULT false NOT NULL,
    "has_password" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seller_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "district" "text",
    "village" "text",
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."seller_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seller_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farmer_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "body" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text"
);


ALTER TABLE "public"."seller_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seller_promos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farmer_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "link_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."seller_promos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visitor_id" "text" NOT NULL,
    "page_path" "text" DEFAULT '/'::"text" NOT NULL,
    "referrer" "text",
    "user_agent" "text",
    "duration_seconds" integer,
    "visited_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farmer_id" "uuid" NOT NULL,
    "plan" "text" NOT NULL,
    "period_months" integer NOT NULL,
    "amount_kopecks" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'buyer'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."email_change_codes"
    ADD CONSTRAINT "email_change_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_otp_codes"
    ADD CONSTRAINT "email_otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmers"
    ADD CONSTRAINT "farmers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmers"
    ADD CONSTRAINT "farmers_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."farmers"
    ADD CONSTRAINT "farmers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."homepage_block_products"
    ADD CONSTRAINT "homepage_block_products_block_id_product_id_key" UNIQUE ("block_id", "product_id");



ALTER TABLE ONLY "public"."homepage_block_products"
    ADD CONSTRAINT "homepage_block_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homepage_blocks"
    ADD CONSTRAINT "homepage_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_otp_codes"
    ADD CONSTRAINT "phone_otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_send_log"
    ADD CONSTRAINT "phone_send_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pickup_points"
    ADD CONSTRAINT "pickup_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_product_id_category_id_key" UNIQUE ("product_id", "category_id");



ALTER TABLE ONLY "public"."product_custom_field_options"
    ADD CONSTRAINT "product_custom_field_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_custom_fields"
    ADD CONSTRAINT "product_custom_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."review_images"
    ADD CONSTRAINT "review_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_applications"
    ADD CONSTRAINT "seller_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_posts"
    ADD CONSTRAINT "seller_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_promos"
    ADD CONSTRAINT "seller_promos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_visits"
    ADD CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_requests"
    ADD CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE UNIQUE INDEX "farmers_telegram_link_code_uniq" ON "public"."farmers" USING "btree" ("telegram_link_code") WHERE ("telegram_link_code" IS NOT NULL);



CREATE INDEX "idx_email_change_codes_user_lookup" ON "public"."email_change_codes" USING "btree" ("user_id", "new_email", "created_at" DESC);



CREATE INDEX "idx_email_otp_codes_email_created" ON "public"."email_otp_codes" USING "btree" ("email", "created_at" DESC);



CREATE INDEX "idx_email_otp_codes_expires" ON "public"."email_otp_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_order_items_settled_at" ON "public"."order_items" USING "btree" ("settled_at");



CREATE INDEX "idx_phone_otp_codes_expires" ON "public"."phone_otp_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_phone_otp_codes_phone" ON "public"."phone_otp_codes" USING "btree" ("phone");



CREATE INDEX "idx_phone_send_log_phone_sent" ON "public"."phone_send_log" USING "btree" ("phone", "sent_at" DESC);



CREATE UNIQUE INDEX "idx_profiles_phone_unique" ON "public"."profiles" USING "btree" ("phone") WHERE ("phone" IS NOT NULL);



CREATE UNIQUE INDEX "products_slug_unique_idx" ON "public"."products" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "seller_posts_farmer_idx" ON "public"."seller_posts" USING "btree" ("farmer_id", "sort_order");



CREATE UNIQUE INDEX "seller_posts_farmer_slug_key" ON "public"."seller_posts" USING "btree" ("farmer_id", "slug");



CREATE INDEX "seller_promos_farmer_idx" ON "public"."seller_promos" USING "btree" ("farmer_id", "sort_order");



CREATE OR REPLACE TRIGGER "trg_products_set_slug" BEFORE INSERT OR UPDATE OF "title", "slug" ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."products_set_slug"();



CREATE OR REPLACE TRIGGER "trg_seller_posts_set_slug" BEFORE INSERT OR UPDATE ON "public"."seller_posts" FOR EACH ROW EXECUTE FUNCTION "public"."seller_posts_set_slug"();



CREATE OR REPLACE TRIGGER "update_subscription_requests_updated_at" BEFORE UPDATE ON "public"."subscription_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homepage_block_products"
    ADD CONSTRAINT "homepage_block_products_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "public"."homepage_blocks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homepage_block_products"
    ADD CONSTRAINT "homepage_block_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pickup_point_id_fkey" FOREIGN KEY ("pickup_point_id") REFERENCES "public"."pickup_points"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_referrer_farmer_id_fkey" FOREIGN KEY ("referrer_farmer_id") REFERENCES "public"."farmers"("id");



ALTER TABLE ONLY "public"."product_addons"
    ADD CONSTRAINT "product_addons_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_custom_field_options"
    ADD CONSTRAINT "product_custom_field_options_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."product_custom_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_custom_fields"
    ADD CONSTRAINT "product_custom_fields_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id");



ALTER TABLE ONLY "public"."review_images"
    ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_posts"
    ADD CONSTRAINT "seller_posts_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_promos"
    ADD CONSTRAINT "seller_promos_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_requests"
    ADD CONSTRAINT "subscription_requests_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "public"."farmers"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete orders" ON "public"."orders" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage app_settings" ON "public"."app_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage banners" ON "public"."banners" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage categories" ON "public"."categories" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage farmers" ON "public"."farmers" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage homepage_block_products" ON "public"."homepage_block_products" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage homepage_blocks" ON "public"."homepage_blocks" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage order items" ON "public"."order_items" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage pickup_points" ON "public"."pickup_points" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can manage products" ON "public"."products" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read all applications" ON "public"."seller_applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read all orders" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can read visits" ON "public"."site_visits" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can update applications" ON "public"."seller_applications" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can update orders" ON "public"."orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can insert roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "user_roles_1"
  WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND ("user_roles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage seller posts" ON "public"."seller_posts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage seller promos" ON "public"."seller_promos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage product_addons" ON "public"."product_addons" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage product_categories" ON "public"."product_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage product_custom_field_options" ON "public"."product_custom_field_options" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage product_custom_fields" ON "public"."product_custom_fields" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage product_images" ON "public"."product_images" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage product_variants" ON "public"."product_variants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins update subscription requests" ON "public"."subscription_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"text")))));



CREATE POLICY "Admins view all subscription requests" ON "public"."subscription_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"text")))));



CREATE POLICY "Anyone can insert visits" ON "public"."site_visits" FOR INSERT WITH CHECK ((("visitor_id" IS NOT NULL) AND ("visitor_id" <> ''::"text")));



CREATE POLICY "Anyone can read app_settings" ON "public"."app_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can read banners" ON "public"."banners" FOR SELECT USING (true);



CREATE POLICY "Anyone can read categories" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can read farmers" ON "public"."farmers" FOR SELECT USING (true);



CREATE POLICY "Anyone can read homepage_block_products" ON "public"."homepage_block_products" FOR SELECT USING (true);



CREATE POLICY "Anyone can read homepage_blocks" ON "public"."homepage_blocks" FOR SELECT USING (true);



CREATE POLICY "Anyone can read pickup_points" ON "public"."pickup_points" FOR SELECT USING (true);



CREATE POLICY "Anyone can read product_addons" ON "public"."product_addons" FOR SELECT USING (true);



CREATE POLICY "Anyone can read product_categories" ON "public"."product_categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can read product_custom_field_options" ON "public"."product_custom_field_options" FOR SELECT USING (true);



CREATE POLICY "Anyone can read product_custom_fields" ON "public"."product_custom_fields" FOR SELECT USING (true);



CREATE POLICY "Anyone can read product_images" ON "public"."product_images" FOR SELECT USING (true);



CREATE POLICY "Anyone can read product_variants" ON "public"."product_variants" FOR SELECT USING (true);



CREATE POLICY "Anyone can read products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Anyone can read review_images" ON "public"."review_images" FOR SELECT USING (true);



CREATE POLICY "Anyone can read reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "No client access to email_change_codes" ON "public"."email_change_codes" USING (false) WITH CHECK (false);



CREATE POLICY "No client access to otp codes" ON "public"."phone_otp_codes" USING (false) WITH CHECK (false);



CREATE POLICY "No client access to send log" ON "public"."phone_send_log" USING (false) WITH CHECK (false);



CREATE POLICY "Owners can manage own seller posts" ON "public"."seller_posts" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "seller_posts"."farmer_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "seller_posts"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owners can manage own seller promos" ON "public"."seller_promos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "seller_promos"."farmer_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "seller_promos"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owners can view own seller posts" ON "public"."seller_posts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "seller_posts"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Owners can view own seller promos" ON "public"."seller_promos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "seller_promos"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Public can view active seller posts" ON "public"."seller_posts" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view active seller promos" ON "public"."seller_promos" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Sellers can delete own order items" ON "public"."order_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "order_items"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers can delete own products" ON "public"."products" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."farmers"
  WHERE (("farmers"."id" = "products"."farmer_id") AND ("farmers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers can insert own order items" ON "public"."order_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "order_items"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers can insert products" ON "public"."products" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farmers"
  WHERE (("farmers"."id" = "products"."farmer_id") AND ("farmers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers can read orders with their items" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."can_seller_read_order"("id"));



CREATE POLICY "Sellers can read own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."farmers"
  WHERE (("farmers"."id" = "order_items"."farmer_id") AND ("farmers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers can update orders for self_pickup delivery" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."can_seller_update_order"("id"));



CREATE POLICY "Sellers can update own farmer" ON "public"."farmers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Sellers can update own order items" ON "public"."order_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farmers"
  WHERE (("farmers"."id" = "order_items"."farmer_id") AND ("farmers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers can update own products" ON "public"."products" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."farmers"
  WHERE (("farmers"."id" = "products"."farmer_id") AND ("farmers"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers create own subscription requests" ON "public"."subscription_requests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "subscription_requests"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers manage own product_addons" ON "public"."product_addons" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_addons"."product_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_addons"."product_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers manage own product_categories" ON "public"."product_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_categories"."product_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_categories"."product_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers manage own product_custom_field_options" ON "public"."product_custom_field_options" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."product_custom_fields" "pcf"
     JOIN "public"."products" "p" ON (("p"."id" = "pcf"."product_id")))
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("pcf"."id" = "product_custom_field_options"."field_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."product_custom_fields" "pcf"
     JOIN "public"."products" "p" ON (("p"."id" = "pcf"."product_id")))
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("pcf"."id" = "product_custom_field_options"."field_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers manage own product_custom_fields" ON "public"."product_custom_fields" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_custom_fields"."product_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_custom_fields"."product_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers manage own product_images" ON "public"."product_images" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_images"."product_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_images"."product_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers manage own product_variants" ON "public"."product_variants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_variants"."product_id") AND ("f"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."farmers" "f" ON (("f"."id" = "p"."farmer_id")))
  WHERE (("p"."id" = "product_variants"."product_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Sellers view own subscription requests" ON "public"."subscription_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farmers" "f"
  WHERE (("f"."id" = "subscription_requests"."farmer_id") AND ("f"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own favorites" ON "public"."favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own review_images" ON "public"."review_images" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."reviews"
  WHERE (("reviews"."id" = "review_images"."review_id") AND ("reviews"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own reviews" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert applications" ON "public"."seller_applications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert order items" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."buyer_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Users can insert own favorites" ON "public"."favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own review_images" ON "public"."review_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."reviews"
  WHERE (("reviews"."id" = "review_images"."review_id") AND ("reviews"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only self-assign buyer role" ON "public"."user_roles" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("role" = 'buyer'::"text")));



CREATE POLICY "Users can read own applications" ON "public"."seller_applications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own favorites" ON "public"."favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."buyer_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_change_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farmers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homepage_block_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homepage_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_send_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pickup_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_addons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_custom_field_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_custom_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seller_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seller_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seller_promos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."can_seller_read_order"("_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_seller_read_order"("_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_seller_update_order"("_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_seller_update_order"("_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_order_items_for_farmer"("_order_id" "uuid", "_farmer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_order_items_for_farmer"("_order_id" "uuid", "_farmer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_order_items_for_farmer"("_order_id" "uuid", "_farmer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_unique_product_slug"("_base" "text", "_self_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_unique_product_slug"("_base" "text", "_self_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_unique_product_slug"("_base" "text", "_self_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_unique_seller_post_slug"("_farmer_id" "uuid", "_base" "text", "_self_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_unique_seller_post_slug"("_farmer_id" "uuid", "_base" "text", "_self_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_unique_seller_post_slug"("_farmer_id" "uuid", "_base" "text", "_self_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_product_slug"("_title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_product_slug"("_title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_product_slug"("_title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_buyer_profiles_for_seller"("_buyer_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_buyer_profiles_for_seller"("_buyer_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farmer_public_stats"("_farmer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farmer_public_stats"("_farmer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farmer_public_stats"("_farmer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_count_by_dates"("p_farmer_ids" "uuid"[], "p_check_dates" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_count_by_dates"("p_farmer_ids" "uuid"[], "p_check_dates" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_profile_names"("_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_profile_names"("_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_profile_names"("_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_seller_pickup_settings"("farmer_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_seller_pickup_settings"("farmer_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_seller_pickup_settings"("farmer_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_order_confirmed_if_all"("_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_order_confirmed_if_all"("_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_order_confirmed_if_all"("_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."products_set_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."products_set_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."products_set_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seller_posts_set_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."seller_posts_set_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seller_posts_set_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."email_change_codes" TO "anon";
GRANT ALL ON TABLE "public"."email_change_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."email_change_codes" TO "service_role";



GRANT ALL ON TABLE "public"."email_otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."email_otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."email_otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."farmers" TO "anon";
GRANT ALL ON TABLE "public"."farmers" TO "authenticated";
GRANT ALL ON TABLE "public"."farmers" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("user_id") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("name") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("description") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("district") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("village") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("photo_url") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("city") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("street") ON TABLE "public"."farmers" TO "authenticated";



GRANT SELECT("rating") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("is_blocked") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("slug") ON TABLE "public"."farmers" TO "anon";



GRANT SELECT("address_details") ON TABLE "public"."farmers" TO "authenticated";



GRANT SELECT("tagline") ON TABLE "public"."farmers" TO "anon";
GRANT SELECT("tagline") ON TABLE "public"."farmers" TO "authenticated";



GRANT SELECT("about_text") ON TABLE "public"."farmers" TO "anon";
GRANT SELECT("about_text") ON TABLE "public"."farmers" TO "authenticated";



GRANT SELECT("hero_media_url") ON TABLE "public"."farmers" TO "anon";
GRANT SELECT("hero_media_url") ON TABLE "public"."farmers" TO "authenticated";



GRANT SELECT("hero_media_type") ON TABLE "public"."farmers" TO "anon";
GRANT SELECT("hero_media_type") ON TABLE "public"."farmers" TO "authenticated";



GRANT SELECT("location_label") ON TABLE "public"."farmers" TO "anon";
GRANT SELECT("location_label") ON TABLE "public"."farmers" TO "authenticated";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_block_products" TO "anon";
GRANT ALL ON TABLE "public"."homepage_block_products" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_block_products" TO "service_role";



GRANT ALL ON TABLE "public"."homepage_blocks" TO "anon";
GRANT ALL ON TABLE "public"."homepage_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."homepage_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."phone_otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."phone_otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."phone_send_log" TO "anon";
GRANT ALL ON TABLE "public"."phone_send_log" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_send_log" TO "service_role";



GRANT ALL ON TABLE "public"."pickup_points" TO "anon";
GRANT ALL ON TABLE "public"."pickup_points" TO "authenticated";
GRANT ALL ON TABLE "public"."pickup_points" TO "service_role";



GRANT ALL ON TABLE "public"."product_addons" TO "anon";
GRANT ALL ON TABLE "public"."product_addons" TO "authenticated";
GRANT ALL ON TABLE "public"."product_addons" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."product_custom_field_options" TO "anon";
GRANT ALL ON TABLE "public"."product_custom_field_options" TO "authenticated";
GRANT ALL ON TABLE "public"."product_custom_field_options" TO "service_role";



GRANT ALL ON TABLE "public"."product_custom_fields" TO "anon";
GRANT ALL ON TABLE "public"."product_custom_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."product_custom_fields" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."review_images" TO "anon";
GRANT ALL ON TABLE "public"."review_images" TO "authenticated";
GRANT ALL ON TABLE "public"."review_images" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."seller_applications" TO "anon";
GRANT ALL ON TABLE "public"."seller_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_applications" TO "service_role";



GRANT ALL ON TABLE "public"."seller_posts" TO "anon";
GRANT ALL ON TABLE "public"."seller_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_posts" TO "service_role";



GRANT ALL ON TABLE "public"."seller_promos" TO "anon";
GRANT ALL ON TABLE "public"."seller_promos" TO "authenticated";
GRANT ALL ON TABLE "public"."seller_promos" TO "service_role";



GRANT ALL ON TABLE "public"."site_visits" TO "anon";
GRANT ALL ON TABLE "public"."site_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."site_visits" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_requests" TO "anon";
GRANT ALL ON TABLE "public"."subscription_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_requests" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







