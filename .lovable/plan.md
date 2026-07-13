## Проблема
На `/checkout` при самовывозе рядом с именем продавца выводится полный адрес, включая `address_details` (дом/подъезд/квартира). Эта часть — приватная и должна отправляться покупателю только после оформления заказа (в письме/уведомлении).

## Правка
Файл: `src/pages/Checkout.tsx`

В функции `getFarmerAddress` (строки 359–370) убрать добавление `farmer.address_details` в отображаемую строку. Оставить только `city` и `ул. street`.

```ts
const getFarmerAddress = (farmerId: string | undefined) => {
  if (!farmerId) return "Адрес уточняйте у продавца";
  const farmer = farmersMap.get(farmerId);
  if (!farmer) return "Адрес уточняйте у продавца";

  const parts: string[] = [];
  if (farmer.city) parts.push(farmer.city);
  if (farmer.street) parts.push(`ул. ${farmer.street}`);
  // address_details намеренно не показываем — отправляется покупателю после оформления заказа

  return parts.length > 0 ? parts.join(", ") : "Адрес уточняйте у продавца";
};
```

Логика формирования заказа и уведомлений (email/Telegram после оплаты) уже использует полный адрес отдельно и не затрагивается — правка чисто презентационная.
