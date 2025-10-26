# Pharmacy Module - Database Schema Reference

**Project:** HMS Annam  
**Module:** Pharmacy  
**Database:** Supabase PostgreSQL  
**Last Updated:** October 24, 2025

---

## Quick Reference: All Pharmacy Tables

| Table Name | Purpose | Records | Status |
|------------|---------|---------|--------|
| `medications` | Medicine master data | Active | ✅ Production |
| `stock_transactions` | Inventory ledger | Active | ✅ Production |
| `prescriptions` | Doctor prescriptions | Active | ✅ Production |
| `prescription_items` | Prescription line items | Active | ✅ Production |
| `prescription_dispensed` | Dispensing records | Active | ✅ Production |
| `prescription_dispensed_items` | Dispensed items | Active | ✅ Production |
| `pharmacy_bills` | Billing records | Active | ✅ Production |
| `pharmacy_bill_items` | Bill line items | Active | ✅ Production |
| `medicine_batches` | Batch tracking (optional) | Active | ✅ Optional |

---

## Detailed Schema

### 1. medications
**Purpose:** Master data for all medicines in the system  
**Type:** Core Reference Table  
**Relationships:** Referenced by stock_transactions, prescription_items, pharmacy_bill_items

```sql
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  manufacturer VARCHAR(255),
  category VARCHAR(100),
  dosage_form VARCHAR(50),
  strength VARCHAR(50),
  unit VARCHAR(20),
  total_stock INTEGER DEFAULT 0,
  available_stock INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 10,
  purchase_price DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  mrp DECIMAL(10, 2),
  prescription_required BOOLEAN DEFAULT FALSE,
  storage_conditions TEXT,
  side_effects TEXT,
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'discontinued')) DEFAULT 'active',
  location VARCHAR(255),
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_medications_code ON medications(medicine_code);
CREATE INDEX idx_medications_status ON medications(status);
CREATE INDEX idx_medications_category ON medications(category);
```

**Key Columns:**
- `medicine_code`: Unique identifier for quick lookup
- `total_stock`: Sum of all batches
- `available_stock`: After reservations/allocations
- `minimum_stock_level`: Triggers reorder alerts
- `prescription_required`: Rx-only medicines

---

### 2. stock_transactions
**Purpose:** Complete audit trail of all inventory movements  
**Type:** Transactional/Ledger Table  
**Relationships:** FK to medications, users, suppliers

```sql
CREATE TABLE stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID NOT NULL REFERENCES medications(id),
  transaction_type VARCHAR(20) CHECK (transaction_type IN 
    ('purchase', 'sale', 'adjustment', 'return', 'expired')) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  batch_number VARCHAR(50),
  expiry_date DATE,
  supplier_id UUID,
  notes TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  performed_by UUID REFERENCES users(id),
  transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_tx_medication ON stock_transactions(medication_id);
CREATE INDEX idx_stock_tx_type ON stock_transactions(transaction_type);
CREATE INDEX idx_stock_tx_batch ON stock_transactions(batch_number);
CREATE INDEX idx_stock_tx_date ON stock_transactions(transaction_date);
```

**Key Columns:**
- `transaction_type`: purchase/sale/adjustment/return/expired
- `quantity`: Signed (positive for purchase, negative for sale)
- `batch_number`: Links to specific batch
- `reference_id`: Links to prescription/bill
- `performed_by`: Audit trail - who did it

**Sample Transactions:**
- Purchase: +100 units at ₹5 each
- Sale: -10 units at ₹8 each
- Adjustment: -5 units (damaged)
- Return: +20 units (supplier return)
- Expired: -30 units (expiry)

---

### 3. prescriptions
**Purpose:** Doctor-issued prescriptions  
**Type:** Master Transaction Table  
**Relationships:** FK to patients, users (doctor)

```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id VARCHAR(50) UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  issue_date DATE NOT NULL,
  status VARCHAR(20) CHECK (status IN 
    ('pending', 'partial', 'complete', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_date ON prescriptions(issue_date);
```

**Key Columns:**
- `prescription_id`: Human-readable prescription number
- `status`: Tracks dispensing progress
- `issue_date`: When doctor issued it

---

### 4. prescription_items
**Purpose:** Individual medications in a prescription  
**Type:** Detail Transaction Table  
**Relationships:** FK to prescriptions, medications

```sql
CREATE TABLE prescription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  medication_id UUID NOT NULL REFERENCES medications(id),
  medication_name VARCHAR(255),
  quantity INTEGER NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(12, 2),
  status VARCHAR(20) CHECK (status IN 
    ('pending', 'dispensed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prescription_items_prescription ON prescription_items(prescription_id);
CREATE INDEX idx_prescription_items_medication ON prescription_items(medication_id);
CREATE INDEX idx_prescription_items_status ON prescription_items(status);
```

**Key Columns:**
- `dosage`: e.g., "500mg"
- `frequency`: e.g., "3 times daily"
- `duration`: e.g., "7 days"
- `status`: Tracks if dispensed

---

### 5. prescription_dispensed
**Purpose:** Records when prescriptions are dispensed  
**Type:** Master Transaction Table  
**Relationships:** FK to prescriptions, patients, users (pharmacist)

```sql
CREATE TABLE prescription_dispensed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  dispensed_by UUID NOT NULL REFERENCES users(id),
  dispensed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount DECIMAL(12, 2),
  payment_status VARCHAR(20) CHECK (payment_status IN 
    ('pending', 'paid', 'partial', 'refunded')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prescription_dispensed_patient ON prescription_dispensed(patient_id);
CREATE INDEX idx_prescription_dispensed_date ON prescription_dispensed(dispensed_at);
CREATE INDEX idx_prescription_dispensed_status ON prescription_dispensed(payment_status);
```

---

### 6. prescription_dispensed_items
**Purpose:** Individual items dispensed from a prescription  
**Type:** Detail Transaction Table  
**Relationships:** FK to prescription_dispensed, medications

```sql
CREATE TABLE prescription_dispensed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_dispensed_id UUID NOT NULL REFERENCES prescription_dispensed(id),
  medication_id UUID NOT NULL REFERENCES medications(id),
  quantity_dispensed INTEGER NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(12, 2),
  batch_number VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dispensed_items_dispensed ON prescription_dispensed_items(prescription_dispensed_id);
CREATE INDEX idx_dispensed_items_medication ON prescription_dispensed_items(medication_id);
```

---

### 7. pharmacy_bills
**Purpose:** Main billing records for pharmacy transactions  
**Type:** Master Transaction Table  
**Relationships:** FK to patients (nullable), users (created_by)

```sql
CREATE TABLE pharmacy_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id),
  customer_name VARCHAR(255),
  subtotal DECIMAL(12, 2),
  discount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2),
  tax_rate DECIMAL(5, 2),
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN 
    ('cash', 'card', 'insurance', 'online')) DEFAULT 'cash',
  payment_status VARCHAR(20) CHECK (payment_status IN 
    ('pending', 'paid', 'partial', 'refunded', 'completed')) DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id),
  bill_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pharmacy_bills_number ON pharmacy_bills(bill_number);
CREATE INDEX idx_pharmacy_bills_patient ON pharmacy_bills(patient_id);
CREATE INDEX idx_pharmacy_bills_date ON pharmacy_bills(bill_date);
CREATE INDEX idx_pharmacy_bills_status ON pharmacy_bills(payment_status);
```

**Key Columns:**
- `bill_number`: Unique bill identifier
- `patient_id`: NULL for walk-in customers
- `customer_name`: For walk-in customers
- `payment_method`: Multiple payment options
- `payment_status`: Tracks payment state

---

### 8. pharmacy_bill_items
**Purpose:** Individual items in a pharmacy bill  
**Type:** Detail Transaction Table  
**Relationships:** FK to pharmacy_bills, medications

```sql
CREATE TABLE pharmacy_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES pharmacy_bills(id),
  medicine_id UUID NOT NULL REFERENCES medications(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  batch_number VARCHAR(50),
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bill_items_bill ON pharmacy_bill_items(bill_id);
CREATE INDEX idx_bill_items_medicine ON pharmacy_bill_items(medicine_id);
CREATE INDEX idx_bill_items_batch ON pharmacy_bill_items(batch_number);
```

---

### 9. medicine_batches (Optional - Advanced Tracking)
**Purpose:** Detailed batch-level inventory tracking  
**Type:** Reference/Transactional Table  
**Relationships:** FK to medications, suppliers

```sql
CREATE TABLE medicine_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES medications(id),
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  current_quantity INTEGER NOT NULL,
  purchase_price DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  supplier_id UUID,
  status VARCHAR(20) CHECK (status IN 
    ('active', 'expired', 'low_stock')) DEFAULT 'active',
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_medicine_batches_medicine ON medicine_batches(medicine_id);
CREATE INDEX idx_medicine_batches_batch ON medicine_batches(batch_number);
CREATE INDEX idx_medicine_batches_expiry ON medicine_batches(expiry_date);
CREATE INDEX idx_medicine_batches_status ON medicine_batches(status);
```

---

## Data Flow Diagrams

### Billing Flow
```
Customer → pharmacy_bills (header)
         → pharmacy_bill_items (line items)
         → medications (reference)
         → stock_transactions (inventory update)
```

### Prescription Dispensing Flow
```
Doctor → prescriptions (header)
      → prescription_items (line items)
      → Pharmacist → prescription_dispensed (header)
                  → prescription_dispensed_items (line items)
                  → stock_transactions (inventory update)
```

### Inventory Management Flow
```
Supplier → stock_transactions (purchase)
        → medications (stock update)
        → medicine_batches (batch tracking)

Sales → stock_transactions (sale)
     → medications (stock update)
     → pharmacy_bills (billing)
```

---

## Key Relationships

### One-to-Many
- `medications` → `stock_transactions` (1 medicine has many transactions)
- `medications` → `prescription_items` (1 medicine in many prescriptions)
- `medications` → `pharmacy_bill_items` (1 medicine in many bills)
- `prescriptions` → `prescription_items` (1 prescription has many items)
- `pharmacy_bills` → `pharmacy_bill_items` (1 bill has many items)
- `prescription_dispensed` → `prescription_dispensed_items` (1 dispensing has many items)

### Many-to-One
- `stock_transactions` → `medications` (many transactions for 1 medicine)
- `stock_transactions` → `users` (many transactions by users)
- `prescriptions` → `patients` (many prescriptions for 1 patient)
- `prescriptions` → `users` (many prescriptions by 1 doctor)
- `pharmacy_bills` → `patients` (many bills for 1 patient)
- `pharmacy_bills` → `users` (many bills created by 1 pharmacist)

---

## Calculated/Derived Fields

### In medications table
- `total_stock` = SUM(medicine_batches.current_quantity) OR SUM(stock_transactions.quantity)
- `available_stock` = total_stock - reserved_quantity

### In pharmacy_bills table
- `subtotal` = SUM(pharmacy_bill_items.total_amount)
- `tax_amount` = subtotal × (tax_rate / 100)
- `total_amount` = subtotal - discount + tax_amount

### In prescriptions table
- Status changes based on prescription_items status

---

## Indexes for Performance

### High-Priority Indexes (Already Created)
```sql
-- Fast lookups
CREATE INDEX idx_medications_code ON medications(medicine_code);
CREATE INDEX idx_pharmacy_bills_number ON pharmacy_bills(bill_number);

-- Filtering
CREATE INDEX idx_medications_status ON medications(status);
CREATE INDEX idx_pharmacy_bills_status ON pharmacy_bills(payment_status);

-- Date-based queries
CREATE INDEX idx_stock_tx_date ON stock_transactions(transaction_date);
CREATE INDEX idx_pharmacy_bills_date ON pharmacy_bills(bill_date);

-- Relationships
CREATE INDEX idx_stock_tx_medication ON stock_transactions(medication_id);
CREATE INDEX idx_bill_items_bill ON pharmacy_bill_items(bill_id);
```

### Recommended Additional Indexes
```sql
-- For batch tracking
CREATE INDEX idx_stock_tx_batch ON stock_transactions(batch_number);
CREATE INDEX idx_medicine_batches_expiry ON medicine_batches(expiry_date);

-- For reporting
CREATE INDEX idx_pharmacy_bills_patient ON pharmacy_bills(patient_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
```

---

## Sample Queries

### Get Low Stock Medicines
```sql
SELECT * FROM medications 
WHERE available_stock <= minimum_stock_level 
AND status = 'active'
ORDER BY available_stock ASC;
```

### Get Today's Sales
```sql
SELECT 
  SUM(total_amount) as today_sales,
  COUNT(*) as bill_count,
  AVG(total_amount) as avg_bill
FROM pharmacy_bills
WHERE DATE(bill_date) = CURRENT_DATE
AND payment_status IN ('paid', 'completed');
```

### Get Batch Stock Stats
```sql
SELECT 
  batch_number,
  SUM(CASE WHEN transaction_type = 'purchase' THEN quantity ELSE 0 END) as purchased,
  SUM(CASE WHEN transaction_type = 'sale' THEN ABS(quantity) ELSE 0 END) as sold,
  SUM(quantity) as remaining
FROM stock_transactions
WHERE batch_number = 'BATCH001'
GROUP BY batch_number;
```

### Get Pending Prescriptions
```sql
SELECT 
  p.prescription_id,
  p.patient_id,
  pa.name as patient_name,
  u.name as doctor_name,
  COUNT(pi.id) as item_count,
  p.status
FROM prescriptions p
JOIN patients pa ON p.patient_id = pa.id
JOIN users u ON p.doctor_id = u.id
LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
WHERE p.status = 'pending'
GROUP BY p.id, pa.name, u.name;
```

---

## Backup & Recovery

### Critical Tables (Backup Priority: HIGH)
- `medications` - Master data
- `pharmacy_bills` - Financial records
- `stock_transactions` - Audit trail

### Important Tables (Backup Priority: MEDIUM)
- `prescriptions` - Clinical records
- `pharmacy_bill_items` - Transaction details
- `prescription_dispensed` - Dispensing records

### Reference Tables (Backup Priority: LOW)
- `medicine_batches` - Can be reconstructed from stock_transactions

---

## Migration History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 2025 | Initial schema with core tables |
| 1.1 | Oct 2025 | Added medicine_batches table |
| 1.2 | Oct 2025 | Added indexes for performance |

---

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for consistency
- All monetary values use `DECIMAL` for accuracy
- Foreign keys use `ON DELETE RESTRICT` to prevent accidental data loss
- Soft deletes not implemented; use `status` field for logical deletion
- Audit trail maintained via `performed_by` and `created_at` fields

---

**Document Version:** 1.0  
**Last Updated:** October 24, 2025  
**Maintained By:** Development Team
