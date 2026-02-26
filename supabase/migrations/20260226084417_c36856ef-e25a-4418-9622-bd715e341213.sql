
-- ============================================================
-- Locus Marketplace: Full Database Schema
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  email TEXT,
  delivery_address TEXT,
  pickup_slots JSONB,
  max_orders_per_day INTEGER DEFAULT 5,
  busy_dates JSONB,
  vacation_dates JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3. Categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Farmers (sellers)
CREATE TABLE public.farmers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  district TEXT NOT NULL DEFAULT '',
  village TEXT,
  photo_url TEXT,
  city TEXT,
  street TEXT,
  rating NUMERIC,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Products
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  old_price INTEGER,
  unit TEXT NOT NULL DEFAULT 'шт',
  image_url TEXT,
  farmer_id UUID REFERENCES public.farmers(id),
  category_id UUID REFERENCES public.categories(id),
  stock INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  prep_time_minutes INTEGER NOT NULL DEFAULT 0,
  composition TEXT,
  calories NUMERIC,
  protein NUMERIC,
  fat NUMERIC,
  carbs NUMERIC,
  shelf_life TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Product categories (many-to-many)
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  UNIQUE(product_id, category_id)
);

-- 7. Product images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Product variants
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'шт',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  discount_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Product addons
CREATE TABLE public.product_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  selection_type TEXT NOT NULL DEFAULT 'checkbox',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Product custom fields
CREATE TABLE public.product_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL DEFAULT 'text',
  label TEXT NOT NULL,
  placeholder TEXT,
  max_length INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Product custom field options
CREATE TABLE public.product_custom_field_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES public.product_custom_fields(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- 12. Reviews
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Favorites
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- 14. Pickup points
CREATE TABLE public.pickup_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  working_hours TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  pickup_point_id UUID REFERENCES public.pickup_points(id),
  total_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  delivery_type TEXT NOT NULL DEFAULT 'pickup',
  delivery_address TEXT,
  delivery_cost INTEGER DEFAULT 0,
  delivery_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Order items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  farmer_id UUID NOT NULL REFERENCES public.farmers(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  variant_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  custom_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  discount_text TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  link_category TEXT,
  link_product_id TEXT,
  color_gradient TEXT NOT NULL DEFAULT 'from-black/60 to-black/30',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Homepage blocks
CREATE TABLE public.homepage_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  emoji TEXT,
  block_type TEXT NOT NULL DEFAULT 'all',
  category_filter TEXT,
  max_items INTEGER DEFAULT 4,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Homepage block products
CREATE TABLE public.homepage_block_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES public.homepage_blocks(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(block_id, product_id)
);

-- 20. App settings (key-value)
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('cutoff_time_minutes', '1050'),
  ('avg_delivery_time_minutes', '70'),
  ('delivery_start_hour', '6'),
  ('delivery_end_hour', '24'),
  ('favicon_url', ''),
  ('og_image_url', '');

-- 21. Seller applications
CREATE TABLE public.seller_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  district TEXT NOT NULL,
  village TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. Site visits (analytics)
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  user_agent TEXT,
  duration_seconds INTEGER,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Profiles: users can read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: public read, authenticated insert
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categories: public read, admin write
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Farmers: public read
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read farmers" ON public.farmers FOR SELECT USING (true);
CREATE POLICY "Admin can manage farmers" ON public.farmers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Sellers can update own farmer" ON public.farmers FOR UPDATE USING (auth.uid() = user_id);

-- Products: public read active, sellers can manage own
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Sellers can insert products" ON public.products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.farmers WHERE id = farmer_id AND user_id = auth.uid())
);
CREATE POLICY "Sellers can update own products" ON public.products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.farmers WHERE id = farmer_id AND user_id = auth.uid())
);
CREATE POLICY "Admin can manage products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Sellers can delete own products" ON public.products FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.farmers WHERE id = farmer_id AND user_id = auth.uid())
);

-- Product categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage product_categories" ON public.product_categories FOR ALL USING (auth.uid() IS NOT NULL);

-- Product images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage product_images" ON public.product_images FOR ALL USING (auth.uid() IS NOT NULL);

-- Product variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage product_variants" ON public.product_variants FOR ALL USING (auth.uid() IS NOT NULL);

-- Product addons
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_addons" ON public.product_addons FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage product_addons" ON public.product_addons FOR ALL USING (auth.uid() IS NOT NULL);

-- Product custom fields
ALTER TABLE public.product_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_custom_fields" ON public.product_custom_fields FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage product_custom_fields" ON public.product_custom_fields FOR ALL USING (auth.uid() IS NOT NULL);

-- Product custom field options
ALTER TABLE public.product_custom_field_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product_custom_field_options" ON public.product_custom_field_options FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage product_custom_field_options" ON public.product_custom_field_options FOR ALL USING (auth.uid() IS NOT NULL);

-- Reviews: public read, authenticated insert
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Favorites: user-scoped
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Pickup points: public read
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pickup_points" ON public.pickup_points FOR SELECT USING (true);
CREATE POLICY "Admin can manage pickup_points" ON public.pickup_points FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Orders: buyer can read own, admin can read all
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Users can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Admin can read all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can delete orders" ON public.orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Order items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid())
);
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND buyer_id = auth.uid())
);
CREATE POLICY "Sellers can read own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.farmers WHERE id = farmer_id AND user_id = auth.uid())
);
CREATE POLICY "Sellers can update own order items" ON public.order_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.farmers WHERE id = farmer_id AND user_id = auth.uid())
);
CREATE POLICY "Admin can manage order items" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Banners: public read
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read banners" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admin can manage banners" ON public.banners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Homepage blocks: public read
ALTER TABLE public.homepage_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read homepage_blocks" ON public.homepage_blocks FOR SELECT USING (true);
CREATE POLICY "Admin can manage homepage_blocks" ON public.homepage_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Homepage block products
ALTER TABLE public.homepage_block_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read homepage_block_products" ON public.homepage_block_products FOR SELECT USING (true);
CREATE POLICY "Admin can manage homepage_block_products" ON public.homepage_block_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- App settings: public read, admin write
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage app_settings" ON public.app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Seller applications
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own applications" ON public.seller_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert applications" ON public.seller_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can read all applications" ON public.seller_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin can update applications" ON public.seller_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Site visits: public insert (anon tracking), admin read
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update visits" ON public.site_visits FOR UPDATE USING (true);
CREATE POLICY "Admin can read visits" ON public.site_visits FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- Trigger: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RPC: get_seller_pickup_settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_seller_pickup_settings(farmer_ids UUID[])
RETURNS TABLE (
  farmer_id UUID,
  pickup_slots JSONB,
  max_orders_per_day INTEGER,
  busy_dates JSONB,
  vacation_dates JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS farmer_id,
    p.pickup_slots,
    COALESCE(p.max_orders_per_day, 5) AS max_orders_per_day,
    p.busy_dates,
    p.vacation_dates
  FROM public.farmers f
  LEFT JOIN public.profiles p ON p.user_id = f.user_id
  WHERE f.id = ANY(farmer_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC: get_orders_count_by_dates
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_orders_count_by_dates(
  p_farmer_ids UUID[],
  p_check_dates TEXT[]
)
RETURNS TABLE (
  farmer_id UUID,
  order_date TEXT,
  order_count BIGINT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
