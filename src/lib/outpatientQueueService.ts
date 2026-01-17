import { supabase } from './supabase';

export interface QueueEntry {
  id: string;
  patient_id: string;
  queue_number: number;
  registration_date: string;
  registration_time: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  notes?: string;
  called_at?: string;
  completed_at?: string;
  staff_id?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    patient_id: string;
    name: string;
    age?: number;
    gender: string;
    phone: string;
    date_of_birth: string;
    primary_complaint?: string;
    consulting_doctor_name?: string;
  };
}

export interface QueueStats {
  totalWaiting: number;
  totalInProgress: number;
  totalCompleted: number;
  averageWaitTime: number;
}

/**
 * Add patient to outpatient queue
 */
export async function addToQueue(
  patientId: string,
  registrationDate: string = new Date().toISOString().split('T')[0],
  priority: number = 0,
  notes?: string,
  staffId?: string
): Promise<{ success: boolean; queueEntry?: QueueEntry; error?: string }> {
  try {
    // Generate queue number for today
    const { data: queueNumberData, error: queueError } = await supabase
      .rpc('generate_queue_number', { reg_date: registrationDate });

    if (queueError) throw queueError;

    const queueNumber = queueNumberData || 1;

    // Postgres TIME expects HH:MM:SS
    const now = new Date();
    const registrationTime = now.toTimeString().slice(0, 8);

    // Insert into queue
    const { data, error } = await supabase
      .from('outpatient_queue')
      .insert({
        patient_id: patientId,
        queue_number: queueNumber,
        registration_date: registrationDate,
        registration_time: registrationTime,
        status: 'waiting',
        priority,
        notes,
        staff_id: staffId
      })
      .select()
      .single();

    if (error) {
      // If patient is already queued for the day, return the existing entry.
      // This prevents failures due to UNIQUE(patient_id, registration_date).
      if ((error as any)?.code === '23505') {
        const { data: existing, error: existingError } = await supabase
          .from('outpatient_queue')
          .select('*')
          .eq('patient_id', patientId)
          .eq('registration_date', registrationDate)
          .single();

        if (existingError) throw existingError;
        return { success: true, queueEntry: existing };
      }

      throw error;
    }

    return { success: true, queueEntry: data };
  } catch (error) {
    console.error('Error adding to queue:', error);
    console.error('Error type:', typeof error);
    console.error('Error keys:', error ? Object.keys(error) : 'null');
    console.error('Error stringified:', JSON.stringify(error, null, 2));
    
    const message =
      typeof error === 'string'
        ? error
        : (error as any)?.message || (error as any)?.error_description || (error as any)?.hint || String(error);
    
    console.error('Final error message:', message);
    return { success: false, error: message };
  }
}

/**
 * Get queue entries for a specific date
 */
export async function getQueueEntries(
  date: string = new Date().toISOString().split('T')[0],
  status?: string
): Promise<{ success: boolean; entries?: QueueEntry[]; error?: string }> {
  try {
    let query = supabase
      .from('outpatient_queue')
      .select(`
        *,
        patient:patients!outpatient_queue_patient_id_fkey (
          id,
          patient_id,
          name,
          age,
          gender,
          phone,
          date_of_birth,
          primary_complaint,
          consulting_doctor_name
        )
      `)
      .eq('registration_date', date)
      .order('priority', { ascending: false })
      .order('queue_number', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data - name is already complete in database
    const entries = (data || []).map((entry: any) => ({
      ...entry,
      patient: entry.patient ? {
        ...entry.patient,
        name: entry.patient.name
      } : null
    }));

    return { success: true, entries };
  } catch (error) {
    console.error('Error fetching queue entries:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Update queue entry status
 */
export async function updateQueueStatus(
  queueId: string,
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled',
  staffId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status };

    if (status === 'in_progress') {
      updateData.called_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (staffId) {
      updateData.staff_id = staffId;
    }

    const { error } = await supabase
      .from('outpatient_queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) throw error;

    // If completed, also update patient registration status
    if (status === 'completed') {
      const { data: queueEntry } = await supabase
        .from('outpatient_queue')
        .select('patient_id')
        .eq('id', queueId)
        .single();

      if (queueEntry) {
        await supabase
          .from('patients')
          .update({
            registration_status: 'completed',
            vitals_completed_at: new Date().toISOString()
          })
          .eq('id', queueEntry.patient_id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating queue status:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get queue statistics for a date
 */
export async function getQueueStats(
  date: string = new Date().toISOString().split('T')[0]
): Promise<{ success: boolean; stats?: QueueStats; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('outpatient_queue')
      .select('*')
      .eq('registration_date', date);

    if (error) throw error;

    const entries = data || [];
    const waiting = entries.filter(e => e.status === 'waiting');
    const inProgress = entries.filter(e => e.status === 'in_progress');
    const completed = entries.filter(e => e.status === 'completed');

    // Calculate average wait time for completed entries
    let totalWaitMinutes = 0;
    let completedCount = 0;

    completed.forEach(entry => {
      if (entry.created_at && entry.completed_at) {
        const created = new Date(entry.created_at);
        const completedTime = new Date(entry.completed_at);
        const waitMinutes = (completedTime.getTime() - created.getTime()) / (1000 * 60);
        totalWaitMinutes += waitMinutes;
        completedCount++;
      }
    });

    const averageWaitTime = completedCount > 0 ? Math.round(totalWaitMinutes / completedCount) : 0;

    const stats: QueueStats = {
      totalWaiting: waiting.length,
      totalInProgress: inProgress.length,
      totalCompleted: completed.length,
      averageWaitTime
    };

    return { success: true, stats };
  } catch (error) {
    const e: any = error;
    const message =
      typeof e === 'string'
        ? e
        : e?.message || e?.error_description || e?.details || e?.hint || 'Failed to fetch queue stats';
    console.error('Error fetching queue stats:', message);
    return { success: false, error: message };
  }
}

/**
 * Get patient's current queue entry
 */
export async function getPatientQueueEntry(
  patientId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<{ success: boolean; entry?: QueueEntry; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('outpatient_queue')
      .select(`
        *,
        patient:patients!outpatient_queue_patient_id_fkey (
          id,
          patient_id,
          name,
          age,
          gender,
          phone,
          date_of_birth,
          primary_complaint,
          consulting_doctor_name
        )
      `)
      .eq('patient_id', patientId)
      .eq('registration_date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

    if (data && data.patient) {
      const entry = {
        ...data,
        patient: {
          ...data.patient,
          name: data.patient.name
        }
      };
      return { success: true, entry };
    }

    return { success: true, entry: undefined };
  } catch (error) {
    console.error('Error fetching patient queue entry:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Remove patient from queue (cancel)
 */
export async function removeFromQueue(
  queueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('outpatient_queue')
      .update({ status: 'cancelled' })
      .eq('id', queueId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing from queue:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get patients pending vitals (registration_status = 'pending_vitals')
 */
export async function getPatientsPendingVitals(
  date?: string
): Promise<{ success: boolean; patients?: any[]; error?: string }> {
  try {
    let query = supabase
      .from('patients')
      .select(`
        *,
        staff:staff_id (
          first_name,
          last_name,
          employee_id
        )
      `)
      .eq('registration_status', 'pending_vitals')
      .eq('admission_type', 'outpatient')
      .order('created_at', { ascending: false });

    if (date) {
      query = query.gte('created_at', `${date}T00:00:00`)
                   .lte('created_at', `${date}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, patients: data || [] };
  } catch (error) {
    console.error('Error fetching patients pending vitals:', error);
    return { success: false, error: (error as Error).message };
  }
}
