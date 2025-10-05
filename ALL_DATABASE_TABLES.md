# Hospital Management System - All Database Tables

## Overview
This document contains a complete listing of all tables in the Hospital Management System database, including both `public` and `core` schemas.

---

## PUBLIC SCHEMA TABLES

### 1. **users**
**Purpose**: System users and authentication
**Rows**: 20 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| auth_id | uuid | nullable, updatable | - | FK → auth.users.id |
| employee_id | varchar | updatable, unique | - | - |
| name | varchar | updatable | - | - |
| email | varchar | updatable, unique | - | - |
| role | varchar | updatable | - | CHECK: md, chief_doctor, doctor, nurse, admin, pharmacist, technician, receptionist, accountant, patient |
| specialization | varchar | nullable, updatable | - | - |
| department | varchar | nullable, updatable | - | - |
| phone | varchar | nullable, updatable | - | - |
| address | text | nullable, updatable | - | - |
| joined_date | date | nullable, updatable | CURRENT_DATE | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, inactive, suspended |
| permissions | jsonb | nullable, updatable | '{}' | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |
| party_id | uuid | updatable | - | FK → public.party.id |

### 2. **patients**
**Purpose**: Patient records and information
**Rows**: 5 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | varchar | updatable, unique | - | - |
| name | varchar | updatable | - | - |
| date_of_birth | date | nullable, updatable | - | - |
| gender | varchar | nullable, updatable | - | CHECK: male, female, other |
| phone | varchar | nullable, updatable | - | - |
| email | varchar | nullable, updatable | - | - |
| address | text | nullable, updatable | - | - |
| emergency_contact_name | varchar | nullable, updatable | - | - |
| emergency_contact_phone | varchar | nullable, updatable | - | - |
| blood_group | varchar | nullable, updatable | - | - |
| allergies | text | nullable, updatable | - | - |
| medical_history | text | nullable, updatable | - | - |
| insurance_number | varchar | nullable, updatable | - | - |
| insurance_provider | varchar | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, inactive, deceased |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |
| emergency_contact_relationship | varchar | nullable, updatable | - | - |
| admission_date | timestamptz | nullable, updatable | - | - |
| admission_time | time | nullable, updatable | - | - |
| primary_complaint | text | nullable, updatable | - | - |
| admission_type | varchar | nullable, updatable | - | CHECK: emergency, elective, referred |
| referring_doctor_facility | varchar | nullable, updatable | - | - |
| consulting_doctor_id | uuid | nullable, updatable | - | FK → public.doctors.id |
| department_ward | varchar | nullable, updatable | - | - |
| room_number | varchar | nullable, updatable | - | - |
| guardian_name | varchar | nullable, updatable | - | - |
| guardian_relationship | varchar | nullable, updatable | - | - |
| guardian_phone | varchar | nullable, updatable | - | - |
| guardian_address | text | nullable, updatable | - | - |
| initial_symptoms | text | nullable, updatable | - | - |
| referred_by | varchar | nullable, updatable | - | - |
| marital_status | varchar | nullable, updatable | - | CHECK: single, married, divorced, widowed, separated |
| current_medications | text | nullable, updatable | - | - |
| chronic_conditions | text | nullable, updatable | - | - |
| previous_surgeries | text | nullable, updatable | - | - |
| user_id | uuid | nullable, updatable | - | FK → public.users.id |

### 3. **doctors**
**Purpose**: Doctor information and profiles
**Rows**: 6 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| user_id | uuid | nullable, updatable | - | FK → public.users.id |
| license_number | varchar | updatable, unique | - | - |
| specialization | varchar | updatable | - | - |
| qualification | varchar | nullable, updatable | - | - |
| years_of_experience | int4 | nullable, updatable | - | - |
| consultation_fee | numeric | nullable, updatable | - | - |
| availability_hours | jsonb | nullable, updatable | - | - |
| room_number | varchar | nullable, updatable | - | - |
| max_patients_per_day | int4 | nullable, updatable | 50 | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, inactive, on_leave |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 4. **departments**
**Purpose**: Hospital departments and organizational units
**Rows**: 10 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| name | varchar | updatable, unique | - | - |
| description | text | nullable, updatable | - | - |
| head_of_department | uuid | nullable, updatable | - | FK → public.users.id |
| location | varchar | nullable, updatable | - | - |
| phone | varchar | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, inactive |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 5. **beds**
**Purpose**: Hospital bed management
**Rows**: 120 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| bed_number | varchar | updatable, unique | - | - |
| room_number | varchar | updatable | - | - |
| department_id | uuid | nullable, updatable | - | FK → public.departments.id |
| bed_type | varchar | nullable, updatable | - | CHECK: general, icu, private, semi_private, emergency |
| floor_number | int4 | nullable, updatable | - | - |
| daily_rate | numeric | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'available' | CHECK: available, occupied, maintenance, reserved |
| features | text[] | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 6. **bed_allocations**
**Purpose**: Bed allocation and patient admission tracking
**Rows**: 2 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| bed_id | uuid | nullable, updatable | - | FK → public.beds.id |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| doctor_id | uuid | nullable, updatable | - | FK → public.doctors.id |
| admission_date | timestamptz | nullable, updatable | now() | - |
| discharge_date | timestamptz | nullable, updatable | - | - |
| admission_type | varchar | nullable, updatable | - | CHECK: emergency, scheduled, transfer |
| reason | text | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, discharged, transferred |
| notes | text | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 7. **appointments**
**Purpose**: Patient appointment scheduling
**Rows**: 5 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| doctor_id | uuid | nullable, updatable | - | FK → public.doctors.id |
| appointment_date | date | nullable, updatable | - | - |
| appointment_time | time | nullable, updatable | - | - |
| duration_minutes | int4 | nullable, updatable | 30 | - |
| status | varchar | nullable, updatable | 'scheduled' | CHECK: scheduled, confirmed, in_progress, completed, cancelled, no_show |
| reason | text | nullable, updatable | - | - |
| notes | text | nullable, updatable | - | - |
| priority | varchar | nullable, updatable | 'normal' | CHECK: low, normal, high, urgent |
| created_by | uuid | nullable, updatable | - | FK → public.users.id |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 8. **prescriptions**
**Purpose**: Medical prescriptions and medication orders
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| doctor_id | uuid | nullable, updatable | - | FK → public.doctors.id |
| prescription_date | timestamptz | nullable, updatable | now() | - |
| diagnosis | text | nullable, updatable | - | - |
| instructions | text | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, completed, cancelled |
| follow_up_date | date | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 9. **prescription_items**
**Purpose**: Individual medication items in prescriptions
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| prescription_id | uuid | nullable, updatable | - | FK → public.prescriptions.id |
| medication_name | varchar | updatable | - | - |
| dosage | varchar | nullable, updatable | - | - |
| frequency | varchar | nullable, updatable | - | - |
| duration | varchar | nullable, updatable | - | - |
| quantity | int4 | nullable, updatable | - | - |
| instructions | text | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'pending' | CHECK: pending, dispensed, cancelled |
| dispensed_quantity | int4 | nullable, updatable | 0 | - |
| dispensed_date | timestamptz | nullable, updatable | - | - |
| dispensed_by | uuid | nullable, updatable | - | FK → public.users.id |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 10. **lab_reports**
**Purpose**: Laboratory test reports and results
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| doctor_id | uuid | nullable, updatable | - | FK → public.doctors.id |
| test_name | varchar | updatable | - | - |
| test_type | varchar | nullable, updatable | - | - |
| sample_collected_date | timestamptz | nullable, updatable | - | - |
| report_date | timestamptz | nullable, updatable | - | - |
| results | jsonb | nullable, updatable | - | - |
| normal_ranges | jsonb | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'pending' | CHECK: pending, in_progress, completed, cancelled |
| technician_id | uuid | nullable, updatable | - | FK → public.users.id |
| verified_by | uuid | nullable, updatable | - | FK → public.users.id |
| notes | text | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 11. **vitals**
**Purpose**: Patient vital signs and measurements
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| recorded_date | timestamptz | nullable, updatable | now() | - |
| temperature | numeric | nullable, updatable | - | - |
| blood_pressure_systolic | int4 | nullable, updatable | - | - |
| blood_pressure_diastolic | int4 | nullable, updatable | - | - |
| heart_rate | int4 | nullable, updatable | - | - |
| respiratory_rate | int4 | nullable, updatable | - | - |
| oxygen_saturation | numeric | nullable, updatable | - | - |
| weight | numeric | nullable, updatable | - | - |
| height | numeric | nullable, updatable | - | - |
| bmi | numeric | nullable, updatable | - | - |
| recorded_by | uuid | nullable, updatable | - | FK → public.users.id |
| notes | text | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 12. **billing_legacy**
**Purpose**: Legacy billing records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| bill_number | varchar | nullable, updatable | - | - |
| bill_date | timestamptz | nullable, updatable | now() | - |
| total_amount | numeric | nullable, updatable | 0 | - |
| paid_amount | numeric | nullable, updatable | 0 | - |
| balance_amount | numeric | nullable, updatable | 0 | - |
| payment_status | varchar | nullable, updatable | 'pending' | CHECK: pending, partial, paid, overdue |
| payment_method | varchar | nullable, updatable | - | CHECK: cash, card, insurance, online, cheque |
| discount_amount | numeric | nullable, updatable | 0 | - |
| tax_amount | numeric | nullable, updatable | 0 | - |
| created_by | uuid | nullable, updatable | - | FK → public.users.id |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 13. **inventory**
**Purpose**: Medical inventory and supplies management
**Rows**: 5 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| item_name | varchar | updatable | - | - |
| item_code | varchar | nullable, updatable | - | - |
| category | varchar | nullable, updatable | - | - |
| unit_of_measure | varchar | nullable, updatable | - | - |
| current_stock | int4 | nullable, updatable | 0 | - |
| minimum_stock | int4 | nullable, updatable | 0 | - |
| maximum_stock | int4 | nullable, updatable | - | - |
| unit_cost | numeric | nullable, updatable | - | - |
| selling_price | numeric | nullable, updatable | - | - |
| supplier | varchar | nullable, updatable | - | - |
| expiry_date | date | nullable, updatable | - | - |
| batch_number | varchar | nullable, updatable | - | - |
| location | varchar | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, inactive, discontinued |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 14. **stock_transactions**
**Purpose**: Inventory stock movement tracking
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| inventory_id | uuid | nullable, updatable | - | FK → public.inventory.id |
| transaction_type | varchar | updatable | - | CHECK: in, out, adjustment, transfer |
| quantity | int4 | updatable | - | - |
| unit_cost | numeric | nullable, updatable | - | - |
| total_cost | numeric | nullable, updatable | - | - |
| reference_number | varchar | nullable, updatable | - | - |
| reason | text | nullable, updatable | - | - |
| performed_by | uuid | nullable, updatable | - | FK → public.users.id |
| transaction_date | timestamptz | nullable, updatable | now() | - |
| created_at | timestamptz | nullable, updatable | now() | - |

### 15. **patient_allergies**
**Purpose**: Patient allergy information
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| allergen | varchar | updatable | - | - |
| reaction | text | nullable, updatable | - | - |
| severity | varchar | nullable, updatable | - | CHECK: mild, moderate, severe, life_threatening |
| onset_date | date | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, resolved, suspected |
| notes | text | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 16. **patient_symptoms**
**Purpose**: Patient symptom tracking
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| symptom | varchar | updatable | - | - |
| severity | varchar | nullable, updatable | - | CHECK: mild, moderate, severe |
| onset_date | timestamptz | nullable, updatable | - | - |
| duration | varchar | nullable, updatable | - | - |
| description | text | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, resolved, improving, worsening |
| recorded_date | timestamptz | nullable, updatable | now() | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 17. **patient_admissions**
**Purpose**: Patient admission records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| admission_number | varchar | nullable, updatable | - | - |
| admission_date | timestamptz | nullable, updatable | now() | - |
| discharge_date | timestamptz | nullable, updatable | - | - |
| admission_type | varchar | nullable, updatable | - | CHECK: emergency, elective, transfer |
| department | varchar | nullable, updatable | - | - |
| attending_doctor | varchar | nullable, updatable | - | - |
| diagnosis | text | nullable, updatable | - | - |
| treatment_plan | text | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'admitted' | CHECK: admitted, discharged, transferred |
| discharge_summary | text | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 18. **medical_history**
**Purpose**: Patient medical history records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| condition_name | varchar | updatable | - | - |
| diagnosis_date | date | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, resolved, chronic, managed |
| severity | varchar | nullable, updatable | - | CHECK: mild, moderate, severe |
| treatment | text | nullable, updatable | - | - |
| notes | text | nullable, updatable | - | - |
| doctor_name | varchar | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 19. **prescription_dispensed**
**Purpose**: Dispensed prescription tracking
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| prescription_number | varchar | nullable, updatable | - | - |
| medication_name | varchar | updatable | - | - |
| quantity_dispensed | int4 | nullable, updatable | - | - |
| unit_price | numeric | nullable, updatable | - | - |
| total_amount | numeric | nullable, updatable | - | - |
| dispensed_date | timestamptz | nullable, updatable | now() | - |
| pharmacist_id | uuid | nullable, updatable | - | FK → public.users.id |
| instructions | text | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |

### 20. **pharmacy_bills**
**Purpose**: Pharmacy billing records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| bill_number | varchar | nullable, updatable | - | - |
| bill_date | timestamptz | nullable, updatable | now() | - |
| subtotal | numeric | nullable, updatable | 0 | - |
| discount | numeric | nullable, updatable | 0 | - |
| tax_amount | numeric | nullable, updatable | 0 | - |
| total_amount | numeric | nullable, updatable | 0 | - |
| payment_status | varchar | nullable, updatable | 'pending' | CHECK: pending, paid, partial |
| payment_method | varchar | nullable, updatable | - | CHECK: cash, card, insurance, online |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 21. **encounter**
**Purpose**: Patient encounters and visits
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | nullable, updatable | - | FK → public.patients.id |
| doctor_id | uuid | nullable, updatable | - | FK → public.doctors.id |
| department_id | uuid | nullable, updatable | - | FK → public.departments.id |
| encounter_date | timestamptz | nullable, updatable | now() | - |
| encounter_type | varchar | nullable, updatable | - | CHECK: consultation, follow_up, emergency, procedure |
| chief_complaint | text | nullable, updatable | - | - |
| diagnosis | text | nullable, updatable | - | - |
| treatment_plan | text | nullable, updatable | - | - |
| status | varchar | nullable, updatable | 'active' | CHECK: active, completed, cancelled |
| notes | text | nullable, updatable | - | - |
| created_at | timestamptz | nullable, updatable | now() | - |
| updated_at | timestamptz | nullable, updatable | now() | - |

### 22. **appointment**
**Purpose**: New appointment system
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| encounter_id | uuid | updatable | - | FK → public.encounter.id |
| scheduled_at | timestamptz | updatable | - | - |
| duration_minutes | int4 | updatable | 30 | - |
| status_id | uuid | nullable, updatable | - | FK → public.ref_code.id |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 23. **billing**
**Purpose**: New billing system
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | updatable | - | FK → public.patients.id |
| encounter_id | uuid | nullable, updatable | - | FK → public.encounter.id |
| bill_number | varchar | updatable, unique | - | - |
| bill_date | timestamptz | updatable | now() | - |
| total_amount | numeric | updatable | 0 | - |
| paid_amount | numeric | updatable | 0 | - |
| status | varchar | updatable | 'pending' | CHECK: pending, partial, paid, cancelled |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 24. **billing_summaries**
**Purpose**: Billing summary records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | updatable | - | FK → public.patients.id |
| bill_number | varchar | updatable | - | - |
| total_amount | numeric | updatable | 0 | - |
| status | varchar | updatable | 'pending' | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 25. **billing_items**
**Purpose**: Individual billing line items
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| billing_summary_id | uuid | updatable | - | FK → public.billing_summaries.id |
| service_name | varchar | updatable | - | - |
| quantity | int4 | updatable | 1 | - |
| unit_rate | numeric | updatable | 0 | - |
| total_amount | numeric | updatable | 0 | - |
| item_type | varchar | updatable | 'service' | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 26. **billing_item**
**Purpose**: Legacy billing items
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| billing_id | uuid | updatable | - | FK → public.billing.id |
| description | text | updatable | - | - |
| qty | int4 | updatable | 1 | - |
| unit_amount | numeric | updatable | 0 | - |
| total_amount | numeric | updatable | 0 | - |
| line_type | varchar | updatable | 'service' | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 27. **fee_categories**
**Purpose**: Fee category definitions
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| category_name | varchar | updatable | - | - |
| description | text | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 28. **fee_rates**
**Purpose**: Fee rate structures
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| category_id | uuid | updatable | - | FK → public.fee_categories.id |
| service_name | varchar | updatable | - | - |
| rate | numeric | updatable | 0 | - |
| effective_date | date | updatable | CURRENT_DATE | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 29. **ref_code_categories**
**Purpose**: Reference code categories
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| category_name | varchar | updatable | - | - |
| description | text | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 30. **ref_code**
**Purpose**: Reference codes and lookup values
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| category_id | uuid | updatable | - | FK → public.ref_code_categories.id |
| code | varchar | updatable | - | - |
| description | text | nullable, updatable | - | - |
| is_active | bool | updatable | true | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 31. **lab_orders**
**Purpose**: Laboratory test orders
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | updatable | - | FK → public.patients.id |
| doctor_id | uuid | updatable | - | FK → public.doctors.id |
| test_name | varchar | updatable | - | - |
| order_date | timestamptz | updatable | now() | - |
| status | varchar | updatable | 'pending' | - |
| priority | varchar | updatable | 'normal' | - |
| notes | text | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 32. **lab_results**
**Purpose**: Laboratory test results
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| lab_order_id | uuid | updatable | - | FK → public.lab_orders.id |
| result_value | text | updatable | - | - |
| result_date | timestamptz | updatable | now() | - |
| reference_range | varchar | nullable, updatable | - | - |
| status | varchar | updatable | 'pending' | - |
| technician_id | uuid | nullable, updatable | - | FK → public.users.id |
| verified_by | uuid | nullable, updatable | - | FK → public.doctors.id |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 33. **medications**
**Purpose**: Medication catalog
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| name | varchar | updatable | - | - |
| generic_name | varchar | nullable, updatable | - | - |
| dosage_form | varchar | nullable, updatable | - | - |
| strength | varchar | nullable, updatable | - | - |
| manufacturer | varchar | nullable, updatable | - | - |
| description | text | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 34. **medication_administrations**
**Purpose**: Medication administration records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| prescription_id | uuid | updatable | - | FK → public.prescriptions.id |
| administered_by | uuid | updatable | - | FK → public.users.id |
| administered_at | timestamptz | updatable | now() | - |
| dosage_given | varchar | updatable | - | - |
| notes | text | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 35. **patient_vitals**
**Purpose**: Patient vital signs (alternative table)
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| patient_id | uuid | updatable | - | FK → public.patients.id |
| recorded_at | timestamptz | updatable | now() | - |
| temperature | numeric | nullable, updatable | - | - |
| blood_pressure_systolic | int4 | nullable, updatable | - | - |
| blood_pressure_diastolic | int4 | nullable, updatable | - | - |
| heart_rate | int4 | nullable, updatable | - | - |
| respiratory_rate | int4 | nullable, updatable | - | - |
| oxygen_saturation | numeric | nullable, updatable | - | - |
| weight | numeric | nullable, updatable | - | - |
| height | numeric | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 36. **organizations**
**Purpose**: Organization information
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| name | varchar | updatable | - | - |
| type | varchar | nullable, updatable | - | - |
| address | text | nullable, updatable | - | - |
| phone | varchar | nullable, updatable | - | - |
| email | varchar | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 37. **staff**
**Purpose**: Staff information
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| first_name | varchar | updatable | - | - |
| last_name | varchar | updatable | - | - |
| role | varchar | updatable | - | - |
| department_id | uuid | nullable, updatable | - | FK → public.departments.id |
| phone | varchar | nullable, updatable | - | - |
| email | varchar | nullable, updatable | - | - |
| hire_date | date | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 38. **clinician**
**Purpose**: Clinician information
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| name | varchar | updatable | - | - |
| specialization | varchar | nullable, updatable | - | - |
| license_number | varchar | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 39. **customers**
**Purpose**: Customer information
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| name | varchar | updatable | - | - |
| email | varchar | nullable, updatable | - | - |
| phone | varchar | nullable, updatable | - | - |
| address | text | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

### 40. **patient**
**Purpose**: Alternative patient table
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| first_name | varchar | updatable | - | - |
| last_name | varchar | updatable | - | - |
| date_of_birth | date | nullable, updatable | - | - |
| gender | varchar | nullable, updatable | - | - |
| phone | varchar | nullable, updatable | - | - |
| email | varchar | nullable, updatable | - | - |
| address | text | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |

---

## CORE SCHEMA TABLES

### 1. **core.departments**
**Purpose**: Core department structure
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| department_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| name | varchar | updatable | - | - |
| description | text | nullable, updatable | - | - |
| facility_id | uuid | updatable | - | FK → core.facilities.facility_id |
| head_of_department | uuid | nullable, updatable | - | FK → core.staff.staff_id |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |
| created_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| updated_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| deleted_at | timestamptz | nullable, updatable | - | - |

### 2. **core.facilities**
**Purpose**: Healthcare facilities
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| facility_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| name | varchar | updatable | - | - |
| facility_type | varchar | nullable, updatable | - | - |
| address | jsonb | nullable, updatable | - | - |
| contact_info | jsonb | nullable, updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |
| created_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| updated_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| deleted_at | timestamptz | nullable, updatable | - | - |

### 3. **core.patients**
**Purpose**: Core patient records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| patient_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| person_id | uuid | updatable | - | FK → core.persons.person_id |
| uhid | varchar | updatable | - | UNIQUE |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |
| created_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| updated_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| deleted_at | timestamptz | nullable, updatable | - | - |

### 4. **core.persons**
**Purpose**: Central person entity
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| person_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| first_name | varchar | updatable | - | - |
| last_name | varchar | updatable | - | - |
| dob | date | nullable, updatable | - | - |
| sex | varchar | nullable, updatable | - | - |
| phone | varchar | nullable, updatable | - | - |
| email | varchar | nullable, updatable | - | - |
| address | jsonb | nullable, updatable | - | - |

### 5. **core.staff**
**Purpose**: Core staff records
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| staff_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| person_id | uuid | updatable | - | FK → core.persons.person_id |
| employee_id | varchar | updatable | - | - |
| department_id | uuid | nullable, updatable | - | FK → core.departments.department_id |
| hire_date | date | updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |
| created_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| updated_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| deleted_at | timestamptz | nullable, updatable | - | - |

### 6. **core.staff_roles**
**Purpose**: Staff role assignments
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| role_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| staff_id | uuid | updatable | - | FK → core.staff.staff_id |
| role_name | varchar | updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |
| created_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| updated_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| deleted_at | timestamptz | nullable, updatable | - | - |

### 7. **core.staff_schedules**
**Purpose**: Staff scheduling
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| schedule_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| staff_id | uuid | updatable | - | FK → core.staff.staff_id |
| schedule_date | date | updatable | - | - |
| start_time | time | updatable | - | - |
| end_time | time | updatable | - | - |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |
| created_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| updated_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| deleted_at | timestamptz | nullable, updatable | - | - |

### 8. **core.users**
**Purpose**: Core user system
**Rows**: 0 | **RLS**: Enabled

| Column | Type | Options | Default | Constraints |
|--------|------|---------|---------|-------------|
| user_id | uuid | updatable | gen_random_uuid() | PRIMARY KEY |
| username | varchar | updatable | - | - |
| party_id | uuid | updatable | - | FK → party.id |
| created_at | timestamptz | updatable | now() | - |
| updated_at | timestamptz | updatable | now() | - |
| created_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| updated_by | uuid | nullable, updatable | - | FK → core.users.user_id |
| deleted_at | timestamptz | nullable, updatable | - | - |

---

## DATABASE VIEWS

### Public Schema Views

1. **active_admissions** - Current patient admissions view
2. **appointments_legacy** - Legacy appointment format view
3. **billing_items_details** - Detailed billing items view
4. **billing_items_legacy** - Legacy billing items view
5. **billing_summary_details** - Billing summary details view
6. **lab_results_legacy** - Legacy lab results format view

---

## SUMMARY

### Table Count
- **Public Schema**: 40 tables
- **Core Schema**: 8 tables
- **Total Tables**: 48 tables
- **Views**: 6 views

### Security Features
- **Row Level Security (RLS)**: Enabled on all tables
- **Foreign Key Constraints**: Comprehensive referential integrity
- **Check Constraints**: Data validation at database level
- **Unique Constraints**: Prevent duplicate records

### Key Relationships
- **Central Hub**: `core.persons` for all individuals
- **Organizational**: `core.facilities` → `core.departments` → `core.staff`
- **Clinical**: `public.patients` → `public.encounter` → `public.appointment`
- **Billing**: `public.billing` → `public.billing_items`
- **Laboratory**: `public.lab_orders` → `public.lab_results`
- **Pharmacy**: `public.prescriptions` → `public.prescription_items`

### Data Integrity
- All tables include audit fields (`created_at`, `updated_at`)
- Soft delete capability with `deleted_at` fields
- Comprehensive foreign key relationships
- Check constraints for data validation
- Unique constraints for business rules

---

*This document represents the complete database schema for the Hospital Management System as of the current state.*