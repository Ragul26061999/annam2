# Integration Guide - Enhanced Patient Registration Form

## Quick Start

### Step 1: Run Database Migration

Execute the SQL migration to add the QR code column to the patients table:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U your-username -d your-database -f database/migrations/add_qr_code_to_patients.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `/database/migrations/add_qr_code_to_patients.sql`
3. Execute the query

### Step 2: Install Dependencies

```bash
npm install
```

This will install the new dependencies:
- `qrcode@^1.5.4`
- `@types/qrcode@^1.5.5`

### Step 3: Update Registration Page

Find your patient registration page (likely at `/app/patients/register/page.tsx`) and update it:

**Before:**
```typescript
import PatientRegistrationForm from '@/components/PatientRegistrationForm';
```

**After:**
```typescript
import EnhancedPatientRegistrationForm from '@/components/EnhancedPatientRegistrationForm';
```

**Update the component usage:**
```typescript
// Old
<PatientRegistrationForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isLoading={isLoading}
/>

// New
<EnhancedPatientRegistrationForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isLoading={isLoading}
/>
```

**Update the submit handler to return QR code:**
```typescript
const handleSubmit = async (data: any, uhid?: string) => {
  try {
    setIsLoading(true);
    const result = await registerNewPatient(data, uhid);
    
    if (result.success) {
      // Return the QR code for the label component
      return { qrCode: result.qrCode };
    } else {
      throw new Error(result.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('Failed to register patient');
    return {};
  } finally {
    setIsLoading(false);
  }
};
```

## Example Complete Page Implementation

```typescript
'use client';
import { useState } from 'react';
import EnhancedPatientRegistrationForm from '@/components/EnhancedPatientRegistrationForm';
import { registerNewPatient } from '@/src/lib/patientService';

export default function PatientRegistrationPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any, uhid?: string) => {
    try {
      setIsLoading(true);
      const result = await registerNewPatient(data, uhid);
      
      if (result.success) {
        console.log('Patient registered successfully:', result.uhid);
        // Return QR code for label printing
        return { qrCode: result.qrCode };
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register patient: ' + (error as Error).message);
      return {};
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate back or close modal
    window.history.back();
  };

  return (
    <div className="container mx-auto py-8">
      <EnhancedPatientRegistrationForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
```

## Testing Checklist

After integration, test the following:

### ✅ UHID Generation
- [ ] UHID format is `AH{YY}{MM}-{XXXX}`
- [ ] Sequential numbering works (0001, 0002, 0003...)
- [ ] UHID displays in preview after Step 1
- [ ] UHID is unique (no duplicates)

### ✅ Age Calculation
- [ ] Entering DOB auto-calculates age
- [ ] Entering age (without DOB) estimates DOB as Jan 1st
- [ ] Age displays correctly with green hint text
- [ ] Estimated DOB displays with blue hint text

### ✅ Appointment Registration
- [ ] Doctor dropdown loads from database
- [ ] Doctor list shows specialization and fees
- [ ] Appointment date cannot be in the past
- [ ] All appointment fields are optional
- [ ] Primary complaint field accepts text

### ✅ QR Code
- [ ] QR code is generated during registration
- [ ] QR code is stored in database
- [ ] QR code displays on success screen
- [ ] QR code contains UHID string
- [ ] QR code is scannable

### ✅ Print Labels
- [ ] "Print Patient Label" button appears after registration
- [ ] Thermal label (2×3 inch) prints correctly
- [ ] A4 registration slip prints correctly
- [ ] Both printouts include QR code
- [ ] Patient information is correct on printouts

### ✅ Form Flow
- [ ] 4-step process works smoothly
- [ ] Previous/Next buttons work
- [ ] All fields are optional
- [ ] Form validation works (if any)
- [ ] Success screen displays after submission
- [ ] "Register Another Patient" resets form

## Troubleshooting

### Issue: QR Code not generating
**Solution:** Ensure `qrcode` package is installed:
```bash
npm install qrcode @types/qrcode
```

### Issue: Database error on patient creation
**Solution:** Run the migration to add `qr_code` column:
```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS qr_code TEXT;
```

### Issue: Doctors not loading
**Solution:** Check that doctors exist in database and are marked as 'active':
```sql
SELECT * FROM doctors WHERE status = 'active';
```

### Issue: Print not working
**Solution:** 
1. Check browser popup blocker settings
2. Ensure printer is connected
3. Try different browser (Chrome recommended)

### Issue: UHID not sequential
**Solution:** Check database query in `generateUHID()` function. Ensure the LIKE pattern matches correctly:
```typescript
.like('patient_id', `${prefix}-%`)
```

## Rollback Plan

If you need to rollback to the old form:

1. **Revert component import:**
   ```typescript
   import PatientRegistrationForm from '@/components/PatientRegistrationForm';
   ```

2. **Revert submit handler:**
   ```typescript
   const handleSubmit = async (data: any, uhid?: string) => {
     await registerNewPatient(data, uhid);
     // No return value needed
   };
   ```

3. **Keep database migration** (QR code column won't hurt, just won't be used)

## Support

For issues or questions:
1. Check `PATIENT_REGISTRATION_ENHANCEMENTS.md` for detailed documentation
2. Review code comments in the enhanced form component
3. Check browser console for errors
4. Verify database migrations are applied

---

**Ready to Go!** 🚀

After completing these steps, your enhanced patient registration form with all requested features will be live and ready to use.
