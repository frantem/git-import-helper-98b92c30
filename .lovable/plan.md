

## Plan: Remove "Доставка сегодня бесплатно" from product page

### Changes in `src/pages/Product.tsx`:
1. **Remove lines 587-591** — the delivery block with Truck icon and "Доставка сегодня бесплатно." text
2. **Remove `Truck` from the lucide-react import** (line 2) — no longer used anywhere

Two-line edit, no other files affected.

