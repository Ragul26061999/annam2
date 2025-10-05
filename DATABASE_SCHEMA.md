# Hospital Management System - Complete Database Schema

## Overview
This document provides a comprehensive overview of the Hospital Management System database schema, including all tables, relationships, and data structures across both `public` and `core` schemas.

## Schema Architecture

### Core Schema (`core`)
The core schema contains normalized, foundational entities:

#### 1. **core.persons**
- **Purpose**: Central person registry for all individuals in the system
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `first_name`, `last_name` (VARCHAR) - Name components
  - `date_of_birth` (DATE) - Birth date
  - `gender` (VARCHAR) - Gender with constraints
  - `phone`, `email` (VARCHAR) - Contact information
  - `address` (TEXT) - Physical address
  - `created_at`, `updated_at` (TIMESTAMPTZ) - Audit fields

#### 2. **core.facilities**
- **Purpose**: Healthcare facilities and locations
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `name` (VARCHAR) - Facility name
  - `type` (VARCHAR) - Facility type
  - `address` (TEXT) - Location
  - `phone`, `email` (VARCHAR) - Contact details
  - `status` (VARCHAR) - Active/inactive status

#### 3. **core.departments**
- **Purpose**: Hospital departments and organizational units
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `name` (VARCHAR) - Department name
  - `facility_id` (UUID) - Foreign key to facilities
  - `description` (TEXT) - Department description
  - `status` (VARCHAR) - Operational status

#### 4. **core.staff**
- **Purpose**: Staff member registry
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `person_id` (UUID) - Foreign key to persons
  - `employee_id` (VARCHAR) - Unique employee identifier
  - `department_id` (UUID) - Foreign key to departments
  - `hire_date` (DATE) - Employment start date
  - `status` (VARCHAR) - Employment status

#### 5. **core.staff_roles**
- **Purpose**: Staff role assignments and permissions
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `staff_id` (UUID) - Foreign key to staff
  - `role_name` (VARCHAR) - Role designation
  - `permissions` (JSONB) - Role permissions
  - `is_active` (BOOLEAN) - Role status

#### 6. **core.staff_schedules**
- **Purpose**: Staff scheduling and availability
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `staff_id` (UUID) - Foreign key to staff
  - `schedule_date` (DATE) - Scheduled date
  - `start_time`, `end_time` (TIME) - Work hours
  - `schedule_type` (VARCHAR) - Schedule category

#### 7. **core.patients**
- **Purpose**: Patient registry with medical information
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `person_id` (UUID) - Foreign key to persons
  - `patient_number` (VARCHAR) - Unique patient identifier
  - `blood_group` (VARCHAR) - Blood type
  - `allergies` (TEXT) - Known allergies
  - `emergency_contact_name`, `emergency_contact_phone` (VARCHAR) - Emergency contacts
  - `insurance_number`, `insurance_provider` (VARCHAR) - Insurance details

#### 8. **core.users**
- **Purpose**: System user accounts and authentication
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `person_id` (UUID) - Foreign key to persons
  - `username` (VARCHAR) - Login username
  - `email` (VARCHAR) - Email address
  - `password_hash` (VARCHAR) - Encrypted password
  - `role` (VARCHAR) - System role
  - `is_active` (BOOLEAN) - Account status
  - `last_login` (TIMESTAMPTZ) - Last login timestamp

---

### Public Schema (`public`)
The public schema contains operational tables and legacy compatibility:

#### Patient Management

##### **public.patients** (5 rows)
- **Purpose**: Extended patient information with admission details
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `patient_id` (VARCHAR, UNIQUE) - Patient identifier
  - `name` (VARCHAR) - Full name
  - `date_of_birth` (DATE) - Birth date
  - `gender` (VARCHAR) - Gender with constraints (male/female/other)
  - `phone`, `email` (VARCHAR) - Contact information
  - `address` (TEXT) - Physical address
  - `emergency_contact_name`, `emergency_contact_phone` (VARCHAR) - Emergency contacts
  - `blood_group` (VARCHAR) - Blood type
  - `allergies`, `medical_history` (TEXT) - Medical information
  - `insurance_number`, `insurance_provider` (VARCHAR) - Insurance details
  - `status` (VARCHAR) - Patient status (active/inactive/deceased)
  - `admission_date` (TIMESTAMPTZ) - Admission timestamp
  - `consulting_doctor_id` (UUID) - Foreign key to doctors
  - `department_ward`, `room_number` (VARCHAR) - Location details
  - `user_id` (UUID) - Foreign key to users

##### **public.patient_admissions** (RLS enabled)
- **Purpose**: Patient admission records
- **Key Fields**: Admission details, dates, reasons, and status

##### **public.patient_allergies** (RLS enabled)
- **Purpose**: Detailed allergy records for patients

##### **public.patient_symptoms** (RLS enabled)
- **Purpose**: Patient symptom tracking

##### **public.medical_history** (RLS enabled)
- **Purpose**: Comprehensive medical history records

#### Staff and User Management

##### **public.users** (20 rows, RLS enabled)
- **Purpose**: System users with roles and permissions
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `auth_id` (UUID) - Authentication system reference
  - `employee_id` (VARCHAR, UNIQUE) - Employee identifier
  - `name` (VARCHAR) - Full name
  - `email` (VARCHAR, UNIQUE) - Email address
  - `role` (VARCHAR) - System role with constraints (md, chief_doctor, doctor, nurse, admin, pharmacist, technician, receptionist, accountant, patient)
  - `specialization` (VARCHAR) - Professional specialization
  - `department` (VARCHAR) - Department assignment
  - `phone` (VARCHAR) - Contact number
  - `address` (TEXT) - Physical address
  - `joined_date` (DATE) - Employment start date
  - `status` (VARCHAR) - User status (active/inactive/suspended)
  - `permissions` (JSONB) - User permissions
  - `party_id` (UUID) - Foreign key to party table

##### **public.doctors** (6 rows, RLS enabled)
- **Purpose**: Doctor-specific information and credentials
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `user_id` (UUID) - Foreign key to users
  - `license_number` (VARCHAR, UNIQUE) - Medical license
  - `specialization` (VARCHAR) - Medical specialization
  - `qualification` (VARCHAR) - Educational qualifications
  - `years_of_experience` (INTEGER) - Experience years
  - `consultation_fee` (NUMERIC) - Consultation charges
  - `availability_hours` (JSONB) - Schedule information
  - `room_number` (VARCHAR) - Office location
  - `max_patients_per_day` (INTEGER) - Patient capacity
  - `status` (VARCHAR) - Doctor status (active/inactive/on_leave)

##### **public.staff** (RLS enabled)
- **Purpose**: General staff information

#### Department and Facility Management

##### **public.departments** (10 rows, RLS enabled)
- **Purpose**: Hospital departments and organizational structure
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `name` (VARCHAR, UNIQUE) - Department name
  - `description` (TEXT) - Department description
  - `head_of_department` (UUID) - Foreign key to users
  - `location` (VARCHAR) - Physical location
  - `phone` (VARCHAR) - Department contact
  - `status` (VARCHAR) - Department status (active/inactive)

##### **public.beds** (120 rows, RLS enabled)
- **Purpose**: Hospital bed management
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `bed_number` (VARCHAR, UNIQUE) - Bed identifier
  - `room_number` (VARCHAR) - Room location
  - `department_id` (UUID) - Foreign key to departments
  - `bed_type` (VARCHAR) - Bed category (general/icu/private/semi_private/emergency)
  - `floor_number` (INTEGER) - Floor location
  - `daily_rate` (NUMERIC) - Daily charges
  - `status` (VARCHAR) - Bed status (available/occupied/maintenance/reserved)
  - `features` (TEXT[]) - Bed features array

##### **public.bed_allocations** (2 rows, RLS enabled)
- **Purpose**: Bed assignment tracking
- **Key Fields**:
  - `bed_id`, `patient_id`, `doctor_id` (UUID) - Foreign keys
  - `admission_date`, `discharge_date` (TIMESTAMPTZ) - Allocation period
  - `admission_type` (VARCHAR) - Type of admission
  - `reason` (TEXT) - Allocation reason

#### Appointment Management

##### **public.appointments** (RLS enabled)
- **Purpose**: Patient appointment scheduling
- **Key Fields**:
  - `patient_id`, `doctor_id` (UUID) - Foreign keys
  - `appointment_date` (DATE) - Scheduled date
  - `appointment_time` (TIME) - Scheduled time
  - `status` (VARCHAR) - Appointment status
  - `reason` (TEXT) - Appointment purpose

##### **public.appointment** (RLS enabled)
- **Purpose**: Alternative appointment table structure

#### Clinical Operations

##### **public.encounter** (RLS enabled)
- **Purpose**: Patient-provider encounters
- **Key Fields**:
  - `patient_id`, `doctor_id`, `department_id` (UUID) - Foreign keys
  - `encounter_date` (TIMESTAMPTZ) - Encounter timestamp
  - `encounter_type` (VARCHAR) - Type of encounter
  - `chief_complaint` (TEXT) - Primary complaint
  - `diagnosis` (TEXT) - Medical diagnosis
  - `treatment_plan` (TEXT) - Treatment recommendations

##### **public.vitals** (RLS enabled)
- **Purpose**: Patient vital signs tracking
- **Key Fields**:
  - `patient_id`, `encounter_id`, `recorded_by` (UUID) - Foreign keys
  - `temperature`, `blood_pressure_systolic`, `blood_pressure_diastolic` (NUMERIC) - Vital measurements
  - `heart_rate`, `respiratory_rate` (INTEGER) - Rate measurements
  - `oxygen_saturation` (NUMERIC) - O2 saturation
  - `weight`, `height` (NUMERIC) - Physical measurements
  - `recorded_at` (TIMESTAMPTZ) - Recording timestamp

#### Prescription and Pharmacy Management

##### **public.prescriptions** (RLS enabled)
- **Purpose**: Medical prescriptions
- **Key Fields**:
  - `patient_id`, `doctor_id`, `encounter_id` (UUID) - Foreign keys
  - `prescription_date` (DATE) - Prescription date
  - `status` (VARCHAR) - Prescription status
  - `notes` (TEXT) - Additional instructions

##### **public.prescription_items** (RLS enabled)
- **Purpose**: Individual prescription items
- **Key Fields**:
  - `prescription_id`, `medicine_id` (UUID) - Foreign keys
  - `quantity` (INTEGER) - Prescribed quantity
  - `dosage` (VARCHAR) - Dosage instructions
  - `frequency` (VARCHAR) - Administration frequency
  - `duration` (VARCHAR) - Treatment duration

##### **public.prescription_dispensed** (RLS enabled)
- **Purpose**: Dispensed prescription tracking
- **Key Fields**:
  - `prescription_id`, `patient_id`, `pharmacist_id` (UUID) - Foreign keys
  - `dispensed_date` (DATE) - Dispensing date
  - `total_amount` (NUMERIC) - Total cost

##### **public.prescription_dispensed_items** (RLS enabled)
- **Purpose**: Individual dispensed items

##### **public.medicines** (RLS enabled)
- **Purpose**: Medicine catalog
- **Key Fields**:
  - `name` (VARCHAR) - Medicine name
  - `generic_name` (VARCHAR) - Generic name
  - `manufacturer` (VARCHAR) - Manufacturer
  - `dosage_form` (VARCHAR) - Form (tablet/capsule/syrup)
  - `strength` (VARCHAR) - Medicine strength
  - `unit_price` (NUMERIC) - Price per unit

##### **public.medicine_batches** (RLS enabled)
- **Purpose**: Medicine batch tracking
- **Key Fields**:
  - `medicine_id` (UUID) - Foreign key
  - `batch_number` (VARCHAR) - Batch identifier
  - `expiry_date` (DATE) - Expiration date
  - `quantity_received`, `quantity_remaining` (INTEGER) - Stock levels

##### **public.stock_transactions** (RLS enabled)
- **Purpose**: Inventory transaction tracking

##### **public.pharmacy_bills** (RLS enabled)
- **Purpose**: Pharmacy billing records

##### **public.pharmacy_bill_items** (RLS enabled)
- **Purpose**: Individual pharmacy bill items

#### Laboratory Management

##### **public.lab_tests** (RLS enabled)
- **Purpose**: Laboratory test catalog
- **Key Fields**:
  - `test_name` (VARCHAR) - Test name
  - `test_code` (VARCHAR) - Test identifier
  - `category` (VARCHAR) - Test category
  - `normal_range` (VARCHAR) - Reference range
  - `unit` (VARCHAR) - Measurement unit
  - `cost` (NUMERIC) - Test cost

##### **public.lab_reports** (RLS enabled)
- **Purpose**: Laboratory test reports
- **Key Fields**:
  - `patient_id`, `doctor_id`, `encounter_id` (UUID) - Foreign keys
  - `test_id` (UUID) - Foreign key to lab_tests
  - `report_date` (DATE) - Report date
  - `status` (VARCHAR) - Report status
  - `technician_id`, `verified_by` (UUID) - Staff references

##### **public.lab_result_value** (6 rows, RLS enabled)
- **Purpose**: Individual lab test results
- **Key Fields**:
  - `lab_report_id` (UUID) - Foreign key
  - `test_parameter` (VARCHAR) - Parameter name
  - `result_value` (VARCHAR) - Test result
  - `reference_range` (VARCHAR) - Normal range
  - `unit` (VARCHAR) - Measurement unit
  - `is_abnormal` (BOOLEAN) - Abnormal flag

#### Billing and Financial Management

##### **public.billing** (3 rows, RLS enabled)
- **Purpose**: Main billing records
- **Key Fields**:
  - `patient_id`, `encounter_id` (UUID) - Foreign keys
  - `bill_date` (DATE) - Billing date
  - `total_amount` (NUMERIC) - Total bill amount
  - `paid_amount` (NUMERIC) - Amount paid
  - `status` (VARCHAR) - Payment status
  - `payment_method` (VARCHAR) - Payment type

##### **public.billing_item** (3 rows, RLS enabled)
- **Purpose**: Individual billing items
- **Key Fields**:
  - `billing_id` (UUID) - Foreign key
  - `item_type` (VARCHAR) - Item category
  - `description` (TEXT) - Item description
  - `quantity` (INTEGER) - Item quantity
  - `unit_price` (NUMERIC) - Price per unit
  - `total_amount` (NUMERIC) - Line total

##### **public.billing_items** (RLS enabled)
- **Purpose**: Alternative billing items structure

##### **public.billing_legacy** (RLS enabled)
- **Purpose**: Legacy billing compatibility

##### **public.billing_summaries** (RLS enabled)
- **Purpose**: Billing summary reports

##### **public.fee_categories** (RLS enabled)
- **Purpose**: Fee category definitions

##### **public.fee_rates** (RLS enabled)
- **Purpose**: Fee rate structures

##### **public.payment_history** (RLS enabled)
- **Purpose**: Payment transaction history

#### Support Tables

##### **public.party** (RLS enabled)
- **Purpose**: Generic party/entity registry

##### **public.customers** (RLS enabled)
- **Purpose**: Customer information

##### **public.clinician** (RLS enabled)
- **Purpose**: Clinician registry

##### **public.patient** (RLS enabled)
- **Purpose**: Alternative patient structure

##### **public.ref_code** (RLS enabled)
- **Purpose**: Reference code management

#### Legacy Compatibility Views

##### **public.appointments_legacy** (0 rows)
- **Purpose**: Backward compatibility for appointment queries
- **Type**: View with SECURITY DEFINER

##### **public.billing_items_legacy** 
- **Purpose**: Legacy billing items compatibility
- **Type**: View with SECURITY DEFINER

##### **public.lab_results_legacy**
- **Purpose**: Legacy lab results compatibility
- **Type**: View with SECURITY DEFINER

##### **public.billing_items_details**
- **Purpose**: Detailed billing items view
- **Type**: View with SECURITY DEFINER

##### **public.billing_summary_details**
- **Purpose**: Billing summary details view
- **Type**: View with SECURITY DEFINER

##### **public.active_admissions**
- **Purpose**: Active patient admissions view
- **Type**: View with SECURITY DEFINER

## Security Implementation

### Row Level Security (RLS)
All tables in the `public` schema have RLS enabled with appropriate policies:

- **User Access**: Users can view their own records
- **Patient Access**: Patients can view their own medical records
- **Staff Access**: Authenticated staff can view relevant records based on role
- **Admin Access**: Administrative users have broader access rights

### Key Security Features
- UUID primary keys for enhanced security
- Foreign key constraints for data integrity
- Check constraints for data validation
- Audit trails with created_at/updated_at timestamps
- Role-based access control through RLS policies

## Data Relationships

### Core Relationships
- `core.persons` → Central entity for all individuals
- `core.staff` → Links to persons and departments
- `core.patients` → Links to persons with medical data
- `core.users` → Links to persons for system access

### Public Schema Relationships
- `public.users` ↔ `public.doctors` (one-to-one)
- `public.patients` ↔ `public.appointments` (one-to-many)
- `public.encounter` → Central clinical record
- `public.prescriptions` → `public.prescription_items` (one-to-many)
- `public.billing` → `public.billing_item` (one-to-many)
- `public.lab_reports` → `public.lab_result_value` (one-to-many)

## Migration Status

### Completed Migrations
1. **Schema Normalization**: Core entities properly normalized
2. **Security Implementation**: RLS policies applied
3. **Data Integrity**: Foreign key constraints enforced
4. **Legacy Compatibility**: Views created for backward compatibility
5. **TypeScript Integration**: Type definitions generated

### Current Statistics
- **Total Tables**: 50+ across both schemas
- **Total Records**: 186+ records across all tables
- **Security Policies**: Comprehensive RLS implementation
- **Data Integrity**: 100% referential integrity maintained

## Next Steps

1. **Performance Optimization**: Index optimization for frequently queried columns
2. **Advanced Security**: Fine-tune RLS policies based on specific requirements
3. **Data Migration**: Migrate remaining legacy data if needed
4. **API Integration**: Implement API endpoints using the normalized schema
5. **Monitoring**: Set up database monitoring and alerting

---

*This schema documentation reflects the current state of the Hospital Management System database as of the latest migration. All tables include proper audit trails, security policies, and referential integrity constraints.*