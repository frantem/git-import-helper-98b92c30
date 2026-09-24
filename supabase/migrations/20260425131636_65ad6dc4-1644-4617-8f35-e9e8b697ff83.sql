
-- Step 1: Normalize all phone numbers in profiles to +375XXXXXXXXX format
-- Strip spaces, dashes, parentheses; if missing leading +, add it
UPDATE public.profiles
SET phone = (
  CASE
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^375[0-9]{9}$'
      THEN '+' || regexp_replace(phone, '[^0-9]', '', 'g')
    WHEN regexp_replace(phone, '[^0-9]', '', 'g') ~ '^80[0-9]{9}$'
      -- old Belarusian format 80XX -> +375XX
      THEN '+375' || substring(regexp_replace(phone, '[^0-9]', '', 'g') from 3)
    ELSE phone
  END
)
WHERE phone IS NOT NULL;

-- Step 2: For duplicates, keep phone only on the oldest profile (by created_at)
-- Clear phone on the rest
WITH ranked AS (
  SELECT
    user_id,
    phone,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) AS rn
  FROM public.profiles
  WHERE phone IS NOT NULL
)
UPDATE public.profiles p
SET phone = NULL
FROM ranked r
WHERE p.user_id = r.user_id
  AND r.rn > 1;

-- Step 3: Now we can safely create the unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles(phone)
  WHERE phone IS NOT NULL;
