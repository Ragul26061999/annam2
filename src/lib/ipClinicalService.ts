import { supabase } from './supabase';

// --- Types ---

export interface IPCaseSheet {
  id: string;
  bed_allocation_id: string;
  patient_id: string;
  case_sheet_date: string;
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
  surgery_date?: string;
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
export async function getIPCaseSheet(bedAllocationId: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('ip_case_sheets')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .eq('case_sheet_date', targetDate)
    .maybeSingle();

  if (error) {
    console.error('Error fetching IP case sheet:', error.message, error.details, error.hint);
    return null;
  }
  return data as IPCaseSheet | null;
}

export async function createOrUpdateIPCaseSheet(
  bedAllocationId: string,
  patientId: string,
  updates: Partial<IPCaseSheet>,
  date?: string
) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  console.log('createOrUpdateIPCaseSheet called with:', {
    bedAllocationId,
    patientId,
    targetDate,
    updates
  });
  
  // First check if it exists for this date
  const existing = await getIPCaseSheet(bedAllocationId, targetDate);
  
  console.log('Existing case sheet:', existing);

  if (existing) {
    console.log('Updating existing case sheet...');
    const { data, error } = await supabase
      .from('ip_case_sheets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    console.log('Update result:', { data, error });

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    return data;
  } else {
    console.log('Creating new case sheet...');
    
    // Filter out undefined/null values from updates
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );
    
    console.log('Filtered updates for insert:', filteredUpdates);
    
    const insertData = {
      bed_allocation_id: bedAllocationId,
      patient_id: patientId,
      case_sheet_date: targetDate,
      ...filteredUpdates
    };
    
    console.log('Final insert data:', insertData);
    
    const { data, error } = await supabase
      .from('ip_case_sheets')
      .insert(insertData)
      .select()
      .single();

    console.log('Insert result:', { data, error });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
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
  entryTime?: string,
  notedAt?: string
): Promise<IPNurseRecord> {
  const { data, error } = await supabase
    .from('ip_nurse_records')
    .insert({
      bed_allocation_id: bedAllocationId,
      remark,
      entry_time: entryTime || new Date().toISOString(),
      noted_at: notedAt || entryTime || new Date().toISOString()
    })
    .select(`
      *,
      creator:users(name)
    `)
    .single();

  if (error) throw error;
  return data;
}

// 4.1 IP Vitals
export async function getIPVitals(bedAllocationId: string, dateFilter?: string) {
  let query = supabase
    .from('ip_vitals')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('recorded_at', { ascending: false });

  if (dateFilter) {
    const start = `${dateFilter}T00:00:00`;
    const end = `${dateFilter}T23:59:59`;
    query = query.gte('recorded_at', start).lte('recorded_at', end);
  }

  const { data, error } = await query;
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
  type: 'doctor_order' | 'nurse_record' | 'progress_note' | 'vital_sign' | 'case_sheet' | 'prescription';
  timestamp: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  metadata?: any;
  creator?: string;
}

export async function getIPClinicalTimeline(bedAllocationId: string, patientId?: string): Promise<Record<string, ClinicalEvent[]>> {
  // Get all case sheets for this bed allocation
  const caseSheets = await supabase
    .from('ip_case_sheets')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('updated_at', { ascending: false });

  const [orders, nurseRecords, notes, vitals] = await Promise.all([
    getIPDoctorOrders(bedAllocationId),
    getIPNurseRecords(bedAllocationId),
    getIPProgressNotes(bedAllocationId),
    getIPVitals(bedAllocationId)
  ]);

  // Get prescriptions if patientId is provided
  let prescriptions = null;
  if (patientId) {
    const { data } = await supabase
      .from('prescriptions')
      .select(`
        *,
        prescription_items (
          *,
          medications (
            id,
            name,
            dosage_form,
            strength
          )
        ),
        creator:users(name)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    prescriptions = data;
  }

  // Get medication administration data for this bed allocation
  const { data: administrationData } = await supabase
    .from('ip_prescription_administration')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .order('administration_date', { ascending: false })
    .order('scheduled_time', { ascending: false });

  const events: ClinicalEvent[] = [];

  // Add case sheet events
  caseSheets.data?.forEach((cs: any) => {
    // Find which fields have content
    const contentFields = [];
    if (cs.present_complaints) contentFields.push(`**Present Complaints:** ${cs.present_complaints}`);
    if (cs.history_present_illness) contentFields.push(`**History:** ${cs.history_present_illness}`);
    if (cs.examination_notes) contentFields.push(`**Examination:** ${cs.examination_notes}`);
    if (cs.provisional_diagnosis) contentFields.push(`**Diagnosis:** ${cs.provisional_diagnosis}`);
    if (cs.treatment_plan) contentFields.push(`**Treatment:** ${cs.treatment_plan}`);
    
    if (contentFields.length > 0) {
      events.push({
        id: cs.id,
        type: 'case_sheet',
        timestamp: cs.updated_at,
        date: cs.case_sheet_date,
        title: 'Case Sheet Updated',
        content: contentFields.join('\n\n'),
        metadata: { 
          case_sheet_date: cs.case_sheet_date,
          present_complaints: cs.present_complaints,
          provisional_diagnosis: cs.provisional_diagnosis,
          treatment_plan: cs.treatment_plan
        },
        creator: cs.created_by ? (cs.creator?.name || 'Medical Staff') : null
      });
    }
  });

  // Add prescription events
  prescriptions?.forEach((p: any) => {
    // Build medication details
    const medicationDetails: string[] = [];
    
    if (p.prescription_items && p.prescription_items.length > 0) {
      p.prescription_items.forEach((item: any) => {
        const med = item.medications;
        const medName = med?.name || 'Medication name not available';
        const dosage = item.dosage || med?.strength || '';
        const frequency = item.frequency || '';
        const duration = item.duration || '';
        const quantity = item.quantity || '';
        
        let medInfo = `**${medName}**`;
        if (dosage) medInfo += ` - ${dosage}`;
        if (frequency) medInfo += `\nFrequency: ${frequency}`;
        if (duration) medInfo += `\nDuration: ${duration}`;
        if (quantity) medInfo += `\nQuantity: ${quantity}`;
        
        medicationDetails.push(medInfo);
      });
    }
    
    // Get administration status for this prescription
    const adminStatus: string[] = [];
    if (administrationData && administrationData.length > 0) {
      const todayAdmin = administrationData.filter((admin: any) => 
        admin.administration_date === p.created_at.split('T')[0]
      );
      
      const administered = todayAdmin.filter((admin: any) => admin.status === 'administered').length;
      const refused = todayAdmin.filter((admin: any) => admin.status === 'refused').length;
      const skipped = todayAdmin.filter((admin: any) => admin.status === 'skipped').length;
      
      if (administered > 0) adminStatus.push(`✅ Administered: ${administered}`);
      if (refused > 0) adminStatus.push(`❌ Refused: ${refused}`);
      if (skipped > 0) adminStatus.push(`⏭️ Skipped: ${skipped}`);
    }
    
    const content = [
      `Prescription ID: ${p.prescription_id}`,
      `Status: ${p.status}`,
      medicationDetails.length > 0 ? medicationDetails.join('\n\n') : 'No medication items found',
      adminStatus.length > 0 ? `\n**Today's Administration:**\n${adminStatus.join(' | ')}` : ''
    ].filter(Boolean).join('\n\n');
    
    events.push({
      id: p.id,
      type: 'prescription',
      timestamp: p.created_at,
      date: p.created_at.split('T')[0],
      title: 'Prescription',
      content: content,
      metadata: { 
        prescription_id: p.prescription_id,
        status: p.status,
        issue_date: p.issue_date,
        medications: p.prescription_items?.map((item: any) => item.medications?.name).filter(Boolean) || [],
        administration_status: adminStatus.join(' | ')
      },
      creator: p.created_by ? (p.creator?.name || 'Prescribing Doctor') : null
    });
  });

  orders?.forEach((o: any) => {
    events.push({
      id: o.id,
      type: 'doctor_order',
      timestamp: o.order_date,
      date: o.order_date.split('T')[0],
      title: 'Doctor Order',
      content: o.assessment || 'No assessment details provided',
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
