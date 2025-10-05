# Step 2 Legacy Tables Rollback Documentation

## Overview
This document provides rollback procedures for Step 2 of the database cleanup process, which removed legacy scheduling tables `public.appointments` and `public.patient_admissions`.

## What Was Removed

### Tables Dropped
- ✅ `public.appointments` (contained 11 rows)
- ✅ `public.patient_admissions` (contained 0 rows)

### Foreign Key Constraints Removed
- ✅ `prescriptions_appointment_id_fkey` (prescriptions → appointments)
- ✅ `billing_appointment_id_fkey` (billing_legacy → appointments)
- ✅ `billing_summaries_patient_admission_id_fkey` (billing_summaries → patient_admissions)

### Canonical Tables Preserved
- ✅ `public.encounter` - Modern encounter tracking
- ✅ `public.appointment` - Singular appointment scheduling

## Rollback Procedures

### Option A: Restore from Database Backup
**Recommended for production environments**

```sql
-- If you have a database backup from before Step 2:
-- 1. Restore the entire database from backup
-- 2. Re-run only Step 1 (view cleanup) if needed
-- 3. Skip Step 2 if you need to keep legacy tables
```

### Option B: Recreate Tables Manually
**Use only if you understand the data relationships**

#### 1. Recreate appointments table
```sql
CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES public.patients(id),
    doctor_id uuid REFERENCES public.doctors(id),
    appointment_date date,
    appointment_time time,
    duration_minutes integer DEFAULT 30,
    status varchar CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    reason text,
    notes text,
    priority varchar CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    created_by uuid REFERENCES public.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (adjust as needed for your security model)
CREATE POLICY "Users can view appointments" ON public.appointments
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage appointments" ON public.appointments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'doctor', 'nurse', 'receptionist')
        )
    );
```

#### 2. Recreate patient_admissions table
```sql
CREATE TABLE public.patient_admissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES public.patients(id),
    admission_number varchar,
    admission_date timestamptz DEFAULT now(),
    discharge_date timestamptz,
    admission_type varchar CHECK (admission_type IN ('emergency', 'elective', 'transfer')),
    department varchar,
    attending_doctor varchar,
    diagnosis text,
    treatment_plan text,
    status varchar CHECK (status IN ('admitted', 'discharged', 'transferred')) DEFAULT 'admitted',
    discharge_summary text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_admissions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view patient admissions" ON public.patient_admissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage admissions" ON public.patient_admissions
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
ALTER TABLE public.prescriptions 
ADD CONSTRAINT prescriptions_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);

ALTER TABLE public.billing_legacy 
ADD CONSTRAINT billing_appointment_id_fkey 
FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);

ALTER TABLE public.billing_summaries 
ADD CONSTRAINT billing_summaries_patient_admission_id_fkey 
FOREIGN KEY (patient_admission_id) REFERENCES public.patient_admissions(id);
```

### Option C: Archive Approach (Safer Alternative)
**For future cleanup operations, consider using RENAME instead of DROP**

```sql
-- Instead of dropping, rename tables for archival
BEGIN;
DO $$ 
BEGIN 
  IF to_regclass('public.appointments') IS NOT NULL THEN 
    ALTER TABLE public.appointments RENAME TO appointments_legacy_archive; 
  END IF; 
  IF to_regclass('public.patient_admissions') IS NOT NULL THEN 
    ALTER TABLE public.patient_admissions RENAME TO patient_admissions_legacy_archive; 
  END IF; 
END $$; 
COMMIT;

-- To restore from archive:
-- ALTER TABLE public.appointments_legacy_archive RENAME TO appointments;
-- ALTER TABLE public.patient_admissions_legacy_archive RENAME TO patient_admissions;
```

## Data Migration Considerations

### Lost Data
- **11 appointment records** from the legacy appointments table
- **0 patient admission records** (table was empty)
- **Foreign key relationships** that linked prescriptions and billing to appointments

### Modern Alternatives
Instead of restoring legacy tables, consider migrating to the canonical schema:

```sql
-- Use public.appointment (singular) for new appointments
-- Use public.encounter for patient encounters and visits
-- Link prescriptions directly to encounters or patients

-- Example: Update prescriptions to use encounter_id instead of appointment_id
ALTER TABLE public.prescriptions 
ADD COLUMN encounter_id uuid REFERENCES public.encounter(id);

-- Migrate existing prescription data if needed
-- UPDATE public.prescriptions SET encounter_id = ... WHERE ...;

-- Eventually drop the old appointment_id column
-- ALTER TABLE public.prescriptions DROP COLUMN appointment_id;
```

## Verification After Rollback

If you restore the tables, verify they work correctly:

```sql
-- Check table existence
SELECT to_regclass('public.appointments') AS appointments_restored,
       to_regclass('public.patient_admissions') AS patient_admissions_restored;

-- Check foreign key constraints
SELECT tc.constraint_name, tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('prescriptions', 'billing_legacy', 'billing_summaries')
  AND kcu.column_name IN ('appointment_id', 'patient_admission_id');

-- Test basic operations
INSERT INTO public.appointments (patient_id, doctor_id, appointment_date, appointment_time)
SELECT p.id, d.id, CURRENT_DATE + 1, '10:00:00'
FROM public.patients p, public.doctors d 
LIMIT 1;

-- Clean up test data
DELETE FROM public.appointments WHERE appointment_date = CURRENT_DATE + 1;
```

## Important Notes

1. **Data Loss**: The 11 appointment records are permanently lost unless restored from backup
2. **Schema Evolution**: Consider migrating to the modern `encounter` + `appointment` pattern instead of restoring legacy tables
3. **Dependencies**: Ensure all dependent tables and constraints are properly restored
4. **Security**: RLS policies must be recreated and tested
5. **Application Code**: Update application code to handle the restored table structure

## Recommended Approach

For production systems:
1. **Restore from backup** if legacy data is critical
2. **Migrate to modern schema** for new development
3. **Use archive approach** for future cleanup operations
4. **Test thoroughly** after any rollback operation

## Contact

For assistance with rollback procedures, refer to:
- `DATABASE_SCHEMA.md` - Complete schema documentation
- `SCHEMA_RELATIONSHIPS.md` - Relationship mappings
- `LEGACY_VIEWS_ROLLBACK.md` - Step 1 rollback procedures