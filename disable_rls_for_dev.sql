-- Temporarily disable RLS for development
-- Run these commands in your Supabase SQL editor or psql

ALTER TABLE public.prescriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items DISABLE ROW LEVEL SECURITY; 
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications DISABLE ROW LEVEL SECURITY;
