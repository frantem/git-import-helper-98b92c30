ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS settled_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS settled_by uuid NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_settled_at ON public.order_items(settled_at);