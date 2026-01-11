# Clinical Entry Form 2.0 - Complete Documentation

## Overview
**Clinical Entry Form 2.0** is a comprehensive, modern clinical data entry system that uses exact UI patterns from existing forms for each section. This provides a consistent user experience across the application.

## Key Features

### 🎨 UI Design Philosophy
Each section uses the **exact UI pattern** from its respective page:
- **Clinical Notes** → IP Case Sheet style (blue theme)
- **Lab Tests** → Lab Test Selection style (teal theme)
- **X-Ray & Scans** → Radiological Procedures style (teal theme)
- **Prescriptions** → New Prescription form style (green theme)
- **Follow-up** → Simple appointment scheduling (blue theme)

### 📊 Database Integration
All data is properly saved to the correct tables with `appointment_id` linking:
- `clinical_notes` - Complete case sheet data
- `lab_orders` - Lab test orders
- `xray_orders` - X-ray and imaging orders
- `prescription_orders` - Medication prescriptions
- `follow_up_appointments` - Follow-up scheduling

## Section-by-Section Breakdown

### 1. Clinical Notes Tab (IP Case Sheet Style)

**Design:** Blue-themed with FileText icon

**Sections:**
- Present Complaints (3 rows)
- History of Present Illness (4 rows)
- Past History (3 rows)
- Family History (3 rows)
- Personal History (3 rows)
- Physical Examination (6 rows)
- Provisional Diagnosis (2 rows)
- Investigations Summary (3 rows)
- Treatment Plan (3 rows)

**Features:**
- Multi-line text areas for detailed notes
- Auto-save functionality
- Date display in Indian format
- Clean, professional layout

### 2. Lab Tests Tab (Lab Test Selection Style)

**Design:** Teal-themed with Activity icon

**Form Fields:**
```
┌─────────────────────────────────────────────────────┐
│ Test Name | Group Name | Urgency                    │
├─────────────────────────────────────────────────────┤
│ Clinical Indication                                  │
├─────────────────────────────────────────────────────┤
│ Special Instructions                                 │
└─────────────────────────────────────────────────────┘
```

**Features:**
- "New Catalog Entry" button (teal)
- Light teal background form area
- Urgency badges (color-coded)
- No amount/cost fields
- List view of ordered tests

### 3. X-Ray & Scans Tab (Radiological Procedures Style)

**Design:** Teal-themed with Activity icon

**Form Fields:**
```
┌─────────────────────────────────────────────────────┐
│ Procedure Name | Modality | Urgency                 │
├─────────────────────────────────────────────────────┤
│ Specific Region / View Details                      │
├─────────────────────────────────────────────────────┤
│ Clinical Indication                                  │
├─────────────────────────────────────────────────────┤
│ Special Instructions                                 │
└─────────────────────────────────────────────────────┘
```

**Features:**
- "New Catalog" button (teal)
- Modality dropdown (X-Ray, CT, MRI, Ultrasound, PET, Mammography)
- Region/view details field
- No amount/cost fields
- List view of ordered scans

### 4. Prescriptions Tab (New Prescription Form Style)

**Design:** Green-themed with Pill icon

**Features:**
- **Medication Search:** Search bar with autocomplete
- **Stock Display:** Blue info box showing available stock
- **Dosage & Duration:** Side-by-side inputs
- **Frequency Times:** Checkboxes for Morning, Afternoon, Evening, Night
- **Meal Timing:** Dropdown (Before/After/With Meal, Empty Stomach)
- **Auto Calculate Quantity:** Checkbox with auto-calculation
- **Instructions:** Multi-line text area
- **No amount/cost fields** (removed as requested)

**Medication Card Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Medication Name                              [Delete]│
│ Generic Name                                         │
├─────────────────────────────────────────────────────┤
│ Current Stock: XX units available                   │
├─────────────────────────────────────────────────────┤
│ Dosage * | Duration (Days) *                        │
├─────────────────────────────────────────────────────┤
│ Frequency Times * (Checkboxes)                      │
│ ☐ Morning  ☐ Afternoon  ☐ Evening  ☐ Night         │
├─────────────────────────────────────────────────────┤
│ Meal Timing (Dropdown)                              │
├─────────────────────────────────────────────────────┤
│ ☐ Auto Calculate Quantity                           │
│ Auto: XX units                                       │
├─────────────────────────────────────────────────────┤
│ Instructions (Textarea)                             │
└─────────────────────────────────────────────────────┘
```

### 5. Follow-up Tab

**Design:** Blue-themed with Calendar icon

**Form Fields:**
- Follow-up Date (date picker)
- Follow-up Time (time picker)
- Priority (dropdown: Routine/Important/Urgent)
- Reason for Follow-up (textarea)
- Instructions for Patient (textarea)

## Component Props

```typescript
interface ClinicalEntryForm2Props {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  patientUHID: string;
  onSuccess?: () => void;
}
```

## Usage Example

### In Your Appointments Page

```tsx
import React, { useState } from 'react';
import ClinicalEntryForm2 from '../components/ClinicalEntryForm2';

function AppointmentsPage() {
  const [showClinicalForm2, setShowClinicalForm2] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const handleOpenClinicalForm2 = (appointment) => {
    setSelectedAppointment(appointment);
    setShowClinicalForm2(true);
  };

  return (
    <div>
      {/* Your appointments list */}
      <div className="appointment-card">
        <button 
          onClick={() => handleOpenClinicalForm2(appointment)}
          className="btn-primary"
        >
          Clinical Entry 2.0
        </button>
      </div>

      {/* Clinical Entry Form 2.0 */}
      {showClinicalForm2 && selectedAppointment && (
        <ClinicalEntryForm2
          isOpen={showClinicalForm2}
          onClose={() => setShowClinicalForm2(false)}
          appointmentId={selectedAppointment.id}
          encounterId={selectedAppointment.encounter_id}
          patientId={selectedAppointment.patient_id}
          doctorId={currentUser.id}
          patientName={selectedAppointment.patient_name}
          patientUHID={selectedAppointment.patient_uhid}
          onSuccess={() => {
            setShowClinicalForm2(false);
            // Refresh appointments list
            loadAppointments();
          }}
        />
      )}
    </div>
  );
}
```

## Adding Button Next to Existing Clinical Entry Form

### Option 1: Side-by-Side Buttons

```tsx
<div className="flex gap-3">
  <button 
    onClick={() => setShowClinicalForm(true)}
    className="btn-secondary flex items-center"
  >
    <FileText size={18} className="mr-2" />
    Clinical Entry
  </button>
  
  <button 
    onClick={() => setShowClinicalForm2(true)}
    className="btn-primary flex items-center"
  >
    <Stethoscope size={18} className="mr-2" />
    Clinical Entry 2.0
  </button>
</div>
```

### Option 2: Dropdown Menu

```tsx
<div className="relative">
  <button 
    onClick={() => setShowMenu(!showMenu)}
    className="btn-primary flex items-center"
  >
    <FileText size={18} className="mr-2" />
    Clinical Entry
    <ChevronDown size={16} className="ml-2" />
  </button>
  
  {showMenu && (
    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
      <button
        onClick={() => {
          setShowClinicalForm(true);
          setShowMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center"
      >
        <FileText size={16} className="mr-3 text-gray-600" />
        <div>
          <div className="font-medium text-gray-900">Clinical Entry</div>
          <div className="text-xs text-gray-500">Basic form</div>
        </div>
      </button>
      
      <button
        onClick={() => {
          setShowClinicalForm2(true);
          setShowMenu(false);
        }}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center border-t border-gray-100"
      >
        <Stethoscope size={16} className="mr-3 text-blue-600" />
        <div>
          <div className="font-medium text-gray-900">Clinical Entry 2.0</div>
          <div className="text-xs text-gray-500">Advanced form with exact UI patterns</div>
        </div>
      </button>
    </div>
  )}
</div>
```

### Option 3: Badge Indicator

```tsx
<div className="flex gap-3">
  <button 
    onClick={() => setShowClinicalForm(true)}
    className="btn-secondary flex items-center"
  >
    <FileText size={18} className="mr-2" />
    Clinical Entry
  </button>
  
  <button 
    onClick={() => setShowClinicalForm2(true)}
    className="btn-primary flex items-center relative"
  >
    <Stethoscope size={18} className="mr-2" />
    Clinical Entry 2.0
    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
      New
    </span>
  </button>
</div>
```

## Database Schema Compatibility

The form saves data to these tables (created in previous migration):

### clinical_notes
- All case sheet sections combined
- Includes `appointment_id` for linking

### lab_orders
- test_type, test_name, test_category
- urgency, clinical_indication
- special_instructions
- status tracking fields

### xray_orders
- scan_type, scan_name, body_part
- urgency, clinical_indication
- special_instructions
- status tracking fields

### prescription_orders
- medication details
- frequency_times (array)
- meal_timing
- dosage, duration, quantity
- instructions
- status: 'pending'

### follow_up_appointments
- follow_up_date, follow_up_time
- reason, instructions
- priority
- status: 'scheduled'

## Color Themes

- **Header:** Blue gradient (`from-blue-50 to-indigo-50`)
- **Clinical Notes:** Blue accents (`blue-600`, `blue-500`)
- **Lab Tests:** Teal accents (`teal-600`, `teal-500`)
- **X-Ray:** Teal accents (`teal-600`, `teal-500`)
- **Prescriptions:** Green accents (`green-600`, `green-500`)
- **Follow-up:** Blue accents (`blue-600`, `blue-500`)

## Key Differences from Clinical Entry Form 1.0

| Feature | Form 1.0 | Form 2.0 |
|---------|----------|----------|
| Clinical Notes | Simple text areas | IP Case Sheet style with 9 sections |
| Lab Tests | Not available | Full lab test selection UI |
| X-Ray | Basic scan form | Radiological procedures UI |
| Prescriptions | Simplified | Exact prescription form with stock info |
| UI Consistency | Generic design | Matches respective page designs |
| Database | Basic linking | Full integration with all tables |

## Benefits

1. **Consistent UX:** Users see familiar UI patterns they already know
2. **Complete Data:** Captures all necessary clinical information
3. **Proper Database:** All data properly linked with appointment_id
4. **Modern Design:** Clean, professional appearance
5. **No Cost Fields:** Removed as requested for clinical focus
6. **Modular Tabs:** Easy to navigate between sections
7. **Validation:** Built-in validation for required fields
8. **Stock Awareness:** Shows medication availability

## Testing Checklist

- [ ] Open Clinical Entry Form 2.0 from appointment
- [ ] Verify patient name and UHID display correctly
- [ ] Test Clinical Notes tab - enter data in all 9 sections
- [ ] Test Lab Tests tab - add multiple lab tests
- [ ] Test X-Ray tab - add multiple scan orders
- [ ] Test Prescriptions tab - search and add medications
- [ ] Verify stock information displays correctly
- [ ] Test frequency times checkboxes
- [ ] Test auto-calculate quantity feature
- [ ] Test Follow-up tab - schedule follow-up
- [ ] Submit form and verify all data saves correctly
- [ ] Check database tables for proper data with appointment_id
- [ ] Verify success message and form closes
- [ ] Test all tabs switch properly
- [ ] Verify all hover effects and transitions work

## File Location

**Component:** `/Users/nisha/Desktop/rnd/annam-ragul/annam/components/ClinicalEntryForm2.tsx`

## Next Steps

1. Import the component in your appointments page
2. Add state management for the form
3. Add button(s) to open the form
4. Test with real appointment data
5. Verify database integration
6. Train users on the new form

## Support

For issues or questions:
- Check this documentation
- Review the component code
- Verify database schema is applied
- Check console for errors
- Ensure all props are passed correctly
