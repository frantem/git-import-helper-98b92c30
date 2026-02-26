-- Add is_active column for logical deletion of products
ALTER TABLE public.products ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add archived_at timestamp for when product was archived
ALTER TABLE public.products ADD COLUMN archived_at timestamptz NULL;

-- Create index for efficient catalog queries
CREATE INDEX IF NOT EXISTS products_is_active_created_at_idx ON public.products (is_active, created_at DESC);