# Duplicate Patient Detection Feature - Test Guide

## Feature Implementation Summary

The duplicate patient detection feature has been successfully implemented in the Outpatient Registration form with the following specifications:

## How It Works

### 1. Trigger Point
- **When**: User fills the "Place" field (the last field in the basic patient information section)
- **Automatic**: The system automatically checks for duplicates without requiring manual submission

### 2. Matching Criteria
The system checks for exact matches on:
- **Patient Full Name** (First Name + Last Name)
- **Gender** 
- **Date of Birth**

### 3. User Experience

#### If Duplicate Found:
- A modal popup appears with the title "Duplicate Patient Detected"
- Shows message: "This patient already exists"
- Displays existing patient details:
  - Name
  - Patient ID (UHID)
  - Date of Birth
  - Gender
- Shows matching criteria: "Patient Full Name, Gender, and Date of Birth matched exactly"
- **Two options:**
  - "Cancel Registration" - Stops the registration process
  - "Continue Anyway" - Allows registration to proceed despite duplicate

#### If No Duplicate:
- Registration continues normally
- No interruption to the user flow

### 4. Prevention Mechanisms
- **Form submission is disabled** when duplicate is detected
- **"Proceed to Vitals" button is disabled** when duplicate is detected
- **Submit buttons show "Duplicate Patient Detected"** text instead of normal text
- User must explicitly choose to "Continue Anyway" or "Cancel Registration"

## Technical Implementation

### Files Modified:
- `/components/OutpatientRegistrationForm.tsx`

### Key Functions Added:
1. `checkExistingPatientByNameGenderDOB()` - Searches for patients by name, gender, and DOB
2. Enhanced `handleInputChange()` - Triggers duplicate check on place field change
3. Added `isDuplicateDetected` state to track duplicate status

### Database Query:
```sql
SELECT * FROM patients 
WHERE name = ? 
  AND date_of_birth = ? 
  AND gender = ? 
LIMIT 1
```

## Testing Scenarios

### Test Case 1: Duplicate Detection
1. Register a patient with:
   - Name: "John Doe"
   - DOB: "1990-01-01"
   - Gender: "Male"
   - Place: "Chennai"
2. Try to register another patient with same:
   - Name: "John Doe"
   - DOB: "1990-01-01" 
   - Gender: "Male"
   - Any place value
3. **Expected**: Duplicate modal should appear when place is filled

### Test Case 2: No Duplicate (Different Name)
1. Same as above but change name to "John Smith"
2. **Expected**: No duplicate modal, registration continues

### Test Case 3: No Duplicate (Different DOB)
1. Same as above but change DOB to "1990-01-02"
2. **Expected**: No duplicate modal, registration continues

### Test Case 4: No Duplicate (Different Gender)
1. Same as above but change gender to "Female"
2. **Expected**: No duplicate modal, registration continues

### Test Case 5: Continue Anyway
1. When duplicate modal appears, click "Continue Anyway"
2. **Expected**: Registration proceeds, form becomes enabled again

### Test Case 6: Cancel Registration
1. When duplicate modal appears, click "Cancel Registration"
2. **Expected**: Modal closes, duplicate state resets, form remains disabled until place is changed

## Benefits

1. **Prevents Duplicate Registrations**: Catches duplicates early in the process
2. **User-Friendly**: Clear messaging and easy-to-understand options
3. **Flexible**: Allows users to continue if they determine it's not actually a duplicate
4. **Efficient**: Automatic detection without extra user steps
5. **Accurate**: Uses exact matching on key demographic fields

## Notes

- The check only triggers when the "Place" field has content
- Gender comparison is case-insensitive
- Name comparison requires exact match (including spacing)
- The system maintains the original stricter validation on form submission as a backup
- All existing functionality remains intact
