-- Add case_sheet_date to ip_case_sheets table for daily case sheets
-- This allows multiple case sheets per bed allocation (one per day)

-- Add the new column
ALTER TABLE ip_case_sheets 
ADD COLUMN IF NOT EXISTS case_sheet_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Create a unique constraint to ensure one case sheet per bed allocation per day
ALTER TABLE ip_case_sheets 
ADD CONSTRAINT unique_case_sheet_per_day 
UNIQUE (bed_allocation_id, case_sheet_date);

-- Create index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_ip_case_sheets_date 
ON ip_case_sheets(bed_allocation_id, case_sheet_date);

-- Update existing records to have today's date if they don't have a date set
UPDATE ip_case_sheets 
SET case_sheet_date = DATE(created_at) 
WHERE case_sheet_date IS NULL OR case_sheet_date = '1970-01-01';
