

## Plan

### 1. Add address fields to farmers table (Migration)
Add three new nullable text columns to `farmers`: `house`, `entrance`, `apartment`.

### 2. Update SellerSettings page
- Add `house`, `entrance`, `apartment` to the form state and save logic
- Add three Input fields under the existing "Улица" field in the "Адрес для самовывоза" section
- Load and save these fields from/to the `farmers` table

### 3. Create new Edge Function: `send-self-pickup-notification`
A new function that:
- Accepts `order_id`, fetches the order (validates `delivery_type = 'self'`)
- Gets buyer email (profiles → auth.users fallback)
- Gets all unique farmer IDs from order items
- Fetches farmer address details (city, street, house, entrance, apartment, name)
- Gets `estimated_delivery_time` from the order
- Sends an email to the buyer with: pickup time window and full farmer addresses
- No admin auth required — called by the buyer at checkout

### 4. Update Checkout page
After successful order creation, if `deliveryType === "self"`, invoke `send-self-pickup-notification` with the order ID (non-blocking, same pattern as `send-new-order-notification`).

### 5. Update FarmerInfo interface in Checkout
Add `house`, `entrance`, `apartment` to the `FarmerInfo` interface and the farmer select query so the address display in checkout also shows the full address.

### Files to modify
- `supabase/migrations/` — new migration for `house`, `entrance`, `apartment` columns
- `src/pages/seller/SellerSettings.tsx` — form fields + save
- `supabase/functions/send-self-pickup-notification/index.ts` — new edge function
- `supabase/config.toml` — register new function with `verify_jwt = false`
- `src/pages/Checkout.tsx` — invoke notification + update FarmerInfo interface
- `src/integrations/supabase/types.ts` — auto-updated by migration

