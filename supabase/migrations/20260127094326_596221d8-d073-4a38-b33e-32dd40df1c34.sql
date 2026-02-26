-- Add avg_delivery_time_minutes to app_settings
INSERT INTO app_settings (key, value, description)
VALUES ('avg_delivery_time_minutes', '70', 'Среднее время доставки курьером (в минутах)')
ON CONFLICT (key) DO NOTHING;

-- Add city and street columns to farmers table
ALTER TABLE farmers
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS street text;

-- Add delivery columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'pickup',
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_cost integer NOT NULL DEFAULT 0;