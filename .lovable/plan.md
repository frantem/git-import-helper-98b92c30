## Правки шаблонов Telegram

Файл: `supabase/functions/send-new-order-telegram/index.ts`. Изменения только в форматировании текста, логика заказа и БД не трогается.

### 1. Приветствие
Заменить `Здравствуйте, ${buyerName}! Это locusfood` → `Здравствуйте ${buyerName}! Это locusfood` (без запятой). Применяется и к админу, и (если будет добавлено) к продавцу.

### 2. Дубль даты в `estimated_delivery_time`
Сейчас при курьерской доставке выходит «23 мая 23 мая 17:00–18:00», потому что `estimated_delivery_time` уже содержит дату («23 мая 17:00–18:00»), а мы дополнительно склеиваем `formatDeliveryDate(delivery_date) + " " + estimated_delivery_time`.

Фикс: ввести единый помощник `formatDateTimeLine(order)`:
- если `estimated_delivery_time` есть — использовать его как есть (там уже дата+время);
- иначе если есть `delivery_date` — вернуть `formatDeliveryDate(delivery_date)`;
- иначе — пустая строка.

### 3. Единый формат строки доставки (админ)
Сейчас дата приклеивается прямо в строку «Вы выбрали доставку на …». Делим на две строки:

```
Вы выбрали {доставку | самовывоз у продавца | самовывоз из «{pickup_point}»}.
{дата и время}            ← добавляется только если строка непустая
Наличные. | Карта.
```

Это покрывает все четыре кейса пользователя (включая заказ №2 с самовывозом у продавца, где сейчас даты вообще нет, и заказ №3 с курьером без `estimated_delivery_time`).

Если `delivery_date` и `estimated_delivery_time` оба пустые — строку с датой просто не добавляем (чтобы не было пустой строки).

### 4. Сообщение продавцу
Сейчас:
```
Новый заказ!
- ...
Доставка.
Пожалуйста, подтвердите заказ
```
Будет:
```
Новый заказ!
- ...

{Доставка | Самовывоз | Самовывоз из «…»}.
{дата и время}

Пожалуйста, подтвердите заказ
```
Тот же `formatDateTimeLine` повторно используем; пустая дата — строка пропускается.

### 5. Что не трогаем
- Email-уведомления (`send-new-order-notification`, `send-self-pickup-notification`, `send-delivery-notification`) — без изменений.
- `telegram-webhook`, RPC, миграции, UI продавца/админа — без изменений.
- Кнопка «✅ Подтверждаю» и `callback_data` — без изменений.
- Блок «Комментарий: …» оставляем как есть (в ваших примерах вы его не убирали явно; если нужно убрать — скажите, уберу отдельно).

### Технические детали
- Новая функция внутри файла:
  ```ts
  function formatDateTimeLine(order): string {
    if (order.estimated_delivery_time) return order.estimated_delivery_time;
    if (order.delivery_date) return formatDeliveryDate(order.delivery_date);
    return "";
  }
  ```
- В блоках сборки `adminLines` и `sellerLines` строка с датой пушится через:
  ```ts
  const dt = formatDateTimeLine(order);
  lines.push(`Вы выбрали …${order.delivery_type === 'pickup' ? ` из «${pp}»` : ''}.`);
  if (dt) lines.push(dt);
  lines.push(paymentLine);
  ```

После правок проверим Edge Function logs на новом тестовом заказе.