## Цель

После оформления заказа, если у пользователя в `auth.users.email` стоит заглушка `*@phone.locusfood.by` (создаётся в `verify-otp` для пользователей, заходящих по телефону), показать блок с предложением добавить настоящий Email с подтверждением через код.

## UX-флоу (на экране «Заказ оформлен!» в `src/pages/Checkout.tsx`)

1. После успеха заказа проверяем `user.email`. Если он заканчивается на `@phone.locusfood.by` — показываем карточку:
   «Хотите получать уведомления о заказах на почту? Введите ваш Email».
2. Шаг 1: поле Email + кнопка «Получить код». На submit вызываем edge function `send-email-change-code`.
3. Шаг 2: поле «Код из письма» (6 цифр) + кнопка «Подтвердить». Вызываем `verify-email-change-code`. При успехе — toast «Email подтверждён», блок скрывается.
4. Кнопка «Пропустить» — закрывает блок (можно вернуться позже из настроек, но это вне scope).

## Backend (Supabase)

### Таблица `email_change_codes` (новая, миграция)

- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null`
- `new_email text not null`
- `code_hash text not null` (sha256, как в phone_otp_codes)
- `attempts int not null default 0`
- `expires_at timestamptz not null` (10 минут)
- `created_at timestamptz default now()`
- `verified bool default false`
- RLS: `No client access` (как у `phone_otp_codes`) — все операции через edge functions с service-role.

### Edge function `send-email-change-code` (новая)

- Auth: проверяет JWT, берёт `user_id` и текущий email. Требует, чтобы текущий email был `*@phone.locusfood.by` (защита от misuse).
- Validate `new_email` (zod, normalize lowercase). Проверить, что email не занят другим пользователем (через `supabase.auth.admin.listUsers` поиск по email или select из `auth.users` через service role).
- Rate limit: не больше 1 кода в 60с и 5 в час на user_id (отдельная таблица или просто проверить `created_at` в `email_change_codes`).
- Сгенерировать 6-значный код, сохранить sha256-hash + new_email + expires_at (10 мин).
- Отправить письмо через Resend (используя `RESEND_API_KEY`, `SENDER_EMAIL` = `Locus <info@locusfood.by>`) с темой «Код подтверждения Email — Locus» и кодом в теле.
- `verify_jwt = false` в config.toml + ручная валидация JWT (как в существующих функциях).

### Edge function `verify-email-change-code` (новая)

- Auth + достать `user_id`.
- Принять `{ new_email, code }`.
- Найти последнюю не-verified запись для user_id+new_email с `expires_at > now()`. Если attempts >= 5 — отклонить. Сравнить sha256(code) с `code_hash`. Иначе attempts++.
- При успехе: `supabase.auth.admin.updateUserById(user_id, { email: new_email, email_confirm: true })` — это перезапишет старый `*@phone.locusfood.by` email на новый и отметит подтверждённым (старый автоматически удаляется, т.к. поле `email` одно).
- Также обновить `profiles.email = new_email`.
- Отметить запись `verified = true`, удалить остальные коды этого user.

## Frontend

### Новый компонент `src/components/EmailChangePrompt.tsx`

- Двух-шаговая форма (email → код), zod-валидация, состояния loading/error.
- Использует `supabase.functions.invoke('send-email-change-code'/'verify-email-change-code')`.
- При успехе вызывает `onDone()` и `supabase.auth.refreshSession()` чтобы клиент увидел новый email.

### Интеграция в `src/pages/Checkout.tsx`

В блоке `if (orderSuccess)` (строки 540–558) добавить под текстом:
```tsx
{user?.email?.endsWith('@phone.locusfood.by') && (
  <EmailChangePrompt onDone={() => { /* hide */ }} />
)}
```
Локальный state `emailPromptDismissed` управляет видимостью.

## Технические детали

- Секреты уже есть: `RESEND_API_KEY`, `SENDER_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`.
- В `supabase/config.toml` добавить `verify_jwt = false` для обеих новых функций.
- Хеш кода: `crypto.subtle.digest('SHA-256', ...)` как в `verify-otp`.
- Проверка занятости email: через `supabase.auth.admin.listUsers({ filter: ... })` или прямой select из `auth.users` через service role клиент.

## Файлы

- new: `supabase/migrations/<ts>_email_change_codes.sql`
- new: `supabase/functions/send-email-change-code/index.ts`
- new: `supabase/functions/verify-email-change-code/index.ts`
- edit: `supabase/config.toml` (две новые секции)
- new: `src/components/EmailChangePrompt.tsx`
- edit: `src/pages/Checkout.tsx` (показать промпт после успеха)
