-- TEMPORARY: Disable RLS for testing
-- WARNING: This removes security. Only use for testing!
-- Re-enable RLS after testing with proper policies

ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- To re-enable later, run:
-- ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
