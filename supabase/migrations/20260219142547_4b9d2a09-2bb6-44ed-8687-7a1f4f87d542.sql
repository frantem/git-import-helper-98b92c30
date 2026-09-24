
ALTER TABLE orders ALTER COLUMN order_slug SET DEFAULT '';
ALTER TABLE order_items ADD COLUMN variant_label text;
