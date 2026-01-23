-- =====================================================
-- FLEXIBLE IP BILLING SYSTEM
-- Date: 2026-01-23
-- Purpose: Bill-wise payment allocation, advance tracking, discounts
-- =====================================================

-- =====================================================
-- 1. IP ADVANCES TABLE
-- Track all advances received from patient during IP stay
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Advance details
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('cash', 'card', 'upi', 'net_banking', 'cheque', 'insurance')),
    reference_number VARCHAR(100),
    notes TEXT,
    advance_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Tracking how much of this advance is used
    used_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (used_amount >= 0),
    available_amount NUMERIC(12,2) GENERATED ALWAYS AS (amount - used_amount) STORED,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fully_used', 'refunded', 'cancelled')),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_advances_bed_allocation ON ip_advances(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_ip_advances_patient ON ip_advances(patient_id);
CREATE INDEX IF NOT EXISTS idx_ip_advances_status ON ip_advances(status);

COMMENT ON TABLE ip_advances IS 'Tracks all advance payments received from IP patients with usage tracking';

-- =====================================================
-- 2. IP BILL ITEMS TABLE
-- Unified bill line items from all sources (lab, pharmacy, surgery, bed, etc.)
-- This is the "single source of truth" for what is being billed
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Bill item categorization
    bill_category VARCHAR(50) NOT NULL CHECK (bill_category IN (
        'bed_charges',
        'doctor_consultation',
        'doctor_services',
        'surgery',
        'pharmacy',
        'lab',
        'radiology',
        'nursing',
        'equipment',
        'consumables',
        'other'
    )),
    
    -- Source reference (links back to original table)
    source_table VARCHAR(100), -- e.g., 'ip_surgery_charges', 'lab_test_orders', 'pharmacy_bills'
    source_id UUID,            -- ID in the source table
    
    -- Item details
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    gross_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- Discount (per item)
    discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC(12,2) DEFAULT 0,
    discount_reason TEXT,
    discount_approved_by UUID REFERENCES users(id),
    
    -- Net amount after discount
    net_amount NUMERIC(12,2) GENERATED ALWAYS AS (
        (quantity * unit_price) - COALESCE(discount_amount, 0)
    ) STORED,
    
    -- Payment tracking
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    pending_amount NUMERIC(12,2) GENERATED ALWAYS AS (
        GREATEST(0, (quantity * unit_price) - COALESCE(discount_amount, 0) - paid_amount)
    ) STORED,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'waived', 'cancelled')),
    
    -- Dates
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Acknowledgement (for billing verification)
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    -- Edit tracking
    edited BOOLEAN DEFAULT FALSE,
    last_edited_by UUID REFERENCES users(id),
    last_edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_bill_items_bed_allocation ON ip_bill_items(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_ip_bill_items_patient ON ip_bill_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_ip_bill_items_category ON ip_bill_items(bill_category);
CREATE INDEX IF NOT EXISTS idx_ip_bill_items_source ON ip_bill_items(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_ip_bill_items_payment_status ON ip_bill_items(payment_status);

COMMENT ON TABLE ip_bill_items IS 'Unified bill line items for IP billing with per-item discount and payment tracking';

-- =====================================================
-- 3. IP BILL PAYMENTS TABLE
-- Bill-wise payment allocation
-- Each payment can be allocated to specific bill items
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('cash', 'card', 'upi', 'net_banking', 'cheque', 'insurance', 'advance')),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    reference_number VARCHAR(100),
    notes TEXT,
    
    -- If payment_type = 'advance', link to which advance was used
    advance_id UUID REFERENCES ip_advances(id),
    
    -- Receipt info
    receipt_number VARCHAR(50),
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_bill_payments_bed_allocation ON ip_bill_payments(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_ip_bill_payments_patient ON ip_bill_payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_ip_bill_payments_date ON ip_bill_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_ip_bill_payments_advance ON ip_bill_payments(advance_id);

COMMENT ON TABLE ip_bill_payments IS 'Payment transactions for IP billing with support for advance usage';

-- =====================================================
-- 4. IP BILL PAYMENT ALLOCATIONS TABLE
-- Links payments to specific bill items
-- One payment can be split across multiple bill items
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_bill_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES ip_bill_payments(id) ON DELETE CASCADE,
    bill_item_id UUID NOT NULL REFERENCES ip_bill_items(id) ON DELETE CASCADE,
    
    -- Amount allocated to this bill item from this payment
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_bill_payment_allocations_payment ON ip_bill_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_ip_bill_payment_allocations_bill_item ON ip_bill_payment_allocations(bill_item_id);

COMMENT ON TABLE ip_bill_payment_allocations IS 'Links payments to specific bill items for bill-wise payment tracking';

-- =====================================================
-- 5. IP BILL DISCOUNTS TABLE (Optional - for discount history)
-- Track discount changes/approvals
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_bill_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    bill_item_id UUID REFERENCES ip_bill_items(id) ON DELETE CASCADE, -- NULL for overall discount
    
    -- Discount details
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL, -- Calculated amount
    reason TEXT,
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_bill_discounts_bed_allocation ON ip_bill_discounts(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_ip_bill_discounts_bill_item ON ip_bill_discounts(bill_item_id);

COMMENT ON TABLE ip_bill_discounts IS 'Tracks discount history and approvals for IP billing';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update ip_bill_items.paid_amount when payment allocation is made
CREATE OR REPLACE FUNCTION update_bill_item_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ip_bill_items
        SET paid_amount = paid_amount + NEW.allocated_amount,
            payment_status = CASE
                WHEN paid_amount + NEW.allocated_amount >= net_amount THEN 'paid'
                WHEN paid_amount + NEW.allocated_amount > 0 THEN 'partial'
                ELSE 'pending'
            END,
            updated_at = NOW()
        WHERE id = NEW.bill_item_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ip_bill_items
        SET paid_amount = paid_amount - OLD.allocated_amount,
            payment_status = CASE
                WHEN paid_amount - OLD.allocated_amount >= net_amount THEN 'paid'
                WHEN paid_amount - OLD.allocated_amount > 0 THEN 'partial'
                ELSE 'pending'
            END,
            updated_at = NOW()
        WHERE id = OLD.bill_item_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bill_item_paid_amount ON ip_bill_payment_allocations;
CREATE TRIGGER trigger_update_bill_item_paid_amount
    AFTER INSERT OR DELETE ON ip_bill_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_item_paid_amount();

-- Update ip_advances.used_amount when advance is used for payment
CREATE OR REPLACE FUNCTION update_advance_used_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_type = 'advance' AND NEW.advance_id IS NOT NULL THEN
        UPDATE ip_advances
        SET used_amount = used_amount + NEW.total_amount,
            status = CASE
                WHEN used_amount + NEW.total_amount >= amount THEN 'fully_used'
                ELSE 'active'
            END,
            updated_at = NOW()
        WHERE id = NEW.advance_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_advance_used_amount ON ip_bill_payments;
CREATE TRIGGER trigger_update_advance_used_amount
    AFTER INSERT ON ip_bill_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_advance_used_amount();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_ip_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ip_advances_updated_at ON ip_advances;
CREATE TRIGGER update_ip_advances_updated_at
    BEFORE UPDATE ON ip_advances
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_billing_updated_at();

DROP TRIGGER IF EXISTS update_ip_bill_items_updated_at ON ip_bill_items;
CREATE TRIGGER update_ip_bill_items_updated_at
    BEFORE UPDATE ON ip_bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_billing_updated_at();

DROP TRIGGER IF EXISTS update_ip_bill_payments_updated_at ON ip_bill_payments;
CREATE TRIGGER update_ip_bill_payments_updated_at
    BEFORE UPDATE ON ip_bill_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_ip_billing_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE ip_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_bill_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_bill_discounts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Enable all for authenticated" ON ip_advances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON ip_bill_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON ip_bill_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON ip_bill_payment_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON ip_bill_discounts FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTION: Generate receipt number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_ip_receipt_number()
RETURNS TEXT AS $$
DECLARE
    year_short TEXT;
    next_seq INTEGER;
    receipt_num TEXT;
BEGIN
    year_short := TO_CHAR(NOW(), 'YY');
    
    SELECT COALESCE(MAX(
        CASE 
            WHEN receipt_number ~ ('^IPR' || year_short || '[0-9]+$')
            THEN CAST(SUBSTRING(receipt_number FROM 6) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_seq
    FROM ip_bill_payments
    WHERE receipt_number LIKE 'IPR' || year_short || '%';
    
    receipt_num := 'IPR' || year_short || LPAD(next_seq::TEXT, 5, '0');
    RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW: IP Billing Summary
-- =====================================================
CREATE OR REPLACE VIEW ip_billing_summary AS
SELECT 
    ba.id AS bed_allocation_id,
    ba.patient_id,
    p.name AS patient_name,
    ba.ip_number,
    ba.admission_date,
    ba.discharge_date,
    
    -- Totals by category
    COALESCE(SUM(CASE WHEN bi.bill_category = 'bed_charges' THEN bi.net_amount ELSE 0 END), 0) AS bed_charges_total,
    COALESCE(SUM(CASE WHEN bi.bill_category = 'doctor_consultation' THEN bi.net_amount ELSE 0 END), 0) AS doctor_consultation_total,
    COALESCE(SUM(CASE WHEN bi.bill_category = 'surgery' THEN bi.net_amount ELSE 0 END), 0) AS surgery_total,
    COALESCE(SUM(CASE WHEN bi.bill_category = 'pharmacy' THEN bi.net_amount ELSE 0 END), 0) AS pharmacy_total,
    COALESCE(SUM(CASE WHEN bi.bill_category = 'lab' THEN bi.net_amount ELSE 0 END), 0) AS lab_total,
    COALESCE(SUM(CASE WHEN bi.bill_category = 'radiology' THEN bi.net_amount ELSE 0 END), 0) AS radiology_total,
    COALESCE(SUM(CASE WHEN bi.bill_category = 'other' THEN bi.net_amount ELSE 0 END), 0) AS other_total,
    
    -- Overall totals
    COALESCE(SUM(bi.gross_amount), 0) AS gross_total,
    COALESCE(SUM(bi.discount_amount), 0) AS discount_total,
    COALESCE(SUM(bi.net_amount), 0) AS net_total,
    COALESCE(SUM(bi.paid_amount), 0) AS paid_total,
    COALESCE(SUM(bi.pending_amount), 0) AS pending_total,
    
    -- Advance info
    COALESCE((SELECT SUM(amount) FROM ip_advances WHERE bed_allocation_id = ba.id AND status != 'cancelled'), 0) AS total_advance,
    COALESCE((SELECT SUM(available_amount) FROM ip_advances WHERE bed_allocation_id = ba.id AND status = 'active'), 0) AS available_advance
    
FROM bed_allocations ba
JOIN patients p ON ba.patient_id = p.id
LEFT JOIN ip_bill_items bi ON ba.id = bi.bed_allocation_id AND bi.payment_status != 'cancelled'
GROUP BY ba.id, ba.patient_id, p.name, ba.ip_number, ba.admission_date, ba.discharge_date;

COMMENT ON VIEW ip_billing_summary IS 'Summary view of IP billing with category-wise and overall totals';
