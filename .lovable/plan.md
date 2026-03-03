

## Problem

When admin clicks "Прибыл в ПВЗ", the edge function `send-delivery-notification` fails and the email is not sent. The toast shows "Статус обновлён, но email не отправлен".

## Root Cause Analysis

The edge function uses the user's auth token (anon key + Authorization header) to query the database. This means all queries go through RLS policies. The `orders` RLS policy for admin checks `user_roles` via a subquery, while `user_roles` itself has RLS -- this creates a nested RLS check that can fail or cause issues in the edge function context.

I redeployed the function, which might fix it if it was a stale deployment issue. But to make it robust, the fix is:

## Fix

**File: `supabase/functions/send-delivery-notification/index.ts`**

Use a two-client approach in the edge function:
1. **Auth client** (anon key + user token) -- only for `getUser()` to verify identity
2. **Service role client** (service role key) -- for all data queries (orders, profiles, user_roles), bypassing RLS entirely

This eliminates any RLS-related failures while still verifying the caller is an authenticated admin.

Changes:
- Create a second supabase client using `SUPABASE_SERVICE_ROLE_KEY`
- Use it for the admin role check, order fetch, and profile fetch
- Keep auth validation with the user-token client
- Add better error logging with specific failure points

This is a single-file change to the edge function. It will be automatically redeployed.

