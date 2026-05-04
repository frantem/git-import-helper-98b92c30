CREATE TABLE public.email_change_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  new_email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_change_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to email_change_codes"
ON public.email_change_codes
FOR ALL
USING (false)
WITH CHECK (false);

CREATE INDEX idx_email_change_codes_user_lookup
ON public.email_change_codes (user_id, new_email, created_at DESC);