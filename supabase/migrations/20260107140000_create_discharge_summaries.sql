-- Create discharge summaries table
CREATE TABLE IF NOT EXISTS discharge_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    uhid TEXT,
    patient_name TEXT,
    address TEXT,
    gender TEXT,
    age INTEGER,
    ip_number TEXT,
    admission_date DATE,
    surgery_date DATE,
    discharge_date DATE NOT NULL,
    consultant_id UUID REFERENCES doctors(id),
    presenting_complaint TEXT,
    physical_findings TEXT,
    investigations TEXT,
    anesthesiologist TEXT,
    past_history TEXT,
    final_diagnosis TEXT,
    diagnosis_category TEXT,
    condition_at_discharge TEXT,
    follow_up_advice TEXT,
    review_on DATE,
    prescription TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_summaries_allocation_id ON discharge_summaries(allocation_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_patient_id ON discharge_summaries(patient_id);

CREATE OR REPLACE FUNCTION update_discharge_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_discharge_summaries_updated_at ON discharge_summaries;
CREATE TRIGGER update_discharge_summaries_updated_at
    BEFORE UPDATE ON discharge_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_discharge_summaries_updated_at();
