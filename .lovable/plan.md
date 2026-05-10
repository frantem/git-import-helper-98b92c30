## Показывать реферера в /seller/orders

По аналогии с /admin/orders, в карточке заказа на странице продавца отображать "Пришёл от: {Имя фермера}", если у заказа есть `referrer_farmer_id`. Если нет — ничего не показывать.

### Файл: `src/pages/seller/SellerOrders.tsx`

1. В тип `SellerOrder` добавить поле `referrer_farmer_name: string | null`.
2. В SELECT по `order_items.order` добавить `referrer_farmer_id`.
3. После сборки `orderMap` собрать уникальные `referrer_farmer_id`, одним запросом получить имена из `farmers` (`select id, name`) и положить в Map.
4. При маппинге заказа подставить `referrer_farmer_name` (или null).
5. В разметке карточки (рядом с блоком покупателя/доставки) добавить:
   ```tsx
   {order.referrer_farmer_name && (
     <div className="flex items-center gap-2 text-sm text-primary mb-2">
       <User className="h-4 w-4" />
       <span>Пришёл от: {order.referrer_farmer_name}</span>
     </div>
   )}
   ```

Изменения только во фронтенде, миграции БД не нужны (поле `referrer_farmer_id` уже есть в `orders`, таблица `farmers` доступна на чтение всем).
