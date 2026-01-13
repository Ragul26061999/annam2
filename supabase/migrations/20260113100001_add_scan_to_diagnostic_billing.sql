-- Add scan_order_id column to diagnostic_billing_items table
ALTER TABLE diagnostic_billing_items ADD COLUMN IF NOT EXISTS scan_order_id UUID REFERENCES scan_test_orders(id);

-- Drop and recreate the constraint to include scan orders
ALTER TABLE diagnostic_billing_items DROP CONSTRAINT IF EXISTS check_order_link;

-- Recreate the constraint to include scan orders
ALTER TABLE diagnostic_billing_items 
ADD CONSTRAINT check_order_link CHECK (
    (lab_order_id IS NOT NULL AND radiology_order_id IS NULL AND scan_order_id IS NULL) OR
    (lab_order_id IS NULL AND radiology_order_id IS NOT NULL AND scan_order_id IS NULL) OR
    (lab_order_id IS NULL AND radiology_order_id IS NULL AND scan_order_id IS NOT NULL)
);

-- Drop and recreate the check constraint for order_type to include 'scan'
ALTER TABLE diagnostic_billing_items DROP CONSTRAINT IF EXISTS diagnostic_billing_items_order_type_check;

-- Add scan to the check constraint for order_type
ALTER TABLE diagnostic_billing_items 
ADD CONSTRAINT diagnostic_billing_items_order_type_check 
CHECK (order_type IN ('lab', 'radiology', 'scan'));