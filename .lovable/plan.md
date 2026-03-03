

## Problem

`useProducts()` fetches only 50 most recent products (`.limit(50)`). There are 76 active products total. All honey products were created in January 2026 and are among the oldest, so they don't make it into the top 50. This means:

1. The "Мёд" block on the homepage shows nothing (no honey products in the fetched set)
2. The catalog page for honey category shows "Товары не найдены" (same reason)
3. Any other older products are also missing

## Fix

Remove the `.limit(50)` from `useProducts()` in `src/hooks/useProducts.ts`. With 76 products this is perfectly fine to fetch all at once. If the catalog grows significantly in the future, a proper pagination or per-block server-side query would be needed, but for now fetching all ~76 products is the correct approach.

### File: `src/hooks/useProducts.ts`
- Remove `.limit(50)` from the query (line ~68)

One line change, no other files affected.

