-- Fix total_amount column in drug_purchase_items table
-- Add default value to prevent "cannot insert a non-DEFAULT value" error

ALTER TABLE drug_purchase_items
ALTER COLUMN total_amount SET DEFAULT 0;
