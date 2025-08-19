import { supabase } from './supabase';

// Prescription interfaces
export interface Medicine {
  id: string;
  medicine_code: string;
  name: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  unit_price?: number;
  stock_quantity?: number;
  minimum_stock_level?: number;
  expiry_date?: string;
  storage_conditions?: string;
  prescription_required?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionMedicine {
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
}

export interface Prescription {
  id: string;
  prescription_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  issue_date: string;
  medicines: PrescriptionMedicine[];
  instructions?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  
  // Related data
  patient?: any;
  doctor?: any;
  appointment?: any;
}

export interface PrescriptionData {
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  medicines: PrescriptionMedicine[];
  instructions?: string;
}

/**
 * Generate unique prescription ID
 */
export async function generatePrescriptionId(): Promise<string> {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RX${timestamp}${random}`;
}

/**
 * Get all available medicines
 */
export async function getMedicines(options: {
  search?: string;
  category?: string;
  status?: string;
} = {}): Promise<{ medicines: Medicine[]; error: any }> {
  try {
    const { search, category, status = 'active' } = options;
    
    let query = supabase
      .from('medicines')
      .select('*')
      .eq('status', status)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching medicines:', error);
      return { medicines: [], error };
    }

    return { medicines: data || [], error: null };
  } catch (error) {
    console.error('Error in getMedicines:', error);
    return { medicines: [], error };
  }
}

/**
 * Get medicine by ID
 */
export async function getMedicineById(medicineId: string): Promise<{ medicine: Medicine | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('id', medicineId)
      .single();

    if (error) {
      console.error('Error fetching medicine:', error);
      return { medicine: null, error };
    }

    return { medicine: data, error: null };
  } catch (error) {
    console.error('Error in getMedicineById:', error);
    return { medicine: null, error };
  }
}

/**
 * Create new prescription
 */
export async function createPrescription(prescriptionData: PrescriptionData): Promise<{ prescription: Prescription | null; error: any }> {
  try {
    const prescriptionId = await generatePrescriptionId();
    
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        prescription_id: prescriptionId,
        patient_id: prescriptionData.patient_id,
        doctor_id: prescriptionData.doctor_id,
        appointment_id: prescriptionData.appointment_id,
        medicines: prescriptionData.medicines,
        instructions: prescriptionData.instructions,
        status: 'active'
      })
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id,
          doctor_id,
          specialization,
          user:users(name, phone, email)
        ),
        appointment:appointments(id, appointment_id, appointment_date, appointment_time)
      `)
      .single();

    if (error) {
      console.error('Error creating prescription:', error);
      return { prescription: null, error };
    }

    return { prescription: data, error: null };
  } catch (error) {
    console.error('Error in createPrescription:', error);
    return { prescription: null, error };
  }
}

/**
 * Get prescriptions with filtering
 */
export async function getPrescriptions(options: {
  page?: number;
  limit?: number;
  patient_id?: string;
  doctor_id?: string;
  appointment_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
} = {}): Promise<{
  prescriptions: Prescription[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const { page = 1, limit = 20, patient_id, doctor_id, appointment_id, status, date_from, date_to } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id,
          doctor_id,
          specialization,
          user:users(name, phone, email)
        ),
        appointment:appointments(id, appointment_id, appointment_date, appointment_time)
      `, { count: 'exact' });

    // Apply filters
    if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }

    if (doctor_id) {
      query = query.eq('doctor_id', doctor_id);
    }

    if (appointment_id) {
      query = query.eq('appointment_id', appointment_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (date_from) {
      query = query.gte('issue_date', date_from);
    }

    if (date_to) {
      query = query.lte('issue_date', date_to);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prescriptions:', error);
      return {
        prescriptions: [],
        total: 0,
        page: page,
        limit: limit
      };
    }

    return {
      prescriptions: data || [],
      total: count || 0,
      page: page,
      limit: limit
    };
  } catch (error) {
    console.error('Error in getPrescriptions:', error);
    return {
      prescriptions: [],
      total: 0,
      page: options.page || 1,
      limit: options.limit || 20
    };
  }
}

/**
 * Get prescription by ID
 */
export async function getPrescriptionById(prescriptionId: string): Promise<{ prescription: Prescription | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email, date_of_birth, gender, allergies),
        doctor:doctors(
          id,
          doctor_id,
          specialization,
          qualification,
          user:users(name, phone, email)
        ),
        appointment:appointments(id, appointment_id, appointment_date, appointment_time, diagnosis)
      `)
      .eq('id', prescriptionId)
      .single();

    if (error) {
      console.error('Error fetching prescription:', error);
      return { prescription: null, error };
    }

    return { prescription: data, error: null };
  } catch (error) {
    console.error('Error in getPrescriptionById:', error);
    return { prescription: null, error };
  }
}

/**
 * Update prescription status
 */
export async function updatePrescriptionStatus(
  prescriptionId: string, 
  status: 'active' | 'completed' | 'cancelled'
): Promise<{ prescription: Prescription | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', prescriptionId)
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id,
          doctor_id,
          specialization,
          user:users(name, phone, email)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating prescription status:', error);
      return { prescription: null, error };
    }

    return { prescription: data, error: null };
  } catch (error) {
    console.error('Error in updatePrescriptionStatus:', error);
    return { prescription: null, error };
  }
}

/**
 * Get prescriptions by patient ID
 */
export async function getPatientPrescriptions(patientId: string): Promise<{ prescriptions: Prescription[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:doctors(
          id,
          doctor_id,
          specialization,
          user:users(name, phone, email)
        ),
        appointment:appointments(id, appointment_id, appointment_date, appointment_time)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patient prescriptions:', error);
      return { prescriptions: [], error };
    }

    return { prescriptions: data || [], error: null };
  } catch (error) {
    console.error('Error in getPatientPrescriptions:', error);
    return { prescriptions: [], error };
  }
}

/**
 * Get prescriptions by doctor ID
 */
export async function getDoctorPrescriptions(doctorId: string): Promise<{ prescriptions: Prescription[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        appointment:appointments(id, appointment_id, appointment_date, appointment_time)
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching doctor prescriptions:', error);
      return { prescriptions: [], error };
    }

    return { prescriptions: data || [], error: null };
  } catch (error) {
    console.error('Error in getDoctorPrescriptions:', error);
    return { prescriptions: [], error };
  }
}

/**
 * Get medicine categories
 */
export async function getMedicineCategories(): Promise<{ categories: string[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('category')
      .not('category', 'is', null)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching medicine categories:', error);
      return { categories: [], error };
    }

    const categories = [...new Set(data.map(item => item.category).filter(Boolean))];
    return { categories, error: null };
  } catch (error) {
    console.error('Error in getMedicineCategories:', error);
    return { categories: [], error };
  }
}

/**
 * Search medicines by name or generic name
 */
export async function searchMedicines(searchTerm: string): Promise<{ medicines: Medicine[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,generic_name.ilike.%${searchTerm}%`)
      .eq('status', 'active')
      .order('name')
      .limit(20);

    if (error) {
      console.error('Error searching medicines:', error);
      return { medicines: [], error };
    }

    return { medicines: data || [], error: null };
  } catch (error) {
    console.error('Error in searchMedicines:', error);
    return { medicines: [], error };
  }
}

/**
 * Update prescription medicines
 */
export async function updatePrescriptionMedicines(
  prescriptionId: string,
  medicines: PrescriptionMedicine[]
): Promise<{ prescription: Prescription | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .update({ 
        medicines, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', prescriptionId)
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id,
          doctor_id,
          specialization,
          user:users(name, phone, email)
        )
      `)
      .single();

    if (error) {
      console.error('Error updating prescription medicines:', error);
      return { prescription: null, error };
    }

    return { prescription: data, error: null };
  } catch (error) {
    console.error('Error in updatePrescriptionMedicines:', error);
    return { prescription: null, error };
  }
}

/**
 * Delete prescription
 */
export async function deletePrescription(prescriptionId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase
      .from('prescriptions')
      .delete()
      .eq('id', prescriptionId);

    if (error) {
      console.error('Error deleting prescription:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in deletePrescription:', error);
    return { success: false, error };
  }
}

/**
 * Get prescription statistics
 */
export async function getPrescriptionStats(doctorId?: string): Promise<{
  totalPrescriptions: number;
  activePrescriptions: number;
  completedPrescriptions: number;
  todayPrescriptions: number;
  error: any;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    let baseQuery = supabase.from('prescriptions').select('id', { count: 'exact', head: true });
    
    if (doctorId) {
      baseQuery = baseQuery.eq('doctor_id', doctorId);
    }

    const [totalResult, activeResult, completedResult, todayResult] = await Promise.all([
      baseQuery,
      supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('doctor_id', doctorId || ''),
      supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('status', 'completed').eq('doctor_id', doctorId || ''),
      supabase.from('prescriptions').select('id', { count: 'exact', head: true }).eq('issue_date', today).eq('doctor_id', doctorId || '')
    ]);

    return {
      totalPrescriptions: totalResult.count || 0,
      activePrescriptions: activeResult.count || 0,
      completedPrescriptions: completedResult.count || 0,
      todayPrescriptions: todayResult.count || 0,
      error: null
    };
  } catch (error) {
    console.error('Error in getPrescriptionStats:', error);
    return {
      totalPrescriptions: 0,
      activePrescriptions: 0,
      completedPrescriptions: 0,
      todayPrescriptions: 0,
      error
    };
  }
}