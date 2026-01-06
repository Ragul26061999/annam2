-- Add medication recommendations table for IP patients
CREATE TABLE IF NOT EXISTS medication_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    medication_name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    instructions TEXT,
    reason_for_recommendation TEXT,
    recommended_by VARCHAR(100) DEFAULT 'system',
    recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dispensed', 'rejected')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add medication recommendation rules table
CREATE TABLE IF NOT EXISTS medication_recommendation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(200) NOT NULL,
    condition TEXT NOT NULL,
    medication_recommendations JSONB NOT NULL,
    contraindications TEXT[] DEFAULT '{}',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_medication_recommendations_patient_id ON medication_recommendations(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_recommendations_status ON medication_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_medication_recommendations_date ON medication_recommendations(recommendation_date);
CREATE INDEX IF NOT EXISTS idx_medication_recommendation_rules_condition ON medication_recommendation_rules(condition);
CREATE INDEX IF NOT EXISTS idx_medication_recommendation_rules_active ON medication_recommendation_rules(is_active);

-- Add comments
COMMENT ON TABLE medication_recommendations IS 'Medication recommendations for IP patients based on clinical data';
COMMENT ON COLUMN medication_recommendations.reason_for_recommendation IS 'Clinical reason for this recommendation';
COMMENT ON COLUMN medication_recommendations.recommended_by IS 'Who/what system made the recommendation';
COMMENT ON TABLE medication_recommendation_rules IS 'Rules for automatic medication recommendations based on conditions';

-- Insert sample recommendation rules
INSERT INTO medication_recommendation_rules (rule_name, condition, medication_recommendations, contraindications, notes) VALUES
(
    'Post-Surgical Pain Management',
    'surgery OR postoperative OR surgical',
    '[
        {
            "medication_id": "00000000-0000-0000-0000-000000000001",
            "dosage": "500 mg",
            "frequency": "every 6 hours",
            "duration": "3 days",
            "priority": "high"
        },
        {
            "medication_id": "00000000-0000-0000-0000-000000000002",
            "dosage": "75 mg",
            "frequency": "once daily",
            "duration": "7 days",
            "priority": "medium"
        }
    ]',
    ARRAY['NSAID allergy', 'bleeding disorder', 'peptic ulcer'],
    'Standard post-operative pain management regimen'
),
(
    'Cardiovascular Support',
    'cardiac OR heart OR hypertension OR cardiovascular',
    '[
        {
            "medication_id": "00000000-0000-0000-0000-000000000003",
            "dosage": "5 mg",
            "frequency": "once daily",
            "duration": "hospital stay",
            "priority": "high"
        },
        {
            "medication_id": "00000000-0000-0000-0000-000000000004",
            "dosage": "40 mg",
            "frequency": "once daily",
            "duration": "hospital stay",
            "priority": "medium"
        }
    ]',
    ARRAY['hypotension', 'bradycardia'],
    'Cardiovascular support medications for cardiac patients'
),
(
    'Diabetes Management',
    'diabetes OR diabetic OR hyperglycemia',
    '[
        {
            "medication_id": "00000000-0000-0000-0000-000000000005",
            "dosage": "500 mg",
            "frequency": "twice daily",
            "duration": "hospital stay",
            "priority": "high"
        }
    ]',
    ARRAY['renal impairment', 'liver disease'],
    'Diabetes management for hospitalized patients'
),
(
    'Infection Prophylaxis',
    'infection OR prophylaxis OR antibiotic',
    '[
        {
            "medication_id": "00000000-0000-0000-0000-000000000006",
            "dosage": "500 mg",
            "frequency": "every 8 hours",
            "duration": "5 days",
            "priority": "high"
        }
    ]',
    ARRAY['penicillin allergy'],
    'Broad-spectrum antibiotic prophylaxis'
)
ON CONFLICT (rule_name, condition) DO NOTHING;

-- Row Level Security policies
ALTER TABLE medication_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_recommendation_rules ENABLE ROW LEVEL SECURITY;

-- Policies for medication recommendations
CREATE POLICY "Users can view own medication recommendations" ON medication_recommendations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Doctors can create medication recommendations" ON medication_recommendations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Doctors can update medication recommendations" ON medication_recommendations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view medication recommendation rules" ON medication_recommendation_rules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_medication_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_medication_recommendation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_medication_recommendations_updated_at ON medication_recommendations;
CREATE TRIGGER update_medication_recommendations_updated_at 
    BEFORE UPDATE ON medication_recommendations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_medication_recommendations_updated_at();

DROP TRIGGER IF EXISTS update_medication_recommendation_rules_updated_at ON medication_recommendation_rules;
CREATE TRIGGER update_medication_recommendation_rules_updated_at 
    BEFORE UPDATE ON medication_recommendation_rules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_medication_recommendation_rules_updated_at();
