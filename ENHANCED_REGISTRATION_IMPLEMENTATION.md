# Enhanced Patient Registration Implementation Guide

## New Features Implemented

### 1. ✅ Two Admission Types
- **Outpatient (OPD)**: For consultations and appointments
- **Inpatient**: For hospital admission with bed allocation

### 2. ✅ Doctor Selection
- Dropdown populated from `doctors` table
- Shows doctor name, specialization, and consultation fee
- Optional field

### 3. ✅ Bed Selection (Inpatient only)
- Dropdown populated from `beds` table (status = 'available')
- Shows bed number, type, room, and daily rate
- Only visible when "Inpatient" is selected

### 4. ✅ Dynamic Pricing
- Base registration fee: ₹100
- Consultation fee: Based on selected doctor
- Bed charges: Based on selected bed (per day rate)
- Real-time calculation displayed

### 5. ✅ Modern Printable Receipt
- Professional design with hospital branding
- Patient information section
- Itemized billing with breakdown
- Print and download functionality
- Responsive and print-optimized

---

## Files Created

### 1. `/src/lib/registrationService.ts`
**Purpose**: Service layer for fetching doctors, beds, and calculating charges

**Functions**:
- `fetchActiveDoctors()` - Get all active doctors with fees
- `fetchAvailableBeds()` - Get available beds with pricing
- `calculateRegistrationCharges()` - Calculate total billing
- `generateBillNumber()` - Generate unique bill number

### 2. `/components/RegistrationReceipt.tsx`
**Purpose**: Modern printable receipt component

**Features**:
- Hospital header with branding
- Patient and admission details
- Itemized billing table
- Print and download buttons
- Professional footer with signature section

---

## Implementation Steps

### Step 1: Update PatientRegistrationForm Interface

Add new fields to the interface:

```typescript
interface PatientRegistrationData {
  // ... existing fields ...
  
  // New fields
  admissionCategory: 'outpatient' | 'inpatient' | '';  // NEW
  selectedDoctorId?: string;  // NEW
  selectedDoctorName?: string;  // NEW
  selectedDoctorFee?: number;  // NEW
  selectedBedId?: string;  // NEW
  selectedBedNumber?: string;  // NEW
  selectedBedRate?: number;  // NEW
}
```

### Step 2: Add State for Doctors and Beds

```typescript
const [doctors, setDoctors] = useState<any[]>([]);
const [beds, setBeds] = useState<any[]>([]);
const [charges, setCharges] = useState<RegistrationCharges | null>(null);
const [showReceipt, setShowReceipt] = useState(false);
```

### Step 3: Fetch Doctors and Beds on Mount

```typescript
useEffect(() => {
  async function loadData() {
    try {
      const [doctorsData, bedsData] = await Promise.all([
        fetchActiveDoctors(),
        fetchAvailableBeds()
      ]);
      setDoctors(doctorsData);
      setBeds(bedsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }
  loadData();
}, []);
```

### Step 4: Update Admission Type Section

Replace the existing admission type dropdown with:

```tsx
{/* Admission Category */}
<div className="col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Admission Category <span className="text-gray-400">(Optional)</span>
  </label>
  <div className="grid grid-cols-2 gap-4">
    <button
      type="button"
      onClick={() => handleInputChange('admissionCategory', 'outpatient')}
      className={`p-4 border-2 rounded-lg transition-all ${
        formData.admissionCategory === 'outpatient'
          ? 'border-orange-500 bg-orange-50'
          : 'border-gray-200 hover:border-orange-300'
      }`}
    >
      <div className="text-center">
        <div className="text-2xl mb-2">🏥</div>
        <div className="font-semibold text-gray-900">Outpatient (OPD)</div>
        <div className="text-sm text-gray-600">Consultation & Appointment</div>
      </div>
    </button>
    
    <button
      type="button"
      onClick={() => handleInputChange('admissionCategory', 'inpatient')}
      className={`p-4 border-2 rounded-lg transition-all ${
        formData.admissionCategory === 'inpatient'
          ? 'border-orange-500 bg-orange-50'
          : 'border-gray-200 hover:border-orange-300'
      }`}
    >
      <div className="text-center">
        <div className="text-2xl mb-2">🛏️</div>
        <div className="font-semibold text-gray-900">Inpatient</div>
        <div className="text-sm text-gray-600">Hospital Admission</div>
      </div>
    </button>
  </div>
</div>

{/* Doctor Selection */}
<div className="col-span-2">
  <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-1">
    Select Consulting Doctor <span className="text-gray-400">(Optional)</span>
  </label>
  <select
    id="doctor"
    value={formData.selectedDoctorId || ''}
    onChange={(e) => {
      const doctor = doctors.find(d => d.id === e.target.value);
      handleInputChange('selectedDoctorId', e.target.value);
      if (doctor) {
        handleInputChange('selectedDoctorName', doctor.users?.name || '');
        handleInputChange('selectedDoctorFee', doctor.consultation_fee || 0);
      }
    }}
    className="input-field"
  >
    <option value="">Select a doctor</option>
    {doctors.map(doctor => (
      <option key={doctor.id} value={doctor.id}>
        {doctor.users?.name} - {doctor.specialization} 
        {doctor.consultation_fee && ` (₹${doctor.consultation_fee})`}
      </option>
    ))}
  </select>
</div>

{/* Bed Selection - Only for Inpatient */}
{formData.admissionCategory === 'inpatient' && (
  <div className="col-span-2">
    <label htmlFor="bed" className="block text-sm font-medium text-gray-700 mb-1">
      Select Bed <span className="text-gray-400">(Optional)</span>
    </label>
    <select
      id="bed"
      value={formData.selectedBedId || ''}
      onChange={(e) => {
        const bed = beds.find(b => b.id === e.target.value);
        handleInputChange('selectedBedId', e.target.value);
        if (bed) {
          handleInputChange('selectedBedNumber', bed.bed_number);
          handleInputChange('selectedBedRate', bed.daily_rate || 0);
        }
      }}
      className="input-field"
    >
      <option value="">Select a bed</option>
      {beds.map(bed => (
        <option key={bed.id} value={bed.id}>
          Bed {bed.bed_number} - {bed.bed_type} - Room {bed.room_number}
          {bed.daily_rate && ` (₹${bed.daily_rate}/day)`}
        </option>
      ))}
    </select>
  </div>
)}
```

### Step 5: Add Billing Preview in Step 4

Before the final submit button, add:

```tsx
{currentStep === 4 && (
  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-6">
    <h4 className="font-semibold text-blue-900 mb-4">Billing Summary</h4>
    {charges && (
      <div className="space-y-2">
        {charges.breakdown.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-semibold text-gray-900">₹{item.amount.toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t-2 border-blue-300 pt-2 mt-2">
          <div className="flex justify-between text-lg font-bold">
            <span className="text-blue-900">Total Amount</span>
            <span className="text-orange-600">₹{charges.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

### Step 6: Calculate Charges When Data Changes

```typescript
useEffect(() => {
  if (formData.admissionCategory) {
    const newCharges = calculateRegistrationCharges(
      formData.admissionCategory,
      formData.selectedDoctorFee,
      formData.selectedBedRate
    );
    setCharges(newCharges);
  }
}, [formData.admissionCategory, formData.selectedDoctorFee, formData.selectedBedRate]);
```

### Step 7: Show Receipt After Successful Registration

In the success handler:

```typescript
const handleRegistrationSubmit = async (data: PatientRegistrationData, previewUHID?: string) => {
  setIsLoading(true);
  
  try {
    const result = await registerNewPatient(data, previewUHID);
    setRegistrationResult(result);
    
    if (result.success) {
      setShowReceipt(true);  // Show receipt
    }
  } catch (error) {
    // ... error handling
  } finally {
    setIsLoading(false);
  }
};
```

And render the receipt:

```tsx
{showReceipt && registrationResult?.success && charges && (
  <RegistrationReceipt
    uhid={registrationResult.uhid!}
    patientName={`${formData.firstName} ${formData.lastName}`}
    age={calculateAge(formData.dateOfBirth)}
    gender={formData.gender}
    phone={formData.phone}
    admissionType={formData.admissionCategory as 'outpatient' | 'inpatient'}
    doctorName={formData.selectedDoctorName}
    bedNumber={formData.selectedBedNumber}
    billNumber={generateBillNumber()}
    billDate={new Date().toLocaleDateString('en-IN')}
    charges={charges.breakdown}
    totalAmount={charges.totalAmount}
  />
)}
```

---

## Database Schema Requirements

### Doctors Table
```sql
SELECT 
  id,
  user_id,
  specialization,
  consultation_fee,
  status
FROM doctors
WHERE status = 'active';
```

### Beds Table
```sql
SELECT 
  id,
  bed_number,
  room_number,
  bed_type,
  daily_rate,
  status
FROM beds
WHERE status = 'available';
```

---

## Pricing Structure

| Item | Amount |
|------|--------|
| Base Registration Fee | ₹100 |
| Consultation Fee | Variable (from doctor) |
| Bed Charges (per day) | Variable (from bed) |

**Example Calculations**:

1. **Outpatient with Doctor**:
   - Registration: ₹100
   - Consultation: ₹500
   - **Total**: ₹600

2. **Inpatient with Doctor and Bed**:
   - Registration: ₹100
   - Consultation: ₹500
   - Bed (ICU): ₹2000/day
   - **Total**: ₹2600

---

## Print Styles

The receipt component includes print-optimized CSS:

```css
@media print {
  @page { margin: 0.5in; }
  .print\\:hidden { display: none; }
  body { print-color-adjust: exact; }
}
```

---

## Testing Checklist

- [ ] Outpatient registration without doctor
- [ ] Outpatient registration with doctor
- [ ] Inpatient registration without bed
- [ ] Inpatient registration with bed and doctor
- [ ] Pricing calculation is correct
- [ ] Receipt prints correctly
- [ ] Receipt downloads as PDF
- [ ] All optional fields work
- [ ] Database integration works

---

## Next Steps

1. Implement the changes in `PatientRegistrationForm.tsx`
2. Test all scenarios
3. Adjust pricing as needed
4. Customize receipt design
5. Add payment integration if needed

---

**Status**: Ready for Implementation
**Estimated Time**: 2-3 hours
**Priority**: High
