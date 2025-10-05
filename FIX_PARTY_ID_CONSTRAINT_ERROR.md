# Fix: Party ID Constraint Error in Patient Registration

## Problem
Patient registration was failing with the error:
```
Error: Failed to create user record: null value in column "party_id" of relation "users" violates not-null constraint
```

## Root Cause
The `users` table has a NOT NULL constraint on the `party_id` column, which requires a foreign key reference to the `party` table. The patient registration workflow was not creating a party record before attempting to create the user record.

## Database Schema
According to the database schema:
- `users.party_id` → `party.id` (NOT NULL, FK constraint)
- The `party` table is a central entity management table for patients and other parties

### Party Table Structure
```sql
CREATE TABLE party (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_code VARCHAR UNIQUE,
  party_type VARCHAR CHECK (party_type IN ('patient', 'vendor', 'supplier', ...)),
  name VARCHAR NOT NULL,
  phone VARCHAR,
  email VARCHAR,
  address TEXT,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Solution Implemented

### 1. Created `createPartyRecord()` Function
Added a new function to create a party record for each patient:

```typescript
export async function createPartyRecord(
  uhid: string,
  registrationData: PatientRegistrationData
): Promise<string> {
  const partyData = {
    party_code: uhid,
    party_type: 'patient',
    name: fullName,
    phone: registrationData.phone || null,
    email: registrationData.email || `${uhid}@annam.com`,
    address: registrationData.address || null,
    status: 'active'
  };

  const { data: party, error } = await supabase
    .from('party')
    .insert([partyData])
    .select()
    .single();

  return party.id;
}
```

### 2. Updated `linkAuthUserToPatient()` Function
Modified to accept `partyId` parameter and include it in the user record:

```typescript
export async function linkAuthUserToPatient(
  authUserId: string, 
  uhid: string, 
  registrationData: PatientRegistrationData,
  partyId: string  // NEW PARAMETER
): Promise<any> {
  const userData = {
    auth_id: authUserId,
    employee_id: uhid,
    name: fullName,
    email: registrationData.email || `${uhid}@annam.com`,
    role: 'patient',
    phone: registrationData.phone || null,
    address: registrationData.address || null,
    party_id: partyId,  // ADDED: Link to party record
    status: 'active',
    permissions: {
      patient_portal: true,
      view_own_records: true,
      book_appointments: true
    }
  };
  // ... insert into users table
}
```

### 3. Updated Registration Workflow
Modified `registerNewPatient()` to create party record first:

```typescript
export async function registerNewPatient(
  registrationData: PatientRegistrationData,
  preGeneratedUHID?: string
): Promise<PatientResponse> {
  try {
    // Step 1: Generate UHID
    const uhid = preGeneratedUHID || await generateUHID();
    
    // Step 2: Create party record (NEW STEP)
    const partyId = await createPartyRecord(uhid, registrationData);
    
    // Step 3: Create authentication credentials
    const { authUser, credentials } = await createPatientAuthCredentials(uhid);
    
    // Step 4: Create user record with party_id
    const userRecord = await linkAuthUserToPatient(authUser.id, uhid, registrationData, partyId);
    
    // Step 5: Insert patient record
    const patient = await insertPatientRecord(uhid, registrationData, userRecord.id);
    
    // Step 6: Create initial appointment if needed
    // ...
    
    return { success: true, patient, uhid, credentials };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Updated Registration Flow

### Before (Broken)
1. Generate UHID
2. Create auth user
3. Create user record ❌ (fails - no party_id)
4. Create patient record

### After (Fixed)
1. Generate UHID
2. **Create party record** ✅
3. Create auth user
4. Create user record with party_id ✅
5. Create patient record
6. Create initial appointment (if applicable)

## Data Relationships

```
party (id)
  ↓
users (party_id) ← auth.users (id)
  ↓
patients (user_id)
```

## Benefits of This Approach

1. **Maintains Referential Integrity**: All foreign key constraints are satisfied
2. **Centralized Party Management**: Patient information is stored in the central `party` table
3. **Consistent Data Model**: Follows the existing database architecture
4. **Robust Error Handling**: Each step has proper error handling and logging
5. **Supports Optional Fields**: Works with the optional fields implementation

## Testing

To test the fix:

1. Navigate to `http://localhost:3004/patients/register`
2. Fill in any combination of fields (or leave all empty)
3. Submit the form
4. Verify:
   - Party record is created with `party_type = 'patient'`
   - User record is created with valid `party_id`
   - Patient record is created successfully
   - No constraint violation errors

## Files Modified

- `/src/lib/patientService.ts`:
  - Added `createPartyRecord()` function
  - Updated `linkAuthUserToPatient()` to accept `partyId` parameter
  - Updated `registerNewPatient()` workflow to create party first

## Related Documentation

- `COMPLETE_DATABASE_SCHEMA_DOCUMENTATION.md` - Full schema reference
- `PATIENT_REGISTRATION_OPTIONAL_FIELDS_UPDATE.md` - Optional fields implementation
- `SCHEMA_RELATIONSHIPS.md` - Database relationships

## Status
✅ **FIXED** - Patient registration now works correctly with proper party record creation.
