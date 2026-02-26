-- Allow admins to insert farmer profiles when approving seller applications
CREATE POLICY "Admins can insert farmer profiles"
ON public.farmers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));