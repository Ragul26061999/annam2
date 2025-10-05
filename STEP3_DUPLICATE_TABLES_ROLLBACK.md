# Step 3 Duplicate Tables Rollback Documentation

## Overview
This document provides rollback procedures for Step 3 of the database cleanup process, which removed duplicate patient tables while preserving the canonical schema.

## What Was Removed

### Tables Dropped
- ✅ `public.patient` (contained 8 rows) - Duplicate of `public.patients`
- ✅ `public.patient_vitals` (did not exist) - Would have been duplicate of `public.vitals`

### Foreign Key Constraints Removed
- ✅ `encounter_patient_id_fkey` (encounter → patient)
- ✅ `billing_patient_id_fkey1` (billing → patient)

### Canonical Tables Preserved
- ✅ `public.patients` - Main patient records (5 rows)
- ✅ `public.vitals` - Patient vital signs tracking

## Discovery Results

**Before Cleanup:**
- `public.patient` - ✅ Existed (8 rows)
- `public.patient_vitals` - ❌ Did not exist
- `public.patients` - ✅ Canonical table (5 rows)
- `public.vitals` - ✅ Canonical table (0 rows)

**After Cleanup:**
- `patient_present` = `NULL` ✅
- `patient_vitals_present` = `NULL` ✅
- `patients_present` = `patients` ✅
- `vitals_present` = `vitals` ✅

## Rollback Procedures

### Option A: Restore from Database Backup
**Recommended for production environments**

```sql
-- If you have a database backup from before Step 3:
-- 1. Restore the entire database from backup
-- 2. Re-run Steps 1 and 2 if needed
-- 3. Skip Step 3 if you need to keep duplicate tables
```

### Option B: Recreate Tables Manually
**Use only if you understand the data relationships**

#### 1. Recreate public.patient table
```sql
-- Note: This recreates the structure but data will be lost
CREATE TABLE public.patient (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id varchar UNIQUE,
    name varchar NOT NULL,
    date_of_birth date,
    gender varchar CHECK (gender IN ('male', 'female', 'other')),
    phone varchar,
    email varchar,
    address text,
    emergency_contact_name varchar,
    emergency_contact_phone varchar,
    blood_group varchar,
    allergies text,
    medical_history text,
    insurance_number varchar,
    insurance_provider varchar,
    status varchar DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view patients" ON public.patient
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage patients" ON public.patient
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'doctor', 'nurse', 'receptionist')
        )
    );
```

#### 2. Recreate public.patient_vitals table (if needed)
```sql
-- This table didn't exist, but if you need it:
CREATE TABLE public.patient_vitals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES public.patient(id),
    recorded_date timestamptz DEFAULT now(),
    temperature numeric,
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    heart_rate integer,
    respiratory_rate integer,
    oxygen_saturation numeric,
    weight numeric,
    height numeric,
    bmi numeric,
    recorded_by uuid REFERENCES public.users(id),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view patient vitals" ON public.patient_vitals
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage vitals" ON public.patient_vitals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'doctor', 'nurse')
        )
    );
```

#### 3. Restore Foreign Key Constraints
```sql
-- Restore foreign key constraints that were dropped
ALTER TABLE public.encounter 
ADD CONSTRAINT encounter_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patient(id);

ALTER TABLE public.billing 
ADD CONSTRAINT billing_patient_id_fkey1 
FOREIGN KEY (patient_id) REFERENCES public.patient(id);
```

### Option C: Data Migration Approach
**Recommended: Migrate data from canonical to duplicate tables**

```sql
-- If you need the duplicate table, populate it from canonical data
INSERT INTO public.patient (
    id, patient_id, name, date_of_birth, gender, phone, email, address,
    emergency_contact_name, emergency_contact_phone, blood_group, allergies,
    medical_history, insurance_number, insurance_provider, status,
    created_at, updated_at
)
SELECT 
    id, patient_id, name, date_of_birth, gender, phone, email, address,
    emergency_contact_name, emergency_contact_phone, blood_group, allergies,
    medical_history, insurance_number, insurance_provider, status,
    created_at, updated_at
FROM public.patients;

-- Migrate vitals data if needed
INSERT INTO public.patient_vitals (
    patient_id, recorded_date, temperature, blood_pressure_systolic,
    blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation,
    weight, height, bmi, recorded_by, notes, created_at, updated_at
)
SELECT 
    patient_id, recorded_date, temperature, blood_pressure_systolic,
    blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation,
    weight, height, bmi, recorded_by, notes, created_at, updated_at
FROM public.vitals;
```

## Data Loss Assessment

### Lost Data
- **8 patient records** from the duplicate `public.patient` table
- **Foreign key relationships** that linked encounters and billing to the duplicate patient table
- **No data lost** from `public.patient_vitals` (table didn't exist)

### Data Preserved
- **5 patient records** in canonical `public.patients` table
- **All vitals data** in canonical `public.vitals` table
- **All other relationships** remain intact

## Important Considerations

### Schema Differences
The duplicate `public.patient` table had **8 rows** while the canonical `public.patients` has **5 rows**. This suggests:

1. **Data inconsistency** existed between the tables
2. **Some patient records** were only in the duplicate table
3. **Applications might have been using both tables** inconsistently

### Recommended Actions Before Rollback
```sql
-- If you need to restore, first analyze the data differences:
-- (This query won't work now since patient table is dropped, but for future reference)

-- Compare patient counts and identify missing records
SELECT 'canonical_only' AS source, patient_id, name 
FROM public.patients 
WHERE patient_id NOT IN (SELECT patient_id FROM public.patient WHERE patient_id IS NOT NULL)

UNION ALL

SELECT 'duplicate_only' AS source, patient_id, name 
FROM public.patient 
WHERE patient_id NOT IN (SELECT patient_id FROM public.patients WHERE patient_id IS NOT NULL);
```

## Verification After Rollback

If you restore the tables, verify they work correctly:

```sql
-- Check table existence
SELECT to_regclass('public.patient') AS patient_restored,
       to_regclass('public.patient_vitals') AS patient_vitals_restored;

-- Check foreign key constraints
SELECT tc.constraint_name, tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('encounter', 'billing')
  AND kcu.column_name = 'patient_id';

-- Compare data between canonical and duplicate tables
SELECT 
    (SELECT count(*) FROM public.patients) AS canonical_count,
    (SELECT count(*) FROM public.patient) AS duplicate_count;

-- Test basic operations
INSERT INTO public.patient (patient_id, name, status)
VALUES ('TEST001', 'Test Patient', 'active');

-- Clean up test data
DELETE FROM public.patient WHERE patient_id = 'TEST001';
```

## Recommended Approach

For production systems:

1. **Analyze data differences** before any rollback
2. **Migrate missing data** from backup to canonical tables instead of restoring duplicates
3. **Update application code** to use only canonical tables (`public.patients`, `public.vitals`)
4. **Implement data validation** to prevent future inconsistencies
5. **Use single source of truth** - avoid duplicate table structures

## Modern Schema Benefits

By keeping only canonical tables, you gain:
- **Data consistency** - single source of truth
- **Simplified queries** - no need to choose between duplicate tables
- **Better performance** - no duplicate data storage
- **Easier maintenance** - single schema to manage
- **Cleaner relationships** - clear foreign key paths

## Contact

For assistance with rollback procedures, refer to:
- `DATABASE_SCHEMA.md` - Complete schema documentation
- `ALL_DATABASE_TABLES.md` - Current table listings
- `STEP2_LEGACY_TABLES_ROLLBACK.md` - Previous cleanup procedures
- `LEGACY_VIEWS_ROLLBACK.md` - Step 1 rollback procedures

## Next Steps

Consider implementing:
1. **Data validation rules** to prevent duplicate patient records
2. **Application layer checks** to ensure single table usage
3. **Regular data audits** to maintain consistency
4. **Backup strategies** that account for schema changes