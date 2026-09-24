
-- Fix function search paths
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_seller_pickup_settings(UUID[]) SET search_path = public;
ALTER FUNCTION public.get_orders_count_by_dates(UUID[], TEXT[]) SET search_path = public;
