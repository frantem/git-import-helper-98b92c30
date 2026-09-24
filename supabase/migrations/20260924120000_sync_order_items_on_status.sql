-- Синхронизация order_items со статусом заказа.
--
-- Проблема: админка меняет только orders.status, а order_items.status
-- переходит в 'collected' лишь при явном действии продавца «Собран».
-- Из-за этого у доставленного заказа позиции оставались status='pending',
-- и бейдж «непринятых заказов» у продавца висел вечно.
--
-- Решение: при смене статуса заказа приводим позиции в согласованное
-- состояние автоматически, для любого пути изменения статуса.

CREATE OR REPLACE FUNCTION public.sync_order_items_on_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      UPDATE public.order_items
         SET confirmed_at = COALESCE(confirmed_at, now())
       WHERE order_id = NEW.id
         AND confirmed_at IS NULL;
    ELSIF NEW.status = 'delivered' THEN
      UPDATE public.order_items
         SET confirmed_at = COALESCE(confirmed_at, now()),
             status = CASE WHEN status = 'pending' THEN 'collected' ELSE status END
       WHERE order_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_items_on_order_status ON public.orders;
CREATE TRIGGER trg_sync_order_items_on_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_items_on_order_status();

-- Бэкфилл уже накопившихся рассинхронов.

-- Подтверждённые и доставленные заказы: позиции считаются принятыми.
UPDATE public.order_items oi
   SET confirmed_at = COALESCE(oi.confirmed_at, now())
  FROM public.orders o
 WHERE o.id = oi.order_id
   AND o.status IN ('confirmed', 'delivered')
   AND oi.confirmed_at IS NULL;

-- Доставленные заказы: позиции считаются собранными.
UPDATE public.order_items oi
   SET status = 'collected',
       confirmed_at = COALESCE(oi.confirmed_at, now())
  FROM public.orders o
 WHERE o.id = oi.order_id
   AND o.status = 'delivered'
   AND oi.status IS DISTINCT FROM 'collected';
