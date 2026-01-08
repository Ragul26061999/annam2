-- Create IP Clinical Records tables

-- 1. IP Case Sheets
CREATE TABLE IF NOT EXISTS ip_case_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) NOT NULL,
    patient_id UUID REFERENCES patients(id) NOT NULL,
    present_complaints TEXT,
    history_present_illness TEXT,
    past_history TEXT,
    family_history TEXT,
    personal_history TEXT,
    examination_notes TEXT,
    provisional_diagnosis TEXT,
    investigation_summary TEXT,
    treatment_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ip_case_sheets_bed_allocation ON ip_case_sheets(bed_allocation_id);

-- 2. IP Progress Notes (Daily Progress Notes)
CREATE TABLE IF NOT EXISTS ip_progress_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) NOT NULL,
    note_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_progress_notes_bed_allocation ON ip_progress_notes(bed_allocation_id);

-- 3. IP Doctor Orders
CREATE TABLE IF NOT EXISTS ip_doctor_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assessment TEXT,
    treatment_instructions TEXT,
    investigation_instructions TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_doctor_orders_bed_allocation ON ip_doctor_orders(bed_allocation_id);

-- 4. IP Nurse Records
CREATE TABLE IF NOT EXISTS ip_nurse_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remark TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_nurse_records_bed_allocation ON ip_nurse_records(bed_allocation_id);

-- 5. IP Discharge Summaries
CREATE TABLE IF NOT EXISTS ip_discharge_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) NOT NULL UNIQUE,
    consultant_name TEXT,
    admission_date TIMESTAMP WITH TIME ZONE,
    discharge_date TIMESTAMP WITH TIME ZONE,
    presenting_complaint TEXT,
    physical_findings TEXT,
    investigations TEXT,
    final_diagnosis TEXT,
    treatment_given TEXT,
    condition_at_discharge TEXT,
    follow_up_advice TEXT,
    review_date DATE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_ip_discharge_summaries_bed_allocation ON ip_discharge_summaries(bed_allocation_id);

-- Enable RLS (and allow all access for now as requested)
ALTER TABLE ip_case_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_doctor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_nurse_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_discharge_summaries ENABLE ROW LEVEL SECURITY;

-- Policies for public access (simplest for "Super Admin can create/edit all for now" + ease of dev)
-- In a real scenario, we would check auth.uid() and roles.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_case_sheets' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON ip_case_sheets FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_progress_notes' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON ip_progress_notes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_doctor_orders' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON ip_doctor_orders FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_nurse_records' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON ip_nurse_records FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_discharge_summaries' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON ip_discharge_summaries FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
