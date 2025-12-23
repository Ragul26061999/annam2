-- ============================================
-- Lab & X-Ray Module - Database Schema
-- Hospital Management System
-- ============================================

-- 1. LAB TEST CATALOG
-- Stores available lab test definitions
CREATE TABLE IF NOT EXISTS lab_test_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(50) UNIQUE NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL, -- Hematology, Biochemistry, Microbiology, etc.
    subcategory VARCHAR(100),
    department VARCHAR(100) DEFAULT 'Laboratory',
    
    -- Test specifications
    sample_type VARCHAR(100), -- Blood, Urine, Stool, etc.
    sample_volume VARCHAR(50),
    container_type VARCHAR(100), -- Plain tube, EDTA tube, etc.
    fasting_required BOOLEAN DEFAULT FALSE,
    
    -- Timing
    normal_turnaround_time INTEGER, -- in hours
    urgent_turnaround_time INTEGER, -- in hours
    
    -- Pricing
    test_cost NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RADIOLOGY TEST CATALOG (X-Ray, CT, MRI, etc.)
CREATE TABLE IF NOT EXISTS radiology_test_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(50) UNIQUE NOT NULL,
    test_name VARCHAR(200) NOT NULL,
    modality VARCHAR(50) NOT NULL, -- X-Ray, CT, MRI, Ultrasound, PET, Mammography
    body_part VARCHAR(100),
    
    -- Test specifications
    contrast_required BOOLEAN DEFAULT FALSE,
    radiation_exposure VARCHAR(50), -- Low, Medium, High
    requires_sedation BOOLEAN DEFAULT FALSE,
    
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

-- 3. LAB TEST ORDERS
-- Stores lab test orders from doctors
CREATE TABLE IF NOT EXISTS lab_test_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Format: LAB-YYYYMMDD-XXXX
    
    -- Patient and encounter information
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    
    -- Ordering information
    ordering_doctor_id UUID NOT NULL REFERENCES doctors(id),
    test_catalog_id UUID NOT NULL REFERENCES lab_test_catalog(id),
    
    -- Clinical information
    clinical_indication TEXT NOT NULL,
    provisional_diagnosis TEXT,
    special_instructions TEXT,
    
    -- Priority and timing
    urgency VARCHAR(20) DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat', 'emergency')),
    fasting_status BOOLEAN,
    preferred_collection_date DATE,
    preferred_collection_time TIME,
    
    -- Status tracking
    status VARCHAR(30) DEFAULT 'ordered' CHECK (status IN (
        'ordered', 'sample_pending', 'sample_collected', 
        'in_progress', 'completed', 'cancelled', 'rejected'
    )),
    
    -- Sample collection
    sample_collected_at TIMESTAMP WITH TIME ZONE,
    sample_collected_by UUID REFERENCES users(id),
    sample_id VARCHAR(50),
    
    -- Result tracking
    result_entry_started_at TIMESTAMP WITH TIME ZONE,
    result_completed_at TIMESTAMP WITH TIME ZONE,
    result_verified_at TIMESTAMP WITH TIME ZONE,
    result_verified_by UUID REFERENCES doctors(id),
    
    -- Report
    report_url TEXT,
    report_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- 4. LAB TEST RESULTS
-- Stores detailed lab test results
CREATE TABLE IF NOT EXISTS lab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES lab_test_orders(id) ON DELETE CASCADE,
    
    -- Result parameters
    parameter_name VARCHAR(200) NOT NULL,
    parameter_value TEXT NOT NULL,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    
    -- Flags
    is_abnormal BOOLEAN DEFAULT FALSE,
    abnormal_flag VARCHAR(20), -- H (High), L (Low), HH, LL, etc.
    
    -- Notes
    technician_notes TEXT,
    
    -- Metadata
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    entered_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RADIOLOGY TEST ORDERS (X-Ray, CT, MRI, etc.)
CREATE TABLE IF NOT EXISTS radiology_test_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Format: RAD-YYYYMMDD-XXXX
    
    -- Patient and encounter information
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounter(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointment(id) ON DELETE CASCADE,
    
    -- Ordering information
    ordering_doctor_id UUID NOT NULL REFERENCES doctors(id),
    test_catalog_id UUID NOT NULL REFERENCES radiology_test_catalog(id),
    
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

-- 6. LAB & RADIOLOGY BILLING INTEGRATION
CREATE TABLE IF NOT EXISTS diagnostic_billing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to order
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('lab', 'radiology')),
    lab_order_id UUID REFERENCES lab_test_orders(id),
    radiology_order_id UUID REFERENCES radiology_test_orders(id),
    
    -- Billing information
    patient_id UUID NOT NULL REFERENCES patients(id),
    test_name VARCHAR(200) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    
    -- Payment status
    billing_status VARCHAR(20) DEFAULT 'pending' CHECK (billing_status IN ('pending', 'billed', 'paid')),
    billed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either lab or radiology order is linked
    CONSTRAINT check_order_link CHECK (
        (lab_order_id IS NOT NULL AND radiology_order_id IS NULL) OR
        (lab_order_id IS NULL AND radiology_order_id IS NOT NULL)
    )
);

-- 7. PATIENT ACCESS LOG
-- Track when patients/doctors access reports
CREATE TABLE IF NOT EXISTS diagnostic_report_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Access information
    accessed_by_user_id UUID NOT NULL REFERENCES users(id),
    accessed_by_type VARCHAR(20) NOT NULL, -- doctor, patient, nurse, admin
    
    -- Report reference
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('lab', 'radiology')),
    lab_order_id UUID REFERENCES lab_test_orders(id),
    radiology_order_id UUID REFERENCES radiology_test_orders(id),
    
    -- Access details
    access_method VARCHAR(50), -- web, mobile, print, download
    ip_address INET,
    
    -- Metadata
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Lab orders indexes
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_test_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor ON lab_test_orders(ordering_doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_test_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_date ON lab_test_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_lab_orders_urgency ON lab_test_orders(urgency);
CREATE INDEX IF NOT EXISTS idx_lab_orders_order_number ON lab_test_orders(order_number);

-- Radiology orders indexes
CREATE INDEX IF NOT EXISTS idx_rad_orders_patient ON radiology_test_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_rad_orders_doctor ON radiology_test_orders(ordering_doctor_id);
CREATE INDEX IF NOT EXISTS idx_rad_orders_status ON radiology_test_orders(status);
CREATE INDEX IF NOT EXISTS idx_rad_orders_date ON radiology_test_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_rad_orders_urgency ON radiology_test_orders(urgency);
CREATE INDEX IF NOT EXISTS idx_rad_orders_order_number ON radiology_test_orders(order_number);

-- Results indexes
CREATE INDEX IF NOT EXISTS idx_lab_results_order ON lab_test_results(order_id);

-- Billing indexes
CREATE INDEX IF NOT EXISTS idx_diag_billing_patient ON diagnostic_billing_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_diag_billing_status ON diagnostic_billing_items(billing_status);

-- ============================================
-- SEED DATA - Common Lab Tests
-- ============================================

INSERT INTO lab_test_catalog (test_code, test_name, category, subcategory, sample_type, sample_volume, container_type, fasting_required, normal_turnaround_time, urgent_turnaround_time, test_cost) VALUES
('CBC', 'Complete Blood Count', 'Hematology', 'Routine', 'Blood', '2ml', 'EDTA Tube', FALSE, 4, 2, 300.00),
('FBS', 'Fasting Blood Sugar', 'Biochemistry', 'Diabetes', 'Blood', '2ml', 'Plain Tube', TRUE, 2, 1, 150.00),
('RBS', 'Random Blood Sugar', 'Biochemistry', 'Diabetes', 'Blood', '2ml', 'Plain Tube', FALSE, 2, 1, 150.00),
('HBA1C', 'Glycated Hemoglobin', 'Biochemistry', 'Diabetes', 'Blood', '2ml', 'EDTA Tube', FALSE, 24, 12, 500.00),
('LFT', 'Liver Function Test', 'Biochemistry', 'Liver', 'Blood', '3ml', 'Plain Tube', TRUE, 6, 3, 600.00),
('RFT', 'Renal Function Test', 'Biochemistry', 'Kidney', 'Blood', '3ml', 'Plain Tube', FALSE, 6, 3, 600.00),
('LIPID', 'Lipid Profile', 'Biochemistry', 'Cardiovascular', 'Blood', '3ml', 'Plain Tube', TRUE, 6, 3, 700.00),
('TSH', 'Thyroid Stimulating Hormone', 'Biochemistry', 'Thyroid', 'Blood', '2ml', 'Plain Tube', FALSE, 24, 12, 400.00),
('URINE', 'Urine Routine & Microscopy', 'Biochemistry', 'Routine', 'Urine', '10ml', 'Sterile Container', FALSE, 2, 1, 200.00),
('ESR', 'Erythrocyte Sedimentation Rate', 'Hematology', 'Inflammation', 'Blood', '2ml', 'EDTA Tube', FALSE, 2, 1, 150.00)
ON CONFLICT (test_code) DO NOTHING;

-- ============================================
-- SEED DATA - Common Radiology Tests
-- ============================================

INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, contrast_required, radiation_exposure, requires_sedation, average_duration, normal_turnaround_time, urgent_turnaround_time, test_cost) VALUES
('XRAY-CHEST-PA', 'Chest X-Ray PA View', 'X-Ray', 'Chest', FALSE, 'Low', FALSE, 15, 2, 1, 400.00),
('XRAY-CHEST-LAT', 'Chest X-Ray Lateral View', 'X-Ray', 'Chest', FALSE, 'Low', FALSE, 15, 2, 1, 400.00),
('XRAY-ABD', 'Abdomen X-Ray', 'X-Ray', 'Abdomen', FALSE, 'Low', FALSE, 15, 2, 1, 500.00),
('XRAY-SKULL', 'Skull X-Ray', 'X-Ray', 'Head', FALSE, 'Low', FALSE, 15, 2, 1, 500.00),
('XRAY-SPINE-LS', 'Lumbar Spine X-Ray', 'X-Ray', 'Spine', FALSE, 'Low', FALSE, 20, 2, 1, 600.00),
('USG-ABD', 'Ultrasound Abdomen', 'Ultrasound', 'Abdomen', FALSE, 'None', FALSE, 30, 4, 2, 800.00),
('USG-PELVIS', 'Ultrasound Pelvis', 'Ultrasound', 'Pelvis', FALSE, 'None', FALSE, 30, 4, 2, 800.00),
('CT-HEAD', 'CT Scan Head', 'CT', 'Head', FALSE, 'Medium', FALSE, 20, 6, 3, 2500.00),
('CT-ABD', 'CT Scan Abdomen', 'CT', 'Abdomen', TRUE, 'Medium', FALSE, 30, 6, 3, 3500.00),
('MRI-BRAIN', 'MRI Brain', 'MRI', 'Brain', TRUE, 'None', FALSE, 45, 24, 12, 5000.00)
ON CONFLICT (test_code) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE lab_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE radiology_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE radiology_test_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_report_access_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view catalogs
CREATE POLICY "Allow authenticated users to view lab test catalog"
    ON lab_test_catalog FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Allow authenticated users to view radiology test catalog"
    ON radiology_test_catalog FOR SELECT
    TO authenticated
    USING (TRUE);

-- Allow authenticated users to view their own orders
CREATE POLICY "Allow authenticated users to view lab orders"
    ON lab_test_orders FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Allow authenticated users to view radiology orders"
    ON radiology_test_orders FOR SELECT
    TO authenticated
    USING (TRUE);

-- Allow doctors to create orders
CREATE POLICY "Allow authenticated users to create lab orders"
    ON lab_test_orders FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Allow authenticated users to create radiology orders"
    ON radiology_test_orders FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Allow staff to update orders
CREATE POLICY "Allow authenticated users to update lab orders"
    ON lab_test_orders FOR UPDATE
    TO authenticated
    USING (TRUE);

CREATE POLICY "Allow authenticated users to update radiology orders"
    ON radiology_test_orders FOR UPDATE
    TO authenticated
    USING (TRUE);

-- Allow lab staff to insert results
CREATE POLICY "Allow authenticated users to insert lab results"
    ON lab_test_results FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Allow authenticated users to view lab results"
    ON lab_test_results FOR SELECT
    TO authenticated
    USING (TRUE);

-- Billing policies
CREATE POLICY "Allow authenticated users to view diagnostic billing"
    ON diagnostic_billing_items FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Allow authenticated users to create diagnostic billing"
    ON diagnostic_billing_items FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Access log policies
CREATE POLICY "Allow authenticated users to log access"
    ON diagnostic_report_access_log FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);
