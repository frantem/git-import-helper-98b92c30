

## Problem

The buyer's Orders page (`/orders`) shows only the order date, total amount, status, and pickup point. It does not show:
- What products were ordered (item names, quantities)
- Delivery type (pickup point / courier / self-pickup at farmer)
- Delivery address (for courier orders)
- Delivery date context based on delivery type

## Fix

Expand the query and UI in `src/pages/Orders.tsx`:

### Data changes
- Add `delivery_type`, `delivery_address`, `notes` to the order query
- Join `order_items` with `products` to get item names, quantities, unit prices, and variant labels

### Interface update
```typescript
interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  variant_label: string | null;
  product: { title: string } | null;
}

interface Order {
  // existing fields...
  delivery_type: string;
  delivery_address: string | null;
  notes: string | null;
  items: OrderItem[];
}
```

### Query update
```sql
select id, total_amount, status, delivery_date, delivery_type, delivery_address, notes, created_at,
  pickup_point:pickup_points(name, address),
  items:order_items(id, quantity, unit_price, variant_label, product:products(title))
```

### UI additions per order card
1. **Delivery info section** -- show delivery type label with icon:
   - `pickup` -> "Пункт выдачи" + pickup point name & address
   - `courier` -> "Доставка курьером" + delivery address
   - `self` -> "Самовывоз у фермера"

2. **Delivery date** -- contextual label:
   - `pickup`/`courier` -> "Доставка: {date}"
   - `self` -> "Забрать: {date}"

3. **Items list** -- below delivery info, a bordered section listing each product:
   - Product title (with variant if present), quantity, and line total

### File: `src/pages/Orders.tsx`
Single file change. No database or migration changes needed.

