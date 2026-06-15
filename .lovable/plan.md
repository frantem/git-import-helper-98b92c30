## Удаление старых колонок из `profiles`

Все 6 колонок уже перенесены в `farmers` и код везде читает/пишет в `farmers`. Можно безопасно удалить их из `profiles`.

### Миграция (одна)

```sql
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS pickup_slots,
  DROP COLUMN IF EXISTS max_orders_per_day,
  DROP COLUMN IF EXISTS busy_dates,
  DROP COLUMN IF EXISTS vacation_dates,
  DROP COLUMN IF EXISTS telegram_chat_id,
  DROP COLUMN IF EXISTS telegram_link_code;
```

### Проверка перед миграцией
Поиск по `src/` и `supabase/functions/` показывает, что упоминания этих колонок остались только в контексте таблицы `farmers` (SellerSettings, Checkout, usePickupLabels, telegram-webhook, send-new-order-telegram) и `app_settings.admin_telegram_chat_id` — к `profiles` обращений нет. Типы `src/integrations/supabase/types.ts` Supabase пересоберёт автоматически после применения миграции.

### Что НЕ трогаем
- Колонки в `farmers` — это новый источник правды.
- `app_settings.admin_telegram_chat_id` — отдельная настройка.
- Код и RLS — без изменений.
