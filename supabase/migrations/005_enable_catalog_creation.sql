-- Add INSERT policies for catalogs to allow staff to add new tests
-- Hospital Management System

-- Lab Test Catalog
CREATE POLICY "Allow authenticated users to create lab tests"
    ON lab_test_catalog FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Radiology Test Catalog
CREATE POLICY "Allow authenticated users to create radiology tests"
    ON radiology_test_catalog FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);
