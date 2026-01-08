# Lab Module Details & Data Schema

## 1. Overview
The Lab module is part of the comprehensive **Lab & X-Ray Module** in the Hospital Management System. It handles the complete workflow for laboratory tests, from order placement to result verification and report generation. It is tightly integrated with the Patient, Doctor, and Billing modules.

## 2. Database Schema

The lab data is stored in PostgreSQL (via Supabase). Below are the key tables and their schemas.

### 2.1. `lab_test_catalog`
Stores the definitions of available laboratory tests.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `test_code` | VARCHAR(50) | Unique code (e.g., 'CBC', 'FBS') |
| `test_name` | VARCHAR(200) | Full name of the test |
| `category` | VARCHAR(100) | e.g., Hematology, Biochemistry |
| `subcategory` | VARCHAR(100) | Optional sub-classification |
| `department` | VARCHAR(100) | Default: 'Laboratory' |
| `sample_type` | VARCHAR(100) | e.g., Blood, Urine |
| `sample_volume` | VARCHAR(50) | Amount of sample required |
| `container_type` | VARCHAR(100) | e.g., EDTA Tube, Plain Tube |
| `fasting_required` | BOOLEAN | If patient needs to fast |
| `normal_turnaround_time` | INTEGER | Hours for routine results |
| `urgent_turnaround_time` | INTEGER | Hours for urgent results |
| `test_cost` | NUMERIC(10,2) | Cost of the test |
| `is_active` | BOOLEAN | If test is currently available |
| `created_at` | TIMESTAMP | Record creation time |

### 2.2. `lab_test_orders`
Stores individual test orders linked to patients and doctors.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `order_number` | VARCHAR(50) | Unique ID (Format: LAB-YYYYMMDD-XXXX) |
| `patient_id` | UUID | FK to `patients` table |
| `encounter_id` | UUID | Optional FK to encounter |
| `appointment_id` | UUID | Optional FK to `appointments` |
| `ordering_doctor_id` | UUID | FK to `doctors` table |
| `test_catalog_id` | UUID | FK to `lab_test_catalog` |
| `clinical_indication` | TEXT | Reason for the test |
| `urgency` | VARCHAR(20) | 'routine', 'urgent', 'stat', 'emergency' |
| `status` | VARCHAR(30) | Workflow status (see below) |
| `sample_collected_at` | TIMESTAMP | When sample was taken |
| `sample_collected_by` | UUID | FK to `users` |
| `result_verified_by` | UUID | FK to `doctors` (Pathologist) |
| `report_url` | TEXT | URL to generated PDF report |

**Status Workflow:**
`ordered` → `sample_pending` → `sample_collected` → `in_progress` → `completed`

### 2.3. `lab_test_results`
Stores the detailed parameters and values for a specific order.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `order_id` | UUID | FK to `lab_test_orders` |
| `parameter_name` | VARCHAR(200) | e.g., 'Hemoglobin', 'WBC Count' |
| `parameter_value` | TEXT | The measured value |
| `unit` | VARCHAR(50) | e.g., 'g/dL', '%' |
| `reference_range` | VARCHAR(100) | Normal range string |
| `is_abnormal` | BOOLEAN | Flag for abnormal results |
| `abnormal_flag` | VARCHAR(20) | 'H' (High), 'L' (Low) |
| `technician_notes` | TEXT | Internal notes |

### 2.4. `diagnostic_billing_items`
Handles billing integration for both Lab and Radiology.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `order_type` | VARCHAR(20) | 'lab' or 'radiology' |
| `lab_order_id` | UUID | FK to `lab_test_orders` |
| `patient_id` | UUID | FK to `patients` |
| `amount` | NUMERIC(10,2) | Cost to be billed |
| `billing_status` | VARCHAR(20) | 'pending', 'billed', 'paid' |

## 3. TypeScript Interfaces

These interfaces correspond to the database tables and are used in the frontend application (`src/lib/labXrayService.ts`).

```typescript
export interface LabTestCatalog {
  id: string;
  test_code: string;
  test_name: string;
  category: string;
  subcategory?: string;
  sample_type?: string;
  sample_volume?: string;
  container_type?: string;
  fasting_required: boolean;
  normal_turnaround_time?: number;
  urgent_turnaround_time?: number;
  test_cost: number;
  is_active: boolean;
}

export interface LabTestOrder {
  id?: string;
  order_number?: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  ordering_doctor_id: string;
  test_catalog_id: string;
  clinical_indication: string;
  provisional_diagnosis?: string;
  special_instructions?: string;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  fasting_status?: boolean;
  preferred_collection_date?: string;
  preferred_collection_time?: string;
  status?: string;
  staff_id?: string;
}

export interface LabTestResult {
  id?: string;
  order_id: string;
  parameter_name: string;
  parameter_value: string;
  unit?: string;
  reference_range?: string;
  is_abnormal?: boolean;
  abnormal_flag?: string;
  technician_notes?: string;
}
```

## 4. Key Relationships

- **Patient to Orders**: One Patient has many Lab Orders.
- **Doctor to Orders**: One Doctor can place many Lab Orders.
- **Catalog to Orders**: One Test Catalog entry (e.g., CBC) is linked to many Orders.
- **Order to Results**: One Lab Order has many Results (parameters).
- **Order to Billing**: One Lab Order corresponds to one Billing Item.

## 5. Security (RLS Policies)

- **Read Access**: Authenticated users (Doctors, Staff) can view catalogs, orders, and results.
- **Create Orders**: Only authenticated users (Doctors) can create new orders.
- **Update Orders**: Lab staff can update status (e.g., `sample_collected`).
- **Enter Results**: Lab technicians can insert results.
- **Billing**: Billing items are automatically created and viewable by authorized staff.

## 6. Seed Data Examples
Common tests seeded in the system include:
- **CBC** (Complete Blood Count) - Hematology
- **FBS** (Fasting Blood Sugar) - Biochemistry
- **LFT** (Liver Function Test) - Biochemistry
- **TSH** (Thyroid Stimulating Hormone) - Biochemistry
- **URINE** (Urine Routine) - Biochemistry
