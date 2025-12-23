-- Fix encounter table foreign key constraints
-- This migration fixes the encounter_type_id foreign key constraint issue

-- First, let's check the current encounter table structure and fix foreign key issues
DO $$ 
BEGIN
    -- Check if encounter table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'encounter' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Encounter table exists, checking structure...';
        
        -- Check if type_id column exists (this seems to be the issue)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'encounter' 
            AND column_name = 'type_id'
            AND table_schema = 'public'
        ) THEN
            -- Drop the problematic foreign key constraint if it exists
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'encounter_type_id_fkey' 
                AND table_name = 'encounter'
                AND table_schema = 'public'
            ) THEN
                ALTER TABLE public.encounter DROP CONSTRAINT encounter_type_id_fkey;
                RAISE NOTICE 'Dropped problematic encounter_type_id_fkey constraint';
            END IF;
            
            -- Make type_id nullable to allow encounters without specific types
            ALTER TABLE public.encounter ALTER COLUMN type_id DROP NOT NULL;
            RAISE NOTICE 'Made type_id column nullable';
        END IF;
        
        -- Ensure other required columns exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'encounter' 
            AND column_name = 'patient_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.encounter ADD COLUMN patient_id UUID;
            RAISE NOTICE 'Added patient_id column to encounter table';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'encounter' 
            AND column_name = 'clinician_id'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.encounter ADD COLUMN clinician_id UUID;
            RAISE NOTICE 'Added clinician_id column to encounter table';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'encounter' 
            AND column_name = 'start_at'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.encounter ADD COLUMN start_at TIMESTAMPTZ;
            RAISE NOTICE 'Added start_at column to encounter table';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'encounter' 
            AND column_name = 'end_at'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.encounter ADD COLUMN end_at TIMESTAMPTZ;
            RAISE NOTICE 'Added end_at column to encounter table';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'encounter' 
            AND column_name = 'status'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.encounter ADD COLUMN status VARCHAR(50) DEFAULT 'scheduled';
            RAISE NOTICE 'Added status column to encounter table';
        END IF;
        
    ELSE
        -- Create encounter table if it doesn't exist
        CREATE TABLE public.encounter (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID,
            clinician_id UUID,
            type_id UUID, -- Made nullable, no foreign key constraint
            start_at TIMESTAMPTZ,
            end_at TIMESTAMPTZ,
            status VARCHAR(50) DEFAULT 'scheduled',
            chief_complaint TEXT,
            diagnosis TEXT,
            treatment_plan TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created encounter table';
    END IF;
END $$;

-- Create ref_code table for encounter types if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ref_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_type VARCHAR(50) NOT NULL,
    code_value VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(code_type, code_value)
);

-- Insert default encounter types
INSERT INTO public.ref_code (code_type, code_value, description) VALUES
    ('encounter_type', 'consultation', 'Regular consultation appointment'),
    ('encounter_type', 'emergency', 'Emergency visit'),
    ('encounter_type', 'follow_up', 'Follow-up appointment'),
    ('encounter_type', 'routine_checkup', 'Routine health checkup'),
    ('encounter_type', 'new_patient', 'New patient registration visit')
ON CONFLICT (code_type, code_value) DO NOTHING;

-- Create appointment table if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS public.appointment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounter(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status_id UUID, -- References ref_code, but nullable
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default appointment statuses
INSERT INTO public.ref_code (code_type, code_value, description) VALUES
    ('appointment_status', 'scheduled', 'Appointment is scheduled'),
    ('appointment_status', 'confirmed', 'Appointment is confirmed'),
    ('appointment_status', 'in_progress', 'Appointment is in progress'),
    ('appointment_status', 'completed', 'Appointment is completed'),
    ('appointment_status', 'cancelled', 'Appointment is cancelled'),
    ('appointment_status', 'rescheduled', 'Appointment is rescheduled')
ON CONFLICT (code_type, code_value) DO NOTHING;

-- Add foreign key constraints that reference existing tables
DO $$
BEGIN
    -- Add patient_id foreign key if patients table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'patients' 
        AND table_schema = 'public'
    ) THEN
        -- Drop existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'encounter_patient_id_fkey' 
            AND table_name = 'encounter'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.encounter DROP CONSTRAINT encounter_patient_id_fkey;
        END IF;
        
        -- Add new constraint
        ALTER TABLE public.encounter 
        ADD CONSTRAINT encounter_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES public.patients(id);
        
        RAISE NOTICE 'Added encounter patient_id foreign key';
    END IF;
    
    -- Add clinician_id foreign key if doctors table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'doctors' 
        AND table_schema = 'public'
    ) THEN
        -- Drop existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'encounter_clinician_id_fkey' 
            AND table_name = 'encounter'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.encounter DROP CONSTRAINT encounter_clinician_id_fkey;
        END IF;
        
        -- Add new constraint
        ALTER TABLE public.encounter 
        ADD CONSTRAINT encounter_clinician_id_fkey 
        FOREIGN KEY (clinician_id) REFERENCES public.doctors(id);
        
        RAISE NOTICE 'Added encounter clinician_id foreign key';
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.encounter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    -- Encounter policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'encounter' 
        AND policyname = 'encounter_select_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY encounter_select_policy ON public.encounter
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'encounter' 
        AND policyname = 'encounter_insert_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY encounter_insert_policy ON public.encounter
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    -- Ref_code policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ref_code' 
        AND policyname = 'ref_code_select_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY ref_code_select_policy ON public.ref_code
            FOR SELECT USING (true); -- Allow all users to read reference codes
    END IF;
    
    -- Appointment policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointment' 
        AND policyname = 'appointment_select_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY appointment_select_policy ON public.appointment
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointment' 
        AND policyname = 'appointment_insert_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY appointment_insert_policy ON public.appointment
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_encounter_patient_id ON public.encounter(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounter_clinician_id ON public.encounter(clinician_id);
CREATE INDEX IF NOT EXISTS idx_encounter_start_at ON public.encounter(start_at);
CREATE INDEX IF NOT EXISTS idx_appointment_encounter_id ON public.appointment(encounter_id);
CREATE INDEX IF NOT EXISTS idx_appointment_scheduled_at ON public.appointment(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ref_code_type_value ON public.ref_code(code_type, code_value);

COMMIT;
