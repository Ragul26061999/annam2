# Pharmacy Module Documentation

**Last Updated:** October 24, 2025  
**Status:** Core implementation complete with advanced features

---

## Table of Contents

1. [Overview](#overview)
2. [Database Tables](#database-tables)
3. [Pages & Routes](#pages--routes)
4. [Components & Forms](#components--forms)
5. [Services & APIs](#services--apis)
6. [Features](#features)
7. [Workflow](#workflow)
8. [Future Enhancements](#future-enhancements)

---

## Overview

The Pharmacy Module is a comprehensive system for managing medications, inventory, billing, prescriptions, and dispensing operations. It serves as a critical component for the HMS, enabling pharmacists and staff to efficiently manage pharmaceutical operations.

**Key Stakeholders:**
- Pharmacists
- Pharmacy Technicians
- Doctors (prescription creation)
- Patients (medication dispensing)
- Accounting (billing & revenue tracking)

---

## Database Tables

### 1. **medications** (Primary Medication Master)
Stores all medication information in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| medicine_code | VARCHAR | Unique medicine identifier code |
| name | VARCHAR | Medicine name (e.g., "Paracetamol 500mg") |
| generic_name | VARCHAR | Generic/chemical name |
| manufacturer | VARCHAR | Manufacturer name |
| category | VARCHAR | Category (Analgesic, Antibiotic, etc.) |
| dosage_form | VARCHAR | Form (tablets, capsules, ml, etc.) |
| strength | VARCHAR | Strength/concentration |
| unit | VARCHAR | Unit of measurement |
| total_stock | INTEGER | Total stock quantity |
| available_stock | INTEGER | Available stock (after reservations) |
| minimum_stock_level | INTEGER | Reorder threshold |
| purchase_price | DECIMAL | Cost price |
| selling_price | DECIMAL | Retail price |
| mrp | DECIMAL | Maximum Retail Price |
| prescription_required | BOOLEAN | Whether Rx is required |
| storage_conditions | TEXT | Storage instructions |
| side_effects | TEXT | Known side effects |
| status | VARCHAR | active/inactive/discontinued |
| location | VARCHAR | Storage location in pharmacy |
| barcode | TEXT | Barcode data |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:** medicine_code, status, category

---

### 2. **stock_transactions** (Inventory Ledger)
Tracks all stock movements (purchases, sales, adjustments, returns, expiry).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| medication_id | UUID | FK to medications |
| transaction_type | VARCHAR | purchase/sale/adjustment/return/expired |
| quantity | INTEGER | Quantity moved (signed for adjustments) |
| unit_price | DECIMAL | Price per unit |
| total_amount | DECIMAL | Calculated: quantity × unit_price |
| batch_number | VARCHAR | Batch identifier |
| expiry_date | DATE | Batch expiry date |
| supplier_id | UUID | FK to supplier (if applicable) |
| notes | TEXT | Transaction notes |
| reference_id | UUID | Link to prescription/bill |
| reference_type | VARCHAR | Type of reference (prescription/bill) |
| performed_by | UUID | FK to users (pharmacist) |
| transaction_date | TIMESTAMP | When transaction occurred |
| created_at | TIMESTAMP | Record creation time |

**Indexes:** medication_id, transaction_type, batch_number, transaction_date

---

### 3. **prescriptions** (Doctor Prescriptions)
Stores prescriptions created by doctors.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| prescription_id | VARCHAR | Human-readable prescription number |
| patient_id | UUID | FK to patients |
| doctor_id | UUID | FK to users (doctor) |
| issue_date | DATE | Date prescription issued |
| status | VARCHAR | pending/partial/complete/cancelled |
| notes | TEXT | Doctor's notes |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 4. **prescription_items** (Individual Medications in Prescription)
Line items for each prescription.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| prescription_id | UUID | FK to prescriptions |
| medication_id | UUID | FK to medications |
| medication_name | VARCHAR | Medication name (denormalized) |
| quantity | INTEGER | Quantity prescribed |
| dosage | VARCHAR | Dosage (e.g., "500mg") |
| frequency | VARCHAR | Frequency (e.g., "3 times daily") |
| duration | VARCHAR | Duration (e.g., "7 days") |
| unit_price | DECIMAL | Price per unit |
| total_price | DECIMAL | Total for this item |
| status | VARCHAR | pending/dispensed/cancelled |
| created_at | TIMESTAMP | Record creation time |

---

### 5. **prescription_dispensed** (Dispensing Records)
Tracks when prescriptions are dispensed to patients.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| prescription_id | UUID | FK to prescriptions |
| patient_id | UUID | FK to patients |
| dispensed_by | UUID | FK to users (pharmacist) |
| dispensed_at | TIMESTAMP | When dispensed |
| total_amount | DECIMAL | Total amount charged |
| payment_status | VARCHAR | pending/paid/partial/refunded |
| notes | TEXT | Dispensing notes |
| created_at | TIMESTAMP | Record creation time |

---

### 6. **prescription_dispensed_items** (Dispensed Medication Items)
Individual items dispensed from a prescription.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| prescription_dispensed_id | UUID | FK to prescription_dispensed |
| medication_id | UUID | FK to medications |
| quantity_dispensed | INTEGER | Quantity actually dispensed |
| unit_price | DECIMAL | Price per unit |
| total_price | DECIMAL | Total for this item |
| batch_number | VARCHAR | Batch dispensed |
| created_at | TIMESTAMP | Record creation time |

---

### 7. **pharmacy_bills** (Billing Records)
Main billing table for pharmacy transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bill_number | VARCHAR | Unique bill number |
| patient_id | UUID | FK to patients (nullable for walk-ins) |
| customer_name | VARCHAR | Customer name (for walk-ins) |
| subtotal | DECIMAL | Sum of item amounts |
| discount | DECIMAL | Discount amount |
| tax_amount | DECIMAL | Tax calculated |
| tax_rate | DECIMAL | Tax percentage |
| total_amount | DECIMAL | Final amount |
| payment_method | VARCHAR | cash/card/insurance/online |
| payment_status | VARCHAR | pending/paid/partial/refunded/completed |
| created_by | UUID | FK to users (pharmacist) |
| bill_date | DATE | Date of bill |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

---

### 8. **pharmacy_bill_items** (Bill Line Items)
Individual items in a pharmacy bill.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bill_id | UUID | FK to pharmacy_bills |
| medicine_id | UUID | FK to medications |
| quantity | INTEGER | Quantity sold |
| unit_price | DECIMAL | Price per unit |
| total_amount | DECIMAL | Total for item |
| batch_number | VARCHAR | Batch sold |
| expiry_date | DATE | Batch expiry |
| created_at | TIMESTAMP | Record creation time |

---

### 9. **medicine_batches** (Batch Tracking - Optional)
Detailed batch-level tracking for advanced inventory management.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| medicine_id | UUID | FK to medications |
| batch_number | VARCHAR | Unique batch identifier |
| manufacturing_date | DATE | Manufacturing date |
| expiry_date | DATE | Expiry date |
| current_quantity | INTEGER | Current quantity in batch |
| purchase_price | DECIMAL | Purchase price per unit |
| selling_price | DECIMAL | Selling price per unit |
| supplier_id | UUID | FK to supplier |
| status | VARCHAR | active/expired/low_stock |
| received_date | DATE | Date received |
| notes | TEXT | Batch notes |
| created_at | TIMESTAMP | Record creation time |

---

## Pages & Routes

### 1. **Main Pharmacy Dashboard**
**Route:** `/pharmacy`  
**File:** `/app/pharmacy/page.tsx`

**Features:**
- Dashboard with KPI cards (Total Medicines, Low Stock, Today's Sales, Pending Orders)
- Tab-based navigation (Dashboard, Prescribed List, New Billing, Inventory, Billing History)
- Recent medicines display with stock status indicators
- Recent bills overview
- Search and category filtering
- Real-time stats loading

**Components Used:**
- Stats cards with icons
- Medicine cards with stock badges
- Bill cards with payment status
- Tab navigation system

---

### 2. **Inventory Management**
**Route:** `/pharmacy/inventory`  
**File:** `/app/pharmacy/inventory/page.tsx`

**Features:**
- Medicine list with batch-wise tracking
- Search by name, category, manufacturer
- Filter by status (Active, Low Stock, Expired)
- Add new medicine modal
- Add batch modal for existing medicines
- Batch purchase history modal
- Per-batch stock statistics (Remaining, Sold this month)
- Expiry date tracking with visual warnings
- Manufacturing and expiry date display
- Supplier information

**Key Functionality:**
- Dashboard KPIs: Total Medicines, Total Batches, Low Stock, Expiring Soon, Expired
- Batch-level details: Quantity, Unit Cost, Selling Price, Received Date
- Visual indicators for expired/expiring soon batches
- Purchase history modal showing batch sales history

---

### 3. **Billing Management**
**Route:** `/pharmacy/billing`  
**File:** `/app/pharmacy/billing/page.tsx`

**Features:**
- View all pharmacy bills
- Search by patient name, ID, or bill number
- Filter by status (Completed, Pending, Cancelled)
- Filter by payment method (Cash, Card, Insurance)
- Filter by date range (Today, This Week, This Month)
- Bill cards showing:
  - Bill number and patient info
  - Total amount with payment status
  - Date and time
  - Number of items
- Revenue analytics:
  - Total bills count
  - Today's revenue
  - Total revenue (filtered)
  - Average bill amount
- View and download bill options

---

### 4. **New Billing**
**Route:** `/pharmacy/newbilling`  
**File:** `/app/pharmacy/newbilling/page.tsx`

**Features:**
- Create new pharmacy bills
- Patient search (registered or walk-in)
- Medicine selection with batch filtering
- Batch selection with expiry validation
- Quantity input with stock validation
- Payment method selection (Cash, Card, UPI, Credit)
- QR code generation for batch tracking
- Bill items management (Add/Remove)
- Payment modal with multiple payment options
- Bill confirmation and receipt generation

**Workflow:**
1. Select customer (Patient or Walk-in)
2. Search and add medicines
3. Select batch and quantity
4. Review bill items
5. Choose payment method
6. Process payment
7. Generate receipt

---

### 5. **Prescribed Medications**
**Route:** `/pharmacy/prescribed`  
**File:** `/app/pharmacy/page.tsx` (Tab)

**Features:**
- List pending prescriptions
- Filter by status (Pending, Partial, Complete)
- Dispense medications from prescriptions
- Track dispensing status
- Link to patient medication history

---

### 6. **MD Pharmacy Dashboard** (Doctor View)
**Route:** `/app/md/pharmacy`  
**File:** `/app/md/pharmacy/page.tsx`

**Features:**
- Doctor-specific pharmacy view
- Medicine inventory overview
- Low stock alerts
- Sales dashboard
- Prescription tracking
- Quick access to create prescriptions

---

## Components & Forms

### 1. **PharmacyManagement.tsx**
**Location:** `/src/components/PharmacyManagement.tsx`

**Purpose:** Main pharmacy management component with multiple tabs and modals.

**Tabs:**
- Dashboard: Stats and low stock alerts
- Inventory: Medication list with stock management
- Billing: Bill history and management
- Dispensing: Prescription dispensing interface
- Prescriptions: Pending prescriptions list

**Modals:**
- Add Stock Modal: Add inventory for medications
- Adjust Stock Modal: Adjust stock for damaged/expired items
- Billing Modal: Create new bills
- Dispense Modal: Dispense prescriptions

**Props:**
```typescript
interface PharmacyManagementProps {
  userId: string;
  userRole: string;
}
```

---

### 2. **PharmacyBillingForm.tsx**
**Location:** `/src/components/PharmacyBillingForm.tsx`

**Purpose:** Comprehensive form for creating pharmacy bills.

**Features:**
- Patient/customer selection
- Medicine search and selection
- Batch selection with expiry validation
- Quantity input with stock checking
- Discount and tax calculation
- Payment method selection
- Bill preview
- Receipt generation

**Props:**
```typescript
interface PharmacyBillingFormProps {
  onClose: () => void;
  onBillCreated: () => void;
  currentUser: { id: string };
  billingType: 'custom' | 'prescription';
}
```

---

### 3. **PharmacyBillingForm.tsx** (Alternative)
**Location:** `/src/components/PharmacyBillingForm.tsx`

**Purpose:** Simplified billing form for quick transactions.

**Features:**
- Quick medicine search
- Batch selection
- Quantity input
- Total calculation
- Payment processing

---

## Services & APIs

### **pharmacyService.ts**
**Location:** `/src/lib/pharmacyService.ts`

**Core Functions:**

#### Medication Management
```typescript
// Get all medications with optional filters
getMedications(filters?: {
  category?: string;
  prescription_required?: boolean;
  search?: string;
  status?: string;
}): Promise<Medication[]>

// Get single medication by ID
getMedicationById(id: string): Promise<Medication | null>

// Get medications with low stock
getLowStockMedications(): Promise<Medication[]>

// Search medications
searchMedications(searchTerm: string): Promise<Medication[]>

// Get all categories
getMedicationCategories(): Promise<string[]>
```

#### Stock Management
```typescript
// Add stock (purchase)
addStock(
  medicationId: string,
  quantity: number,
  unitPrice: number,
  supplierName?: string,
  batchNumber?: string,
  expiryDate?: string,
  notes?: string,
  performedBy?: string
): Promise<StockTransaction>

// Get stock transactions
getStockTransactions(
  medicationId?: string,
  transactionType?: string,
  limit?: number
): Promise<StockTransaction[]>

// Adjust stock (damage, expiry, loss)
adjustStock(
  medicationId: string,
  adjustmentQuantity: number,
  reason: string,
  notes: string,
  userId: string
): Promise<StockTransaction>

// Get stock summary stats
getStockSummaryStats(): Promise<{
  remainingUnits: number;
  soldUnitsThisMonth: number;
  purchasedUnitsThisMonth: number;
}>

// Get per-batch stock stats
getBatchStockStats(batchNumber: string): Promise<{
  remainingUnits: number;
  soldUnitsThisMonth: number;
  purchasedUnitsThisMonth: number;
}>
```

#### Patient Medication History
```typescript
// Get patient's medication history
getPatientMedicationHistory(patientId: string): Promise<MedicationHistory[]>
```

#### Dashboard Analytics
```typescript
// Get pharmacy dashboard statistics
getPharmacyDashboardStats(): Promise<{
  totalMedications: number;
  lowStockCount: number;
  todaySales: number;
  pendingBills: number;
  totalRevenue: number;
  prescriptionsDispensed: number;
}>
```

#### Prescription Management
```typescript
// Get pending prescriptions
getPendingPrescriptions(): Promise<PendingPrescription[]>

// Dispense prescription
dispensePrescription(
  prescriptionId: string,
  items: Array<{
    medication_id: string;
    quantity_dispensed: number;
  }>,
  userId: string
): Promise<PrescriptionDispensing>
```

#### Billing Functions
```typescript
// Create pharmacy bill with items
createPharmacyBill(
  patientId: string,
  items: Array<{
    medication_id: string;
    quantity: number;
    unit_price: number;
    batch_id?: string;
    batch_number?: string;
    expiry_date?: string;
  }>,
  discount: number,
  taxRate: number,
  paymentMethod: string,
  userId: string
): Promise<PharmacyBilling>

// Get pharmacy bills
getPharmacyBills(patientId?: string): Promise<PharmacyBilling[]>

// Get batch purchase history
getBatchPurchaseHistory(batchNumber: string): Promise<BatchPurchaseHistoryEntry[]>
```

---

## Features

### 1. **Inventory Management**
- ✅ Medicine master data management
- ✅ Batch-wise tracking
- ✅ Stock level monitoring
- ✅ Low stock alerts
- ✅ Expiry date tracking
- ✅ Stock transactions ledger
- ✅ Batch purchase history
- ✅ Per-batch stock statistics

### 2. **Billing System**
- ✅ Create bills for registered patients
- ✅ Walk-in customer billing
- ✅ Multiple payment methods (Cash, Card, Insurance, Online)
- ✅ Discount and tax calculation
- ✅ Bill history and search
- ✅ Payment status tracking
- ✅ Revenue analytics
- ✅ Bill printing/download

### 3. **Prescription Management**
- ✅ View pending prescriptions
- ✅ Dispense medications
- ✅ Track dispensing status
- ✅ Link prescriptions to bills
- ✅ Prescription history

### 4. **Dashboard & Analytics**
- ✅ Real-time KPI cards
- ✅ Today's sales tracking
- ✅ Revenue analytics
- ✅ Low stock alerts
- ✅ Prescription dispensing stats
- ✅ Batch-level statistics

### 5. **Search & Filtering**
- ✅ Search medicines by name, code, category
- ✅ Filter by category
- ✅ Filter by stock status
- ✅ Filter bills by date, payment method, status
- ✅ Search prescriptions by patient/doctor

### 6. **Data Validation**
- ✅ Stock availability checking
- ✅ Expiry date validation
- ✅ Batch quantity validation
- ✅ Prescription quantity validation
- ✅ Payment amount validation

---

## Workflow

### **Pharmacy Billing Workflow**

```
1. CUSTOMER SELECTION
   ├─ Search existing patient (by name, UHID, phone)
   ├─ Or create walk-in customer entry
   └─ Confirm customer details

2. MEDICINE SELECTION
   ├─ Search medicine by name/code
   ├─ View available batches
   ├─ Check stock and expiry
   └─ Select batch and quantity

3. BILL PREPARATION
   ├─ Add multiple items
   ├─ Review quantities and prices
   ├─ Apply discount (if applicable)
   ├─ Calculate tax
   └─ Display total amount

4. PAYMENT PROCESSING
   ├─ Select payment method
   ├─ Process payment
   ├─ Update payment status
   └─ Generate bill number

5. RECEIPT & COMPLETION
   ├─ Generate receipt
   ├─ Print/Email receipt
   ├─ Update inventory
   └─ Record transaction
```

### **Prescription Dispensing Workflow**

```
1. VIEW PENDING PRESCRIPTIONS
   ├─ Filter by patient/doctor
   ├─ Check prescription details
   └─ Select prescription to dispense

2. VERIFY PRESCRIPTION
   ├─ Check medication availability
   ├─ Verify quantities
   ├─ Check expiry dates
   └─ Confirm patient allergies

3. DISPENSE MEDICATIONS
   ├─ Select batch for each item
   ├─ Enter dispensed quantity
   ├─ Add pharmacist notes
   └─ Confirm dispensing

4. BILLING & PAYMENT
   ├─ Calculate total
   ├─ Apply discounts
   ├─ Process payment
   └─ Generate receipt

5. RECORD KEEPING
   ├─ Update prescription status
   ├─ Record dispensing details
   ├─ Update inventory
   └─ Archive receipt
```

### **Inventory Management Workflow**

```
1. STOCK RECEIPT
   ├─ Add new medicine (if needed)
   ├─ Enter batch details
   ├─ Input quantity and cost
   ├─ Set expiry date
   └─ Record supplier info

2. STOCK MONITORING
   ├─ View current stock levels
   ├─ Check expiry dates
   ├─ Monitor low stock items
   └─ Track batch history

3. STOCK ADJUSTMENT
   ├─ Identify discrepancy
   ├─ Select reason (damage, expiry, loss)
   ├─ Enter adjustment quantity
   └─ Record notes

4. STOCK REPORTING
   ├─ Generate stock reports
   ├─ Track batch-wise sales
   ├─ Monitor inventory trends
   └─ Export data
```

---

## Future Enhancements

### Phase 2 - Advanced Features
- [ ] **Supplier Management**
  - Supplier master data
  - Purchase order generation
  - Supplier performance tracking
  - Automated reorder suggestions

- [ ] **Prescription Integration**
  - Direct prescription import from clinical module
  - Automatic bill generation from prescriptions
  - Insurance claim processing
  - Prescription expiry tracking

- [ ] **Advanced Analytics**
  - Medicine consumption trends
  - Profitability analysis by category
  - Seasonal demand forecasting
  - Inventory optimization recommendations

- [ ] **Barcode/QR Integration**
  - Barcode scanning for quick billing
  - QR code generation for batch tracking
  - Batch recall management
  - Medicine authenticity verification

- [ ] **Insurance Integration**
  - Insurance claim processing
  - Policy coverage validation
  - Automated claim submission
  - Claim status tracking

### Phase 3 - Optimization
- [ ] **Mobile App**
  - Mobile billing interface
  - Inventory check on mobile
  - Prescription dispensing on mobile
  - Offline mode support

- [ ] **Automation**
  - Automated low stock alerts
  - Automated reorder generation
  - Batch expiry notifications
  - Inventory reconciliation

- [ ] **Compliance**
  - Audit trail for all transactions
  - Regulatory reporting
  - Medicine recall management
  - Controlled substance tracking

- [ ] **Performance**
  - Batch processing for large bills
  - Real-time inventory sync
  - Advanced caching strategies
  - Database optimization

---

## Key Interfaces

### Medication Interface
```typescript
interface Medication {
  id: string;
  medicine_code: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit: string;
  total_stock: number;
  available_stock: number;
  minimum_stock_level: number;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  prescription_required: boolean;
  storage_conditions?: string;
  side_effects?: string;
  status: 'active' | 'inactive' | 'discontinued';
  location?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
}
```

### PharmacyBilling Interface
```typescript
interface PharmacyBilling {
  id: string;
  bill_number: string;
  patient_id: string;
  patient_name?: string;
  items: PharmacyBillItem[];
  subtotal: number;
  discount: number;
  tax_amount: number;
  tax_rate: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'insurance' | 'online';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

### StockTransaction Interface
```typescript
interface StockTransaction {
  id: string;
  medication_id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'expired';
  quantity: number;
  unit_price: number;
  total_amount?: number | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  supplier_id?: string | null;
  notes?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  performed_by?: string | null;
  transaction_date?: string | null;
  created_at: string;
}
```

---

## Configuration & Setup

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup
All tables are created via Supabase migrations. Key migrations:
- `create_medications_table`
- `create_stock_transactions_table`
- `create_prescriptions_table`
- `create_pharmacy_bills_table`
- `create_pharmacy_bill_items_table`

### User Roles
- **Pharmacist**: Full access to all pharmacy functions
- **Pharmacy Technician**: Limited access (billing, dispensing)
- **Doctor**: Prescription creation only
- **Admin**: Full system access

---

## Support & Troubleshooting

### Common Issues

**Issue:** Low stock alerts not showing
- Check `minimum_stock_level` is set correctly
- Verify `available_stock` is updated after transactions
- Check database triggers for stock updates

**Issue:** Bills not saving
- Verify patient exists or walk-in customer name is provided
- Check payment method is valid
- Ensure all required fields are filled

**Issue:** Batch history not loading
- Verify batch_number is correctly recorded
- Check stock_transactions table for batch entries
- Ensure date range is correct

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 2025 | Initial pharmacy module with core features |
| 1.1 | Oct 2025 | Added batch-wise inventory tracking |
| 1.2 | Oct 2025 | Enhanced billing with walk-in support |

---

**Document Prepared For:** HMS Annam Project  
**Client:** [Client Name]  
**Prepared By:** Development Team  
**Last Reviewed:** October 24, 2025
