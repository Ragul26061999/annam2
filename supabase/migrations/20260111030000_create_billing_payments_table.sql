-- Create billing_payments table for universal payment service
-- This table is used by the universalPaymentService.ts to track payments

CREATE TABLE IF NOT EXISTS billing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    method VARCHAR(20) NOT NULL CHECK (method IN ('cash', 'card', 'upi', 'insurance', 'cheque')),
    reference VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    received_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_payments_billing_id ON billing_payments(billing_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_paid_at ON billing_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_billing_payments_received_by ON billing_payments(received_by);

-- Create updated_at trigger
CREATE TRIGGER update_billing_payments_updated_at 
    BEFORE UPDATE ON billing_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policy (if needed)
-- ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
