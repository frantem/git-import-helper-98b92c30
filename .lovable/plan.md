

## Блок «Оплата при получении» на странице оформления заказа

### Что есть

В таблице `orders` уже существует колонка `payment_method TEXT DEFAULT 'cash'` (миграция от 13.01) — миграции БД не требуются.

### Изменения в `src/pages/Checkout.tsx`

1. **Состояние** (рядом с другими useState, ~строка 84):
```ts
const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
```

2. **Новый блок UI перед «Итого»** (вставить перед строкой 1151, секция `{/* Order summary */}`):
```tsx
<div className="rounded-2xl bg-card p-4 shadow-sm mb-4">
  <h2 className="font-bold text-foreground mb-3">Оплата при получении</h2>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setPaymentMethod("cash")}
      className={`rounded-xl border-2 p-3 text-sm font-medium transition-colors ${
        paymentMethod === "cash"
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground"
      }`}
    >
      Наличные
    </button>
    <button
      type="button"
      onClick={() => setPaymentMethod("card")}
      className={`rounded-xl border-2 p-3 text-sm font-medium transition-colors ${
        paymentMethod === "card"
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground"
      }`}
    >
      Карта
    </button>
  </div>
</div>
```

3. **Передача в БД** — в `supabase.from("orders").insert({...})` (строка ~571) добавить поле:
```ts
payment_method: paymentMethod,
```

### Изменения в `src/pages/admin/AdminOrders.tsx`

1. **Тип `Order`** (строка ~49) — добавить:
```ts
payment_method: string | null;
```

2. **Запрос `fetchOrders`** (строка ~107) — добавить `payment_method,` в select.

3. **Вывод в карточке заказа** (после блока «Delivery type info», после строки 523) — добавить строку с иконкой:
```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
  <Banknote className="h-4 w-4" />
  <span>
    Оплата при получении: {order.payment_method === "card" ? "Карта" : "Наличные"}
  </span>
</div>
```
(`Banknote` импортируется из `lucide-react`, проверить — добавить если нет).

### Файлы

- `src/pages/Checkout.tsx` — состояние, UI-блок, передача `payment_method` в insert.
- `src/pages/admin/AdminOrders.tsx` — тип, select, отображение.

### Что не меняется

- БД — колонка `payment_method` уже существует со значением по умолчанию `'cash'`.
- Existing email-уведомления (`send-new-order-notification`) — опционально можно расширить, но в этой задаче не запрошено.

