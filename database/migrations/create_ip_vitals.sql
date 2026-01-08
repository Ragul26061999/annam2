-- Create IP Vitals table
CREATE TABLE IF NOT EXISTS ip_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID REFERENCES bed_allocations(id) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    temperature DECIMAL(4,1), -- Celsius or Fahrenheit
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    pulse INTEGER,
    respiratory_rate INTEGER,
    spo2 INTEGER,
    sugar_level INTEGER, -- mg/dL
    sugar_type VARCHAR(20), -- Random, Fasting, Post-prandial
    consciousness_level VARCHAR(50), -- Alert, Drowsy, etc.
    urine_output INTEGER, -- ml
    intake_fluids INTEGER, -- ml
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_vitals_bed_allocation ON ip_vitals(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_ip_vitals_recorded_at ON ip_vitals(recorded_at);

-- Enable RLS
ALTER TABLE ip_vitals ENABLE ROW LEVEL SECURITY;

-- Policy
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ip_vitals' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON ip_vitals FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
