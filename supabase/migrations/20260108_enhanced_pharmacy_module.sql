-- =====================================================
-- ENHANCED PHARMACY MODULE - DATABASE MIGRATION
-- Created: January 8, 2026
-- Features: Drug Purchase, Purchase Return, Department Drug Issue,
--           Drug Sales, Sales Return, Drug Broken, Reports, Cash Collection
-- =====================================================

-- =====================================================
-- 1. SUPPLIERS TABLE (Master data for drug purchases)
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  gstin VARCHAR(20),
  drug_license_no VARCHAR(50),
  payment_terms VARCHAR(100),
  credit_days INTEGER DEFAULT 30,
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'blacklisted')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

-- =====================================================
-- 2. DRUG PURCHASES (Purchase Orders/GRN)
-- =====================================================
CREATE TABLE IF NOT EXISTS drug_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  invoice_number VARCHAR(100),
  invoice_date DATE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  cgst_amount DECIMAL(10, 2) DEFAULT 0,
  sgst_amount DECIMAL(10, 2) DEFAULT 0,
  igst_amount DECIMAL(10, 2) DEFAULT 0,
  total_gst DECIMAL(10, 2) DEFAULT 0,
  other_charges DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'partial', 'paid')) DEFAULT 'pending',
  payment_mode VARCHAR(20) CHECK (payment_mode IN ('cash', 'credit', 'cheque', 'online', 'upi')) DEFAULT 'credit',
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  due_date DATE,
  remarks TEXT,
  received_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  status VARCHAR(20) CHECK (status IN ('draft', 'received', 'verified', 'cancelled')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drug_purchases_number ON drug_purchases(purchase_number);
CREATE INDEX IF NOT EXISTS idx_drug_purchases_supplier ON drug_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_drug_purchases_date ON drug_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_drug_purchases_status ON drug_purchases(status);

-- =====================================================
-- 3. DRUG PURCHASE ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS drug_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES drug_purchases(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  batch_number VARCHAR(50) NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  quantity INTEGER NOT NULL,
  free_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2) NOT NULL,
  mrp DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  gst_percent DECIMAL(5, 2) DEFAULT 0,
  cgst_percent DECIMAL(5, 2) DEFAULT 0,
  sgst_percent DECIMAL(5, 2) DEFAULT 0,
  igst_percent DECIMAL(5, 2) DEFAULT 0,
  gst_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  hsn_code VARCHAR(20),
  rack_location VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drug_purchase_items_purchase ON drug_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_drug_purchase_items_medication ON drug_purchase_items(medication_id);
CREATE INDEX IF NOT EXISTS idx_drug_purchase_items_batch ON drug_purchase_items(batch_number);

-- =====================================================
-- 4. PURCHASE RETURNS
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_id UUID REFERENCES drug_purchases(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  reason VARCHAR(100) CHECK (reason IN ('expired', 'damaged', 'quality_issue', 'wrong_item', 'excess_stock', 'other')) NOT NULL,
  reason_details TEXT,
  credit_note_number VARCHAR(100),
  credit_note_date DATE,
  status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'approved', 'completed', 'rejected')) DEFAULT 'draft',
  processed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_number ON purchase_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_date ON purchase_returns(return_date);

-- =====================================================
-- 5. PURCHASE RETURN ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  batch_number VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  gst_percent DECIMAL(5, 2) DEFAULT 0,
  gst_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return ON purchase_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_medication ON purchase_return_items(medication_id);

-- =====================================================
-- 6. DEPARTMENT DRUG ISSUES
-- =====================================================
CREATE TABLE IF NOT EXISTS department_drug_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number VARCHAR(50) UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id),
  department_name VARCHAR(100) NOT NULL,
  requested_by UUID REFERENCES users(id),
  requester_name VARCHAR(255),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_time TIME DEFAULT CURRENT_TIME,
  purpose VARCHAR(255),
  total_items INTEGER DEFAULT 0,
  total_value DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'issued', 'partial', 'rejected', 'returned')) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  issued_by UUID REFERENCES users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_drug_issues_number ON department_drug_issues(issue_number);
CREATE INDEX IF NOT EXISTS idx_dept_drug_issues_dept ON department_drug_issues(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_drug_issues_date ON department_drug_issues(issue_date);
CREATE INDEX IF NOT EXISTS idx_dept_drug_issues_status ON department_drug_issues(status);

-- =====================================================
-- 7. DEPARTMENT DRUG ISSUE ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS department_drug_issue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES department_drug_issues(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  medication_name VARCHAR(255),
  batch_number VARCHAR(50),
  expiry_date DATE,
  requested_quantity INTEGER NOT NULL,
  issued_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  status VARCHAR(20) CHECK (status IN ('pending', 'issued', 'partial', 'rejected')) DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_issue_items_issue ON department_drug_issue_items(issue_id);
CREATE INDEX IF NOT EXISTS idx_dept_issue_items_medication ON department_drug_issue_items(medication_id);

-- =====================================================
-- 8. SALES RETURNS (Customer Returns)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(50) UNIQUE NOT NULL,
  original_bill_id UUID REFERENCES billing(id),
  original_bill_number VARCHAR(50),
  patient_id UUID REFERENCES patients(id),
  customer_name VARCHAR(255),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_time TIME DEFAULT CURRENT_TIME,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  refund_mode VARCHAR(20) CHECK (refund_mode IN ('cash', 'credit_note', 'bank_transfer', 'adjust_next_bill')) DEFAULT 'cash',
  refund_status VARCHAR(20) CHECK (refund_status IN ('pending', 'processed', 'completed')) DEFAULT 'pending',
  reason VARCHAR(100) CHECK (reason IN ('wrong_medicine', 'excess_quantity', 'expired', 'damaged', 'adverse_reaction', 'doctor_changed', 'other')) NOT NULL,
  reason_details TEXT,
  processed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status VARCHAR(20) CHECK (status IN ('draft', 'submitted', 'approved', 'completed', 'rejected')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_number ON sales_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_sales_returns_bill ON sales_returns(original_bill_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_patient ON sales_returns(patient_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(return_date);

-- =====================================================
-- 9. SALES RETURN ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  medication_name VARCHAR(255),
  batch_number VARCHAR(50),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  gst_percent DECIMAL(5, 2) DEFAULT 0,
  gst_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  restock_status VARCHAR(20) CHECK (restock_status IN ('pending', 'restocked', 'disposed')) DEFAULT 'pending',
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_return_items_return ON sales_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_medication ON sales_return_items(medication_id);

-- =====================================================
-- 10. DRUG BROKEN/DAMAGED RECORDS
-- =====================================================
CREATE TABLE IF NOT EXISTS drug_broken_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_number VARCHAR(50) UNIQUE NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  medication_name VARCHAR(255),
  batch_number VARCHAR(50) NOT NULL,
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2),
  total_loss DECIMAL(12, 2),
  damage_type VARCHAR(50) CHECK (damage_type IN ('broken', 'leaked', 'contaminated', 'packaging_damaged', 'temperature_damage', 'other')) NOT NULL,
  damage_description TEXT,
  location VARCHAR(100),
  discovered_by UUID REFERENCES users(id),
  discoverer_name VARCHAR(255),
  verified_by UUID REFERENCES users(id),
  disposal_method VARCHAR(50) CHECK (disposal_method IN ('disposed', 'returned_to_supplier', 'pending', 'insurance_claim')),
  disposal_date DATE,
  insurance_claim_number VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('reported', 'verified', 'disposed', 'claimed')) DEFAULT 'reported',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drug_broken_number ON drug_broken_records(record_number);
CREATE INDEX IF NOT EXISTS idx_drug_broken_medication ON drug_broken_records(medication_id);
CREATE INDEX IF NOT EXISTS idx_drug_broken_date ON drug_broken_records(record_date);
CREATE INDEX IF NOT EXISTS idx_drug_broken_batch ON drug_broken_records(batch_number);

-- =====================================================
-- 11. CASH COLLECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS pharmacy_cash_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_number VARCHAR(50) UNIQUE NOT NULL,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift VARCHAR(20) CHECK (shift IN ('morning', 'afternoon', 'night', 'general')) DEFAULT 'general',
  collected_by UUID NOT NULL REFERENCES users(id),
  collector_name VARCHAR(255),
  
  -- Opening balance
  opening_cash DECIMAL(12, 2) DEFAULT 0,
  
  -- Collections by payment mode
  cash_sales DECIMAL(12, 2) DEFAULT 0,
  card_collections DECIMAL(12, 2) DEFAULT 0,
  upi_collections DECIMAL(12, 2) DEFAULT 0,
  insurance_collections DECIMAL(12, 2) DEFAULT 0,
  credit_collections DECIMAL(12, 2) DEFAULT 0,
  
  -- Refunds/Returns
  cash_refunds DECIMAL(12, 2) DEFAULT 0,
  
  -- Summary
  total_collections DECIMAL(12, 2) DEFAULT 0,
  total_bills INTEGER DEFAULT 0,
  total_returns INTEGER DEFAULT 0,
  
  -- Closing
  expected_cash DECIMAL(12, 2) DEFAULT 0,
  actual_cash DECIMAL(12, 2),
  cash_difference DECIMAL(12, 2) DEFAULT 0,
  
  -- Denominations (stored as JSON)
  denominations JSONB,
  
  -- Handover
  handover_to UUID REFERENCES users(id),
  handover_time TIMESTAMP WITH TIME ZONE,
  
  status VARCHAR(20) CHECK (status IN ('open', 'closed', 'verified', 'discrepancy')) DEFAULT 'open',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_collections_number ON pharmacy_cash_collections(collection_number);
CREATE INDEX IF NOT EXISTS idx_cash_collections_date ON pharmacy_cash_collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_cash_collections_collector ON pharmacy_cash_collections(collected_by);
CREATE INDEX IF NOT EXISTS idx_cash_collections_status ON pharmacy_cash_collections(status);

-- =====================================================
-- 12. GST LEDGER (For GST Reports)
-- =====================================================
CREATE TABLE IF NOT EXISTS pharmacy_gst_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('sale', 'purchase', 'sale_return', 'purchase_return')) NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  reference_number VARCHAR(100),
  party_name VARCHAR(255),
  party_gstin VARCHAR(20),
  hsn_code VARCHAR(20),
  taxable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cgst_rate DECIMAL(5, 2) DEFAULT 0,
  cgst_amount DECIMAL(10, 2) DEFAULT 0,
  sgst_rate DECIMAL(5, 2) DEFAULT 0,
  sgst_amount DECIMAL(10, 2) DEFAULT 0,
  igst_rate DECIMAL(5, 2) DEFAULT 0,
  igst_amount DECIMAL(10, 2) DEFAULT 0,
  total_gst DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gst_return_period VARCHAR(20),
  filed_status VARCHAR(20) CHECK (filed_status IN ('pending', 'filed', 'amended')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gst_ledger_date ON pharmacy_gst_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_type ON pharmacy_gst_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_reference ON pharmacy_gst_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_period ON pharmacy_gst_ledger(gst_return_period);

-- =====================================================
-- 13. ADD GST FIELDS TO EXISTING TABLES
-- =====================================================

-- Add GST fields to medications if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'hsn_code') THEN
    ALTER TABLE medications ADD COLUMN hsn_code VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'gst_percent') THEN
    ALTER TABLE medications ADD COLUMN gst_percent DECIMAL(5,2) DEFAULT 12;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'cgst_percent') THEN
    ALTER TABLE medications ADD COLUMN cgst_percent DECIMAL(5,2) DEFAULT 6;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medications' AND column_name = 'sgst_percent') THEN
    ALTER TABLE medications ADD COLUMN sgst_percent DECIMAL(5,2) DEFAULT 6;
  END IF;
END $$;

-- Add GST fields to billing if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing' AND column_name = 'cgst_amount') THEN
    ALTER TABLE billing ADD COLUMN cgst_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing' AND column_name = 'sgst_amount') THEN
    ALTER TABLE billing ADD COLUMN sgst_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing' AND column_name = 'igst_amount') THEN
    ALTER TABLE billing ADD COLUMN igst_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing' AND column_name = 'customer_gstin') THEN
    ALTER TABLE billing ADD COLUMN customer_gstin VARCHAR(20);
  END IF;
END $$;

-- =====================================================
-- 14. SEQUENCE GENERATORS FOR DOCUMENT NUMBERS
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS purchase_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS purchase_return_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS dept_issue_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sales_return_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS drug_broken_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS cash_collection_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS supplier_code_seq START 1;

-- =====================================================
-- 15. HELPER FUNCTIONS
-- =====================================================

-- Function to generate purchase number
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
BEGIN
  new_number := 'PUR-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('purchase_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate purchase return number
CREATE OR REPLACE FUNCTION generate_purchase_return_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
BEGIN
  new_number := 'PR-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('purchase_return_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate department issue number
CREATE OR REPLACE FUNCTION generate_dept_issue_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
BEGIN
  new_number := 'DI-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('dept_issue_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate sales return number
CREATE OR REPLACE FUNCTION generate_sales_return_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
BEGIN
  new_number := 'SR-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('sales_return_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate drug broken record number
CREATE OR REPLACE FUNCTION generate_drug_broken_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
BEGIN
  new_number := 'DB-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('drug_broken_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate cash collection number
CREATE OR REPLACE FUNCTION generate_cash_collection_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
BEGIN
  new_number := 'CC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('cash_collection_number_seq')::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate supplier code
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_code VARCHAR(50);
BEGIN
  new_code := 'SUP-' || LPAD(nextval('supplier_code_seq')::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 16. TRIGGERS FOR STOCK UPDATES
-- =====================================================

-- Trigger function to update stock on purchase
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update medication stock
    UPDATE medications
    SET available_stock = COALESCE(available_stock, 0) + NEW.quantity + COALESCE(NEW.free_quantity, 0),
        total_stock = COALESCE(total_stock, 0) + NEW.quantity + COALESCE(NEW.free_quantity, 0),
        updated_at = NOW()
    WHERE id = NEW.medication_id;
    
    -- Create stock transaction record
    INSERT INTO stock_transactions (
      medication_id, transaction_type, quantity, unit_price,
      batch_number, expiry_date, notes, transaction_date
    ) VALUES (
      NEW.medication_id, 'purchase', NEW.quantity + COALESCE(NEW.free_quantity, 0),
      NEW.unit_price, NEW.batch_number, NEW.expiry_date,
      'Purchase: ' || (SELECT purchase_number FROM drug_purchases WHERE id = NEW.purchase_id),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trg_update_stock_on_purchase ON drug_purchase_items;
CREATE TRIGGER trg_update_stock_on_purchase
AFTER INSERT ON drug_purchase_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_purchase();

-- Trigger function to update stock on department issue
CREATE OR REPLACE FUNCTION update_stock_on_dept_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'issued' AND OLD.status != 'issued' THEN
    -- Reduce medication stock
    UPDATE medications
    SET available_stock = GREATEST(0, COALESCE(available_stock, 0) - NEW.issued_quantity),
        updated_at = NOW()
    WHERE id = NEW.medication_id;
    
    -- Create stock transaction record
    INSERT INTO stock_transactions (
      medication_id, transaction_type, quantity, unit_price,
      batch_number, notes, transaction_date
    ) VALUES (
      NEW.medication_id, 'adjustment', -NEW.issued_quantity,
      NEW.unit_price, NEW.batch_number,
      'Department Issue: ' || (SELECT issue_number FROM department_drug_issues WHERE id = NEW.issue_id),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock_on_dept_issue ON department_drug_issue_items;
CREATE TRIGGER trg_update_stock_on_dept_issue
AFTER UPDATE ON department_drug_issue_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_dept_issue();

-- Trigger function to update stock on sales return
CREATE OR REPLACE FUNCTION update_stock_on_sales_return()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.restock_status = 'restocked' AND OLD.restock_status != 'restocked' THEN
    -- Add back to medication stock
    UPDATE medications
    SET available_stock = COALESCE(available_stock, 0) + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.medication_id;
    
    -- Create stock transaction record
    INSERT INTO stock_transactions (
      medication_id, transaction_type, quantity, unit_price,
      batch_number, notes, transaction_date
    ) VALUES (
      NEW.medication_id, 'return', NEW.quantity,
      NEW.unit_price, NEW.batch_number,
      'Sales Return: ' || (SELECT return_number FROM sales_returns WHERE id = NEW.return_id),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock_on_sales_return ON sales_return_items;
CREATE TRIGGER trg_update_stock_on_sales_return
AFTER UPDATE ON sales_return_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_sales_return();

-- Trigger function to update stock on drug broken
CREATE OR REPLACE FUNCTION update_stock_on_drug_broken()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Reduce medication stock
    UPDATE medications
    SET available_stock = GREATEST(0, COALESCE(available_stock, 0) - NEW.quantity),
        updated_at = NOW()
    WHERE id = NEW.medication_id;
    
    -- Create stock transaction record
    INSERT INTO stock_transactions (
      medication_id, transaction_type, quantity, unit_price,
      batch_number, notes, transaction_date
    ) VALUES (
      NEW.medication_id, 'adjustment', -NEW.quantity,
      NEW.unit_price, NEW.batch_number,
      'Drug Broken/Damaged: ' || NEW.record_number || ' - ' || NEW.damage_type,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_stock_on_drug_broken ON drug_broken_records;
CREATE TRIGGER trg_update_stock_on_drug_broken
AFTER INSERT ON drug_broken_records
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_drug_broken();

-- =====================================================
-- 17. RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_drug_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_drug_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_broken_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_gst_ledger ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON suppliers FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON drug_purchases FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON drug_purchase_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON purchase_returns FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON purchase_return_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON department_drug_issues FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON department_drug_issue_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON sales_returns FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON sales_return_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON drug_broken_records FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON pharmacy_cash_collections FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all for authenticated users" ON pharmacy_gst_ledger FOR ALL USING (true);

-- =====================================================
-- 18. INSERT SAMPLE SUPPLIERS
-- =====================================================

INSERT INTO suppliers (supplier_code, name, contact_person, phone, email, city, state, gstin, drug_license_no, status)
VALUES 
  ('SUP-0001', 'ABC Pharmaceuticals', 'Rajesh Kumar', '9876543210', 'abc@pharma.com', 'Chennai', 'Tamil Nadu', '33AABCU9603R1ZM', 'TN/DL/2024/1234', 'active'),
  ('SUP-0002', 'MediSupply India', 'Priya Sharma', '9876543211', 'medisupply@gmail.com', 'Mumbai', 'Maharashtra', '27AABCU9603R1ZM', 'MH/DL/2024/5678', 'active'),
  ('SUP-0003', 'HealthCare Distributors', 'Arun Menon', '9876543212', 'hcd@health.com', 'Bangalore', 'Karnataka', '29AABCU9603R1ZM', 'KA/DL/2024/9012', 'active')
ON CONFLICT (supplier_code) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
