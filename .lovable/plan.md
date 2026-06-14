# Перенос продавческих полей из `profiles` в `farmers`

## Цель
Сделать структуру БД логичной: поля, относящиеся к продавцу (расписание выдачи, лимиты заказов, занятые/отпускные даты, привязка Telegram), должны жить в таблице `farmers`, а не в общей `profiles`.

Перенос будет безопасным: данные копируются, код переключается, и только потом старые колонки удаляются (в отдельной финальной миграции — после проверки).

## Что переезжает
Из `profiles` → в `farmers`:
- `pickup_slots` (jsonb)
- `max_orders_per_day` (integer, default 5)
- `busy_dates` (jsonb массив дат)
- `vacation_dates` (jsonb массив дат)
- `telegram_chat_id` (text)
- `telegram_link_code` (text, уникальный когда не null)

## План работ

### Этап 1 — Миграция (структура + копирование)
1. `ALTER TABLE public.farmers ADD COLUMN ...` — добавить все 6 колонок с теми же типами и дефолтами, что сейчас в `profiles`.
2. Скопировать данные: `UPDATE farmers f SET ... FROM profiles p WHERE p.user_id = f.user_id`.
3. Создать уникальный индекс на `farmers.telegram_link_code WHERE telegram_link_code IS NOT NULL`.
4. Обновить SQL-функцию `public.get_seller_pickup_settings(farmer_ids uuid[])` — читать из `farmers` напрямую (без JOIN на profiles).
5. RLS на новых колонках наследуется существующими политиками `farmers` (продавец видит/правит свою запись, публичное чтение для каталога). Менять политики не нужно.
6. Старые колонки в `profiles` пока **оставляем** — на случай отката.

### Этап 2 — Код
Заменить чтение/запись с `profiles` на `farmers` в:

- `src/pages/seller/SellerSettings.tsx` — `select(... pickup_slots, ... telegram_link_code)` и оба `.update({...})` переключить с `profiles` (`.eq("user_id", user.id)`) на `farmers` (`.eq("id", farmerId)`).
- `src/pages/Checkout.tsx` — типы и запросы `pickup_slots/max_orders_per_day/busy_dates/vacation_dates` берутся через RPC `get_seller_pickup_settings`, которая уже будет читать из `farmers`. Прямых SELECT по `profiles` для этих полей в Checkout нет — менять не придётся (проверим при имплементации).
- `src/hooks/usePickupLabels.ts` — то же, читается через RPC, изменений в коде нет.
- `supabase/functions/send-new-order-telegram/index.ts` — заменить `from("profiles").select("user_id, telegram_chat_id").in("user_id", ...)` на `from("farmers").select("id, telegram_chat_id").in("id", farmerIds)` и обновить маппинг `chatByFarmer`.
- `supabase/functions/telegram-webhook/index.ts` — все три обращения (`eq telegram_link_code`, `update telegram_chat_id`, `select by telegram_chat_id`) переключить с `profiles` на `farmers`. Связь с пользователем — через `farmers.user_id`.

### Этап 3 — Финальная миграция (после визуальной проверки, отдельным шагом)
После того как мы убедимся, что всё работает (продавец сохраняет настройки выдачи, чекаут показывает слоты, Telegram-привязка и уведомления работают), выпустим вторую миграцию: `ALTER TABLE profiles DROP COLUMN ...` для шести колонок и удалим устаревший уникальный индекс.

Этот этап не выполняется автоматически — я попрошу подтверждения отдельно.

## Что НЕ трогаем
- Структуру `profiles` для покупательских полей (`full_name`, `phone`, `email`, `delivery_address` и т.д.).
- RLS политики `farmers` (уже корректны).
- `app_settings.admin_telegram_chat_id` — это глобальная настройка, не относится к продавцу.

## Риски и как они закрыты
- **Расхождение данных в момент миграции:** копируем атомарно одним UPDATE до того, как код начнёт писать в новое место.
- **Откат:** старые колонки сохранены до Этапа 3; при проблеме код возвращается к чтению из `profiles` без потери данных.
- **Telegram-вебхук в момент деплоя:** обе версии edge-функций (старая в проде, новая после деплоя) будут работать корректно, потому что после Этапа 1 данные продублированы.