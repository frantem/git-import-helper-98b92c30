

## Problem

`supabase.auth.updateUser({ email })` shows a success toast, but the confirmation email never arrives. This happens because the project uses Supabase's **default email provider** (built-in), which has a rate limit of ~3 emails per hour and limited deliverability. The project has Resend configured for transactional notifications but **not** for auth emails (no `auth-email-hook` edge function exists).

## Fix

### 1. Improve the Settings page UX (`src/pages/Settings.tsx`)

- Add a check: if the entered email is the same as the current one, show a toast "Этот email уже используется" and skip the API call
- After a successful `updateUser` call, show a more detailed message: "Письмо для подтверждения отправлено на {email}. Проверьте папку «Спам»."

### 2. Set up Lovable Auth Email Templates for reliable delivery

Since the project already has Resend (`RESEND_API_KEY`) and a verified domain (`locusfood.by`), I'll scaffold and deploy the `auth-email-hook` edge function. This will route **all** auth emails (email change confirmation, password reset, magic links, etc.) through Resend via `locusfood.by`, ensuring reliable delivery.

Steps:
1. Call `scaffold_auth_email_templates` to create templates
2. Brand them to match the app's style (colors, language — all in Russian)
3. Deploy `auth-email-hook` edge function

### Files to modify
- `src/pages/Settings.tsx` — same-email validation + better toast message
- `supabase/functions/auth-email-hook/` — new (scaffolded + branded)
- `supabase/functions/_shared/email-templates/` — new (scaffolded + branded)

