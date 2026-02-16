-- Fix total_amount column in drug_purchases table
-- Remove any generated column constraint that prevents manual insertion

-- First, check if total_amount is a generated column and drop it if so
DO $$
BEGIN
    -- Check if total_amount is a generated column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'drug_purchases'
        AND column_name = 'total_amount'
        AND is_generated = 'ALWAYS'
    ) THEN
        -- Drop the existing generated column
        ALTER TABLE drug_purchases DROP COLUMN total_amount;
        -- Re-add it as a normal column with default
        ALTER TABLE drug_purchases ADD COLUMN total_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
END $$;

-- Ensure the total_amount column allows normal insertion
-- This column should be computed by the API and inserted normally
ALTER TABLE drug_purchases
ALTER COLUMN total_amount DROP DEFAULT,
ALTER COLUMN total_amount SET DEFAULT 0;
