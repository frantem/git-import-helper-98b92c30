

## Problem

When a buyer places an order, they see an estimated delivery/pickup time window (e.g. "Сегодня 18:30-19:30") on the checkout page. But this value is never stored in the database, so on the `/orders` page there's no way to show it.

The `orders` table has `delivery_date` (stores date like "2025-06-15") and `notes` (stores scheduled time text), but no field for the calculated delivery time window.

## Plan

### 1. Add `estimated_delivery_time` column to `orders` table

New column: `estimated_delivery_time text NULL` -- stores the display string like "Сегодня 18:30–19:30" or "Завтра 10:00–11:00".

### 2. Save the value at checkout (`src/pages/Checkout.tsx`)

In `handleOrder`, add `estimated_delivery_time` to the insert payload:
- For **courier + "nearest"** mode: save `fastDeliveryResult.text`
- For **courier + "scheduled"** mode: save the selected date+time string
- For **pickup**: save `fastDeliveryResult.text` (the pickup point delivery estimate)
- For **self**: save pickup time text per seller (or the overall estimate)

### 3. Display on Orders page (`src/pages/Orders.tsx`)

Add `estimated_delivery_time` to the query and `Order` interface. Show it in each order card with a clock icon, e.g.:
```
🕐 Ожидаемое время: Сегодня 18:30–19:30
```

### Variable name
The new database column and TypeScript field: **`estimated_delivery_time`**

### Files changed
- **Migration**: Add column `estimated_delivery_time text` to `orders`
- **`src/pages/Checkout.tsx`**: Save `estimated_delivery_time` on order insert
- **`src/pages/Orders.tsx`**: Fetch and display `estimated_delivery_time`

