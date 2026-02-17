-- Fix total_amount column in drug_purchase_items table
-- Drop and recreate to remove any generated column attributes

ALTER TABLE drug_purchase_items DROP COLUMN total_amount CASCADE;
ALTER TABLE drug_purchase_items ADD COLUMN total_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
