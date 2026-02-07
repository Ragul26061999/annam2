import { supabase } from './supabase';
import { generateBarcodeId, updatePatientWithBarcode } from './barcodeUtils';
import { generateQRCode } from './qrCodeService';
import { allocateBed, BedAllocationData } from './bedAllocationService';
import { createAppointment, generateAppointmentId, AppointmentData } from './appointmentService';
import { addToQueue } from './outpatientQueueService';
// Types - Updated to match comprehensive registration form
export interface PatientRegistrationData {  // Personal Information (Mandatory)
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: string;
  diagnosis: string;
  gender: string;
  maritalStatus?: string; // single, married, divorced, widowed, separated
  phone: string;
  email?: string;
  address: string;

  // Medical & Admission Information 
  bloodGroup: string;
  allergies: string;
  hasDrugAllergy?: boolean;
  drugAllergyNames?: string;
  medicalHistory: string;
  currentMedications: string;
  chronicConditions: string;
  previousSurgeries: string;

  // Admission Details
  admissionDate?: string;
  admissionTime?: string;
  primaryComplaint: string;
  admissionType?: string; // emergency, elective, referred (optional for enhanced form)
  referringDoctorFacility?: string;
  consultingDoctorId?: string;
  consultingDoctorName?: string;
  departmentWard?: string;
  roomNumber?: string;

  // Guardian/Attendant Details (Optional)
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianAddress?: string;

  // Emergency Contact (Optional)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;

  // Insurance Information (Optional)
  insuranceProvider?: string;
  insuranceNumber?: string;

  // Initial Visit Information
  initialSymptoms?: string;
  referredBy?: string;

  // Bed Allocation (New fields for inpatient)
  selectedBedId?: string;
  selectedBedNumber?: string;
  selectedBedRate?: number;

  // Staff Tracking
  staffId?: string;

  // Outpatient Specific Fields
  place?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Vitals
  height?: string;
  weight?: string;
  bmi?: string;
  temperature?: string;
  tempUnit?: string;
  bpSystolic?: string;
  bpDiastolic?: string;
  pulse?: string;
  spo2?: string;
  respiratoryRate?: string;
  randomBloodSugar?: string;
  vitalNotes?: string;

  // Billing
  opCardAmount?: string;
  consultationFee?: string;
  totalAmount?: string;
  paymentMode?: string;

  // Advance Payment
  advanceAmount?: string;
  advancePaymentMethod?: string;
  advanceReferenceNumber?: string;
  advanceNotes?: string;
}

export interface PatientResponse {
  success: boolean;
  patient?: any;
  uhid?: string;
  qrCode?: string;
  credentials?: {
    email: string;
    password: string;
  };
  error?: string;
}

/**
 * Generate a unique UHID (Unique Hospital ID) for a new patient
 * Format: AH{YY}{MM}-{XXXX} where XXXX is sequential 0001-9999, resets monthly
 * Example: AH2510-0001 (October 2025, patient #1)
 */
export async function generateUHID(): Promise<string> {
  const now = new Date();
  const yearTwoDigits = now.getFullYear().toString().slice(-2); // Last two digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero
  const prefix = `AH${yearTwoDigits}${month}`;

  const maxRetries = 10;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Get the maximum sequential number for this month prefix
      const { data: existingPatients, error: fetchError } = await supabase
        .from('patients')
        .select('patient_id')
        .like('patient_id', `${prefix}-%`)
        .order('patient_id', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching existing patients for UHID:', fetchError);
        throw new Error('Failed to generate UHID');
      }

      let nextSequentialNumber = 1; // Default to first patient of the month

      if (existingPatients && existingPatients.length > 0) {
        // Extract the sequential number from the highest existing UHID
        const lastUHID = existingPatients[0].patient_id;
        const lastNumber = lastUHID.split('-')[1];
        
        if (lastNumber && /^\d{4}$/.test(lastNumber)) {
          nextSequentialNumber = parseInt(lastNumber) + 1;
        }
      }

      // Ensure we don't exceed 9999
      if (nextSequentialNumber > 9999) {
        throw new Error('Maximum patient count reached for this month');
      }

      const sequentialNumber = nextSequentialNumber.toString().padStart(4, '0');
      const uhid = `${prefix}-${sequentialNumber}`;

      // Double-check uniqueness before returning
      const { data: existingCheck, error: checkError } = await supabase
        .from('patients')
        .select('patient_id')
        .eq('patient_id', uhid)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found", which is what we want
        console.error('Error checking UHID uniqueness:', checkError);
        throw new Error('Failed to generate UHID');
      }

      if (!existingCheck) {
        // UHID is unique, return it
        return uhid;
      }

      // If we get here, there was a race condition - try again with next number
      console.warn(`UHID collision detected for ${uhid}, retrying...`);
      retryCount++;
      
      // Add a small delay to avoid rapid-fire race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error in UHID generation attempt ${retryCount + 1}:`, error);
      retryCount++;
      
      if (retryCount >= maxRetries) {
        throw new Error('Failed to generate UHID after multiple attempts');
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  throw new Error('Failed to generate UHID after maximum retries');
}

/**
 * Create authentication credentials for a new patient
 * Email format: UHID@annam.com
 * Password: "password" (as specified in requirements)
 */
export async function createPatientAuthCredentials(uhid: string): Promise<{
  authUser: any;
  credentials: { email: string; password: string }
}> {
  const email = `${uhid}@annam.com`;
  const password = 'password';

  try {
    // Check if user already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('auth_id, id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // User already exists, return existing credentials
      console.log('User already exists, using existing credentials');
      return {
        authUser: { id: existingUser.auth_id || null },
        credentials: { email, password }
      };
    }

    // Try to create auth user using Supabase Admin API
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role: 'patient',
          uhid: uhid,
          email_confirm: true
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);

      // Handle user already registered case
      if (authError.message?.includes('already registered') ||
          authError.message?.includes('already been registered') ||
          authError.message?.includes('User already registered')) {
        console.log('Auth user already exists, attempting to retrieve existing user');

        try {
          // Try to sign in to get the user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInData?.user) {
            console.log('Retrieved existing auth user via sign-in:', signInData.user.id);
            return {
              authUser: { id: signInData.user.id },
              credentials: { email, password }
            };
          }
        } catch (signInException) {
          console.warn('Sign-in attempt failed, trying alternative retrieval methods');
        }

        // If sign in fails, check if user exists in auth.users via users table
        try {
          const { data: existingAuthUser } = await supabase
            .from('users')
            .select('auth_id')
            .eq('email', email)
            .single();

          if (existingAuthUser?.auth_id) {
            console.log('Retrieved existing auth user via users table:', existingAuthUser.auth_id);
            return {
              authUser: { id: existingAuthUser.auth_id },
              credentials: { email, password }
            };
          }
        } catch (userTableException) {
          console.warn('Could not retrieve auth user from users table');
        }

        // If we can't retrieve the auth user, return null auth but continue with registration
        console.warn('Auth user exists but could not be retrieved, continuing without auth_id');
        return {
          authUser: { id: null },
          credentials: { email, password }
        };
      }

      // For other auth errors, return null auth to allow registration to continue
      console.warn('Auth creation failed with non-duplicate error, continuing without auth_id:', authError.message);
      return {
        authUser: { id: null },
        credentials: { email, password }
      };
    }

    if (!authUser?.user?.id) {
      throw new Error('Auth user created but no ID returned');
    }

    return {
      authUser: authUser.user,
      credentials: { email, password }
    };
  } catch (error) {
    console.error('Error creating patient auth credentials:', error);
    throw error;
  }
}

/**
 * Insert comprehensive patient record into the patients table with all new fields
 */
export async function insertPatientRecord(
  uhid: string,
  registrationData: PatientRegistrationData,
  userId?: string
): Promise<any> {
  try {
    // Check if patient already exists with this UHID
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_id', uhid)
      .single();

    if (existingPatient) {
      console.log('Patient already exists, returning existing patient:', existingPatient.id);
      return existingPatient;
    }

    // Handle optional name fields - use UHID as fallback if no name provided
    const firstName = registrationData.firstName?.trim() || '';
    const lastName = registrationData.lastName?.trim() || '';
    const fullName = firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || `Patient ${uhid}`;

    // Prepare admission date and time
    let admissionDateTime = null;
    if (registrationData.admissionDate) {
      if (registrationData.admissionTime) {
        admissionDateTime = `${registrationData.admissionDate}T${registrationData.admissionTime}`;
      } else {
        admissionDateTime = `${registrationData.admissionDate}T00:00:00`;
      }
    }

    // Generate QR code for the UHID
    const qrCodeDataUrl = await generateQRCode(uhid);

    // Build patient data object directly with all fields
    const patientData: any = {
      // Basic Information
      patient_id: uhid,
      name: fullName,
      date_of_birth: registrationData.dateOfBirth || null,
      age: registrationData.age ? parseInt(registrationData.age) : null,
      gender: registrationData.gender ? registrationData.gender.toLowerCase() : null,
      marital_status: registrationData.maritalStatus || null,
      phone: registrationData.phone || null,
      place: registrationData.place || null,
      email: registrationData.email || `${uhid}@annam.com`,
      address: registrationData.address || null,
      city: registrationData.city || null,
      state: registrationData.state || null,
      pincode: registrationData.pincode || null,

      // Medical Information
      diagnosis: registrationData.diagnosis || null,
      blood_group: registrationData.bloodGroup || null,
      allergies: registrationData.allergies || null,
      medical_history: registrationData.medicalHistory || null,
      current_medications: registrationData.currentMedications || null,
      chronic_conditions: registrationData.chronicConditions || null,
      previous_surgeries: registrationData.previousSurgeries || null,

      // Vitals
      height: registrationData.height || null,
      weight: registrationData.weight || null,
      bmi: registrationData.bmi || null,
      temperature: registrationData.temperature || null,
      temp_unit: registrationData.tempUnit || null,
      bp_systolic: registrationData.bpSystolic || null,
      bp_diastolic: registrationData.bpDiastolic || null,
      pulse: registrationData.pulse || null,
      spo2: registrationData.spo2 || null,
      respiratory_rate: registrationData.respiratoryRate || null,
      random_blood_sugar: registrationData.randomBloodSugar || null,
      vital_notes: registrationData.vitalNotes || null,

      // Billing
      op_card_amount: registrationData.opCardAmount || null,
      consultation_fee: registrationData.consultationFee || null,
      total_amount: registrationData.totalAmount || null,
      payment_mode: registrationData.paymentMode || null,

      // Advance Payment
      advance_amount: registrationData.advanceAmount ? parseFloat(registrationData.advanceAmount) : 0.00,
      advance_payment_method: registrationData.advancePaymentMethod || null,
      advance_payment_date: registrationData.advanceAmount ? new Date().toISOString() : null,
      advance_reference_number: registrationData.advanceReferenceNumber || null,
      advance_notes: registrationData.advanceNotes || null,

      // Admission Information
      admission_date: admissionDateTime,
      admission_time: registrationData.admissionTime || null,
      primary_complaint: registrationData.primaryComplaint || null,
      admission_type: (function () {
        const type = registrationData.admissionType;
        if (!type) return 'outpatient';
        const validTypes = ['emergency', 'elective', 'referred', 'outpatient', 'transfer', 'inpatient'];
        if (validTypes.includes(type)) return type;
        if (type === 'scheduled') return 'elective';
        return 'outpatient';
      })(),
      referring_doctor_facility: registrationData.referringDoctorFacility || null,
      department_ward: registrationData.departmentWard || null,
      room_number: registrationData.roomNumber || null,
      consulting_doctor_id: registrationData.consultingDoctorId || null,
      consulting_doctor_name: registrationData.consultingDoctorName || null,

      // Guardian/Attendant Details
      guardian_name: registrationData.guardianName || null,
      guardian_relationship: registrationData.guardianRelationship || null,
      guardian_phone: registrationData.guardianPhone || null,
      guardian_address: registrationData.guardianAddress || null,

      // Emergency Contact
      emergency_contact_name: registrationData.emergencyContactName || null,
      emergency_contact_phone: registrationData.emergencyContactPhone || null,
      emergency_contact_relationship: registrationData.emergencyContactRelationship || null,

      // Insurance
      insurance_number: registrationData.insuranceNumber || null,
      insurance_provider: registrationData.insuranceProvider || null,

      // Additional fields
      initial_symptoms: registrationData.initialSymptoms || null,
      referred_by: registrationData.referredBy || null,
      qr_code: qrCodeDataUrl,
      user_id: userId || null,
      staff_id: registrationData.staffId || null,
      status: 'active'
    };

    const { data: patient, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single();

    if (error) {
      console.error('Error inserting patient record:', error?.message || error?.code || error);
      throw new Error(`Failed to create patient record: ${error?.message || error?.code || 'Unknown error'}`);
    }

    return patient;
  } catch (error) {
    console.error('Error inserting patient record:', error);
    throw error;
  }
}

/**
 * Create a party record for the patient
 * Note: Simplified to work with actual database schema
 */
export async function createPartyRecord(
  uhid: string,
  registrationData: PatientRegistrationData
): Promise<string | undefined> {
  try {
    // Handle optional name fields - use UHID as fallback if no name provided
    const firstName = registrationData.firstName?.trim() || '';
    const lastName = registrationData.lastName?.trim() || '';
    const fullName = firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || `Patient ${uhid}`;

    // Check if party already exists with this UHID
    const { data: existingParty } = await supabase
      .from('party')
      .select('id')
      .eq('party_code', uhid)
      .single();

    if (existingParty) {
      console.log('Party already exists, returning existing party:', existingParty.id);
      return existingParty.id;
    }

    // First, check if the party table exists by trying a simple query
    try {
      const { error: tableCheckError } = await supabase
        .from('party')
        .select('id')
        .limit(1);

      // If we get an error indicating the table doesn't exist, skip party creation
      if (tableCheckError && (tableCheckError.message.includes('does not exist') || tableCheckError.message.includes('relation') || tableCheckError.message.includes('not found'))) {
        console.warn('Party table does not exist, skipping party creation');
        return undefined;
      }
    } catch (tableCheckException) {
      // If any exception occurs during table check, skip party creation
      console.warn('Unable to verify party table existence, skipping party creation');
      return undefined;
    }

    // Try to get the actual party table structure
    let existingParties;
    let schemaError;
    try {
      const result = await supabase
        .from('party')
        .select('*')
        .limit(1);
      existingParties = result.data;
      schemaError = result.error;
    } catch (e) {
      schemaError = e;
    }

    // If party table doesn't exist or has issues, skip party creation
    if (schemaError) {
      console.error('Error checking party schema:', (schemaError as any)?.message || (schemaError as any)?.error || schemaError);
      console.warn('Skipping party creation due to schema error');
      return undefined;
    }

    // If no party table exists, skip party creation
    if (!existingParties) {
      console.warn('Party table appears to be empty or inaccessible, skipping party creation');
      return undefined;
    }

    // Build party data based on available columns
    const partyData: any = {
      party_code: uhid,
      party_type: 'patient',
      status: 'active'
    };

    // Add optional fields if they exist in schema
    if (existingParties && existingParties.length > 0) {
      const sampleParty = existingParties[0];
      if ('name' in sampleParty) partyData.name = fullName;
      if ('party_name' in sampleParty) partyData.party_name = fullName;
      if ('full_name' in sampleParty) partyData.full_name = fullName;  // Handle full_name column specifically
      if ('phone' in sampleParty) partyData.phone = registrationData.phone || null;
      if ('email' in sampleParty) partyData.email = registrationData.email || `${uhid}@annam.com`;
      if ('address' in sampleParty) partyData.address = registrationData.address || null;
    }

    const { data: party, error } = await supabase
      .from('party')
      .insert([partyData])
      .select()
      .single();

    if (error) {
      console.error('Error creating party record:', error?.message || error?.code || error);
      // Don't throw error, just return undefined to continue registration
      console.warn('Failed to create party record, continuing without party_id');
      return undefined;
    }

    return party?.id || undefined;
  } catch (error) {
    console.error('Error creating party record:', error instanceof Error ? error.message : error);
    // Don't throw error, just return undefined to continue registration
    console.warn('Exception in party creation, continuing without party_id');
    return undefined;
  }
}

/**
 * Link the Supabase auth user to the users table for role management
 */
export async function linkAuthUserToPatient(
  authUserId: string | null,
  uhid: string,
  registrationData: PatientRegistrationData,
  partyId?: string
): Promise<any> {
  try {
    const firstName = registrationData.firstName?.trim() || '';
    const lastName = registrationData.lastName?.trim() || '';
    const fullName = firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || `Patient ${uhid}`;

    const email = registrationData.email || `${uhid}@annam.com`;

    // Check if user already exists with this UHID or email
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .or(`employee_id.eq.${uhid},email.eq.${email}`)
      .single();

    if (existingUser) {
      console.log('User already exists, returning existing user:', existingUser.id);
      return existingUser;
    }

    const userData: any = {
      employee_id: uhid,
      name: fullName,
      email: email,
      phone: registrationData.phone || null,
      address: registrationData.address || null,
      role: 'patient',
      status: 'active',
      permissions: {
        view_own_records: true,
        book_appointments: true,
        view_prescriptions: true,
        view_bills: true
      }
    };

    // Only add auth_id if it's provided (optional field)
    if (authUserId) {
      userData.auth_id = authUserId;
    }

    // Only add party_id if it's provided (optional field)
    if (partyId) {
      userData.party_id = partyId;
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('Error creating user record:', error?.message || error?.code || error);

      // If it's a duplicate key error, try to fetch the existing user
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        console.log('Duplicate user detected, fetching existing user');
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .or(`employee_id.eq.${uhid},email.eq.${email}`)
          .single();

        if (existingUser) {
          console.log('Returning existing user:', existingUser.id);
          return existingUser;
        }
      }

      throw new Error(`Failed to create user record: ${error?.message || error?.code || 'Unknown error'}`);
    }

    return user;
  } catch (error) {
    console.error('Error linking auth user to patient:', error);
    throw error;
  }
}

/**
 * Create an initial appointment if symptoms are provided
 */
export async function createInitialAppointment(
  patientId: string,
  registrationData: PatientRegistrationData
): Promise<any> {
  try {
    if (!registrationData.initialSymptoms?.trim() && !registrationData.primaryComplaint?.trim()) {
      return null; // No appointment needed if no symptoms
    }

    // Try to get a default doctor for initial appointment
    let doctorId = null;
    try {
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (doctors && doctors.length > 0) {
        doctorId = doctors[0].id;
      }
    } catch (doctorError) {
      console.warn('Could not fetch default doctor for initial appointment:', doctorError);
      // Continue without doctor - appointment can be assigned later
    }

    // Generate appointment ID
    const appointmentId = `APT${Date.now()}`;

    // Use tomorrow as default appointment date to ensure it's not in the past
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentData = {
      appointment_id: appointmentId,
      patient_id: patientId,
      appointment_date: tomorrow.toISOString().split('T')[0],
      appointment_time: '09:00:00',
      duration_minutes: 30,
      type: 'consultation',
      status: 'scheduled',
      symptoms: registrationData.initialSymptoms || registrationData.primaryComplaint,
      notes: `Initial consultation for newly registered patient. Primary complaint: ${registrationData.primaryComplaint || 'General consultation'}`,
      // Only add doctor_id if we have one
      ...(doctorId && { doctor_id: doctorId })
    };

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating initial appointment:', error);

      // If the error is due to missing doctor_id, try without it (if table allows)
      if (error.message?.includes('null value') && error.message?.includes('doctor_id')) {
        console.log('Retrying appointment creation without doctor_id');
        const appointmentDataWithoutDoctor = { ...appointmentData };
        delete appointmentDataWithoutDoctor.doctor_id;

        const { data: fallbackAppointment, error: fallbackError } = await supabase
          .from('appointments')
          .insert([appointmentDataWithoutDoctor])
          .select()
          .single();

        if (fallbackError) {
          console.error('Error creating fallback appointment:', fallbackError);
          return null;
        }

        return fallbackAppointment;
      }

      // Don't throw error for appointment creation failure
      return null;
    }

    return appointment;
  } catch (error) {
    console.error('Error creating initial appointment:', error);
    // Don't throw error for appointment creation failure
    return null;
  }
}

/**
 * Main function to register a new patient with complete workflow
 */
export async function registerNewPatient(
  registrationData: PatientRegistrationData,
  preGeneratedUHID?: string
): Promise<PatientResponse> {
  try {
    // Step 1: Use pre-generated UHID or generate new one
    const uhid = preGeneratedUHID || await generateUHID();
    console.log('Using UHID:', uhid);

    // Step 3: Create party record (optional - may not exist in all schemas)
    let partyId: string | undefined;
    try {
      partyId = await createPartyRecord(uhid, registrationData);
      console.log('Created party record:', partyId);
    } catch (partyError) {
      console.warn('Party creation failed, continuing without party_id:', partyError instanceof Error ? partyError.message : partyError);
      // Continue without party_id - it's optional
      partyId = undefined; // Explicitly set to undefined
    }

    // Step 2: Create authentication credentials (optional - may fail)
    let authUserId: string | null = null;
    let credentials: { email: string; password: string } | undefined;

    try {
      const authResult = await createPatientAuthCredentials(uhid);
      authUserId = authResult.authUser?.id || null;
      credentials = authResult.credentials;
      console.log('Created auth user:', authUserId);
    } catch (authError) {
      console.warn('Auth creation failed, continuing without auth:', authError);
      // Continue without auth - patient can still be registered
      credentials = {
        email: `${uhid}@annam.com`,
        password: 'password'
      };
    }

    // Step 3: Create user record in users table (auth_id and party_id are now optional)
    const userRecord = await linkAuthUserToPatient(authUserId, uhid, registrationData, partyId);
    console.log('Created user record:', userRecord.id);

    // Step 5: Insert patient record with user_id link
    const patient = await insertPatientRecord(uhid, registrationData, userRecord.id);
    console.log('Created patient record:', patient.id);

    // Step 6: Create initial appointment if symptoms provided
    if (registrationData.initialSymptoms?.trim() || registrationData.primaryComplaint?.trim()) {
      const appointment = await createInitialAppointment(patient.id, registrationData);
      if (appointment) {
        console.log('Created initial appointment:', appointment.id);
      }
    }

    // Step 7: For outpatient registrations, create an appointment for today
    if (registrationData.admissionType === 'outpatient') {
      try {
        // Get a default doctor (first available doctor)
        const { data: doctors } = await supabase
          .from('doctors')
          .select('id')
          .eq('status', 'active')
          .is('deleted_at', null)
          .limit(1);

        const now = new Date();
        let appointmentDate = now.toISOString().split('T')[0];
        let appointmentTime = '09:00:00'; // Default to 9 AM

        // If current time is past 9 AM, schedule for next day or later today if possible
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Check if current time is past 9 AM
        if (currentHour >= 9 && currentMinute > 0) {
          // Schedule for tomorrow instead
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          appointmentDate = tomorrow.toISOString().split('T')[0];
        }

        if (doctors && doctors.length > 0) {
          const doctorId = doctors[0].id;

          const appointmentData: AppointmentData = {
            patientId: patient.id,
            doctorId: doctorId,
            appointmentDate: appointmentDate,
            appointmentTime: appointmentTime,
            durationMinutes: 30,
            type: 'consultation',
            isEmergency: false,
            chiefComplaint: registrationData.primaryComplaint || 'General consultation',
            bookingMethod: 'walk_in'
          };
          const appointment = await createAppointment(appointmentData);
          console.log('Created outpatient appointment:', appointment.id);
        } else {
          // If no doctors exist, create a basic appointment record directly
          console.log('No doctors found, creating direct appointment record');

          // Try to create using the new appointment structure first
          try {
            // Create encounter first
            const scheduledAt = `${appointmentDate}T09:00:00`;

            const encounterRecord = {
              patient_id: patient.id,
              start_at: scheduledAt
            };

            const { data: encounter, error: encounterError } = await supabase
              .from('encounter')
              .insert([encounterRecord])
              .select()
              .single();

            if (encounterError) {
              throw new Error(`Failed to create encounter: ${encounterError.message}`);
            }

            // Now create appointment with encounter_id
            const appointmentRecord = {
              encounter_id: encounter.id,
              scheduled_at: scheduledAt,
              duration_minutes: 30
            };

            const { data: directAppointment, error: directError } = await supabase
              .from('appointment')
              .insert([appointmentRecord])
              .select()
              .single();

            if (directError) {
              console.error('Error creating direct appointment in new structure:', directError);

              // Fallback to legacy structure
              const appointmentId = `APT${Date.now()}`;

              const legacyAppointmentRecord = {
                appointment_id: appointmentId,
                patient_id: patient.id,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                duration_minutes: 30,
                type: 'consultation',
                status: 'scheduled',
                chief_complaint: registrationData.primaryComplaint || 'General consultation'
              };

              const { data: legacyAppointment, error: legacyError } = await supabase
                .from('appointments')
                .insert([legacyAppointmentRecord])
                .select()
                .single();

              if (legacyError) {
                console.error('Error creating direct appointment in legacy structure:', legacyError);
              } else {
                console.log('Created direct appointment using legacy structure:', legacyAppointment.id);
              }
            } else {
              console.log('Created direct appointment using new structure:', directAppointment.id);
            }
          } catch (structureError) {
            console.error('Error creating appointment with new structure:', structureError);

            // Fallback to legacy structure
            const appointmentId = `APT${Date.now()}`;

            const legacyAppointmentRecord = {
              appointment_id: appointmentId,
              patient_id: patient.id,
              appointment_date: appointmentDate,
              appointment_time: appointmentTime,
              duration_minutes: 30,
              type: 'consultation',
              status: 'scheduled',
              chief_complaint: registrationData.primaryComplaint || 'General consultation'
            };

            const { data: legacyAppointment, error: legacyError } = await supabase
              .from('appointments')
              .insert([legacyAppointmentRecord])
              .select()
              .single();

            if (legacyError) {
              console.error('Error creating direct appointment in legacy structure:', legacyError);
            } else {
              console.log('Created direct appointment using legacy structure:', legacyAppointment.id);
            }
          }
        }
      } catch (appointmentError) {
        console.error('Error creating outpatient appointment:', appointmentError);
        // Don't fail the entire registration if appointment creation fails
      }

      // Step 7.5: Add outpatient to queue for vitals
      if (registrationData.admissionType === 'outpatient') {
        try {
          const queueResult = await addToQueue(
            patient.id,
            registrationData.admissionDate || new Date().toISOString().split('T')[0],
            0, // Default priority
            `New outpatient registration - ${registrationData.primaryComplaint || 'General consultation'}`,
            registrationData.staffId
          );
          
          if (queueResult.success) {
            console.log('Added patient to outpatient queue:', queueResult.queueEntry?.id);
          } else {
            console.warn('Failed to add patient to queue:', queueResult.error);
            // Don't fail registration if queue addition fails
          }
        } catch (queueError) {
          console.error('Error adding patient to queue:', queueError);
          // Don't fail the registration if queue addition fails
        }
      }
    }

    // Step 8: Allocate bed if this is an inpatient registration and a bed is selected
    if (registrationData.admissionType === 'inpatient' && registrationData.selectedBedId) {
      try {
        const bedAllocationData: BedAllocationData = {
          patientId: patient.id,
          bedId: registrationData.selectedBedId,
          admissionDate: registrationData.admissionDate || new Date().toISOString(),
          admissionType: 'inpatient', // Changed from scheduled for new registrations
          reason: `Inpatient admission - ${registrationData.primaryComplaint || 'General admission'}`
        };
        const bedAllocation = await allocateBed(bedAllocationData);
        console.log('Created bed allocation:', bedAllocation.id);

        // Create IP advance record if patient paid advance during registration
        if (registrationData.advanceAmount && parseFloat(registrationData.advanceAmount) > 0) {
          try {
            const { createAdvanceFromPatientRegistration } = await import('./ipFlexibleBillingService');
            const advance = await createAdvanceFromPatientRegistration(
              bedAllocation.id,
              patient.id,
              parseFloat(registrationData.advanceAmount),
              registrationData.advancePaymentMethod || 'cash',
              registrationData.advanceReferenceNumber,
              registrationData.advanceNotes,
              registrationData.staffId
            );
            console.log('Created advance record from registration:', advance.id);
          } catch (advanceError) {
            console.error('Error creating advance record:', advanceError);
            // Don't fail the registration if advance creation fails
          }
        }

        // Update patient status to admitted
        await updatePatientAdmissionStatus(uhid, true);
      } catch (bedError) {
        console.error('Error allocating bed:', bedError);
        // Don't fail the entire registration if bed allocation fails
      }
    }

    return {
      success: true,
      patient,
      uhid,
      qrCode: patient.qr_code, // Include QR code in response
      credentials,
    };

  } catch (error) {
    console.error('Error registering new patient:', error instanceof Error ? error.message : error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validate that UHID is unique
 */
export async function validateUHIDUnique(uhid: string): Promise<boolean> {
  try {
    const { data: existingPatient, error } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('patient_id', uhid)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error validating UHID uniqueness:', error);
      throw new Error('Failed to validate UHID');
    }

    return !existingPatient; // Return true if no existing patient found
  } catch (error) {
    console.error('Error validating UHID uniqueness:', error);
    throw error;
  }
}

/**
 * Get patient by UHID with comprehensive data
 */
export async function getPatientByUHID(idOrUhid: string): Promise<any> {
  try {
    // Validate UHID format
    if (!idOrUhid || typeof idOrUhid !== 'string' || idOrUhid.trim() === '') {
      throw new Error('Invalid ID provided');
    }

    const trimmedID = idOrUhid.trim();

    let query = supabase
      .from('patients')
      .select('*, staff:staff_id(first_name, last_name, employee_id)');

    // Check if the ID is a UUID (database ID)
    if (trimmedID.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('id', trimmedID);
    } else {
      query = query.eq('patient_id', trimmedID);
    }

    const { data: patient, error } = await query.single();

    if (error) {
      console.error('Error fetching patient:', error);
      const errorMessage = error?.message || error?.code || String(error) || 'Unknown database error';
      // Handle case where patient is not found
      if (error.code === 'PGRST116') {
        throw new Error(`Patient with ID ${trimmedID} not found`);
      }
      throw new Error(`Database error while fetching patient: ${errorMessage}`);
    }

    // Handle case where patient is null but no error was thrown
    if (!patient) {
      throw new Error(`Patient with ID ${trimmedID} not found`);
    }

    return patient;
  } catch (error) {
    console.error('Error fetching patient:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch patient: ${errorMessage}`);
  }
}

/**
 * Get patient with related data including appointments
 */
export async function getPatientWithRelatedData(uhid: string): Promise<any> {
  try {
    // First get the basic patient data
    let patient;
    // Check if the ID is a UUID (database ID) or UHID format
    if (uhid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // If it's a UUID, we need to find the patient by database ID
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*, staff:staff_id(first_name, last_name, employee_id)')
        .eq('id', uhid)
        .single();

      if (patientError) {
        console.error('Error fetching patient by database ID:', patientError);
        throw new Error(`Patient not found: ${patientError.message || 'Unknown error'}`);
      }

      patient = patientData;
    } else {
      // It's a UHID format, use the existing function
      patient = await getPatientByUHID(uhid);
    }

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Fetch appointments from the new database structure
    try {
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointment')
        .select(`
          *,
          encounter:encounter(
            patient_id,
            clinician_id,
            type_id,
            start_at,
            doctors:clinician_id(
              id,
              specialization,
              user:users(name, phone, email)
            )
          )
        `)
        .eq('encounter.patient_id', patient.id)
        .order('scheduled_at', { ascending: false });

      if (!appointmentsError && appointments) {
        // Transform appointments to match the expected format
        patient.appointments = appointments.map((apt: any) => ({
          id: apt.id,
          appointment_date: apt.scheduled_at ? new Date(apt.scheduled_at).toISOString().split('T')[0] : null,
          appointment_time: apt.scheduled_at ? new Date(apt.scheduled_at).toTimeString().split(' ')[0] : null,
          type: 'Consultation',
          status: 'scheduled',
          duration_minutes: apt.duration_minutes,
          doctor: apt.encounter?.doctors ? {
            id: apt.encounter.doctors.id,
            specialization: apt.encounter.doctors.specialization,
            user: apt.encounter.doctors.user
          } : null,
          symptoms: null,
          notes: apt.notes
        }));
      } else {
        patient.appointments = [];
      }
    } catch (appointmentError) {
      console.warn('Error fetching appointments:', appointmentError);
      patient.appointments = [];
    }

    // Fetch bed allocations with bed details
    try {
      const { data: bedAllocations, error: bedAllocationsError } = await supabase
        .from('bed_allocations')
        .select(`
          *,
          bed:bed_id(
            room_number,
            bed_number,
            bed_type,
            floor_number
          )
        `)
        .eq('patient_id', patient.id)
        .order('admission_date', { ascending: false });

      if (!bedAllocationsError && bedAllocations) {
        patient.bed_allocations = bedAllocations;
      } else {
        patient.bed_allocations = [];
      }
    } catch (bedAllocationError) {
      console.warn('Error fetching bed allocations:', bedAllocationError);
      patient.bed_allocations = [];
    }

    // Initialize other related data arrays
    patient.bed_allocations = patient.bed_allocations || [];

    return patient;
  } catch (error) {
    console.error('Error fetching patient with related data:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch patient with related data: ${errorMessage}`);
  }
}

/**
 * Update patient information
 */
export async function updatePatientRecord(
  idOrUhid: string,
  updateData: any
): Promise<any> {
  try {
    console.log('Updating patient record for ID/UHID:', idOrUhid);
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    
    let query = supabase.from('patients').update(updateData);
    
    // Check if the ID is a UUID (database ID)
    if (idOrUhid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('Using UUID (database ID) to update patient');
      query = query.eq('id', idOrUhid);
    } else {
      console.log('Using patient_id (UHID) to update patient');
      query = query.eq('patient_id', idOrUhid);
    }

    const { data: patient, error } = await query
      .select()
      .single();

    if (error) {
      console.error('Error updating patient record:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to update patient: ${error.message}`);
    }

    console.log('Patient updated successfully:', patient);
    return patient;
  } catch (error) {
    console.error('Error updating patient record:', error);
    throw error;
  }
}

export async function getAllPatients(
  options: {
    page?: number;
    limit?: number;
    status?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    place?: string;
  } = {}
): Promise<{ patients: any[]; total: number; page: number; limit: number }> {
  try {
    const { page = 1, limit = 20, status, searchTerm, startDate, endDate, place } = options;
    const offset = (page - 1) * limit;

    if (status === 'admitted') {
      // Special handling for admitted patients - get patient IDs from bed_allocations first
      let bedQuery = supabase
        .from('bed_allocations')
        .select('patient_id')
        .eq('status', 'active')
        .is('discharge_date', null);

      const { data: bedData, error: bedError } = await bedQuery;

      if (bedError) {
        console.error('Error fetching bed allocations:', bedError);
        throw new Error(`Failed to fetch bed allocations: ${bedError.message}`);
      }

      const admittedPatientIds = (bedData || []).map((b: any) => b.patient_id).filter(Boolean);

      if (admittedPatientIds.length === 0) {
        return {
          patients: [],
          total: 0,
          page,
          limit
        };
      }

      // Now fetch patients with these IDs, applying other filters
      let patientQuery = supabase
        .from('patients')
        .select('*, staff:staff_id(first_name, last_name, employee_id)', { count: 'exact' })
        .in('id', admittedPatientIds);

      // Apply other filters
      if (searchTerm) {
        patientQuery = patientQuery.or(`name.ilike.%${searchTerm}%,patient_id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      if (startDate) {
        patientQuery = patientQuery.gte('created_at', startDate);
      }
      if (endDate) {
        patientQuery = patientQuery.lte('created_at', endDate);
      }

      if (place) {
        patientQuery = patientQuery.or(`city.ilike.%${place}%,state.ilike.%${place}%,address.ilike.%${place}%`);
      }

      const { data: patients, error, count } = await patientQuery
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admitted patients:', error);
        throw new Error(`Failed to fetch patients: ${error.message}`);
      }

      // Enhance patients with admission status
      const enhancedPatients = (patients || []).map((patient: any) => ({
        ...patient,
        is_admitted: true, // Since they have active bed allocation
        bed_id: null // Could fetch this if needed
      }));

      return {
        patients: enhancedPatients,
        total: count || 0,
        page,
        limit
      };
    }

    // Normal query for other statuses
    let query = supabase
      .from('patients')
      .select('*, staff:staff_id(first_name, last_name, employee_id)', { count: 'exact' });

    // Apply filters
    if (status) {
      if (status === 'critical') {
        query = query.eq('is_critical', true);
      } else {
        query = query.eq('status', status);
      }
    }

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,patient_id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    // Date range filter
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Place filter (filter by city, state, or address)
    if (place) {
      query = query.or(`city.ilike.%${place}%,state.ilike.%${place}%,address.ilike.%${place}%`);
    }

    // Apply pagination
    const { data: patients, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }

    // Get active bed allocations only for the fetched patients to determine admission status.
    // Note: 'active' status means the patient is currently admitted.
    const fetchedPatientIds = (patients || []).map((p: any) => p.id).filter(Boolean);
    const { data: activeBedAllocations } = fetchedPatientIds.length
      ? await supabase
          .from('bed_allocations')
          .select('patient_id, bed_id')
          .eq('status', 'active')
          .is('discharge_date', null)
          .in('patient_id', fetchedPatientIds)
      : { data: [] as any[] };

    const admittedPatientMap = new Map((activeBedAllocations || []).map((a: any) => [a.patient_id, a.bed_id]));

    // Enhance patients with admission status
    const enhancedPatients = (patients || []).map((patient: any) => ({
      ...patient,
      is_admitted: admittedPatientMap.has(patient.id),
      bed_id: admittedPatientMap.get(patient.id),
      bed_allocations: undefined // Remove the join data
    }));

    return {
      patients: enhancedPatients,
      total: count || 0,
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
}

/**
 * Update patient admission status
 * @param patientId - Patient's unique hospital ID or database ID
 * @param isAdmitted - Whether the patient is admitted
 * @returns Promise with updated patient data
 */
export async function updatePatientAdmissionStatus(
  patientId: string,
  isAdmitted: boolean,
  admissionType: string = 'inpatient',
  additionalData: any = {}
): Promise<any> {
  try {
    console.log('Updating patient admission status for:', patientId, { isAdmitted, admissionType, additionalData });

    // Fetch a sample record to check available columns
    const { data: sampleData } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    const availableColumns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [];

    const updateData: any = {
      is_admitted: isAdmitted,
      updated_at: new Date().toISOString()
    };

    if (isAdmitted) {
      // Validate/Map admission_type to ensure it meets DB constraints
      let validAdmissionType = admissionType;
      const validTypes = ['emergency', 'elective', 'referred', 'transfer', 'inpatient', 'outpatient'];

      if (!validTypes.includes(validAdmissionType)) {
        if (validAdmissionType === 'scheduled') validAdmissionType = 'elective';
        else validAdmissionType = 'elective'; // Fallback
      }

      updateData.admission_type = validAdmissionType;
      updateData.status = 'active';
    } else {
      updateData.admission_type = 'outpatient';
    }

    // Only add additional data if the columns exist
    if (availableColumns.length > 0) {
      Object.keys(additionalData).forEach(key => {
        if (availableColumns.includes(key)) {
          updateData[key] = additionalData[key];
        } else {
          console.warn(`Column '${key}' does not exist in patients table, skipping.`);
          // Special mapping for common fields that might be named differently
          if (key === 'diagnosis' && availableColumns.includes('initial_symptoms') && !updateData.initial_symptoms) {
            updateData.initial_symptoms = additionalData[key];
          }
        }
      });
    } else {
      // If table is empty, we can't check columns easily, so we merge carefully
      // or just merge and let Supabase error if absolutely necessary, 
      // but here we merge common ones we know should exist
      Object.assign(updateData, additionalData);
    }

    const { data, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('patient_id', patientId)
      .select();

    if (error) {
      // If we got a column error even after our check (maybe table was empty)
      if (error.message.includes('column') && error.message.includes('not find')) {
        console.warn('Column error detected, retrying with minimal data');
        const minimalUpdate = {
          is_admitted: isAdmitted,
          updated_at: new Date().toISOString(),
          status: isAdmitted ? 'active' : 'inactive'
        };
        const { data: retryData, error: retryError } = await supabase
          .from('patients')
          .update(minimalUpdate)
          .eq('patient_id', patientId)
          .select();

        if (retryError) throw retryError;
        return retryData ? retryData[0] : null;
      }

      console.error('Error updating patient admission status:', error);
      throw new Error(`Failed to update admission status: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    console.log('Patient admission status updated successfully:', data[0]);
    return data[0];
  } catch (error) {
    console.error('Error updating patient admission status:', error);
    throw error;
  }
}

/**
 * Update patient critical status
 * @param patientId - Patient's unique hospital ID or database ID
 * @param isCritical - Whether the patient is in critical condition
 * @returns Promise with updated patient data
 */
export async function updatePatientCriticalStatus(
  patientId: string,
  isCritical: boolean
): Promise<any> {
  try {
    console.log('Updating patient critical status for:', patientId, { isCritical });

    const { data, error } = await supabase
      .from('patients')
      .update({
        is_critical: isCritical,
        updated_at: new Date().toISOString()
      })
      .eq('patient_id', patientId)
      .select();

    if (error) {
      console.error('Error updating patient critical status:', error);
      throw new Error(`Failed to update critical status: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    console.log('Patient critical status updated successfully:', data[0]);
    return data[0];
  } catch (error) {
    console.error('Error updating patient critical status:', error);
    throw error;
  }
}

/**
 * Update both admission and critical status
 * @param patientId - Patient's unique hospital ID or database ID
 * @param isAdmitted - Whether the patient is admitted
 * @param isCritical - Whether the patient is in critical condition
 * @returns Promise with updated patient data
 */
export async function updatePatientStatus(
  patientId: string,
  isAdmitted?: boolean,
  isCritical?: boolean
): Promise<any> {
  try {
    console.log('Updating patient status for:', patientId, { isAdmitted, isCritical });

    // First verify the patient exists
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, patient_id, is_admitted, is_critical')
      .eq('patient_id', patientId)
      .single();

    if (fetchError) {
      console.error('Error fetching patient:', fetchError);
      throw new Error(`Patient lookup failed: ${fetchError.message}`);
    }

    if (!existingPatient) {
      console.error('Patient not found with patient_id:', patientId);
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    console.log('Found patient:', existingPatient);

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (isAdmitted !== undefined) {
      updateData.is_admitted = isAdmitted;
    }

    if (isCritical !== undefined) {
      updateData.is_critical = isCritical;
    }

    console.log('Update data:', updateData);

    // Update using patient_id field
    const { data, error, count } = await supabase
      .from('patients')
      .update(updateData)
      .eq('patient_id', patientId)
      .select();

    console.log('Update response:', { data, error, count });

    if (error) {
      console.error('Error updating patient status:', error);
      throw new Error(`Failed to update patient status: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.error('Update returned no data. This might be an RLS (Row Level Security) issue.');
      console.error('The SELECT query worked but UPDATE did not return data.');
      console.error('Check your Supabase RLS policies for the patients table.');
      throw new Error(`Update returned no data for patient ID ${patientId}. This may be a permissions issue (RLS).`);
    }

    console.log('Patient status updated successfully:', data[0]);
    return data[0];
  } catch (error) {
    console.error('Error updating patient status:', error);
    throw error;
  }
}

/**
 * Get patients by admission status
 * @param isAdmitted - Filter by admission status
 * @param isCritical - Optional filter by critical status
 * @returns Promise with filtered patients
 */
export async function getPatientsByStatus(
  isAdmitted?: boolean,
  isCritical?: boolean
): Promise<any[]> {
  try {
    let query = supabase
      .from('patients')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email,
          role,
          status,
          permissions
        )
      `);

    if (isAdmitted !== undefined) {
      query = query.eq('is_admitted', isAdmitted);
    }

    if (isCritical !== undefined) {
      query = query.eq('is_critical', isCritical);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients by status:', error);
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching patients by status:', error);
    throw error;
  }
}

/**
 * Get admitted patients count
 * @returns Promise with count of admitted patients
 */
export async function getAdmittedPatientsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('bed_allocations')
      .select('patient_id', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('discharge_date', null);

    if (error) {
      console.error('Error getting admitted patients count:', error);
      throw new Error(`Failed to get count: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting admitted patients count:', error);
    throw error;
  }
}

/**
 * Get critical patients count
 * @returns Promise with count of critical patients
 */
export async function getCriticalPatientsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('is_critical', true);

    if (error) {
      console.error('Error getting critical patients count:', error);
      throw new Error(`Failed to get count: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting critical patients count:', error);
    throw error;
  }
}

/**
 * Delete a patient by ID
 */
export async function deletePatient(patientId: string): Promise<void> {
  try {
    // First, get the patient to find the user_id
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('user_id')
      .eq('patient_id', patientId)
      .single();

    if (fetchError) {
      console.error('Error fetching patient:', fetchError);
      throw new Error(`Failed to fetch patient: ${fetchError.message}`);
    }

    // Delete the patient record
    const { error: patientError } = await supabase
      .from('patients')
      .delete()
      .eq('patient_id', patientId);

    if (patientError) {
      console.error('Error deleting patient:', patientError);
      throw new Error(`Failed to delete patient: ${patientError.message}`);
    }

    // Delete the associated user record if it exists
    if (patient?.user_id) {
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', patient.user_id);

      if (userError) {
        console.error('Error deleting associated user:', userError);
        // Don't throw error for user deletion failure, as patient record was successfully deleted
      }
    }
  } catch (error) {
    console.error('Error in deletePatient:', error);
    throw error;
  }
}

/**
 * Get patient statistics (New Today, Total Outpatients, Total Inpatients)
 */
export async function getDailyPatientStats(): Promise<{
  newToday: number;
  outpatientToday: number;
  inpatientToday: number;
  totalOutpatients: number;
  totalInpatients: number;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextDay = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

    // Fetch all patients created today for new today count
    const { data: todayPatients, error: todayError } = await supabase
      .from('patients')
      .select('admission_type, created_at')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${nextDay}T00:00:00`);

    if (todayError) {
      console.error('Error fetching today patients:', todayError);
      return { newToday: 0, outpatientToday: 0, inpatientToday: 0, totalOutpatients: 0, totalInpatients: 0 };
    }

    // Fetch all patients for total counts
    const { data: allPatients, error: allError } = await supabase
      .from('patients')
      .select('admission_type');

    if (allError) {
      console.error('Error fetching all patients:', allError);
      return { newToday: 0, outpatientToday: 0, inpatientToday: 0, totalOutpatients: 0, totalInpatients: 0 };
    }

    const patientsToday = todayPatients || [];
    const patientsAll = allPatients || [];
    
    const newToday = patientsToday.length;

    // Based on our logic: Outpatient = NULL or 'outpatient', Inpatient = Any non-null value (elective, emergency, etc.)
    // Today's counts
    const outpatientToday = patientsToday.filter((p: any) => !p.admission_type || p.admission_type === 'outpatient').length;
    const inpatientToday = patientsToday.filter((p: any) => p.admission_type && p.admission_type !== 'outpatient').length;

    // Total counts
    const totalOutpatients = patientsAll.filter((p: any) => !p.admission_type || p.admission_type === 'outpatient').length;
    const totalInpatients = patientsAll.filter((p: any) => p.admission_type && p.admission_type !== 'outpatient').length;

    return {
      newToday,
      outpatientToday,
      inpatientToday,
      totalOutpatients,
      totalInpatients
    };
  } catch (error) {
    console.error('Error in getDailyPatientStats:', error);
    return { newToday: 0, outpatientToday: 0, inpatientToday: 0, totalOutpatients: 0, totalInpatients: 0 };
  }
}