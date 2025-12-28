-- Create patient_documents table to store uploaded document metadata

CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uhid VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES staff(id),
  upload_date TIMESTAMP DEFAULT NOW(),
  category VARCHAR(50) DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_uhid ON patient_documents(uhid);
CREATE INDEX IF NOT EXISTS idx_patient_documents_category ON patient_documents(category);
CREATE INDEX IF NOT EXISTS idx_patient_documents_upload_date ON patient_documents(upload_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_patient_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_documents_updated_at
    BEFORE UPDATE ON patient_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_documents_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON patient_documents
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON patient_documents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON patient_documents
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON patient_documents
    FOR DELETE USING (true);

-- Add comments
COMMENT ON TABLE patient_documents IS 'Stores metadata for patient documents uploaded to the system';
COMMENT ON COLUMN patient_documents.category IS 'Document category: medical-report, lab-result, prescription, insurance, id-proof, general';
COMMENT ON COLUMN patient_documents.file_path IS 'Path to file in Supabase Storage bucket';
