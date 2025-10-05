# Legacy Views Rollback Documentation

## Overview
This document provides rollback procedures for the legacy views that were dropped in Step 1 of the database cleanup process.

## Dropped Views
The following views were successfully removed from the `public` schema:
- `active_admissions`
- `appointments_legacy`
- `billing_items_details`
- `billing_items_legacy`
- `billing_summary_details`
- `lab_results_legacy`

## Rollback Procedure

### If You Need to Recreate These Views

**Note**: These views were legacy compatibility views. In most cases, you should use the new normalized tables in the `core` schema instead.

### 1. Active Admissions View
```sql
-- Recreate active_admissions view (if absolutely needed)
CREATE VIEW public.active_admissions AS
SELECT 
    pa.id,
    pa.patient_id,
    pa.admission_date,
    pa.discharge_date,
    pa.status,
    p.first_name,
    p.last_name
FROM public.patient_admissions pa
JOIN public.patients p ON pa.patient_id = p.id
WHERE pa.status = 'active' AND pa.discharge_date IS NULL;
```

### 2. Appointments Legacy View
```sql
-- Recreate appointments_legacy view (if absolutely needed)
CREATE VIEW public.appointments_legacy AS
SELECT 
    a.id,
    a.patient_id,
    a.doctor_id,
    a.appointment_date,
    a.status,
    a.notes
FROM public.appointments a;
```

### 3. Billing Items Details View
```sql
-- Recreate billing_items_details view (if absolutely needed)
CREATE VIEW public.billing_items_details AS
SELECT 
    bi.id,
    bi.billing_id,
    bi.description,
    bi.quantity,
    bi.unit_price,
    bi.total_amount,
    b.patient_id,
    b.billing_date
FROM public.billing_items bi
JOIN public.billing b ON bi.billing_id = b.id;
```

### 4. Billing Items Legacy View
```sql
-- Recreate billing_items_legacy view (if absolutely needed)
CREATE VIEW public.billing_items_legacy AS
SELECT 
    id,
    billing_id,
    description,
    quantity,
    unit_price,
    total_amount,
    created_at,
    updated_at
FROM public.billing_items;
```

### 5. Billing Summary Details View
```sql
-- Recreate billing_summary_details view (if absolutely needed)
CREATE VIEW public.billing_summary_details AS
SELECT 
    bs.id,
    bs.patient_id,
    bs.total_amount,
    bs.paid_amount,
    bs.balance,
    bs.status,
    bs.summary_date,
    p.first_name,
    p.last_name
FROM public.billing_summaries bs
JOIN public.patients p ON bs.patient_id = p.id;
```

### 6. Lab Results Legacy View
```sql
-- Recreate lab_results_legacy view (if absolutely needed)
CREATE VIEW public.lab_results_legacy AS
SELECT 
    lr.id,
    lr.lab_order_id,
    lr.test_name,
    lr.result_value,
    lr.reference_range,
    lr.status,
    lr.result_date,
    lo.patient_id
FROM public.lab_results lr
JOIN public.lab_orders lo ON lr.lab_order_id = lo.id;
```

## Recommended Alternative

Instead of recreating these legacy views, consider using the new normalized schema:

### Use Core Schema Tables
- `core.persons` - Central person registry
- `core.facilities` - Facility management
- `core.staff` - Staff information
- `core.patients` - Patient records (linked to persons)

### Modern Query Examples
```sql
-- Instead of active_admissions view, use:
SELECT 
    pa.id,
    pa.patient_id,
    pa.admission_date,
    pa.discharge_date,
    pa.status,
    cp.first_name,
    cp.last_name
FROM public.patient_admissions pa
JOIN core.patients cp ON pa.patient_id = cp.id
WHERE pa.status = 'active' AND pa.discharge_date IS NULL;

-- Instead of billing_items_details view, use:
SELECT 
    bi.id,
    bi.billing_id,
    bi.description,
    bi.quantity,
    bi.unit_price,
    bi.total_amount,
    b.patient_id,
    b.billing_date,
    cp.first_name,
    cp.last_name
FROM public.billing_items bi
JOIN public.billing b ON bi.billing_id = b.id
JOIN core.patients cp ON b.patient_id = cp.id;
```

## Verification After Rollback

If you do recreate any views, verify they work correctly:

```sql
-- Test the recreated view
SELECT COUNT(*) FROM public.active_admissions;

-- Check view definition
SELECT definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'active_admissions';
```

## Important Notes

1. **Data Migration**: These views were compatibility layers. The underlying data has been migrated to the new normalized schema.

2. **Security**: If you recreate views, ensure they have appropriate RLS policies if needed.

3. **Performance**: The new normalized schema with proper indexes should perform better than these legacy views.

4. **Maintenance**: Consider this an opportunity to update your application code to use the new schema directly.

## Contact

If you need assistance with the rollback or migration to the new schema, refer to the main database documentation files:
- `DATABASE_SCHEMA.md`
- `SCHEMA_RELATIONSHIPS.md`
- `COMPLETE_DATA_SCHEMA.md`