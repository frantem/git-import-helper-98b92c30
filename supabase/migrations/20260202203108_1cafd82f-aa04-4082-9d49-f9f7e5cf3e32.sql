-- Allow NULL in product_id column
ALTER TABLE order_items 
ALTER COLUMN product_id DROP NOT NULL;

-- Drop the old constraint
ALTER TABLE order_items
DROP CONSTRAINT order_items_product_id_fkey;

-- Add new constraint with ON DELETE SET NULL
ALTER TABLE order_items
ADD CONSTRAINT order_items_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;