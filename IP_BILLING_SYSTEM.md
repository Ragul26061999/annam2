# IP Billing System Documentation

## Overview
Comprehensive IP (Inpatient) billing system that aggregates charges from all departments and generates detailed billing reports with print functionality.

## Features

### 1. **Comprehensive Billing Breakdown**
- **Bed Charges**: Calculated based on bed type, daily rate, and total days of stay
- **Doctor Consultation**: Consultation fee multiplied by total days (e.g., 3 days × ₹150 = ₹450)
- **Pharmacy Billing**: Aggregates all pharmacy bills during IP admission period
- **Lab Billing**: Aggregates all lab test orders during admission
- **Radiology/X-Ray Billing**: Aggregates all radiology orders during admission
- **Other Charges**: Additional services and procedures

### 2. **Print Template**
Professional print layout matching hospital format with:
- Hospital logo and address header
- Patient information and bill details
- Detailed service breakdown table
- Payment summary with advance, discount, and net payable
- Amount in words
- Payment status stamp (CASH PAID/PARTIAL PAID/PENDING)
- Signature sections

## Files Created

### Service Layer
**`/src/lib/ipBillingService.ts`**
- `getIPComprehensiveBilling(bedAllocationId)` - Fetches all billing data
- `saveIPBilling(bedAllocationId, billingData)` - Saves billing to database
- `generateIPBillNumber()` - Generates unique bill number (format: IPB2500001)

### Components
**`/src/components/ip-clinical/IPBillingView.tsx`**
- Main billing view component with breakdown display
- Save and print functionality
- Error handling and loading states

**`/src/components/ip-clinical/IPBillingPrintTemplate.tsx`**
- Professional print template
- Portal-based rendering for clean printing
- Matches hospital billing format from reference images

### Pages
**`/app/inpatient/billing/[id]/page.tsx`**
- Standalone billing page
- Navigate to: `/inpatient/billing/{bedAllocationId}`

## Usage

### 1. Navigate to Billing Page
```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();
router.push(`/inpatient/billing/${bedAllocationId}`);
```

### 2. Use Component Directly
```typescript
import IPBillingView from '@/src/components/ip-clinical/IPBillingView';

<IPBillingView 
  bedAllocationId={bedAllocationId}
  patient={patient}
  bedAllocation={bedAllocation}
/>
```

### 3. Print Bill
Click the "Print Bill" button or call `window.print()` when on the billing page.

## Billing Calculation Logic

### Days Calculation
```typescript
// Minimum 1 day, rounded up
const diffTime = Math.abs(dischargeDate - admissionDate);
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
const totalDays = Math.max(1, diffDays);
```

### Doctor Consultation
```typescript
const consultationTotal = consultationFee * totalDays;
// Example: ₹500/day × 3 days = ₹1,500
```

### Bed Charges
```typescript
const bedTotal = dailyRate * totalDays;
// Example: ₹1,000/day × 3 days = ₹3,000
```

### Summary
```typescript
const grossTotal = bedTotal + consultationTotal + pharmacyTotal + 
                   labTotal + radiologyTotal + otherCharges;
const netPayable = grossTotal - advancePaid - discount;
```

## Database Schema

### Tables Used
- `bed_allocations` - IP admission details
- `patients` - Patient information
- `beds` - Bed details and daily rates
- `doctors` - Doctor consultation fees
- `pharmacy_billing` - Pharmacy bills during IP stay
- `lab_test_orders` - Lab test orders
- `radiology_test_orders` - Radiology/X-ray orders
- `billing_item` - Other charges

### Saves To
- `discharge_summaries` - Billing breakdown fields:
  - `bed_days`, `bed_daily_rate`, `bed_total`
  - `pharmacy_amount`, `lab_amount`, `procedure_amount`
  - `other_amount`, `discount_amount`
  - `gross_amount`, `net_amount`, `paid_amount`, `pending_amount`

## Bill Number Format
- **Format**: `IPB{YY}{Sequential}`
- **Example**: `IPB2500001`, `IPB2500002`
- **YY**: Last 2 digits of year (25 for 2025)
- **Sequential**: 5-digit zero-padded running number

## Integration Points

### From Discharge Summary Page
Add a "View Billing" button:
```typescript
<Link href={`/inpatient/billing/${bedAllocationId}`}>
  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
    View Detailed Billing
  </button>
</Link>
```

### From Inpatient Dashboard
Add billing action to patient row:
```typescript
<button 
  onClick={() => router.push(`/inpatient/billing/${patient.bed_allocation_id}`)}
  className="text-blue-600 hover:text-blue-800"
>
  View Bill
</button>
```

## Print Functionality

### How It Works
1. Uses React Portal to render print template in `document.body`
2. Print-specific CSS hides all page content except template
3. `@media print` rules ensure proper A4 formatting
4. Table-based layout for service details

### Print Styles
```css
@media print {
  @page {
    size: A4;
    margin: 15mm;
  }
  
  body > * {
    display: none !important;
  }
  
  body > .print-portal-root {
    display: block !important;
  }
}
```

## API Response Structure

### IPComprehensiveBilling Interface
```typescript
{
  patient: {
    id, patient_id, name, age, gender, phone, address
  },
  admission: {
    ip_number, admission_date, discharge_date, total_days,
    bed_number, room_number, department
  },
  bed_charges: {
    bed_type, daily_rate, days, total_amount
  },
  doctor_consultation: {
    doctor_name, consultation_fee, days, total_amount
  },
  pharmacy_billing: Array<{
    bill_number, bill_date, items, total_amount
  }>,
  lab_billing: Array<{
    order_number, order_date, tests, total_amount
  }>,
  radiology_billing: Array<{
    order_number, order_date, scans, total_amount
  }>,
  other_charges: Array<{
    service_name, rate, quantity, amount
  }>,
  summary: {
    bed_charges_total, doctor_consultation_total,
    pharmacy_total, lab_total, radiology_total,
    other_charges_total, gross_total, advance_paid,
    discount, net_payable
  },
  bill_number, bill_date, status
}
```

## Error Handling

### Common Issues
1. **Bed allocation not found** - Verify bedAllocationId is valid
2. **Missing doctor details** - Defaults to ₹500 consultation fee
3. **No pharmacy/lab bills** - Shows ₹0 in breakdown
4. **Database connection errors** - Shows error message with retry button

### Debugging
```typescript
// Enable detailed logging
console.log('Billing data:', billingData);
console.log('Summary:', billingData.summary);
```

## Future Enhancements
- [ ] Multiple bill types (detailed, summary, department-wise)
- [ ] Payment recording directly from billing page
- [ ] Email/SMS bill delivery
- [ ] Insurance claim integration
- [ ] Historical billing comparison
- [ ] Export to PDF/Excel

## Support
For issues or questions, check:
1. Browser console for errors
2. Database connection status
3. Required tables exist with proper schema
4. Patient has active bed allocation
