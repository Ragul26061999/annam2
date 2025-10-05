# Paracetamol (Acetaminophen) – Inventory Detail & Error Fix Guide

This document explains how **Paracetamol 500mg** inventory is calculated, where the errors exist in the current setup, and provides **fixes with ready-to-use SQL/trigger snippets**.  
Use this as a **developer runbook** to reconcile stock, patch issues, and standardize logic across batch-first and ledger-first models.

---

## 0) Quick Glossary
- Example batch numbers: `PAR001`, `PAR002`.  
- Replace with actual batch numbers in production.  
- Canonical DB objects:
  - **Batch-first model**: `medicines` + `medicine_batches`  
  - **Ledger-first model**: `medications` + `stock_transactions`

---

## 1) Errors & Fixes

### 1. Dual Sources of Truth
- **Issue:** Remaining stock = batch-first, monthly KPIs = ledger. Leads to drift if purchases are not logged in ledger.  
- **Fix:** Pick one canonical model. If using **batch-first**, still log every purchase/sale/return/expired in `stock_transactions`.

---

### 2. `total_stock` vs `available_stock` Ambiguity
- **Issue:** Both described as sums with unclear filters.  
- **Fix:**  
  - `total_stock` = all batches.  
  - `available_stock` = active + unexpired batches only.

---

### 3. Expired/Inactive Batches Can Be Sold
- **Issue:** `reduce_batch_stock()` only checks for negatives.  
- **Fix:** Add `status='active' AND expiry_date > now()` check before decrement.

---

### 4. Timezone Inconsistency
- **Issue:** Monthly queries use `CURRENT_DATE`, which ignores IST (Asia/Kolkata).  
- **Fix:** Compute month bounds in IST or pass explicit month start/end timestamps.

---

### 5. `getBatchStockStats` Fallback is Wrong
- **Issue:** Says fallback = same `current_quantity`.  
- **Fix:** Remove or define fallback = recompute from ledger deltas.

---

### 6. Bill Item Denormalization
- **Issue:** `pharmacy_bill_items` stores `batch_id` **and** `batch_number`/`expiry_date` → drift risk.  
- **Fix:** Keep only `batch_id`. If snapshotting, make immutable.

---

### 7. Missing Integrity Constraints
```sql
ALTER TABLE medicine_batches
  ADD CONSTRAINT uq_batches_med_batch UNIQUE (medicine_id, batch_number),
  ADD CONSTRAINT ck_batches_qty CHECK (current_quantity >= 0);

ALTER TABLE pharmacy_bill_items
  ADD CONSTRAINT fk_pbi_batch FOREIGN KEY (batch_id) REFERENCES medicine_batches(id);
```

---

### 8. Trigger Coverage
- **Issue:** `update_medicine_stock()` may not fire on `status`/`expiry_date` updates.  
- **Fix:** Ensure trigger runs on INSERT/UPDATE/DELETE for `current_quantity`, `status`, `expiry_date`.

---

### 9. Race Conditions
- **Issue:** `createPharmacyBill` writes to both batch and ledger separately.  
- **Fix:** Wrap entire bill creation in **one DB transaction** with row locks.

---

### 10. Ledger Sign Discipline
```sql
ALTER TABLE stock_transactions
  ADD CONSTRAINT ck_txn_sign CHECK (
    (transaction_type='purchase' AND quantity>0) OR
    (transaction_type='sale'     AND quantity<0) OR
    (transaction_type='return'   AND quantity>0) OR
    (transaction_type='expired'  AND quantity<0) OR
    (transaction_type='adjustment')
  );
```

---

### 11. Expiry Handling
- **Issue:** Expiry not auto-applied.  
- **Fix:** Compute availability using filters, or run daily cron to set expired.

---

### 12. Indexes for Performance
```sql
CREATE INDEX ix_batches_med ON medicine_batches(medicine_id);
CREATE INDEX ix_batches_available ON medicine_batches(medicine_id)
  WHERE status='active' AND expiry_date > (now() AT TIME ZONE 'Asia/Kolkata');

CREATE INDEX ix_txn_med_month ON stock_transactions(medication_id, transaction_date);
CREATE INDEX ix_txn_batch_month ON stock_transactions(batch_number, transaction_date);
```

---

### 13. Naming Confusion
- **Issue:** `medicines` vs `medications`.  
- **Fix:** Rename for clarity, e.g. `inv_batch_medicines` vs `inv_ledger_medications`.

---

### 14. Units of Measure
- **Issue:** No handling for packs/units.  
- **Fix:** Add `units_per_pack` and normalize all transactions.

---

## 2) Fixed Triggers

### Batch Decrement (safe sale)
```sql
CREATE OR REPLACE FUNCTION reduce_batch_stock()
RETURNS trigger AS $$
DECLARE
  sellable boolean;
BEGIN
  SELECT (b.status='active' AND b.expiry_date > (now() AT TIME ZONE 'Asia/Kolkata'))
  INTO sellable
  FROM medicine_batches b
  WHERE b.id = NEW.batch_id
  FOR UPDATE;

  IF NOT FOUND OR NOT sellable THEN
    RAISE EXCEPTION 'Batch % not sellable (inactive/expired/missing)', NEW.batch_id;
  END IF;

  UPDATE medicine_batches
     SET current_quantity = current_quantity - NEW.quantity,
         updated_at = now()
   WHERE id = NEW.batch_id;

  IF (SELECT current_quantity FROM medicine_batches WHERE id = NEW.batch_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for batch %', NEW.batch_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Aggregate Stock per Medicine
```sql
CREATE OR REPLACE FUNCTION update_medicine_stock()
RETURNS trigger AS $$
BEGIN
  UPDATE medicines m
     SET total_stock =
           COALESCE((SELECT SUM(b.current_quantity)
                       FROM medicine_batches b
                      WHERE b.medicine_id = m.id), 0),
         available_stock =
           COALESCE((SELECT SUM(b.current_quantity)
                       FROM medicine_batches b
                      WHERE b.medicine_id = m.id
                        AND b.status='active'
                        AND b.expiry_date > (now() AT TIME ZONE 'Asia/Kolkata')), 0),
         updated_at = now()
   WHERE m.id = COALESCE(NEW.medicine_id, OLD.medicine_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## 3) Paracetamol Sanity Check Queries

### A. Compare Batch vs Ledger Stock
```sql
-- Batch model
SELECT SUM(b.current_quantity) AS available_batch
FROM medicine_batches b
JOIN medicines m ON m.id=b.medicine_id
WHERE LOWER(m.name) LIKE '%paracetamol%'
  AND b.status='active'
  AND b.expiry_date > (now() AT TIME ZONE 'Asia/Kolkata');

-- Ledger model
SELECT SUM(md.stock_quantity) AS stock_ledger
FROM medications md
WHERE LOWER(md.name) LIKE '%paracetamol%';
```

---

### B. Monthly KPIs in IST
```sql
WITH bounds AS (
  SELECT date_trunc('month', (now() AT TIME ZONE 'Asia/Kolkata')) AS start_ts,
         (date_trunc('month', (now() AT TIME ZONE 'Asia/Kolkata')) + INTERVAL '1 month') AS end_ts
)
SELECT
  SUM(CASE WHEN t.transaction_type='purchase' AND t.quantity>0 THEN t.quantity ELSE 0 END) AS purchased_units_this_month,
  SUM(CASE WHEN t.transaction_type='sale'     THEN ABS(t.quantity) ELSE 0 END)             AS sold_units_this_month
FROM stock_transactions t
JOIN medications md ON md.id=t.medication_id
JOIN bounds b ON TRUE
WHERE LOWER(md.name) LIKE '%paracetamol%'
  AND COALESCE(t.transaction_date, t.created_at) >= b.start_ts
  AND COALESCE(t.transaction_date, t.created_at) <  b.end_ts;
```

---

### C. Per-Batch (e.g., `PAR001`)
```sql
SELECT current_quantity
FROM medicine_batches
WHERE batch_number = 'PAR001';

WITH bounds AS (
  SELECT date_trunc('month', (now() AT TIME ZONE 'Asia/Kolkata')) AS start_ts,
         (date_trunc('month', (now() AT TIME ZONE 'Asia/Kolkata')) + INTERVAL '1 month') AS end_ts
)
SELECT
  COALESCE(SUM(CASE WHEN transaction_type='purchase' THEN quantity END),0) AS purchased_units_this_month,
  COALESCE(SUM(CASE WHEN transaction_type='sale' THEN ABS(quantity) END),0) AS sold_units_this_month
FROM stock_transactions t
JOIN bounds b ON TRUE
WHERE t.batch_number = 'PAR001'
  AND COALESCE(t.transaction_date, t.created_at) >= b.start_ts
  AND COALESCE(t.transaction_date, t.created_at) <  b.end_ts;
```

---

## 4) Developer Checklist

- [ ] Decide canonical model (batch-first vs ledger-first).  
- [ ] Enforce **ledger logging for all movements**, even if batch-first is canonical.  
- [ ] Add missing constraints, sign checks, and indexes.  
- [ ] Update triggers to block expired/inactive sales.  
- [ ] Wrap `createPharmacyBill` in one DB transaction.  
- [ ] Use IST (Asia/Kolkata) time bounds consistently.  
- [ ] Remove duplicate/denormalized bill item fields.  
- [ ] Add UOM normalization if packs/units are needed.

---

✅ After applying these fixes, **Paracetamol counts will stay consistent** between batch and ledger models, monthly KPIs will be reliable, and expired/invalid sales will be blocked.
