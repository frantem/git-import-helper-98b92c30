

## Блок «Как подтвердить заказ?» на странице оформления заказа

### Изменения в БД

В таблицу `orders` добавить колонку:
```sql
ALTER TABLE public.orders 
ADD COLUMN confirmation_method text NOT NULL DEFAULT 'call';
```
Значения: `'call'` (Позвонить) или `'message'` (Написать).

### Изменения в `src/pages/Checkout.tsx`

1. **Состояние** (рядом со строкой 87, после `paymentMethod`):
```ts
const [confirmationMethod, setConfirmationMethod] = useState<"call" | "message">("call");
```

2. **Новый блок UI** (вставить между строкой 1179 и 1181 — то есть между блоком «Оплата при получении» и блоком «Итого»):
```tsx
{/* Confirmation method */}
<div className="rounded-2xl bg-card px-4 py-2.5 shadow-sm mb-4">
  <h2 className="font-bold text-foreground mb-2 text-sm">Как подтвердить заказ?</h2>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setConfirmationMethod("call")}
      className={`rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-colors ${
        confirmationMethod === "call"
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground"
      }`}
    >
      Позвонить
    </button>
    <button
      type="button"
      onClick={() => setConfirmationMethod("message")}
      className={`rounded-lg border-2 px-2 py-1.5 text-xs font-medium transition-colors ${
        confirmationMethod === "message"
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-foreground"
      }`}
    >
      Написать
    </button>
  </div>
</div>
```

3. **Передача в БД** — в `supabase.from("orders").insert({...})` (строка 598, рядом с `payment_method`) добавить:
```ts
confirmation_method: confirmationMethod,
```

### Изменения в `src/pages/admin/AdminOrders.tsx`

1. **Тип `Order`** — после `payment_method: string | null;` (строка 53) добавить:
```ts
confirmation_method: string | null;
```

2. **Запрос `fetchOrders`** (после строки 113) — добавить в select:
```ts
confirmation_method,
```

3. **Вывод в карточке заказа** (после блока «Payment method on delivery», после строки 533) — добавить:
```tsx
{/* Confirmation method */}
<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
  <Phone className="h-4 w-4" />
  <span>
    Подтверждение заказа: {order.confirmation_method === "message" ? "Написать" : "Позвонить"}
  </span>
</div>
```
(Иконка `Phone` из `lucide-react` — проверить импорт, добавить если нет.)

### Файлы

- Миграция БД — добавление колонки `confirmation_method` в `orders`.
- `src/pages/Checkout.tsx` — состояние, UI-блок над «Итого», передача поля в insert.
- `src/pages/admin/AdminOrders.tsx` — тип, select, отображение.

### Что не меняется

- Email-уведомления (`send-new-order-notification`) — в этой задаче не запрошено.
- Дефолтное значение в БД — `'call'` (Позвонить), что совпадает с UI по умолчанию.

