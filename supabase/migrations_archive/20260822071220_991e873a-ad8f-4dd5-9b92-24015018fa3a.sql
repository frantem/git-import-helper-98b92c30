GRANT SELECT ON public.farmers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.farmers TO authenticated;
GRANT ALL ON public.farmers TO service_role;