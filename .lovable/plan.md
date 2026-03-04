

## Problem

The `profiles.email` field is never populated. The Settings page reads email from `user.email` (Supabase Auth) but the `handleSaveProfile` function does NOT save it to `profiles.email`. As a result:
- Admin orders show "Email не указан" because they read from `profiles.email` (which is null)
- The edge function `send-delivery-notification` also reads email from `profiles.email`, so it fails

## Fix

### 1. Settings page -- sync email to profiles on save
**File: `src/pages/Settings.tsx`**
- Add `email` to the `handleSaveProfile` update call so that `profiles.email` gets populated when the user saves their profile

### 2. Update `handle_new_user` trigger to copy email
**Migration:** Update the `handle_new_user()` function to also copy `new.email` into `profiles.email` on user creation, so new users automatically have their email in the profiles table

### 3. Edge function fallback to `auth.users`
**File: `supabase/functions/send-delivery-notification/index.ts`**
- If `profiles.email` is null, use the service client to fetch email from `auth.users` table as a fallback. This ensures the notification works even for users who haven't saved their settings yet

### Files to modify
- `src/pages/Settings.tsx` -- add email to profile save
- `supabase/functions/send-delivery-notification/index.ts` -- auth.users email fallback
- Database migration -- update `handle_new_user` trigger

