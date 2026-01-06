import { supabase } from './supabase';

// Types for doctor management
export interface SessionTiming {
  startTime: string;
  endTime: string;
  maxPatients: number;
}

export interface DoctorRegistrationData {
  doctorId: string;
  licenseNumber: string;
  specialization: string;
  department: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;

  // User information
  name: string;
  email: string;
  phone: string;
  address: string;

  // Schedule information (legacy - for compatibility)
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];

  // Session-based availability
  sessions: {
    morning: SessionTiming;
    afternoon: SessionTiming;
    evening: SessionTiming;
  };
  availableSessions: string[]; // ['morning', 'afternoon', 'evening']

  // Room information
  roomNumber: string;
  floorNumber: number;

  // Status
  emergencyAvailable: boolean;
}

export interface Doctor {
  id: string;
  user_id: string;
  license_number: string;
  specialization: string;
  qualification: string;
  years_of_experience: number;
  consultation_fee: number;
  availability_hours: any; // jsonb field
  room_number: string;
  max_patients_per_day: number;
  status: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  // Computed fields for compatibility
  doctor_id?: string;
  department?: string;
  experience_years?: number;
  working_hours_start?: string;
  working_hours_end?: string;
  working_days?: number[];
  floor_number?: number;
  availability_status?: string;
  emergency_available?: boolean;
}

/**
 * Generate a unique doctor ID
 * Format: DR{Year}{Month}{Sequential}
 * Example: DR2025010001
 */
export async function generateDoctorId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  try {
    // Get count of existing doctors for this month
    const { count, error } = await supabase
      .from('doctors')
      .select('id', { count: 'exact', head: true })
      .like('license_number', `DR${year}${month}%`);

    if (error) {
      console.error('Error getting doctor count:', error);
      throw new Error('Failed to generate doctor ID');
    }

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `DR${year}${month}${sequence}`;
  } catch (error) {
    console.error('Error generating doctor ID:', error);
    throw error;
  }
}

/**
 * Generate a unique employee ID to avoid conflicts
 */
export async function generateEmployeeId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  try {
    // Get count of existing users for this month
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .like('employee_id', `EMP${year}${month}%`);

    if (error) {
      console.error('Error getting employee count:', error);
      throw new Error('Failed to generate employee ID');
    }

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `EMP${year}${month}${sequence}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    throw error;
  }
}

/**
 * Create a new doctor record
 */
export async function createDoctor(doctorData: DoctorRegistrationData): Promise<Doctor> {
  try {
    // Generate unique IDs
    const uniqueDoctorId = await generateDoctorId();
    const uniqueEmployeeId = await generateEmployeeId();

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, auth_id')
      .eq('email', doctorData.email)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      throw new Error(`Failed to check existing user: ${checkError.message}`);
    }

    let authUserId = null;
    let user = null;

    if (existingUser) {
      // User already exists, use existing auth_id
      console.log('User already exists, using existing record');
      authUserId = existingUser.auth_id;
      user = existingUser;
    } else {
      // Try to create new auth user
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: doctorData.email,
        password: 'Doctor@123', // Default password, should be changed on first login
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: 'doctor',
            name: doctorData.name,
            email_confirm: true
          }
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered') || authError.message.includes('user_already_exists')) {
          // User exists in auth but not in our users table - try to get the existing auth user
          console.log('Auth user already exists, attempting to link to existing user record');
          
          // Try to sign in to get the existing auth user ID
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: doctorData.email,
            password: 'Doctor@123'
          });
          
          if (!signInError && signInData.user) {
            authUserId = signInData.user.id;
            console.log('Successfully linked to existing auth user');
          } else {
            // If we can't sign in, we need to handle this differently
            // For now, we'll throw an error with a more helpful message
            throw new Error(`Doctor with email ${doctorData.email} already exists in the system. Please use a different email or contact the administrator to reset the password.`);
          }
        } else {
          console.error('Error creating doctor auth user:', authError);
          throw new Error(`Failed to create doctor authentication: ${authError.message}`);
        }
      } else {
        authUserId = authUser.user?.id;
      }

      if (authUserId) {
        // Create user record with unique employee ID
        const userData = {
          auth_id: authUserId,
          employee_id: uniqueEmployeeId,
          name: doctorData.name,
          email: doctorData.email,
          phone: doctorData.phone,
          address: doctorData.address,
          role: 'doctor',
          status: 'active',
          permissions: {
            view_patients: true,
            create_appointments: true,
            update_medical_records: true,
            prescribe_medications: true
          }
        };

        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (userError) {
          console.error('Error creating user record:', userError);
          throw new Error(`Failed to create user record: ${userError.message}`);
        }

        user = newUser;
      } else {
        throw new Error('Failed to create or retrieve authentication user');
      }
    }

    // Prepare session-based availability data
    const availabilityHours = {
      sessions: doctorData.sessions,
      availableSessions: doctorData.availableSessions,
      workingDays: doctorData.workingDays
    };

    // Create doctor record with unique doctor ID
    const doctorRecord = {
      user_id: user.id,
      license_number: uniqueDoctorId, // Use generated unique doctor ID
      specialization: doctorData.specialization,
      qualification: doctorData.qualification,
      years_of_experience: doctorData.experienceYears,
      consultation_fee: doctorData.consultationFee,
      room_number: doctorData.roomNumber,
      availability_hours: {
        sessions: doctorData.sessions,
        availableSessions: doctorData.availableSessions,
        workingDays: doctorData.workingDays,
        emergencyAvailable: doctorData.emergencyAvailable,
        floorNumber: doctorData.floorNumber,
        workingHoursStart: doctorData.workingHoursStart,
        workingHoursEnd: doctorData.workingHoursEnd,
        department: doctorData.department
      },
      status: 'active'
    };

    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .insert([doctorRecord])
      .select(`
        *,
        user:users(id, name, email, phone, address)
      `)
      .single();

    if (doctorError) {
      console.error('Error creating doctor record:', doctorError);
      throw new Error(`Failed to create doctor record: ${doctorError.message}`);
    }

    return doctor;
  } catch (error) {
    console.error('Error creating doctor:', error);
    throw error;
  }
}

/**
 * Get all doctors with pagination and filtering
 */
export async function getAllDoctors(options: {
  page?: number;
  limit?: number;
  specialization?: string;
  department?: string;
  availabilityStatus?: string;
  searchTerm?: string;
  includeMD?: boolean;
} = {}): Promise<{
  doctors: Doctor[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const { page = 1, limit = 20, specialization, department, availabilityStatus, searchTerm, includeMD = false } = options;
    const offset = (page - 1) * limit;

    // Fetch regular doctors
    let query = supabase
      .from('doctors')
      .select(`
        *,
        user:users(id, name, email, phone, address)
      `, { count: 'exact' });

    // Apply filters for regular doctors
    if (specialization) {
      query = query.eq('specialization', specialization);
    }

    if (department) {
      // Map department to specialization since we don't have department field
      const departmentToSpecialization = getSpecializationFromDepartment(department);
      if (departmentToSpecialization) {
        query = query.eq('specialization', departmentToSpecialization);
      }
    }

    if (availabilityStatus) {
      query = query.eq('status', 'active'); // Use status field instead
    }

    if (searchTerm) {
      query = query.or(`
        license_number.ilike.%${searchTerm}%,
        specialization.ilike.%${searchTerm}%
      `);
    }

    // Get regular doctors
    const { data: doctors, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    let allDoctors = doctors || [];
    let totalCount = count || 0;

    // MD users are no longer included in doctor listings
    // This functionality has been removed as per system requirements

    if (error) {
      console.error('Error fetching doctors:', error);
      throw new Error(`Failed to fetch doctors: ${error.message}`);
    }

    // Add computed fields for compatibility
    const enhancedDoctors = allDoctors?.map(doctor => ({
      ...doctor,
      doctor_id: doctor.license_number, // Use license_number as doctor_id
      department: getSpecializationDepartment(doctor.specialization),
      experience_years: doctor.years_of_experience,
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      working_days: [1, 2, 3, 4, 5, 6],
      floor_number: 1,
      availability_status: 'available',
      emergency_available: false
    })) || [];

    return {
      doctors: enhancedDoctors,
      total: totalCount,
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
}

/**
 * Get all doctors (simple version without pagination)
 */
export async function getAllDoctorsSimple(): Promise<Doctor[]> {
  try {
    // Fetch regular doctors
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select(`
        *,
        user:users(
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching doctors:', error);
      throw new Error(`Failed to fetch doctors: ${error.message}`);
    }

    let allDoctors = doctors || [];

    // MD users are no longer included in doctor listings
    // This functionality has been removed as per system requirements

    // Add computed fields for compatibility
    const enhancedDoctors = allDoctors?.map(doctor => ({
      ...doctor,
      doctor_id: doctor.license_number, // Use license_number as doctor_id
      department: getSpecializationDepartment(doctor.specialization),
      experience_years: doctor.years_of_experience,
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      working_days: [1, 2, 3, 4, 5, 6],
      floor_number: 1,
      availability_status: 'available',
      emergency_available: false
    })) || [];

    return enhancedDoctors;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
}

// Helper function to map specialization to department
function getSpecializationDepartment(specialization: string): string {
  const specializationToDepartment: Record<string, string> = {
    'Cardiology': 'Cardiology',
    'Pediatrics': 'Pediatrics',
    'Orthopedics': 'Orthopedics',
    'Neurology': 'Neurology',
    'Dermatology': 'Dermatology',
    'Gynecology': 'Obstetrics & Gynecology',
    'Psychiatry': 'Psychiatry',
    'Radiology': 'Radiology',
    'Anesthesiology': 'Anesthesiology',
    'Emergency Medicine': 'Emergency',
    'Internal Medicine': 'Internal Medicine',
    'Surgery': 'Surgery',
    'Oncology': 'Oncology',
    'Ophthalmology': 'Ophthalmology',
    'ENT': 'ENT (Ear, Nose & Throat)',
    'Urology': 'Urology',
    'Gastroenterology': 'Gastroenterology',
    'Endocrinology': 'Endocrinology',
    'Nephrology': 'Nephrology',
    'Pulmonology': 'Pulmonology',
    'Rheumatology': 'Rheumatology',
    'Hematology': 'Hematology',
    'Infectious Disease': 'Infectious Disease',
    'Pathology': 'Pathology',
    'Physical Medicine': 'Physical Medicine & Rehabilitation',
    'Plastic Surgery': 'Plastic Surgery',
    'Vascular Surgery': 'Vascular Surgery',
    'Thoracic Surgery': 'Thoracic Surgery',
    'Neurosurgery': 'Neurosurgery',
    'Dental': 'Dental',
    'Physiotherapy': 'Physiotherapy',
    'Nutrition': 'Nutrition & Dietetics',
    'Other': 'Other'
  };
  return specializationToDepartment[specialization] || specialization;
}

// Helper function to map department back to specialization for filtering
function getSpecializationFromDepartment(department: string): string | null {
  const departmentToSpecialization: Record<string, string> = {
    'Cardiology': 'Cardiology',
    'Pediatrics': 'Pediatrics',
    'Orthopedics': 'Orthopedics',
    'Neurology': 'Neurology',
    'Dermatology': 'Dermatology',
    'Obstetrics & Gynecology': 'Gynecology',
    'Psychiatry': 'Psychiatry',
    'Radiology': 'Radiology',
    'Anesthesiology': 'Anesthesiology',
    'Emergency': 'Emergency Medicine',
    'Internal Medicine': 'Internal Medicine',
    'Surgery': 'Surgery'
  };
  return departmentToSpecialization[department] || null;
}

/**
 * Get doctor by ID
 */
export async function getDoctorById(doctorId: string): Promise<Doctor> {
  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select(`
        *,
        user:users(id, name, email, phone, address)
      `)
      .eq('license_number', doctorId) // Use license_number since doctor_id doesn't exist
      .single();

    if (error) {
      console.error('Error fetching doctor:', error);
      throw new Error(`Doctor not found: ${error.message}`);
    }

    // Add computed fields for compatibility
    const enhancedDoctor = {
      ...doctor,
      doctor_id: doctor.license_number,
      department: getSpecializationDepartment(doctor.specialization),
      experience_years: doctor.years_of_experience,
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      working_days: [1, 2, 3, 4, 5, 6],
      floor_number: 1,
      availability_status: 'available',
      emergency_available: false
    };

    return enhancedDoctor;
  } catch (error) {
    console.error('Error fetching doctor:', error);
    throw error;
  }
}

/**
 * Update doctor availability status
 */
export async function updateDoctorAvailability(
  doctorId: string,
  availabilityStatus: string
): Promise<Doctor> {
  try {
    // Update status field instead of availability_status
    const { data: doctor, error } = await supabase
      .from('doctors')
      .update({ status: availabilityStatus === 'available' ? 'active' : 'inactive' })
      .eq('id', doctorId) // Use id instead of license_number
      .select(`
        *,
        user:users(id, name, email, phone, address)
      `)
      .single();

    if (error) {
      console.error('Error updating doctor availability:', error);
      throw new Error(`Failed to update doctor availability: ${error.message}`);
    }

    // Add computed fields for compatibility
    const enhancedDoctor = {
      ...doctor,
      doctor_id: doctor.license_number,
      department: getSpecializationDepartment(doctor.specialization),
      experience_years: doctor.years_of_experience,
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      working_days: [1, 2, 3, 4, 5, 6],
      floor_number: 1,
      availability_status: availabilityStatus,
      emergency_available: false
    };

    return enhancedDoctor;
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    throw error;
  }
}

/**
 * Get doctors by specialization
 */
export async function getDoctorsBySpecialization(specialization: string): Promise<Doctor[]> {
  try {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select(`
        *,
        user:users(id, name, email, phone, address)
      `)
      .eq('specialization', specialization)
      .eq('status', 'active')
      .order('created_at', { ascending: false }); // Changed from user.name since it might cause issues

    if (error) {
      console.error('Error fetching doctors by specialization:', error);
      throw new Error(`Failed to fetch doctors: ${error.message}`);
    }

    // Add computed fields for compatibility
    const enhancedDoctors = doctors?.map(doctor => ({
      ...doctor,
      doctor_id: doctor.license_number,
      department: getSpecializationDepartment(doctor.specialization),
      experience_years: doctor.years_of_experience,
      working_hours_start: '09:00',
      working_hours_end: '17:00',
      working_days: [1, 2, 3, 4, 5, 6],
      floor_number: 1,
      availability_status: 'available',
      emergency_available: false
    })) || [];

    return enhancedDoctors;
  } catch (error) {
    console.error('Error fetching doctors by specialization:', error);
    throw error;
  }
}

/**
 * Get available doctors for scheduling
 */
export async function getAvailableDoctors(
  date: string,
  time: string,
  specialization?: string
): Promise<Doctor[]> {
  try {
    let query = supabase
      .from('doctors')
      .select(`
        *,
        user:users(id, name, email, phone, address)
      `)
      .eq('availability_status', 'available')
      .eq('status', 'active');

    if (specialization) {
      query = query.eq('specialization', specialization);
    }

    const { data: doctors, error } = await query.order('user.name', { ascending: true });

    if (error) {
      console.error('Error fetching available doctors:', error);
      throw new Error(`Failed to fetch available doctors: ${error.message}`);
    }

    // Filter by working hours and days
    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay();
    const [hours, minutes] = time.split(':').map(Number);
    const requestTimeMinutes = hours * 60 + minutes;

    const availableDoctors = (doctors || []).filter(doctor => {
      // Check if doctor works on this day
      if (!doctor.working_days.includes(dayOfWeek)) {
        return false;
      }

      // Check if time is within working hours
      const startTime = doctor.working_hours_start.split(':').map(Number);
      const endTime = doctor.working_hours_end.split(':').map(Number);
      const startTimeMinutes = startTime[0] * 60 + startTime[1];
      const endTimeMinutes = endTime[0] * 60 + endTime[1];

      return requestTimeMinutes >= startTimeMinutes && requestTimeMinutes < endTimeMinutes;
    });

    return availableDoctors;
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    throw error;
  }
}

/**
 * Get available time slots for a specific doctor on a given date
 */
export async function getDoctorAvailableSlots(
  doctorId: string,
  date: string
): Promise<{
  morning: string[];
  afternoon: string[];
  evening: string[];
}> {
  try {
    // Get doctor details directly without using getDoctorById
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('*, user:users(*)')
      .eq('id', doctorId)
      .single();

    if (doctorError || !doctor) {
      console.error('Error fetching doctor:', doctorError);
      // Return empty slots instead of throwing error
      return {
        morning: [],
        afternoon: [],
        evening: []
      };
    }

    // For now, show all slots as available (appointment checking can be added later)
    // This prevents errors and allows registration to proceed
    const bookedSlots = new Set<string>();

    // Generate available slots based on doctor's availability_hours
    const availabilityHours = doctor.availability_hours || {
      sessions: {
        morning: { startTime: '09:00', endTime: '12:00', maxPatients: 10 },
        afternoon: { startTime: '14:00', endTime: '17:00', maxPatients: 10 },
        evening: { startTime: '18:00', endTime: '21:00', maxPatients: 8 }
      },
      availableSessions: ['morning', 'afternoon', 'evening']
    };

    const slots = {
      morning: [] as string[],
      afternoon: [] as string[],
      evening: [] as string[]
    };

    // Generate 30-minute slots for each session
    for (const session of availabilityHours.availableSessions || ['morning', 'afternoon', 'evening']) {
      const sessionConfig = availabilityHours.sessions[session];
      if (!sessionConfig) continue;

      const startTime = sessionConfig.startTime;
      const endTime = sessionConfig.endTime;
      const maxPatients = sessionConfig.maxPatients;

      const sessionSlots = generateTimeSlots(startTime, endTime, 30); // 30-minute intervals

      // Filter out booked slots and limit by maxPatients
      const availableSlots = sessionSlots
        .filter(slot => !bookedSlots.has(slot))
        .slice(0, maxPatients);

      slots[session as keyof typeof slots] = availableSlots;
    }

    return slots;
  } catch (error) {
    console.error('Error getting doctor available slots:', error);
    throw error;
  }
}

/**
 * Generate time slots between start and end time with given interval
 */
function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += intervalMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    slots.push(timeString);
  }

  return slots;
}

/**
 * Get doctors with their available slots for a specific date
 */
export async function getDoctorsWithAvailableSlots(
  date: string,
  specialization?: string
): Promise<Array<Doctor & { availableSlots: { morning: string[]; afternoon: string[]; evening: string[] } }>> {
  try {
    // Get available doctors
    const doctors = await getAvailableDoctors(date, '09:00', specialization);

    // Get available slots for each doctor
    const doctorsWithSlots = await Promise.all(
      doctors.map(async (doctor) => {
        const availableSlots = await getDoctorAvailableSlots(doctor.id, date);
        return {
          ...doctor,
          availableSlots
        };
      })
    );

    // Filter out doctors with no available slots
    return doctorsWithSlots.filter(doctor =>
      doctor.availableSlots.morning.length > 0 ||
      doctor.availableSlots.afternoon.length > 0 ||
      doctor.availableSlots.evening.length > 0
    );
  } catch (error) {
    console.error('Error getting doctors with available slots:', error);
    throw error;
  }
}

/**
 * Check if a specific time slot is available for a doctor
 */
export async function isSlotAvailable(
  doctorId: string,
  date: string,
  time: string
): Promise<boolean> {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .limit(1);

    if (error) {
      console.error('Error checking slot availability:', error);
      return false;
    }

    return !appointments || appointments.length === 0;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
}

/**
 * Get doctor statistics
 */
export async function getDoctorStats(doctorId?: string): Promise<{
  totalAppointments: number;
  todayAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];

    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, status, appointment_date');

    if (doctorId) {
      appointmentsQuery = appointmentsQuery.eq('doctor_id', doctorId);
    }

    const { data: appointments, error } = await appointmentsQuery;

    if (error) {
      console.error('Error fetching appointment stats:', error);
      throw new Error(`Failed to fetch appointment stats: ${error.message}`);
    }

    const totalAppointments = appointments?.length || 0;
    const todayAppointments = appointments?.filter(apt => apt.appointment_date === today).length || 0;
    const completedAppointments = appointments?.filter(apt => apt.status === 'completed').length || 0;
    const pendingAppointments = appointments?.filter(apt =>
      apt.status === 'scheduled' || apt.status === 'confirmed'
    ).length || 0;

    return {
      totalAppointments,
      todayAppointments,
      completedAppointments,
      pendingAppointments
    };
  } catch (error) {
    console.error('Error getting doctor stats:', error);
    throw error;
  }
}

/**
 * Get all specializations
 */
export async function getAllSpecializations(): Promise<string[]> {
  try {
    // Fetch from the specializations table we created
    const { data: specializations, error } = await supabase
      .from('specializations')
      .select('name')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching specializations:', error);
      throw new Error(`Failed to fetch specializations: ${error.message}`);
    }

    // Return the specialization names
    return specializations?.map(s => s.name) || [];
  } catch (error) {
    console.error('Error fetching specializations:', error);
    throw error;
  }
}

/**
 * Add a new department
 */
export async function addDepartment(name: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert([{ name, status: 'active' }])
      .select('name')
      .single();

    if (error) {
      console.error('Error adding department:', error);
      throw new Error(`Failed to add department: ${error.message}`);
    }

    return data.name;
  } catch (error) {
    console.error('Error adding department:', error);
    throw error;
  }
}

/**
 * Get all departments
 */
export async function getAllDepartments(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('name')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching departments:', error);
      // Fallback to deriving from specializations if table has issues
      const { data: doctors } = await supabase
        .from('doctors')
        .select('specialization')
        .eq('status', 'active');

      const departments = doctors?.map(d => getSpecializationDepartment(d.specialization)) || [];
      return [...new Set(departments)].sort();
    }

    const uniqueDepartments = [...new Set(data?.map(d => d.name) || [])];
    return uniqueDepartments.sort();
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
}

/**
 * Update doctor information
 */
export async function updateDoctor(
  doctorId: string,
  updates: Partial<DoctorRegistrationData>
): Promise<Doctor> {
  try {
    // First, get the doctor to find the user_id
    const { data: existingDoctor, error: fetchError } = await supabase
      .from('doctors')
      .select('user_id')
      .eq('id', doctorId)
      .single();

    if (fetchError) {
      console.error('Error fetching doctor:', fetchError);
      throw new Error(`Failed to fetch doctor: ${fetchError.message}`);
    }

    // Separate user fields from doctor fields
    const userFields = {
      ...(updates.name && { name: updates.name }),
      ...(updates.email && { email: updates.email }),
      ...(updates.phone && { phone: updates.phone }),
      ...(updates.address && { address: updates.address })
    };

    const doctorFields = {
      ...(updates.licenseNumber && { license_number: updates.licenseNumber }),
      ...(updates.specialization && { specialization: updates.specialization }),
      ...(updates.qualification && { qualification: updates.qualification }),
      ...(updates.experienceYears && { years_of_experience: updates.experienceYears }),
      ...(updates.consultationFee && { consultation_fee: updates.consultationFee }),
      ...(updates.roomNumber && { room_number: updates.roomNumber }),
      ...((updates.sessions || updates.availableSessions || updates.workingDays || updates.emergencyAvailable !== undefined) && {
        availability_hours: {
          sessions: updates.sessions,
          availableSessions: updates.availableSessions,
          workingDays: updates.workingDays,
          emergencyAvailable: updates.emergencyAvailable,
          ...(updates.floorNumber && { floorNumber: updates.floorNumber }),
          ...(updates.workingHoursStart && { workingHoursStart: updates.workingHoursStart }),
          ...(updates.workingHoursEnd && { workingHoursEnd: updates.workingHoursEnd })
        }
      })
    };

    // Update user fields if any exist
    if (Object.keys(userFields).length > 0) {
      const { error: userError } = await supabase
        .from('users')
        .update(userFields)
        .eq('id', existingDoctor.user_id);

      if (userError) {
        console.error('Error updating user:', userError);
        throw new Error(`Failed to update user: ${userError.message}`);
      }
    }

    // Update doctor fields if any exist
    if (Object.keys(doctorFields).length > 0) {
      const { error: doctorError } = await supabase
        .from('doctors')
        .update(doctorFields)
        .eq('id', doctorId);

      if (doctorError) {
        console.error('Error updating doctor:', doctorError);
        throw new Error(`Failed to update doctor: ${doctorError.message}`);
      }
    }

    // Fetch and return the updated doctor with user data
    const { data: updatedDoctor, error: selectError } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single();

    if (selectError) {
      console.error('Error fetching updated doctor:', selectError);
      throw new Error(`Failed to fetch updated doctor: ${selectError.message}`);
    }

    // Fetch user data separately
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, phone, address')
      .eq('id', updatedDoctor.user_id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // Don't throw error, just return doctor without user data
    }

    return {
      ...updatedDoctor,
      user: userData || undefined
    };
  } catch (error) {
    console.error('Error updating doctor:', error);
    throw error;
  }
}

/**
 * Delete a doctor by ID
 */
export async function deleteDoctor(doctorId: string): Promise<void> {
  try {
    // First, get the doctor to find the user_id
    const { data: doctor, error: fetchError } = await supabase
      .from('doctors')
      .select('user_id')
      .eq('id', doctorId)
      .single();

    if (fetchError) {
      console.error('Error fetching doctor:', fetchError);
      throw new Error(`Failed to fetch doctor: ${fetchError.message}`);
    }

    // Delete the doctor record
    const { error: doctorError } = await supabase
      .from('doctors')
      .delete()
      .eq('id', doctorId);

    if (doctorError) {
      console.error('Error deleting doctor:', doctorError);
      throw new Error(`Failed to delete doctor: ${doctorError.message}`);
    }

    // Delete the associated user record
    if (doctor.user_id) {
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', doctor.user_id);

      if (userError) {
        console.error('Error deleting associated user:', userError);
        // Don't throw error for user deletion failure, as doctor record is already deleted
      }
    }
  } catch (error) {
    console.error('Error deleting doctor:', error);
    throw error;
  }
}