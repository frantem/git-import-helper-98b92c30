
-- 1. Replace open profiles SELECT policy
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- 2. Function to get public profile names (for reviews display)
CREATE OR REPLACE FUNCTION public.get_public_profile_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM profiles p
  WHERE p.user_id = ANY(_user_ids);
$$;

-- 3. Function to get buyer profiles for a seller's orders
CREATE OR REPLACE FUNCTION public.get_buyer_profiles_for_seller(_buyer_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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
