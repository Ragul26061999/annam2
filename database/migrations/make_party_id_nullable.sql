-- Make party_id nullable in users table to bypass party requirement
-- This allows patient registration to work without party table issues

-- Step 1: Make party_id nullable
ALTER TABLE public.users 
ALTER COLUMN party_id DROP NOT NULL;

-- Step 2: Add a comment explaining this change
COMMENT ON COLUMN public.users.party_id IS 'Optional reference to party table. Can be null for direct patient registration.';

-- Verification query
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'party_id';
