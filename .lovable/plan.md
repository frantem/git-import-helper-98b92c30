

## Plan: Split Seller Dashboard into Separate Pages (like Admin)

### Current State
- `/seller` is a monolithic 1792-line file with 3 tabs: Products, Orders, Settings
- `/admin` is a hub page with links to `/admin/orders`, `/admin/sellers`, etc.

### Target State
- `/seller` becomes a hub page (like `/admin`) with links to sub-pages
- `/seller/products` -- products management (existing Products tab logic)
- `/seller/orders` -- orders page styled like `/admin/orders` but for seller's items only
- `/seller/settings` -- settings page (existing Settings tab logic)

### Files to Create/Modify

**1. `src/pages/SellerDashboard.tsx`** -- Rewrite as hub page
- Grid of 3 cards linking to products, orders, settings
- Show pending orders count badge on Orders card
- Keep auth/farmer checks

**2. `src/pages/seller/SellerProducts.tsx`** -- New file
- Extract Products tab content (product list, product form overlay, all product CRUD logic)
- Back button links to `/seller`

**3. `src/pages/seller/SellerOrders.tsx`** -- New file
- Fetch orders via `order_items` joined with `orders`, grouped by order (like AdminOrders layout)
- Show order cards with: date, buyer name/phone, delivery type, items list with collected status
- Buttons: "Собран" per item, "Выдан" for self-pickup orders when all items collected
- No confirm/delete buttons (that's admin-only)
- Style matches AdminOrders card layout

**4. `src/pages/seller/SellerSettings.tsx`** -- New file
- Extract Settings tab content (farmer profile form, avatar, pickup settings)

**5. `src/App.tsx`** -- Add routes
- `/seller/products`, `/seller/orders`, `/seller/settings`
- Keep `/seller` as hub
- Ensure `/seller/:id` (SellerProfile) still works by placing it after specific routes

### Seller Orders Page Differences from Admin Orders
- Only shows orders containing the seller's items (filtered by farmer_id)
- Only shows the seller's own items within each order (not all items)
- No "Подтвердить" or "Удалить" buttons
- Has "Собран" button per item (mark item as collected)
- Has "Выдан" button for self-pickup orders when all seller's items are collected
- No buyer email shown (privacy)
- Shows buyer name and phone for coordination

