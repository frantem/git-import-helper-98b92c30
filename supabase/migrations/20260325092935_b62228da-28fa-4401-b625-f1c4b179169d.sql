ALTER TABLE farmers ADD COLUMN slug text UNIQUE;
ALTER TABLE orders ADD COLUMN referrer_farmer_id uuid REFERENCES farmers(id);