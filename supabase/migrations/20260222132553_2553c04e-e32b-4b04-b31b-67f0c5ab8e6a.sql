ALTER TABLE profiles
  ADD COLUMN pickup_slots JSONB DEFAULT '{"mon":{"active":false,"start":"17:00","end":"20:00"},"tue":{"active":false,"start":"17:00","end":"20:00"},"wed":{"active":false,"start":"17:00","end":"20:00"},"thu":{"active":false,"start":"17:00","end":"20:00"},"fri":{"active":false,"start":"17:00","end":"20:00"},"sat":{"active":false,"start":"17:00","end":"20:00"},"sun":{"active":false,"start":"17:00","end":"20:00"}}',
  ADD COLUMN max_orders_per_day INTEGER DEFAULT 5,
  ADD COLUMN busy_dates DATE[] DEFAULT '{}',
  ADD COLUMN vacation_dates DATE[] DEFAULT '{}';