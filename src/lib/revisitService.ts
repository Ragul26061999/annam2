import { supabase } from './supabase';

export interface PatientRevisit {
  id: string;
  patient_id: string;
  uhid: string;
  visit_date: string;
  visit_time: string;
  department?: string;
  doctor_id?: string;
  reason_for_visit: string;
  symptoms?: string;
  previous_diagnosis?: string;
  current_diagnosis?: string;
  prescription_id?: string;
  consultation_fee?: number;
  payment_mode?: string;
  payment_status?: string;
  visit_type?: string;
  staff_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PatientRevisitData {
  patient_id: string;
  uhid: string;
  visit_date: string;
  visit_time: string;
  department?: string;
  doctor_id?: string;
  reason_for_visit: string;
  symptoms?: string;
  previous_diagnosis?: string;
  current_diagnosis?: string;
  consultation_fee?: number;
  payment_mode?: string;
  payment_status?: string;
  visit_type?: string;
  staff_id?: string;
  notes?: string;
}

export interface PatientDetails {
  id: string;
  patient_id: string;
  name: string;
  gender?: string;
  age?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  address?: string;
}

/**
 * Search for a patient by UHID
 */
export async function searchPatientByUHID(uhid: string): Promise<PatientDetails | null> {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('id, patient_id, name, gender, phone, email, date_of_birth, address')
      .ilike('patient_id', uhid.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Patient not found
      }
      throw error;
    }

    if (!data) return null;

    // Calculate age from date_of_birth
    let age = '';
    if (data.date_of_birth) {
      const birthDate = new Date(data.date_of_birth);
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        years--;
      }
      age = years.toString();
    }

    return {
      ...data,
      age
    };
  } catch (error) {
    console.error('Error searching patient by UHID:', error);
    throw new Error('Failed to search patient');
  }
}

/**
 * Get patient's previous visits for showing history
 */
export async function getPatientVisitHistory(patientId: string, limit: number = 5) {
  try {
    const { data, error } = await supabase
      .from('patient_revisits')
      .select('*, staff:staff_id(first_name, last_name)')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist (42P01) or relation not found, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('patient_revisits table does not exist yet. Please run the SQL migration script.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error: any) {
    // Gracefully handle table not existing
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('patient_revisits table does not exist yet. Please run the SQL migration script.');
      return [];
    }
    console.error('Error fetching patient visit history:', error);
    // Don't throw - return empty array to allow form to work
    return [];
  }
}

/**
 * Create a new revisit record
 */
export async function createRevisit(revisitData: PatientRevisitData): Promise<PatientRevisit> {
  try {
    const { data, error } = await supabase
      .from('patient_revisits')
      .insert([revisitData])
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error('No data returned from insert');
    }

    return data;
  } catch (error) {
    console.error('Error creating revisit:', error);
    throw new Error('Failed to create revisit record');
  }
}

/**
 * Get all revisits for a specific patient
 */
export async function getRevisitsByPatient(patientId: string): Promise<PatientRevisit[]> {
  try {
    const { data, error } = await supabase
      .from('patient_revisits')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching revisits by patient:', error);
    throw new Error('Failed to fetch patient revisits');
  }
}

/**
 * Get a single revisit by ID
 */
export async function getRevisitById(id: string): Promise<PatientRevisit | null> {
  try {
    const { data, error } = await supabase
      .from('patient_revisits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching revisit by ID:', error);
    throw new Error('Failed to fetch revisit');
  }
}

/**
 * Update a revisit record
 */
export async function updateRevisit(id: string, updates: Partial<PatientRevisitData>): Promise<PatientRevisit> {
  try {
    const { data, error } = await supabase
      .from('patient_revisits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error('No data returned from update');
    }

    return data;
  } catch (error) {
    console.error('Error updating revisit:', error);
    throw new Error('Failed to update revisit');
  }
}

/**
 * Get recent revisits for dashboard
 */
export async function getRecentRevisits(limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from('patient_revisits')
      .select(`
        *,
        patient:patient_id(name, patient_id, phone),
        staff:staff_id(first_name, last_name)
      `)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('patient_revisits table does not exist yet. Please run the SQL migration script.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error: any) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('patient_revisits table does not exist yet. Please run the SQL migration script.');
      return [];
    }
    console.error('Error fetching recent revisits:', JSON.stringify(error, null, 2));
    return [];
  }
}

/**
 * Get revisit statistics
 */
export async function getRevisitStats() {
  try {
    // Total revisits
    const { count: totalRevisits, error: totalError } = await supabase
      .from('patient_revisits')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Today's revisits
    const today = new Date().toISOString().split('T')[0];
    const { count: todayRevisits, error: todayError } = await supabase
      .from('patient_revisits')
      .select('*', { count: 'exact', head: true })
      .eq('visit_date', today);

    if (todayError) throw todayError;

    // This month's revisits
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { count: monthRevisits, error: monthError } = await supabase
      .from('patient_revisits')
      .select('*', { count: 'exact', head: true })
      .gte('visit_date', firstDayOfMonth);

    if (monthError) throw monthError;

    return {
      total: totalRevisits || 0,
      today: todayRevisits || 0,
      thisMonth: monthRevisits || 0
    };
  } catch (error) {
    console.error('Error fetching revisit stats:', error);
    return {
      total: 0,
      today: 0,
      thisMonth: 0
    };
  }
}
