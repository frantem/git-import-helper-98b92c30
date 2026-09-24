-- Drop existing SELECT policy for pickup_points
DROP POLICY IF EXISTS "Pickup points are viewable by everyone" ON public.pickup_points;

-- Create policy for public to view active pickup points
CREATE POLICY "Active pickup points are viewable by everyone" 
ON public.pickup_points 
FOR SELECT 
USING (is_active = true);

-- Create policy for admins to view ALL pickup points (including inactive)
CREATE POLICY "Admins can view all pickup points" 
ON public.pickup_points 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));