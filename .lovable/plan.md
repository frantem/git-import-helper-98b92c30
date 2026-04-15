

## План: Email-уведомление админу о новой заявке на продавца

### Подход
Создать Edge Function `send-seller-application-notification`, которая отправляет email админу через Resend (по аналогии с `send-new-order-notification`). Вызывать её из `SellerApplicationForm` после успешной вставки заявки.

### Изменения

**1. Новая Edge Function: `supabase/functions/send-seller-application-notification/index.ts`**
- Принимает `application_id` в теле запроса
- Загружает данные заявки из `seller_applications` через service role
- Формирует HTML-письмо со всей информацией: имя, телефон, район, населённый пункт, описание, дата подачи
- Отправляет на `ADMIN_EMAIL` через Resend
- CORS headers для `locusfood.by`

**2. Обновить `src/components/SellerApplicationForm.tsx`**
- После успешного `insert` в `seller_applications` — вызвать `supabase.functions.invoke('send-seller-application-notification', { body: { application_id } })`
- Не блокировать основной flow — если email не отправился, заявка всё равно сохранена

### Содержание письма
```
📝 Новая заявка на продавца!

Имя: {name}
Телефон: {phone}
Район: {district}
Населённый пункт: {village}
Описание: {description}
Дата: {created_at}
```

2 файла: 1 новый Edge Function + 1 изменённый.

