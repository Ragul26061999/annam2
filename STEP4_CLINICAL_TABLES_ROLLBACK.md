# Step 4 Clinical Tables Rollback Documentation

## Overview
This document provides rollback procedures for Step 4 of the database cleanup process, which removed unused clinical tables that were duplicates of functionality provided by canonical tables.

## What Was Removed

### Tables Dropped
- ✅ `public.patient_allergies` (contained 0 rows) - Duplicate of medical_history functionality
- ✅ `public.patient_symptoms` (contained 0 rows) - Duplicate of encounter notes functionality

### Canonical Tables Preserved
- ✅ `public.vitals` - Patient vital signs tracking
- ✅ `public.medical_history` - Comprehensive medical history including allergies
- ✅ `public.encounter` - Clinical encounters with notes for symptoms

## Discovery Results

**Before Cleanup:**
- `public.patient_allergies` - ✅ Existed (0 rows)
- `public.patient_symptoms` - ✅ Existed (0 rows)
- `public.vitals` - ✅ Canonical table (preserved)
- `public.medical_history` - ✅ Canonical table (preserved)

**After Cleanup:**
- `allergies_present` = `NULL` ✅
- `symptoms_present` = `NULL` ✅
- `vitals_present` = `vitals` ✅
- `med_hist_present` = `medical_history` ✅

## Rollback Procedures

### Option A: Restore from Database Backup
**Recommended for production environments**

```sql
-- If you have a database backup from before Step 4:
-- 1. Restore the entire database from backup
-- 2. Re-run Steps 1, 2, and 3 if needed
-- 3. Skip Step 4 if you need to keep clinical tables
```

### Option B: Recreate Tables Manually
**Use only if you understand the clinical data model**

#### 1. Recreate public.patient_allergies table
```sql
-- Note: This recreates the structure but data will be lost
CREATE TABLE public.patient_allergies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    allergy_name varchar NOT NULL,
    allergy_type varchar CHECK (allergy_type IN ('food', 'medication', 'environmental', 'other')),
    severity varchar CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    reaction_description text,
    onset_date date,
    diagnosed_by uuid REFERENCES public.users(id),
    notes text,
    status varchar DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view patient allergies" ON public.patient_allergies
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage allergies" ON public.patient_allergies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'doctor', 'nurse')
        )
    );

-- Add indexes for performance
CREATE INDEX idx_patient_allergies_patient_id ON public.patient_allergies(patient_id);
CREATE INDEX idx_patient_allergies_status ON public.patient_allergies(status);
CREATE INDEX idx_patient_allergies_severity ON public.patient_allergies(severity);
```

#### 2. Recreate public.patient_symptoms table
```sql
-- Note: This recreates the structure but data will be lost
CREATE TABLE public.patient_symptoms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id uuid REFERENCES public.encounter(id) ON DELETE CASCADE,
    symptom_name varchar NOT NULL,
    symptom_category varchar CHECK (symptom_category IN ('pain', 'respiratory', 'gastrointestinal', 'neurological', 'cardiovascular', 'dermatological', 'other')),
    severity varchar CHECK (severity IN ('mild', 'moderate', 'severe')),
    duration_description varchar,
    onset_date timestamptz,
    resolution_date timestamptz,
    description text,
    location_on_body varchar,
    aggravating_factors text,
    relieving_factors text,
    associated_symptoms text,
    recorded_by uuid REFERENCES public.users(id),
    status varchar DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'chronic')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_symptoms ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view patient symptoms" ON public.patient_symptoms
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can manage symptoms" ON public.patient_symptoms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'doctor', 'nurse')
        )
    );

-- Add indexes for performance
CREATE INDEX idx_patient_symptoms_patient_id ON public.patient_symptoms(patient_id);
CREATE INDEX idx_patient_symptoms_encounter_id ON public.patient_symptoms(encounter_id);
CREATE INDEX idx_patient_symptoms_status ON public.patient_symptoms(status);
CREATE INDEX idx_patient_symptoms_severity ON public.patient_symptoms(severity);
CREATE INDEX idx_patient_symptoms_onset_date ON public.patient_symptoms(onset_date);
```

### Option C: Modern Data Migration Approach
**Recommended: Use canonical tables instead of recreating duplicates**

Instead of recreating the dropped tables, consider using the modern canonical approach:

#### For Allergies - Use medical_history table
```sql
-- Store allergies in medical_history with proper categorization
INSERT INTO public.medical_history (
    patient_id,
    category,
    condition_name,
    diagnosis_date,
    severity,
    status,
    notes,
    diagnosed_by,
    created_at
)
VALUES (
    'patient-uuid-here',
    'allergy',
    'Penicillin Allergy',
    '2024-01-15',
    'severe',
    'active',
    'Patient experiences severe allergic reaction to penicillin including hives and difficulty breathing',
    'doctor-uuid-here',
    now()
);

-- Query allergies from medical_history
SELECT 
    patient_id,
    condition_name AS allergy_name,
    severity,
    diagnosis_date AS onset_date,
    notes AS reaction_description,
    status
FROM public.medical_history 
WHERE category = 'allergy' 
AND patient_id = 'patient-uuid-here';
```

#### For Symptoms - Use encounter notes
```sql
-- Store symptoms in encounter with structured notes
INSERT INTO public.encounter (
    patient_id,
    doctor_id,
    encounter_type,
    chief_complaint,
    notes,
    diagnosis,
    status,
    scheduled_at
)
VALUES (
    'patient-uuid-here',
    'doctor-uuid-here',
    'consultation',
    'Chest pain and shortness of breath',
    'Patient reports chest pain (severity: moderate, duration: 2 hours, location: central chest). Associated symptoms include shortness of breath and mild nausea. Pain worsens with deep breathing.',
    'Possible angina - requires further investigation',
    'completed',
    now()
);

-- Query symptoms from encounter notes
SELECT 
    patient_id,
    chief_complaint,
    notes,
    diagnosis,
    scheduled_at AS symptom_onset,
    doctor_id AS recorded_by
FROM public.encounter 
WHERE patient_id = 'patient-uuid-here'
AND notes ILIKE '%symptom%' OR chief_complaint IS NOT NULL;
```

## Data Loss Assessment

### Lost Data
- **No data lost** - Both tables were empty (0 rows each)
- **No relationships lost** - Tables had no foreign key dependencies
- **No functionality lost** - Equivalent functionality exists in canonical tables

### Data Preserved
- **All medical history** in canonical `public.medical_history` table
- **All encounter data** in canonical `public.encounter` table
- **All vital signs** in canonical `public.vitals` table
- **All patient relationships** remain intact

## Important Considerations

### Why These Tables Were Removed
1. **Functional Duplication** - Allergies are better stored in `medical_history` with category='allergy'
2. **Symptoms Redundancy** - Symptoms are captured in encounter `chief_complaint` and `notes`
3. **Data Consistency** - Single source of truth prevents data fragmentation
4. **Simplified Queries** - No need to join multiple tables for clinical data

### Modern Clinical Data Model
```sql
-- Allergies in medical_history
SELECT * FROM medical_history WHERE category = 'allergy';

-- Symptoms in encounter data
SELECT chief_complaint, notes FROM encounter WHERE patient_id = ?;

-- Vital signs in dedicated table
SELECT * FROM vitals WHERE patient_id = ?;
```

## Verification After Rollback

If you restore the tables, verify they work correctly:

```sql
-- Check table existence
SELECT to_regclass('public.patient_allergies') AS allergies_restored,
       to_regclass('public.patient_symptoms') AS symptoms_restored;

-- Check canonical tables still exist
SELECT to_regclass('public.medical_history') AS med_hist_present,
       to_regclass('public.encounter') AS encounter_present,
       to_regclass('public.vitals') AS vitals_present;

-- Test basic operations
INSERT INTO public.patient_allergies (patient_id, allergy_name, severity)
VALUES ((SELECT id FROM public.patients LIMIT 1), 'Test Allergy', 'mild');

INSERT INTO public.patient_symptoms (patient_id, symptom_name, severity)
VALUES ((SELECT id FROM public.patients LIMIT 1), 'Test Symptom', 'mild');

-- Clean up test data
DELETE FROM public.patient_allergies WHERE allergy_name = 'Test Allergy';
DELETE FROM public.patient_symptoms WHERE symptom_name = 'Test Symptom';
```

## Recommended Approach

For production systems:

1. **Use canonical tables** - Store allergies in `medical_history`, symptoms in `encounter`
2. **Implement structured data** - Use JSON fields for complex symptom/allergy data if needed
3. **Create views** - Build views that present data in the old table format if applications need it
4. **Update application code** - Modify queries to use canonical tables
5. **Implement validation** - Add constraints to ensure data quality

## Modern Schema Benefits

By using canonical tables instead of duplicates, you gain:
- **Single source of truth** - All clinical data in appropriate canonical tables
- **Better relationships** - Clear foreign key paths to patients and encounters
- **Improved queries** - No need to union data from multiple similar tables
- **Enhanced reporting** - Comprehensive clinical data in structured format
- **Easier maintenance** - Fewer tables to manage and maintain

## Alternative: Create Views Instead of Tables

If applications need the old table structure, create views:

```sql
-- View for allergies from medical_history
CREATE VIEW patient_allergies AS
SELECT 
    id,
    patient_id,
    condition_name AS allergy_name,
    'medical' AS allergy_type,
    severity,
    notes AS reaction_description,
    diagnosis_date AS onset_date,
    diagnosed_by,
    status,
    created_at,
    updated_at
FROM public.medical_history 
WHERE category = 'allergy';

-- View for symptoms from encounter data
CREATE VIEW patient_symptoms AS
SELECT 
    id,
    patient_id,
    id AS encounter_id,
    chief_complaint AS symptom_name,
    'general' AS symptom_category,
    'moderate' AS severity,
    notes AS description,
    scheduled_at AS onset_date,
    doctor_id AS recorded_by,
    status,
    created_at,
    updated_at
FROM public.encounter 
WHERE chief_complaint IS NOT NULL;
```

## Contact

For assistance with rollback procedures, refer to:
- `DATABASE_SCHEMA.md` - Complete schema documentation
- `ALL_DATABASE_TABLES.md` - Current table listings
- `STEP3_DUPLICATE_TABLES_ROLLBACK.md` - Previous cleanup procedures
- `STEP2_LEGACY_TABLES_ROLLBACK.md` - Legacy table cleanup
- `LEGACY_VIEWS_ROLLBACK.md` - Step 1 rollback procedures

## Next Steps

Consider implementing:
1. **Structured clinical data** in canonical tables
2. **JSON fields** for complex symptom/allergy details
3. **Clinical decision support** using consolidated data
4. **Reporting dashboards** leveraging canonical schema
5. **Data validation rules** to maintain clinical data quality