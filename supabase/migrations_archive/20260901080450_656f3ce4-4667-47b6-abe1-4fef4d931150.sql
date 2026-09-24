ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  plan text NOT NULL,
  period_months integer NOT NULL,
  amount_kopecks integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.subscription_requests TO authenticated;
GRANT ALL ON public.subscription_requests TO service_role;

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own subscription requests"
ON public.subscription_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()));

CREATE POLICY "Sellers create own subscription requests"
ON public.subscription_requests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.farmers f WHERE f.id = farmer_id AND f.user_id = auth.uid()));

CREATE POLICY "Admins view all subscription requests"
ON public.subscription_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Admins update subscription requests"
ON public.subscription_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_subscription_requests_updated_at ON public.subscription_requests;
CREATE TRIGGER update_subscription_requests_updated_at
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();