# Fix Patient Status Update Issue

## Problem
The Critical Status toggle is not working due to **Row Level Security (RLS)** policies blocking UPDATE operations on the `patients` table.

**Error**: `Update returned no data for patient ID AH25087516. This may be a permissions issue (RLS).`

## Root Cause
- The Supabase client is using the **anon key** which has limited permissions
- RLS policies on the `patients` table are blocking UPDATE operations
- SELECT works fine, but UPDATE is denied

---

## Solution Options

### Option 1: Fix RLS Policies (RECOMMENDED)

1. **Go to Supabase Dashboard**
   - Navigate to: https://zusheijhebsmjiyyeiqq.supabase.co
   - Go to SQL Editor

2. **Run the RLS Policy Fix**
   - Open file: `database/migrations/fix_patients_rls_policy.sql`
   - Copy the entire SQL content
   - Paste and execute in Supabase SQL Editor

3. **Verify the Fix**
   - Refresh your patients page
   - Try toggling Critical/Stable status
   - Should work without errors

---

### Option 2: Temporary Disable RLS (FOR TESTING ONLY)

⚠️ **WARNING**: This removes all security. Only use for quick testing!

1. **Go to Supabase Dashboard** → SQL Editor

2. **Run**:
   ```sql
   ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
   ```

3. **Test the functionality**

4. **Re-enable RLS** (IMPORTANT):
   ```sql
   ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
   ```
   Then apply Option 1 to add proper policies.

---

## What Was Fixed in the Code

### 1. Fixed Parameter Order Issue
**Before**: Parameters were passed in wrong order causing values to swap
```typescript
handleStatusUpdate(patient.patient_id, isCritical, isAdmitted)
// But function expected: (patientId, isAdmitted, isCritical)
```

**After**: Simplified to only update critical status
```typescript
handleStatusUpdate(patient.patient_id, isCritical)
// Preserves is_admitted status automatically
```

### 2. Added Better Error Handling
- Validates patient exists before update
- Provides detailed console logging
- Detects RLS issues and provides helpful error messages

### 3. Improved UX
- Better spacing between radio buttons
- Added hover effects
- Changed "Stable" color from gray to green for better visual distinction
- Added cursor pointer for better interactivity

---

## Testing After Fix

1. **Open Browser Console** (F12)
2. **Navigate to**: http://localhost:3004/patients
3. **Click on a patient's Critical/Stable radio button**
4. **Check Console Logs**:
   - ✅ "Updating critical status for patient: AH25087516 to: true"
   - ✅ "Found patient: {id: ..., patient_id: ..., is_admitted: ..., is_critical: ...}"
   - ✅ "Update data: {updated_at: ..., is_critical: ...}"
   - ✅ "Update response: {data: [...], error: null, count: 1}"
   - ✅ "Patient status updated successfully: {...}"

5. **Verify in Database**:
   - Go to Supabase Dashboard → Table Editor → patients
   - Check the `is_critical` field is updated

---

## Database Fields Updated

| Field | Type | Description |
|-------|------|-------------|
| `is_critical` | boolean | Set to `true` for Critical, `false` for Stable |
| `is_admitted` | boolean | Preserved during critical status update |
| `updated_at` | timestamptz | Automatically updated to current timestamp |

---

## Next Steps

1. ✅ Apply RLS policy fix (Option 1)
2. ✅ Test the Critical/Stable toggle
3. ✅ Verify the Admitted/Discharge functionality works similarly
4. Consider adding similar RLS policies for other tables if needed

---

## Additional Notes

- The `is_admitted` field is managed by the Admit/Discharge buttons
- The `is_critical` field is managed by the Critical/Stable radio buttons
- Both fields are independent and can be updated separately
- The admission status is also linked to `bed_allocations` table
