# Hospital Management System - Database Relationships & Constraints

## Schema Relationship Overview

This document provides a comprehensive view of all database relationships, constraints, and the interconnected nature of the Hospital Management System database.

## Core Schema Relationships

### **Central Entity: `core.persons`**
The `core.persons` table serves as the foundational entity for all individuals in the system:

```
core.persons (person_id)
├── core.patients (person_id) → One-to-One
├── core.staff (person_id) → One-to-One  
└── core.users (person_id) → One-to-One
```

### **Organizational Structure**
```
core.facilities (facility_id)
└── core.departments (facility_id)
    └── core.staff (department_id)
        └── core.staff_roles (role_id)
            └── core.staff_schedules (staff_id)
```

### **Core Schema Primary Keys**
- `core.persons.person_id` (UUID)
- `core.facilities.facility_id` (UUID) 
- `core.departments.department_id` (UUID)
- `core.patients.patient_id` (UUID)
- `core.staff.staff_id` (UUID)
- `core.staff_roles.role_id` (UUID)
- `core.staff_schedules.schedule_id` (UUID)
- `core.users.user_id` (UUID)

### **Core Schema Unique Constraints**
- `core.facilities.name` - Unique facility names
- `core.patients.person_id` - One person per patient record
- `core.patients.uhid` - Unique Hospital ID
- `core.staff.person_id` - One person per staff record
- `core.staff_roles.name` - Unique role names
- `core.users.email` - Unique email addresses

## Public Schema Relationships

### **Patient Care Workflow**
```
public.patients (id)
├── public.appointments (patient_id)
│   └── public.encounter (id) ← appointment.encounter_id
│       ├── public.vitals (encounter_id)
│       ├── public.prescriptions (encounter_id)
│       ├── public.lab_reports (encounter_id)
│       ├── public.billing (encounter_id)
│       └── public.bed_allocations (encounter_id)
└── public.patient_admissions (patient_id)
    └── public.billing_summaries (patient_admission_id)
        └── public.billing_items (billing_summary_id)
```

### **Clinical Operations**
```
public.doctors (id)
├── public.appointments (doctor_id)
├── public.prescriptions (doctor_id)
├── public.lab_reports (doctor_id)
└── public.bed_allocations (doctor_id)

public.users (id)
├── public.doctors (user_id) → One-to-One
├── public.patients (user_id) → One-to-One
├── public.appointments (created_by)
├── public.vitals (recorded_by)
├── public.lab_reports (technician_id, verified_by)
└── public.billing_legacy (created_by)
```

### **Prescription & Pharmacy Workflow**
```
public.prescriptions (id)
├── public.prescription_items (prescription_id)
│   └── public.medicines (id) ← prescription_items.medicine_id
│       └── public.medicine_batches (medicine_id)
└── public.prescription_dispensed (prescription_id)
    ├── public.prescription_dispensed_items (prescription_dispensed_id)
    └── public.pharmacy_bills (patient_id)
        └── public.pharmacy_bill_items (pharmacy_bill_id)
```

### **Laboratory System**
```
public.lab_tests (id)
└── public.lab_reports (test_id)
    └── public.lab_result_value (lab_report_id)
```

### **Billing System**
```
public.encounter (id)
├── public.billing (encounter_id)
│   └── public.billing_item (billing_id)
└── public.billing_legacy (appointment_id, bed_allocation_id)

public.fee_categories (id)
└── public.fee_rates (fee_category_id)
    └── public.billing_items (fee_rate_id)
```

### **Facility Management**
```
public.departments (id)
├── public.beds (department_id)
│   └── public.bed_allocations (bed_id)
└── public.users (department) [via string reference]
```

## Key Foreign Key Relationships

### **Patient-Centric Relationships**
| Source Table | Column | Target Table | Target Column | Relationship Type |
|--------------|--------|--------------|---------------|-------------------|
| `appointments` | `patient_id` | `patients` | `id` | Many-to-One |
| `prescriptions` | `patient_id` | `patients` | `id` | Many-to-One |
| `lab_reports` | `patient_id` | `patients` | `id` | Many-to-One |
| `vitals` | `patient_id` | `patients` | `id` | Many-to-One |
| `bed_allocations` | `patient_id` | `patients` | `id` | Many-to-One |
| `billing_legacy` | `patient_id` | `patients` | `id` | Many-to-One |

### **Doctor-Centric Relationships**
| Source Table | Column | Target Table | Target Column | Relationship Type |
|--------------|--------|--------------|---------------|-------------------|
| `appointments` | `doctor_id` | `doctors` | `id` | Many-to-One |
| `prescriptions` | `doctor_id` | `doctors` | `id` | Many-to-One |
| `lab_reports` | `doctor_id` | `doctors` | `id` | Many-to-One |
| `bed_allocations` | `doctor_id` | `doctors` | `id` | Many-to-One |
| `patients` | `consulting_doctor_id` | `doctors` | `id` | Many-to-One |

### **User-Centric Relationships**
| Source Table | Column | Target Table | Target Column | Relationship Type |
|--------------|--------|--------------|---------------|-------------------|
| `doctors` | `user_id` | `users` | `id` | One-to-One |
| `patients` | `user_id` | `users` | `id` | One-to-One |
| `vitals` | `recorded_by` | `users` | `id` | Many-to-One |
| `lab_reports` | `technician_id` | `users` | `id` | Many-to-One |
| `lab_reports` | `verified_by` | `users` | `id` | Many-to-One |
| `appointments` | `created_by` | `users` | `id` | Many-to-One |

### **Encounter-Centric Relationships**
| Source Table | Column | Target Table | Target Column | Relationship Type |
|--------------|--------|--------------|---------------|-------------------|
| `appointment` | `encounter_id` | `encounter` | `id` | One-to-One |
| `vitals` | `encounter_id` | `encounter` | `id` | Many-to-One |
| `prescriptions` | `encounter_id` | `encounter` | `id` | Many-to-One |
| `lab_reports` | `encounter_id` | `encounter` | `id` | Many-to-One |
| `billing` | `encounter_id` | `encounter` | `id` | Many-to-One |
| `bed_allocations` | `encounter_id` | `encounter` | `id` | Many-to-One |

## Unique Constraints Summary

### **Business Identifiers**
- `patients.patient_id` - Unique patient identifier
- `appointments.appointment_id` - Unique appointment identifier  
- `doctors.license_number` - Unique medical license
- `users.employee_id` - Unique employee identifier
- `users.email` - Unique email addresses
- `beds.bed_number` - Unique bed identifier
- `departments.name` - Unique department names

### **System Identifiers**
- `billing.bill_no` - Unique bill numbers
- `billing_legacy.bill_id` - Unique legacy bill IDs
- `billing_summaries.bill_number` - Unique billing summary numbers
- `clinician.license_number` - Unique clinician licenses
- `customers.uhid` - Unique hospital IDs for customers

### **One-to-One Relationships**
- `appointment.encounter_id` - One appointment per encounter
- `clinician.party_id` - One clinician per party
- `core.patients.person_id` - One patient per person
- `core.staff.person_id` - One staff per person

## Reference Code System

The `public.ref_code` table serves as a central reference for various coded values:

```
public.ref_code (id)
├── public.appointment (status_id)
├── public.billing (status_id)
├── public.bed_allocations (reason_id)
├── public.billing_item (line_type_id)
└── public.clinician (specialization_id)
```

## Authentication Integration

The system integrates with Supabase Auth:

```
auth.users (id)
└── public.users (auth_id) → Authentication Link
```

## Party System

The `public.party` table provides a generic entity system:

```
public.party (id)
├── public.users (party_id)
└── public.clinician (party_id)
```

## Data Integrity Features

### **Cascading Relationships**
- Patient deletion affects all related medical records
- Doctor deletion affects appointments and prescriptions
- Encounter deletion affects all clinical data

### **Referential Integrity**
- All foreign keys are enforced
- No orphaned records allowed
- Consistent data relationships maintained

### **Business Rules Enforcement**
- Check constraints on status fields
- Gender constraints (male/female/other)
- Role-based access through RLS policies
- Audit trails on all major entities

## Migration Considerations

### **Schema Evolution**
- Core schema provides normalized foundation
- Public schema maintains operational compatibility
- Legacy views ensure backward compatibility

### **Data Consistency**
- Foreign key constraints prevent data corruption
- Unique constraints prevent duplicate business identifiers
- Check constraints enforce business rules

---

*This relationship documentation reflects the current state of the Hospital Management System database schema with comprehensive foreign key relationships, unique constraints, and data integrity measures.*