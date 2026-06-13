## Что чиним

### 1. Время `2026-06-13 19:49:13.811446+00` в Supabase Dashboard — это нормально
Supabase Dashboard **всегда** показывает значения `timestamptz` в UTC. В БД они и должны храниться в UTC — это правильная практика. `19:49 UTC + 3 = 22:49 Минск` — совпадает со временем, когда вы регистрировались.

На самом сайте мы уже выводим всё в Europe/Minsk (это закреплено в memory `Date Normalization`). Менять схему БД не нужно и нельзя — это сломает все часовые расчёты.

**Действие:** ничего не правим, только подтвердим в ответе. Если хотите — могу пройтись по админке и перепроверить, что везде в UI отображается Минск.

### 2. Убрать поле «Телефон» из формы регистрации через Email
В `src/pages/Auth.tsx` блок `<Label htmlFor="phone">…` рендерится в форме регистрации вне зависимости от выбранного метода. Уберём этот блок (и связанную валидацию `validatePhone`) — телефон собирается отдельно через вкладку «Телефон» / OTP. Имя оставляем.

### 3. Подтверждение Email кодом из письма (4-6 цифр)

Используем нативный Supabase OTP для signup — он умеет отдавать 6-значный `{{ .Token }}` в письме вместо magic-link.

**Бэкенд (Supabase Auth):**
- Включить «Confirm email» в Auth → Providers → Email (если выключено).
- Кастомизировать письмо подтверждения через `auth-email-hook` (его сейчас нет). Заскаффолдим хук + шаблоны через инструмент `scaffold_auth_email_templates`, в `signup.tsx` выведем крупный 6-значный код `{{ .Token }}` вместо кнопки-ссылки. Брендируем в стиле LocusFood (`#9ddc09`, шрифты из `index.css`). Деплоим `auth-email-hook`.

**Фронтенд (`src/pages/Auth.tsx`):**
- После успешного `signUp(email, password, …)` НЕ редиректим в `/profile`. Переключаемся в новый шаг `verify-email`: показываем 6 ячеек ввода кода (визуально как в `PhoneAuthForm`), кнопки «Подтвердить» и «Отправить повторно» (с 60-сек таймером).
- Подтверждение: `supabase.auth.verifyOtp({ email, token, type: 'signup' })`. На успехе — `toast.success`, `trackMetaEvent("CompleteRegistration")`, редирект на `/profile` или `locus-return-to`.
- Повторная отправка: `supabase.auth.resend({ type: 'signup', email })`.
- Ошибки: «Неверный код», «Код истёк — запросите новый».
- Также добавим компонент `EmailOtpForm` рядом с `PhoneAuthForm`, чтобы держать UI чистым.

**Профиль/триггер:** `handle_new_user` уже создаёт запись в `profiles` через триггер на `auth.users` — ничего дополнительно не нужно. `fullName` сохраним в `raw_user_meta_data` при `signUp` (уже делается через `signUp` в `AuthContext`).

## Затронутые файлы
- `src/pages/Auth.tsx` — убрать блок «Телефон» из email-регистрации, добавить шаг ввода кода.
- `src/components/EmailOtpForm.tsx` *(новый)* — UI кода + resend.
- `supabase/functions/auth-email-hook/*` *(новые)* + `supabase/functions/_shared/email-templates/*` — шаблоны писем с OTP-кодом и брендингом.
- `supabase/config.toml` — обновится автоматически инструментом.

## Что НЕ трогаем
- Схему БД (миграции не нужны).
- Колонку `created_at` и временные зоны в Postgres.
- Вход по телефону (`PhoneAuthForm`) и вход по email+паролю существующих пользователей.

## Что нужно от вас после деплоя
- Один раз убедиться, что в Supabase Dashboard → Auth → Providers → Email включён тоггл **Confirm email**.
- DNS для отправки писем с домена `locusfood.by` через Lovable Emails уже проверен (Resend настроен) — отдельных действий не требуется.
