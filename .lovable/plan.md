## Цель

Добавить Telegram-уведомления для админа и продавцов при новом заказе, с inline-кнопкой «Подтверждаю» в сообщении продавцу. В `/seller/orders` добавить промежуточный шаг «Подтвердить» (до «Собрать»).

## Что меняется в БД

Миграция:

1. `profiles.telegram_chat_id text` — chat_id, куда писать продавцу (привязывается через бот).
2. `profiles.telegram_link_code text` — одноразовый код для привязки.
3. `app_settings` key `admin_telegram_chat_id` — chat_id админа (или несколько через запятую). Заполняется через `/admin/settings`.
4. `order_items.confirmed_at timestamptz null` — отметка о подтверждении продавцом своих позиций.
5. SECURITY DEFINER функция `confirm_order_items_for_farmer(_order_id uuid, _farmer_id uuid)` — обновляет `confirmed_at = now()` у всех items этого продавца в заказе и возвращает обновлённое состояние (нужна, чтобы Telegram-вебхук без auth.uid() мог подтвердить от имени привязанного user_id; права проверяем по совпадению `farmers.user_id = profiles.user_id` владельца chat_id).
6. SECURITY DEFINER функция `mark_order_confirmed_if_all(_order_id uuid)` — если все `order_items.confirmed_at IS NOT NULL`, ставит `orders.status = 'confirmed'`.

Статус заказа продолжаем использовать существующий `'confirmed'`. Никаких новых строковых статусов не вводим.

## Telegram-бот: настройка

Бот создаётся в @BotFather, токен кладётся в Supabase secret `TELEGRAM_BOT_TOKEN`. Используем нативный Telegram Bot API напрямую (`api.telegram.org/bot<token>/...`) — без коннектора, т.к. у проекта свой токен и кастомный сервер.

Webhook бота указывает на `https://jxklppwhgmndlivvtxdd.supabase.co/functions/v1/telegram-webhook`. Защищаем `secret_token` (SHA-256 от токена), как в гайде.

## Edge Functions (новые)

### 1. `send-new-order-telegram` (verify_jwt = false)
Вызывается из `Checkout.tsx` сразу после успешного `insert orders`. Уже есть аналог для email (`send-new-order-notification`) — добавляем Telegram-вариант параллельно, email не трогаем.

Логика:
- Принимает `{ orderId }`.
- Грузит заказ + items + products + farmers + buyer profile + pickup_point + delivery info.
- Форматирует:
  - **Сообщение админу** — точно по шаблону из ТЗ: `Здравствуйте, {имя покупателя из profiles.full_name или "клиент"}! Это locusfood\n\nМы получили ваш заказ:\n- ...\nВсего: ...\n\nВы выбрали {доставка/самовывоз/пункт выдачи} на {delivery_date + estimated_delivery_time}.\n{Карта./Наличные.}\n\nПодскажите:\n1. Всё верно?\n2. С какой суммы нужна будет сдача?` (последняя строка только при `payment_method = 'cash'`).
  - **Сообщение продавцу** — только его позиции из этого заказа: `Новый заказ!\n- title (вариант)= price BYN\n\nДоставка на {дата + время}.\n\nПожалуйста, подтвердите заказ` + inline кнопка `[{"text":"Подтверждаю","callback_data":"confirm:{orderId}:{farmerId}"}]`.
- Шлёт админу (chat_id из `app_settings.admin_telegram_chat_id`) и каждому продавцу с привязанным `telegram_chat_id`. У кого не привязан — пропускаем, email-уведомление работает как раньше.

### 2. `telegram-webhook` (verify_jwt = false)
Принимает апдейты от Telegram. Проверяет header `X-Telegram-Bot-Api-Secret-Token`.

Обрабатывает два типа:
- **`/start <code>`** — ищет `profiles.telegram_link_code = code`, сохраняет `telegram_chat_id = message.chat.id`, очищает код. Отвечает «Telegram привязан, {имя}».
- **`callback_query` с `confirm:{orderId}:{farmerId}`** — проверяет, что у `farmers.id = farmerId`, `farmers.user_id = profile.user_id` владельца chat_id (через сервисную роль). Если ок:
  1. Зовёт `confirm_order_items_for_farmer(orderId, farmerId)`.
  2. Зовёт `mark_order_confirmed_if_all(orderId)`.
  3. `answerCallbackQuery` + редактирует сообщение, убирая кнопку и добавляя «✅ Подтверждено».
  4. Шлёт админу `Продавец {name} подтвердил позиции заказа #{короткий id}`. Если функция вернула, что весь заказ confirmed — дополнительно `Заказ #{id} полностью подтверждён всеми продавцами`.

### 3. (опционально, добавим) endpoint `generate-telegram-link-code` — не нужен отдельной функцией, проще генерим код прямо в `/seller/settings` через прямой `update profiles set telegram_link_code = <случайный 6-значный код>` и показываем `t.me/<bot_username>?start=<code>`.

`supabase/config.toml` добавить:
```
[functions.telegram-webhook]
verify_jwt = false
[functions.send-new-order-telegram]
verify_jwt = false
```

## Изменения во фронте

### `src/pages/Checkout.tsx`
После успешного insert order, рядом с существующим вызовом `send-new-order-notification` добавить параллельный `supabase.functions.invoke("send-new-order-telegram", { body: { orderId } })`. Email-функцию не трогаем.

### `src/pages/seller/SellerSettings.tsx`
Новая секция «Telegram-уведомления»:
- Если `telegram_chat_id` уже есть → показать «Telegram привязан ✓», кнопка «Отвязать».
- Если нет → кнопка «Привязать Telegram»: генерит 6-значный код, пишет в `profiles.telegram_link_code`, показывает ссылку `https://t.me/{BOT_USERNAME}?start={code}` и инструкцию «нажмите Start в боте».

Имя бота — в `VITE_TELEGRAM_BOT_USERNAME` (env), либо в `app_settings.telegram_bot_username`. Возьмём из app_settings, чтобы не пересобирать фронт.

### `src/pages/admin/AdminSettings.tsx`
Поле «Telegram chat_id админа» → `app_settings.admin_telegram_chat_id`. Плюс поле «Telegram bot username» для ссылки привязки продавцам.

### `src/pages/seller/SellerOrders.tsx`
Изменения в карточке заказа:
- Новое состояние `confirmed` у item: считаем по `item.confirmed_at !== null` (нужно подтянуть это поле в select).
- Если у продавца есть хоть одна позиция с `confirmed_at = null` в заказе — сверху отдельная **кнопка «Подтвердить заказ»** (по всем его позициям сразу). По клику зовёт RPC `confirm_order_items_for_farmer` → потом `mark_order_confirmed_if_all`.
- Кнопка «Собран» на каждом item появляется только если `confirmed_at !== null`. До подтверждения — серая надпись «Сначала подтвердите заказ».

## Что НЕ трогаем

- Email-уведомления (Resend) — работают параллельно как сейчас.
- Расчёт `estimated_delivery_time`, расписания, RLS на orders/order_items для существующих ролей.
- Логику покупателя (`/orders`) — статус `confirmed` уже умеем показывать.
- Админ-редактирование даты/времени — отдельная задача.

## Секреты (нужно будет добавить после утверждения)

- `TELEGRAM_BOT_TOKEN` — токен из @BotFather.
- `TELEGRAM_WEBHOOK_SECRET` — сами сгенерим (SHA-256 от токена), хранить не обязательно.

## Порядок работ после утверждения плана

1. Миграция БД (новые поля + 2 RPC).
2. Запрос секрета `TELEGRAM_BOT_TOKEN`.
3. Edge functions `send-new-order-telegram` и `telegram-webhook`.
4. UI: SellerSettings (привязка), AdminSettings (chat_id админа + bot username), SellerOrders (кнопка «Подтвердить»), Checkout (вызов функции).
5. Инструкция вам: создать бота, добавить токен в secrets, прописать webhook (одна curl-команда), вписать свой chat_id и username бота в `/admin/settings`.
