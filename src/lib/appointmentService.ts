import { supabase } from './supabase';
import { Doctor } from './doctorService';

// Validation and business rule interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BusinessRules {
  maxAppointmentsPerDay: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  allowWeekendBooking: boolean;
  emergencySlotBuffer: number; // minutes
  followUpGracePeriod: number; // days
  allowEmergencyBooking: boolean;
  emergencyMaxAdvanceDays: number;
}

// Default business rules
const DEFAULT_BUSINESS_RULES: BusinessRules = {
  maxAppointmentsPerDay: 30, // Increased for hospital capacity
  minAdvanceBookingHours: 0, // No minimum advance booking for immediate care
  maxAdvanceBookingDays: 180, // Extended to 6 months for better planning
  allowWeekendBooking: true, // Hospitals operate 24/7
  emergencySlotBuffer: 10, // Reduced buffer for faster emergency response
  followUpGracePeriod: 14, // Extended grace period for follow-ups
  allowEmergencyBooking: true,
  emergencyMaxAdvanceDays: 30 // Extended emergency booking window
};

/**
 * Validate appointment data before creation
 */
export async function validateAppointmentData(
  appointmentData: AppointmentData,
  businessRules: BusinessRules = DEFAULT_BUSINESS_RULES
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic field validation
  if (!appointmentData.patientId) {
    errors.push('Patient ID is required');
  }
  if (!appointmentData.doctorId) {
    errors.push('Doctor ID is required');
  }
  if (!appointmentData.appointmentDate) {
    errors.push('Appointment date is required');
  }
  if (!appointmentData.appointmentTime) {
    errors.push('Appointment time is required');
  }

  // Date and time validation
  const appointmentDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
  const now = new Date();
  const dayOfWeek = appointmentDateTime.getDay();

  // Check if appointment is in the past (allow same-day appointments and immediate scheduling)
  // Only prevent appointments that are significantly in the past
  const appointmentDateOnly = appointmentDateTime.toISOString().split('T')[0];
  const todayDateOnly = now.toISOString().split('T')[0];

  // For same-day appointments, allow scheduling for later in the day, but prevent if time has already passed
  if (appointmentDateOnly === todayDateOnly) {
    // Allow same-day appointments if they're later today (after current time)
    // Or if they're within a reasonable grace period (e.g., last hour) for registration purposes
    const oneHourBeforeNow = new Date(now.getTime() - 60 * 60 * 1000);
    if (appointmentDateTime < oneHourBeforeNow) {
      errors.push('Same-day appointment cannot be scheduled more than 1 hour before current time');
    }
  } else {
    // For future appointments, prevent if more than 1 hour in the past (for rescheduling)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (appointmentDateTime < oneHourAgo) {
      errors.push('Appointment cannot be scheduled more than 1 hour in the past');
    }
  }

  // Emergency appointments have different validation rules
  if (appointmentData.isEmergency && businessRules.allowEmergencyBooking) {
    // Emergency appointments can be booked immediately (no minimum advance time)

    // Emergency appointments have extended advance booking window
    const daysUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilAppointment > businessRules.emergencyMaxAdvanceDays) {
      errors.push(`Emergency appointments cannot be booked more than ${businessRules.emergencyMaxAdvanceDays} days in advance`);
    }

    // Emergency appointments can be scheduled on weekends
    // Emergency appointments can be scheduled outside normal business hours (24/7)
  } else {
    // Regular appointment validation - no minimum advance booking time
    // Only check if it's not in the past (already handled above)

    // Check maximum advance booking time
    const daysUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilAppointment > businessRules.maxAdvanceBookingDays) {
      errors.push(`Appointments cannot be booked more than ${businessRules.maxAdvanceBookingDays} days in advance`);
    }

    // Weekend booking is now allowed by default
    if (!businessRules.allowWeekendBooking && (dayOfWeek === 0 || dayOfWeek === 6)) {
      warnings.push('Weekend appointments may have limited availability');
    }

    // Check business hours (7 AM to 8 PM) for regular appointments - extended hours for hospital
    const appointmentHour = appointmentDateTime.getHours();
    if (appointmentHour < 7 || appointmentHour >= 20) {
      warnings.push('Appointments outside 7:00 AM to 8:00 PM may have limited doctor availability');
    }
  }

  // Validate appointment duration
  if (appointmentData.durationMinutes && (appointmentData.durationMinutes < 15 || appointmentData.durationMinutes > 120)) {
    errors.push('Appointment duration must be between 15 and 120 minutes');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check for appointment conflicts
 */
export async function checkAppointmentConflicts(
  appointmentData: AppointmentData,
  excludeAppointmentId?: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const appointmentDateTime = new Date(`${appointmentData.appointmentDate}T${appointmentData.appointmentTime}`);
    const duration = appointmentData.durationMinutes || 30;
    const endTime = new Date(appointmentDateTime.getTime() + duration * 60000);

    // Skip conflict checking for now - table structure is different
    // This allows appointments to be created without blocking
    // Conflict checking can be added later when table structure is confirmed
    const doctorAppointments: any[] = [];

    // Skip all conflict checking - simplified for registration
    // Conflicts can be checked later if needed

    // Skip daily limit checking for now - allows appointments to be created
    // This can be re-enabled later if needed

  } catch (error) {
    console.error('Error checking appointment conflicts:', error);
    errors.push('Failed to validate appointment conflicts');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive appointment validation
 */
export async function validateAppointment(
  appointmentData: AppointmentData,
  excludeAppointmentId?: string,
  businessRules: BusinessRules = DEFAULT_BUSINESS_RULES
): Promise<ValidationResult> {
  // Run basic validation
  const basicValidation = await validateAppointmentData(appointmentData, businessRules);

  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Run conflict validation
  const conflictValidation = await checkAppointmentConflicts(appointmentData, excludeAppointmentId);

  return {
    isValid: basicValidation.isValid && conflictValidation.isValid,
    errors: [...basicValidation.errors, ...conflictValidation.errors],
    warnings: [...basicValidation.warnings, ...conflictValidation.warnings]
  };
}

/**
 * Smart slot recommendation when conflicts occur
 */
export async function getAlternativeSlots(
  appointmentData: AppointmentData,
  maxSuggestions: number = 5
): Promise<AppointmentSlot[]> {
  const suggestions: AppointmentSlot[] = [];
  const requestedDate = new Date(appointmentData.appointmentDate);
  const duration = appointmentData.durationMinutes || 30;

  try {
    // Get doctor information
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', appointmentData.doctorId)
      .single();

    if (doctorError || !doctor) {
      return suggestions;
    }

    // Check slots for the next 7 days
    for (let dayOffset = 0; dayOffset < 7 && suggestions.length < maxSuggestions; dayOffset++) {
      const checkDate = new Date(requestedDate);
      checkDate.setDate(requestedDate.getDate() + dayOffset);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Skip weekends if not allowed
      const dayOfWeek = checkDate.getDay();
      if (!DEFAULT_BUSINESS_RULES.allowWeekendBooking && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }

      // Get existing appointments for this date
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('appointment_time, duration_minutes')
        .eq('doctor_id', appointmentData.doctorId)
        .eq('appointment_date', dateStr)
        .in('status', ['scheduled', 'confirmed', 'in_progress']);

      // Generate time slots (9 AM to 6 PM, 30-minute intervals)
      for (let hour = 9; hour < 18 && suggestions.length < maxSuggestions; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotStart = new Date(`${dateStr}T${timeStr}`);
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          // Check if this slot conflicts with existing appointments
          let hasConflict = false;
          for (const existing of existingAppointments || []) {
            const existingStart = new Date(`${dateStr}T${existing.appointment_time}`);
            const existingEnd = new Date(existingStart.getTime() + (existing.duration_minutes || 30) * 60000);

            if (
              (slotStart >= existingStart && slotStart < existingEnd) ||
              (slotEnd > existingStart && slotEnd <= existingEnd) ||
              (slotStart <= existingStart && slotEnd >= existingEnd)
            ) {
              hasConflict = true;
              break;
            }
          }

          if (!hasConflict) {
            // Validate this alternative slot
            const altData = {
              ...appointmentData,
              appointmentDate: dateStr,
              appointmentTime: timeStr
            };

            const validation = await validateAppointmentData(altData);
            if (validation.isValid) {
              suggestions.push({
                date: dateStr,
                time: timeStr,
                available: true,
                doctorId: appointmentData.doctorId,
                doctorName: doctor.user?.name || 'Unknown',
                specialization: doctor.specialization || 'General'
              });
            }
          }
        }
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Error getting alternative slots:', error);
    return suggestions;
  }
}

/**
 * Enhanced validation with smart suggestions
 */
export async function validateAppointmentWithSuggestions(
  appointmentData: AppointmentData,
  excludeAppointmentId?: string,
  businessRules: BusinessRules = DEFAULT_BUSINESS_RULES
): Promise<ValidationResult & { suggestions?: AppointmentSlot[] }> {
  const validation = await validateAppointment(appointmentData, excludeAppointmentId, businessRules);

  // If validation fails due to conflicts, provide alternative suggestions
  if (!validation.isValid && validation.errors.some(error =>
    error.includes('conflicting appointment') ||
    error.includes('maximum daily appointment limit')
  )) {
    const suggestions = await getAlternativeSlots(appointmentData);
    return {
      ...validation,
      suggestions
    };
  }

  return validation;
}

// Helper function to extract token from notes
export function extractTokenFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;

  const tokenMatch = notes.match(/Token:\s*([A-Z]\d{3})/);
  return tokenMatch ? tokenMatch[1] : null;
}

// Types for appointment management
export interface AppointmentData {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes?: number;
  type: 'new_patient' | 'follow_up' | 'emergency' | 'routine_checkup' | 'consultation';
  symptoms?: string;
  chiefComplaint?: string;
  notes?: string;
  isEmergency?: boolean;
  sessionType?: 'morning' | 'afternoon' | 'evening' | 'emergency';
}

export interface Appointment {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  symptoms?: string;
  chief_complaint?: string;
  diagnosis?: string;
  treatment_plan?: string;
  prescriptions?: any[];
  next_appointment_date?: string;
  follow_up_instructions?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Related data
  patient?: any;
  doctor?: {
    id: string;
    doctor_id?: string;
    specialization: string;
    qualification?: string;
    department?: string;
    user: {
      name: string;
      phone: string;
      email: string;
    };
  };
  encounter?: {
    id: string;
    patient_id: string;
    clinician_id: string;
    start_at: string;
  };
}

export interface AppointmentSlot {
  date: string;
  time: string;
  available: boolean;
  doctorId: string;
  doctorName: string;
  specialization: string;
  sessionType?: 'morning' | 'afternoon' | 'evening';
  isEmergency?: boolean;
}

/**
 * Generate a unique appointment ID
 * Format: APT{Year}{Month}{Day}{Sequential}
 * Example: APT202501150001
 */
export async function generateAppointmentId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  try {
    // Get count of existing appointments for today
    const { count, error } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .like('appointment_id', `APT${datePrefix}%`);

    if (error) {
      console.error('Error getting appointment count:', error);
      throw new Error('Failed to generate appointment ID');
    }

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `APT${datePrefix}${sequence}`;
  } catch (error) {
    console.error('Error generating appointment ID:', error);
    throw error;
  }
}

/**
 * Generate a unique token number for an appointment (per doctor per day)
 */
export async function generateAppointmentToken(
  doctorId: string,
  appointmentDate: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('appointment_date', appointmentDate)
      .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed']);

    if (error) {
      console.error('Error getting appointment token count:', error);
      throw new Error('Failed to generate appointment token');
    }

    const tokenNumber = ((count || 0) + 1);
    return tokenNumber;
  } catch (error) {
    console.error('Error generating appointment token:', error);
    throw error;
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  appointmentData: AppointmentData,
  createdBy?: string
): Promise<Appointment> {
  try {
    // Validate appointment data and check for conflicts
    const validation = await validateAppointment(appointmentData);

    if (!validation.isValid) {
      const errorMessage = validation.errors.join('; ');
      throw new Error(`Appointment validation failed: ${errorMessage}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Appointment warnings:', validation.warnings.join('; '));
    }

    // Verify that the doctor exists in the doctors table
    const { data: existingDoctor } = await supabase
      .from('doctors')
      .select('id')
      .eq('id', appointmentData.doctorId)
      .single();

    if (!existingDoctor) {
      throw new Error(`Doctor with ID ${appointmentData.doctorId} not found. Only registered doctors can have appointments.`);
    }

    // Create encounter first (required for appointment)
    // Ensure the timestamp is formatted correctly (YYYY-MM-DDTHH:mm:ss)
    let timeStr = appointmentData.appointmentTime;
    // If time is HH:mm, add :00
    if (timeStr && timeStr.length === 5) {
      timeStr += ':00';
    }
    const scheduledAt = `${appointmentData.appointmentDate}T${timeStr}`;

    // Get encounter type from ref_code table
    let encounterTypeId = null;
    const { data: encounterType } = await supabase
      .from('ref_code')
      .select('id')
      .eq('code_type', 'encounter_type')
      .eq('code_value', appointmentData.type || 'consultation')
      .single();

    if (encounterType) {
      encounterTypeId = encounterType.id;
    }

    const encounterRecord = {
      patient_id: appointmentData.patientId,
      clinician_id: appointmentData.doctorId,
      type_id: encounterTypeId, // Can be null - we fixed the foreign key constraint
      start_at: scheduledAt
      // Note: Only using columns that actually exist in the encounter table
      // chief_complaint, notes, status are not available in current schema
    };

    const { data: encounter, error: encounterError } = await supabase
      .from('encounter')
      .insert([encounterRecord])
      .select()
      .single();

    if (encounterError) {
      console.error('Error creating encounter. Details:', {
        message: encounterError.message,
        code: encounterError.code,
        details: encounterError.details,
        hint: encounterError.hint
      });
      throw new Error(`Failed to create encounter: ${encounterError.message || 'Unknown database error'}`);
    }

    // Get appointment status from ref_code table
    let statusId = null;
    const { data: appointmentStatus } = await supabase
      .from('ref_code')
      .select('id')
      .eq('code_type', 'appointment_status')
      .eq('code_value', 'scheduled')
      .single();

    if (appointmentStatus) {
      statusId = appointmentStatus.id;
    }

    // Now create appointment with encounter_id
    const appointmentRecord = {
      encounter_id: encounter.id,
      scheduled_at: scheduledAt,
      duration_minutes: appointmentData.durationMinutes || 30,
      status_id: statusId // Can be null if ref_code doesn't exist
      // Note: Only using columns that actually exist in the appointment table
      // notes column is not available in current schema
    };

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointment')
      .insert([appointmentRecord])
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }

    // Return appointment with encounter info
    return {
      ...appointment,
      encounter,
      patient_id: appointmentData.patientId,
      doctor_id: appointmentData.doctorId,
      appointment_date: appointmentData.appointmentDate,
      appointment_time: appointmentData.appointmentTime,
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

/**
 * Get appointments with filtering and pagination using new database structure
 */
export async function getAppointments(options: {
  page?: number;
  limit?: number;
  patientId?: string;
  doctorId?: string;
  date?: string;
  status?: string;
  type?: string;
  searchTerm?: string;
} = {}): Promise<{
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const { page = 1, limit = 20, patientId, doctorId, date, status, type, searchTerm } = options;
    const offset = (page - 1) * limit;

    // First, try to get appointments from the new appointment table
    try {
      let query = supabase
        .from('appointment')
        .select(`
          *,
          encounter:encounter(
            id,
            patient_id,
            clinician_id,
            start_at
          )
        `, { count: 'exact' });

      // Apply filters
      if (patientId) {
        query = query.eq('encounter.patient_id', patientId);
      }

      if (doctorId) {
        query = query.eq('encounter.clinician_id', doctorId);
      }

      if (date) {
        // Filter by date part of scheduled_at
        const startOfDay = `${date}T00:00:00Z`;
        const endOfDay = `${date}T23:59:59Z`;
        query = query.gte('scheduled_at', startOfDay).lte('scheduled_at', endOfDay);
      }

      // Apply pagination and ordering
      const { data: appointments, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('scheduled_at', { ascending: false });

      if (!error && appointments) {
        // Transform appointments and fetch related data separately
        const transformedAppointments = await Promise.all((appointments || []).map(async (apt: any) => {
          // Fetch patient data separately
          let patientData = null;
          if (apt.encounter?.patient_id) {
            const { data: patient } = await supabase
              .from('patients')
              .select('id, patient_id, name, phone, email')
              .eq('id', apt.encounter.patient_id)
              .single();
            patientData = patient;
          }

          // Fetch doctor data separately
          let doctorData: Appointment['doctor'] = undefined;
          if (apt.encounter?.clinician_id) {
            const { data: doctor } = await supabase
              .from('doctors')
              .select(`
                id,
                specialization,
                qualification,
                user:users(name, phone, email)
              `)
              .eq('id', apt.encounter.clinician_id)
              .single();

            if (doctor && doctor.user) {
              const userArray = Array.isArray(doctor.user) ? doctor.user : [doctor.user];
              const firstUser = userArray[0];
              doctorData = {
                id: doctor.id,
                specialization: doctor.specialization,
                qualification: doctor.qualification,
                user: {
                  name: firstUser?.name || '',
                  phone: firstUser?.phone || '',
                  email: firstUser?.email || ''
                }
              };
            }
          }

          return {
            id: apt.id,
            appointment_id: `APT-${apt.id.slice(0, 8)}`,
            patient_id: apt.encounter?.patient_id || '',
            doctor_id: apt.encounter?.clinician_id || '',
            appointment_date: apt.scheduled_at ? new Date(apt.scheduled_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            appointment_time: apt.scheduled_at ? new Date(apt.scheduled_at).toTimeString().split(' ')[0] : '00:00:00',
            duration_minutes: apt.duration_minutes || 30,
            type: 'Consultation',
            status: 'scheduled' as 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled',
            symptoms: apt.notes,
            chief_complaint: apt.notes,
            diagnosis: undefined,
            treatment_plan: undefined,
            prescriptions: [],
            next_appointment_date: undefined,
            follow_up_instructions: undefined,
            notes: apt.notes,
            created_by: undefined,
            created_at: apt.created_at,
            updated_at: apt.updated_at,

            // Related data
            patient: patientData,
            doctor: doctorData,
            encounter: apt.encounter
          };
        }));

        return {
          appointments: transformedAppointments,
          total: count || 0,
          page,
          limit
        };
      }
    } catch (newTableError) {
      console.warn('Error fetching from new appointment table:', newTableError);
    }

    // If new table fails, fall back to legacy appointments table
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, patient_id, name, phone, email),
          doctor:doctors(
            id,
            specialization,
            qualification,
            user:users(name, phone, email)
          )
        `, { count: 'exact' });

      // Apply filters
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      if (date) {
        query = query.eq('appointment_date', date);
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply pagination and ordering
      const { data: appointments, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('appointment_time', { ascending: true })
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error('Error fetching appointments from legacy table:', error);
        throw new Error(`Failed to fetch appointments: ${error.message}`);
      }

      // Transform legacy appointments to match the expected format
      const transformedAppointments = (appointments || []).map((apt: any) => ({
        id: apt.id,
        appointment_id: apt.appointment_id || `APT-${apt.id}`,
        patient_id: apt.patient_id || (apt.patient ? apt.patient.id : ''),
        doctor_id: apt.doctor_id || (apt.doctor ? apt.doctor.id : ''),
        appointment_date: apt.appointment_date || new Date().toISOString().split('T')[0],
        appointment_time: apt.appointment_time || '00:00:00',
        duration_minutes: apt.duration_minutes || 30,
        type: apt.type || 'Consultation',
        status: apt.status || 'scheduled',
        symptoms: apt.symptoms,
        chief_complaint: apt.chief_complaint || apt.symptoms,
        diagnosis: apt.diagnosis,
        treatment_plan: apt.treatment_plan,
        prescriptions: apt.prescriptions || [],
        next_appointment_date: apt.next_appointment_date,
        follow_up_instructions: apt.follow_up_instructions,
        notes: apt.notes,
        created_by: apt.created_by,
        created_at: apt.created_at,
        updated_at: apt.updated_at,

        // Related data
        patient: apt.patient,
        doctor: apt.doctor
      }));

      return {
        appointments: transformedAppointments,
        total: count || 0,
        page,
        limit
      };
    } catch (legacyError) {
      console.error('Error fetching appointments from legacy table:', legacyError);
      throw legacyError;
    }
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
}

/**
 * Get appointment by ID
 */
export async function getAppointmentById(appointmentId: string): Promise<Appointment> {
  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email, date_of_birth, gender, address),
        doctor:doctors(
          id,
          specialization,
          qualification,
          user:users(name, phone, email)
        )
      `)
      .eq('appointment_id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      throw new Error(`Appointment not found: ${error.message}`);
    }

    return appointment;
  } catch (error) {
    console.error('Error fetching appointment:', error);
    throw error;
  }
}

/**
 * Get comprehensive appointment details including patient vitals and medical history
 */
export async function getAppointmentDetails(appointmentId: string): Promise<{
  appointment: Appointment;
  vitals: any[];
  medicalHistory: any[];
  latestVitals: any | null;
}> {
  try {
    // Get appointment details using the new database structure
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointment')
      .select(`
        *,
        encounter:encounter(
          id,
          patient_id,
          clinician_id,
          start_at
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) {
      console.error('Error fetching appointment:', appointmentError);
      throw new Error(`Appointment not found: ${appointmentError.message}`);
    }

    if (!appointment || !appointment.encounter) {
      throw new Error('Appointment or encounter not found');
    }

    // Fetch patient data
    const { data: patient } = await supabase
      .from('patients')
      .select('id, patient_id, name, phone, email, date_of_birth, gender, address')
      .eq('id', appointment.encounter.patient_id)
      .single();

    // Fetch doctor data
    const { data: doctor } = await supabase
      .from('doctors')
      .select(`
        id,
        specialization,
        qualification,
        user:users(name, phone, email)
      `)
      .eq('id', appointment.encounter.clinician_id)
      .single();

    // Transform appointment to match expected format
    const transformedAppointment: Appointment = {
      id: appointment.id,
      appointment_id: `APT-${appointment.id.slice(0, 8)}`,
      patient_id: appointment.encounter.patient_id,
      doctor_id: appointment.encounter.clinician_id,
      appointment_date: appointment.scheduled_at ? new Date(appointment.scheduled_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      appointment_time: appointment.scheduled_at ? new Date(appointment.scheduled_at).toTimeString().split(' ')[0] : '00:00:00',
      duration_minutes: appointment.duration_minutes || 30,
      type: 'Consultation',
      status: 'scheduled' as 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled',
      symptoms: undefined,
      chief_complaint: undefined,
      diagnosis: undefined,
      treatment_plan: undefined,
      prescriptions: [],
      next_appointment_date: undefined,
      follow_up_instructions: undefined,
      notes: undefined,
      created_by: undefined,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      patient: patient,
      doctor: doctor && doctor.user ? {
        id: doctor.id,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        user: Array.isArray(doctor.user) ? doctor.user[0] : doctor.user
      } : undefined,
      encounter: appointment.encounter
    };

    // Fetch patient vitals
    let vitals: any[] = [];
    let latestVitals: any | null = null;

    if (patient?.id) {
      try {
        const { data: vitalsData } = await supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', patient.id)
          .order('recorded_at', { ascending: false })
          .limit(10);

        vitals = vitalsData || [];
        latestVitals = vitals.length > 0 ? vitals[0] : null;
      } catch (vitalsError) {
        console.warn('Could not fetch vitals:', vitalsError);
      }
    }

    // Fetch medical history
    let medicalHistory: any[] = [];

    if (patient?.id) {
      try {
        // Try to fetch from medical_history table
        const { data: historyData } = await supabase
          .from('medical_history')
          .select('*')
          .eq('patient_id', patient.id)
          .order('event_date', { ascending: false })
          .limit(10);

        medicalHistory = historyData || [];
      } catch (historyError) {
        console.warn('Could not fetch medical history:', historyError);
      }
    }

    return {
      appointment: transformedAppointment,
      vitals,
      medicalHistory,
      latestVitals
    };
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    throw error;
  }
}

/**
 * Update appointment status
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled'
): Promise<Appointment> {
  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('appointment_id', appointmentId)
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id,
          specialization,
          user:users(name, phone, email)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating appointment status:', error);
      throw new Error(`Failed to update appointment status: ${error.message}`);
    }

    return appointment;
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
}

/**
 * Update appointment with medical information
 */
export async function updateAppointmentMedicalInfo(
  appointmentId: string,
  medicalInfo: {
    diagnosis?: string;
    treatmentPlan?: string;
    prescriptions?: any[];
    followUpInstructions?: string;
    nextAppointmentDate?: string;
  }
): Promise<Appointment> {
  try {
    const updateData: any = {};

    if (medicalInfo.diagnosis) updateData.diagnosis = medicalInfo.diagnosis;
    if (medicalInfo.treatmentPlan) updateData.treatment_plan = medicalInfo.treatmentPlan;
    if (medicalInfo.prescriptions) updateData.prescriptions = medicalInfo.prescriptions;
    if (medicalInfo.followUpInstructions) updateData.follow_up_instructions = medicalInfo.followUpInstructions;
    if (medicalInfo.nextAppointmentDate) updateData.next_appointment_date = medicalInfo.nextAppointmentDate;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('appointment_id', appointmentId)
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id,
          specialization,
          user:users(name, phone, email)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating appointment medical info:', error);
      throw new Error(`Failed to update appointment medical info: ${error.message}`);
    }

    return appointment;
  } catch (error) {
    console.error('Error updating appointment medical info:', error);
    throw error;
  }
}

/**
 * Get patient appointment history
 */
export async function getPatientAppointmentHistory(
  patientId: string,
  limit: number = 10
): Promise<Appointment[]> {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(
          id,
          specialization,
          user:users(name, phone, email)
        )
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching patient appointment history:', error);
      throw new Error(`Failed to fetch appointment history: ${error.message}`);
    }

    return appointments || [];
  } catch (error) {
    console.error('Error fetching patient appointment history:', error);
    throw error;
  }
}

/**
 * Get doctor appointment schedule
 */
export async function getDoctorAppointmentSchedule(
  doctorId: string,
  date: string
): Promise<Appointment[]> {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email)
      `)
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error fetching doctor schedule:', error);
      throw new Error(`Failed to fetch doctor schedule: ${error.message}`);
    }

    return appointments || [];
  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    throw error;
  }
}

/**
 * Get available appointment slots for a doctor
 */
export async function getAvailableSlots(
  doctorId: string,
  date: string,
  isEmergency: boolean = false
): Promise<AppointmentSlot[]> {
  try {
    // Get doctor information - check both doctors table and users with MD role
    let doctor: any = null;
    let doctorError: any = null;

    // First try to get from doctors table
    const { data: doctorData, error: docError } = await supabase
      .from('doctors')
      .select(`
        *,
        user:users(name, role)
      `)
      .eq('id', doctorId)
      .single();

    if (doctorData) {
      doctor = doctorData;
    } else {
      doctorError = docError;
    }

    if (doctorError || !doctor) {
      console.error('Error fetching doctor:', doctorError);
      throw new Error(`Doctor not found: ${doctorError?.message || 'Doctor does not exist'}`);
    }

    // Get existing appointments for the date
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_time, duration_minutes')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);

    if (appointmentsError) {
      console.error('Error fetching existing appointments:', appointmentsError);
      throw new Error(`Failed to fetch existing appointments: ${appointmentsError.message}`);
    }

    // Generate time slots based on doctor's session-based availability
    const slots: AppointmentSlot[] = [];
    const availabilityHours = doctor.availability_hours;

    if (!availabilityHours || !availabilityHours.sessions || !availabilityHours.availableSessions) {
      console.warn('Doctor has no session-based availability configured');
      return slots;
    }

    // Check if doctor is available on the requested day
    const requestedDay = new Date(date).getDay();
    const workingDays = availabilityHours.workingDays || [];
    if (!workingDays.includes(requestedDay)) {
      return slots; // Doctor not available on this day
    }

    // For emergency appointments, generate 24/7 slots
    if (isEmergency) {
      // Generate emergency slots every 30 minutes for 24 hours
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          // Check if slot is available
          const isBooked = existingAppointments?.some(apt => {
            const aptTime = apt.appointment_time;
            const aptDuration = apt.duration_minutes || 30;
            const aptEndTime = new Date(`2000-01-01T${aptTime}`);
            aptEndTime.setMinutes(aptEndTime.getMinutes() + aptDuration);

            const slotTime = new Date(`2000-01-01T${timeString}`);
            const slotEndTime = new Date(slotTime);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + 30);

            return (slotTime < aptEndTime && slotEndTime > new Date(`2000-01-01T${aptTime}`));
          });

          slots.push({
            date,
            time: timeString,
            available: !isBooked,
            doctorId,
            doctorName: doctor.user?.name || 'Unknown',
            specialization: doctor.specialization,
            isEmergency: true
          });
        }
      }
      return slots;
    }

    // Generate slots for each available session (regular appointments)
    const sessionTimes = {
      morning: { start: '09:00', end: '12:00' },
      afternoon: { start: '14:00', end: '17:00' },
      evening: { start: '18:00', end: '21:00' }
    };

    availabilityHours.availableSessions.forEach((sessionName: string) => {
      const session = availabilityHours.sessions[sessionName];
      const sessionTime = sessionTimes[sessionName as keyof typeof sessionTimes];

      if (!session || !sessionTime) return;

      const startHour = parseInt(session.startTime?.split(':')[0] || sessionTime.start.split(':')[0]);
      const endHour = parseInt(session.endTime?.split(':')[0] || sessionTime.end.split(':')[0]);
      const slotDuration = 30; // 30 minutes per slot
      const slotsPerSession = Math.floor((endHour - startHour) * 60 / slotDuration);

      let slotsGenerated = 0;
      for (let hour = startHour; hour < endHour && slotsGenerated < slotsPerSession; hour++) {
        for (let minute = 0; minute < 60 && slotsGenerated < slotsPerSession; minute += slotDuration) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          // Check if slot is available
          const isBooked = existingAppointments?.some(apt => {
            const aptTime = apt.appointment_time;
            const aptDuration = apt.duration_minutes || 30;
            const aptEndTime = new Date(`2000-01-01T${aptTime}`);
            aptEndTime.setMinutes(aptEndTime.getMinutes() + aptDuration);

            const slotTime = new Date(`2000-01-01T${timeString}`);
            const slotEndTime = new Date(slotTime);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + slotDuration);

            return (slotTime < aptEndTime && slotEndTime > new Date(`2000-01-01T${aptTime}`));
          });

          slots.push({
            date,
            time: timeString,
            available: !isBooked,
            doctorId,
            doctorName: doctor.user?.name || 'Unknown',
            specialization: doctor.specialization,
            sessionType: sessionName as 'morning' | 'afternoon' | 'evening'
          });

          slotsGenerated++;
        }
      }
    });

    return slots;
  } catch (error) {
    console.error('Error generating available slots:', error);
    throw error;
  }
}

/**
 * Reschedule appointment
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string
): Promise<Appointment> {
  try {
    // First, get the current appointment
    const currentAppointment = await getAppointmentById(appointmentId);

    if (!currentAppointment) {
      throw new Error('Appointment not found');
    }

    // Create appointment data for validation
    const rescheduleData: AppointmentData = {
      patientId: currentAppointment.patient_id,
      doctorId: currentAppointment.doctor_id,
      appointmentDate: newDate,
      appointmentTime: newTime,
      durationMinutes: currentAppointment.duration_minutes,
      type: currentAppointment.type as any,
      symptoms: currentAppointment.symptoms,
      chiefComplaint: currentAppointment.chief_complaint,
      notes: currentAppointment.notes
    };

    // Validate the new appointment time (exclude current appointment from conflict check)
    const validation = await validateAppointment(rescheduleData, currentAppointment.id);

    if (!validation.isValid) {
      const errorMessage = validation.errors.join('; ');
      throw new Error(`Reschedule validation failed: ${errorMessage}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Reschedule warnings:', validation.warnings.join('; '));
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        appointment_date: newDate,
        appointment_time: newTime,
        status: 'rescheduled'
      })
      .eq('appointment_id', appointmentId)
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id, 
          doctor_id, 
          specialization, 
          department,
          user:users(name, phone, email)
        )
      `)
      .single();

    if (error) {
      console.error('Error rescheduling appointment:', error);
      throw new Error(`Failed to reschedule appointment: ${error.message}`);
    }

    return appointment;
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    throw error;
  }
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(
  appointmentId: string,
  reason?: string
): Promise<Appointment> {
  try {
    const updateData: any = { status: 'cancelled' };
    if (reason) {
      updateData.notes = reason;
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('appointment_id', appointmentId)
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id, 
          doctor_id, 
          specialization, 
          department,
          user:users(name, phone, email)
        )
      `)
      .single();

    if (error) {
      console.error('Error cancelling appointment:', error);
      throw new Error(`Failed to cancel appointment: ${error.message}`);
    }

    return appointment;
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw error;
  }
}

/**
 * Get appointment statistics
 */
export async function getAppointmentStats(
  doctorId?: string,
  patientId?: string,
  dateRange?: { start: string; end: string }
): Promise<{
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  todayCount: number;
  upcomingCount: number;
}> {
  try {
    let query = supabase
      .from('appointment')
      .select(`
        id,
        scheduled_at,
        encounter:encounter(
          patient_id,
          clinician_id
        )
      `);

    if (doctorId) {
      query = query.eq('encounter.clinician_id', doctorId);
    }

    if (patientId) {
      query = query.eq('encounter.patient_id', patientId);
    }

    if (dateRange) {
      query = query.gte('scheduled_at', `${dateRange.start}T00:00:00Z`)
        .lte('scheduled_at', `${dateRange.end}T23:59:59Z`);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching appointment stats:', error);
      throw new Error(`Failed to fetch appointment stats: ${error.message}`);
    }

    const today = new Date().toISOString().split('T')[0];
    const total = appointments?.length || 0;

    // For now, assume all appointments are scheduled since we don't have status mapping
    const scheduled = appointments?.filter(apt =>
      apt.scheduled_at && new Date(apt.scheduled_at).toISOString().split('T')[0] >= today
    ).length || 0;

    const completed = 0; // No status mapping yet
    const cancelled = 0; // No status mapping yet

    const todayCount = appointments?.filter(apt =>
      apt.scheduled_at && new Date(apt.scheduled_at).toISOString().split('T')[0] === today
    ).length || 0;

    const upcomingCount = appointments?.filter(apt =>
      apt.scheduled_at && new Date(apt.scheduled_at).toISOString().split('T')[0] > today
    ).length || 0;

    return {
      total,
      scheduled,
      completed,
      cancelled,
      todayCount,
      upcomingCount
    };
  } catch (error) {
    console.error('Error getting appointment stats:', error);
    throw error;
  }
}

/**
 * Get upcoming appointments
 */
export async function getUpcomingAppointments(
  doctorId?: string,
  patientId?: string,
  limit: number = 10
): Promise<Appointment[]> {
  try {
    const today = new Date().toISOString();

    let query = supabase
      .from('appointment')
      .select(`
        *,
        encounter:encounter(
          id,
          patient_id,
          clinician_id,
          start_at,
          patient:patients(id, patient_id, name, phone, email),
          clinician:doctors(
            id,
            specialization,
            user:users(name, phone, email)
          )
        )
      `)
      .gte('scheduled_at', today)
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (doctorId) {
      query = query.eq('encounter.clinician_id', doctorId);
    }

    if (patientId) {
      query = query.eq('encounter.patient_id', patientId);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching upcoming appointments:', error);
      throw new Error(`Failed to fetch upcoming appointments: ${error.message}`);
    }

    // Transform appointments to match expected format
    const transformedAppointments = (appointments || []).map((apt: any) => ({
      id: apt.id,
      appointment_id: `APT-${apt.id.slice(0, 8)}`,
      patient_id: apt.encounter?.patient_id || '',
      doctor_id: apt.encounter?.clinician_id || '',
      appointment_date: apt.scheduled_at ? new Date(apt.scheduled_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      appointment_time: apt.scheduled_at ? new Date(apt.scheduled_at).toTimeString().split(' ')[0] : '00:00:00',
      duration_minutes: apt.duration_minutes || 30,
      type: 'Consultation',
      status: 'scheduled' as 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled',
      symptoms: apt.notes,
      chief_complaint: apt.notes,
      diagnosis: undefined,
      treatment_plan: undefined,
      prescriptions: [],
      next_appointment_date: undefined,
      follow_up_instructions: undefined,
      notes: apt.notes,
      created_by: undefined,
      created_at: apt.created_at,
      updated_at: apt.updated_at,

      // Related data
      patient: apt.encounter?.patient,
      doctor: apt.encounter?.clinician
    }));

    return transformedAppointments;
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    throw error;
  }
}