import { supabase } from './supabase';

export interface IPSurgeryCharge {
  id?: string;
  bed_allocation_id: string;
  patient_id: string;
  surgery_name: string;
  surgeon_name?: string;
  surgery_date?: string;
  surgery_type?: string;
  anesthesia_type?: string;
  duration_minutes?: number;
  surgeon_fee: number;
  anesthesia_fee: number;
  ot_charges: number;
  equipment_charges: number;
  consumables_charges: number;
  other_charges: number;
  total_amount?: number;
  notes?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  edited?: boolean;
  last_edited_by?: string;
  last_edited_at?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getIPSurgeryCharges(bedAllocationId: string): Promise<IPSurgeryCharge[]> {
  const { data, error } = await supabase
    .from('ip_surgery_charges')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .order('surgery_date', { ascending: false });

  if (error) {
    console.error('Error fetching surgery charges:', error);
    throw error;
  }

  return data || [];
}

export async function createIPSurgeryCharge(
  surgeryData: Omit<IPSurgeryCharge, 'id' | 'total_amount' | 'created_at' | 'updated_at'>
): Promise<IPSurgeryCharge> {
  const { data, error } = await supabase
    .from('ip_surgery_charges')
    .insert(surgeryData)
    .select()
    .single();

  if (error) {
    console.error('Error creating surgery charge:', error);
    throw error;
  }

  return data;
}

export async function updateIPSurgeryCharge(
  id: string,
  updates: Partial<IPSurgeryCharge>,
  userId?: string
): Promise<IPSurgeryCharge> {
  const updateData = {
    ...updates,
    edited: true,
    last_edited_by: userId,
    last_edited_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('ip_surgery_charges')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating surgery charge:', error);
    throw error;
  }

  return data;
}

export async function acknowledgeIPSurgeryCharge(
  id: string,
  userId: string
): Promise<IPSurgeryCharge> {
  const { data, error } = await supabase
    .from('ip_surgery_charges')
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error acknowledging surgery charge:', error);
    throw error;
  }

  return data;
}

export async function deleteIPSurgeryCharge(id: string): Promise<void> {
  const { error } = await supabase
    .from('ip_surgery_charges')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting surgery charge:', error);
    throw error;
  }
}
