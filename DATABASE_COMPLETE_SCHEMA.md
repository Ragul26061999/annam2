# Hospital Management System - Complete Database Schema

## Overview
This document provides a comprehensive overview of all tables and their variables in the Hospital Management System database. The system uses Supabase (PostgreSQL) with UUID primary keys and maintains proper foreign key relationships for data integrity.

---

## Core Tables

### 1. **users** (20 rows)
**Description**: Central user management table for all system users including doctors, staff, patients, and administrators.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `auth_id` | uuid | NULLABLE, FK → auth.users.id | - | Supabase auth reference |
| `employee_id` | varchar | UNIQUE | - | Employee identification number |
| `name` | varchar | NOT NULL | - | Full name |
| `email` | varchar | UNIQUE | - | Email address |
| `role` | varchar | CHECK constraint | - | User role (see values below) |
| `specialization` | varchar | NULLABLE | - | Medical specialization |
| `department` | varchar | NULLABLE | - | Department assignment |
| `phone` | varchar | NULLABLE | - | Contact phone number |
| `address` | text | NULLABLE | - | Physical address |
| `joined_date` | date | NULLABLE | `CURRENT_DATE` | Date of joining |
| `status` | varchar | CHECK constraint | `'active'` | Account status |
| `permissions` | jsonb | NULLABLE | `'{}'` | User permissions |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation time |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update time |

**Role Values**: `'md'`, `'chief_doctor'`, `'doctor'`, `'nurse'`, `'admin'`, `'pharmacist'`, `'technician'`, `'receptionist'`, `'accountant'`, `'patient'`

**Status Values**: `'active'`, `'inactive'`, `'suspended'`

---

### 2. **patients** (5 rows)
**Description**: Patient information and medical records.

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
| `emergency_contact_relationship` | varchar | NULLABLE | - | Relationship to patient |
| `blood_group` | varchar | NULLABLE | - | Blood group |
| `allergies` | text | NULLABLE | - | Known allergies |
| `medical_history` | text | NULLABLE | - | Medical history |
| `insurance_number` | varchar | NULLABLE | - | Insurance policy number |
| `insurance_provider` | varchar | NULLABLE | - | Insurance company |
| `status` | varchar | CHECK constraint | `'active'` | Patient status |
| `admission_date` | timestamptz | NULLABLE | - | Current admission date |
| `admission_time` | time | NULLABLE | - | Admission time |
| `primary_complaint` | text | NULLABLE | - | Chief complaint |
| `admission_type` | varchar | CHECK constraint | - | Type of admission |
| `referring_doctor_facility` | varchar | NULLABLE | - | Referring facility |
| `consulting_doctor_id` | uuid | FK → doctors.id | - | Assigned doctor |
| `department_ward` | varchar | NULLABLE | - | Current ward |
| `room_number` | varchar | NULLABLE | - | Room assignment |
| `guardian_name` | varchar | NULLABLE | - | Guardian name (for minors) |
| `guardian_relationship` | varchar | NULLABLE | - | Guardian relationship |
| `guardian_phone` | varchar | NULLABLE | - | Guardian contact |
| `guardian_address` | text | NULLABLE | - | Guardian address |
| `initial_symptoms` | text | NULLABLE | - | Initial symptoms |
| `referred_by` | varchar | NULLABLE | - | Referral source |
| `marital_status` | varchar | CHECK constraint | - | Marital status |
| `current_medications` | text | NULLABLE | - | Current medications |
| `chronic_conditions` | text | NULLABLE | - | Chronic conditions |
| `previous_surgeries` | text | NULLABLE | - | Surgery history |
| `user_id` | uuid | FK → users.id | - | Associated user account |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Gender Values**: `'male'`, `'female'`, `'other'`

**Status Values**: `'active'`, `'inactive'`, `'deceased'`

**Admission Type Values**: `'emergency'`, `'elective'`, `'referred'`

**Marital Status Values**: `'single'`, `'married'`, `'divorced'`, `'widowed'`, `'separated'`

---

### 3. **doctors** (6 rows)
**Description**: Doctor-specific information and credentials.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `user_id` | uuid | FK → users.id | - | Reference to user account |
| `license_number` | varchar | UNIQUE | - | Medical license number |
| `specialization` | varchar | NOT NULL | - | Medical specialization |
| `qualification` | varchar | NULLABLE | - | Educational qualifications |
| `years_of_experience` | integer | NULLABLE | - | Years of practice |
| `consultation_fee` | numeric | NULLABLE | - | Consultation charges |
| `availability_hours` | jsonb | NULLABLE | - | Working hours schedule |
| `room_number` | varchar | NULLABLE | - | Office/consultation room |
| `max_patients_per_day` | integer | NULLABLE | `50` | Daily patient limit |
| `status` | varchar | CHECK constraint | `'active'` | Doctor status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Status Values**: `'active'`, `'inactive'`, `'on_leave'`

---

### 4. **staff** (2 rows)
**Description**: Non-doctor staff information.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `user_id` | uuid | FK → users.id | - | Reference to user account |
| `shift_timing` | varchar | CHECK constraint | - | Work shift |
| `salary` | numeric | NULLABLE | - | Salary amount |
| `supervisor_id` | uuid | FK → users.id | - | Supervisor reference |
| `skills` | text[] | NULLABLE | - | Staff skills array |
| `certifications` | text[] | NULLABLE | - | Certifications array |
| `status` | varchar | CHECK constraint | `'active'` | Staff status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Shift Timing Values**: `'morning'`, `'afternoon'`, `'night'`, `'rotating'`

**Status Values**: `'active'`, `'inactive'`, `'on_leave'`

---

### 5. **departments** (10 rows)
**Description**: Hospital departments and organizational structure.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `name` | varchar | UNIQUE | - | Department name |
| `description` | text | NULLABLE | - | Department description |
| `head_of_department` | uuid | FK → users.id | - | Department head |
| `location` | varchar | NULLABLE | - | Physical location |
| `phone` | varchar | NULLABLE | - | Department phone |
| `status` | varchar | CHECK constraint | `'active'` | Department status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Status Values**: `'active'`, `'inactive'`

---

## Facility Management

### 6. **beds** (120 rows)
**Description**: Hospital bed inventory and management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bed_number` | varchar | UNIQUE | - | Bed identification |
| `room_number` | varchar | NOT NULL | - | Room number |
| `department_id` | uuid | FK → departments.id | - | Department assignment |
| `bed_type` | varchar | CHECK constraint | - | Type of bed |
| `floor_number` | integer | NULLABLE | - | Floor location |
| `daily_rate` | numeric | NULLABLE | - | Daily charges |
| `status` | varchar | CHECK constraint | `'available'` | Bed availability |
| `features` | text[] | NULLABLE | - | Bed features array |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Bed Type Values**: `'general'`, `'icu'`, `'private'`, `'semi_private'`, `'emergency'`

**Status Values**: `'available'`, `'occupied'`, `'maintenance'`, `'reserved'`

---

### 7. **bed_allocations**
**Description**: Patient bed assignments and admissions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bed_id` | uuid | FK → beds.id | - | Assigned bed |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `doctor_id` | uuid | FK → doctors.id | - | Attending doctor |
| `admission_date` | timestamptz | NULLABLE | `now()` | Admission timestamp |
| `discharge_date` | timestamptz | NULLABLE | - | Discharge timestamp |
| `admission_type` | varchar | CHECK constraint | - | Type of admission |
| `reason` | text | NULLABLE | - | Admission reason |
| `status` | varchar | CHECK constraint | `'active'` | Allocation status |
| `daily_charges` | numeric | NULLABLE | - | Daily bed charges |
| `total_charges` | numeric | NULLABLE | - | Total charges |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Admission Type Values**: `'emergency'`, `'elective'`, `'transfer'`

**Status Values**: `'active'`, `'discharged'`, `'transferred'`

---

## Appointment Management

### 8. **appointments**
**Description**: Patient appointment scheduling and management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `appointment_id` | varchar | UNIQUE | - | Appointment number |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `doctor_id` | uuid | FK → doctors.id | - | Doctor reference |
| `appointment_date` | date | NOT NULL | - | Appointment date |
| `appointment_time` | time | NOT NULL | - | Appointment time |
| `duration_minutes` | integer | NULLABLE | `30` | Duration in minutes |
| `type` | varchar | CHECK constraint | - | Appointment type |
| `status` | varchar | CHECK constraint | `'scheduled'` | Appointment status |
| `notes` | text | NULLABLE | - | Appointment notes |
| `symptoms` | text | NULLABLE | - | Patient symptoms |
| `diagnosis` | text | NULLABLE | - | Doctor's diagnosis |
| `prescription` | text | NULLABLE | - | Prescribed treatment |
| `follow_up_date` | date | NULLABLE | - | Follow-up date |
| `fee` | numeric | NULLABLE | - | Consultation fee |
| `created_by` | uuid | FK → users.id | - | Created by user |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Type Values**: `'consultation'`, `'follow_up'`, `'emergency'`, `'routine'`

**Status Values**: `'scheduled'`, `'confirmed'`, `'completed'`, `'cancelled'`, `'no_show'`

---

## Medical Records

### 9. **prescriptions**
**Description**: Doctor prescriptions for patients.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `prescription_id` | varchar | UNIQUE | - | Prescription number |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `doctor_id` | uuid | FK → doctors.id | - | Prescribing doctor |
| `appointment_id` | uuid | FK → appointments.id | - | Related appointment |
| `prescription_date` | date | NULLABLE | `CURRENT_DATE` | Prescription date |
| `diagnosis` | text | NULLABLE | - | Medical diagnosis |
| `instructions` | text | NULLABLE | - | General instructions |
| `status` | varchar | CHECK constraint | `'active'` | Prescription status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Status Values**: `'active'`, `'completed'`, `'cancelled'`

---

### 10. **prescription_items**
**Description**: Individual medicines in prescriptions.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `prescription_id` | uuid | FK → prescriptions.id | - | Prescription reference |
| `medicine_id` | uuid | FK → medicines.id | - | Medicine reference |
| `medicine_name` | varchar | NOT NULL | - | Medicine name |
| `dosage` | varchar | NOT NULL | - | Dosage instructions |
| `frequency` | varchar | NOT NULL | - | Frequency of intake |
| `duration` | varchar | NOT NULL | - | Treatment duration |
| `quantity_prescribed` | integer | NOT NULL | - | Prescribed quantity |
| `quantity_dispensed` | integer | NULLABLE | `0` | Dispensed quantity |
| `instructions` | text | NULLABLE | - | Specific instructions |
| `status` | varchar | CHECK constraint | `'pending'` | Item status |
| `dispensed_by` | uuid | FK → users.id | - | Dispensing pharmacist |
| `dispensed_at` | timestamptz | NULLABLE | - | Dispensing timestamp |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Status Values**: `'pending'`, `'dispensed'`, `'partial'`

---

### 11. **vitals**
**Description**: Patient vital signs and measurements.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `recorded_by` | uuid | FK → users.id | - | Recording staff |
| `recorded_at` | timestamptz | NULLABLE | `now()` | Recording timestamp |
| `temperature` | numeric | NULLABLE | - | Body temperature (°C) |
| `blood_pressure_systolic` | integer | NULLABLE | - | Systolic BP (mmHg) |
| `blood_pressure_diastolic` | integer | NULLABLE | - | Diastolic BP (mmHg) |
| `heart_rate` | integer | NULLABLE | - | Heart rate (bpm) |
| `respiratory_rate` | integer | NULLABLE | - | Respiratory rate |
| `oxygen_saturation` | numeric | NULLABLE | - | O2 saturation (%) |
| `weight` | numeric | NULLABLE | - | Weight (kg) |
| `height` | numeric | NULLABLE | - | Height (cm) |
| `bmi` | numeric | NULLABLE | - | Body Mass Index |
| `notes` | text | NULLABLE | - | Additional notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

---

### 12. **medical_history**
**Description**: Patient medical history records.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `condition_name` | varchar | NOT NULL | - | Medical condition |
| `diagnosis_date` | date | NULLABLE | - | Diagnosis date |
| `treatment` | text | NULLABLE | - | Treatment provided |
| `doctor_notes` | text | NULLABLE | - | Doctor's notes |
| `status` | varchar | CHECK constraint | `'active'` | Condition status |
| `severity` | varchar | CHECK constraint | - | Condition severity |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Status Values**: `'active'`, `'resolved'`, `'chronic'`

**Severity Values**: `'mild'`, `'moderate'`, `'severe'`

---

### 13. **lab_reports**
**Description**: Laboratory test results and reports.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `report_id` | varchar | UNIQUE | - | Report number |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `doctor_id` | uuid | FK → doctors.id | - | Ordering doctor |
| `technician_id` | uuid | FK → users.id | - | Lab technician |
| `test_name` | varchar | NOT NULL | - | Test name |
| `test_type` | varchar | NULLABLE | - | Type of test |
| `sample_collected_at` | timestamptz | NULLABLE | - | Sample collection time |
| `report_date` | date | NULLABLE | `CURRENT_DATE` | Report date |
| `results` | jsonb | NULLABLE | - | Test results (JSON) |
| `normal_ranges` | jsonb | NULLABLE | - | Normal value ranges |
| `interpretation` | text | NULLABLE | - | Result interpretation |
| `status` | varchar | CHECK constraint | `'pending'` | Report status |
| `verified_by` | uuid | FK → users.id | - | Verifying doctor |
| `verified_at` | timestamptz | NULLABLE | - | Verification timestamp |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Status Values**: `'pending'`, `'in_progress'`, `'completed'`, `'cancelled'`

---

## Pharmacy Management

### 14. **medicines**
**Description**: Medicine catalog and information.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `medicine_code` | varchar | UNIQUE | - | Medicine code |
| `name` | varchar | NOT NULL | - | Medicine name |
| `generic_name` | varchar | NULLABLE | - | Generic name |
| `brand_name` | varchar | NULLABLE | - | Brand name |
| `category` | varchar | NULLABLE | - | Medicine category |
| `manufacturer` | varchar | NULLABLE | - | Manufacturer |
| `unit_type` | varchar | CHECK constraint | - | Unit type |
| `strength` | varchar | NULLABLE | - | Medicine strength |
| `description` | text | NULLABLE | - | Description |
| `side_effects` | text | NULLABLE | - | Known side effects |
| `contraindications` | text | NULLABLE | - | Contraindications |
| `storage_conditions` | varchar | NULLABLE | - | Storage requirements |
| `prescription_required` | boolean | NULLABLE | `true` | Prescription requirement |
| `status` | varchar | CHECK constraint | `'active'` | Medicine status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Unit Type Values**: `'tablet'`, `'capsule'`, `'syrup'`, `'injection'`, `'cream'`, `'drops'`

**Status Values**: `'active'`, `'inactive'`, `'discontinued'`

---

### 15. **inventory**
**Description**: Medicine inventory and stock management.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `medicine_id` | uuid | FK → medicines.id | - | Medicine reference |
| `batch_number` | varchar | NOT NULL | - | Batch number |
| `expiry_date` | date | NOT NULL | - | Expiry date |
| `manufacturing_date` | date | NULLABLE | - | Manufacturing date |
| `quantity_in_stock` | integer | NULLABLE | `0` | Current stock |
| `unit_cost` | numeric | NOT NULL | - | Unit cost price |
| `selling_price` | numeric | NOT NULL | - | Selling price |
| `supplier_name` | varchar | NULLABLE | - | Supplier name |
| `purchase_date` | date | NULLABLE | - | Purchase date |
| `minimum_stock_level` | integer | NULLABLE | `10` | Minimum stock alert |
| `maximum_stock_level` | integer | NULLABLE | `1000` | Maximum stock limit |
| `location` | varchar | NULLABLE | - | Storage location |
| `status` | varchar | CHECK constraint | `'active'` | Inventory status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Status Values**: `'active'`, `'expired'`, `'recalled'`

---

### 16. **stock_transactions**
**Description**: Inventory transaction history.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `medicine_id` | uuid | FK → medicines.id | - | Medicine reference |
| `transaction_type` | varchar | CHECK constraint | - | Transaction type |
| `quantity` | integer | NOT NULL | - | Quantity involved |
| `unit_cost` | numeric | NULLABLE | - | Unit cost |
| `total_cost` | numeric | NULLABLE | - | Total cost |
| `batch_number` | varchar | NULLABLE | - | Batch number |
| `expiry_date` | date | NULLABLE | - | Expiry date |
| `supplier_name` | varchar | NULLABLE | - | Supplier name |
| `reference_number` | varchar | NULLABLE | - | Reference number |
| `notes` | text | NULLABLE | - | Transaction notes |
| `performed_by` | uuid | FK → users.id | - | User who performed |
| `transaction_date` | timestamptz | NULLABLE | `now()` | Transaction timestamp |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |

**Transaction Type Values**: `'purchase'`, `'sale'`, `'adjustment'`, `'return'`, `'expired'`

---

## Financial Management

### 17. **billing**
**Description**: Patient billing and invoicing.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bill_id` | varchar | UNIQUE | - | Bill number |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `appointment_id` | uuid | FK → appointments.id | - | Related appointment |
| `bed_allocation_id` | uuid | FK → bed_allocations.id | - | Related bed allocation |
| `bill_date` | date | NULLABLE | `CURRENT_DATE` | Bill date |
| `items` | jsonb | NOT NULL | - | Bill items (JSON) |
| `subtotal` | numeric | NOT NULL | - | Subtotal amount |
| `tax_amount` | numeric | NULLABLE | `0` | Tax amount |
| `discount_amount` | numeric | NULLABLE | `0` | Discount amount |
| `total_amount` | numeric | NOT NULL | - | Total amount |
| `payment_status` | varchar | CHECK constraint | `'pending'` | Payment status |
| `payment_method` | varchar | CHECK constraint | - | Payment method |
| `payment_date` | date | NULLABLE | - | Payment date |
| `created_by` | uuid | FK → users.id | - | Created by user |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Payment Status Values**: `'pending'`, `'paid'`, `'partial'`, `'overdue'`

**Payment Method Values**: `'cash'`, `'card'`, `'insurance'`, `'bank_transfer'`

---

### 18. **billing_items**
**Description**: Individual billing line items.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `billing_summary_id` | uuid | FK → billing.id | - | Billing reference |
| `fee_rate_id` | uuid | FK → fee_rates.id | - | Fee rate reference |
| `service_name` | varchar | NOT NULL | - | Service name |
| `quantity` | numeric | NULLABLE | `1` | Quantity |
| `unit_rate` | numeric | NOT NULL | - | Unit rate |
| `total_amount` | numeric | NOT NULL | - | Total amount |
| `item_type` | varchar | CHECK constraint | `'service'` | Item type |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Item Type Values**: `'service'`, `'medicine'`, `'procedure'`, `'accommodation'`

---

### 19. **pharmacy_bills**
**Description**: Pharmacy-specific billing.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bill_number` | varchar | UNIQUE | - | Bill number |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `prescription_id` | uuid | FK → prescriptions.id | - | Prescription reference |
| `bill_date` | date | NULLABLE | `CURRENT_DATE` | Bill date |
| `items` | jsonb | NOT NULL | - | Bill items (JSON) |
| `subtotal` | numeric | NOT NULL | - | Subtotal amount |
| `tax_amount` | numeric | NULLABLE | `0` | Tax amount |
| `discount_amount` | numeric | NULLABLE | `0` | Discount amount |
| `total_amount` | numeric | NOT NULL | - | Total amount |
| `payment_status` | varchar | CHECK constraint | `'pending'` | Payment status |
| `payment_method` | varchar | CHECK constraint | - | Payment method |
| `created_by` | uuid | FK → staff.id | - | Created by staff |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Payment Status Values**: `'pending'`, `'paid'`, `'partial'`

**Payment Method Values**: `'cash'`, `'card'`, `'insurance'`

---

### 20. **payment_history**
**Description**: Payment transaction history.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `bill_id` | uuid | FK → billing.id | - | Bill reference |
| `payment_date` | date | NOT NULL | - | Payment date |
| `amount_paid` | numeric | NOT NULL | - | Amount paid |
| `payment_method` | varchar | CHECK constraint | - | Payment method |
| `transaction_reference` | varchar | NULLABLE | - | Transaction reference |
| `notes` | text | NULLABLE | - | Payment notes |
| `created_by` | uuid | FK → users.id | - | Created by user |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |

---

## Supporting Tables

### 21. **fee_rates**
**Description**: Standard fee rates for services.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `service_name` | varchar | NOT NULL | - | Service name |
| `service_code` | varchar | UNIQUE | - | Service code |
| `category` | varchar | NULLABLE | - | Service category |
| `unit_rate` | numeric | NOT NULL | - | Unit rate |
| `description` | text | NULLABLE | - | Service description |
| `status` | varchar | CHECK constraint | `'active'` | Rate status |
| `effective_from` | date | NULLABLE | `CURRENT_DATE` | Effective from date |
| `effective_to` | date | NULLABLE | - | Effective to date |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

---

### 22. **patient_allergies**
**Description**: Detailed patient allergy information.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `allergen` | varchar | NOT NULL | - | Allergen name |
| `reaction` | text | NULLABLE | - | Allergic reaction |
| `severity` | varchar | CHECK constraint | - | Severity level |
| `notes` | text | NULLABLE | - | Additional notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

**Severity Values**: `'mild'`, `'moderate'`, `'severe'`, `'life_threatening'`

---

### 23. **patient_symptoms**
**Description**: Patient symptom tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `symptom` | varchar | NOT NULL | - | Symptom description |
| `onset_date` | date | NULLABLE | - | Symptom onset date |
| `severity` | varchar | CHECK constraint | - | Severity level |
| `duration` | varchar | NULLABLE | - | Duration |
| `notes` | text | NULLABLE | - | Additional notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

---

### 24. **patient_admissions**
**Description**: Patient admission history.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `admission_date` | timestamptz | NOT NULL | - | Admission date |
| `discharge_date` | timestamptz | NULLABLE | - | Discharge date |
| `admission_type` | varchar | CHECK constraint | - | Admission type |
| `department` | varchar | NULLABLE | - | Admitting department |
| `attending_doctor` | uuid | FK → doctors.id | - | Attending doctor |
| `diagnosis` | text | NULLABLE | - | Admission diagnosis |
| `treatment_summary` | text | NULLABLE | - | Treatment summary |
| `discharge_summary` | text | NULLABLE | - | Discharge summary |
| `status` | varchar | CHECK constraint | `'active'` | Admission status |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

---

## Views

### 25. **active_admissions** (View)
**Description**: Currently admitted patients view.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Patient ID |
| `patient_id` | uuid | Patient reference |
| `patient_name` | varchar | Patient name |
| `patient_number` | varchar | Patient number |
| `bed_allocation_id` | uuid | Bed allocation ID |
| `bed_number` | varchar | Bed number |
| `room_number` | varchar | Room number |
| `admission_date` | timestamptz | Admission date |
| `admission_type` | varchar | Admission type |
| `primary_complaint` | text | Primary complaint |
| `status` | varchar | Current status |

---

### 26. **billing_items_details** (View)
**Description**: Detailed billing items view.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Item ID |
| `billing_summary_id` | uuid | Billing reference |
| `fee_rate_id` | uuid | Fee rate reference |
| `service_name` | varchar | Service name |
| `quantity` | numeric | Quantity |
| `unit_rate` | numeric | Unit rate |
| `total_amount` | numeric | Total amount |
| `item_type` | varchar | Item type |
| `created_at` | timestamptz | Creation time |

---

### 27. **prescription_dispensed**
**Description**: Dispensed prescription tracking.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `prescription_id` | uuid | FK → prescriptions.id | - | Prescription reference |
| `patient_id` | uuid | FK → patients.id | - | Patient reference |
| `pharmacist_id` | uuid | FK → users.id | - | Dispensing pharmacist |
| `dispensed_date` | date | NOT NULL | - | Dispensing date |
| `total_amount` | numeric | NOT NULL | - | Total amount |
| `payment_status` | varchar | CHECK constraint | `'pending'` | Payment status |
| `notes` | text | NULLABLE | - | Dispensing notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Record creation |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update |

---

## Database Statistics

- **Total Tables**: 27+ (including views)
- **Total Records**: 163+ across all tables
- **Primary Keys**: All tables use UUID primary keys
- **Foreign Key Relationships**: Extensive referential integrity
- **Data Types**: varchar, text, uuid, numeric, integer, date, time, timestamptz, jsonb, boolean, arrays
- **Constraints**: CHECK constraints for enumerated values, UNIQUE constraints, NOT NULL constraints

---

## Key Features

1. **UUID Primary Keys**: All tables use UUID for better scalability and security
2. **Audit Trail**: created_at and updated_at timestamps on most tables
3. **Soft Deletes**: Status fields allow for soft deletion instead of hard deletes
4. **JSON Storage**: JSONB fields for flexible data storage (permissions, results, items)
5. **Array Support**: PostgreSQL arrays for skills, certifications, features
6. **Check Constraints**: Enumerated values enforced at database level
7. **Foreign Key Integrity**: Proper relationships maintained across all tables
8. **Flexible Architecture**: Supports multiple user roles and complex workflows

---

*Last Updated: $(date)*
*Database: Supabase (PostgreSQL)*
*Version: Hospital Management System v1.0*