UPDATE public.profiles
SET email = u.email
FROM auth.users u
WHERE profiles.user_id = u.id
  AND (profiles.email IS NULL OR profiles.email = '');