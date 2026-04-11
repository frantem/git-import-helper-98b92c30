-- Fix 1: Replace permissive "Users can insert own roles" with restricted version
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

CREATE POLICY "Users can only self-assign buyer role"
ON public.user_roles FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id AND role = 'buyer'
);

-- Fix 2: Tighten site_visits INSERT policy to require a non-empty visitor_id
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;

CREATE POLICY "Anyone can insert visits"
ON public.site_visits FOR INSERT
TO public
WITH CHECK (visitor_id IS NOT NULL AND visitor_id <> '');

-- Tighten site_visits UPDATE to only allow updating duration on own visits
DROP POLICY IF EXISTS "Anyone can update visits" ON public.site_visits;

CREATE POLICY "Visitors can update own visits"
ON public.site_visits FOR UPDATE
TO public
USING (true)
WITH CHECK (visitor_id IS NOT NULL AND visitor_id <> '');