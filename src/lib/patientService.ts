import { supabase } from './supabase';
import { generateBarcodeId, updatePatientWithBarcode } from './barcodeUtils';

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
  medicalHistory: string;
  currentMedications: string;
  chronicConditions: string;
  previousSurgeries: string;
  
  // Admission Details
  admissionDate?: string;
  admissionTime?: string;
  primaryComplaint: string;
  admissionType: string; // emergency, elective, referred
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
  credentials?: {
    email: string;
    password: string;
  };
  error?: string;
}

/**
 * Generate a unique UHID (Unique Hospital ID) for a new patient
 * Format: UHID + current year + 6-digit sequential number
 * Example: UHID2025000001
 */
export async function generateUHID(): Promise<string> {
  const now = new Date();
  const yearTwoDigits = now.getFullYear().toString().slice(-2); // Last two digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero
  
  try {
    // Generate a unique 4-digit random number
    let uhid: string = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (!isUnique && attempts < maxAttempts) {
      // Generate 4-digit random number
      const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      uhid = `AH${yearTwoDigits}${month}${randomNumber}`;
      
      // Check if this UHID already exists
      const { data: existing, error } = await supabase
        .from('patients')
        .select('patient_id')
        .eq('patient_id', uhid)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No record found, UHID is unique
        isUnique = true;
      } else if (error) {
        console.error('Error checking UHID uniqueness:', error);
        throw new Error('Failed to generate UHID');
      }
      
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Failed to generate unique UHID after maximum attempts');
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
    // Create auth user using Supabase Admin API
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
      throw new Error(`Failed to create authentication: ${authError.message}`);
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
    const fullName = `${registrationData.firstName} ${registrationData.lastName}`;
    
    // Generate barcode ID
    const barcodeId = generateBarcodeId(uhid);
    
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
      date_of_birth: registrationData.dateOfBirth,
      gender: registrationData.gender.toLowerCase(),
      marital_status: registrationData.maritalStatus || null,
      phone: registrationData.phone,
      email: registrationData.email || `${uhid}@annam.com`,
      address: registrationData.address,
      
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
      primary_complaint: registrationData.primaryComplaint,
      admission_type: registrationData.admissionType,
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
 * Link the Supabase auth user to the users table for role management
 */
export async function linkAuthUserToPatient(
  authUserId: string, 
  uhid: string, 
  registrationData: PatientRegistrationData
): Promise<any> {
  try {
    const fullName = `${registrationData.firstName} ${registrationData.lastName}`;
    
    const userData = {
      auth_id: authUserId,
      employee_id: uhid, // Using UHID as employee_id for patients
      name: fullName,
      email: registrationData.email || `${uhid}@annam.com`,
      role: 'patient',
      phone: registrationData.phone,
      address: registrationData.address,
      status: 'active',
      permissions: {
        patient_portal: true,
        view_own_records: true,
        book_appointments: true
      }
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('Error linking auth user to patient:', error);
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

    // Step 2: Create authentication credentials
    const { authUser, credentials } = await createPatientAuthCredentials(uhid);
    console.log('Created auth user:', authUser?.id);

    // Step 3: Create user record in users table
    const userRecord = await linkAuthUserToPatient(authUser.id, uhid, registrationData);
    console.log('Created user record:', userRecord.id);

    // Step 4: Insert patient record with user_id link
    const patient = await insertPatientRecord(uhid, registrationData, userRecord.id);
    console.log('Created patient record:', patient.id);

    // Step 5: Create initial appointment if symptoms provided
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
 * Get patient with related data (appointments, bills, etc.)
 */
export async function getPatientWithRelatedData(uhid: string): Promise<any> {
  try {
    const { data: patient, error } = await supabase
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
        ),
        appointments:appointments(
          id,
          appointment_id,
          appointment_date,
          appointment_time,
          type,
          status,
          symptoms,
          diagnosis,
          doctor:doctors(
            id,
            user:users(name, specialization)
          )
        ),
        bed_allocations:bed_allocations(
          id,
          admission_date,
          discharge_date,
          admission_type,
          status,
          bed:beds(bed_number, room_number, bed_type),
          doctor:doctors(
            id,
            user:users(name, specialization)
          )
        )
      `)
      .eq('patient_id', uhid)
      .single();

    if (error) {
      console.error('Error fetching patient with related data:', error);
      throw new Error(`Patient not found: ${error.message}`);
    }

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
      `, { count: 'exact' });

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

    return {
      patients: patients || [],
      total: count || 0,
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
}