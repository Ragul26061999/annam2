ALTER TABLE billing
ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN billing.advance_amount IS 'Initial advance amount paid at IP admission';
