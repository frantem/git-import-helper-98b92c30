ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET phone_verified = true
WHERE phone IS NOT NULL AND phone <> '';

NOTIFY pgrst, 'reload schema';