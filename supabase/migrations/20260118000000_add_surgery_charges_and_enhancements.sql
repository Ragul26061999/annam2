-- Migration: Add Surgery Charges, Nurse Notes Custom Timing, and Billing Acknowledgements
-- Date: 2026-01-18

-- 1. Create Surgery Charges table
CREATE TABLE IF NOT EXISTS ip_surgery_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    surgery_name TEXT NOT NULL,
    surgeon_name TEXT,
    surgery_date TIMESTAMP WITH TIME ZONE,
    surgery_type TEXT,
    anesthesia_type TEXT,
    duration_minutes INTEGER,
    surgeon_fee NUMERIC DEFAULT 0,
    anesthesia_fee NUMERIC DEFAULT 0,
    ot_charges NUMERIC DEFAULT 0,
    equipment_charges NUMERIC DEFAULT 0,
    consumables_charges NUMERIC DEFAULT 0,
    other_charges NUMERIC DEFAULT 0,
    total_amount NUMERIC GENERATED ALWAYS AS (
        COALESCE(surgeon_fee, 0) + 
        COALESCE(anesthesia_fee, 0) + 
        COALESCE(ot_charges, 0) + 
        COALESCE(equipment_charges, 0) + 
        COALESCE(consumables_charges, 0) + 
        COALESCE(other_charges, 0)
    ) STORED,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    edited BOOLEAN DEFAULT FALSE,
    last_edited_by UUID REFERENCES users(id),
    last_edited_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_surgery_charges_bed_allocation ON ip_surgery_charges(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_surgery_charges_patient ON ip_surgery_charges(patient_id);

-- Enable RLS
ALTER TABLE ip_surgery_charges ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Enable all access for authenticated users" 
    ON ip_surgery_charges FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 2. Add custom timing field to nurse records (noted_at = physical observation time)
ALTER TABLE ip_nurse_records 
    ADD COLUMN IF NOT EXISTS noted_at TIMESTAMP WITH TIME ZONE;

-- Backfill noted_at with entry_time for existing records
UPDATE ip_nurse_records 
SET noted_at = entry_time 
WHERE noted_at IS NULL;

-- 3. Add acknowledge/edited tracking to billing-related tables

-- Add to prescribed medicines tracking (via prescription_items)
ALTER TABLE prescription_items
    ADD COLUMN IF NOT EXISTS billing_acknowledged BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_acknowledged_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS billing_acknowledged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS billing_edited BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_last_edited_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS billing_last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add to lab test orders
ALTER TABLE lab_test_orders
    ADD COLUMN IF NOT EXISTS billing_acknowledged BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_acknowledged_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS billing_acknowledged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS billing_edited BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_last_edited_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS billing_last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add to radiology test orders
ALTER TABLE radiology_test_orders
    ADD COLUMN IF NOT EXISTS billing_acknowledged BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_acknowledged_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS billing_acknowledged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS billing_edited BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS billing_last_edited_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS billing_last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add to bed_allocations for bed charges acknowledgement
ALTER TABLE bed_allocations
    ADD COLUMN IF NOT EXISTS bed_charges_acknowledged BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bed_charges_acknowledged_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS bed_charges_acknowledged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS bed_charges_edited BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bed_charges_last_edited_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS bed_charges_last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add to other_bills
ALTER TABLE other_bills
    ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- 4. Create IP Doctor Consultations table (for additional consultations beyond primary)
CREATE TABLE IF NOT EXISTS ip_doctor_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) NOT NULL,
    doctor_name TEXT NOT NULL,
    consultation_type TEXT DEFAULT 'Additional Consultation',
    consultation_fee NUMERIC DEFAULT 0,
    days INTEGER DEFAULT 1,
    total_amount NUMERIC GENERATED ALWAYS AS (COALESCE(consultation_fee, 0) * COALESCE(days, 1)) STORED,
    notes TEXT,
    consultation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    edited BOOLEAN DEFAULT FALSE,
    last_edited_by UUID REFERENCES users(id),
    last_edited_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_doctor_consultations_bed_allocation ON ip_doctor_consultations(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_patient ON ip_doctor_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_doctor ON ip_doctor_consultations(doctor_id);

-- Enable RLS
ALTER TABLE ip_doctor_consultations ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Enable all access for authenticated users" 
    ON ip_doctor_consultations FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 5. Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_ip_surgery_charges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ip_surgery_charges_updated_at ON ip_surgery_charges;
CREATE TRIGGER update_ip_surgery_charges_updated_at
    BEFORE UPDATE ON ip_surgery_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_surgery_charges_updated_at();

CREATE OR REPLACE FUNCTION update_ip_doctor_consultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ip_doctor_consultations_updated_at ON ip_doctor_consultations;
CREATE TRIGGER update_ip_doctor_consultations_updated_at
    BEFORE UPDATE ON ip_doctor_consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_doctor_consultations_updated_at();

-- 6. Add lab results storage reference to lab_test_orders
ALTER TABLE lab_test_orders
    ADD COLUMN IF NOT EXISTS result_file_url TEXT,
    ADD COLUMN IF NOT EXISTS result_uploaded_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS result_uploaded_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS result_notes TEXT;

-- Comment
COMMENT ON TABLE ip_surgery_charges IS 'Stores surgery charges for IP patients with acknowledgement tracking';
COMMENT ON TABLE ip_doctor_consultations IS 'Stores additional doctor consultations beyond primary consulting doctor';
COMMENT ON COLUMN ip_nurse_records.noted_at IS 'Physical observation time (can differ from entry_time when nurse enters later)';
COMMENT ON COLUMN lab_test_orders.result_file_url IS 'Storage URL for uploaded lab result documents/images';
