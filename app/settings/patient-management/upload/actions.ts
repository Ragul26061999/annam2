'use server';

import { supabaseAdmin } from '@/src/lib/supabase-admin';

export async function uploadPatient(patientData: any) {
  try {
    const { error } = await supabaseAdmin
      .from('patients')
      .upsert(patientData, { onConflict: 'patient_id' });

    if (error) {
      console.error('Supabase Admin Error:', error);
      return { success: false, error: error.message, details: error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Server Action Error:', error);
    return { success: false, error: error.message || 'Unknown server error' };
  }
}
