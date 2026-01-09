-- Add missing columns to staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS specialization TEXT,
ADD COLUMN IF NOT EXISTS pf_number TEXT,
ADD COLUMN IF NOT EXISTS esic_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN staff.specialization IS 'Staff member specialization or area of expertise';
COMMENT ON COLUMN staff.pf_number IS 'Provident Fund account number';
COMMENT ON COLUMN staff.esic_number IS 'ESIC insurance number';
