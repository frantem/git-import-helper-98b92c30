ALTER TABLE products
  ALTER COLUMN calories TYPE numeric USING calories::numeric,
  ALTER COLUMN protein TYPE numeric USING protein::numeric,
  ALTER COLUMN fat TYPE numeric USING fat::numeric,
  ALTER COLUMN carbs TYPE numeric USING carbs::numeric;