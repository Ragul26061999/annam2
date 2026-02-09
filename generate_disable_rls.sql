-- Complete RLS disable for development
-- This disables RLS on ALL tables for development purposes
-- WARNING: DO NOT USE IN PRODUCTION

-- Generate commands to disable RLS on all tables
SELECT 'ALTER TABLE ' || schemaname || '.' || tablename || ' DISABLE ROW LEVEL SECURITY;'
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
