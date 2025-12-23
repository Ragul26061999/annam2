-- Migration to add admission_type column to patients table with proper enum values
-- This fixes the check constraint violation when registering inpatient/outpatient

-- Add new values to the admission_type enum if it exists
DO $$
BEGIN
    BEGIN
        ALTER TYPE admission_type ADD VALUE IF NOT EXISTS 'inpatient';
        ALTER TYPE admission_type ADD VALUE IF NOT EXISTS 'outpatient';
        ALTER TYPE admission_type ADD VALUE IF NOT EXISTS 'referred';
    EXCEPTION
        WHEN undefined_object THEN
            -- If the enum doesn't exist, create it
            CREATE TYPE admission_type AS ENUM ('emergency', 'elective', 'referred', 'transfer', 'inpatient', 'outpatient');
    END;
END$$;

-- Add admission_type column to patients table if it doesn't exist
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS admission_type VARCHAR(20) CHECK (admission_type IN ('emergency', 'elective', 'referred', 'transfer', 'inpatient', 'outpatient'));

-- Update existing check constraint if needed
-- Drop the old constraint if it exists and create a new one with the correct values
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the existing check constraint for admission_type
    SELECT tc.constraint_name 
    INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'patients' 
    AND tc.constraint_type = 'CHECK'
    AND ccu.column_name = 'admission_type';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE patients DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END IF;
    
    -- Create new check constraint with all required values
    ALTER TABLE patients 
    ADD CONSTRAINT patients_admission_type_check 
    CHECK (admission_type IN ('emergency', 'elective', 'referred', 'transfer', 'inpatient', 'outpatient'));
END$$;