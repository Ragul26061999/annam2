# Quick Test Guide - Patient Registration

## 🚀 Quick Start

### URLs
- **Normal Registration**: http://localhost:3004/patients/register
- **Emergency Registration**: http://localhost:3004/patients/emergency-register

---

## ✅ Quick Tests

### Test 1: Empty Form (30 seconds)
```
1. Open: http://localhost:3004/patients/register
2. Click "Next" → "Next" → "Next" → "Register Patient"
3. ✅ Should succeed with auto-generated name
```

### Test 2: Just First Name (1 minute)
```
1. Open: http://localhost:3004/patients/register
2. Enter First Name: "John"
3. Click through and submit
4. ✅ Should succeed with name "John"
```

### Test 3: Full Registration (2 minutes)
```
1. Open: http://localhost:3004/patients/register
2. Fill all fields in all 4 steps
3. Submit
4. ✅ Should succeed with all data saved
```

### Test 4: Emergency Registration (1 minute)
```
1. Open: http://localhost:3004/patients/emergency-register
2. Fill minimal fields or leave empty
3. Submit
4. ✅ Should succeed immediately
```

---

## 🔍 What to Check

### In Browser Console
```javascript
// Should see these logs:
✓ Using UHID: AH2510XXXX
✓ Created party record: <uuid>
✓ Created auth user: <uuid>
✓ Created user record: <uuid>
✓ Created patient record: <uuid>
```

### Success Screen Shows
- ✅ UHID displayed
- ✅ Email credentials: {UHID}@annam.com
- ✅ Password: password
- ✅ Green success message

### No Errors
- ❌ No "party_id" constraint errors
- ❌ No validation errors
- ❌ No database errors

---

## 🐛 If Something Goes Wrong

### Error: "Failed to create party record"
**Check**: Database connection, party table exists

### Error: "Failed to create user record"
**Check**: Party was created, users table accessible

### Error: "Failed to create patient record"
**Check**: User was created, patients table accessible

### Form Won't Submit
**Check**: Browser console for JavaScript errors

---

## 📊 Database Verification

### Quick Check in Supabase
```sql
-- Check latest party
SELECT * FROM party ORDER BY created_at DESC LIMIT 1;

-- Check latest user
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;

-- Check latest patient
SELECT * FROM patients ORDER BY created_at DESC LIMIT 1;

-- Full join to see everything
SELECT 
  p.patient_id as UHID,
  p.name as patient_name,
  u.email,
  pt.party_code,
  pt.party_type
FROM patients p
JOIN users u ON p.user_id = u.id
JOIN party pt ON u.party_id = pt.id
ORDER BY p.created_at DESC
LIMIT 5;
```

---

## ✨ Expected Results

### Scenario: Empty Form
```
Party Record:
  party_code: AH2510XXXX
  party_type: patient
  name: Patient AH2510XXXX

User Record:
  employee_id: AH2510XXXX
  name: Patient AH2510XXXX
  email: AH2510XXXX@annam.com
  role: patient
  party_id: <linked>

Patient Record:
  patient_id: AH2510XXXX
  name: Patient AH2510XXXX
  user_id: <linked>
  (all other fields: null)
```

### Scenario: Partial Data (First Name: "John", Phone: "1234567890")
```
Party Record:
  name: John
  phone: 1234567890

User Record:
  name: John
  phone: 1234567890

Patient Record:
  name: John
  phone: 1234567890
  (other fields: null)
```

---

## 🎯 Success Criteria

✅ All 4 test scenarios complete without errors
✅ Data appears correctly in database
✅ Success screen displays credentials
✅ No console errors
✅ Party → User → Patient chain is intact

---

## 📞 Support

If tests fail:
1. Check browser console for errors
2. Check Supabase logs
3. Verify database schema matches documentation
4. Review `PATIENT_REGISTRATION_COMPLETE_FIX.md`

---

**Test Duration**: ~5 minutes for all tests
**Last Updated**: 2025-10-04
