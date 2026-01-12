-- Create IP Payment Receipts Table
CREATE TABLE IF NOT EXISTS ip_payment_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('cash', 'card', 'upi', 'net_banking', 'cheque', 'insurance')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  reference_number VARCHAR(100),
  notes TEXT,
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_ip_payment_receipts_bed_allocation ON ip_payment_receipts(bed_allocation_id);
CREATE INDEX idx_ip_payment_receipts_patient ON ip_payment_receipts(patient_id);
CREATE INDEX idx_ip_payment_receipts_payment_date ON ip_payment_receipts(payment_date);
CREATE INDEX idx_ip_payment_receipts_payment_type ON ip_payment_receipts(payment_type);

-- Add RLS policies
ALTER TABLE ip_payment_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view payment receipts
CREATE POLICY "Allow authenticated users to view payment receipts"
  ON ip_payment_receipts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert payment receipts
CREATE POLICY "Allow authenticated users to insert payment receipts"
  ON ip_payment_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update payment receipts
CREATE POLICY "Allow authenticated users to update payment receipts"
  ON ip_payment_receipts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE ip_payment_receipts IS 'Stores payment receipt records for inpatient billing with support for split payments';
