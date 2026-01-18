import { supabase } from './supabase';

export interface IPDoctorConsultation {
  id?: string;
  bed_allocation_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  consultation_type?: string;
  consultation_fee: number;
  days: number;
  total_amount?: number;
  notes?: string;
  consultation_date?: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  edited?: boolean;
  last_edited_by?: string;
  last_edited_at?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getIPDoctorConsultations(bedAllocationId: string): Promise<IPDoctorConsultation[]> {
  const { data, error } = await supabase
    .from('ip_doctor_consultations')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .order('consultation_date', { ascending: false });

  if (error) {
    console.error('Error fetching doctor consultations:', error);
    throw error;
  }

  return data || [];
}

export async function createIPDoctorConsultation(
  consultationData: Omit<IPDoctorConsultation, 'id' | 'total_amount' | 'created_at' | 'updated_at'>
): Promise<IPDoctorConsultation> {
  const { data, error } = await supabase
    .from('ip_doctor_consultations')
    .insert(consultationData)
    .select()
    .single();

  if (error) {
    console.error('Error creating doctor consultation:', error);
    throw error;
  }

  return data;
}

export async function updateIPDoctorConsultation(
  id: string,
  updates: Partial<IPDoctorConsultation>,
  userId?: string
): Promise<IPDoctorConsultation> {
  const updateData = {
    ...updates,
    edited: true,
    last_edited_by: userId,
    last_edited_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ip_doctor_consultations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating doctor consultation:', error);
    throw error;
  }

  return data;
}

export async function acknowledgeIPDoctorConsultation(
  id: string,
  userId?: string
): Promise<IPDoctorConsultation> {
  const { data, error } = await supabase
    .from('ip_doctor_consultations')
    .update({
      acknowledged: true,
      acknowledged_by: userId || null,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error acknowledging doctor consultation:', error);
    throw error;
  }

  return data;
}

export async function deleteIPDoctorConsultation(id: string): Promise<void> {
  const { error } = await supabase
    .from('ip_doctor_consultations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting doctor consultation:', error);
    throw error;
  }
}

export async function getAllDoctors(): Promise<Array<{ id: string; name: string; specialization?: string }>> {
  const { data, error } = await supabase
    .from('doctors')
    .select(
      `
      id,
      specialization,
      user:users(name)
    `
    )
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.user?.name || 'Unknown Doctor',
    specialization: d.specialization
  }));
}
