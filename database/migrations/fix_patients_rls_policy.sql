-- Fix RLS policies for patients table to allow updates
-- Run this in your Supabase SQL Editor

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON patients;
DROP POLICY IF EXISTS "Allow read access to patients" ON patients;
DROP POLICY IF EXISTS "Allow update access to patients" ON patients;
DROP POLICY IF EXISTS "Allow insert access to patients" ON patients;

-- Enable RLS on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for authenticated users
-- Policy 1: Allow SELECT for all authenticated users
CREATE POLICY "Allow read access for authenticated users"
ON patients FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow INSERT for authenticated users
CREATE POLICY "Allow insert access for authenticated users"
ON patients FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Allow UPDATE for authenticated users
CREATE POLICY "Allow update access for authenticated users"
ON patients FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Allow DELETE for authenticated users (optional)
CREATE POLICY "Allow delete access for authenticated users"
ON patients FOR DELETE
TO authenticated
USING (true);

-- For anonymous access (if needed for public registration)
-- Policy 5: Allow SELECT for anon users
CREATE POLICY "Allow read access for anon users"
ON patients FOR SELECT
TO anon
USING (true);

-- Policy 6: Allow INSERT for anon users (for patient registration)
CREATE POLICY "Allow insert access for anon users"
ON patients FOR INSERT
TO anon
WITH CHECK (true);

-- Policy 7: Allow UPDATE for anon users
CREATE POLICY "Allow update access for anon users"
ON patients FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'patients';
