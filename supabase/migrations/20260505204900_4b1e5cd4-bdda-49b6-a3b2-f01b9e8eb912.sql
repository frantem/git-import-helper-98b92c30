REVOKE SELECT (street, address_details) ON public.farmers FROM anon;
GRANT  SELECT (street, address_details) ON public.farmers TO authenticated;

DROP POLICY IF EXISTS "Authenticated can manage product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated can manage product_custom_fields" ON public.product_custom_fields;
DROP POLICY IF EXISTS "Authenticated can manage product_custom_field_options" ON public.product_custom_field_options;
DROP POLICY IF EXISTS "Authenticated can manage product_images" ON public.product_images;
DROP POLICY IF EXISTS "Authenticated can manage product_addons" ON public.product_addons;
DROP POLICY IF EXISTS "Authenticated can manage product_categories" ON public.product_categories;

CREATE POLICY "Sellers manage own product_variants" ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_variants.product_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_variants.product_id AND f.user_id = auth.uid()));
CREATE POLICY "Admins manage product_variants" ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Sellers manage own product_custom_fields" ON public.product_custom_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_custom_fields.product_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_custom_fields.product_id AND f.user_id = auth.uid()));
CREATE POLICY "Admins manage product_custom_fields" ON public.product_custom_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Sellers manage own product_custom_field_options" ON public.product_custom_field_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_custom_fields pcf JOIN public.products p ON p.id = pcf.product_id JOIN public.farmers f ON f.id = p.farmer_id WHERE pcf.id = product_custom_field_options.field_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_custom_fields pcf JOIN public.products p ON p.id = pcf.product_id JOIN public.farmers f ON f.id = p.farmer_id WHERE pcf.id = product_custom_field_options.field_id AND f.user_id = auth.uid()));
CREATE POLICY "Admins manage product_custom_field_options" ON public.product_custom_field_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Sellers manage own product_images" ON public.product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_images.product_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_images.product_id AND f.user_id = auth.uid()));
CREATE POLICY "Admins manage product_images" ON public.product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Sellers manage own product_addons" ON public.product_addons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_addons.product_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_addons.product_id AND f.user_id = auth.uid()));
CREATE POLICY "Admins manage product_addons" ON public.product_addons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Sellers manage own product_categories" ON public.product_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_categories.product_id AND f.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.farmers f ON f.id = p.farmer_id WHERE p.id = product_categories.product_id AND f.user_id = auth.uid()));
CREATE POLICY "Admins manage product_categories" ON public.product_categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Visitors can update own visits" ON public.site_visits;
DROP POLICY IF EXISTS "Users can update own review_images" ON public.review_images;

REVOKE EXECUTE ON FUNCTION public.can_seller_read_order(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_seller_update_order(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_buyer_profiles_for_seller(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_orders_count_by_dates(uuid[], text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_seller_pickup_settings(uuid[]) FROM anon;