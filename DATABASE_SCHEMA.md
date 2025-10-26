# Hospital Management System - Database Schema Documentation

**Project**: Annam HMS  
**Database**: PostgreSQL 17.4 (Supabase)  
**Generated**: October 2025  
**Schema**: public

---

## Table of Contents
1. [Core Entities](#core-entities)
2. [Clinical Workflow](#clinical-workflow)
3. [Billing & Payments](#billing--payments)
4. [Pharmacy & Medications](#pharmacy--medications)
5. [Laboratory](#laboratory)
6. [Reference Data](#reference-data)
7. [Relationships Overview](#relationships-overview)

---

## Core Entities

### 1. users
**Purpose**: Central user registry for all system users (staff, doctors, admins)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| auth_id | uuid | FK → auth.users.id, NULLABLE | Supabase auth reference |
| employee_id | varchar(20) | UNIQUE, NOT NULL | Employee identifier |
| name | varchar(100) | NOT NULL | Full name |
| email | varchar(255) | UNIQUE, NOT NULL | Email address |
| role | varchar(50) | NOT NULL | User role (md, chief_doctor, doctor, nurse, admin, etc.) |
| specialization | varchar(100) | NULLABLE | Medical specialization |
| department | varchar(100) | NULLABLE | Department name |
| phone | varchar(20) | NULLABLE | Contact number |
| address | text | NULLABLE | Physical address |
| joined_date | date | DEFAULT CURRENT_DATE | Employment start date |
| status | varchar(20) | DEFAULT 'active' | active, inactive, suspended |
| permissions | jsonb | DEFAULT '{}' | User permissions object |
| party_id | uuid | FK → party.id, NULLABLE | Optional party reference |
| created_at | timestamptz | DEFAULT now() | Record creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Check Constraints**:
- role: md, chief_doctor, doctor, nurse, admin, pharmacist, technician, receptionist, accountant, patient
- status: active, inactive, suspended

---

### 2. patients
**Purpose**: Patient registry with demographics and medical information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| patient_id | varchar(20) | UNIQUE, NOT NULL | UHID (Unique Health ID) |
| name | varchar(100) | NOT NULL | Patient full name |
| date_of_birth | date | NULLABLE | Birth date |
| gender | varchar(20) | NULLABLE | male, female, other |
| phone | varchar(20) | NULLABLE | Contact number |
| email | varchar(255) | NULLABLE | Email address |
| address | text | NULLABLE | Residential address |
| emergency_contact_name | varchar(100) | NULLABLE | Emergency contact person |
| emergency_contact_phone | varchar(20) | NULLABLE | Emergency contact number |
| emergency_contact_relationship | varchar(50) | NULLABLE | Relationship to patient |
| blood_group | varchar(10) | NULLABLE | Blood type (A+, B+, O+, etc.) |
| allergies | text | NULLABLE | Known allergies |
| medical_history | text | NULLABLE | Past medical history |
| insurance_number | varchar(50) | NULLABLE | Insurance policy number |
| insurance_provider | varchar(100) | NULLABLE | Insurance company name |
| marital_status | varchar(20) | NULLABLE | single, married, divorced, widowed, separated |
| current_medications | text | NULLABLE | Current medications list |
| chronic_conditions | text | NULLABLE | Chronic diseases |
| previous_surgeries | text | NULLABLE | Surgical history |
| admission_date | timestamptz | NULLABLE | Current admission date |
| admission_time | time | NULLABLE | Admission time |
| admission_type | varchar(20) | NULLABLE | emergency, elective, referred |
| primary_complaint | text | NULLABLE | Chief complaint |
| referring_doctor_facility | varchar(100) | NULLABLE | Referring facility |
| consulting_doctor_id | uuid | FK → doctors.id, NULLABLE | Assigned doctor |
| department_ward | varchar(50) | NULLABLE | Current ward |
| room_number | varchar(20) | NULLABLE | Room assignment |
| guardian_name | varchar(100) | NULLABLE | Guardian name (for minors) |
| guardian_relationship | varchar(50) | NULLABLE | Guardian relationship |
| guardian_phone | varchar(20) | NULLABLE | Guardian contact |
| guardian_address | text | NULLABLE | Guardian address |
| initial_symptoms | text | NULLABLE | Presenting symptoms |
| referred_by | varchar(100) | NULLABLE | Referral source |
| user_id | uuid | FK → users.id, NULLABLE | Linked user account |
| is_critical | boolean | DEFAULT false | Critical condition flag |
| is_admitted | boolean | DEFAULT false | Currently admitted flag |
| qr_code | text | NULLABLE | QR code data URL for UHID |
| status | varchar(20) | DEFAULT 'active' | active, inactive, deceased |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 3. doctors
**Purpose**: Doctor-specific information and credentials

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | uuid | FK → users.id, UNIQUE, NOT NULL | Reference to users table |
| license_number | varchar(50) | UNIQUE, NULLABLE | Medical license number |
| specialization | varchar(100) | NULLABLE | Medical specialty |
| qualification | varchar(200) | NULLABLE | Educational qualifications |
| experience_years | integer | NULLABLE | Years of experience |
| consultation_fee | numeric(10,2) | NULLABLE | Standard consultation fee |
| status | varchar(20) | DEFAULT 'active' | active, inactive, on_leave |
| available_days | text[] | NULLABLE | Working days array |
| available_hours | varchar(100) | NULLABLE | Working hours |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

## Clinical Workflow

### 4. encounter
**Purpose**: Clinical encounters/visits - central to patient care workflow

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| patient_id | uuid | NOT NULL | Patient reference (no FK constraint) |
| clinician_id | uuid | NOT NULL | Doctor reference (no FK constraint) |
| department_id | uuid | FK → departments.id, NULLABLE | Department |
| type_id | uuid | FK → ref_code.id, NULLABLE | Encounter type (OPD/IPD/Emergency) |
| status_id | uuid | FK → ref_code.id, NULLABLE | Encounter status |
| chief_complaint | text | NULLABLE | Primary complaint |
| started_at | timestamptz | DEFAULT now() | Encounter start time |
| ended_at | timestamptz | NULLABLE | Encounter end time |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

**Note**: This is the central table linking appointments, prescriptions, lab tests, vitals, etc.

---

### 5. appointment
**Purpose**: Scheduled appointments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| encounter_id | uuid | FK → encounter.id, NOT NULL | Linked encounter |
| scheduled_at | timestamptz | NOT NULL | Appointment date/time |
| duration_minutes | integer | DEFAULT 30 | Appointment duration |
| status_id | uuid | FK → ref_code.id, NULLABLE | Appointment status |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 6. vitals
**Purpose**: Patient vital signs measurements

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| patient_id | uuid | FK → patients.id, NOT NULL | Patient reference |
| encounter_id | uuid | FK → encounter.id, NOT NULL | Encounter reference |
| recorded_by | uuid | FK → users.id, NOT NULL | Staff who recorded |
| blood_pressure_systolic | integer | NULLABLE | Systolic BP (mmHg) |
| blood_pressure_diastolic | integer | NULLABLE | Diastolic BP (mmHg) |
| heart_rate | integer | NULLABLE | Heart rate (bpm) |
| temperature | numeric(4,1) | NULLABLE | Body temperature (°F/°C) |
| respiratory_rate | integer | NULLABLE | Breaths per minute |
| oxygen_saturation | integer | NULLABLE | SpO2 percentage |
| weight | numeric(5,2) | NULLABLE | Weight (kg) |
| height | numeric(5,2) | NULLABLE | Height (cm) |
| pain_scale | integer | NULLABLE | Pain level (0-10) |
| blood_glucose | numeric(5,1) | NULLABLE | Blood sugar (mg/dL) |
| notes | text | NULLABLE | Additional observations |
| recorded_at | timestamptz | DEFAULT now() | Measurement time |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 7. clinical_notes
**Purpose**: Doctor's clinical notes and observations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| encounter_id | uuid | FK → encounter.id, NOT NULL | Encounter reference |
| appointment_id | uuid | FK → appointment.id, NULLABLE | Appointment reference |
| patient_id | uuid | FK → patients.id, NOT NULL | Patient reference |
| doctor_id | uuid | FK → doctors.id, NOT NULL | Doctor reference |
| chief_complaint | text | NULLABLE | Primary complaint |
| history_of_present_illness | text | NULLABLE | HPI |
| physical_examination | text | NULLABLE | Examination findings |
| diagnosis | text | NULLABLE | Diagnosis |
| treatment_plan | text | NULLABLE | Treatment recommendations |
| follow_up_instructions | text | NULLABLE | Follow-up notes |
| notes | text | NULLABLE | Additional notes |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

## Billing & Payments

### 8. billing
**Purpose**: Patient bills and invoices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| encounter_id | uuid | FK → encounter.id, NULLABLE | Encounter reference |
| patient_id | uuid | NOT NULL | Patient reference (no FK) |
| bill_no | text | NULLABLE | Bill number |
| currency | text | DEFAULT 'INR' | Currency code |
| subtotal | numeric | DEFAULT 0 | Subtotal amount |
| discount | numeric | DEFAULT 0 | Discount amount |
| tax | numeric | DEFAULT 0 | Tax amount |
| total | numeric | NULLABLE | Total amount |
| status_id | uuid | FK → ref_code.id, NULLABLE | Payment status |
| issued_at | timestamptz | DEFAULT now() | Bill issue date |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 9. billing_item
**Purpose**: Individual line items in bills

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| billing_id | uuid | FK → billing.id, NOT NULL | Bill reference |
| line_type_id | uuid | FK → ref_code.id, NOT NULL | Item type (consultation, medication, lab, etc.) |
| ref_id | uuid | NULLABLE | Reference to source record |
| description | text | NOT NULL | Item description |
| qty | numeric | DEFAULT 1 | Quantity |
| unit_amount | numeric | NOT NULL | Unit price |
| total_amount | numeric | NOT NULL | Line total |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 10. payment_history
**Purpose**: Payment transaction records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| billing_id | uuid | FK → billing.id, NOT NULL | Bill reference |
| amount | numeric | NOT NULL | Payment amount |
| method_id | uuid | FK → ref_code.id, NOT NULL | Payment method |
| transaction_id | varchar(100) | NULLABLE | Transaction reference |
| notes | text | NULLABLE | Payment notes |
| paid_at | timestamptz | DEFAULT now() | Payment timestamp |
| created_at | timestamptz | DEFAULT now() | Record creation |

---

## Pharmacy & Medications

### 11. medications
**Purpose**: Medication master list

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| name | varchar(200) | NOT NULL | Medication name |
| generic_name | varchar(200) | NULLABLE | Generic name |
| category | varchar(100) | NULLABLE | Drug category |
| manufacturer | varchar(200) | NULLABLE | Manufacturer name |
| unit_price | numeric(10,2) | NULLABLE | Price per unit |
| stock_quantity | integer | DEFAULT 0 | Current stock |
| reorder_level | integer | DEFAULT 10 | Reorder threshold |
| unit | varchar(20) | NULLABLE | Unit of measure |
| description | text | NULLABLE | Description |
| side_effects | text | NULLABLE | Known side effects |
| contraindications | text | NULLABLE | Contraindications |
| storage_instructions | text | NULLABLE | Storage requirements |
| status | varchar(20) | DEFAULT 'active' | active, discontinued |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 12. prescriptions
**Purpose**: Doctor prescriptions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| encounter_id | uuid | FK → encounter.id, NOT NULL | Encounter reference |
| patient_id | uuid | FK → patients.id, NOT NULL | Patient reference |
| doctor_id | uuid | FK → doctors.id, NOT NULL | Prescribing doctor |
| diagnosis | text | NULLABLE | Diagnosis |
| notes | text | NULLABLE | Prescription notes |
| status | varchar(20) | DEFAULT 'active' | active, dispensed, cancelled |
| valid_until | date | NULLABLE | Prescription expiry |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 13. prescription_items
**Purpose**: Individual medications in prescriptions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| prescription_id | uuid | FK → prescriptions.id, NOT NULL | Prescription reference |
| medication_id | uuid | FK → medications.id, NOT NULL | Medication reference |
| dosage | varchar(100) | NOT NULL | Dosage instructions |
| frequency | varchar(100) | NOT NULL | Frequency (e.g., "twice daily") |
| duration | varchar(100) | NULLABLE | Duration (e.g., "7 days") |
| quantity | integer | NOT NULL | Quantity prescribed |
| instructions | text | NULLABLE | Special instructions |
| status | varchar(20) | DEFAULT 'pending' | pending, dispensed, cancelled |
| dispensed_quantity | integer | DEFAULT 0 | Quantity dispensed |
| dispensed_at | timestamptz | NULLABLE | Dispensing timestamp |
| dispensed_by | uuid | FK → users.id, NULLABLE | Pharmacist who dispensed |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

## Laboratory

### 14. lab_tests
**Purpose**: Available laboratory test catalog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| test_code | varchar(50) | UNIQUE, NOT NULL | Test code |
| test_name | varchar(200) | NOT NULL | Test name |
| category | varchar(100) | NULLABLE | Test category |
| description | text | NULLABLE | Test description |
| sample_type | varchar(100) | NULLABLE | Sample required |
| preparation_instructions | text | NULLABLE | Patient preparation |
| normal_range | varchar(200) | NULLABLE | Normal value range |
| unit | varchar(50) | NULLABLE | Unit of measurement |
| price | numeric(10,2) | NULLABLE | Test price |
| turnaround_time | varchar(100) | NULLABLE | Expected TAT |
| status | varchar(20) | DEFAULT 'active' | active, inactive |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 15. lab_reports
**Purpose**: Laboratory test orders and results

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| encounter_id | uuid | FK → encounter.id, NOT NULL | Encounter reference |
| patient_id | uuid | FK → patients.id, NOT NULL | Patient reference |
| doctor_id | uuid | FK → doctors.id, NOT NULL | Ordering doctor |
| lab_test_id | uuid | FK → lab_tests.id, NOT NULL | Test reference |
| technician_id | uuid | FK → users.id, NULLABLE | Lab technician |
| verified_by | uuid | FK → users.id, NULLABLE | Verifying doctor |
| status | varchar(20) | DEFAULT 'pending' | pending, in_progress, completed, cancelled |
| sample_collected_at | timestamptz | NULLABLE | Sample collection time |
| result_available_at | timestamptz | NULLABLE | Result ready time |
| verified_at | timestamptz | NULLABLE | Verification time |
| notes | text | NULLABLE | Additional notes |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

### 16. lab_result_value
**Purpose**: Individual test result values

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| lab_report_id | uuid | FK → lab_reports.id, NOT NULL | Report reference |
| parameter_name | varchar(200) | NOT NULL | Parameter name |
| value | varchar(200) | NOT NULL | Result value |
| unit_id | uuid | FK → ref_code.id, NULLABLE | Unit reference |
| normal_range | varchar(200) | NULLABLE | Normal range |
| is_abnormal | boolean | DEFAULT false | Abnormal flag |
| created_at | timestamptz | DEFAULT now() | Record creation |

---

## Reference Data

### 17. ref_code
**Purpose**: System-wide reference codes and lookup values

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| category | varchar(100) | NOT NULL | Code category |
| code | varchar(100) | NOT NULL | Code value |
| display | varchar(200) | NOT NULL | Display text |
| description | text | NULLABLE | Description |
| sort_order | integer | DEFAULT 0 | Display order |
| is_active | boolean | DEFAULT true | Active status |
| created_at | timestamptz | DEFAULT now() | Record creation |

**Common Categories**:
- encounter_type: OPD, IPD, Emergency
- encounter_status: scheduled, in_progress, completed, cancelled
- appointment_status: scheduled, confirmed, completed, cancelled, no_show
- billing_status: pending, partial, paid, cancelled
- payment_method: cash, card, upi, insurance
- billing_line_type: consultation, medication, lab_test, scan, procedure, bed_charges

---

### 18. departments
**Purpose**: Hospital departments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Primary key |
| name | varchar(100) | UNIQUE, NOT NULL | Department name |
| code | varchar(20) | UNIQUE, NULLABLE | Department code |
| description | text | NULLABLE | Description |
| head_of_department | uuid | FK → users.id, NULLABLE | HOD reference |
| status | varchar(20) | DEFAULT 'active' | active, inactive |
| created_at | timestamptz | DEFAULT now() | Record creation |
| updated_at | timestamptz | DEFAULT now() | Last update |

---

## Relationships Overview

### Core Relationships

```
users (1) ──< (M) doctors
users (1) ──< (M) patients (optional)

patients (1) ──< (M) encounter
doctors (1) ──< (M) encounter

encounter (1) ──< (M) appointment
encounter (1) ──< (M) vitals
encounter (1) ──< (M) prescriptions
encounter (1) ──< (M) lab_reports
encounter (1) ──< (M) clinical_notes
encounter (1) ──< (M) billing

prescriptions (1) ──< (M) prescription_items
medications (1) ──< (M) prescription_items

lab_tests (1) ──< (M) lab_reports
lab_reports (1) ──< (M) lab_result_value

billing (1) ──< (M) billing_item
billing (1) ──< (M) payment_history
```

### Key Design Patterns

1. **Encounter-Centric**: Most clinical activities link to `encounter` table
2. **Reference Codes**: Status and type fields use `ref_code` for flexibility
3. **Audit Trail**: All tables have `created_at` and `updated_at` timestamps
4. **Soft Deletes**: Status fields used instead of hard deletes
5. **UUID Primary Keys**: All tables use UUID for distributed system compatibility

---

## Additional Tables

### Bed Management
- **beds**: Hospital bed inventory
- **bed_allocations**: Patient bed assignments

### Medical History
- **medical_history**: Patient medical history records

### Recommendations
- **follow_up_appointments**: Follow-up recommendations
- **surgery_recommendations**: Surgery recommendations
- **scan_orders**: Imaging/scan orders
- **injection_orders**: Injection prescriptions

### Pharmacy Management
- **medicine_batches**: Medication batch tracking
- **stock_transactions**: Inventory transactions
- **prescription_dispensed**: Dispensing records
- **prescription_dispensed_items**: Dispensed item details

### Reports & Documents
- **patient_reports**: Uploaded medical documents

### System
- **role_catalog**: System roles catalog
- **role_hierarchy**: Role hierarchy
- **user_roles**: User role assignments
- **party**: Party/organization records
- **fee_categories**: Fee category definitions
- **fee_rates**: Fee rate schedules

---

## Database Statistics

- **Total Tables**: 40+
- **Database Engine**: PostgreSQL 17.4
- **Hosting**: Supabase
- **Region**: ap-south-1
- **RLS Enabled**: No (application-level security)

---

## Notes

1. **No Direct FK on encounter**: `patient_id` and `clinician_id` in encounter table don't have FK constraints for flexibility
2. **Reference Codes**: Extensively used for status and type fields
3. **Audit Fields**: All tables maintain creation and update timestamps
4. **Soft Deletes**: Status fields preferred over hard deletes
5. **Flexible Schema**: JSONB fields used for extensibility (e.g., user permissions)

---

*Last Updated: October 2025*
*Generated from Supabase project: zusheijhebsmjiyyeiqq*
