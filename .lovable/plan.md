

## Что нужно

В `/admin/orders` добавить три действия в каждом заказе:
1. **Изменить количество** товара (в строке товара).
2. **Удалить товар** из заказа.
3. **Добавить товар по ID** товара.

После любого действия — **пересчитать `orders.total_amount`** в БД (плюс сохранить `delivery_cost`), чтобы продавец и покупатель видели изменения. Без анимаций, минимум UI.

## Реализация

### 1. UI в `src/pages/admin/AdminOrders.tsx`

В каждой строке товара (внутри блока `group.items.map`) рядом с количеством добавить:
- поле `<input type="number" min="1">` с текущим `quantity` + кнопка **Сохранить** (появляется только если значение изменилось).
- кнопка **Удалить** (мусорка) с `AlertDialog` для подтверждения.

Под списком товаров заказа добавить простую форму:
- `<input>` для **Product ID** (UUID) + `<input type="number">` для количества + кнопка **Добавить товар**.

### 2. Хелпер пересчёта суммы

Функция `recalcOrderTotal(orderId)`:
1. Загружает все `order_items` по `order_id` (`unit_price`, `quantity`).
2. Считает `itemsSum = Σ(unit_price * quantity)`.
3. Загружает `orders.delivery_cost`.
4. `UPDATE orders SET total_amount = itemsSum + delivery_cost, updated_at = now() WHERE id = orderId`.

Вызывается после каждой операции (изменение qty / удаление / добавление).

### 3. Действия

**Изменение количества**
```ts
await supabase.from("order_items").update({ quantity: newQty }).eq("id", itemId);
await recalcOrderTotal(orderId);
await fetchOrders();
```

**Удаление товара**
```ts
await supabase.from("order_items").delete().eq("id", itemId);
await recalcOrderTotal(orderId);
await fetchOrders();
```
Если в заказе остаётся 0 товаров — показать `toast.warning`, заказ оставляем (админ может удалить целиком существующей кнопкой).

**Добавление товара по ID**
```ts
// 1. Получить продукт
const { data: product } = await supabase
  .from("products")
  .select("id, title, price, farmer_id")
  .eq("id", productId)
  .single();
if (!product) return toast.error("Товар не найден");

// 2. Вставить order_item
await supabase.from("order_items").insert({
  order_id: orderId,
  product_id: product.id,
  farmer_id: product.farmer_id,
  quantity: qty,
  unit_price: product.price,
  status: "pending",
});

// 3. Пересчитать
await recalcOrderTotal(orderId);
await fetchOrders();
```

### 4. Права (RLS — уже OK)
- `orders` UPDATE: «Admin can update orders» ✓
- `order_items`: «Admin can manage order items» (ALL) ✓
- `products` SELECT: публично ✓

Дополнительные миграции **не нужны**.

### 5. Видимость изменений
- **Покупатель** (`src/pages/Orders.tsx`) — читает свежие `order_items` при заходе → увидит новое количество/новые товары/удалённые.
- **Продавец** (`src/pages/seller/SellerOrders.tsx`) — то же самое: читает по `farmer_id`. Если админ добавил товар другого фермера — он появится у того фермера; если изменил qty/удалил — обновится.
- `orders.total_amount` пересчитан → во всех местах (Profile/Orders/SellerOrders) сумма синхронна.

### 6. Файлы
- `src/pages/admin/AdminOrders.tsx` — UI для qty (input + save), delete-item, add-item-by-id, функция `recalcOrderTotal`, локальный state для редактируемых полей.

Без анимаций, без оптимистичных апдейтов: после каждой операции — `fetchOrders()` для свежих данных.

