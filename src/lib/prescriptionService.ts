import { supabase } from './supabase';

// Prescription interfaces
export interface Medicine {
  id: string;
  medication_code: string;
  name: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  unit_price?: number;
  stock_quantity?: number;
  minimum_stock_level?: number;
  maximum_stock_level?: number;
  expiry_date?: string;
  batch_number?: string;
  storage_conditions?: string;
  prescription_required?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionMedicine {
  medication_id: string;
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
    
    // First create the prescription
    const { data: prescriptionResult, error: prescriptionError } = await supabase
      .from('prescriptions')
      .insert({
        prescription_id: prescriptionId,
        patient_id: prescriptionData.patient_id,
        doctor_id: prescriptionData.doctor_id,
        appointment_id: prescriptionData.appointment_id,
        instructions: prescriptionData.instructions,
        status: 'active'
      })
      .select('*')
      .single();

    if (prescriptionError) {
      console.error('Error creating prescription:', prescriptionError);
      return { prescription: null, error: prescriptionError };
    }

    // Then create prescription items
    const prescriptionItems = prescriptionData.medicines.map(medicine => ({
      prescription_id: prescriptionResult.id,
      medication_id: medicine.medication_id,
      quantity: medicine.quantity,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      duration: medicine.duration,
      instructions: medicine.instructions,
      status: 'pending'
    }));

    const { error: itemsError } = await supabase
      .from('prescription_items')
      .insert(prescriptionItems);

    if (itemsError) {
      console.error('Error creating prescription items:', itemsError);
      // Rollback prescription creation
      await supabase.from('prescriptions').delete().eq('id', prescriptionResult.id);
      return { prescription: null, error: itemsError };
    }

    // Fetch the complete prescription with related data
    const { data, error } = await supabase
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
        appointment:appointments(id, appointment_id, appointment_date, appointment_time),
        prescription_items(
          *,
          medication:medications(id, name, generic_name, strength, unit_price)
        )
      `)
      .eq('id', prescriptionResult.id)
      .single();

    if (error) {
      console.error('Error fetching created prescription:', error);
      return { prescription: null, error };
    }

    // Transform prescription_items to medicines format for backward compatibility
    const transformedPrescription = {
      ...data,
      medicines: data.prescription_items?.map((item: any) => ({
        medication_id: item.medication_id,
        medicine_name: item.medication?.name || '',
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        quantity: item.quantity
      })) || []
    };

    return { prescription: transformedPrescription, error: null };
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
        appointment:appointments(id, appointment_id, appointment_date, appointment_time),
        prescription_items(
          *,
          medication:medications(id, name, generic_name, strength, unit_price)
        )
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

    // Transform prescription_items to medicines format for backward compatibility
    const transformedPrescriptions = data?.map((prescription: any) => ({
      ...prescription,
      medicines: prescription.prescription_items?.map((item: any) => ({
        medication_id: item.medication_id,
        medicine_name: item.medication?.name || '',
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        quantity: item.quantity
      })) || []
    })) || [];

    return {
      prescriptions: transformedPrescriptions,
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
        appointment:appointments(id, appointment_id, appointment_date, appointment_time, diagnosis),
        prescription_items(
          *,
          medication:medications(id, name, generic_name, strength, unit_price)
        )
      `)
      .eq('id', prescriptionId)
      .single();

    if (error) {
      console.error('Error fetching prescription:', error);
      return { prescription: null, error };
    }

    // Transform prescription_items to medicines format for backward compatibility
    const transformedPrescription = {
      ...data,
      medicines: data.prescription_items?.map((item: any) => ({
        medication_id: item.medication_id,
        medicine_name: item.medication?.name || '',
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        quantity: item.quantity
      })) || []
    };

    return { prescription: transformedPrescription, error: null };
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

    const categories = [...new Set(data.map((item: any) => item.category).filter(Boolean))] as string[];
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
    if (!searchTerm.trim()) {
      return { medicines: [], error: null };
    }

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
    // First, delete existing prescription items
    const { error: deleteError } = await supabase
      .from('prescription_items')
      .delete()
      .eq('prescription_id', prescriptionId);

    if (deleteError) {
      console.error('Error deleting existing prescription items:', deleteError);
      return { prescription: null, error: deleteError };
    }

    // Then, insert new prescription items
    const prescriptionItems = medicines.map(medicine => ({
      prescription_id: prescriptionId,
      medication_id: medicine.medication_id,
      quantity: medicine.quantity,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      duration: medicine.duration,
      instructions: medicine.instructions,
      status: 'pending'
    }));

    const { error: insertError } = await supabase
      .from('prescription_items')
      .insert(prescriptionItems);

    if (insertError) {
      console.error('Error inserting new prescription items:', insertError);
      return { prescription: null, error: insertError };
    }

    // Update prescription updated_at timestamp
    const { error: updateError } = await supabase
      .from('prescriptions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', prescriptionId);

    if (updateError) {
      console.error('Error updating prescription timestamp:', updateError);
    }

    // Fetch the updated prescription with related data
    const { data, error } = await supabase
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
        prescription_items(
          *,
          medication:medications(id, name, generic_name, strength, unit_price)
        )
      `)
      .eq('id', prescriptionId)
      .single();

    if (error) {
      console.error('Error fetching updated prescription:', error);
      return { prescription: null, error };
    }

    // Transform prescription_items to medicines format for backward compatibility
    const transformedPrescription = {
      ...data,
      medicines: data.prescription_items?.map((item: any) => ({
        medication_id: item.medication_id,
        medicine_name: item.medication?.name || '',
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        quantity: item.quantity
      })) || []
    };

    return { prescription: transformedPrescription, error: null };
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