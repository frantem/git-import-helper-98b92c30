## Цель

В `/seller-application` при нажатии «Получить код» (для телефона или Email) сначала проверять в базе, нет ли уже аккаунта с этими данными. Если есть — показать сообщение и не отправлять код.

## Что добавить

### 1. Новая edge function `check-account-exists`

Публичная (без JWT), вызывается с anon key. Использует `SUPABASE_SERVICE_ROLE_KEY` для проверки.

Вход: `{ phone?: string, email?: string, exclude_user_id?: string }`
Выход: `{ exists: boolean }`

Логика:
- Если `phone` — ищем в `profiles.phone` (нормализуя только цифры). Если найден и `user_id !== exclude_user_id` → `exists: true`.
- Если `email` — через `supabase.auth.admin.listUsers` (с пагинацией или фильтрацией по email через `getUserByEmail`-аналог; используем `listUsers({ page, perPage })` либо прямой SQL по `auth.users` через service role). Сравниваем case-insensitive. Исключаем `exclude_user_id`.

### 2. Изменения в `src/components/SellerApplicationForm.tsx`

**Перед `sendCode` (телефон):**
- Гость: вызвать `check-account-exists` с `{ phone }`. Если `exists` → `toast.error("Аккаунт с таким номером уже зарегистрирован. Войдите в аккаунт.")` и не отправлять код.
- Залогиненный: вызвать с `{ phone, exclude_user_id: user.id }`. Если `exists` → `toast.error("Этот номер уже используется другим аккаунтом.")`.

**Перед `sendEmailCode` (Email, только для залогиненных с placeholder-email):**
- Вызвать `check-account-exists` с `{ email, exclude_user_id: user.id }`. Если `exists` → `toast.error("Аккаунт с таким Email уже существует. Войдите в этот аккаунт.")`.

Состояние загрузки (`isSendingCode`/`isSendingEmailCode`) уже покрывает время проверки.

## Что НЕ меняем

- `send-otp`, `send-email-change-code`, `link-phone-to-account`, `verify-email-change-code` остаются как есть (общие для других потоков логина).
- Логика регистрации/привязки после ввода кода — без изменений.
- Сама форма заявки и таблица `seller_applications` — без изменений.

## Технические детали

- Edge function конфигурируется в `supabase/config.toml` как `verify_jwt = false` (анонимный доступ — это просто проверка существования).
- Чтобы не раскрывать чужие данные, ответ только `{ exists: boolean }`, без `user_id`/`email`.
- Телефон сравнивается по последним цифрам (через `regexp_replace`), email — `lower()`.
