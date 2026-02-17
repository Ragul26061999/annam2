-- Add has_lab_tests field to prescriptions table
ALTER TABLE prescriptions ADD COLUMN has_lab_tests BOOLEAN DEFAULT FALSE;

-- Create index for better performance when filtering prescriptions with lab tests
CREATE INDEX idx_prescriptions_has_lab_tests ON prescriptions(has_lab_tests);
