-- 1. Add prep_time_minutes column to products table
ALTER TABLE products 
ADD COLUMN prep_time_minutes integer NOT NULL DEFAULT 90;

-- 2. Create app_settings table for global settings
CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 4. Everyone can read settings
CREATE POLICY "Settings are viewable by everyone" ON app_settings
  FOR SELECT USING (true);

-- 5. Only admins can manage settings (insert, update, delete)
CREATE POLICY "Admins can manage settings" ON app_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Insert initial cutoff time value (17:30 = 1050 minutes)
INSERT INTO app_settings (key, value, description) 
VALUES ('cutoff_time_minutes', '1050', 'Время развоза в минутах от начала дня (17:30 = 1050)');