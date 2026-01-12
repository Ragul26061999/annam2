ALTER TABLE diagnostic_billing_items
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);

