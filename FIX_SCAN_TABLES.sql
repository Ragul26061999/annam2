-- ============================================
-- Fix Scan Tables - Corrected Version
-- Hospital Management System
-- Run this SQL in Supabase Dashboard: https://supabase.com/dashboard/project/zusheijhebsmjiyyeiqq/sql
-- ============================================

-- First, create the scan_test_orders table (this one doesn't exist)
CREATE TABLE IF NOT EXISTS scan_test_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Format: SCN-YYYYMMDD-XXXX
    
    -- Patient and encounter information
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    
    -- Ordering information
    ordering_doctor_id UUID NOT NULL REFERENCES doctors(id),
    test_catalog_id UUID NOT NULL REFERENCES scan_test_catalog(id),
    
    -- Clinical information
    clinical_indication TEXT NOT NULL,
    provisional_diagnosis TEXT,
    special_instructions TEXT,
    body_part VARCHAR(100),
    laterality VARCHAR(20), -- Left, Right, Bilateral
    
    -- Contrast and preparation
    contrast_required BOOLEAN DEFAULT FALSE,
    contrast_type VARCHAR(100),
    patient_preparation_notes TEXT,
    allergies_checked BOOLEAN DEFAULT FALSE,
    prep_completed BOOLEAN DEFAULT FALSE,
    
    -- Priority and timing
    urgency VARCHAR(20) DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat', 'emergency')),
    preferred_scan_date DATE,
    preferred_scan_time TIME,
    
    -- Status tracking
    status VARCHAR(30) DEFAULT 'ordered' CHECK (status IN (
        'ordered', 'scheduled', 'patient_arrived', 'in_progress', 
        'scan_completed', 'report_pending', 'completed', 'cancelled'
    )),
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    scheduled_by UUID REFERENCES users(id),
    
    -- Scan execution
    scan_started_at TIMESTAMP WITH TIME ZONE,
    scan_completed_at TIMESTAMP WITH TIME ZONE,
    technician_id UUID REFERENCES users(id),
    
    -- Reporting
    report_drafted_at TIMESTAMP WITH TIME ZONE,
    report_verified_at TIMESTAMP WITH TIME ZONE,
    radiologist_id UUID REFERENCES doctors(id),
    
    -- Images and report
    images_url TEXT[], -- Array of image URLs
    report_url TEXT,
    report_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Findings
    findings_summary TEXT,
    impression TEXT,
    recommendations TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Scan orders indexes
CREATE INDEX IF NOT EXISTS idx_scan_orders_patient ON scan_test_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_scan_orders_doctor ON scan_test_orders(ordering_doctor_id);
CREATE INDEX IF NOT EXISTS idx_scan_orders_status ON scan_test_orders(status);
CREATE INDEX IF NOT EXISTS idx_scan_orders_date ON scan_test_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_orders_urgency ON scan_test_orders(urgency);
CREATE INDEX IF NOT EXISTS idx_scan_orders_order_number ON scan_test_orders(order_number);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on scan orders table
ALTER TABLE scan_test_orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view scan orders
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view scan orders"
    ON scan_test_orders FOR SELECT
    TO authenticated
    USING (TRUE);

-- Allow authenticated users to create scan orders
CREATE POLICY IF NOT EXISTS "Allow authenticated users to create scan orders"
    ON scan_test_orders FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Allow staff to update scan orders
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update scan orders"
    ON scan_test_orders FOR UPDATE
    TO authenticated
    USING (TRUE);

-- Add some sample data to the existing scan_test_catalog if needed
INSERT INTO scan_test_catalog (scan_code, scan_name, category, body_part, test_cost, modality, contrast_required, requires_sedation, requires_prep, requires_radiologist) VALUES
('CT-HEAD', 'CT Scan Head', 'CT', 'Head', 2500.00, 'CT', false, false, false, true),
('CT-ABD', 'CT Scan Abdomen', 'CT', 'Abdomen', 3500.00, 'CT', true, false, false, true),
('MRI-BRAIN', 'MRI Brain', 'MRI', 'Brain', 5000.00, 'MRI', false, false, false, true),
('MRI-SPINE', 'MRI Spine', 'MRI', 'Spine', 5500.00, 'MRI', false, false, false, true),
('USG-ABD', 'Ultrasound Abdomen', 'Ultrasound', 'Abdomen', 800.00, 'Ultrasound', false, false, false, true),
('USG-PELVIS', 'Ultrasound Pelvis', 'Ultrasound', 'Pelvis', 800.00, 'Ultrasound', false, false, false, true),
('XRAY-CHEST', 'X-Ray Chest', 'X-Ray', 'Chest', 300.00, 'X-Ray', false, false, false, true),
('XRAY-EXTREMITY', 'X-Ray Extremity', 'X-Ray', 'Extremity', 250.00, 'X-Ray', false, false, false, true)
ON CONFLICT (scan_code) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Scan tables fixed successfully!';
    RAISE NOTICE 'scan_test_orders table created and ready for use.';
    RAISE NOTICE 'scan_test_catalog table already existed and was updated with new data.';
END $$;
