ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_password boolean NOT NULL DEFAULT false;

UPDATE public.profiles p
   SET has_password = true
  FROM auth.users u
 WHERE u.id = p.user_id
   AND u.encrypted_password IS NOT NULL
   AND length(u.encrypted_password) > 0;