-- Migration to add outpatient specific fields to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode TEXT;

-- Vitals columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS bmi TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS temperature TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS temp_unit TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS bp_systolic TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS bp_diastolic TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pulse TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS spo2 TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS respiratory_rate TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS random_blood_sugar TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS vital_notes TEXT;

-- Billing columns
ALTER TABLE patients ADD COLUMN IF NOT EXISTS op_card_amount TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consultation_fee TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS total_amount TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- Visit Details
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consulting_doctor_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consulting_doctor_name TEXT;

-- Comments for documentation
COMMENT ON COLUMN patients.alternate_phone IS 'Secondary contact number';
COMMENT ON COLUMN patients.city IS 'Patient city';
COMMENT ON COLUMN patients.state IS 'Patient state';
COMMENT ON COLUMN patients.pincode IS 'Patient pincode';
COMMENT ON COLUMN patients.op_card_amount IS 'Outpatient card registration fee';
COMMENT ON COLUMN patients.consultation_fee IS 'Doctor consultation fee';
COMMENT ON COLUMN patients.total_amount IS 'Total billing amount for the visit';
COMMENT ON COLUMN patients.consulting_doctor_name IS 'Name of the consulting doctor';
