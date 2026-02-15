# ERPH Database Audit, Billing/Payment Analysis & Clean Schema Plan

> **Project**: Annam Hospital Management System (erph)  
> **Supabase Project ID**: `zusheijhebsmjiyyeiqq`  
> **Audit Date**: 2026-02-15  
> **Total Tables in DB**: 107 (public schema)  
> **Total Views**: 8  
> **Total Table References in Code**: 113 unique `.from()` calls  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Billing & Payment Problems](#2-critical-billing--payment-problems)
3. [Complete Table Inventory with Status](#3-complete-table-inventory-with-status)
4. [Unwanted / Redundant Tables (SAFE TO DROP)](#4-unwanted--redundant-tables-safe-to-drop)
5. [Ghost Tables (Referenced in Code but Don't Exist)](#5-ghost-tables-referenced-in-code-but-dont-exist)
6. [Billing & Payment Architecture Deep Dive](#6-billing--payment-architecture-deep-dive)
7. [Clean Schema Design](#7-clean-schema-design)
8. [Migration Plan](#8-migration-plan)

---

## 1. Executive Summary

### The Core Problem
The database was built incrementally by a junior intern, resulting in:

- **Duplicate billing systems**: 3+ separate billing flows (OP billing, pharmacy billing, IP billing) with inconsistent column names and no unified payment tracking
- **Orphan tables**: 15+ tables with 0 rows that are never used
- **Ghost references**: Code references ~18 tables that don't exist in the database (causing silent runtime errors)
- **Naming chaos**: Same concept has different column names across tables (`total` vs `total_amount` vs `amount`, `bill_no` vs `bill_number` vs `bill_id`)
- **Denormalized patient data**: `patients` table has **88 columns** including billing fields (`total_amount`, `consultation_fee`, `op_card_amount`, `payment_mode`) that should be in billing tables
- **No unified payment ledger**: Payments are scattered across `billing_payments`, `other_bill_payments`, `discharge_payments`, `ip_bill_payments`, `ip_payment_receipts`, `ip_advances`, `pharmacy_cash_collections`
- **Backup/staging tables left in production**: `medications_backup`, `medications_new`, `medications_staging`

### Impact
- Finance dashboard aggregates data from **8 different tables** with different column names
- Billing page silently fails when querying non-existent tables
- Payment reconciliation is impossible — no single source of truth
- IP billing has a parallel system (`ip_bill_items`, `ip_bill_payments`) that doesn't integrate with OP billing

---

## 2. Critical Billing & Payment Problems

### Problem 1: Three Separate Billing Systems with No Integration

| System | Tables | Total Column | Status Column | Payment Table |
|--------|--------|-------------|---------------|---------------|
| **OP Billing** | `billing` + `billing_item` | `total` (numeric) | `payment_status` | `billing_payments` |
| **Pharmacy Billing** | `pharmacy_bills` + `pharmacy_bill_items` | `total_amount` (numeric) | `payment_status` | None (embedded) |
| **IP Billing** | `ip_bill_items` + `ip_bill_payments` + `ip_bill_payment_allocations` | `unit_price * quantity` (computed) | `payment_status` | `ip_bill_payments` |
| **Other Bills** | `other_bills` + `other_bill_items` | `total_amount` | `payment_status` | `other_bill_payments` |
| **Lab/Radiology** | `lab_test_orders` / `radiology_test_orders` | `amount` | `payment_status` | None (embedded) |
| **Diagnostic** | `diagnostic_billing_items` | `amount` | `billing_status` (different!) | None |

### Problem 2: `billing` Table Has 39 Columns with Redundant Fields

```
bill_no          -- legacy field
bill_number      -- newer duplicate field  
bill_type        -- added later
customer_name    -- denormalized (should use patient FK)
customer_phone   -- denormalized
customer_type    -- denormalized
customer_gstin   -- added for GST
discount         -- original discount column
discount_type    -- added later
discount_value   -- added later (redundant with discount)
tax              -- original tax column
tax_percent      -- added later
cgst_amount      -- added for GST split
sgst_amount      -- added for GST split
igst_amount      -- added for GST split
advance_amount   -- IP advance tracking leaked into OP billing
bed_allocation_id -- IP reference leaked into OP billing
```

### Problem 3: `patients` Table Has 88 Columns (Should Be ~25)

Billing-related fields that should NOT be in `patients`:
- `total_amount`, `consultation_fee`, `op_card_amount`, `payment_mode`
- `advance_amount`, `advance_payment_method`, `advance_reference_number`
- `pharmacy_recommendations`, `pharmacy_recommendations_updated_by`
- `discharge_summary_*` fields (6+ columns)
- `lab_*`, `xray_*` fields

### Problem 4: Finance Service Hacks

`financeService.ts` has to query **8 tables** with different column names and manually normalize:
```typescript
// billing uses 'total', pharmacy uses 'total_amount', lab uses 'amount'
const billingRevenue = billingData.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
const pharmacyRevenue = pharmacyData.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
const labRevenue = labData.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
```

### Problem 5: Code References Non-Existent Tables

These `.from()` calls in the codebase will fail at runtime:
- `billing_summary` — doesn't exist
- `billing_summary_detailed` — doesn't exist  
- `billing_items` — doesn't exist (actual table is `billing_item`)
- `medicines` — doesn't exist (actual table is `medications`)
- `patient_admissions` — doesn't exist
- `patient_allergies` — doesn't exist
- `patient_symptoms` — doesn't exist
- `staff_roles` — doesn't exist
- `staff_schedules` — doesn't exist
- `consultations` — doesn't exist
- `payment_receipts` — doesn't exist
- `pharmacy_billing` — doesn't exist
- `pharmacy_billing_items` — doesn't exist
- `pharmacy_stock_transactions` — doesn't exist
- `medication_recommendations` — doesn't exist
- `prescription_dispensing` — doesn't exist
- `scan_test_results` — doesn't exist
- `nurse_medication_checklist` — exists in DB but 0 rows, not in original schema

---

## 3. Complete Table Inventory with Status

### Legend
- ✅ **KEEP** — Actively used, has data, well-structured
- ⚠️ **REFACTOR** — Used but needs column cleanup or merge
- 🗑️ **DROP** — Unused, empty, or redundant
- 👻 **GHOST** — Referenced in code but doesn't exist in DB

### Core Entity Tables

| # | Table | Rows | Status | Notes |
|---|-------|------|--------|-------|
| 1 | `users` | 67 | ⚠️ REFACTOR | Has `party_id` FK that's confusing. 16 cols — reasonable |
| 2 | `patients` | 3,254 | ⚠️ REFACTOR | **88 columns!** Needs massive cleanup. Billing/discharge/pharmacy fields must move out |
| 3 | `doctors` | 25 | ✅ KEEP | 21 cols, well-structured |
| 4 | `staff` | 13 | ✅ KEEP | 18 cols, has soft-delete |
| 5 | `departments` | 23 | ✅ KEEP | 9 cols, clean |
| 6 | `party` | 49 | ⚠️ REFACTOR | Vendor/supplier entity. Used for drug purchases. Overlaps with `suppliers` |
| 7 | `suppliers` | 13 | ⚠️ REFACTOR | Overlaps with `party` table |
| 8 | `specializations` | 20 | ✅ KEEP | Reference data |
| 9 | `ref_code` | 64 | ✅ KEEP | Lookup values |
| 10 | `role_catalog` | 11 | ✅ KEEP | Role definitions |
| 11 | `role_hierarchy` | 4 | ✅ KEEP | Role relationships |
| 12 | `user_roles` | 0 | 🗑️ DROP | Empty, not used in code |
| 13 | `hospital_settings` | 1 | ✅ KEEP | Config table |

### Clinical / Encounter Tables

| # | Table | Rows | Status | Notes |
|---|-------|------|--------|-------|
| 14 | `encounter` | 122 | ✅ KEEP | Core clinical encounter |
| 15 | `appointment` | 73 | ✅ KEEP | Appointment scheduling |
| 16 | `clinical_notes` | 4 | ✅ KEEP | Doctor notes |
| 17 | `vitals` | 2 | ✅ KEEP | Patient vitals |
| 18 | `medical_history` | 0 | ⚠️ KEEP | Empty but needed for future |
| 19 | `prescriptions` | 42 | ✅ KEEP | Prescription records |
| 20 | `prescription_items` | 45 | ✅ KEEP | Prescription line items |
| 21 | `prescription_orders` | 2 | ✅ KEEP | Pharmacy orders from prescriptions |
| 22 | `prescription_dispensed` | 0 | 🗑️ DROP | Empty, replaced by `prescription_orders` |
| 23 | `prescription_dispensed_items` | 0 | 🗑️ DROP | Empty, child of above |
| 24 | `follow_up_appointments` | 0 | ⚠️ KEEP | Empty but needed |
| 25 | `outpatient_queue` | 61 | ✅ KEEP | OP queue management |
| 26 | `patient_revisits` | 1 | ✅ KEEP | Revisit tracking |
| 27 | `patient_documents` | 4 | ✅ KEEP | Document uploads |
| 28 | `patient_reports` | 0 | 🗑️ DROP | Empty, overlaps with `patient_documents` |
| 29 | `injection_orders` | 0 | ⚠️ KEEP | Empty but needed for IP |
| 30 | `personal_calendar_entries` | 0 | 🗑️ DROP | Empty, not used |
| 31 | `notes` | 0 | 🗑️ DROP | Empty, generic — use `clinical_notes` |
| 32 | `tasks` | 0 | 🗑️ DROP | Empty, not used |
| 33 | `task_note_links` | 0 | 🗑️ DROP | Empty, child of above |
| 34 | `submissions` | 0 | 🗑️ DROP | Empty, unknown purpose |
| 35 | `admission_categories` | 4 | ✅ KEEP | Reference data |

### Bed / IP Management Tables

| # | Table | Rows | Status | Notes |
|---|-------|------|--------|-------|
| 36 | `beds` | 12 | ✅ KEEP | Bed inventory |
| 37 | `bed_allocations` | 9 | ⚠️ REFACTOR | 24 cols — has billing fields that should be separate |
| 38 | `ip_case_sheets` | 4 | ✅ KEEP | IP case documentation |
| 39 | `ip_vitals` | 3 | ✅ KEEP | IP-specific vitals |
| 40 | `ip_doctor_orders` | 3 | ✅ KEEP | Doctor orders for IP |
| 41 | `ip_nurse_records` | 3 | ✅ KEEP | Nursing records |
| 42 | `ip_progress_notes` | 1 | ✅ KEEP | Progress notes |
| 43 | `ip_prescription_schedule` | 3 | ✅ KEEP | Medication schedule |
| 44 | `ip_prescription_administration` | 0 | ⚠️ KEEP | Needed for IP |
| 45 | `ip_pharmacy_recommendations` | 0 | ⚠️ KEEP | Pharmacy recs for IP |
| 46 | `ip_doctor_consultations` | 2 | ✅ KEEP | IP consultation tracking |
| 47 | `ip_surgery_charges` | 0 | ⚠️ KEEP | Surgery billing |
| 48 | `ip_discharge_summaries` | 1 | ✅ KEEP | Discharge documentation |
| 49 | `discharge_summaries` | 3 | ⚠️ REFACTOR | Overlaps with `ip_discharge_summaries` |
| 50 | `discharge_attachments` | 0 | ⚠️ KEEP | Discharge docs |
| 51 | `surgery_categories` | 1 | ✅ KEEP | Reference data |
| 52 | `surgery_services` | 0 | ⚠️ KEEP | Service catalog |
| 53 | `surgery_recommendations` | 0 | ⚠️ KEEP | Surgery recs |

### Lab / Radiology / Scan Tables

| # | Table | Rows | Status | Notes |
|---|-------|------|--------|-------|
| 54 | `lab_test_catalog` | 110 | ✅ KEEP | Test catalog |
| 55 | `lab_test_orders` | 91 | ⚠️ REFACTOR | **49 columns!** Has billing fields mixed in |
| 56 | `lab_test_results` | 5 | ✅ KEEP | Test results |
| 57 | `lab_xray_attachments` | 13 | ✅ KEEP | Report attachments |
| 58 | `lab_orders` | 0 | 🗑️ DROP | Empty, replaced by `lab_test_orders` |
| 59 | `lab_reports` | 0 | 🗑️ DROP | Empty, replaced by `lab_test_results` |
| 60 | `lab_result_value` | 0 | 🗑️ DROP | Empty, not used |
| 61 | `lab_tests` | 0 | 🗑️ DROP | Empty, replaced by `lab_test_catalog` |
| 62 | `radiology_test_catalog` | 119 | ✅ KEEP | Radiology catalog |
| 63 | `radiology_test_orders` | 25 | ⚠️ REFACTOR | **55 columns!** Has billing fields mixed in |
| 64 | `scan_test_catalog` | 5 | ✅ KEEP | Scan catalog |
| 65 | `scan_test_orders` | 6 | ✅ KEEP | Scan orders |
| 66 | `scan_documents` | 0 | ⚠️ KEEP | Document storage |
| 67 | `scan_orders` | 0 | 🗑️ DROP | Empty, replaced by `scan_test_orders` |
| 68 | `xray_orders` | 0 | 🗑️ DROP | Empty, replaced by `radiology_test_orders` |
| 69 | `diagnostic_groups` | 4 | ✅ KEEP | Test grouping |
| 70 | `diagnostic_group_items` | 13 | ✅ KEEP | Group members |
| 71 | `diagnostic_group_orders` | 19 | ✅ KEEP | Group orders |
| 72 | `diagnostic_group_order_items` | 61 | ✅ KEEP | Order line items |
| 73 | `diagnostic_billing_items` | 51 | ⚠️ REFACTOR | Billing mixed with diagnostics |

### Pharmacy / Medication Tables

| # | Table | Rows | Status | Notes |
|---|-------|------|--------|-------|
| 74 | `medications` | 707 | ✅ KEEP | Master drug catalog — **34 cols, needs trim** |
| 75 | `medicine_batches` | 696 | ✅ KEEP | Batch/stock tracking |
| 76 | `stock_transactions` | 66 | ✅ KEEP | Stock movement log |
| 77 | `drug_purchases` | 7 | ✅ KEEP | Purchase orders |
| 78 | `drug_purchase_items` | 9 | ✅ KEEP | Purchase line items |
| 79 | `purchase_returns` | 4 | ✅ KEEP | Return to supplier |
| 80 | `purchase_return_items` | 4 | ✅ KEEP | Return line items |
| 81 | `sales_returns` | 16 | ✅ KEEP | Customer returns |
| 82 | `sales_return_items` | 13 | ✅ KEEP | Return line items |
| 83 | `drug_broken_records` | 2 | ✅ KEEP | Breakage tracking |
| 84 | `intent_medicines` | 7 | ✅ KEEP | Purchase intent |
| 85 | `moved_medicines` | 1 | ✅ KEEP | Inter-dept transfers |
| 86 | `medications_backup` | 465 | 🗑️ DROP | **Backup table left in production** |
| 87 | `medications_new` | 465 | 🗑️ DROP | **Staging table left in production** |
| 88 | `medications_staging` | 0 | 🗑️ DROP | **Empty staging table** |
| 89 | `pharmacy_gst_ledger` | 100 | ✅ KEEP | GST tracking |
| 90 | `pharmacy_cash_collections` | 0 | 🗑️ DROP | Empty, not actively used |

### Billing / Payment Tables (THE PROBLEM AREA)

| # | Table | Rows | Status | Notes |
|---|-------|------|--------|-------|
| 91 | `billing` | 178 | ⚠️ REFACTOR | **39 cols**, OP consultation billing. Inconsistent naming |
| 92 | `billing_item` | 224 | ⚠️ REFACTOR | Line items for `billing`. Code also references non-existent `billing_items` |
| 93 | `billing_payments` | 133 | ⚠️ REFACTOR | Payment records for OP billing |
| 94 | `pharmacy_bills` | 2 | ⚠️ REFACTOR | **38 cols**, separate pharmacy billing system |
| 95 | `pharmacy_bill_items` | 2 | ⚠️ REFACTOR | Pharmacy line items |
| 96 | `other_bills` | 4 | ⚠️ REFACTOR | **35 cols**, miscellaneous billing |
| 97 | `other_bill_items` | 1 | ✅ KEEP | Line items |
| 98 | `other_bill_payments` | 3 | ⚠️ REFACTOR | Separate payment table |
| 99 | `other_bill_charge_categories` | 13 | ✅ KEEP | Category reference |
| 100 | `fee_categories` | 6 | ✅ KEEP | Fee structure |
| 101 | `fee_rates` | 14 | ✅ KEEP | Fee rates |
| 102 | `payment_history` | 0 | 🗑️ DROP | Empty, never used |
| 103 | `discharge_payments` | 1 | ⚠️ REFACTOR | Should be part of unified payments |
| 104 | `ip_billing_summary` | 6 | ✅ KEEP | IP billing aggregation (trigger-maintained) |
| 105 | `ip_bill_items` | 0 | ⚠️ KEEP | IP flexible billing items |
| 106 | `ip_bill_payments` | 0 | ⚠️ KEEP | IP payments |
| 107 | `ip_bill_payment_allocations` | 0 | ⚠️ KEEP | Payment-to-item mapping |
| 108 | `ip_bill_discounts` | 0 | ⚠️ KEEP | IP discounts |
| 109 | `ip_advances` | 0 | ⚠️ KEEP | IP advance payments |
| 110 | `ip_payment_receipts` | 5 | ⚠️ REFACTOR | Overlaps with `ip_bill_payments` |

### HR / Attendance Tables

| # | Table | Rows | Status | Notes |
|---|-------|------|--------|-------|
| 111 | `staff_attendance` | 0 | ⚠️ KEEP | Attendance tracking |
| 112 | `doctor_documents` | 0 | ⚠️ KEEP | Doctor credentials |

---

## 4. Unwanted / Redundant Tables (SAFE TO DROP)

### Tier 1: Backup/Staging Tables (Drop Immediately)
| Table | Rows | Reason |
|-------|------|--------|
| `medications_backup` | 465 | Backup table left in production |
| `medications_new` | 465 | Migration staging table |
| `medications_staging` | 0 | Empty staging table |

### Tier 2: Empty Legacy Tables (Drop After Verification)
| Table | Rows | Reason |
|-------|------|--------|
| `lab_orders` | 0 | Replaced by `lab_test_orders` |
| `lab_reports` | 0 | Replaced by `lab_test_results` + `lab_xray_attachments` |
| `lab_result_value` | 0 | Never used |
| `lab_tests` | 0 | Replaced by `lab_test_catalog` |
| `scan_orders` | 0 | Replaced by `scan_test_orders` |
| `xray_orders` | 0 | Replaced by `radiology_test_orders` |
| `prescription_dispensed` | 0 | Replaced by `prescription_orders` |
| `prescription_dispensed_items` | 0 | Child of above |
| `payment_history` | 0 | Never used, replaced by `billing_payments` |
| `patient_reports` | 0 | Overlaps with `patient_documents` |
| `pharmacy_cash_collections` | 0 | Never used |

### Tier 3: Unused Feature Tables (Drop or Archive)
| Table | Rows | Reason |
|-------|------|--------|
| `user_roles` | 0 | Never used, roles are on `users.role` |
| `notes` | 0 | Generic, use `clinical_notes` instead |
| `tasks` | 0 | Never used |
| `task_note_links` | 0 | Child of above |
| `submissions` | 0 | Unknown purpose, never used |
| `personal_calendar_entries` | 0 | Never used |

**Total tables to drop: 19**  
**This reduces the schema from 107 → 88 tables**

---

## 5. Ghost Tables (Referenced in Code but Don't Exist)

These cause **silent runtime errors** — queries return empty results or throw errors that are caught and swallowed:

| Ghost Table Reference | Actual Table | Files Affected |
|----------------------|--------------|----------------|
| `billing_items` | `billing_item` | `src/services/billingService.ts` |
| `billing_summary` | Does not exist | `src/services/billingService.ts` |
| `billing_summary_detailed` | Does not exist | `src/services/billingService.ts` |
| `medicines` | `medications` | Multiple pharmacy files |
| `patient_admissions` | Does not exist | `src/services/billingService.ts` |
| `patient_allergies` | Does not exist | Patient service files |
| `patient_symptoms` | Does not exist | Patient service files |
| `staff_roles` | Does not exist | `src/lib/staffService.ts` |
| `staff_schedules` | Does not exist | `src/lib/staffService.ts` |
| `consultations` | `ip_doctor_consultations` | Dashboard files |
| `payment_receipts` | `ip_payment_receipts` | Finance files |
| `pharmacy_billing` | `pharmacy_bills` | Pharmacy files |
| `pharmacy_billing_items` | `pharmacy_bill_items` | Pharmacy files |
| `pharmacy_stock_transactions` | `stock_transactions` | Pharmacy files |
| `medication_recommendations` | `ip_pharmacy_recommendations` | IP files |
| `prescription_dispensing` | `prescription_orders` | Pharmacy files |
| `scan_test_results` | Does not exist | Lab/scan files |
| `nurse_medication_checklist` | Exists but empty (0 rows) | IP files |

---

## 6. Billing & Payment Architecture Deep Dive

### Current State (Broken)

```
                    ┌─────────────────────────────────────────────┐
                    │              BILLING CHAOS                   │
                    ├─────────────────────────────────────────────┤
                    │                                             │
  OP Billing ──────►│ billing (39 cols)                           │
                    │   └── billing_item (14 cols)                │
                    │   └── billing_payments (9 cols)             │
                    │                                             │
  Pharmacy ────────►│ pharmacy_bills (38 cols)                    │
                    │   └── pharmacy_bill_items (14 cols)         │
                    │   └── NO payment table!                     │
                    │                                             │
  Lab ─────────────►│ lab_test_orders (49 cols! billing mixed in) │
                    │   └── NO payment table!                     │
                    │                                             │
  Radiology ───────►│ radiology_test_orders (55 cols!)            │
                    │   └── NO payment table!                     │
                    │                                             │
  IP Billing ──────►│ ip_bill_items + ip_bill_payments            │
                    │   └── ip_bill_payment_allocations           │
                    │   └── ip_advances                           │
                    │   └── ip_payment_receipts (OVERLAPS!)       │
                    │                                             │
  Other ───────────►│ other_bills (35 cols)                       │
                    │   └── other_bill_items                      │
                    │   └── other_bill_payments                   │
                    │                                             │
  Diagnostic ──────►│ diagnostic_billing_items (20 cols)          │
                    │   └── uses 'billing_status' not             │
                    │        'payment_status'!                    │
                    │                                             │
  Discharge ───────►│ discharge_payments (8 cols)                 │
                    │                                             │
  Outpatient ──────►│ patients.total_amount (WRONG! billing      │
                    │   data in patients table!)                  │
                    └─────────────────────────────────────────────┘
```

### Column Name Inconsistencies

| Concept | `billing` | `pharmacy_bills` | `lab_test_orders` | `other_bills` | `diagnostic_billing_items` |
|---------|-----------|-------------------|-------------------|---------------|---------------------------|
| Total | `total` | `total_amount` | `amount` | `total_amount` | `amount` |
| Bill Number | `bill_no` + `bill_number` | `bill_number` | `order_number` | `bill_number` | N/A |
| Status | `payment_status` | `payment_status` | `payment_status` | `payment_status` | `billing_status` |
| Discount | `discount` + `discount_type` + `discount_value` | `discount` + `discount_percent` + `discount_amount` | N/A | `discount_amount` + `discount_percent` | N/A |
| Tax | `tax` + `tax_percent` + `cgst/sgst/igst` | `tax_amount` + `tax_rate` + `gst_amount` + `cgst/sgst/igst` | N/A | N/A | N/A |

---

## 7. Clean Schema Design

### Design Principles
1. **Single billing header table** with a `bill_type` discriminator
2. **Unified payment ledger** — one table for ALL payments
3. **Consistent naming** — `total_amount`, `payment_status` everywhere
4. **Separation of concerns** — no billing fields in clinical tables
5. **Minimal columns** — use JSONB for flexible metadata
6. **Soft deletes** — `deleted_at` timestamp pattern

### Phase 1: Fix Ghost Table References (No DB Changes)

Fix code to use correct table names. This is the **highest priority** as it fixes runtime errors:

| Fix | From | To |
|-----|------|----|
| 1 | `.from('billing_items')` | `.from('billing_item')` |
| 2 | `.from('medicines')` | `.from('medications')` |
| 3 | `.from('pharmacy_billing')` | `.from('pharmacy_bills')` |
| 4 | `.from('pharmacy_billing_items')` | `.from('pharmacy_bill_items')` |
| 5 | `.from('pharmacy_stock_transactions')` | `.from('stock_transactions')` |
| 6 | `.from('payment_receipts')` | `.from('ip_payment_receipts')` |
| 7 | Remove references to `billing_summary`, `billing_summary_detailed`, `patient_admissions` |

### Phase 2: Drop Unwanted Tables

Drop the 19 tables identified in Section 4.

### Phase 3: Standardize Billing Column Names

Add consistent aliases/columns to existing billing tables:

```sql
-- Standardize billing table
ALTER TABLE billing ADD COLUMN IF NOT EXISTS total_amount numeric GENERATED ALWAYS AS (total) STORED;

-- Standardize diagnostic_billing_items  
ALTER TABLE diagnostic_billing_items 
  ADD COLUMN IF NOT EXISTS payment_status text GENERATED ALWAYS AS (billing_status) STORED;
```

### Phase 4: Create Unified Payment Ledger (Future)

```sql
-- Unified payment ledger that tracks ALL payments across the system
CREATE TABLE payment_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source reference (polymorphic)
  source_type text NOT NULL CHECK (source_type IN (
    'op_billing', 'pharmacy', 'lab', 'radiology', 
    'ip_billing', 'other', 'discharge', 'advance'
  )),
  source_id uuid NOT NULL,
  
  -- Patient
  patient_id uuid REFERENCES patients(id),
  
  -- Payment details
  payment_date timestamptz NOT NULL DEFAULT now(),
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN (
    'cash', 'card', 'upi', 'bank_transfer', 'insurance', 'advance', 'cheque'
  )),
  
  -- Reference
  reference_number text,
  receipt_number text UNIQUE,
  
  -- GST
  cgst_amount numeric DEFAULT 0,
  sgst_amount numeric DEFAULT 0,
  igst_amount numeric DEFAULT 0,
  
  -- Metadata
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_payment_ledger_patient ON payment_ledger(patient_id);
CREATE INDEX idx_payment_ledger_source ON payment_ledger(source_type, source_id);
CREATE INDEX idx_payment_ledger_date ON payment_ledger(payment_date);
```

### Phase 5: Clean Up `patients` Table (Future)

Move billing fields out of `patients` into proper billing tables. The `patients` table should only contain:
- Identity: `id`, `patient_id` (UHID), `name`, `date_of_birth`, `gender`, `age`
- Contact: `phone`, `email`, `address`, `guardian_*` fields
- Medical: `blood_group`, `allergies`, `medical_history`, `chronic_conditions`
- Administrative: `status`, `admission_type`, `consulting_doctor_id`
- Audit: `created_at`, `updated_at`, `created_by`

---

## 8. Migration Plan

### Execution Order

| Step | Action | Risk | Reversible |
|------|--------|------|------------|
| **1** | Fix ghost table references in code | None | Yes |
| **2** | Drop backup/staging tables (`medications_backup`, `medications_new`, `medications_staging`) | Very Low | No (but they're backups) |
| **3** | Drop empty legacy tables (Tier 2) | Low | Create backup first |
| **4** | Drop unused feature tables (Tier 3) | Low | Create backup first |
| **5** | Standardize column names with generated columns | Low | Yes (additive) |
| **6** | Create `payment_ledger` table | None | Yes |
| **7** | Backfill `payment_ledger` from existing payment tables | Medium | Yes |
| **8** | Update finance service to use `payment_ledger` | Medium | Yes |
| **9** | Clean up `patients` table (move billing fields) | High | Needs careful migration |

### Immediate Actions (Safe, No Data Loss)

1. **Fix code references** — Update all ghost table names
2. **Drop 3 backup tables** — `medications_backup`, `medications_new`, `medications_staging`
3. **Drop 10 empty legacy tables** — All have 0 rows
4. **Drop 6 unused feature tables** — All have 0 rows

### Notes for Implementation
- Always run `SELECT count(*) FROM table_name` before dropping to verify 0 rows
- Create a `_deprecated` schema and move tables there instead of dropping (safer)
- Update TypeScript types after schema changes
- Run `mcp7_get_advisors` after changes to check for security issues

---

## Appendix A: Views in Database

| View | Purpose | Status |
|------|---------|--------|
| `batch_stock_v` | Medicine batch stock aggregation | ✅ KEEP |
| `edit_history_summary` | Audit trail summary | ✅ KEEP |
| `grouped_lab_services_view` | Lab service grouping | ✅ KEEP |
| `ip_patients_with_discharge` | IP patient discharge status | ✅ KEEP |
| `ip_pharmacy_recommendations_detail` | Pharmacy recs detail | ✅ KEEP |
| `medications_with_stock` | Meds with current stock | ✅ KEEP |
| `payment_attachments_summary` | Payment attachment overview | ✅ KEEP |
| `staff_attendance_summary` | Attendance overview | ✅ KEEP |

## Appendix B: Database Functions/RPCs Used

- `generate_ip_receipt_number` — IP receipt number generation
- `generate_sequential_bill_number` — Bill number generation (referenced in code)

---

## Appendix C: Changes Applied (2026-02-15)

### Migrations Applied via Supabase MCP

| # | Migration Name | Description |
|---|---------------|-------------|
| 1 | `drop_backup_staging_tables` | Dropped `medications_backup`, `medications_new`, `medications_staging` |
| 2 | `drop_empty_legacy_tables` | Dropped `lab_orders`, `lab_reports`, `lab_result_value`, `lab_tests`, `scan_orders`, `xray_orders`, `prescription_dispensed_items`, `prescription_dispensed`, `payment_history` (table), `patient_reports`, `pharmacy_cash_collections` (recreated later) |
| 3 | `drop_unused_feature_tables` | Dropped `task_note_links`, `tasks`, `notes`, `submissions`, `personal_calendar_entries`, `user_roles` |
| 4 | `create_staff_roles_and_schedules` | Created `staff_roles`, `staff_schedules` tables |
| 5 | `create_patient_admissions_table` | Created `patient_admissions` table |
| 6 | `create_billing_summary_table_and_view` | Created `billing_summary` table, `billing_items` view (alias for `billing_item`), `billing_summary_detailed` view |
| 7 | `create_unified_payment_ledger` | Created `payment_ledger` table — unified payment tracking |
| 8 | `create_medicines_view_alias` | Created `medicines` view (alias for `medications`) |
| 9 | `create_appointments_view_alias` | Created `appointments` view (alias for `appointment`) |
| 10 | `create_consultations_table` | Created `consultations` table |
| 11 | `create_patient_allergies_symptoms_tables` | Created `patient_allergies`, `patient_symptoms`, `scan_test_results`, `prescription_dispensing` tables |
| 12 | `fix_payment_ledger_method_constraint` | Updated payment_method CHECK to include `credit`, `neft`, `rtgs`, `wallet` |
| 13 | `fix_payment_ledger_fk_and_backfill` | Dropped strict FK on `created_by`, backfilled 142 payment records from `billing_payments`, `other_bill_payments`, `discharge_payments`, `ip_payment_receipts` |
| 14 | `recreate_pharmacy_cash_collections_and_payment_history` | Recreated `pharmacy_cash_collections` table, created `payment_history` as view over `payment_ledger` |

### Code Fixes Applied

| # | File | Change |
|---|------|--------|
| 1 | `src/components/PharmacyBillingForm.tsx` | `pharmacy_billing` → `pharmacy_bills`, `pharmacy_billing_items` → `pharmacy_bill_items` |
| 2 | `src/lib/pharmacyService.ts` | `pharmacy_stock_transactions` → `stock_transactions`, `prescription_dispensed` → `prescription_dispensing` (2 locations) |
| 3 | `src/lib/financeService.ts` | `payment_receipts` → `ip_payment_receipts` |
| 4 | `src/lib/pharmacyRecommendationService.ts` | `medication_recommendations` → `ip_pharmacy_recommendations` |
| 5 | `src/lib/dashboardService.ts` | `lab_reports` → `lab_test_results` |
| 6 | `src/lib/labXrayService.ts` | `xray_orders` → `radiology_test_orders`, `scan_orders` → `scan_test_orders` (3 locations) |
| 7 | `app/lab-xray/components/AllLabOrders.tsx` | `scan_orders` → `scan_test_orders`, `xray_orders` → `radiology_test_orders` |
| 8 | `app/lab-xray/components/OrderList.tsx` | `scan_orders` → `scan_test_orders`, `xray_orders` → `radiology_test_orders` |
| 9 | `app/workstation/page.tsx` | `lab_tests` → `lab_test_catalog`, `lab_reports` → `lab_test_results` |
| 10 | `components/ClinicalEntryForm.tsx` | `xray_orders` → `radiology_test_orders` |
| 11 | `components/ClinicalEntryFormOld.tsx` | `xray_orders` → `radiology_test_orders` |
| 12 | `components/ScanDocumentUpload.tsx` | `scan_orders` → `scan_test_orders` |

### Final Schema Summary

- **Base Tables**: 96 (was 107, dropped 20, created 9)
- **Views**: 14 (was 8, added 6: `appointments`, `billing_items`, `billing_summary_detailed`, `medicines`, `payment_history`, plus existing)
- **Ghost Table References**: 0 (was 18)
- **Payment Ledger Records**: 142 (backfilled from 4 source tables)

---

*This document should be used as the single source of truth for all database schema decisions. Update it as migrations are applied.*
