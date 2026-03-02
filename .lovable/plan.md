

## Plan: Delivery type-aware notifications and "Выдан" button

### Current state

- `AdminOrders.tsx` `handleDeliverOrder` always calls `send-delivery-notification` edge function regardless of `delivery_type`
- `send-delivery-notification` always sends "Заказ прибыл в пункт выдачи" email
- `SellerDashboard.tsx` shows order items with "Собран" button but has no "Выдан" button for self-pickup orders
- `delivery_type` values in the system: `pickup`, `courier`, `self_pickup`

### Changes

#### 1. `AdminOrders.tsx` — `handleDeliverOrder` logic

Split behavior by `delivery_type`:
- **`pickup`**: update status to `delivered` + send email via `send-delivery-notification` (pickup point notification)
- **`courier`**: update status to `delivered`, NO email
- **`self_pickup`**: update status to `delivered`, NO email

Change button label based on `delivery_type`:
- `pickup` → "Прибыл в ПВЗ"
- `courier` → "Доставлен"
- `self_pickup` → "Выдан"

#### 2. `send-delivery-notification/index.ts` — add `delivery_type` check

Fetch `delivery_type` along with order data. If `delivery_type !== 'pickup'`, return early with success (no email sent). This is a safety net in case the function is called incorrectly.

#### 3. `SellerDashboard.tsx` — add "Выдан" button for self-pickup

The seller dashboard currently shows individual order items, not full orders. For `self_pickup` orders, after all items are marked "Собран", show a "Выдан" button that updates the order status to `delivered` without sending any email. This requires fetching `delivery_type` from the order join.

### Technical details

**AdminOrders.tsx changes (~lines 190-230, 492-501):**
- In `handleDeliverOrder`: wrap email sending in `if (order.delivery_type === 'pickup')` conditional
- In button rendering: show different label/icon per `delivery_type`, all call `handleDeliverOrder` which internally decides whether to email

**send-delivery-notification/index.ts (~lines 112-123):**
- Add `delivery_type` to the select query
- After fetching order, if `delivery_type !== 'pickup'`, return `{ message: "No email needed for this delivery type" }` with 200

**SellerDashboard.tsx (~lines 69-89, 228-242, 933-1013):**
- Add `delivery_type` and `order_id` to the `OrderItem` interface and query (from the `order` join)
- After the order items list, for items where `delivery_type === 'self_pickup'` and `status === 'collected'`, group by `order_id` and show a "Выдан" button
- The button calls a new `handleMarkDelivered(orderId)` function that updates `orders.status = 'delivered'` without any email

