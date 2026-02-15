'use server'

import { requireSupabaseAdmin } from '@/src/lib/supabase-admin';

export interface CreateDoctorInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  licenseNumber?: string;
  specialization: string;
  department: string;
  qualification?: string;
  consultationFee: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
  roomNumber?: string;
  floorNumber?: number;
  emergencyAvailable: boolean;
  sessions: {
    morning: { startTime: string; endTime: string };
    afternoon: { startTime: string; endTime: string };
    evening: { startTime: string; endTime: string };
  };
  availableSessions: string[];
}

export interface CreateDoctorResult {
  success: boolean;
  error?: string;
  doctor?: any;
}

/**
 * Generate a unique doctor ID
 */
async function generateDoctorId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `DR${year}${month}${day}${timestamp}${random}`;
}

/**
 * Generate a unique employee ID
 */
async function generateEmployeeId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `EMP${year}${month}${day}${timestamp}${random}`;
}

/**
 * Normalize email base for auto-generation
 */
function normalizeEmailBase(name: string): string {
  const first = (name || '').trim().split(/\s+/)[0] || 'doctor';
  const base = first.toLowerCase().replace(/[^a-z0-9]/g, '');
  return base || 'doctor';
}

/**
 * Generate unique email for doctor
 */
async function generateUniqueEmail(name: string, supabaseAdmin: any): Promise<string> {
  const base = normalizeEmailBase(name);
  const domain = 'annam.com';
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('email')
    .ilike('email', `${base}%@${domain}`)
    .limit(200);

  if (error) {
    console.error('Error checking existing emails:', error);
  }

  const used = (data || []).map((r: any) => String(r.email || '').toLowerCase());
  let maxSuffix = 0;
  for (const e of used) {
    const m = e.match(new RegExp(`^${base}(\\d{4})@${domain.replace('.', '\\.')}$`));
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > maxSuffix) maxSuffix = n;
  }

  const next = (maxSuffix + 1).toString().padStart(4, '0');
  return `${base}${next}@${domain}`;
}

/**
 * Get next doctor sort order
 */
async function getNextDoctorSortOrder(supabaseAdmin: any): Promise<number> {
  const { data: maxRow, error: maxError } = await supabaseAdmin
    .from('doctors')
    .select('sort_order')
    .is('deleted_at', null)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    throw new Error(`Failed to determine next doctor sort order: ${maxError.message}`);
  }

  const max = typeof maxRow?.sort_order === 'number' ? maxRow.sort_order : 0;
  return max + 1;
}

/**
 * Create a new doctor (server action using admin client)
 */
export async function createDoctorAction(input: CreateDoctorInput): Promise<CreateDoctorResult> {
  try {
    const supabaseAdmin = requireSupabaseAdmin();

    // Generate unique IDs
    const uniqueEmployeeId = await generateEmployeeId();

    // Determine email to use
    const emailToUse = input.email?.trim()
      ? input.email.trim()
      : await generateUniqueEmail(input.name, supabaseAdmin);

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_id')
      .eq('email', emailToUse)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing user:', checkError);
      return { success: false, error: `Failed to check existing user: ${checkError.message}` };
    }

    let authUserId: string | null = null;
    let userId: string | null = null;

    if (existingUser) {
      // User already exists - check if they're already a doctor
      const { data: existingDoctor, error: doctorCheckError } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('user_id', existingUser.auth_id)
        .maybeSingle();

      if (existingDoctor) {
        return {
          success: false,
          error: `A doctor with email ${emailToUse} already exists in the system. Please use a different email address.`
        };
      }

      // User exists but not as a doctor, we can reuse the user record
      console.log('User already exists, using existing record');
      authUserId = existingUser.auth_id;
      userId = existingUser.id;
    } else {
      // Create new auth user using admin API
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: emailToUse,
        password: 'Doctor@123', // Default password
        email_confirm: true,
        user_metadata: {
          role: 'doctor',
          name: input.name
        }
      });

      if (authError) {
        console.error('Error creating doctor auth user:', authError);
        return {
          success: false,
          error: `Failed to create doctor authentication: ${authError.message}`
        };
      }

      if (!authUser.user?.id) {
        return { success: false, error: 'Auth user created but no ID returned' };
      }

      authUserId = authUser.user.id;

      // Create user record in public.users table
      const userData = {
        auth_id: authUserId,
        employee_id: uniqueEmployeeId,
        name: input.name,
        email: emailToUse,
        phone: input.phone || null,
        address: input.address || null,
        role: 'doctor',
        status: 'active',
        permissions: {
          view_patients: true,
          create_appointments: true,
          update_medical_records: true,
          prescribe_medications: true
        }
      };

      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (userError) {
        console.error('Error creating user record:', userError);

        // Cleanup: delete the auth user we just created
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

        // Check for duplicate email constraint violation
        if (userError.message.includes('duplicate') && userError.message.includes('email')) {
          return {
            success: false,
            error: `A user with email ${emailToUse} already exists in the system. Please use a different email address.`
          };
        }

        // Check for duplicate phone constraint violation
        if (userError.message.includes('duplicate') && userError.message.includes('phone')) {
          return {
            success: false,
            error: `A user with phone number ${input.phone} already exists in the system. Please use a different phone number.`
          };
        }

        return { success: false, error: `Failed to create user record: ${userError.message}` };
      }

      userId = newUser.id;
    }

    // Get next sort order
    const sortOrder = await getNextDoctorSortOrder(supabaseAdmin);

    // Create doctor record - IMPORTANT: user_id references public.users(id), not auth.users(id)
    const doctorRecord = {
      user_id: userId,
      license_number: input.licenseNumber || null,
      specialization: input.specialization,
      qualification: input.qualification || null,
      consultation_fee: input.consultationFee,
      room_number: input.roomNumber || null,
      sort_order: sortOrder,
      availability_hours: {
        sessions: input.sessions,
        availableSessions: input.availableSessions,
        workingDays: input.workingDays,
        emergencyAvailable: input.emergencyAvailable,
        floorNumber: input.floorNumber,
        workingHoursStart: input.workingHoursStart,
        workingHoursEnd: input.workingHoursEnd,
        department: input.department
      },
      status: 'active'
    };

    // Retry logic for sort_order conflicts
    let doctor: any = null;
    let doctorError: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabaseAdmin
        .from('doctors')
        .insert([doctorRecord])
        .select('*')
        .single();

      if (!error) {
        doctor = data;
        doctorError = null;
        break;
      }

      doctorError = error;

      // If we hit a race condition on sort_order unique constraint, bump and retry
      if (error.code === '23505' && String(error.details || '').includes('(sort_order)=(')) {
        doctorRecord.sort_order = doctorRecord.sort_order + 1;
        continue;
      }

      break;
    }

    if (doctorError) {
      console.error('Error creating doctor record:', doctorError, JSON.stringify(doctorError));

      // Cleanup: delete user and auth user if doctor creation failed
      if (userId && !existingUser) {
        await supabaseAdmin.from('users').delete().eq('id', userId);
      }
      if (authUserId && !existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }

      if (doctorError.code === '23505' && String(doctorError.details || '').includes('(sort_order)=(')) {
        return { success: false, error: 'Doctor sort order conflict. Please try again.' };
      }

      // Check for duplicate license number constraint violation
      if (doctorError.message.includes('duplicate') && doctorError.message.includes('license')) {
        return { success: false, error: 'A doctor with this license number already exists. Please verify the license number.' };
      }

      // Check for foreign key constraint violation
      if (doctorError.code === '23503' || doctorError.message.includes('foreign key')) {
        return { success: false, error: 'Invalid user reference. Please try again or contact support.' };
      }

      return { success: false, error: `Failed to create doctor record: ${doctorError.message}` };
    }

    // Fetch user profile for return value
    let userProfile: any = null;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('id, name, email, phone, address')
        .eq('id', userId)
        .maybeSingle();

      userProfile = profile;
    }

    return {
      success: true,
      doctor: {
        ...doctor,
        user: userProfile || undefined
      }
    };
  } catch (error: any) {
    console.error('Error in createDoctorAction:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}
