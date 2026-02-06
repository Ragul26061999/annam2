-- ============================================
-- Scan Module - Database Schema Extension
-- Hospital Management System
-- Run this SQL in Supabase Dashboard: https://supabase.com/dashboard/project/zusheijhebsmjiyyeiqq/sql
-- ============================================

-- First create the scan_test_catalog table if it doesn't exist
CREATE TABLE IF NOT EXISTS scan_test_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(50) UNIQUE NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    modality VARCHAR(50) NOT NULL, -- CT, MRI, Ultrasound, PET, Mammography, etc.
    body_part VARCHAR(100),
    
    -- Test specifications
    contrast_required BOOLEAN DEFAULT FALSE,
    radiation_exposure VARCHAR(50), -- Low, Medium, High (NULL for non-radiation scans like MRI/USG)
    requires_sedation BOOLEAN DEFAULT FALSE,
    requires_prep BOOLEAN DEFAULT FALSE,
    prep_instructions TEXT,
    
    -- Timing
    average_duration INTEGER, -- in minutes
    normal_turnaround_time INTEGER, -- in hours
    urgent_turnaround_time INTEGER, -- in hours
    
    -- Pricing
    test_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    requires_radiologist BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the scan_test_orders table
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

-- Catalog indexes
CREATE INDEX IF NOT EXISTS idx_scan_catalog_modality ON scan_test_catalog(modality);
CREATE INDEX IF NOT EXISTS idx_scan_catalog_active ON scan_test_catalog(is_active);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on scan tables
ALTER TABLE scan_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_test_orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view scan catalog
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view scan test catalog"
    ON scan_test_catalog FOR SELECT
    TO authenticated
    USING (TRUE);

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

-- ============================================
-- SEED DATA - Common Scan Tests
-- ============================================

INSERT INTO scan_test_catalog (test_code, test_name, modality, body_part, contrast_required, radiation_exposure, requires_sedation, average_duration, normal_turnaround_time, urgent_turnaround_time, test_cost) VALUES
('CT-HEAD', 'CT Scan Head', 'CT', 'Head', FALSE, 'Medium', FALSE, 20, 6, 3, 2500.00),
('CT-ABD', 'CT Scan Abdomen', 'CT', 'Abdomen', TRUE, 'Medium', FALSE, 30, 6, 3, 3500.00),
('MRI-BRAIN', 'MRI Brain', 'MRI', 'Brain', FALSE, 'None', FALSE, 45, 24, 12, 5000.00),
('MRI-SPINE', 'MRI Spine', 'MRI', 'Spine', FALSE, 'None', FALSE, 45, 24, 12, 5500.00),
('USG-ABD', 'Ultrasound Abdomen', 'Ultrasound', 'Abdomen', FALSE, 'None', FALSE, 30, 4, 2, 800.00),
('USG-PELVIS', 'Ultrasound Pelvis', 'Ultrasound', 'Pelvis', FALSE, 'None', FALSE, 30, 4, 2, 800.00),
('PET-CT', 'PET CT Scan', 'PET-CT', 'Whole Body', TRUE, 'High', FALSE, 60, 48, 24, 12000.00),
('MAMMO', 'Mammography', 'Mammography', 'Breast', FALSE, 'Low', FALSE, 20, 6, 3, 1200.00)
ON CONFLICT (test_code) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Scan tables created successfully!';
    RAISE NOTICE 'scan_test_catalog and scan_test_orders tables are now ready for use.';
END $$;
