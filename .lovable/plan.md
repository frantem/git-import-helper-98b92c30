

## Проблема

`custom_fields` сохраняется в БД через `JSON.stringify()` (Checkout.tsx, строка 602), что превращает объект в строку. Хотя колонка `jsonb`, Supabase возвращает значение как есть — строку JSON внутри JSON. В итоге `OrderItemCustomFields` получает строку `"{\"fields\":[...]}"` вместо объекта, и `.fields` возвращает `undefined`.

Видно из сетевого ответа:
```
"custom_fields": "{\"fields\":[{\"fieldId\":\"70ea21b5-...\",\"label\":\"Тесто\",\"value\":\"Изюм\",\"fieldType\":\"select\"}]}"
```

## Решение

Исправить в одном месте — в компоненте `OrderItemCustomFields.tsx` — добавить автоматический парсинг строки:

**Файл: `src/components/OrderItemCustomFields.tsx`**

В начале компонента перед проверкой `hasFields`/`hasAddons` добавить:
```typescript
const parsed: CustomFieldsData | null = typeof customFields === 'string' 
  ? JSON.parse(customFields) 
  : customFields ?? null;
```

И использовать `parsed` вместо `customFields` далее. Это починит отображение во всех местах (AdminOrders, Orders, SellerOrders) одним изменением.

1 файл изменён.

