# Step 6 Database Cleanup - Legacy Billing Tables Rollback Documentation

## Overview
This document provides rollback procedures for Step 6 of the database cleanup, which involved removing legacy/parallel billing tables while preserving the canonical billing data model.

## Changes Made

### Tables Removed
- `public.billing_legacy` - **Existed** (0 rows) - Removed with foreign key constraints
- `public.billing_summaries` - **Existed** (0 rows) - Removed with dependent table
- `public.billing_items` (plural) - **Existed** (0 rows) - Removed (dependent on billing_summaries)
- `public.pharmacy_bills` - **Existed** (9 rows) - **DATA LOSS OCCURRED**
- `public.pharmacy_bill_items` - **Existed** (dependent on pharmacy_bills) - Removed

### Functions Removed
- `public.create_pharmacy_bill_with_items(uuid,jsonb,numeric,numeric,text,uuid)` - Removed (dependent on pharmacy_bills)
- `public.update_pharmacy_billing_updated_at()` - Removed (dependent on pharmacy_bills)

### Tables Created/Enhanced
- `public.payment_history` - **Created** (canonical payment tracking table)

### Reference Data Added
- Bill status codes: 'draft', 'issued', 'paid'
- Payment method codes: 'cash', 'card', 'upi'

### Tables Preserved (Canonical Trio)
- `public.billing` - **Exists** (canonical billing table)
- `public.billing_item` - **Exists** (canonical billing items table)
- `public.payment_history` - **Exists** (newly created canonical payment history)

## Discovery Results
- `billing_legacy`: 0 rows (empty)
- `billing_summaries`: 0 rows (empty)
- `billing_items` (plural): 0 rows (empty)
- `pharmacy_bills`: **9 rows (DATA LOST)**

## ⚠️ Data Loss Assessment
**CRITICAL**: Data loss occurred during this cleanup:
- **`pharmacy_bills`**: 9 rows of pharmacy billing data were permanently deleted
- **`pharmacy_bill_items`**: Associated line items were also deleted
- **Functions**: Two pharmacy billing functions were removed

## Rollback Options

### Option 1: Restore from Database Backup (STRONGLY RECOMMENDED)
If you have a recent database backup from before Step 6:
```sql
-- Restore entire database from backup
-- This will restore all deleted tables, functions, and the 9 rows of pharmacy_bills data
-- Contact your database administrator for backup restoration
```

### Option 2: Manual Recreation (Partial Recovery)
⚠️ **WARNING**: This will NOT recover the lost 9 rows of pharmacy_bills data

```sql
-- Recreate the legacy billing structure (without data)
CREATE TABLE public.billing_legacy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES public.patients(id),
    bed_allocation_id uuid REFERENCES public.bed_allocations(id),
    created_by uuid REFERENCES public.users(id),
    -- Add other columns based on your original schema
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE public.billing_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Add columns based on your original schema
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE public.billing_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_summary_id uuid REFERENCES public.billing_summaries(id),
    fee_rate_id uuid REFERENCES public.fee_rates(id),
    -- Add other columns based on your original schema
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE public.pharmacy_bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid REFERENCES public.patients(id),
    -- Add other columns based on your original schema
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE public.pharmacy_bill_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id uuid REFERENCES public.pharmacy_bills(id),
    -- Add other columns based on your original schema
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- Recreate functions (structure needs to be determined from backup)
-- CREATE OR REPLACE FUNCTION public.create_pharmacy_bill_with_items(...)
-- CREATE OR REPLACE FUNCTION public.update_pharmacy_billing_updated_at()
```

### Option 3: Data Migration to Canonical Tables (RECOMMENDED FOR FUTURE)
Instead of restoring legacy tables, migrate any recovered data to canonical tables:
```sql
-- Example migration (after data recovery from backup)
-- INSERT INTO public.billing (patient_id, total_amount, status_id, ...)
-- SELECT patient_id, total_amount, 
--        (SELECT id FROM ref_code WHERE domain='bill_status' AND code='issued'),
--        ...
-- FROM public.pharmacy_bills_backup;
```

## Verification Commands
To verify the current state:
```sql
-- Check that legacy tables are gone
SELECT to_regclass('public.billing_legacy') AS billing_legacy_present,
       to_regclass('public.billing_summaries') AS billing_summaries_present,
       to_regclass('public.billing_items') AS billing_items_plural_present,
       to_regclass('public.pharmacy_bills') AS pharmacy_bills_present;
-- Expected: all should be NULL

-- Check that canonical tables exist
SELECT to_regclass('public.billing') AS billing_present,
       to_regclass('public.billing_item') AS billing_item_present,
       to_regclass('public.payment_history') AS payment_history_present;
-- Expected: all should show table names (not NULL)

-- Check reference codes
SELECT domain, code, label FROM public.ref_code 
WHERE domain IN ('bill_status', 'payment_method')
ORDER BY domain, code;
```

## Important Considerations
1. **Data Loss**: 9 rows of pharmacy billing data were permanently lost
2. **Function Dependencies**: Two pharmacy billing functions were removed
3. **Schema Consolidation**: Successfully established canonical billing model
4. **Future Development**: Use only canonical tables (`billing`, `billing_item`, `payment_history`)
5. **Backup Strategy**: Ensure regular backups before future cleanup operations

## Recovery Priority
1. **IMMEDIATE**: Restore from backup if pharmacy billing data is critical
2. **SHORT-TERM**: Implement data entry procedures using canonical tables
3. **LONG-TERM**: Establish proper data migration procedures for future cleanups

## Contact Information
For questions about this rollback procedure, data recovery, or database restoration, contact your database administrator or development team immediately.

---
*Generated on: $(date)*
*Step: 6 - Legacy Billing Tables Cleanup*
*Status: Completed with Data Loss*
*Critical Action Required: Consider backup restoration for pharmacy_bills data*