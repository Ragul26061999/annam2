import { supabase } from './supabase';
import { generateBarcodeId, updatePatientWithBarcode } from './barcodeUtils';
import { generateQRCode } from './qrCodeService';

// Types - Updated to match comprehensive registration form
export interface PatientRegistrationData {
  // Personal Information (Mandatory)
  firstName: string;
  lastName: string;
  dateOfBirth: string;
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
  
  try {
    // Get the count of patients registered this month
    const { count, error } = await supabase
      .from('patients')
      .select('patient_id', { count: 'exact', head: true })
      .like('patient_id', `${prefix}-%`);
    
    if (error) {
      console.error('Error getting patient count for UHID:', error);
      throw new Error('Failed to generate UHID');
    }
    
    // Sequential number starts from 0001 each month
    const sequentialNumber = ((count || 0) + 1).toString().padStart(4, '0');
    const uhid = `${prefix}-${sequentialNumber}`;
    
    // Verify uniqueness (should always be unique with sequential numbering)
    const { data: existing, error: checkError } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('patient_id', uhid)
      .single();
    
    if (existing) {
      // If somehow exists, throw error (shouldn't happen with sequential)
      throw new Error('Generated UHID already exists');
    }
    
    return uhid;
  } catch (error) {
    console.error('Error generating UHID:', error);
    throw new Error('Failed to generate UHID');
  }
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

    if (existingUser && existingUser.auth_id) {
      // User already exists, return existing credentials
      console.log('User already exists, using existing credentials');
      return {
        authUser: { id: existingUser.auth_id },
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
      
      // If user already registered in auth, try to get the existing user
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        console.log('Auth user already exists, fetching existing user');
        
        // Try to sign in to get the user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInData?.user) {
          console.log('Retrieved existing auth user:', signInData.user.id);
          return {
            authUser: { id: signInData.user.id },
            credentials: { email, password }
          };
        }
        
        // If sign in fails, check if user exists in auth.users via users table
        const { data: existingAuthUser } = await supabase
          .from('users')
          .select('auth_id')
          .eq('email', email)
          .single();
        
        if (existingAuthUser?.auth_id) {
          return {
            authUser: { id: existingAuthUser.auth_id },
            credentials: { email, password }
          };
        }
      }
      
      throw new Error(`Failed to create authentication: ${authError.message}`);
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
    
    // Generate barcode ID
    const barcodeId = generateBarcodeId(uhid);
    
    // Generate QR code for the UHID
    const qrCodeDataUrl = await generateQRCode(uhid);
    
    // Prepare admission date and time
    let admissionDateTime = null;
    if (registrationData.admissionDate) {
      if (registrationData.admissionTime) {
        admissionDateTime = `${registrationData.admissionDate}T${registrationData.admissionTime}`;
      } else {
        admissionDateTime = `${registrationData.admissionDate}T00:00:00`;
      }
    }
    
    const patientData = {
      // Basic Information
      patient_id: uhid,
      // barcode_id field removed as it doesn't exist in the database schema
      name: fullName,
      date_of_birth: registrationData.dateOfBirth || null,
      gender: registrationData.gender ? registrationData.gender.toLowerCase() : null,
      marital_status: registrationData.maritalStatus || null,
      phone: registrationData.phone || null,
      email: registrationData.email || `${uhid}@annam.com`,
      address: registrationData.address || null,
      
      // Medical Information
      blood_group: registrationData.bloodGroup || null,
      allergies: registrationData.allergies || null,
      medical_history: registrationData.medicalHistory || null,
      current_medications: registrationData.currentMedications || null,
      chronic_conditions: registrationData.chronicConditions || null,
      previous_surgeries: registrationData.previousSurgeries || null,
      
      // New Admission Information
      admission_date: admissionDateTime,
      admission_time: registrationData.admissionTime || null,
      primary_complaint: registrationData.primaryComplaint || null,
      admission_type: registrationData.admissionType || null,
      referring_doctor_facility: registrationData.referringDoctorFacility || null,
      department_ward: registrationData.departmentWard || null,
      room_number: registrationData.roomNumber || null,
      
      // Guardian/Attendant Details (Optional)
      guardian_name: registrationData.guardianName || null,
      guardian_relationship: registrationData.guardianRelationship || null,
      guardian_phone: registrationData.guardianPhone || null,
      guardian_address: registrationData.guardianAddress || null,
      
      // Emergency Contact (Optional)
      emergency_contact_name: registrationData.emergencyContactName || null,
      emergency_contact_phone: registrationData.emergencyContactPhone || null,
      emergency_contact_relationship: registrationData.emergencyContactRelationship || null,
      
      // Insurance Information
      insurance_number: registrationData.insuranceNumber || null,
      insurance_provider: registrationData.insuranceProvider || null,
      
      // Additional fields
      initial_symptoms: registrationData.initialSymptoms || null,
      referred_by: registrationData.referredBy || null,
      
      // QR Code
      qr_code: qrCodeDataUrl,
      
      // Link to users table
      user_id: userId || null,
      
      // System fields
      status: 'active'
    };

    const { data: patient, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
      .single();

    if (error) {
      console.error('Error inserting patient record:', error);
      throw new Error(`Failed to create patient record: ${error.message}`);
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
): Promise<string> {
  try {
    // Handle optional name fields - use UHID as fallback if no name provided
    const firstName = registrationData.firstName?.trim() || '';
    const lastName = registrationData.lastName?.trim() || '';
    const fullName = firstName && lastName 
      ? `${firstName} ${lastName}` 
      : firstName || lastName || `Patient ${uhid}`;

    // First, try to get the actual party table structure
    const { data: existingParties, error: schemaError } = await supabase
      .from('party')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('Error checking party schema:', schemaError);
      // If party table doesn't exist or has issues, skip party creation
      // and generate a UUID to use as party_id
      console.warn('Skipping party creation, generating UUID for party_id');
      return crypto.randomUUID();
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
      console.error('Error creating party record:', error);
      throw new Error(`Failed to create party record: ${error.message}`);
    }

    return party.id;
  } catch (error) {
    console.error('Error creating party record:', error);
    throw error;
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
      console.error('Error creating user record:', error);
      throw new Error(`Failed to create user record: ${error.message}`);
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

    // Generate appointment ID
    const appointmentId = `APT${Date.now()}`;
    
    // Use tomorrow as default appointment date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointmentData = {
      appointment_id: appointmentId,
      patient_id: patientId,
      appointment_date: tomorrow.toISOString().split('T')[0],
      appointment_time: '09:00:00',
      type: 'consultation',
      status: 'scheduled',
      symptoms: registrationData.initialSymptoms || registrationData.primaryComplaint,
      notes: `Initial consultation for newly registered patient. Primary complaint: ${registrationData.primaryComplaint}`
    };

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating initial appointment:', error);
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
      console.warn('Party creation failed, continuing without party_id:', partyError);
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

    return {
      success: true,
      patient,
      uhid,
      qrCode: patient.qr_code, // Include QR code in response
      credentials,
    };

  } catch (error) {
    console.error('Error registering new patient:', error);
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
export async function getPatientByUHID(uhid: string): Promise<any> {
  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('patient_id', uhid)
      .single();

    if (error) {
      console.error('Error fetching patient by UHID:', error);
      throw new Error(`Patient not found: ${error.message}`);
    }

    return patient;
  } catch (error) {
    console.error('Error fetching patient by UHID:', error);
    throw error;
  }
}

/**
 * Get patient with related data including appointments
 */
export async function getPatientWithRelatedData(uhid: string): Promise<any> {
  try {
    // First get the basic patient data
    const patient = await getPatientByUHID(uhid);
    
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

    // Initialize other related data arrays
    patient.bed_allocations = [];

    return patient;
  } catch (error) {
    console.error('Error fetching patient with related data:', error);
    throw error;
  }
}

/**
 * Update patient information
 */
export async function updatePatientRecord(
  uhid: string, 
  updateData: any
): Promise<any> {
  try {
    const { data: patient, error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('patient_id', uhid)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient record:', error);
      throw new Error(`Failed to update patient: ${error.message}`);
    }

    return patient;
  } catch (error) {
    console.error('Error updating patient record:', error);
    throw error;
  }
}

/**
 * Get all patients with pagination and filtering
 */
export async function getAllPatients(
  options: {
    page?: number;
    limit?: number;
    status?: string;
    searchTerm?: string;
  } = {}
): Promise<{ patients: any[]; total: number; page: number; limit: number }> {
  try {
    const { page = 1, limit = 20, status, searchTerm } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,patient_id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
    }

    // Apply pagination
    const { data: patients, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }

    // Get active bed allocations to determine admission status
    const { data: activeBedAllocations } = await supabase
      .from('bed_allocations')
      .select('patient_id')
      .eq('status', 'active')
      .is('discharge_date', null);

    const admittedPatientIds = new Set((activeBedAllocations || []).map(a => a.patient_id));

    // Enhance patients with admission status
    const enhancedPatients = (patients || []).map(patient => ({
      ...patient,
      is_admitted: admittedPatientIds.has(patient.id),
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
  isAdmitted: boolean
): Promise<any> {
  try {
    console.log('Updating patient admission status for:', patientId, { isAdmitted });
    
    const { data, error } = await supabase
      .from('patients')
      .update({ 
        is_admitted: isAdmitted,
        updated_at: new Date().toISOString()
      })
      .eq('patient_id', patientId)
      .select();

    if (error) {
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
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('is_admitted', true);

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