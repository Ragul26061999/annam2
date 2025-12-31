-- Migration to add IP Number and Discharge Summary table
-- Please run this in your Supabase SQL Editor

-- 1. Add ip_number to bed_allocations if it doesn't exist
ALTER TABLE bed_allocations ADD COLUMN IF NOT EXISTS ip_number VARCHAR(50) UNIQUE;

-- 2. Create discharge_summaries table
CREATE TABLE IF NOT EXISTS discharge_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    uhid VARCHAR(50),
    patient_name VARCHAR(100),
    address TEXT,
    gender VARCHAR(10),
    age INTEGER,
    ip_number VARCHAR(50),
    admission_date DATE,
    surgery_date DATE,
    discharge_date DATE,
    consultant_id UUID REFERENCES doctors(id),
    presenting_complaint TEXT,
    physical_findings TEXT,
    investigations TEXT,
    anesthesiologist TEXT,
    past_history TEXT,
    final_diagnosis TEXT,
    diagnosis_category VARCHAR(50), -- management, procedure, treatment
    condition_at_discharge VARCHAR(50), -- cured, improved, referred, dis at request, lama, absconed
    follow_up_advice TEXT,
    review_on DATE,
    prescription TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add RLS policies for discharge_summaries
ALTER TABLE discharge_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" 
ON discharge_summaries FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
