-- Add email column to profiles table for storing user email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create a trigger to copy email from auth.users to profiles on profile creation
CREATE OR REPLACE FUNCTION public.copy_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET email = (SELECT email FROM auth.users WHERE id = NEW.user_id)
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$function$;

-- Create trigger to run after profile insert
DROP TRIGGER IF EXISTS copy_email_on_profile_create ON public.profiles;
CREATE TRIGGER copy_email_on_profile_create
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.copy_user_email();

-- Update existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;