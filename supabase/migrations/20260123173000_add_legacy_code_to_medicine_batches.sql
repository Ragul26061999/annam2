ALTER TABLE medicine_batches
ADD COLUMN legacy_code TEXT;

CREATE INDEX IF NOT EXISTS idx_medicine_batches_legacy_code ON medicine_batches(legacy_code);
