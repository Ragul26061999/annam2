-- Add doctor consultation override fields to discharge_summaries

ALTER TABLE discharge_summaries
  ADD COLUMN IF NOT EXISTS doctor_consultation_days INTEGER,
  ADD COLUMN IF NOT EXISTS doctor_consultation_fee NUMERIC,
  ADD COLUMN IF NOT EXISTS doctor_consultation_total NUMERIC;
