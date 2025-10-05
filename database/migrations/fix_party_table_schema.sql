-- Fix party table schema - add missing party_code column
-- This migration adds the missing party_code column that the application expects

-- First, check if party_code column exists, if not add it
DO $$ 
BEGIN
    -- Add party_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'party' 
        AND column_name = 'party_code'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party ADD COLUMN party_code VARCHAR(50) UNIQUE;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_party_code ON public.party(party_code);
        
        -- Update existing records with generated party codes if any exist
        UPDATE public.party 
        SET party_code = 'PARTY_' || id::text 
        WHERE party_code IS NULL;
        
        RAISE NOTICE 'Added party_code column to party table';
    ELSE
        RAISE NOTICE 'party_code column already exists in party table';
    END IF;
    
    -- Ensure other expected columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'party' 
        AND column_name = 'party_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party ADD COLUMN party_type VARCHAR(50) DEFAULT 'patient';
        RAISE NOTICE 'Added party_type column to party table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'party' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        RAISE NOTICE 'Added status column to party table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'party' 
        AND column_name = 'name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party ADD COLUMN name VARCHAR(255);
        RAISE NOTICE 'Added name column to party table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'party' 
        AND column_name = 'phone'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party ADD COLUMN phone VARCHAR(20);
        RAISE NOTICE 'Added phone column to party table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'party' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Added email column to party table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'party' 
        AND column_name = 'address'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column to party table';
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add check constraint for party_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'party_type_check' 
        AND table_name = 'party'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party 
        ADD CONSTRAINT party_type_check 
        CHECK (party_type IN ('patient', 'doctor', 'staff', 'vendor', 'other'));
        RAISE NOTICE 'Added party_type check constraint';
    END IF;
    
    -- Add check constraint for status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'party_status_check' 
        AND table_name = 'party'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.party 
        ADD CONSTRAINT party_status_check 
        CHECK (status IN ('active', 'inactive', 'suspended'));
        RAISE NOTICE 'Added party_status check constraint';
    END IF;
END $$;

-- Create the party table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.party (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_code VARCHAR(50) UNIQUE NOT NULL,
    party_type VARCHAR(50) DEFAULT 'patient' CHECK (party_type IN ('patient', 'doctor', 'staff', 'vendor', 'other')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_party_code ON public.party(party_code);
CREATE INDEX IF NOT EXISTS idx_party_type ON public.party(party_type);
CREATE INDEX IF NOT EXISTS idx_party_status ON public.party(status);

-- Enable RLS if not already enabled
ALTER TABLE public.party ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Policy for authenticated users to view all parties
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'party' 
        AND policyname = 'party_select_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY party_select_policy ON public.party
            FOR SELECT USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Created party select policy';
    END IF;
    
    -- Policy for authenticated users to insert parties
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'party' 
        AND policyname = 'party_insert_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY party_insert_policy ON public.party
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE 'Created party insert policy';
    END IF;
    
    -- Policy for authenticated users to update parties
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'party' 
        AND policyname = 'party_update_policy'
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY party_update_policy ON public.party
            FOR UPDATE USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Created party update policy';
    END IF;
END $$;

COMMIT;
