
-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create farmers table
CREATE TABLE public.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  district TEXT NOT NULL,
  village TEXT,
  description TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) NOT NULL,
  farmer_id UUID REFERENCES public.farmers(id) NOT NULL,
  price INTEGER NOT NULL, -- in kopecks
  old_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'кг', -- кг, литр, пучок, банка 0.5л, шт
  packaging TEXT, -- стекло, крафт-пакет, сетка
  harvest_date DATE,
  image_url TEXT,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Categories are public
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Farmers are public
CREATE POLICY "Farmers are viewable by everyone" ON public.farmers FOR SELECT USING (true);
CREATE POLICY "Users can update their own farmer profile" ON public.farmers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own farmer profile" ON public.farmers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Products are public for viewing
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Farmers can insert their own products" ON public.products FOR INSERT 
  WITH CHECK (farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid()));
CREATE POLICY "Farmers can update their own products" ON public.products FOR UPDATE 
  USING (farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid()));
CREATE POLICY "Farmers can delete their own products" ON public.products FOR DELETE 
  USING (farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_farmers_updated_at
  BEFORE UPDATE ON public.farmers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
