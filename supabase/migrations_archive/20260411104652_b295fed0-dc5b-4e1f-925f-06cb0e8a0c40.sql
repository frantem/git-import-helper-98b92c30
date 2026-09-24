-- Add new column
ALTER TABLE farmers ADD COLUMN address_details text;

-- Migrate data: combine house, entrance, apartment
UPDATE farmers SET address_details = CONCAT_WS(', ',
  CASE WHEN house IS NOT NULL AND house != '' THEN 'д.' || house END,
  CASE WHEN entrance IS NOT NULL AND entrance != '' THEN 'подъезд ' || entrance END,
  CASE WHEN apartment IS NOT NULL AND apartment != '' THEN 'кв.' || apartment END
) WHERE house IS NOT NULL OR entrance IS NOT NULL OR apartment IS NOT NULL;

-- Drop old columns
ALTER TABLE farmers DROP COLUMN house;
ALTER TABLE farmers DROP COLUMN entrance;
ALTER TABLE farmers DROP COLUMN apartment;