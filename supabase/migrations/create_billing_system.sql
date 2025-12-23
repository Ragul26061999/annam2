-- Hospital Management System - Comprehensive Billing System Migration
-- This migration creates a robust billing system for patient discharge management
-- Run this when the database is not in read-only mode

-- 1. Fee Categories Table
-- Stores different types of fees (consultation, medical, lab, room, etc.)
CREATE TABLE IF NOT EXISTS fee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fee Rates Table
-- Stores specific rates for different services within each category
CREATE TABLE IF NOT EXISTS fee_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE CASCADE,
    service_name VARCHAR(200) NOT NULL,
    rate_per_unit DECIMAL(10,2) NOT NULL CHECK (rate_per_unit >= 0),
    unit_type VARCHAR(50) NOT NULL DEFAULT 'per_service', -- per_service, per_day, per_hour, per_item
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, service_name)
);

-- 3. Patient Admissions Table
-- Comprehensive tracking of patient admissions and discharges
CREATE TABLE IF NOT EXISTS patient_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    bed_allocation_id UUID REFERENCES bed_allocations(id),
    admission_date TIMESTAMP WITH TIME ZONE NOT NULL,
    discharge_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'transferred')),
    admission_type VARCHAR(20) DEFAULT 'elective' CHECK (admission_type IN ('emergency', 'elective', 'transfer')),
    primary_diagnosis TEXT,
    secondary_diagnosis TEXT,
    treatment_summary TEXT,
    discharge_notes TEXT,
    total_stay_days INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN discharge_date IS NOT NULL THEN 
                GREATEST(1, EXTRACT(DAY FROM (discharge_date - admission_date))::INTEGER)
            ELSE 
                GREATEST(1, EXTRACT(DAY FROM (NOW() - admission_date))::INTEGER)
        END
    ) STORED,
    room_charges DECIMAL(12,2) DEFAULT 0,
    total_bill_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Billing Summary Table
-- Master billing record for each patient admission
CREATE TABLE IF NOT EXISTS billing_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_admission_id UUID NOT NULL REFERENCES patient_admissions(id) ON DELETE CASCADE,
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    bill_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_percentage DECIMAL(5,2) DEFAULT 0 CHECK (tax_percentage >= 0 AND tax_percentage <= 100),
    tax_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal * tax_percentage / 100) STORED,
    discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal * discount_percentage / 100) STORED,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (subtotal + (subtotal * tax_percentage / 100) - (subtotal * discount_percentage / 100)) STORED,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'cancelled')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'upi', 'insurance', 'cheque')),
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Billing Items Table
-- Individual line items for each bill
CREATE TABLE IF NOT EXISTS billing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_admission_id UUID NOT NULL REFERENCES patient_admissions(id) ON DELETE CASCADE,
    billing_summary_id UUID REFERENCES billing_summary(id) ON DELETE CASCADE,
    fee_rate_id UUID REFERENCES fee_rates(id),
    service_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_rate DECIMAL(10,2) NOT NULL CHECK (unit_rate >= 0),
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_rate) STORED,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payment History Table
-- Track all payments made against bills
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_summary_id UUID NOT NULL REFERENCES billing_summary(id) ON DELETE CASCADE,
    payment_amount DECIMAL(12,2) NOT NULL CHECK (payment_amount > 0),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'insurance', 'cheque')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transaction_reference VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_fee_rates_category ON fee_rates(category_id);
CREATE INDEX IF NOT EXISTS idx_fee_rates_active ON fee_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_patient_admissions_patient ON patient_admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_admissions_status ON patient_admissions(status);
CREATE INDEX IF NOT EXISTS idx_patient_admissions_dates ON patient_admissions(admission_date, discharge_date);
CREATE INDEX IF NOT EXISTS idx_billing_summary_admission ON billing_summary(patient_admission_id);
CREATE INDEX IF NOT EXISTS idx_billing_summary_status ON billing_summary(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_items_admission ON billing_items(patient_admission_id);
CREATE INDEX IF NOT EXISTS idx_billing_items_summary ON billing_items(billing_summary_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_billing ON payment_history(billing_summary_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fee_categories_updated_at BEFORE UPDATE ON fee_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_rates_updated_at BEFORE UPDATE ON fee_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_admissions_updated_at BEFORE UPDATE ON patient_admissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_summary_updated_at BEFORE UPDATE ON billing_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_items_updated_at BEFORE UPDATE ON billing_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert Default Fee Categories
INSERT INTO fee_categories (name, description) VALUES
('Consultation Fees', 'Doctor consultation and examination fees'),
('Medical Fees', 'Medical procedures and treatments'),
('Laboratory Fees', 'Lab tests and diagnostic procedures'),
('Room Charges', 'Hospital room and bed charges'),
('Pharmacy', 'Medicines and pharmaceutical supplies'),
('Radiology', 'X-ray, CT scan, MRI and other imaging'),
('Surgery', 'Surgical procedures and operation theater charges'),
('Emergency', 'Emergency department services'),
('Nursing Care', 'Nursing services and care'),
('Miscellaneous', 'Other hospital services')
ON CONFLICT (name) DO NOTHING;

-- Insert Default Fee Rates
INSERT INTO fee_rates (category_id, service_name, rate_per_unit, unit_type, description) VALUES
-- Consultation Fees
((SELECT id FROM fee_categories WHERE name = 'Consultation Fees'), 'General Consultation', 500.00, 'per_service', 'General doctor consultation'),
((SELECT id FROM fee_categories WHERE name = 'Consultation Fees'), 'Specialist Consultation', 1000.00, 'per_service', 'Specialist doctor consultation'),
((SELECT id FROM fee_categories WHERE name = 'Consultation Fees'), 'Emergency Consultation', 1500.00, 'per_service', 'Emergency department consultation'),

-- Room Charges
((SELECT id FROM fee_categories WHERE name = 'Room Charges'), 'General Ward Bed', 800.00, 'per_day', 'General ward bed per day'),
((SELECT id FROM fee_categories WHERE name = 'Room Charges'), 'Private Room', 2000.00, 'per_day', 'Private room per day'),
((SELECT id FROM fee_categories WHERE name = 'Room Charges'), 'ICU Bed', 5000.00, 'per_day', 'ICU bed per day'),
((SELECT id FROM fee_categories WHERE name = 'Room Charges'), 'Emergency Bed', 1200.00, 'per_day', 'Emergency department bed per day'),

-- Laboratory Fees
((SELECT id FROM fee_categories WHERE name = 'Laboratory Fees'), 'Blood Test - Basic', 300.00, 'per_service', 'Basic blood test panel'),
((SELECT id FROM fee_categories WHERE name = 'Laboratory Fees'), 'Blood Test - Comprehensive', 800.00, 'per_service', 'Comprehensive blood test panel'),
((SELECT id FROM fee_categories WHERE name = 'Laboratory Fees'), 'Urine Test', 200.00, 'per_service', 'Urine analysis'),
((SELECT id FROM fee_categories WHERE name = 'Laboratory Fees'), 'X-Ray', 600.00, 'per_service', 'X-ray imaging'),

-- Medical Fees
((SELECT id FROM fee_categories WHERE name = 'Medical Fees'), 'IV Drip', 400.00, 'per_service', 'Intravenous drip administration'),
((SELECT id FROM fee_categories WHERE name = 'Medical Fees'), 'Injection', 150.00, 'per_service', 'Medical injection'),
((SELECT id FROM fee_categories WHERE name = 'Medical Fees'), 'Dressing', 250.00, 'per_service', 'Wound dressing'),

-- Nursing Care
((SELECT id FROM fee_categories WHERE name = 'Nursing Care'), 'Nursing Care - Basic', 300.00, 'per_day', 'Basic nursing care per day'),
((SELECT id FROM fee_categories WHERE name = 'Nursing Care'), 'Nursing Care - Intensive', 800.00, 'per_day', 'Intensive nursing care per day')

ON CONFLICT (category_id, service_name) DO NOTHING;

-- Create Views for Easy Data Access

-- View for Active Admissions
CREATE OR REPLACE VIEW active_admissions AS
SELECT 
    pa.*,
    p.name as patient_name,
    p.patient_id,
    p.phone as patient_phone,
    ba.bed_id,
    b.bed_number,
    b.room_number,
    b.department_ward
FROM patient_admissions pa
JOIN patients p ON pa.patient_id = p.id
LEFT JOIN bed_allocations ba ON pa.bed_allocation_id = ba.id
LEFT JOIN beds b ON ba.bed_id = b.id
WHERE pa.status = 'active' AND pa.discharge_date IS NULL;

-- View for Billing Summary with Patient Details
CREATE OR REPLACE VIEW billing_summary_detailed AS
SELECT 
    bs.*,
    pa.admission_date,
    pa.discharge_date,
    pa.total_stay_days,
    p.name as patient_name,
    p.patient_id,
    p.phone as patient_phone
FROM billing_summary bs
JOIN patient_admissions pa ON bs.patient_admission_id = pa.id
JOIN patients p ON pa.patient_id = p.id;

-- View for Complete Billing Items
CREATE OR REPLACE VIEW billing_items_detailed AS
SELECT 
    bi.*,
    fc.name as category_name,
    p.name as patient_name,
    p.patient_id,
    pa.admission_date,
    pa.discharge_date
FROM billing_items bi
JOIN patient_admissions pa ON bi.patient_admission_id = pa.id
JOIN patients p ON pa.patient_id = p.id
LEFT JOIN fee_rates fr ON bi.fee_rate_id = fr.id
LEFT JOIN fee_categories fc ON fr.category_id = fc.id;

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE fee_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fee_rates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE patient_admissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE billing_summary ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE billing_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE fee_categories IS 'Categories of fees charged in the hospital';
COMMENT ON TABLE fee_rates IS 'Specific rates for different services within each fee category';
COMMENT ON TABLE patient_admissions IS 'Complete record of patient admissions and discharges';
COMMENT ON TABLE billing_summary IS 'Master billing record for each patient admission';
COMMENT ON TABLE billing_items IS 'Individual line items for each bill';
COMMENT ON TABLE payment_history IS 'Track all payments made against bills';