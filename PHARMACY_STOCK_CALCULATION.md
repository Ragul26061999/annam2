# Pharmacy Stock and Batch Calculation – Source-of-Truth and Formulas

This document explains how medicine stock levels and batch quantities are calculated and maintained in the database, and how the application code interacts with these tables. It focuses on both inventory models present in the project:

- Ledger-first model using `medications` + `stock_transactions` (single-table stock with a transaction ledger)
- Batch-first model using `medicines` + `medicine_batches` (batch quantities aggregated into medicine stock)

## 1) Batch-first inventory model (medicines + medicine_batches)

### Tables
- `medicines`
  - Key fields: `id`, `medicine_code`, `name`, `total_stock`, `available_stock`, `status`, `updated_at`
- `medicine_batches`
  - Key fields: `id`, `medicine_id` (FK → medicines.id), `batch_number`, `expiry_date`, `status`, `current_quantity`, `updated_at`
- `pharmacy_bill_items`
  - Key fields: `id`, `bill_id`, `medicine_id`, `batch_id`, `quantity`, `unit_price`, `batch_number`, `expiry_date`

### Server-side triggers/functions
- `reduce_batch_stock()`
  - When a row is inserted into `pharmacy_bill_items`, this function decrements the corresponding `medicine_batches.current_quantity` by `NEW.quantity`.
  - If the operation would result in a negative quantity, it raises an exception and the insert fails.
- `update_medicine_stock()`
  - After insert/update/delete on `medicine_batches`, this function recomputes `medicines.total_stock` and `medicines.available_stock` by summing `current_quantity` across batches for the affected `medicine_id`.
  - Typical aggregation filters out inactive/expired batches (e.g., `status = 'active'` and `expiry_date > current_date`).

### Formulas
- Per-batch remaining units:
  - `medicine_batches.current_quantity` (authoritative count per batch)
- Per-medicine remaining units (aggregated from batches):
  - `medicines.available_stock = SUM(current_quantity) FROM medicine_batches WHERE medicine_id = :id AND status = 'active' AND expiry_date > current_date`
  - `medicines.total_stock` maintained similarly by `update_medicine_stock()`

### Example read queries
```sql
-- Remaining units for a specific batch
SELECT current_quantity
FROM medicine_batches
WHERE batch_number = 'BATCH123';

-- Aggregated remaining units for a medicine
SELECT available_stock
FROM medicines
WHERE id = 'MEDICINE_ID';

-- Or compute directly (matches trigger logic)
SELECT COALESCE(SUM(current_quantity), 0) AS available_stock
FROM medicine_batches
WHERE medicine_id = 'MEDICINE_ID'
  AND status = 'active'
  AND expiry_date > CURRENT_DATE;
```

### How the app updates these values
- Creating a pharmacy bill inserts rows into `pharmacy_bill_items`.
  - The `reduce_batch_stock()` trigger automatically decrements `medicine_batches.current_quantity`.
  - As batch quantities change, `update_medicine_stock()` recalculates `medicines.total_stock` and `available_stock`.
- The inventory page (`app/pharmacy/inventory/page.tsx`) displays batches and, for each batch, calls `getBatchStockStats(batch_number)` to show:
  - `remainingUnits`: primarily derived from `medicine_batches.current_quantity`, with a fallback if no transactions are found.
  - `soldUnitsThisMonth` and `purchasedUnitsThisMonth`: computed from `stock_transactions` filtered by `batch_number` and current month.

## 2) Ledger-first inventory model (medications + stock_transactions)

### Tables
- `medications`
  - Key fields: `id`, `medication_code`, `name`, `stock_quantity`, `minimum_stock_level`, `updated_at` (and other product fields)
- `stock_transactions`
  - Key fields: `id`, `medication_id` (FK → medications.id), `transaction_type` (`purchase` | `sale` | `adjustment` | `return` | `expired`), `quantity`, `unit_price`, `batch_number`, `expiry_date`, `reference_id`, `reference_type`, `performed_by`, `transaction_date`, `created_at`

### Server-side triggers/functions
- `update_medication_stock()`
  - On insert into `stock_transactions`, the trigger adds `NEW.quantity` to `medications.stock_quantity` for `NEW.medication_id`.
  - Signed quantities are used:
    - Purchases: positive `quantity` increase stock
    - Sales: negative `quantity` decrease stock
    - Adjustments: signed `quantity` reflect the direction of the change

### Formulas
- Per-medication remaining units:
  - `medications.stock_quantity` (maintained by the `update_medication_stock()` trigger from the ledger)
- Monthly purchase/sale aggregates (example):
  - Purchases this month: sum of positive `quantity` where `transaction_type = 'purchase'`
  - Sales this month: sum of absolute value of `quantity` where `transaction_type = 'sale'`

### Example read queries
```sql
-- Remaining units for a medication (ledger model)
SELECT stock_quantity
FROM medications
WHERE id = 'MEDICATION_ID';

-- Monthly aggregates from ledger (using transaction_date; fallback to created_at when null)
WITH bounds AS (
  SELECT date_trunc('month', CURRENT_DATE) AS start_ts,
         date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' AS end_ts
)
SELECT
  SUM(CASE WHEN t.transaction_type = 'purchase' AND t.quantity > 0 THEN t.quantity ELSE 0 END) AS purchased_units_this_month,
  SUM(CASE WHEN t.transaction_type = 'sale' THEN ABS(t.quantity) ELSE 0 END) AS sold_units_this_month
FROM stock_transactions t
JOIN bounds b ON TRUE
WHERE COALESCE(t.transaction_date, t.created_at) >= b.start_ts
  AND COALESCE(t.transaction_date, t.created_at) <  b.end_ts;
```

### How the app updates these values
- `src/lib/pharmacyService.ts`
  - `addStock(medicationId, quantity, unitPrice, ...)` inserts a `stock_transactions` row with `transaction_type = 'purchase'` and positive `quantity`. The `update_medication_stock()` trigger increases `medications.stock_quantity`.
  - `adjustStock(medicationId, adjustmentQuantity, reason, notes, userId)` inserts a `stock_transactions` row with `transaction_type = 'adjustment'` and a signed `quantity`. The trigger adjusts `stock_quantity` accordingly.
  - `createPharmacyBill(...)`:
    - Inserts the bill into `pharmacy_bills` and bill items into `pharmacy_bill_items`.
    - Inserts `stock_transactions` with `transaction_type = 'sale'` and negative `quantity` for each item, which decreases `medications.stock_quantity` via the trigger.
- `getStockSummaryStats()` computes dashboard totals:
  - `remainingUnits`: sums `medicines.available_stock` across all medicines (i.e., uses the batch-first aggregation as the source for “remaining units”).
  - Monthly purchased/sold units: derived from `stock_transactions` in the current month, counting only positive quantities for purchases and absolute values for sales.

## 3) Batch statistics per batch number

The service method `getBatchStockStats(batchNumber)` computes per-batch statistics using both models:

- `remainingUnits`
  - Primary source: `medicine_batches.current_quantity` for the given `batch_number`.
  - If no batch record exists or no transactions are found, it falls back to `current_quantity` directly from `medicine_batches`.
- `soldUnitsThisMonth` and `purchasedUnitsThisMonth`
  - Derived from `stock_transactions` where `batch_number = :batchNumber` and `transaction_type IN ('sale','purchase')`, filtered to the current month.
  - Sales are counted as the absolute value of negative `quantity`; purchases count positive `quantity` only.

Example (simplified logic mirrored from `src/lib/pharmacyService.ts`):
```sql
WITH bounds AS (
  SELECT date_trunc('month', CURRENT_DATE) AS start_ts,
         date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' AS end_ts
)
SELECT
  COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN quantity END), 0)        AS purchased_units_this_month,
  COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN ABS(quantity) END), 0)       AS sold_units_this_month
FROM stock_transactions t
JOIN bounds b ON TRUE
WHERE t.batch_number = 'BATCH123'
  AND COALESCE(t.transaction_date, t.created_at) >= b.start_ts
  AND COALESCE(t.transaction_date, t.created_at) <  b.end_ts;

-- Remaining units
SELECT current_quantity
FROM medicine_batches
WHERE batch_number = 'BATCH123';
```

## 4) Important caveats and recommendations

- Two parallel sources of truth exist:
  - `medicines` + `medicine_batches` (batch-first) drive `available_stock` via triggers.
  - `medications` + `stock_transactions` (ledger-first) drive `stock_quantity` via triggers.
- Because `createPharmacyBill` inserts both bill items (which trigger batch decrements) and ledger transactions (which trigger medication decrements), stock is updated in both models for the same sale.
- Recommendation: standardize on a single source of truth to avoid drift.
  - If batch-first is preferred: treat `medicines.available_stock` as the canonical remaining units; ensure purchases/returns mutate `medicine_batches` and let triggers aggregate into `medicines`.
  - If ledger-first is preferred: treat `medications.stock_quantity` as canonical; ensure all changes go through `stock_transactions` and avoid duplicating adjustments in batch tables.

## 5) Quick reference
- Current stock for a batch: `medicine_batches.current_quantity`
- Current stock for a medicine (batch-first): `medicines.available_stock`
- Current stock for a medication (ledger-first): `medications.stock_quantity`
- Sales decrease stock via:
  - Batch-first: `pharmacy_bill_items` insert → `reduce_batch_stock()`
  - Ledger-first: `stock_transactions` insert with negative `quantity` → `update_medication_stock()`
- Purchases increase stock via:
  - Ledger-first: `stock_transactions` insert with positive `quantity`
  - Batch-first: insert/update `medicine_batches.current_quantity` for the new/received batch

---

Primary code references:
- `src/lib/pharmacyService.ts`: `addStock`, `adjustStock`, `createPharmacyBill`, `getBatchStockStats`, `getStockSummaryStats`
- UI: `app/pharmacy/inventory/page.tsx` (loads per-batch stats for display)
- Prior overview: `PHARMACY_INVENTORY_SUMMARY.md`