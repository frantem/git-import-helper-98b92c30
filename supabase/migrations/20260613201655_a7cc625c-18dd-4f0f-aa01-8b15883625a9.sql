CREATE TABLE public.email_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_otp_codes TO service_role;

ALTER TABLE public.email_otp_codes ENABLE ROW LEVEL SECURITY;

-- No public policies: this table is only accessed via SECURITY DEFINER edge functions using service_role.

CREATE INDEX idx_email_otp_codes_email_created ON public.email_otp_codes(email, created_at DESC);
CREATE INDEX idx_email_otp_codes_expires ON public.email_otp_codes(expires_at);