-- Add billing fields to discharge_summaries for pending bills & split payments

ALTER TABLE discharge_summaries
  ADD COLUMN IF NOT EXISTS bed_days INTEGER,
  ADD COLUMN IF NOT EXISTS bed_daily_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS bed_total NUMERIC,
  ADD COLUMN IF NOT EXISTS pharmacy_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS lab_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS procedure_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS other_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS pending_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_splits JSONB;

-- Ensure one discharge summary per allocation for upsert
CREATE UNIQUE INDEX IF NOT EXISTS discharge_summaries_allocation_id_key
  ON discharge_summaries(allocation_id);
