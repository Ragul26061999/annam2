-- Migration to back-populate GST ledger for existing pharmacy bills
-- This will populate GST data for all existing pharmacy bills

-- Insert GST ledger entries for existing pharmacy bills
INSERT INTO pharmacy_gst_ledger (
  transaction_date,
  transaction_type,
  reference_id,
  reference_number,
  party_type,
  party_name,
  party_gstin,
  taxable_amount,
  cgst_percent,
  cgst_amount,
  sgst_percent,
  sgst_amount,
  igst_percent,
  igst_amount,
  total_gst,
  total_amount,
  created_at
)
SELECT
  DATE(b.created_at) as transaction_date,
  'sales'::varchar as transaction_type,
  b.id as reference_id,
  b.bill_number as reference_number,
  'customer'::varchar as party_type,
  b.customer_name as party_name,
  NULL as party_gstin,
  ROUND((bi.total_amount / (1 + (COALESCE(b.tax_percent, 5) / 100)))::numeric, 2) as taxable_amount,
  (COALESCE(b.tax_percent, 5) / 2)::numeric as cgst_percent,
  ROUND(((bi.total_amount - (bi.total_amount / (1 + (COALESCE(b.tax_percent, 5) / 100)))) / 2)::numeric, 2) as cgst_amount,
  (COALESCE(b.tax_percent, 5) / 2)::numeric as sgst_percent,
  ROUND(((bi.total_amount - (bi.total_amount / (1 + (COALESCE(b.tax_percent, 5) / 100)))) / 2)::numeric, 2) as sgst_amount,
  0::numeric as igst_percent,
  0::numeric as igst_amount,
  ROUND((bi.total_amount - (bi.total_amount / (1 + (COALESCE(b.tax_percent, 5) / 100))))::numeric, 2) as total_gst,
  bi.total_amount as total_amount,
  NOW() as created_at
FROM billing b
JOIN billing_item bi ON b.id = bi.billing_id
LEFT JOIN pharmacy_gst_ledger existing ON existing.reference_id = b.id
WHERE b.bill_type IS NULL  -- Pharmacy bills
  AND existing.id IS NULL  -- Only insert if not already exists
  AND bi.medicine_id IS NOT NULL;  -- Only for medicine items, not external

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'GST ledger back-population completed. Added entries for existing pharmacy bills.';
END $$;
