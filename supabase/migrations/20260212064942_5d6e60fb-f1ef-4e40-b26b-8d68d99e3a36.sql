
-- Add CASCADE DELETE for custom field options
ALTER TABLE product_custom_field_options 
  DROP CONSTRAINT IF EXISTS product_custom_field_options_field_id_fkey;

ALTER TABLE product_custom_field_options 
  ADD CONSTRAINT product_custom_field_options_field_id_fkey 
  FOREIGN KEY (field_id) REFERENCES product_custom_fields(id) ON DELETE CASCADE;

-- Clean up duplicate custom fields for problematic product
DELETE FROM product_custom_fields 
WHERE product_id = '77fe8d1d-39b6-4dc6-8ffa-7324db0835ea';
