# Revisit Feature Implementation Plan

## Overview
Create a comprehensive revisit patient feature that allows tracking repeat visits from existing patients to the hospital.

## Database Schema

### New Table: `patient_revisits`
```sql
CREATE TABLE patient_revisits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  uhid VARCHAR(50) NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TIME NOT NULL DEFAULT CURRENT_TIME,
  department VARCHAR(100),
  doctor_id UUID REFERENCES staff(id),
  reason_for_visit TEXT NOT NULL,
  symptoms TEXT,
  previous_diagnosis TEXT,
  current_diagnosis TEXT,
  prescription_id UUID,
  consultation_fee DECIMAL(10, 2),
  payment_mode VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  visit_type VARCHAR(50) DEFAULT 'follow-up',
  staff_id UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_patient_revisits_patient_id ON patient_revisits(patient_id);
CREATE INDEX idx_patient_revisits_uhid ON patient_revisits(uhid);
CREATE INDEX idx_patient_revisits_visit_date ON patient_revisits(visit_date);
```

## Frontend Components

### 1. Sidebar Update
- **Location**: `src/components/Sidebar.tsx`
- **Action**: Add "Revisit" menu item under Outpatient section
- **Icon**: UserCheck or RefreshCw

### 2. Revisit Page
- **Location**: `app/revisit/page.tsx`
- **Purpose**: Main revisit dashboard showing recent revisits

### 3. Create Revisit Form
- **Location**: `app/revisit/create/page.tsx` or `components/RevisitForm.tsx`
- **Fields**:
  - UHID Search (auto-populate patient details)
  - Visit Date & Time
  - Department Selection
  - Doctor Selection
  - Reason for Visit (required)
  - Current Symptoms
  - Previous Diagnosis (auto-filled from history)
  - Current Diagnosis
  - Consultation Fee
  - Payment Mode
  - Staff ID (who registered the revisit)
  - Additional Notes

### 4. Patient Search Component
- **Purpose**: Search and validate existing patient by UHID
- **Features**:
  - Auto-complete UHID input
  - Display patient details (name, age, gender, contact)
  - Show visit history

## Service Layer

### 1. Revisit Service
- **Location**: `src/lib/revisitService.ts`
- **Functions**:
  - `createRevisit(data)`: Create new revisit record
  - `getRevisitsByPatient(patientId)`: Get all revisits for a patient
  - `getRevisitById(id)`: Get single revisit details
  - `updateRevisit(id, data)`: Update revisit record
  - `getRecentRevisits(limit)`: Get recent revisits for dashboard
  - `searchPatientByUHID(uhid)`: Search patient for revisit

## Implementation Steps

1. ✅ Create database migration script
2. ✅ Create revisitService.ts with all CRUD operations
3. ✅ Update Sidebar component to add Revisit menu item
4. ✅ Create RevisitForm component with UHID search
5. ✅ Create app/revisit/page.tsx (dashboard)
6. ✅ Create app/revisit/create/page.tsx (form page)
7. ✅ Integrate StaffSelect component
8. ✅ Add success/error handling
9. ✅ Test end-to-end flow

## User Flow

1. User clicks "Revisit" in sidebar
2. Dashboard shows recent revisits
3. User clicks "New Revisit"
4. User searches for patient by UHID
5. Patient details auto-populate
6. User fills reason for visit, symptoms, doctor, etc.
7. User submits form
8. System creates revisit record and displays confirmation
9. Option to print visit slip

## Features

- **UHID Validation**: Ensure patient exists before creating revisit
- **Auto-fill**: Previous visit data and patient details
- **Visit History**: Show patient's previous visits
- **Staff Tracking**: Track which staff member registered the revisit
- **Payment Integration**: Track consultation fees
- **Search & Filter**: Filter revisits by date, patient, department
