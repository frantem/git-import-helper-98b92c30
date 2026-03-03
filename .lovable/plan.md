

## Plan: Add `estimated_delivery_time` to Admin and Seller order panels

### 1. Admin Orders (`src/pages/admin/AdminOrders.tsx`)

- Add `estimated_delivery_time` to the `Order` interface
- Add `estimated_delivery_time` to the Supabase query (line ~88-110)
- Display it in the order card UI with a Clock icon, same style as on `/orders`

### 2. Seller Orders (`src/pages/seller/SellerOrders.tsx`)

- Add `estimated_delivery_time` to the `SellerOrder` interface
- Add `estimated_delivery_time` to the nested order query inside the `order_items` select (line ~79)
- Pass it through when building the order map
- Display it in the order card UI with a Clock icon

### No database changes needed
The column already exists from the previous migration.

### Files to modify
- `src/pages/admin/AdminOrders.tsx` -- query + interface + UI
- `src/pages/seller/SellerOrders.tsx` -- query + interface + UI

