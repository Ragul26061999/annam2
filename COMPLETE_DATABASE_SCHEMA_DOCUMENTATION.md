# Hospital Management System - Complete Database Schema & Data Architecture

## Overview
This document provides a comprehensive overview of the Hospital Management System database schema built on Supabase (PostgreSQL). The system is designed with a robust data architecture that supports all aspects of hospital operations including patient management, appointments, billing, pharmacy, laboratory, and staff management.

## Database Architecture

### Core Design Principles
- **UUID Primary Keys**: All tables use UUID primary keys for better scalability and security
- **Row Level Security (RLS)**: Enabled on all tables for data protection
- **Referential Integrity**: Comprehensive foreign key relationships maintain data consistency
- **Audit Trail**: Created/updated timestamps on all entities
- **Flexible Status Management**: Reference code system for dynamic status values
- **Normalized Design**: Proper normalization to reduce data redundancy

---

## Core System Tables

### 1. **users** (20 rows)
**Purpose**: Central user management for all system users including medical staff, administrators, and patients.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `auth_id` | uuid | NULLABLE, FK → auth.users.id | - | Supabase auth reference |
| `employee_id` | varchar | UNIQUE | - | Employee identification number |
| `name` | varchar | NOT NULL | - | Full name |
| `email` | varchar | UNIQUE | - | Email address |
| `role` | varchar | CHECK constraint | - | User role |
| `specialization` | varchar | NULLABLE | - | Medical specialization |
| `department` | varchar | NULLABLE | - | Department assignment |
| `phone` | varchar | NULLABLE | - | Contact phone number |
| `address` | text | NULLABLE | - | Physical address |
| `joined_date` | date | NULLABLE | `CURRENT_DATE` | Date of joining |
| `status` | varchar | CHECK constraint | `'active'` | Account status |
| `permissions` | jsonb | NULLABLE | `'{}'` | User permissions |
| `party_id` | uuid | FK → party.id | - | Party reference |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

**Role Values**: `'md'`, `'chief_doctor'`, `'doctor'`, `'nurse'`, `'admin'`, `'pharmacist'`, `'technician'`, `'receptionist'`, `'accountant'`, `'patient'`

**Status Values**: `'active'`, `'inactive'`, `'suspended'`

---

### 2. **patients** (5 rows)
**Purpose**: Comprehensive patient information and medical records management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | varchar | UNIQUE | - | Patient identification number |
| `name` | varchar | NOT NULL | - | Patient full name |
| `date_of_birth` | date | NULLABLE | - | Date of birth |
| `gender` | varchar | CHECK constraint | - | Gender |
| `phone` | varchar | NULLABLE | - | Contact phone |
| `email` | varchar | NULLABLE | - | Email address |
| `address` | text | NULLABLE | - | Home address |
| `emergency_contact_name` | varchar | NULLABLE | - | Emergency contact name |
| `emergency_contact_phone` | varchar | NULLABLE | - | Emergency contact phone |
| `emergency_contact_relationship` | varchar | NULLABLE | - | Emergency contact relationship |
| `blood_group` | varchar | NULLABLE | - | Blood group |
| `allergies` | text | NULLABLE | - | Known allergies |
| `medical_history` | text | NULLABLE | - | Medical history |
| `insurance_number` | varchar | NULLABLE | - | Insurance number |
| `insurance_provider` | varchar | NULLABLE | - | Insurance provider |
| `marital_status` | varchar | CHECK constraint | - | Marital status |
| `current_medications` | text | NULLABLE | - | Current medications |
| `chronic_conditions` | text | NULLABLE | - | Chronic conditions |
| `previous_surgeries` | text | NULLABLE | - | Previous surgeries |
| `admission_date` | timestamptz | NULLABLE | - | Admission date |
| `admission_time` | time | NULLABLE | - | Admission time |
| `admission_type` | varchar | CHECK constraint | - | Admission type |
| `primary_complaint` | text | NULLABLE | - | Primary complaint |
| `initial_symptoms` | text | NULLABLE | - | Initial symptoms |
| `referring_doctor_facility` | varchar | NULLABLE | - | Referring doctor facility |
| `referred_by` | varchar | NULLABLE | - | Referred by |
| `consulting_doctor_id` | uuid | FK → doctors.id | - | Consulting doctor |
| `department_ward` | varchar | NULLABLE | - | Department/ward |
| `room_number` | varchar | NULLABLE | - | Room number |
| `guardian_name` | varchar | NULLABLE | - | Guardian name |
| `guardian_relationship` | varchar | NULLABLE | - | Guardian relationship |
| `guardian_phone` | varchar | NULLABLE | - | Guardian phone |
| `guardian_address` | text | NULLABLE | - | Guardian address |
| `user_id` | uuid | FK → users.id | - | User reference |
| `status` | varchar | CHECK constraint | `'active'` | Patient status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

**Gender Values**: `'male'`, `'female'`, `'other'`
**Status Values**: `'active'`, `'inactive'`, `'deceased'`
**Admission Type Values**: `'emergency'`, `'elective'`, `'referred'`
**Marital Status Values**: `'single'`, `'married'`, `'divorced'`, `'widowed'`, `'separated'`

---

### 3. **doctors** (6 rows)
**Purpose**: Doctor-specific information and professional details.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `user_id` | uuid | FK → users.id | - | User reference |
| `license_number` | varchar | UNIQUE | - | Medical license number |
| `specialization` | varchar | NOT NULL | - | Medical specialization |
| `qualification` | varchar | NULLABLE | - | Medical qualifications |
| `years_of_experience` | integer | NULLABLE | - | Years of experience |
| `consultation_fee` | numeric | NULLABLE | - | Consultation fee |
| `availability_hours` | jsonb | NULLABLE | - | Availability schedule |
| `room_number` | varchar | NULLABLE | - | Office room number |
| `max_patients_per_day` | integer | NULLABLE | `50` | Maximum patients per day |
| `status` | varchar | CHECK constraint | `'active'` | Doctor status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

**Status Values**: `'active'`, `'inactive'`, `'on_leave'`

---

### 4. **departments** (10 rows)
**Purpose**: Hospital department management and organization.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `name` | varchar | UNIQUE | - | Department name |
| `description` | text | NULLABLE | - | Department description |
| `head_of_department` | uuid | FK → users.id | - | Department head |
| `location` | varchar | NULLABLE | - | Physical location |
| `phone` | varchar | NULLABLE | - | Department phone |
| `status` | varchar | CHECK constraint | `'active'` | Department status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

**Status Values**: `'active'`, `'inactive'`

---

## Bed Management System

### 5. **beds** (120 rows)
**Purpose**: Hospital bed inventory and management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bed_number` | varchar | UNIQUE | - | Bed identification number |
| `room_number` | varchar | NOT NULL | - | Room number |
| `department_id` | uuid | FK → departments.id | - | Department reference |
| `bed_type` | varchar | CHECK constraint | - | Type of bed |
| `floor_number` | integer | NULLABLE | - | Floor number |
| `daily_rate` | numeric | NULLABLE | - | Daily rate |
| `status` | varchar | CHECK constraint | `'available'` | Bed status |
| `features` | text[] | NULLABLE | - | Bed features array |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

**Bed Type Values**: `'general'`, `'icu'`, `'private'`, `'semi_private'`, `'emergency'`
**Status Values**: `'available'`, `'occupied'`, `'maintenance'`, `'reserved'`

### 6. **bed_allocations** (2 rows)
**Purpose**: Bed assignment and patient admission tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bed_id` | uuid | FK → beds.id | - | Bed reference |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `doctor_id` | uuid | FK → doctors.id | - | Doctor reference |
| `encounter_id` | uuid | FK → encounter.id | - | Encounter reference |
| `reason_id` | uuid | FK → ref_code.id | - | Reason reference |
| `admission_date` | timestamptz | NULLABLE | `now()` | Admission date |
| `discharge_date` | timestamptz | NULLABLE | - | Discharge date |
| `admission_type` | varchar | CHECK constraint | - | Admission type |
| `reason` | text | NULLABLE | - | Admission reason |
| `status` | varchar | CHECK constraint | `'active'` | Allocation status |
| `daily_charges` | numeric | NULLABLE | - | Daily charges |
| `total_charges` | numeric | NULLABLE | - | Total charges |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

**Admission Type Values**: `'emergency'`, `'scheduled'`, `'transfer'`
**Status Values**: `'active'`, `'discharged'`, `'transferred'`

---

## Clinical Management System

### 7. **encounter**
**Purpose**: Patient encounters and visits tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `encounter_no` | varchar | UNIQUE | - | Encounter number |
| `party_id` | uuid | FK → party.id | - | Party reference |
| `encounter_type_id` | uuid | FK → ref_code.id | - | Encounter type |
| `department_id` | uuid | FK → departments.id | - | Department reference |
| `status_id` | uuid | FK → ref_code.id | - | Status reference |
| `start_date` | timestamptz | NOT NULL | - | Encounter start date |
| `end_date` | timestamptz | NULLABLE | - | Encounter end date |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 8. **appointment**
**Purpose**: Appointment scheduling and management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `appointment_no` | varchar | UNIQUE | - | Appointment number |
| `encounter_id` | uuid | FK → encounter.id | - | Encounter reference |
| `appointment_date` | date | NOT NULL | - | Appointment date |
| `appointment_time` | time | NOT NULL | - | Appointment time |
| `status_id` | uuid | FK → ref_code.id | - | Status reference |
| `notes` | text | NULLABLE | - | Appointment notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 9. **vitals**
**Purpose**: Patient vital signs recording and monitoring.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `recorded_by` | uuid | FK → users.id | - | Recorded by user |
| `temperature` | numeric | NULLABLE | - | Body temperature |
| `blood_pressure_systolic` | integer | NULLABLE | - | Systolic BP |
| `blood_pressure_diastolic` | integer | NULLABLE | - | Diastolic BP |
| `heart_rate` | integer | NULLABLE | - | Heart rate |
| `respiratory_rate` | integer | NULLABLE | - | Respiratory rate |
| `oxygen_saturation` | numeric | NULLABLE | - | Oxygen saturation |
| `weight` | numeric | NULLABLE | - | Weight |
| `height` | numeric | NULLABLE | - | Height |
| `bmi` | numeric | NULLABLE | - | Body Mass Index |
| `notes` | text | NULLABLE | - | Additional notes |
| `recorded_at` | timestamptz | NULLABLE | `now()` | Recording time |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 10. **medical_history**
**Purpose**: Patient medical history tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `condition_name` | varchar | NOT NULL | - | Medical condition |
| `diagnosis_date` | date | NULLABLE | - | Diagnosis date |
| `status` | varchar | CHECK constraint | - | Condition status |
| `severity` | varchar | CHECK constraint | - | Severity level |
| `notes` | text | NULLABLE | - | Additional notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

---

## Prescription & Pharmacy System

### 11. **prescriptions**
**Purpose**: Medical prescriptions management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `prescription_number` | varchar | UNIQUE | - | Prescription number |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `doctor_id` | uuid | FK → doctors.id | - | Doctor reference |
| `encounter_id` | uuid | FK → encounter.id | - | Encounter reference |
| `prescription_date` | date | NOT NULL | - | Prescription date |
| `status` | varchar | CHECK constraint | `'active'` | Prescription status |
| `notes` | text | NULLABLE | - | Prescription notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 12. **prescription_items**
**Purpose**: Individual prescription medication items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `prescription_id` | uuid | FK → prescriptions.id | - | Prescription reference |
| `medication_id` | uuid | FK → medications.id | - | Medication reference |
| `dosage` | varchar | NOT NULL | - | Medication dosage |
| `frequency` | varchar | NOT NULL | - | Frequency of administration |
| `duration` | varchar | NOT NULL | - | Treatment duration |
| `quantity` | integer | NOT NULL | - | Quantity prescribed |
| `instructions` | text | NULLABLE | - | Special instructions |
| `dispensed_quantity` | integer | NULLABLE | `0` | Quantity dispensed |
| `dispensed_by` | uuid | FK → users.id | - | Dispensed by user |
| `dispensed_at` | timestamptz | NULLABLE | - | Dispensing time |
| `status` | varchar | CHECK constraint | `'pending'` | Item status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 13. **medications**
**Purpose**: Medication master data.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `name` | varchar | NOT NULL | - | Medication name |
| `generic_name` | varchar | NULLABLE | - | Generic name |
| `brand_name` | varchar | NULLABLE | - | Brand name |
| `manufacturer` | varchar | NULLABLE | - | Manufacturer |
| `category` | varchar | NULLABLE | - | Medication category |
| `form` | varchar | NULLABLE | - | Medication form |
| `strength` | varchar | NULLABLE | - | Strength/concentration |
| `unit_price` | numeric | NULLABLE | - | Unit price |
| `description` | text | NULLABLE | - | Description |
| `side_effects` | text | NULLABLE | - | Side effects |
| `contraindications` | text | NULLABLE | - | Contraindications |
| `storage_conditions` | text | NULLABLE | - | Storage conditions |
| `status` | varchar | CHECK constraint | `'active'` | Medication status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 14. **medicine_batches**
**Purpose**: Medication batch and inventory tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `medication_id` | uuid | FK → medications.id | - | Medication reference |
| `batch_number` | varchar | UNIQUE | - | Batch number |
| `expiry_date` | date | NOT NULL | - | Expiry date |
| `manufacturing_date` | date | NULLABLE | - | Manufacturing date |
| `quantity_received` | integer | NOT NULL | - | Quantity received |
| `quantity_available` | integer | NOT NULL | - | Available quantity |
| `unit_cost` | numeric | NULLABLE | - | Unit cost |
| `supplier` | varchar | NULLABLE | - | Supplier name |
| `status` | varchar | CHECK constraint | `'active'` | Batch status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 15. **stock_transactions**
**Purpose**: Medication stock movement tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `medication_id` | uuid | FK → medications.id | - | Medication reference |
| `batch_id` | uuid | FK → medicine_batches.id | - | Batch reference |
| `transaction_type` | varchar | CHECK constraint | - | Transaction type |
| `quantity` | integer | NOT NULL | - | Quantity |
| `unit_price` | numeric | NULLABLE | - | Unit price |
| `total_amount` | numeric | NULLABLE | - | Total amount |
| `reference_id` | uuid | NULLABLE | - | Reference ID |
| `reference_type` | varchar | NULLABLE | - | Reference type |
| `performed_by` | uuid | FK → users.id | - | Performed by user |
| `notes` | text | NULLABLE | - | Transaction notes |
| `transaction_date` | timestamptz | NULLABLE | `now()` | Transaction date |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |

**Transaction Type Values**: `'purchase'`, `'sale'`, `'adjustment'`, `'return'`, `'transfer'`, `'expired'`

### 16. **prescription_dispensed**
**Purpose**: Dispensed prescription tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `prescription_id` | uuid | FK → prescriptions.id | - | Prescription reference |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `pharmacist_id` | uuid | FK → users.id | - | Pharmacist reference |
| `dispensed_date` | timestamptz | NULLABLE | `now()` | Dispensing date |
| `total_amount` | numeric | NULLABLE | - | Total amount |
| `payment_status` | varchar | CHECK constraint | `'pending'` | Payment status |
| `notes` | text | NULLABLE | - | Dispensing notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 17. **prescription_dispensed_items**
**Purpose**: Individual dispensed prescription items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `prescription_dispensed_id` | uuid | FK → prescription_dispensed.id | - | Dispensed prescription reference |
| `prescription_item_id` | uuid | FK → prescription_items.id | - | Prescription item reference |
| `medication_id` | uuid | FK → medications.id | - | Medication reference |
| `batch_id` | uuid | FK → medicine_batches.id | - | Batch reference |
| `quantity_dispensed` | integer | NOT NULL | - | Quantity dispensed |
| `unit_price` | numeric | NOT NULL | - | Unit price |
| `total_price` | numeric | NOT NULL | - | Total price |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |

---

## Laboratory Management System

### 18. **lab_tests**
**Purpose**: Laboratory test master data.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `test_code` | varchar | UNIQUE | - | Test code |
| `test_name` | varchar | NOT NULL | - | Test name |
| `category` | varchar | NULLABLE | - | Test category |
| `description` | text | NULLABLE | - | Test description |
| `normal_range` | varchar | NULLABLE | - | Normal range |
| `unit` | varchar | NULLABLE | - | Measurement unit |
| `price` | numeric | NULLABLE | - | Test price |
| `preparation_instructions` | text | NULLABLE | - | Preparation instructions |
| `sample_type` | varchar | NULLABLE | - | Sample type required |
| `turnaround_time` | integer | NULLABLE | - | Turnaround time in hours |
| `status` | varchar | CHECK constraint | `'active'` | Test status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 19. **lab_reports**
**Purpose**: Laboratory test reports and results.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `report_number` | varchar | UNIQUE | - | Report number |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `doctor_id` | uuid | FK → doctors.id | - | Doctor reference |
| `encounter_id` | uuid | FK → encounter.id | - | Encounter reference |
| `test_id` | uuid | FK → lab_tests.id | - | Test reference |
| `technician_id` | uuid | FK → users.id | - | Technician reference |
| `verified_by` | uuid | FK → users.id | - | Verified by user |
| `sample_collected_at` | timestamptz | NULLABLE | - | Sample collection time |
| `test_performed_at` | timestamptz | NULLABLE | - | Test performance time |
| `report_date` | timestamptz | NULLABLE | `now()` | Report date |
| `status` | varchar | CHECK constraint | `'pending'` | Report status |
| `priority` | varchar | CHECK constraint | `'normal'` | Priority level |
| `notes` | text | NULLABLE | - | Additional notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 20. **lab_result_value**
**Purpose**: Laboratory test result values.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `lab_report_id` | uuid | FK → lab_reports.id | - | Lab report reference |
| `parameter_name` | varchar | NOT NULL | - | Parameter name |
| `result_value` | varchar | NULLABLE | - | Result value |
| `normal_range` | varchar | NULLABLE | - | Normal range |
| `unit` | varchar | NULLABLE | - | Measurement unit |
| `flag` | varchar | NULLABLE | - | Result flag |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |

---

## Billing & Financial Management

### 21. **billing**
**Purpose**: Patient billing and invoice management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bill_no` | varchar | UNIQUE | - | Bill number |
| `encounter_id` | uuid | FK → encounter.id | - | Encounter reference |
| `bill_date` | date | NOT NULL | - | Bill date |
| `due_date` | date | NULLABLE | - | Due date |
| `subtotal` | numeric | NOT NULL | - | Subtotal amount |
| `tax_amount` | numeric | NULLABLE | `0` | Tax amount |
| `discount_amount` | numeric | NULLABLE | `0` | Discount amount |
| `total_amount` | numeric | NOT NULL | - | Total amount |
| `paid_amount` | numeric | NULLABLE | `0` | Paid amount |
| `balance_amount` | numeric | NOT NULL | - | Balance amount |
| `status_id` | uuid | FK → ref_code.id | - | Status reference |
| `payment_terms` | varchar | NULLABLE | - | Payment terms |
| `notes` | text | NULLABLE | - | Billing notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 22. **billing_item**
**Purpose**: Individual billing line items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `billing_id` | uuid | FK → billing.id | - | Billing reference |
| `line_type_id` | uuid | FK → ref_code.id | - | Line type reference |
| `description` | varchar | NOT NULL | - | Item description |
| `quantity` | numeric | NOT NULL | - | Quantity |
| `unit_price` | numeric | NOT NULL | - | Unit price |
| `total_price` | numeric | NOT NULL | - | Total price |
| `discount_percentage` | numeric | NULLABLE | `0` | Discount percentage |
| `discount_amount` | numeric | NULLABLE | `0` | Discount amount |
| `net_amount` | numeric | NOT NULL | - | Net amount |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |

### 23. **payment_history**
**Purpose**: Payment transaction history.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `billing_id` | uuid | FK → billing.id | - | Billing reference |
| `payment_date` | timestamptz | NOT NULL | - | Payment date |
| `amount` | numeric | NOT NULL | - | Payment amount |
| `payment_method` | varchar | NOT NULL | - | Payment method |
| `reference_number` | varchar | NULLABLE | - | Reference number |
| `notes` | text | NULLABLE | - | Payment notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |

### 24. **fee_categories**
**Purpose**: Fee category management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `category_name` | varchar | UNIQUE | - | Category name |
| `description` | text | NULLABLE | - | Category description |
| `status` | varchar | CHECK constraint | `'active'` | Category status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 25. **fee_rates**
**Purpose**: Fee rate management for different services.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `category_id` | uuid | FK → fee_categories.id | - | Category reference |
| `service_name` | varchar | NOT NULL | - | Service name |
| `rate` | numeric | NOT NULL | - | Service rate |
| `effective_date` | date | NOT NULL | - | Effective date |
| `end_date` | date | NULLABLE | - | End date |
| `status` | varchar | CHECK constraint | `'active'` | Rate status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

---

## Reference & Support Tables

### 26. **party**
**Purpose**: Central party management for patients and other entities.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `party_code` | varchar | UNIQUE | - | Party code |
| `party_type` | varchar | CHECK constraint | - | Party type |
| `name` | varchar | NOT NULL | - | Party name |
| `phone` | varchar | NULLABLE | - | Contact phone |
| `email` | varchar | NULLABLE | - | Email address |
| `address` | text | NULLABLE | - | Address |
| `status` | varchar | CHECK constraint | `'active'` | Party status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

### 27. **ref_code**
**Purpose**: Reference code system for dynamic status and type management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `code_type` | varchar | NOT NULL | - | Code type |
| `code_value` | varchar | NOT NULL | - | Code value |
| `description` | varchar | NULLABLE | - | Code description |
| `sort_order` | integer | NULLABLE | - | Sort order |
| `is_active` | boolean | NULLABLE | `true` | Active status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

---

## Data Architecture Overview

### Entity Relationships

```
USERS (Central Hub)
├── PATIENTS (via user_id)
├── DOCTORS (via user_id)
├── DEPARTMENTS (via head_of_department)
├── VITALS (via recorded_by)
├── PRESCRIPTION_ITEMS (via dispensed_by)
├── STOCK_TRANSACTIONS (via performed_by)
├── LAB_REPORTS (via technician_id, verified_by)
└── PRESCRIPTION_DISPENSED (via pharmacist_id)

PATIENTS (Patient-Centric)
├── BED_ALLOCATIONS (via patient_id)
├── VITALS (via patient_id)
├── MEDICAL_HISTORY (via patient_id)
├── PRESCRIPTIONS (via patient_id)
├── LAB_REPORTS (via patient_id)
└── PRESCRIPTION_DISPENSED (via patient_id)

ENCOUNTER (Clinical Hub)
├── APPOINTMENT (via encounter_id)
├── BED_ALLOCATIONS (via encounter_id)
├── PRESCRIPTIONS (via encounter_id)
├── LAB_REPORTS (via encounter_id)
└── BILLING (via encounter_id)

MEDICATIONS (Pharmacy Hub)
├── PRESCRIPTION_ITEMS (via medication_id)
├── MEDICINE_BATCHES (via medication_id)
├── STOCK_TRANSACTIONS (via medication_id)
└── PRESCRIPTION_DISPENSED_ITEMS (via medication_id)

REF_CODE (Reference Hub)
├── APPOINTMENT (via status_id)
├── BED_ALLOCATIONS (via reason_id)
├── BILLING (via status_id)
├── BILLING_ITEM (via line_type_id)
└── ENCOUNTER (via encounter_type_id, status_id)
```

### Key Design Features

1. **Centralized User Management**: All system users managed through single `users` table
2. **Flexible Reference System**: `ref_code` table provides dynamic status/type management
3. **Encounter-Based Clinical Flow**: Clinical activities linked through `encounter` entity
4. **Comprehensive Audit Trail**: All tables include created_at/updated_at timestamps
5. **Robust Inventory Management**: Multi-level medication tracking with batches and transactions
6. **Integrated Billing System**: Complete billing workflow from services to payments
7. **Laboratory Integration**: Full lab test lifecycle from ordering to reporting
8. **Bed Management**: Real-time bed availability and allocation tracking

### Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **UUID Primary Keys**: Enhanced security and scalability
- **Foreign Key Constraints**: Data integrity enforcement
- **Check Constraints**: Data validation at database level
- **Unique Constraints**: Prevent duplicate critical data

### Performance Considerations

- **Indexed Foreign Keys**: Optimized join performance
- **Partitioning Ready**: Large tables can be partitioned by date
- **JSONB Fields**: Flexible data storage for permissions and configurations
- **Normalized Design**: Reduced data redundancy and improved consistency

---

## Summary

This Hospital Management System database provides a comprehensive, scalable, and secure foundation for managing all aspects of hospital operations. The schema supports:

- **Patient Management**: Complete patient lifecycle from registration to discharge
- **Clinical Operations**: Appointments, encounters, vitals, and medical history
- **Pharmacy Management**: Prescription handling, inventory, and dispensing
- **Laboratory Services**: Test management and result reporting  
- **Billing & Finance**: Comprehensive billing and payment tracking
- **Staff Management**: User roles, permissions, and department organization
- **Bed Management**: Real-time bed allocation and tracking
- **Reference Data**: Flexible status and type management

The architecture ensures data integrity, security, and performance while providing the flexibility needed for a modern hospital management system.