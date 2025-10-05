# Pharmacy Inventory (Medicines & Batches) – Data Model and Logic Summary

This document summarizes the tables, relationships, triggers/functions, and app-level logic paths related to pharmacy inventory, medicines, and batches.

## Overview

Two parallel inventory models exist:
- medications: single table with a direct `stock_quantity` field, adjusted via stock transactions or direct updates from UI code.
- medicines + medicine_batches: batch-first model with `current_quantity` per batch and aggregated `total_stock`/`available_stock` maintained via triggers.

This duality leads to potential inconsistencies and duplicate stock adjustments.

## Key Tables

### medications
- Purpose: Product catalog (single stock count).
- Key fields: `id` (PK), `medication_code` (unique), `name`, `generic_name`, `category`, `dosage_form`, `strength`, `unit_price`, `stock_quantity`, `minimum_stock_level`, `maximum_stock_level`, `expiry_date`, `batch_number`, `prescription_required`, `status`, `supplier_id`, `location`, `created_at`, `updated_at`, etc.
- Indexes: `medications_pkey (id)`, unique on `medication_code`, plus indexes on `name`, `generic_name`, `category`, `status`, `expiry_date`, `stock_quantity`.
- Triggers:
  - `trigger_update_medications_updated_at` BEFORE UPDATE → `update_medications_updated_at()`.
  - `stock_transactions` INSERT → `update_medication_stock()` (increments `stock_quantity` by `NEW.quantity`).

### stock_transactions
- Purpose: Ledger of stock changes tied to `medications`.
- Key fields: `id` (PK), `medication_id` (FK → medications.id), `transaction_type`, `quantity`, `unit_price`, `total_amount`, `reference_id`, `reference_type`, `batch_number`, `expiry_date`, `supplier_id`, `performed_by`, `transaction_date`, `created_at`.
- Indexes: `stock_transactions_pkey (id)`, `idx_stock_transactions_medication_id`, `idx_stock_transactions_reference (reference_id, reference_type)`.
- Triggers:
  - INSERT → `update_medication_stock()` (updates `medications.stock_quantity += NEW.quantity`).

### medicines
- Purpose: Product catalog whose stock is derived from batches.
- Key fields: `id` (PK), `medicine_code` (unique), `name`, `category`, `total_stock`, `available_stock`, `status`, `updated_at`.
- Indexes: `medicines_pkey (id)`, unique on `medicine_code`, indexes on `name`, `category`, `status`.
- Triggers: Constraint triggers enforce FK behavior with `medicine_batches` and `pharmacy_bill_items`.

### medicine_batches
- Purpose: Batch-level tracking and quantities.
- Key fields: `id` (PK), `medicine_id` (FK → medicines.id), `batch_number` (unique per medicine), `expiry_date`, `status`, `current_quantity`, `created_at`, `updated_at`.
- Indexes: `medicine_batches_pkey (id)`, unique on `(medicine_id, batch_number)`, indexes on `expiry_date`, `medicine_id`, `status`.
- Triggers:
  - AFTER INSERT/UPDATE/DELETE → `update_medicine_stock()` (recomputes `medicines.total_stock` and `available_stock` from SUM of `current_quantity`, filtering `status = 'active'` and `expiry_date > current_date`).
  - `pharmacy_bill_items` INSERT → `reduce_batch_stock()` (decrements `current_quantity` by bill item quantity; throws if negative).

### pharmacy_bills and pharmacy_bill_items
- pharmacy_bills: `id` (PK), `bill_number` (unique), `patient_id`, `bill_date`, `payment_method`, `payment_status`, `total_amount`, `created_at` with indexes on `bill_number`, `patient_id`, `bill_date`.
- pharmacy_bill_items: `id` (PK), `bill_id` (FK → pharmacy_bills.id), `medicine_id` (FK → medicines.id), `batch_id` (FK → medicine_batches.id), `quantity`, `unit_price`, `total_amount`, `batch_number`, `expiry_date`.
- Triggers:
  - INSERT on `pharmacy_bill_items` → `reduce_batch_stock()` (decrement corresponding batch `current_quantity`).
  - Constraint triggers enforce FK checks with `pharmacy_bills`, `medicines`, and `medicine_batches`.

### prescriptions and related tables
- prescriptions: `id` (PK), `prescription_id` (unique), `patient_id`, `issue_date`, `created_at`.
- prescription_items: `id` (PK), `prescription_id` (FK → prescriptions.id), `medication_id` (FK → medications.id), `dosage`, `frequency`, `duration`, `quantity`, `status`, `dispensed_date`, `dispensed_quantity`, `remaining_quantity`. Indexes on `prescription_id`, `medication_id`, `status`; unique on `(prescription_id, medication_id)`.
- prescription_dispensed and prescription_dispensed_items: tie dispensing events to prescriptions and medications; multiple constraint triggers enforce FK behavior.

## Server-side Functions (PL/pgSQL)
- `reduce_batch_stock()`
  - Decrements `medicine_batches.current_quantity` by `NEW.quantity` on bill item insert; raises exception if the result would be negative.
- `update_medicine_stock()`
  - Recomputes `medicines.total_stock` and `available_stock` from `medicine_batches` for affected medicine; sets `updated_at`.
- `update_medication_stock()`
  - Adds `NEW.quantity` to `medications.stock_quantity` on stock transaction insert; sets `updated_at`.
- `update_medications_updated_at()`
  - Sets `updated_at = now()` before any row update on `medications`.

## App Code Interactions
- `src/components/PharmacyBillingForm.tsx`
  - Fetches `medications` where `stock_quantity > 0`.
  - On billing, inserts bill and bill items, then directly updates `medications.stock_quantity = stock_quantity - item.quantity` (bypasses ledger).
  - Updates `prescription_items` to mark items as dispensed when billing a prescription.

- `src/lib/pharmacyService.ts`
  - `createPharmacyBill`: inserts into `pharmacy_bill_items`, then manually fetches and updates `medicine_batches.current_quantity` to decrement stock. This duplicates the effect of the `reduce_batch_stock()` trigger and risks double-decrement.
  - `getBatchPurchaseHistory`: joins `medicines` for item context.
  - `getStockTransactions`: queries `pharmacy_stock_transactions` (likely incorrect; the actual table is `stock_transactions`).

- UI pages (`src/pages/Pharmacy.tsx`, `src/components/PharmacyManagement.tsx`)
  - Display inventory and bills using data from the services above.

## Relationships Overview
- `medicine_batches.medicine_id` → `medicines.id`.
- `pharmacy_bill_items.medicine_id` → `medicines.id`.
- `pharmacy_bill_items.batch_id` → `medicine_batches.id`.
- `stock_transactions.medication_id` → `medications.id`.
- `prescription_items.medication_id` → `medications.id`.
- `prescription_dispensed_items.medication_id` → `medications.id`.

## Observations and Potential Issues
1) Dual inventory models:
   - Batch-first (`medicines` + `medicine_batches`) with totals maintained by triggers.
   - Single-table (`medications`) with `stock_transactions` or direct UI updates.

2) Double-decrement risk:
   - `createPharmacyBill` manually decrements `medicine_batches.current_quantity` after inserting `pharmacy_bill_items`, while the `reduce_batch_stock()` trigger also decrements on the same insert.

3) Naming mismatch:
   - Code uses `pharmacy_stock_transactions` whereas the DB table is `stock_transactions`.

4) Mixed stock update strategies:
   - UI directly updates `medications.stock_quantity` (PharmacyBillingForm) without inserting into `stock_transactions`, bypassing the ledger and trigger-based updates.

## Recommendations
1) Standardize the inventory model:
   - Option A (batch-first): Use `medicines` + `medicine_batches` as the source of truth. Remove direct stock fields from `medications` or mark them deprecated; compute totals via triggers.
   - Option B (ledger-first): Use `medications` with `stock_transactions` as the source of truth. All stock changes go through `stock_transactions` (positive for purchases, negative for sales), and triggers maintain `stock_quantity`.

2) Fix code table name:
   - Update `getStockTransactions` to query `stock_transactions` (not `pharmacy_stock_transactions`).

3) Remove duplicate stock adjustments:
   - In `pharmacyService.ts::createPharmacyBill`, stop manually decrementing `medicine_batches` since `reduce_batch_stock()` already handles it.
   - In `PharmacyBillingForm.tsx`, prefer inserting a `stock_transactions` record with negative quantity for sales and let `update_medication_stock()` adjust `stock_quantity`.

4) Consider RLS policies for pharmacy tables (not currently present in repo) to secure operations.

5) Provide unified read models:
   - Create views or service-layer helpers to present inventory consistently, regardless of the chosen model.

## Next Steps (Optional)
- Map each UI action to exact DB operations and triggers.
- Implement code changes to align with a single model.
- Add consistency checks (tests) to prevent double-decrement and ensure stock reconciliation.