

## Plan

Update `supabase/functions/send-self-pickup-notification/index.ts` with these changes:

### 1. Include product names in order items query
Change the `order_items` select from `"farmer_id"` to `"farmer_id, quantity, product:products(title, unit)"` so we can list what the buyer needs to pick up from each seller.

### 2. Group items by farmer and build per-farmer blocks
For each farmer, show:
- Farmer name + full address (city, street, house, entrance, apartment — already fetched, already rendered correctly in the code but the user says it's missing house/entrance/apartment — this is likely because the seller hadn't filled them in yet, but the code at lines 137-139 already handles them. No code change needed for address logic.)
- List of products to pick up from that farmer (name × quantity)

### 3. Update email template text
- Title: `"🏠 Самовывоз у фермера"` → `"LocusFood 🏠 Самовывоз"`
- Footer: replace "свяжитесь с продавцом через наш сайт" → "свяжитесь с менеджером +375297399485 (Артём)"
- Email subject: `"🏠 Адрес для самовывоза — Locus"` → `"LocusFood 🏠 Самовывоз"`

### 4. Build per-farmer blocks with products
Each farmer block will show:
```
Анна: Витебск, ул. Зеньковой, д. 5, подъезд 2, кв. 10
  • Мёд — 2 шт.
  • Творог — 1 кг
```

### File to modify
- `supabase/functions/send-self-pickup-notification/index.ts`

