-- Create patient_revisits table to track repeat visits

CREATE TABLE IF NOT EXISTS patient_revisits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uhid VARCHAR(50) NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TIME NOT NULL DEFAULT CURRENT_TIME,
  department VARCHAR(100),
  doctor_id UUID REFERENCES staff(id),
  reason_for_visit TEXT NOT NULL,
  symptoms TEXT,
  previous_diagnosis TEXT,
  current_diagnosis TEXT,
  prescription_id UUID,
  consultation_fee DECIMAL(10, 2) DEFAULT 0,
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  payment_status VARCHAR(50) DEFAULT 'pending',
  visit_type VARCHAR(50) DEFAULT 'follow-up',
  staff_id UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patient_revisits_patient_id ON patient_revisits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_revisits_uhid ON patient_revisits(uhid);
CREATE INDEX IF NOT EXISTS idx_patient_revisits_visit_date ON patient_revisits(visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_revisits_doctor_id ON patient_revisits(doctor_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_patient_revisits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_revisits_updated_at
    BEFORE UPDATE ON patient_revisits
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_revisits_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE patient_revisits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON patient_revisits
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON patient_revisits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON patient_revisits
    FOR UPDATE USING (true);

-- Add comments
COMMENT ON TABLE patient_revisits IS 'Stores patient revisit records for tracking repeat visits';
COMMENT ON COLUMN patient_revisits.visit_type IS 'Type of visit: follow-up, emergency, routine-checkup, etc.';
COMMENT ON COLUMN patient_revisits.payment_status IS 'Payment status: pending, paid, partial';
