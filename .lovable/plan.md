## Цель

1. Убрать из `/seller-application` два поля: **Район** и **Населённый пункт**.
2. Починить кнопку «Отправить заявку» — она не нажималась, потому что в `submitDisabled` есть условие `!draft.district`, а Район после удаления нужно перестать требовать.
3. Разобраться с ошибкой «Edge Function returned a non-2xx status code» при попытке нового пользователя.

## Почему кнопка не работала

В `SellerApplicationForm.tsx` (строки 345–352) `submitDisabled` блокирует кнопку, если не выбран `district`. У админа телефон уже был подтверждён из профиля, имя заполнено — но Район не выбран → кнопка серая. После удаления поля Район условие уходит, кнопка станет активной.

Ошибка «non-2xx» у нового пользователя через ПК — это, скорее всего, ответ `409` от `link-phone-to-account`: «Этот номер уже привязан к другому аккаунту» (тот же номер админа). Сейчас текст этой ошибки не пробрасывается в тост корректно — улучшим обработку, чтобы пользователь видел человекочитаемую причину вместо «non-2xx».

## Изменения

### 1. Миграция БД
Сделать колонки `district` и `village` nullable, чтобы можно было сохранять заявки и создавать фермеров без района:
- `ALTER TABLE public.seller_applications ALTER COLUMN district DROP NOT NULL;`
- `ALTER TABLE public.farmers ALTER COLUMN district DROP NOT NULL;`

(GRANT'ы и RLS не трогаем — таблицы существующие.)

### 2. `src/components/SellerApplicationForm.tsx`
- Удалить JSX-блоки полей «Район *» (`Select` с `DISTRICTS`) и «Населенный пункт» (`Input village`).
- Удалить константу `DISTRICTS`.
- Из `DraftState` убрать поля `district` и `village`, из начального `draft` — тоже.
- В `submitApplication` убрать `district` и `village` из insert (или передавать `null`).
- В `handleSubmit` удалить проверку `if (!draft.district) ...`.
- В `submitDisabled` удалить условие `!draft.district`.

### 3. `src/pages/admin/AdminSellerApplications.tsx`
- В `handleApprove` при создании `farmers` не падать, если `district` отсутствует — передавать `application.district ?? null`.
- В карточках заявки выводить район/деревню только если они заданы (защита от `null`).

### 4. Улучшение обработки ошибок (мелочь, чтобы убрать «non-2xx»)
В `SellerApplicationForm.tsx` в `linkPhoneForUser` и `sendCode`, когда `error` приходит от `supabase.functions.invoke`, читать тело ответа `error.context` / `data?.error` и показывать понятный текст (сейчас уже есть, но `FunctionsHttpError` от supabase-js часто не отдаёт `data`). Добавим fallback: если есть `error.context?.json()` — распарсить и показать поле `error`.

## Что НЕ меняется

- Логика OTP, `send-otp`, `verify-otp`, `link-phone-to-account` — без изменений.
- Поля: Email/Пароль (для гостя), Имя, Телефон с подтверждением, Описание деятельности — остаются.
- Соглашение с условиями продавца — остаётся.
- RLS, роли, прочая бизнес-логика — без изменений.

## Технические детали для разработчика

- Миграция в `supabase/migrations/<timestamp>_seller_application_optional_location.sql`.
- В UI Радix `Select` с `required` уходит вместе с блоком — это решает и проблему «незаметной» валидации (пользователь не понимал, почему кнопка серая).
- После применения существующие записи `farmers` с непустым `district` останутся валидными.
