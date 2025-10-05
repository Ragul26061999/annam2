# Database Tables Reference and Variables

This document lists all database tables and views referenced in the project and provides a central place to define variables for their names. You can use these variables in documentation or configuration to avoid hardcoding table names.

## Table name variables (.env-style)

```env
# Core
TABLE_USERS=users
TABLE_PATIENTS=patients
TABLE_DOCTORS=doctors

# Appointments & Visits
TABLE_APPOINTMENTS=appointments
TABLE_PATIENT_VISITS=patient_visits

# Vitals
TABLE_VITALS=vitals

# Beds & Allocations
TABLE_BEDS=beds
TABLE_BED_ALLOCATIONS=bed_allocations

# Medical Records
TABLE_MEDICAL_HISTORY=medical_history
TABLE_PATIENT_SYMPTOMS=patient_symptoms
TABLE_PATIENT_ALLERGIES=patient_allergies

# Staff & Departments
TABLE_STAFF=staff
TABLE_STAFF_ROLES=staff_roles
TABLE_STAFF_SCHEDULES=staff_schedules
TABLE_DEPARTMENTS=departments

# Lab
TABLE_LAB_TESTS=lab_tests
TABLE_LAB_REPORTS=lab_reports

# Prescriptions & Pharmacy
TABLE_PRESCRIPTIONS=prescriptions
TABLE_PRESCRIPTION_ITEMS=prescription_items
TABLE_MEDICINES=medicines
TABLE_MEDICATIONS=medications
TABLE_MEDICINE_BATCHES=medicine_batches
TABLE_PHARMACY_BILLS=pharmacy_bills
TABLE_PHARMACY_BILL_ITEMS=pharmacy_bill_items
TABLE_PHARMACY_BILLING=pharmacy_billing
TABLE_PHARMACY_BILLING_ITEMS=pharmacy_billing_items
TABLE_STOCK_TRANSACTIONS=stock_transactions
TABLE_PHARMACY_STOCK_TRANSACTIONS=pharmacy_stock_transactions
TABLE_PRESCRIPTION_DISPENSED=prescription_dispensed
TABLE_PRESCRIPTION_DISPENSING=prescription_dispensing

# Billing (Patient Discharge)
TABLE_FEE_CATEGORIES=fee_categories
TABLE_FEE_RATES=fee_rates
TABLE_PATIENT_ADMISSIONS=patient_admissions
TABLE_BILLING_SUMMARY=billing_summary
TABLE_BILLING_ITEMS=billing_items
TABLE_PAYMENT_HISTORY=payment_history

# Views
VIEW_ACTIVE_ADMISSIONS=active_admissions
VIEW_BILLING_SUMMARY_DETAILED=billing_summary_detailed
VIEW_BILLING_ITEMS_DETAILED=billing_items_detailed
```

## Grouped list with brief descriptions

- Core
  - users: System users with roles and permissions
  - patients: Patient master with UHID and profile details
  - doctors: Doctor master with specialization and schedule

- Appointments & Visits
  - appointments: Scheduled consultations and their statuses
  - patient_visits: Historical visit records linked to appointments

- Vitals
  - vitals: Recorded vital signs per visit/patient

- Beds & Allocations
  - beds: Hospital bed master with type and status
  - bed_allocations: Bed assignment history for patients

- Medical Records
  - medical_history: Significant medical events encountered by patient
  - patient_symptoms: Symptom tracking across visits
  - patient_allergies: Patient allergies catalog

- Staff & Departments
  - staff: Staff directory
  - staff_roles: Role definitions for staff
  - staff_schedules: Scheduling information for staff
  - departments: Hospital departments/wards

- Lab
  - lab_tests: Available lab tests catalog
  - lab_reports: Results generated from lab tests

- Prescriptions & Pharmacy
  - prescriptions: Prescriptions issued during consultations
  - prescription_items: Individual medicines/items within prescriptions
  - medicines: Medicine catalog (primary)
  - medications: Alternate/legacy medicine catalog
  - medicine_batches: Batch-level stock tracking for medicines
  - pharmacy_bills: Pharmacy billing master records
  - pharmacy_bill_items: Line items under pharmacy_bills
  - pharmacy_billing: Alternate/legacy pharmacy billing master
  - pharmacy_billing_items: Line items under pharmacy_billing
  - stock_transactions: Generic stock transaction log
  - pharmacy_stock_transactions: Pharmacy-specific stock transactions/view
  - prescription_dispensed: Records of dispensed prescriptions (summary)
  - prescription_dispensing: Detailed dispensing operations

- Billing (Patient Discharge)
  - fee_categories: Categories of billable services
  - fee_rates: Rate per unit for services within categories
  - patient_admissions: Admission/discharge episodes for patients
  - billing_summary: Master bill per admission with totals
  - billing_items: Itemized charges under billing_summary
  - payment_history: Payments against bills

- Views
  - active_admissions: Current active admissions joined with patient/bed
  - billing_summary_detailed: Billing summary enriched with patient details
  - billing_items_detailed: Itemized billing enriched with category/patient

## Notes

- Table names are derived from the codebase (supabase.from calls) and SQL migrations. Some modules reference both legacy and current tables (e.g., medicines vs medications, pharmacy_billing vs pharmacy_bills). Keep the variables aligned with the actual tables present in your database instance.
- If you prefer to centralize these names in code, you may export them as constants from a single module and replace hardcoded strings accordingly.