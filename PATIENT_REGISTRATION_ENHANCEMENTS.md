# Patient Registration Form Enhancements - Implementation Summary

## Overview
This document outlines all the enhancements made to the New Patient Registration form as per requirements.

## Completed Enhancements

### 1. ✅ UHID Sequential Numbering System
**Location:** `/src/lib/patientService.ts` - `generateUHID()` function

**Changes:**
- **Old Format:** `AH{YY}{MM}{XXXX}` (random 4-digit number)
- **New Format:** `AH{YY}{MM}-{XXXX}` (sequential 0001-9999, resets monthly)
- **Example:** `AH2510-0001` (October 2025, patient #1)

**Features:**
- Sequential numbering starts from 0001 each month
- Automatically resets on the 1st of every month
- Format includes hyphen for better readability
- Prevents duplicate UHIDs with database verification

### 2. ✅ Appointment Registration (Replacing Admission)
**Location:** `/components/EnhancedPatientRegistrationForm.tsx` - Step 2

**Changes:**
- Removed admission-specific fields (admission date, admission time, admission type, department/ward, room number)
- Added appointment registration fields:
  - **Doctor Selection:** Dropdown populated from database with all active doctors
  - **Appointment Date:** Date picker with minimum date as today
  - **Appointment Time:** Time picker
  - **Appointment Type:** New Patient, Follow-up, Consultation, Routine Checkup
  - **Primary Complaint/Reason for Visit:** Text area for detailed description
  - **Current Symptoms:** Quick symptom entry field

**Features:**
- Real-time doctor list loading from database
- Shows doctor specialization and consultation fee
- Validates appointment date (cannot be in the past)
- All fields are optional for flexibility

### 3. ✅ Age Field with Auto-Calculation
**Location:** `/components/EnhancedPatientRegistrationForm.tsx` - Step 1 (Personal Information)

**Features:**
- **DOB to Age:** When user enters Date of Birth, age is automatically calculated and displayed
- **Age to DOB:** When user enters age (and DOB is empty), system calculates estimated DOB as 1st January of the calculated year
- **Dual Entry:** Users can enter either DOB or Age
- **Visual Feedback:** Shows calculated values with color-coded hints
  - Green text for auto-calculated age from DOB
  - Blue text for estimated DOB from age

**Implementation:**
```typescript
// Auto-calculate age when DOB changes
if (field === 'dateOfBirth' && value) {
  updated.age = calculateAgeFromDOB(value);
}

// Auto-calculate DOB when age changes (and DOB is empty)
if (field === 'age' && value && !prev.dateOfBirth) {
  updated.dateOfBirth = calculateDOBFromAge(value);
}
```

### 4. ✅ QR Code Generation and Storage
**Location:** 
- `/src/lib/qrCodeService.ts` - QR code generation utilities
- `/src/lib/patientService.ts` - Integration with patient registration
- `/database/migrations/add_qr_code_to_patients.sql` - Database schema update

**Features:**
- QR code generated automatically for each UHID during registration
- Stored as data URL in database (`qr_code` column in `patients` table)
- High error correction level (H) for better scanning reliability
- Optimized size (200x200px for database, 150x150px for labels)
- Multiple format support (PNG data URL, SVG string)

**Database Migration:**
```sql
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS qr_code TEXT;
```

**NPM Packages Added:**
- `qrcode: ^1.5.4` - QR code generation library
- `@types/qrcode: ^1.5.5` - TypeScript type definitions

### 5. ✅ Printable Patient Registration Slip/Label
**Location:** `/components/PatientRegistrationLabel.tsx`

**Features:**

#### A. Thermal Label (2×3 inch)
- **Dimensions:** 192px × 288px (2 inches × 3 inches at 96 DPI)
- **Optimized for:** Thermal label printers
- **Contents:**
  - Hospital Name: "Annam Multispeciality Hospital"
  - QR Code (100x100px) for quick scanning
  - Patient UHID (large, bold, monospace font)
  - Patient Name (uppercase)
  - Date of Visit
- **Print Settings:** Configured for borderless 2×3 inch printing

#### B. Full Registration Slip (A4)
- **Format:** Standard A4 paper
- **Contents:**
  - Hospital header with name
  - "Patient Registration Slip" title
  - QR Code (150x150px)
  - Patient Information:
    - UHID (large, prominent)
    - Patient Name
    - Registration Date (formatted)
    - Registration Time
  - Footer with instructions
- **Layout:** Professional, printer-friendly design

**Print Functionality:**
- Opens in new window for printing
- Separate print buttons for label and slip
- Automatic print dialog after content loads
- Print-optimized CSS with `@media print` rules

### 6. ✅ Enhanced Registration Flow
**Location:** `/components/EnhancedPatientRegistrationForm.tsx`

**New 4-Step Process:**

1. **Step 1: Personal Information**
   - Name, DOB/Age, Gender, Marital Status
   - Contact details (Phone, Email)
   - Address
   - UHID preview display

2. **Step 2: Appointment & Medical Information**
   - Doctor selection from database
   - Appointment date, time, type
   - Primary complaint/reason for visit
   - Blood group, current symptoms
   - Allergies, current medications
   - Chronic conditions

3. **Step 3: Guardian/Attendant Details**
   - Guardian name, relationship
   - Guardian contact information
   - Guardian address (if different)

4. **Step 4: Emergency Contact & Insurance**
   - Emergency contact details
   - Insurance provider and policy number
   - Final UHID confirmation
   - Submit button

**Post-Registration:**
- Success confirmation screen
- Patient details summary
- Print options (Thermal Label + A4 Slip)
- "Register Another Patient" button
- Close button

## File Structure

### New Files Created:
```
/src/lib/qrCodeService.ts                          - QR code generation utilities
/components/EnhancedPatientRegistrationForm.tsx    - Enhanced registration form
/components/PatientRegistrationLabel.tsx           - Printable label component
/database/migrations/add_qr_code_to_patients.sql   - Database migration
/PATIENT_REGISTRATION_ENHANCEMENTS.md              - This documentation
```

### Modified Files:
```
/src/lib/patientService.ts                         - Updated UHID generation, QR code integration
/package.json                                      - Added qrcode dependencies
```

## Database Changes

### Patients Table - New Column:
```sql
qr_code TEXT  -- Stores QR code as data URL (base64 encoded PNG)
```

## Dependencies Added

```json
{
  "dependencies": {
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

## Usage Instructions

### For Developers:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Database Migration:**
   Execute the SQL migration file to add the `qr_code` column:
   ```sql
   -- Run: /database/migrations/add_qr_code_to_patients.sql
   ```

3. **Use Enhanced Form:**
   Replace the old `PatientRegistrationForm` with `EnhancedPatientRegistrationForm` in your registration page.

### For Users:

1. **Register a New Patient:**
   - Fill in patient details (all fields optional)
   - UHID is auto-generated when moving to step 2
   - Select doctor and schedule appointment (optional)
   - Complete all 4 steps
   - Click "Register Patient"

2. **Print Patient Label:**
   - After successful registration, print options appear
   - Choose "Print Patient Label" for 2×3 inch thermal label
   - Or choose "Print Registration Slip (A4)" for full-page slip
   - Both include QR code for quick scanning

3. **UHID Format:**
   - Format: `AH{YY}{MM}-{XXXX}`
   - Example: `AH2510-0001` (October 2025, 1st patient)
   - Sequential numbering resets monthly

## Technical Details

### UHID Generation Algorithm:
```typescript
1. Get current year (last 2 digits) and month (2 digits)
2. Create prefix: AH{YY}{MM}
3. Query database for count of patients with this prefix
4. Increment count by 1
5. Pad to 4 digits with leading zeros
6. Format: {prefix}-{sequential}
7. Verify uniqueness in database
```

### Age Calculation Logic:
```typescript
// From DOB to Age:
1. Get current date
2. Calculate year difference
3. Adjust for month/day if birthday hasn't occurred this year
4. Return age in years

// From Age to DOB:
1. Get current year
2. Subtract age from current year
3. Set DOB as January 1st of calculated year
4. Return formatted date
```

### QR Code Generation:
```typescript
1. Generate QR code from UHID string
2. Error correction level: H (High - 30% recovery)
3. Output format: PNG data URL (base64)
4. Size: 200x200px (database), 150x150px (labels)
5. Colors: Black on white background
6. Store in database with patient record
```

## Benefits

1. **Sequential UHID:** Easier to track monthly patient registrations
2. **Appointment Integration:** Streamlined workflow from registration to appointment
3. **Age Flexibility:** Accommodates patients who don't know exact DOB
4. **QR Code:** Fast patient identification and record retrieval
5. **Print Labels:** Professional patient identification labels
6. **Better UX:** Clear step-by-step process with visual feedback

## Future Enhancements (Suggestions)

1. Appointment conflict checking with doctor availability
2. SMS/Email notification with QR code after registration
3. Bulk patient import with auto-UHID generation
4. QR code scanner integration for patient lookup
5. Patient portal access using QR code
6. Integration with appointment reminder system

## Support

For issues or questions regarding these enhancements, please refer to:
- Code comments in respective files
- This documentation
- Database migration scripts

---

**Last Updated:** 2025-10-05
**Version:** 1.0
**Status:** ✅ All Enhancements Completed
