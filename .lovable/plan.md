
# 📱 План: Авторизация по телефону через МТС Беларусь

Я изучил инструкцию JSONv2 от МТС. У меня есть всё необходимое для интеграции.

## 🔑 Технические детали из документации МТС

- **Endpoint**: `https://api.communicator.mts.by/2727/json2/simple` (где `2727` — ваш `client_id`)
- **Метод**: `POST`, `Content-Type: application/json`
- **Авторизация**: HTTP Basic Auth — логин `KOGTIstudio_tOwm`, пароль `Xh4OVs`
- **Альфа-имя**: `Locusfood`
- **Формат номера**: международный без `+` (например `375291234567`)
- **Успех**: HTTP 200 + `{"message_id":"..."}`
- **Ошибка**: `{"error_code":36024,"error_text":"..."}`

### Пример рабочего запроса
```json
POST https://api.communicator.mts.by/2727/json2/simple
Authorization: Basic <base64(KOGTIstudio_tOwm:Xh4OVs)>
Content-Type: application/json

{
  "phone_number": 375291234567,
  "extra_id": "otp-<uuid>",
  "channels": ["sms"],
  "channel_options": {
    "sms": {
      "text": "Ваш код для входа на Locusfood: 1234",
      "alpha_name": "Locusfood",
      "ttl": 300
    }
  }
}
```

---

## 🗄️ 1. Миграция БД

### Таблица `phone_otp_codes`
- `id` uuid PK
- `phone` text (E.164: `+375291234567`)
- `code_hash` text (SHA-256 хеш кода + соль `phone`)
- `attempts` int default 0 (макс 5 неверных попыток)
- `expires_at` timestamptz (5 минут жизни)
- `verified` boolean default false
- `created_at` timestamptz default now()
- Индекс `(phone, created_at DESC)`
- RLS: **никаких политик** — доступ только через service_role в Edge Functions

### Таблица `phone_send_log` (для rate-limit)
- `id`, `phone`, `ip_address` (text, nullable), `sent_at` timestamptz
- Используется для проверок «1 SMS / 30 сек на номер» и «10 SMS / час на номер»
- RLS: только service_role
- Plus: фоновая очистка старых записей (>24ч) при каждом insert (для экономии места)

### Расширение `profiles`
- `phone` уже есть ✅
- Добавить колонку `phone_verified` boolean default false
- Уникальный частичный индекс `UNIQUE (phone) WHERE phone IS NOT NULL` — один номер на один аккаунт

---

## 🔐 2. Secrets для Edge Functions

Нужно добавить **3 секрета** через Lovable Cloud (я попрошу их в момент создания функций):
- `MTS_API_LOGIN` = `KOGTIstudio_tOwm`
- `MTS_API_PASSWORD` = `Xh4OVs`
- `MTS_CLIENT_ID` = `2727`

URL и alpha_name (`Locusfood`) захардкожены в коде (это публичные значения).

---

## ⚙️ 3. Три Edge Function

### A. `send-otp` (public, no JWT)
1. Принимает `{ phone }`. Валидирует Zod-схемой: только белорусские номера (`+375` + код 25/29/33/44 + 7 цифр)
2. Нормализует в E.164 → `+375XXXXXXXXX`
3. **Rate limits** (мягкие, как договорились):
   - Запрашивает из `phone_send_log`: последний `sent_at` для этого номера < 30 сек назад → отказ
   - Количество отправок за последний час > 10 → отказ
4. Генерирует **4-значный код** (1000–9999), хеширует SHA-256 с солью = номер
5. Инвалидирует все предыдущие неиспользованные коды для этого номера (`verified=true`)
6. Вставляет новую запись в `phone_otp_codes` с `expires_at = now() + 5 min`
7. **Отправляет SMS через МТС**:
   ```
   POST https://api.communicator.mts.by/2727/json2/simple
   Authorization: Basic base64(MTS_API_LOGIN:MTS_API_PASSWORD)
   Body: phone_number (без +), channels:["sms"], 
         text: "Ваш код для входа на Locusfood: XXXX. Никому не сообщайте.",
         alpha_name: "Locusfood", ttl: 300
   ```
8. Логирует в `phone_send_log`
9. Возвращает `{ success: true, expires_in: 300, retry_after: 30 }` — **никогда** не возвращает сам код!
10. На ошибки МТС (HTTP не 200 или `error_code`) — логирует подробности, клиенту возвращает обобщённую ошибку

### B. `verify-otp` (public, no JWT)
1. Принимает `{ phone, code }` (валидация Zod: код = 4 цифры)
2. Находит последний неиспользованный неистёкший код для номера
3. Сверяет SHA-256 хеш. Если неверно → `attempts++`. При `attempts >= 5` помечает `verified=true` (инвалидирует)
4. Помечает код `verified=true`
5. **Создание/вход в аккаунт**:
   - Вычисляет виртуальный email: `{цифры_номера}@phone.locusfood.by` (например `375291234567@phone.locusfood.by`)
   - Использует `supabase.auth.admin.listUsers()` с фильтром по email
   - **Если юзер найден** → `supabase.auth.admin.generateLink({ type: 'magiclink', email })` → извлекает `properties.action_link` → клиент сам обменяет (см. ниже)
   - **Если юзера нет** → `supabase.auth.admin.createUser({ email, email_confirm: true, password: <random>, user_metadata: { phone, phone_auth: true } })` → создать профиль с `phone`, `phone_verified=true` → сгенерировать magic link
6. Возвращает `{ action_link }` или сразу обменивает на сессию через `supabase.auth.admin.generateLink` + парсинг токенов (предпочтительно **второй вариант** — чтобы сразу вернуть `access_token`/`refresh_token` и не светить magic-link)

> **Технический нюанс**: `generateLink` с `type: 'magiclink'` в response.properties содержит `hashed_token` и URL с `token_hash`. На клиенте делаем `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` — это даёт сессию без редиректа. Это стандартный паттерн passwordless-входа.

### C. `link-phone-to-account` (требует JWT)
1. Для существующих email/Google пользователей — добавление телефона к существующему аккаунту
2. Принимает `{ phone, code }` от залогиненного юзера
3. Проверяет код, обновляет `profiles.phone` и `phone_verified=true` для текущего `auth.uid()`
4. Не создаёт новый аккаунт, не выдаёт сессию — просто привязка

---

## 🎨 4. Frontend изменения

### `src/pages/Auth.tsx`
- Сейчас вкладки Email/Google. Добавляю **третью вкладку «Телефон»** (или делаю основной по умолчанию)
- Email и Google остаются нетронутыми ✅ (как договорились — параллельно)

### Новый компонент `src/components/PhoneAuthForm.tsx`
- **Шаг 1 — ввод номера**:
  - Маска `+375 (__) ___-__-__` (своя простая маска без библиотек, чтобы не раздувать bundle)
  - Кнопка «Получить код» → `supabase.functions.invoke('send-otp', { body: { phone } })`
  - Zod-валидация на клиенте: только +375, коды 25/29/33/44, 7 цифр после
- **Шаг 2 — ввод кода**:
  - 4 отдельных input-поля с автопереходом и autocomplete `one-time-code` (iOS Safari подставит код из SMS автоматически)
  - Таймер обратного отсчёта «Отправить код повторно через 0:30»
  - Кнопка «← Изменить номер»
  - При вводе всех 4 цифр → автоматически `verify-otp`
  - При успехе → `supabase.auth.setSession({ access_token, refresh_token })` → `navigate('/')`
- Все ошибки через `sonner` toast на русском

### `src/contexts/AuthContext.tsx`
- Добавить методы `sendOtp(phone)` и `verifyOtp(phone, code)` для удобства
- Существующая логика email/Google не меняется

### `src/pages/Settings.tsx` (опционально)
- В блоке «Личные данные» рядом с полем «Телефон» — кнопка «Подтвердить» если `phone_verified=false`
- При клике открывается мини-диалог с кодом — вызывает `link-phone-to-account`
- Это даёт старым юзерам возможность добавить телефон

---

## 🛡️ 5. Безопасность

| Защита | Реализация |
|---|---|
| Хеш кодов | SHA-256 с солью=номер, не plain text |
| Brute-force | 5 неверных попыток → код инвалидируется |
| TTL | 5 минут на код |
| Один номер = один аккаунт | Уникальный частичный индекс на `profiles.phone` |
| Spam SMS | 30 сек между отправками + 10/час на номер |
| Валидация номера | Только +375 25/29/33/44 (Zod на клиенте + сервере) |
| Утечка кодов | Никогда не возвращаются клиенту |
| RLS на OTP-таблицах | Полностью закрыты, доступ только через Edge Functions |
| Логирование | Все попытки в `phone_send_log` для анализа |

⚠️ **Известные ограничения**:
- Нет распределённого rate-limit (один Postgres-запрос на каждую отправку — для нашего трафика норм)
- Виртуальные email вида `{phone}@phone.locusfood.by` будут видны в `auth.users` — это нормально, никто, кроме админа Supabase, их не видит

---

## 🧪 6. Тестирование

- В Edge Function `send-otp` добавляю **dev-режим** через secret `OTP_TEST_MODE=true`:
  - Если включён — для номера `+375290000000` SMS не отправляется, а код возвращается прямо в response (только в dev!)
  - В production secret отсутствует → boost 100% реальная отправка
- Тестируем через `supabase--curl_edge_functions` после деплоя
- Проверяем логи через `supabase--edge_function_logs`

---

## 🔧 7. Попутный фикс

В процессе обнаружил build error в `supabase/functions/delete-account/index.ts:54` — `'err' is of type 'unknown'`. Исправлю одной строкой: `err instanceof Error ? err.message : String(err)`.

---

## 📋 Что получится в итоге

✅ Новые юзеры: вводят `+375 XX XXX-XX-XX` → получают SMS «Ваш код для входа на Locusfood: 1234» от отправителя **Locusfood** → вводят 4 цифры (или iOS подставит автоматом) → сразу в аккаунт  
✅ Существующие email/Google пользователи продолжают работать без изменений  
✅ Можно привязать телефон к старому аккаунту через `/settings`  
✅ Защита: 30 сек между SMS, 10/час, 5 неверных попыток на код, 5 мин TTL  
✅ Все номера хранятся в `profiles.phone` (как сейчас), плюс флаг `phone_verified`  

---

## 🚦 Порядок реализации

1. Миграция БД (2 новые таблицы + расширение `profiles`)
2. Добавление 3 секретов МТС (попрошу через UI)
3. Edge Function `send-otp` с тест-режимом, проверка через curl
4. Edge Function `verify-otp`, проверка через curl
5. Edge Function `link-phone-to-account`
6. Компонент `PhoneAuthForm.tsx` + интеграция в `/auth`
7. Опциональная привязка номера в `/settings`
8. Фикс build error в `delete-account`

После approve начну с шага 1.
