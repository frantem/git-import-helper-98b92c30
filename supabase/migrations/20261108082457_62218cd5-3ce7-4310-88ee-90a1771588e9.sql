CREATE OR REPLACE FUNCTION public.initialize_seller_trial()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.plan = 'free' AND NEW.trial_started_at IS NULL AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_started_at := now();
    NEW.trial_ends_at := NEW.trial_started_at + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER initialize_seller_trial_before_insert BEFORE INSERT ON public.farmers FOR EACH ROW EXECUTE FUNCTION public.initialize_seller_trial();
UPDATE public.farmers SET trial_started_at = now(), trial_ends_at = now() + interval '30 days' WHERE plan = 'free' AND trial_started_at IS NULL AND trial_ends_at IS NULL;
UPDATE public.farmers SET trial_ends_at = trial_started_at + interval '30 days' WHERE trial_started_at IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_ends_at < trial_started_at + interval '30 days';