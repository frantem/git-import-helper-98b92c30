

## Plan

### Problem
The self-pickup email currently shows one global time (`estimated_delivery_time` from the order), but the user wants per-seller pickup times displayed next to each farmer's block.

### Approach
Pass per-seller pickup times from Checkout to the edge function, since Checkout already has all the seller pickup settings loaded.

### Changes

**1. `src/pages/Checkout.tsx`** (lines 344-358, 416-423)
- Instead of computing pickup time for only the first farmer, compute it for ALL farmers in the cart
- Store the combined text in `estimated_delivery_time` (for order-level display)
- Pass a `seller_times` map (`{ farmerId: "Сегодня 18:30–20:00", ... }`) in the edge function invocation body

**2. `supabase/functions/send-self-pickup-notification/index.ts`**
- Accept optional `seller_times` object from the request body (`{ farmerId: timeText }`)
- In the per-farmer email block, show each farmer's individual time instead of the single global `⏰ Время` section
- Remove the global time block; instead show time per farmer like:

```
Валентина: д.Сокольники, ул. Северная, д. 14
⏰ Сегодня 18:30–20:00
  • Косичка — 1 100гр

Екатерина: Витебск, ул. Чкалова, д. 21, подъезд 2, кв. 46
⏰ Сегодня 19:00–22:30
  • Муссовый торт — 1 1шт
```

### Files to modify
- `src/pages/Checkout.tsx` — compute per-seller times, pass to edge function
- `supabase/functions/send-self-pickup-notification/index.ts` — use per-seller times in email template

