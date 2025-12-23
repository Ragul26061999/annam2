-- Add QR code column to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN patients.qr_code IS 'QR code data URL for patient UHID, used for quick scanning and identification';
