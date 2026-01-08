import { supabase } from './supabase';

// --- Types ---

export interface IPCaseSheet {
  id: string;
  bed_allocation_id: string;
  patient_id: string;
  present_complaints?: string;
  history_present_illness?: string;
  past_history?: string;
  family_history?: string;
  personal_history?: string;
  examination_notes?: string;
  provisional_diagnosis?: string;
  investigation_summary?: string;
  treatment_plan?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface IPProgressNote {
  id: string;
  bed_allocation_id: string;
  note_date: string;
  content: string;
  created_by?: string;
  created_at: string;
}

export interface IPDoctorOrder {
  id: string;
  bed_allocation_id: string;
  order_date: string;
  assessment?: string;
  treatment_instructions?: string;
  investigation_instructions?: string;
  created_by?: string;
  created_at: string;
}

export interface IPNurseRecord {
  id: string;
  bed_allocation_id: string;
  entry_time: string;
  remark: string;
  created_by?: string;
  created_at: string;
}

export interface IPVital {
  id: string;
  bed_allocation_id: string;
  recorded_at: string;
  temperature?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse?: number;
  respiratory_rate?: number;
  spo2?: number;
  sugar_level?: number;
  sugar_type?: string;
  consciousness_level?: string;
  urine_output?: number;
  intake_fluids?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  creator?: { name: string };
}

export interface IPDischargeSummary {
  id: string;
  bed_allocation_id: string;
  consultant_name?: string;
  admission_date?: string;
  discharge_date?: string;
  presenting_complaint?: string;
  physical_findings?: string;
  investigations?: string;
  final_diagnosis?: string;
  treatment_given?: string;
  condition_at_discharge?: string;
  follow_up_advice?: string;
  review_date?: string;
  status: 'draft' | 'final';
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// --- Services ---

// 1. IP Case Sheet
export async function getIPCaseSheet(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('ip_case_sheets')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching IP case sheet:', error);
    return null;
  }
  return data as IPCaseSheet | null;
}

export async function createOrUpdateIPCaseSheet(
  bedAllocationId: string,
  patientId: string,
  updates: Partial<IPCaseSheet>
) {
  // First check if it exists
  const existing = await getIPCaseSheet(bedAllocationId);

  if (existing) {
    const { data, error } = await supabase
      .from('ip_case_sheets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('ip_case_sheets')
      .insert({
        bed_allocation_id: bedAllocationId,
        patient_id: patientId,
        ...updates
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// 2. IP Progress Notes
export async function getIPProgressNotes(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('ip_progress_notes')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('note_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createIPProgressNote(
  bedAllocationId: string,
  content: string,
  noteDate: string
) {
  const { data, error } = await supabase
    .from('ip_progress_notes')
    .insert({
      bed_allocation_id: bedAllocationId,
      content,
      note_date: noteDate
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. IP Doctor Orders
export async function getIPDoctorOrders(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('ip_doctor_orders')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createIPDoctorOrder(
  bedAllocationId: string,
  order: {
    order_date: string;
    assessment: string;
    treatment_instructions: string;
    investigation_instructions: string;
  }
) {
  const { data, error } = await supabase
    .from('ip_doctor_orders')
    .insert({
      bed_allocation_id: bedAllocationId,
      ...order
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4. IP Nurse Records
export async function getIPNurseRecords(bedAllocationId: string, dateFilter?: string) {
  let query = supabase
    .from('ip_nurse_records')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('entry_time', { ascending: false });

  if (dateFilter) {
    // Assuming dateFilter is YYYY-MM-DD
    const start = `${dateFilter}T00:00:00`;
    const end = `${dateFilter}T23:59:59`;
    query = query.gte('entry_time', start).lte('entry_time', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createIPNurseRecord(
  bedAllocationId: string,
  remark: string,
  entryTime: string
) {
  const { data, error } = await supabase
    .from('ip_nurse_records')
    .insert({
      bed_allocation_id: bedAllocationId,
      remark,
      entry_time: entryTime
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4.1 IP Vitals
export async function getIPVitals(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('ip_vitals')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return data as IPVital[];
}

export async function createIPVital(
  bedAllocationId: string,
  vitals: Partial<IPVital>
) {
  const { data, error } = await supabase
    .from('ip_vitals')
    .insert({
      bed_allocation_id: bedAllocationId,
      ...vitals
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 5. IP Discharge Summary
export async function getIPDischargeSummary(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('ip_discharge_summaries')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching discharge summary:', error);
    return null;
  }
  return data as IPDischargeSummary | null;
}

export async function createOrUpdateIPDischargeSummary(
  bedAllocationId: string,
  updates: Partial<IPDischargeSummary>
) {
  const existing = await getIPDischargeSummary(bedAllocationId);

  if (existing) {
    const { data, error } = await supabase
      .from('ip_discharge_summaries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('ip_discharge_summaries')
      .insert({
        bed_allocation_id: bedAllocationId,
        ...updates
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// --- Timeline Service ---

export interface ClinicalEvent {
  id: string;
  type: 'doctor_order' | 'nurse_record' | 'progress_note' | 'vital_sign';
  timestamp: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  metadata?: any;
  creator?: string;
}

export async function getIPClinicalTimeline(bedAllocationId: string): Promise<Record<string, ClinicalEvent[]>> {
  const [orders, nurseRecords, notes, vitals] = await Promise.all([
    getIPDoctorOrders(bedAllocationId),
    getIPNurseRecords(bedAllocationId),
    getIPProgressNotes(bedAllocationId),
    getIPVitals(bedAllocationId)
  ]);

  const events: ClinicalEvent[] = [];

  orders?.forEach((o: any) => {
    events.push({
      id: o.id,
      type: 'doctor_order',
      timestamp: o.order_date,
      date: o.order_date.split('T')[0],
      title: 'Doctor Order',
      content: o.assessment || 'No assessment',
      metadata: { treatment: o.treatment_instructions, investigation: o.investigation_instructions },
      creator: o.creator?.name
    });
  });

  nurseRecords?.forEach((n: any) => {
    events.push({
      id: n.id,
      type: 'nurse_record',
      timestamp: n.entry_time,
      date: n.entry_time.split('T')[0],
      title: 'Nurse Record',
      content: n.remark,
      creator: n.creator?.name
    });
  });

  notes?.forEach((n: any) => {
    events.push({
      id: n.id,
      type: 'progress_note',
      timestamp: n.note_date,
      date: n.note_date.split('T')[0],
      title: 'Progress Note',
      content: n.content,
      creator: n.creator?.name
    });
  });

  vitals?.forEach((v: any) => {
    // Format vitals summary
    const parts = [];
    if (v.bp_systolic && v.bp_diastolic) parts.push(`BP: ${v.bp_systolic}/${v.bp_diastolic}`);
    if (v.pulse) parts.push(`Pulse: ${v.pulse}`);
    if (v.temperature) parts.push(`Temp: ${v.temperature}°F`);
    if (v.spo2) parts.push(`SpO2: ${v.spo2}%`);
    
    events.push({
      id: v.id,
      type: 'vital_sign',
      timestamp: v.recorded_at,
      date: v.recorded_at.split('T')[0],
      title: 'Vital Signs',
      content: parts.join(' | ') + (v.notes ? `\nNote: ${v.notes}` : ''),
      metadata: v,
      creator: v.creator?.name
    });
  });

  // Sort by timestamp desc
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Group by date
  const grouped: Record<string, ClinicalEvent[]> = {};
  events.forEach(event => {
    if (!grouped[event.date]) grouped[event.date] = [];
    grouped[event.date].push(event);
  });

  return grouped;
}
