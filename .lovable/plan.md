

## Problem

In AdminOrders, for `self_pickup` orders the admin sees a "Выдан" button after confirming the order. But self-pickup flow should be fully handled by the seller: seller marks items as "Собран", then presses "Выдан" in their dashboard. The admin should not need to interact with self-pickup orders beyond confirming them.

## Fix

**`src/pages/admin/AdminOrders.tsx` (line 495-504):**

Hide the deliver button for `self_pickup` orders. Only show it for `pickup` ("Прибыл в ПВЗ") and `courier` ("Доставлен"):

```
{order.status === "confirmed" && order.delivery_type !== "self_pickup" && (
  <Button ...>
    <Truck />
    {order.delivery_type === "pickup" ? "Прибыл в ПВЗ" : "Доставлен"}
  </Button>
)}
```

For self_pickup orders, the admin will see only the status badge (e.g. "Подтверждён") and a note that the seller handles handover. The seller uses the existing "Выдан" button in their SellerDashboard.

No other changes needed — the seller dashboard already has the "Выдан" button working via `handleMarkDelivered`.

