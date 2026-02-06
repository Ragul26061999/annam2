-- Create lab_xray_attachments table for storing uploaded files
CREATE TABLE IF NOT EXISTS lab_xray_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Patient and order references
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    lab_order_id UUID REFERENCES lab_test_orders(id) ON DELETE CASCADE,
    radiology_order_id UUID REFERENCES radiology_test_orders(id) ON DELETE CASCADE,
    
    -- Test information
    test_name VARCHAR(200) NOT NULL,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('lab', 'radiology')),
    
    -- File information
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT,
    
    -- Upload information
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either lab or radiology order is linked (but allow both to be null for general uploads)
    CONSTRAINT check_order_link CHECK (
        (lab_order_id IS NOT NULL AND radiology_order_id IS NULL) OR
        (lab_order_id IS NULL AND radiology_order_id IS NOT NULL) OR
        (lab_order_id IS NULL AND radiology_order_id IS NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_xray_attachments_patient ON lab_xray_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_xray_attachments_lab_order ON lab_xray_attachments(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_xray_attachments_radiology_order ON lab_xray_attachments(radiology_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_xray_attachments_test_type ON lab_xray_attachments(test_type);
CREATE INDEX IF NOT EXISTS idx_lab_xray_attachments_uploaded_at ON lab_xray_attachments(uploaded_at);

-- Enable Row Level Security
ALTER TABLE lab_xray_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view lab xray attachments"
    ON lab_xray_attachments FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Allow authenticated users to create lab xray attachments"
    ON lab_xray_attachments FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

CREATE POLICY "Allow authenticated users to update their own lab xray attachments"
    ON lab_xray_attachments FOR UPDATE
    TO authenticated
    USING (uploaded_by = auth.uid());

CREATE POLICY "Allow authenticated users to delete their own lab xray attachments"
    ON lab_xray_attachments FOR DELETE
    TO authenticated
    USING (uploaded_by = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lab_xray_attachments_updated_at 
    BEFORE UPDATE ON lab_xray_attachments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
