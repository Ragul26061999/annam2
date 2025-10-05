# Paracetamol (Acetaminophen) – Inventory Detail and DB Calculation Guide

This document provides a detailed, step-by-step reference for how Paracetamol stock and batch information are stored, calculated, and surfaced by the application. It covers both inventory models present in the project:

- Batch-first model: `medicines` + `medicine_batches` (batch quantities aggregated into medicine stock via triggers)
- Ledger-first model: `medications` + `stock_transactions` (single-table stock maintained by a transaction ledger)

Use this as a runbook to pull accurate numbers for Paracetamol, reconcile stock, and understand how UI and services compute the displayed values.

## 0) Quick glossary
- Paracetamol 500mg is used in examples below. Replace IDs/codes with values from your database.
- “Batch number” examples: `PAR001`, `PAR002` (seen in the inventory page mock). Use the real batch numbers in production.

## 1) How to locate Paracetamol records

### If using the batch-first model (preferred for per-batch views)
```sql
-- Find the medicine record(s) for Paracetamol
SELECT id, medicine_code, name, category, available_stock, total_stock
FROM medicines
WHERE LOWER(name) LIKE '%paracetamol%';

-- List all batches for Paracetamol
SELECT b.id, b.medicine_id, b.batch_number, b.expiry_date, b.status, b.current_quantity, b.updated_at
FROM medicine_batches b
JOIN medicines m ON m.id = b.medicine_id
WHERE LOWER(m.name) LIKE '%paracetamol%'
ORDER BY b.expiry_date ASC;
```

### If using the ledger-first model (per-medication aggregates via ledger)
```sql
-- Find the medication record(s) for Paracetamol
SELECT id, medication_code, name, stock_quantity, minimum_stock_level, updated_at
FROM medications
WHERE LOWER(name) LIKE '%paracetamol%';
```

## 2) What the numbers mean (batch-first)
- Per-batch remaining units: `medicine_batches.current_quantity` (authoritative count for that batch).
- Aggregated per-medicine remaining units: `medicines.available_stock` (maintained by the `update_medicine_stock()` trigger that sums active/unexpired batches).
- Sales impact: inserting into `pharmacy_bill_items` triggers `reduce_batch_stock()` which decrements `current_quantity` for the referenced batch; this in turn causes `update_medicine_stock()` to refresh `available_stock` and `total_stock`.

### Recompute aggregates directly (if needed)
```sql
-- Compute available stock for Paracetamol from batches (matches trigger logic)
SELECT COALESCE(SUM(b.current_quantity), 0) AS available_stock
FROM medicine_batches b
JOIN medicines m ON m.id = b.medicine_id
WHERE LOWER(m.name) LIKE '%paracetamol%'
  AND b.status = 'active'
  AND b.expiry_date > CURRENT_DATE;
```

## 3) What the numbers mean (ledger-first)
- Per-medication remaining units: `medications.stock_quantity` (maintained by `update_medication_stock()` on each insert to `stock_transactions`).
- Signed quantities:
  - Purchases: positive `quantity` → increments stock
  - Sales: negative `quantity` → decrements stock
  - Adjustments: signed `quantity` per direction

### Monthly aggregates for Paracetamol (ledger)
```sql
WITH bounds AS (
  SELECT date_trunc('month', CURRENT_DATE) AS start_ts,
         date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' AS end_ts
)
SELECT
  SUM(CASE WHEN t.transaction_type = 'purchase' AND t.quantity > 0 THEN t.quantity ELSE 0 END) AS purchased_units_this_month,
  SUM(CASE WHEN t.transaction_type = 'sale' THEN ABS(t.quantity) ELSE 0 END) AS sold_units_this_month
FROM stock_transactions t
JOIN medications md ON md.id = t.medication_id
JOIN bounds b ON TRUE
WHERE LOWER(md.name) LIKE '%paracetamol%'
  AND COALESCE(t.transaction_date, t.created_at) >= b.start_ts
  AND COALESCE(t.transaction_date, t.created_at) <  b.end_ts;
```

## 4) Per-batch KPIs for Paracetamol

Use per-batch queries to get exact units and recent activity. Replace `:BATCH_NUMBER` with the batch number (e.g., `PAR001`).

```sql
-- Remaining units for a specific Paracetamol batch
SELECT current_quantity
FROM medicine_batches
WHERE batch_number = :BATCH_NUMBER;

-- Monthly purchased/sold units for a specific batch
WITH bounds AS (
  SELECT date_trunc('month', CURRENT_DATE) AS start_ts,
         date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' AS end_ts
)
SELECT
  COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN quantity END), 0)        AS purchased_units_this_month,
  COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN ABS(quantity) END), 0)       AS sold_units_this_month
FROM stock_transactions t
JOIN bounds b ON TRUE
WHERE t.batch_number = :BATCH_NUMBER
  AND COALESCE(t.transaction_date, t.created_at) >= b.start_ts
  AND COALESCE(t.transaction_date, t.created_at) <  b.end_ts;
```

## 5) How the app surfaces Paracetamol data

- `src/lib/pharmacyService.ts`
  - `getBatchStockStats(batchNumber)`: returns `{ remainingUnits, soldUnitsThisMonth, purchasedUnitsThisMonth }` based on `stock_transactions` (month filter) and `medicine_batches.current_quantity`.
  - `getBatchPurchaseHistory(batchNumber)`: compiles bill items, bill headers, patient info, and medicine names for the given batch.
  - `createPharmacyBill(...)`: inserts bill + bill items, then inserts a `stock_transactions` record per item with negative quantity (sale). This updates `medications.stock_quantity` via trigger while bill items update batches via `reduce_batch_stock()`.
- UI: `app/pharmacy/inventory/page.tsx`
  - Loads mock Paracetamol with batch numbers like `PAR001`, `PAR002` for demonstration.
  - Fetches per-batch stats by calling `getBatchStockStats(bn)` and displays remaining units and month activity.

## 6) Example walk-through (using mock values)
- Batches for Paracetamol 500mg:
  - `PAR001`: `current_quantity = 100`, expiry `2025-12-31`
  - `PAR002`: `current_quantity = 50`, expiry `2026-02-28`
- Aggregated available stock (active, unexpired): `100 + 50 = 150` → visible via `medicines.available_stock`.
- If a sale of 10 units from `PAR001` occurs:
  - Insert into `pharmacy_bill_items` with `batch_id` or `batch_number = 'PAR001'` → `reduce_batch_stock()` decrements `current_quantity` to 90.
  - Insert into `stock_transactions` with `transaction_type = 'sale'`, `quantity = -10` → `update_medication_stock()` decrements `medications.stock_quantity` by 10.
  - `update_medicine_stock()` recalculates `available_stock` after the batch change (from 150 → 140).

## 7) Reconciliation checklist for Paracetamol
1. Confirm whether Paracetamol should be tracked via batches (preferred for expiry/lot controls) or solely via ledger.
2. If batch-first is authoritative:
   - Use `medicine_batches.current_quantity` and `medicines.available_stock` as your primary counts.
   - Ensure purchases/returns adjust batches and allow triggers to aggregate.
3. If ledger-first is authoritative:
   - Use `medications.stock_quantity` as your primary count.
   - Ensure all changes go through `stock_transactions` and avoid duplicating adjustments in batch tables.
4. Verify monthly KPIs via `stock_transactions` for both batch-specific and overall Paracetamol metrics.

## 8) Fill-in section for production values (Paracetamol)
- Medicine record(s):
  - `medicines.id = __________`, `available_stock = __________`, `total_stock = __________`
  - `medications.id = __________`, `stock_quantity = __________`
- Batches (repeat per batch):
  - `batch_number = __________`, `current_quantity = __________`, `expiry_date = __________`, `status = __________`
- Monthly activity (overall):
  - `purchased_units_this_month = __________`
  - `sold_units_this_month = __________`
- Monthly activity (per batch):
  - `BATCH __________`: `purchased = __________`, `sold = __________`

## 9) Caveat on dual updates
Because `createPharmacyBill` writes both bill items (batch decrement via `reduce_batch_stock()`) and ledger transactions (medication decrement via `update_medication_stock()`), a single sale affects both models. Choose a single source of truth to avoid confusion.

---

Related references:
- `PHARMACY_STOCK_CALCULATION.md` (overall formulas and logic)
- `PHARMACY_INVENTORY_SUMMARY.md` (data model overview and trigger descriptions)
- `app/pharmacy/inventory/page.tsx` (UI demo for Paracetamol batches and stat fetching)
- `src/lib/pharmacyService.ts` (service functions used to calculate and fetch Paracetamol stats)