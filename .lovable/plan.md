## Цель

Объединить телефон продавца с профилем покупателя. Один номер на аккаунт, всегда подтверждённый, всегда лежит в `profiles.phone`.

## Поведение формы /seller-application

Три сценария:

### 1. Залогинен, в `profiles.phone` уже есть номер
- Поле «Телефон» предзаполнено и **read-only** (с подсказкой «Используется номер из вашего профиля»).
- При отправке используем именно его, без OTP.

### 2. Залогинен, телефона в профиле нет
- Поле телефона редактируемое. Под ним кнопка «Получить код».
- После ввода кода (4 цифры, тот же UI, что в `PhoneAuthForm`) — вызываем существующую edge-функцию `link-phone-to-account`. Она проверяет код и записывает телефон + `phone_verified=true` в `profiles`.
- Только после успешной привязки активируется кнопка «Отправить заявку».

### 3. Не залогинен (email + пароль)
- Сначала вводит email / пароль / имя / телефон.
- По кнопке «Получить код» отправляем OTP на телефон (`send-otp`).
- После ввода кода:
  1. `signUp(email, password)` — создаём аккаунт.
  2. Сразу после получения сессии — `link-phone-to-account` с уже введённым кодом, чтобы записать телефон в `profiles` как подтверждённый.
  3. Создаём `seller_applications` запись.
- Если email уже занят — сообщение «Войдите в аккаунт» (как сейчас).

В обоих случаях в `seller_applications.phone` пишем тот же подтверждённый номер.

## Бэкенд

### Миграция: backfill телефонов
Один SQL для существующих заявок:
```sql
UPDATE public.profiles p
SET phone = sa.phone
FROM (
  SELECT DISTINCT ON (user_id) user_id, phone
  FROM public.seller_applications
  WHERE phone IS NOT NULL AND phone <> ''
  ORDER BY user_id, created_at DESC
) sa
WHERE p.user_id = sa.user_id
  AND (p.phone IS NULL OR p.phone = '');
```
`phone_verified` не трогаем — остаётся `false`, пользователь сможет подтвердить позже в профиле.

### Edge-функции
- `send-otp`, `verify-otp`, `link-phone-to-account` — уже есть, используем как есть.
- Новых функций не создаём.

## Файлы клиента

- **`src/components/SellerApplicationForm.tsx`** — основная переработка:
  - Локальный стейт `phoneStep: "input" | "code" | "verified"`.
  - Если профиль уже содержит phone — `verified`, поле disabled.
  - Если нет — показываем кнопку «Получить код» → step `code` (4 input-ячейки, паттерн взят из `PhoneAuthForm`) → `link-phone-to-account` → `verified`.
  - Для незалогиненного: при «Получить код» — `send-otp`, при вводе кода — сначала `signUp`, потом `link-phone-to-account` с тем же кодом, потом insert заявки.
  - Submit-кнопка заявки активна только когда `phoneStep === "verified"` (для залогиненных без телефона и для гостей) или сразу (если телефон уже в профиле).

- **`src/components/PhoneAuthForm.tsx`** — без изменений, но вынесем мелкие хелперы (`formatBYPhone`, `isValidBYPhone`) в `src/lib/phone.ts`, чтобы переиспользовать в `SellerApplicationForm`. Импорты в `PhoneAuthForm.tsx` соответственно обновятся.

## Что НЕ трогаем

- `Auth.tsx` и обычный поток регистрации.
- RLS, таблицы, схему — только UPDATE-миграция на backfill.
- Логику админ-одобрения заявки (`AdminSellerApplications.tsx`) — `profiles.phone` уже будет валиден к моменту одобрения.

## Технические детали

- `link-phone-to-account` уже проверяет, что номер не занят другим пользователем, и пишет `phone_verified=true`. Для случая «номер уже привязан к другому аккаунту» показываем ошибку из ответа функции.
- Черновик `useDraftState` сохраняем только для полей анкеты (имя/район/село/описание/email). Введённый код и подтверждённое состояние в localStorage не сохраняем.
- Если пользователь сменил подтверждённый номер вручную (например, отредактировал input после verified) — сбрасываем в `input` и требуем новой проверки.
