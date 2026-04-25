-- OTP codes table
CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_codes_phone ON public.phone_otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otp_codes_expires ON public.phone_otp_codes(expires_at);

ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;

-- Deny all client access; only service role (which bypasses RLS) can use these
CREATE POLICY "No client access to otp codes"
  ON public.phone_otp_codes FOR ALL
  USING (false) WITH CHECK (false);

-- Send log table for rate limiting
CREATE TABLE IF NOT EXISTS public.phone_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_send_log_phone_sent ON public.phone_send_log(phone, sent_at DESC);

ALTER TABLE public.phone_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to send log"
  ON public.phone_send_log FOR ALL
  USING (false) WITH CHECK (false);

-- Reload PostgREST schema cache so edge functions see the new tables immediately
NOTIFY pgrst, 'reload schema';