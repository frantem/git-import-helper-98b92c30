-- Add delivery working hours settings
INSERT INTO app_settings (key, value, description)
VALUES 
  ('delivery_start_hour', '6', 'Час начала работы доставки (0-23)'),
  ('delivery_end_hour', '24', 'Час окончания работы доставки (1-24, где 24 = полночь)')
ON CONFLICT (key) DO NOTHING;