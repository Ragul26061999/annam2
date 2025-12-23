-- Add age and diagnosis columns to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 0 AND age <= 150);

ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS diagnosis TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN patients.age IS 'Patient age in years, alternative to calculating from date_of_birth';
COMMENT ON COLUMN patients.diagnosis IS 'Primary diagnosis for the patient visit';
