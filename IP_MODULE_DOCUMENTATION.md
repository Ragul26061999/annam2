# Inpatient (IP) Module Documentation

## 1. Module Overview
The **Inpatient (IP) Module** manages the complete lifecycle of admitted patients, from admission and bed allocation to daily care, billing, and discharge. It is designed to handle patients who require hospital stays, tracking their location (beds/wards) and associated costs.

*   **Primary Goal**: Manage patient admissions, track bed occupancy, and handle inpatient-specific billing and discharge.
*   **Key Identifier**: Uses a unique **IP Number** (Format: `IP{YY}{MM}{XXXX}`, e.g., `IP24010001`) to track each admission event separate from the patient's permanent ID (UHID).
*   **Integration**: Tightly integrated with the **Outpatient (OP)** module (for converting OP to IP), **Billing** (for room charges), and **Pharmacy** (for inpatient medication).

---

## 2. Key Features & Workflows

### A. Admission Process
The admission process initializes an inpatient record and allocates resources.
*   **Entry Points**:
    1.  **OP to IP Conversion**: Doctors can admit a patient directly from the Outpatient dashboard when a consultation requires hospitalization.
    2.  **Direct Admission**: Emergency or planned admissions processed directly via the Inpatient dashboard.
*   **Data Captured**: 
    *   Admission Type (`emergency`, `elective`, `scheduled`, `referred`, `transfer`)
    *   Reason for admission
    *   Assigned Doctor
    *   Initial Deposit/Advance Payment

### B. Bed Management
*   **Visual Dashboard**: Provides a real-time view of bed status:
    *   🟢 **Available**: Ready for new patient.
    *   🔴 **Occupied**: Currently assigned to a patient.
    *   🟡 **Maintenance**: Under cleaning or repair.
    *   🔵 **Reserved**: Booked for incoming patient.
*   **Allocation**: Links a specific patient to a specific bed (`bed_id`).
*   **Transfers**: Supports moving patients between beds or wards (e.g., ICU to General Ward).

### C. Inpatient Care & Pharmacy
*   **Clinical Data**: Tracks vitals, daily progress notes, and doctor rounds.
*   **Pharmacy Integration**: 
    *   Generates specific medication recommendations for inpatients (e.g., prophylactic antibiotics, stress ulcer prophylaxis).
    *   Orders are linked to the IP admission for consolidated billing.

### D. Billing & Discharge
*   **IP Billing Ledger**: Maintains a separate billing track from OP visits.
    *   **Daily Bed Charges**: Automatically calculated based on bed type and duration of stay.
    *   **Service Charges**: Procedures, Lab tests, and Pharmacy items are added to the IP bill.
    *   **Advance Payments**: Deducted from the final total.
*   **Discharge Process**:
    1.  **Bill Clearance**: Checks for pending balances.
    2.  **Summary Generation**: Creates a **Discharge Summary** document.
    3.  **Status Update**: Marks the patient as discharged and updates the bed status back to "Available".

---

## 3. Database Schema

The module relies primarily on two core tables: `bed_allocations` and `beds`.

### `bed_allocations` Table
Tracks the history of every admission event.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique allocation ID |
| `ip_number` | Text | Human-readable admission ID (e.g., `IP23100045`) |
| `patient_id` | UUID | Link to `patients` table |
| `bed_id` | UUID | Link to `beds` table |
| `status` | Varchar | Current state (`active`, `discharged`) |
| `admission_date` | Timestamptz | Start of the stay |
| `discharge_date` | Timestamptz | End of the stay |
| `admission_type` | Varchar | Type of admission (Emergency, Elective, etc.) |
| `total_charges` | Numeric | Accumulated cost for the stay |
| `doctor_id` | UUID | Primary consulting doctor |

### `beds` Table
Represents the physical infrastructure of the hospital.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique bed ID |
| `bed_number` | Varchar | Physical label on the bed |
| `room_number` | Varchar | Room identifier |
| `status` | Varchar | `available`, `occupied`, `maintenance` |
| `bed_type` | Varchar | Category (e.g., ICU, General Ward, Private) |
| `daily_rate` | Numeric | Cost per day for this bed |
| `department_id` | UUID | Department owning this bed |
| `floor_number` | Integer | Physical location floor |

---

## 4. Code Structure

### Pages (Routes)
*   **Dashboard**: [`app/inpatient/page.tsx`](app/inpatient/page.tsx)
    *   Displays occupancy stats, active admissions list, and bed status.
*   **Create Admission**: [`app/inpatient/create-inpatient/page.tsx`](app/inpatient/create-inpatient/page.tsx)
    *   Form for processing new admissions.
*   **Patient Details**: [`app/patients/[id]/PatientDetailsClient.tsx`](app/patients/[id]/PatientDetailsClient.tsx)
    *   Contains IP-specific tabs for billing history and admission records.

### Services (Business Logic)
*   **Bed Allocation**: [`src/lib/bedAllocationService.ts`](src/lib/bedAllocationService.ts)
    *   `getNextIPNumber()`: Generates sequential IP numbers.
    *   `allocateBed()`: Handles the logic of assigning a bed and updating statuses.
    *   `dischargePatient()`: Finalizes the admission and releases the bed.
*   **Pharmacy Recommendations**: [`src/lib/pharmacyRecommendationService.ts`](src/lib/pharmacyRecommendationService.ts)
    *   `getIPatientMedicationRecommendations()`: Logic for suggesting IP-specific meds.

### Components (UI)
*   **Admission Modal**: [`src/components/AdmissionModal.tsx`](src/components/AdmissionModal.tsx)
    *   Popup UI for selecting beds and doctors during admission.
*   **Discharge Modal**: [`src/components/DischargeModal.tsx`](src/components/DischargeModal.tsx)
    *   UI for finalizing the stay, reviewing the bill, and generating the summary.
*   **Bed Status**: [`src/components/dashboard/BedStatus.tsx`](src/components/dashboard/BedStatus.tsx)
    *   Visual representation of bed occupancy.

---

## 5. Integration Points

### Outpatient (OP) Module
*   **Conversion**: The Outpatient dashboard contains a "Convert to IP" action that pre-fills patient data into the admission form.

### Billing Module
*   **IP Billing**: The system distinguishes between OP and IP bills. IP bills aggregate charges over time, whereas OP bills are typically transactional (pay-per-visit).
*   **Ledger**: Payments made during the stay are tracked as "Advance/Partial Payments" against the specific `bed_allocation_id`.

### Pharmacy Module
*   **Dispensing**: When pharmacy dispenses medication to an admitted patient, the cost is added to the IP bill rather than requiring immediate payment.
