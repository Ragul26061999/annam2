-- Add discharge attachments table
CREATE TABLE IF NOT EXISTS discharge_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discharge_summary_id UUID NOT NULL REFERENCES discharge_summaries(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_url TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_discharge_attachments_summary_id ON discharge_attachments(discharge_summary_id);
CREATE INDEX IF NOT EXISTS idx_discharge_attachments_uploaded_at ON discharge_attachments(uploaded_at);

-- Add comments
COMMENT ON TABLE discharge_attachments IS 'Attachments for discharge summaries including reports, images, and documents';
COMMENT ON COLUMN discharge_attachments.file_name IS 'Original file name';
COMMENT ON COLUMN discharge_attachments.file_path IS 'Storage path in Supabase bucket';
COMMENT ON COLUMN discharge_attachments.file_type IS 'MIME type of the file';
COMMENT ON COLUMN discharge_attachments.file_size IS 'File size in bytes';
COMMENT ON COLUMN discharge_attachments.file_url IS 'Public URL for file access';

-- Create storage bucket for discharge attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at)
VALUES (
    'discharge-attachments',
    'discharge-attachments',
    true,
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Row Level Security policies
ALTER TABLE discharge_attachments ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view attachments
CREATE POLICY "Users can view discharge attachments" ON discharge_attachments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to insert attachments
CREATE POLICY "Users can insert discharge attachments" ON discharge_attachments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow users to update their own attachments
CREATE POLICY "Users can update own discharge attachments" ON discharge_attachments
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- Policy to allow users to delete their own attachments
CREATE POLICY "Users can delete own discharge attachments" ON discharge_attachments
    FOR DELETE USING (auth.uid() = uploaded_by);

-- Storage policies
CREATE POLICY "Authenticated users can view discharge attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'discharge-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload discharge attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'discharge-attachments' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update discharge attachments" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'discharge-attachments' AND 
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete discharge attachments" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'discharge-attachments' AND 
        auth.role() = 'authenticated'
    );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_discharge_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_discharge_attachments_updated_at ON discharge_attachments;
CREATE TRIGGER update_discharge_attachments_updated_at 
    BEFORE UPDATE ON discharge_attachments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_discharge_attachments_updated_at();
