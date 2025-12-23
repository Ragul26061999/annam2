-- Clinical Encounter Data Tables
-- This migration creates tables for storing clinical data entered by doctors after patient inspection

-- 1. Clinical Notes Table
-- Stores doctor's notes and observations during patient encounter
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    
    -- Clinical observations
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    physical_examination TEXT,
    assessment TEXT,
    clinical_impression TEXT,
    differential_diagnosis TEXT[],
    
    -- Additional notes
    doctor_notes TEXT NOT NULL,
    follow_up_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Scan Orders Table
-- Stores orders for scans/imaging required for patient
CREATE TABLE IF NOT EXISTS scan_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    
    -- Scan details
    scan_type VARCHAR(100) NOT NULL, -- X-Ray, CT Scan, MRI, Ultrasound, etc.
    scan_name VARCHAR(200) NOT NULL,
    body_part VARCHAR(100),
    urgency VARCHAR(20) DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat', 'emergency')),
    
    -- Clinical information
    clinical_indication TEXT NOT NULL,
    special_instructions TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'ordered' CHECK (status IN ('ordered', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    ordered_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    
    -- Results
    result_summary TEXT,
    report_url TEXT,
    radiologist_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Prescription Orders Table (Enhanced)
-- Stores medication prescriptions
CREATE TABLE IF NOT EXISTS prescription_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    
    -- Prescription details
    medication_name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    dosage VARCHAR(100) NOT NULL, -- e.g., "500mg", "10ml"
    form VARCHAR(50), -- tablet, capsule, syrup, injection, etc.
    route VARCHAR(50), -- oral, IV, IM, topical, etc.
    
    -- Dosing instructions
    frequency VARCHAR(100) NOT NULL, -- e.g., "twice daily", "every 6 hours"
    duration VARCHAR(100) NOT NULL, -- e.g., "7 days", "2 weeks"
    quantity INTEGER NOT NULL,
    refills INTEGER DEFAULT 0,
    
    -- Instructions
    instructions TEXT NOT NULL,
    special_instructions TEXT,
    food_instructions VARCHAR(100), -- before food, after food, with food
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dispensed', 'completed', 'cancelled', 'discontinued')),
    
    -- Metadata
    prescribed_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Injection Orders Table
-- Stores orders for injections to be administered
CREATE TABLE IF NOT EXISTS injection_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    
    -- Injection details
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    route VARCHAR(50) NOT NULL, -- IV, IM, SC, Intradermal
    site VARCHAR(100), -- injection site
    
    -- Administration schedule
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100),
    total_doses INTEGER,
    
    -- Instructions
    instructions TEXT NOT NULL,
    special_precautions TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'ordered' CHECK (status IN ('ordered', 'in_progress', 'completed', 'cancelled')),
    urgency VARCHAR(20) DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat')),
    
    -- Administration tracking
    doses_administered INTEGER DEFAULT 0,
    last_administered_at TIMESTAMP WITH TIME ZONE,
    administered_by UUID REFERENCES users(id),
    
    -- Metadata
    ordered_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Follow-up Appointments Table
-- Stores follow-up appointment recommendations
CREATE TABLE IF NOT EXISTS follow_up_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    
    -- Follow-up details
    follow_up_date DATE NOT NULL,
    follow_up_time TIME,
    reason TEXT NOT NULL,
    instructions TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'recommended' CHECK (status IN ('recommended', 'scheduled', 'completed', 'cancelled', 'missed')),
    priority VARCHAR(20) DEFAULT 'routine' CHECK (priority IN ('routine', 'important', 'urgent')),
    
    -- Linked appointment (when scheduled)
    scheduled_appointment_id UUID REFERENCES appointment(id),
    
    -- Metadata
    recommended_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Surgery Recommendations Table
-- Stores surgery recommendations and requirements
CREATE TABLE IF NOT EXISTS surgery_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    recommending_doctor_id UUID NOT NULL REFERENCES doctors(id),
    
    -- Surgery details
    surgery_name VARCHAR(200) NOT NULL,
    surgery_type VARCHAR(100) NOT NULL, -- elective, emergency, urgent
    procedure_code VARCHAR(50),
    
    -- Clinical information
    indication TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    pre_operative_diagnosis TEXT,
    
    -- Requirements
    anesthesia_type VARCHAR(100), -- general, local, regional, spinal
    estimated_duration VARCHAR(50),
    special_equipment TEXT[],
    blood_requirements VARCHAR(100),
    
    -- Team and scheduling
    surgeon_id UUID REFERENCES doctors(id),
    anesthesiologist_id UUID REFERENCES doctors(id),
    preferred_date DATE,
    urgency VARCHAR(20) DEFAULT 'elective' CHECK (urgency IN ('elective', 'urgent', 'emergency')),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'recommended' CHECK (status IN ('recommended', 'approved', 'scheduled', 'completed', 'cancelled', 'postponed')),
    
    -- Pre-operative requirements
    pre_op_tests TEXT[],
    pre_op_instructions TEXT,
    consent_obtained BOOLEAN DEFAULT FALSE,
    
    -- Additional notes
    notes TEXT,
    risk_factors TEXT,
    
    -- Metadata
    recommended_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clinical_notes_encounter ON clinical_notes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_doctor ON clinical_notes(doctor_id);

CREATE INDEX IF NOT EXISTS idx_scan_orders_encounter ON scan_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_scan_orders_patient ON scan_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_scan_orders_status ON scan_orders(status);

CREATE INDEX IF NOT EXISTS idx_prescription_orders_encounter ON prescription_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_prescription_orders_patient ON prescription_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_orders_status ON prescription_orders(status);

CREATE INDEX IF NOT EXISTS idx_injection_orders_encounter ON injection_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_injection_orders_patient ON injection_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_injection_orders_status ON injection_orders(status);

CREATE INDEX IF NOT EXISTS idx_follow_up_appointments_encounter ON follow_up_appointments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_appointments_patient ON follow_up_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_appointments_date ON follow_up_appointments(follow_up_date);

CREATE INDEX IF NOT EXISTS idx_surgery_recommendations_encounter ON surgery_recommendations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_surgery_recommendations_patient ON surgery_recommendations(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgery_recommendations_status ON surgery_recommendations(status);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clinical_notes_updated_at BEFORE UPDATE ON clinical_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scan_orders_updated_at BEFORE UPDATE ON scan_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescription_orders_updated_at BEFORE UPDATE ON prescription_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_injection_orders_updated_at BEFORE UPDATE ON injection_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_follow_up_appointments_updated_at BEFORE UPDATE ON follow_up_appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_surgery_recommendations_updated_at BEFORE UPDATE ON surgery_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE clinical_notes IS 'Stores doctor notes and clinical observations during patient encounters';
COMMENT ON TABLE scan_orders IS 'Stores orders for medical imaging and scans';
COMMENT ON TABLE prescription_orders IS 'Stores medication prescriptions ordered by doctors';
COMMENT ON TABLE injection_orders IS 'Stores orders for injections to be administered';
COMMENT ON TABLE follow_up_appointments IS 'Stores follow-up appointment recommendations';
COMMENT ON TABLE surgery_recommendations IS 'Stores surgery recommendations and requirements';
