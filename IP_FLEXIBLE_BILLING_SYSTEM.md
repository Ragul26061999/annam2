# IP Flexible Billing System

## Overview

This document describes the new flexible IP billing system that supports:
- **Bill-wise payment allocation** - Pay specific bills individually
- **Advance tracking** - Receive and track advances with usage history
- **Advance as payment mode** - Use advance balance to pay bills
- **Per-item discounts** - Apply discounts to individual bill items
- **Bill alterations** - Edit bill items with audit trail

---

## Database Schema

### New Tables

#### 1. `ip_advances`
Tracks all advance payments received from patients.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bed_allocation_id | UUID | FK to bed_allocations |
| patient_id | UUID | FK to patients |
| amount | NUMERIC | Advance amount received |
| payment_type | VARCHAR | cash, card, upi, net_banking, cheque, insurance |
| reference_number | VARCHAR | Transaction reference |
| notes | TEXT | Additional notes |
| advance_date | TIMESTAMP | Date advance was received |
| used_amount | NUMERIC | How much has been used |
| available_amount | NUMERIC | Computed: amount - used_amount |
| status | VARCHAR | active, fully_used, refunded, cancelled |

#### 2. `ip_bill_items`
Unified bill line items from all sources (lab, pharmacy, surgery, etc.)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bed_allocation_id | UUID | FK to bed_allocations |
| patient_id | UUID | FK to patients |
| bill_category | VARCHAR | bed_charges, doctor_consultation, surgery, pharmacy, lab, radiology, etc. |
| source_table | VARCHAR | Original table name (e.g., 'lab_test_orders') |
| source_id | UUID | ID in source table |
| description | TEXT | Item description |
| quantity | NUMERIC | Quantity |
| unit_price | NUMERIC | Price per unit |
| gross_amount | NUMERIC | Computed: quantity × unit_price |
| discount_percent | NUMERIC | Discount percentage |
| discount_amount | NUMERIC | Discount amount |
| discount_reason | TEXT | Reason for discount |
| net_amount | NUMERIC | Computed: gross - discount |
| paid_amount | NUMERIC | Amount paid so far |
| pending_amount | NUMERIC | Computed: net - paid |
| payment_status | VARCHAR | pending, partial, paid, waived, cancelled |
| acknowledged | BOOLEAN | Billing verification flag |

#### 3. `ip_bill_payments`
Payment transactions with support for advance usage.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bed_allocation_id | UUID | FK to bed_allocations |
| patient_id | UUID | FK to patients |
| payment_date | TIMESTAMP | Payment date |
| payment_type | VARCHAR | cash, card, upi, net_banking, cheque, insurance, **advance** |
| total_amount | NUMERIC | Total payment amount |
| reference_number | VARCHAR | Transaction reference |
| advance_id | UUID | FK to ip_advances (if payment_type = 'advance') |
| receipt_number | VARCHAR | Auto-generated receipt number |

#### 4. `ip_bill_payment_allocations`
Links payments to specific bill items (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| payment_id | UUID | FK to ip_bill_payments |
| bill_item_id | UUID | FK to ip_bill_items |
| allocated_amount | NUMERIC | Amount allocated to this bill item |

#### 5. `ip_bill_discounts`
Discount history and approvals.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bed_allocation_id | UUID | FK to bed_allocations |
| bill_item_id | UUID | FK to ip_bill_items (NULL for overall) |
| discount_type | VARCHAR | percentage or fixed |
| discount_value | NUMERIC | Discount value |
| discount_amount | NUMERIC | Calculated amount |
| reason | TEXT | Reason for discount |
| approved_by | UUID | Who approved |

---

## Bill Categories

| Category | Description |
|----------|-------------|
| bed_charges | Room/bed charges |
| doctor_consultation | Doctor consultation fees |
| doctor_services | Professional services |
| surgery | Surgery charges |
| pharmacy | Pharmacy bills |
| lab | Lab test charges |
| radiology | Radiology/imaging charges |
| nursing | Nursing care charges |
| equipment | Equipment rental |
| consumables | Medical consumables |
| other | Other charges |

---

## Service Functions

### File: `src/lib/ipFlexibleBillingService.ts`

### Advance Functions
- `createAdvance()` - Receive new advance
- `getAdvances()` - Get all advances for a bed allocation
- `getAvailableAdvances()` - Get advances with available balance
- `getTotalAvailableAdvance()` - Get total available advance amount
- `cancelAdvance()` - Cancel an advance

### Bill Item Functions
- `createBillItem()` - Create single bill item
- `createBillItems()` - Create multiple bill items
- `getBillItems()` - Get all bill items
- `getPendingBillItems()` - Get unpaid/partial items
- `updateBillItem()` - Update bill item details
- `applyDiscountToBillItem()` - Apply discount to item
- `cancelBillItem()` - Cancel a bill item
- `acknowledgeBillItem()` - Mark item as verified

### Payment Functions
- `createPaymentWithAllocations()` - Create payment with bill-wise allocation
- `payWithAdvance()` - Pay bills using advance balance
- `getPayments()` - Get all payments
- `getPaymentAllocations()` - Get allocations for a payment

### Summary Functions
- `getBillingSummary()` - Get billing summary view
- `getBillItemsByCategory()` - Get items grouped by category
- `syncBillItemsFromSources()` - Sync from source tables (lab, pharmacy, etc.)

### Utility Functions
- `calculateCategoryTotals()` - Calculate totals by category
- `calculateOverallTotals()` - Calculate overall totals

---

## UI Components

### 1. `IPAdvanceReceiptModal.tsx`
Modal for receiving advance payments from patients.

**Features:**
- Select payment type (cash, card, UPI, etc.)
- Enter amount and reference number
- Add notes
- Creates record in `ip_advances` table

### 2. `IPBillWisePaymentModal.tsx`
Modal for bill-wise payment with advance usage.

**Features:**
- Shows all pending bill items grouped by category
- Select specific bills to pay
- Enter partial or full payment per bill
- Option to use advance balance
- Split payment: part from advance, part from cash/card
- Creates records in `ip_bill_payments` and `ip_bill_payment_allocations`

---

## Payment Flow

### Receiving Advance
```
1. Open IPAdvanceReceiptModal
2. Enter amount, payment type, reference
3. Save → Creates ip_advances record
4. Advance available for future bill payments
```

### Paying Bills
```
1. Open IPBillWisePaymentModal
2. Select bills to pay (checkbox)
3. Enter payment amount per bill (or pay full)
4. Optionally use advance balance
5. Enter payment details (type, reference)
6. Save → Creates:
   - ip_bill_payments record
   - ip_bill_payment_allocations for each bill
   - Updates ip_bill_items.paid_amount (via trigger)
   - Updates ip_advances.used_amount if advance used (via trigger)
```

### Applying Discount
```
1. Call applyDiscountToBillItem(billItemId, type, value, reason, approvedBy)
2. Updates ip_bill_items discount fields
3. Creates ip_bill_discounts history record
```

---

## Database Triggers

### 1. `update_bill_item_paid_amount`
When payment allocation is inserted/deleted:
- Updates `ip_bill_items.paid_amount`
- Updates `ip_bill_items.payment_status`

### 2. `update_advance_used_amount`
When payment with type='advance' is created:
- Updates `ip_advances.used_amount`
- Updates `ip_advances.status` if fully used

---

## View: `ip_billing_summary`

Provides aggregated billing summary per bed allocation:
- Category-wise totals
- Gross, discount, net, paid, pending totals
- Total advance and available advance

---

## Migration

Run the migration file:
```
supabase/migrations/20260123170000_flexible_ip_billing_system.sql
```

---

## Integration Steps

### Step 1: Apply Migration
```bash
# Via Supabase CLI
supabase db push

# Or run SQL directly in Supabase dashboard
```

### Step 2: Sync Existing Data
Call `syncBillItemsFromSources()` for each active bed allocation to populate `ip_bill_items` from existing source tables.

### Step 3: Update IPBillingView
Add buttons for:
- "Receive Advance" → Opens `IPAdvanceReceiptModal`
- "Pay Bills" → Opens `IPBillWisePaymentModal`

### Step 4: Update Existing Payment Flow
Replace or supplement existing `IPPaymentReceiptModal` with `IPBillWisePaymentModal` for bill-wise payments.

---

## Example Usage

```typescript
import {
  createAdvance,
  getBillItems,
  applyDiscountToBillItem,
  createPaymentWithAllocations,
  payWithAdvance
} from '@/lib/ipFlexibleBillingService';

// Receive advance
await createAdvance({
  bed_allocation_id: 'xxx',
  patient_id: 'yyy',
  amount: 10000,
  payment_type: 'cash'
});

// Apply discount to a bill item
await applyDiscountToBillItem(
  billItemId,
  'percentage',
  10, // 10% discount
  'Senior citizen discount',
  userId
);

// Pay specific bills
await createPaymentWithAllocations({
  payment: {
    bed_allocation_id: 'xxx',
    patient_id: 'yyy',
    payment_type: 'card',
    total_amount: 5000,
    reference_number: 'TXN123'
  },
  allocations: [
    { bill_item_id: 'item1', amount: 3000 },
    { bill_item_id: 'item2', amount: 2000 }
  ]
});

// Pay using advance
await payWithAdvance(
  bedAllocationId,
  patientId,
  [
    { bill_item_id: 'item1', amount: 3000 },
    { bill_item_id: 'item2', amount: 2000 }
  ],
  userId
);
```

---

## Benefits

1. **Bill-wise Tracking** - Know exactly which bills are paid/pending
2. **Advance Management** - Track advances with usage history
3. **Flexible Payments** - Pay any combination of bills
4. **Discount Control** - Per-item discounts with approval tracking
5. **Audit Trail** - Full history of edits, discounts, payments
6. **No Errors** - Automatic calculation via database triggers
