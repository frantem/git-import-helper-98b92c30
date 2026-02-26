-- Create pickup_points table
CREATE TABLE public.pickup_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  working_hours TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pickup_points
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;

-- Everyone can view active pickup points
CREATE POLICY "Pickup points are viewable by everyone"
ON public.pickup_points FOR SELECT
USING (is_active = true);

-- Admins can manage pickup points
CREATE POLICY "Admins can manage pickup points"
ON public.pickup_points FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  pickup_point_id UUID REFERENCES public.pickup_points(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount INTEGER NOT NULL,
  delivery_date DATE,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own orders
CREATE POLICY "Buyers can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = buyer_id);

-- Buyers can create their own orders
CREATE POLICY "Buyers can create their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update orders
CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  farmer_id UUID NOT NULL REFERENCES public.farmers(id),
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own order items
CREATE POLICY "Buyers can view their own order items"
ON public.order_items FOR SELECT
USING (order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid()));

-- Buyers can create order items for their orders
CREATE POLICY "Buyers can create order items"
ON public.order_items FOR INSERT
WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid()));

-- Farmers can view order items for their products
CREATE POLICY "Farmers can view their order items"
ON public.order_items FOR SELECT
USING (farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid()));

-- Farmers can update status of their order items
CREATE POLICY "Farmers can update their order items"
ON public.order_items FOR UPDATE
USING (farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid()));

-- Admins can view all order items
CREATE POLICY "Admins can view all order items"
ON public.order_items FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add phone to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Insert some default pickup points
INSERT INTO public.pickup_points (name, address, working_hours) VALUES
  ('ТЦ "Корона"', 'г. Витебск, ул. Ленина, 15', 'Сб 10:00-14:00'),
  ('ТЦ "Европа"', 'г. Витебск, пр. Московский, 23', 'Сб 10:00-14:00'),
  ('Рынок "Смоленский"', 'г. Витебск, ул. Смоленская, 8', 'Сб 09:00-13:00');