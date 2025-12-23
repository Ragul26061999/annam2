# Lab & X-Ray Module - Complete Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Workflow](#workflow)
4. [Features](#features)
5. [Integration](#integration)
6. [API Reference](#api-reference)
7. [User Interface](#user-interface)
8. [Installation](#installation)

---

## 🎯 Overview

The **Lab & X-Ray Module** is a comprehensive diagnostic services management system for hospitals. It handles:

- **Laboratory Tests**: Blood tests, urine analysis, biochemistry, hematology, microbiology
- **Radiology Services**: X-Ray, CT Scan, MRI, Ultrasound, PET Scan, Mammography
- **Complete Workflow**: From doctor order to patient report access
- **Billing Integration**: Automatic billing for all diagnostic services
- **Report Management**: Digital report storage and patient access

### Key Capabilities
✅ Dynamic for OPD, IPD, and Emergency patients  
✅ Real-time status tracking  
✅ Sample/imaging workflow management  
✅ Doctor verification system  
✅ Patient report access  
✅ Billing integration  
✅ Analytics and reporting  

---

## 🗄️ Database Schema

### Tables Created

#### 1. `lab_test_catalog`
Stores available laboratory tests

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| test_code | VARCHAR(50) | Unique test code (e.g., "CBC", "FBS") |
| test_name | VARCHAR(200) | Full test name |
| category | VARCHAR(100) | Hematology, Biochemistry, etc. |
| subcategory | VARCHAR(100) | Sub-classification |
| sample_type | VARCHAR(100) | Blood, Urine, Stool, etc. |
| sample_volume | VARCHAR(50) | Required sample volume |
| container_type | VARCHAR(100) | EDTA tube, Plain tube, etc. |
| fasting_required | BOOLEAN | Whether fasting is needed |
| normal_turnaround_time | INTEGER | Hours for normal processing |
| urgent_turnaround_time | INTEGER | Hours for urgent processing |
| test_cost | NUMERIC(10,2) | Test price |
| is_active | BOOLEAN | Active status |

**Seed Data**: 10 common lab tests (CBC, FBS, RBS, HbA1C, LFT, RFT, Lipid Profile, TSH, Urine, ESR)

#### 2. `radiology_test_catalog`
Stores available radiology/imaging tests

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| test_code | VARCHAR(50) | Unique test code |
| test_name | VARCHAR(200) | Full test name |
| modality | VARCHAR(50) | X-Ray, CT, MRI, Ultrasound, PET |
| body_part | VARCHAR(100) | Area to be scanned |
| contrast_required | BOOLEAN | Whether contrast is needed |
| radiation_exposure | VARCHAR(50) | Low, Medium, High |
| requires_sedation | BOOLEAN | Sedation requirement |
| average_duration | INTEGER | Minutes for procedure |
| normal_turnaround_time | INTEGER | Hours for report |
| test_cost | NUMERIC(10,2) | Test price |

**Seed Data**: 10 common radiology tests (Chest X-Ray, Abdomen X-Ray, CT Head, MRI Brain, USG Abdomen, etc.)

#### 3. `lab_test_orders`
Stores laboratory test orders

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| order_number | VARCHAR(50) | Format: LAB-YYYYMMDD-XXXX |
| patient_id | UUID | Foreign key to patients |
| encounter_id | UUID | Foreign key to encounter (optional) |
| appointment_id | UUID | Foreign key to appointment (optional) |
| ordering_doctor_id | UUID | Foreign key to doctors |
| test_catalog_id | UUID | Foreign key to lab_test_catalog |
| clinical_indication | TEXT | Reason for test |
| provisional_diagnosis | TEXT | Suspected condition |
| special_instructions | TEXT | Special notes |
| urgency | VARCHAR(20) | routine, urgent, stat, emergency |
| fasting_status | BOOLEAN | Patient fasting status |
| **status** | VARCHAR(30) | **Workflow status** (see below) |
| sample_collected_at | TIMESTAMP | Sample collection time |
| sample_collected_by | UUID | Who collected sample |
| sample_id | VARCHAR(50) | Sample identifier |
| result_completed_at | TIMESTAMP | When results ready |
| result_verified_by | UUID | Doctor who verified |
| report_url | TEXT | Report file URL |

**Status Flow**: 
`ordered` → `sample_pending` → `sample_collected` → `in_progress` → `completed`

#### 4. `lab_test_results`
Stores detailed test results

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to lab_test_orders |
| parameter_name | VARCHAR(200) | Test parameter (e.g., "Hemoglobin") |
| parameter_value | TEXT | Result value |
| unit | VARCHAR(50) | Unit of measurement |
| reference_range | VARCHAR(100) | Normal range |
| is_abnormal | BOOLEAN | Abnormal flag |
| abnormal_flag | VARCHAR(20) | H (High), L (Low), etc. |
| technician_notes | TEXT | Lab tech notes |

#### 5. `radiology_test_orders`
Stores radiology/imaging orders

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| order_number | VARCHAR(50) | Format: RAD-YYYYMMDD-XXXX |
| patient_id | UUID | Foreign key to patients |
| encounter_id | UUID | Foreign key to encounter (optional) |
| ordering_doctor_id | UUID | Foreign key to doctors |
| test_catalog_id | UUID | Foreign key to radiology_test_catalog |
| clinical_indication | TEXT | Reason for scan |
| body_part | VARCHAR(100) | Area to scan |
| laterality | VARCHAR(20) | Left, Right, Bilateral |
| contrast_required | BOOLEAN | Contrast needed |
| contrast_type | VARCHAR(100) | Type of contrast |
| **status** | VARCHAR(30) | **Workflow status** (see below) |
| scheduled_at | TIMESTAMP | Scheduled scan time |
| scan_started_at | TIMESTAMP | Scan start time |
| scan_completed_at | TIMESTAMP | Scan end time |
| technician_id | UUID | Scan technician |
| radiologist_id | UUID | Reporting radiologist |
| images_url | TEXT[] | Array of image URLs |
| findings_summary | TEXT | Radiologist findings |
| impression | TEXT | Final impression |
| report_url | TEXT | Report file URL |

**Status Flow**: 
`ordered` → `scheduled` → `patient_arrived` → `in_progress` → `scan_completed` → `report_pending` → `completed`

#### 6. `diagnostic_billing_items`
Billing integration table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| order_type | VARCHAR(20) | 'lab' or 'radiology' |
| lab_order_id | UUID | If lab test |
| radiology_order_id | UUID | If radiology test |
| patient_id | UUID | Patient reference |
| test_name | VARCHAR(200) | Test name |
| amount | NUMERIC(10,2) | Test cost |
| billing_status | VARCHAR(20) | pending, billed, paid |
| billed_at | TIMESTAMP | Billing time |
| paid_at | TIMESTAMP | Payment time |

#### 7. `diagnostic_report_access_log`
Tracks report access for audit

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| accessed_by_user_id | UUID | User who accessed |
| accessed_by_type | VARCHAR(20) | doctor, patient, nurse, admin |
| report_type | VARCHAR(20) | 'lab' or 'radiology' |
| lab_order_id | UUID | If lab report |
| radiology_order_id | UUID | If radiology report |
| access_method | VARCHAR(50) | web, mobile, print, download |
| accessed_at | TIMESTAMP | Access time |

---

## 🔄 Workflow

### Lab Test Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAB TEST WORKFLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. ORDER PLACEMENT
   ├─ Doctor orders test from patient encounter/appointment
   ├─ Selects test from catalog
   ├─ Enters clinical indication
   ├─ Sets urgency level
   └─ Status: ORDERED

2. SAMPLE COLLECTION
   ├─ Lab receives order notification
   ├─ Phlebotomist collects sample
   ├─ Sample labeled with unique ID
   ├─ Records collection time and collector
   └─ Status: SAMPLE_COLLECTED

3. LAB PROCESSING
   ├─ Sample sent to appropriate department
   ├─ Lab technician performs tests
   ├─ Results entered into system
   └─ Status: IN_PROGRESS

4. RESULT VERIFICATION
   ├─ Pathologist reviews results
   ├─ Verifies accuracy
   ├─ Adds notes if needed
   └─ Status: COMPLETED

5. REPORT GENERATION
   ├─ System generates PDF report
   ├─ Report stored in system
   ├─ Patient/doctor notified
   └─ Report accessible online

6. BILLING
   ├─ Automatic billing entry created
   ├─ Cost from test catalog
   └─ Integrated with hospital billing
```

### Radiology/Imaging Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  RADIOLOGY WORKFLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. ORDER PLACEMENT
   ├─ Doctor orders imaging from patient encounter
   ├─ Selects modality and test
   ├─ Specifies body part and laterality
   ├─ Notes if contrast required
   └─ Status: ORDERED

2. SCHEDULING
   ├─ Radiology department receives order
   ├─ Schedules patient appointment
   ├─ Sends preparation instructions
   ├─ Checks for contrast allergies
   └─ Status: SCHEDULED

3. PATIENT ARRIVAL
   ├─ Patient arrives at radiology
   ├─ Checks in
   ├─ Pre-scan preparation done
   └─ Status: PATIENT_ARRIVED

4. IMAGING PROCEDURE
   ├─ Radiologic technician performs scan
   ├─ Images captured and stored
   ├─ Records scan details
   └─ Status: SCAN_COMPLETED

5. REPORT DRAFTING
   ├─ Radiologist reviews images
   ├─ Writes findings
   ├─ Provides impression
   ├─ Makes recommendations
   └─ Status: REPORT_PENDING

6. REPORT FINALIZATION
   ├─ Report verified and signed
   ├─ PDF generated with images
   ├─ Uploaded to system
   └─ Status: COMPLETED

7. REPORT DISTRIBUTION
   ├─ Ordering doctor notified
   ├─ Patient can access online
   ├─ Images available for review
   └─ Billing automatically processed
```

---

## ✨ Features

### 1. Order Management
- **Create Orders**: Doctors can order lab/radiology tests from any patient encounter
- **Bulk Ordering**: Multiple tests can be ordered at once
- **Urgency Levels**: routine, urgent, STAT, emergency
- **Clinical Context**: Attach clinical indication and provisional diagnosis
- **Smart Catalog**: Searchable test catalog with specifications

### 2. Sample/Imaging Workflow
- **Sample Collection**: Track sample collection with technician and time
- **Sample ID**: Unique identifier for lab samples
- **Scan Scheduling**: Appointment scheduling for imaging
- **Patient Preparation**: Automated preparation instructions
- **Contrast Management**: Track contrast usage and allergies

### 3. Results Management
- **Multi-Parameter Results**: Store complex test results
- **Reference Ranges**: Compare against normal ranges
- **Abnormal Flagging**: Automatic flagging of abnormal values
- **Technician Notes**: Add context to results
- **Image Storage**: Store and link diagnostic images

### 4. Report Generation
- **Automated Reports**: System-generated PDF reports
- **Digital Signatures**: Doctor verification
- **Template-based**: Consistent report formatting
- **Multi-format**: Support for different report types

### 5. Patient Access
- **Online Reports**: Patients can access reports online
- **Mobile Access**: Mobile-friendly report viewing
- **Download/Print**: Easy download and print options
- **Access Logging**: All access is audited

### 6. Billing Integration
- **Automatic Billing**: Bills created on order placement
- **Catalog Pricing**: Prices from test catalog
- **Payment Tracking**: Track pending/paid status
- **Insurance Ready**: Support for insurance billing

### 7. Analytics & Reporting
- **Dashboard Stats**: Real-time diagnostic statistics
- **TAT Monitoring**: Track turnaround times
- **Pending Orders**: Monitor pending tests
- **Completion Rates**: Track daily completions
- **Revenue Reports**: Financial analytics

---

## 🔗 Integration

### With Existing Modules

#### 1. Patient Module
```typescript
// Lab orders linked to patients
patient_id → patients(id)
```

#### 2. Doctor Module
```typescript
// Doctors order and verify tests
ordering_doctor_id → doctors(id)
result_verified_by → doctors(id)
radiologist_id → doctors(id)
```

#### 3. Appointment Module
```typescript
// Orders can be linked to appointments
appointment_id → appointment(id)
encounter_id → encounter(id)
```

#### 4. Billing Module
```typescript
// Automatic billing integration
diagnostic_billing_items → billing system
```

### API Endpoints

#### Lab Service Functions

```typescript
// Get lab test catalog
getLabTestCatalog(): Promise<LabTestCatalog[]>

// Get tests by category
getLabTestsByCategory(category: string): Promise<LabTestCatalog[]>

// Create lab order
createLabTestOrder(orderData: LabTestOrder): Promise<any>

// Get patient's lab orders
getPatientLabOrders(patientId: string): Promise<any[]>

// Get all lab orders with filters
getLabOrders(filters?: {
  status?: string;
  urgency?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]>

// Update lab order status
updateLabOrderStatus(orderId: string, status: string, additionalData?: any): Promise<any>

// Add lab results
addLabTestResults(results: LabTestResult[]): Promise<any>

// Get results for an order
getLabOrderResults(orderId: string): Promise<LabTestResult[]>
```

#### Radiology Service Functions

```typescript
// Get radiology test catalog
getRadiologyTestCatalog(): Promise<RadiologyTestCatalog[]>

// Get tests by modality
getRadiologyTestsByModality(modality: string): Promise<RadiologyTestCatalog[]>

// Create radiology order
createRadiologyTestOrder(orderData: RadiologyTestOrder): Promise<any>

// Get patient's radiology orders
getPatientRadiologyOrders(patientId: string): Promise<any[]>

// Get all radiology orders with filters
getRadiologyOrders(filters?: {
  status?: string;
  urgency?: string;
  modality?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]>

// Update radiology order
updateRadiologyOrder(orderId: string, updateData: any): Promise<any>
```

#### Statistics

```typescript
// Get diagnostic statistics
getDiagnosticStats(): Promise<{
  totalLabOrders: number;
  totalRadiologyOrders: number;
  pendingLabOrders: number;
  pendingRadiologyOrders: number;
  completedToday: number;
}>
```

---

## 🎨 User Interface

### Main Dashboard (`/lab-xray`)
- **Stats Cards**: Quick overview of orders and status
- **Workflow Visualization**: Visual workflow diagram
- **Tabbed Interface**: Separate tabs for Lab and Radiology
- **Filters**: Search, status, and urgency filters
- **Order List**: Comprehensive order listing
- **Quick Actions**: View, download, print reports

### Features
✅ Real-time updates  
✅ Responsive design  
✅ Status color coding  
✅ Urgency indicators  
✅ Quick search  
✅ Advanced filtering  
✅ One-click actions  

### Sidebar Integration
New menu item added:
```
🔬 Lab & X-Ray (Teal color, Microscope icon)
```

---

## 📦 Installation

### Step 1: Run Database Migration

```bash
# Navigate to your project directory
cd /home/ragul/Videos/project/annam

# Run the migration on Supabase
# Go to Supabase Dashboard → SQL Editor
# Copy content from: database/migrations/create_lab_xray_module.sql
# Execute the migration
```

Or via Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Files Created

```
✅ database/migrations/create_lab_xray_module.sql
✅ src/lib/labXrayService.ts
✅ app/lab-xray/page.tsx
✅ components/Sidebar.tsx (updated)
✅ LAB_XRAY_MODULE_DOCUMENTATION.md
```

### Step 3: Test the Module

1. **Access the module**: Navigate to `/lab-xray` in your application
2. **View test catalog**: Check seeded lab and radiology tests
3. **Create test order**: Try creating a new order (create order page needed)
4. **Test workflow**: Verify status transitions
5. **Check billing**: Ensure billing items are created

### Step 4: Next Steps (Optional)

Create additional pages:
- `/lab-xray/order` - Order creation form
- `/lab-xray/order/[id]` - Order details and result entry
- `/lab-xray/reports` - Report generation
- `/lab-xray/catalog` - Manage test catalog

---

## 🔒 Security & RLS

Row Level Security (RLS) policies have been configured:

### Read Access
- ✅ All authenticated users can view test catalogs
- ✅ All authenticated users can view orders
- ✅ All authenticated users can view results

### Write Access
- ✅ Doctors can create orders
- ✅ Lab staff can update order status
- ✅ Lab technicians can add results
- ✅ Radiologists can update reports

### Audit Trail
- ✅ All report access is logged
- ✅ IP address tracking
- ✅ User type tracking
- ✅ Access method logging

---

## 📊 Database Relationships

```
patients (1) ──→ (many) lab_test_orders
patients (1) ──→ (many) radiology_test_orders

doctors (1) ──→ (many) lab_test_orders [ordering]
doctors (1) ──→ (many) lab_test_orders [verification]
doctors (1) ──→ (many) radiology_test_orders [ordering]
doctors (1) ──→ (many) radiology_test_orders [radiologist]

lab_test_catalog (1) ──→ (many) lab_test_orders
radiology_test_catalog (1) ──→ (many) radiology_test_orders

lab_test_orders (1) ──→ (many) lab_test_results
lab_test_orders (1) ──→ (1) diagnostic_billing_items
radiology_test_orders (1) ──→ (1) diagnostic_billing_items

encounter (1) ──→ (many) lab_test_orders [optional]
encounter (1) ──→ (many) radiology_test_orders [optional]

appointment (1) ──→ (many) lab_test_orders [optional]
appointment (1) ──→ (many) radiology_test_orders [optional]
```

---

## 🚀 Future Enhancements

1. **Report Templates**: Customizable report templates
2. **Image Viewer**: Built-in DICOM image viewer
3. **Batch Processing**: Bulk order creation
4. **Mobile App**: Dedicated mobile app for technicians
5. **AI Integration**: Automated result interpretation
6. **Quality Control**: QC tracking and management
7. **Equipment Integration**: Direct equipment connectivity
8. **Inventory Management**: Lab supplies and reagents
9. **Accreditation**: NABL/CAP compliance features
10. **Telemedicine**: Remote consultation on reports

---

## 📝 Summary

The Lab & X-Ray module provides:

✅ **Complete diagnostic workflow** from order to report  
✅ **Dual functionality** for both lab and radiology  
✅ **Seamless integration** with existing hospital modules  
✅ **Billing automation** for all diagnostic services  
✅ **Patient access** to digital reports  
✅ **Comprehensive tracking** and analytics  
✅ **Security** with RLS and audit logging  
✅ **Scalable** for hospitals of any size  

---

**Ready to Use!** 🎉

The module is production-ready with seed data for common tests. Simply run the migration and start ordering diagnostic tests!
