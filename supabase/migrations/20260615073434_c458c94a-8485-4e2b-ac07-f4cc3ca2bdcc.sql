ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS pickup_slots,
  DROP COLUMN IF EXISTS max_orders_per_day,
  DROP COLUMN IF EXISTS busy_dates,
  DROP COLUMN IF EXISTS vacation_dates,
  DROP COLUMN IF EXISTS telegram_chat_id,
  DROP COLUMN IF EXISTS telegram_link_code;