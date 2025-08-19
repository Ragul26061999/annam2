import { supabase } from './supabase';

export interface ConsultationData {
  appointmentId: string;
  diagnosis: string;
  treatmentPlan: string;
  medications: Medication[];
  followUpDate?: string;
  followUpNotes?: string;
  doctorNotes: string;
  vitalSigns?: {
    bloodPressure?: string;
    temperature?: string;
    heartRate?: string;
    weight?: string;
    height?: string;
  };
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Consultation {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  diagnosis: string;
  treatment_plan: string;
  doctor_notes?: string;
  vital_signs?: any;
  follow_up_date?: string;
  follow_up_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  consultation_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  created_at: string;
}

/**
 * Save consultation data to the database
 */
export async function saveConsultation(consultationData: ConsultationData, doctorId: string): Promise<{ consultation: Consultation; prescriptions: Prescription[] }> {
  try {
    // First, get the appointment to get patient_id
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('id', consultationData.appointmentId)
      .single();

    if (appointmentError) {
      throw new Error(`Failed to fetch appointment: ${appointmentError.message}`);
    }

    // Save consultation record
    const consultationRecord = {
      appointment_id: consultationData.appointmentId,
      doctor_id: doctorId,
      patient_id: appointment.patient_id,
      diagnosis: consultationData.diagnosis,
      treatment_plan: consultationData.treatmentPlan,
      doctor_notes: consultationData.doctorNotes,
      vital_signs: consultationData.vitalSigns,
      follow_up_date: consultationData.followUpDate || null,
      follow_up_notes: consultationData.followUpNotes || null,
    };

    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .insert(consultationRecord)
      .select()
      .single();

    if (consultationError) {
      throw new Error(`Failed to save consultation: ${consultationError.message}`);
    }

    // Save prescriptions if any
    let prescriptions: Prescription[] = [];
    if (consultationData.medications && consultationData.medications.length > 0) {
      const prescriptionRecords = consultationData.medications.map(med => ({
        consultation_id: consultation.id,
        medication_name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions || null,
      }));

      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert(prescriptionRecords)
        .select();

      if (prescriptionError) {
        throw new Error(`Failed to save prescriptions: ${prescriptionError.message}`);
      }

      prescriptions = prescriptionData || [];
    }

    // Update appointment status to completed
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status: 'completed',
        diagnosis: consultationData.diagnosis,
        treatment_plan: consultationData.treatmentPlan,
        notes: consultationData.doctorNotes
      })
      .eq('id', consultationData.appointmentId);

    if (updateError) {
      throw new Error(`Failed to update appointment: ${updateError.message}`);
    }

    return { consultation, prescriptions };
  } catch (error) {
    console.error('Error saving consultation:', error);
    throw error;
  }
}

/**
 * Get consultation history for a patient
 */
export async function getPatientConsultations(patientId: string): Promise<Consultation[]> {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        appointments!inner(
          appointment_date,
          appointment_time
        ),
        users!consultations_doctor_id_fkey(
          name
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch consultations: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching patient consultations:', error);
    throw error;
  }
}

/**
 * Get prescriptions for a consultation
 */
export async function getConsultationPrescriptions(consultationId: string): Promise<Prescription[]> {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    throw error;
  }
}

/**
 * Get consultation details by ID
 */
export async function getConsultationById(consultationId: string): Promise<Consultation | null> {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select(`
        *,
        appointments!inner(
          appointment_date,
          appointment_time,
          chief_complaint
        ),
        users!consultations_doctor_id_fkey(
          name
        ),
        users!consultations_patient_id_fkey(
          name,
          email,
          phone
        )
      `)
      .eq('id', consultationId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch consultation: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching consultation:', error);
    throw error;
  }
}

/**
 * Update consultation record
 */
export async function updateConsultation(consultationId: string, updates: Partial<ConsultationData>): Promise<Consultation> {
  try {
    const updateData: any = {};
    
    if (updates.diagnosis) updateData.diagnosis = updates.diagnosis;
    if (updates.treatmentPlan) updateData.treatment_plan = updates.treatmentPlan;
    if (updates.doctorNotes) updateData.doctor_notes = updates.doctorNotes;
    if (updates.vitalSigns) updateData.vital_signs = updates.vitalSigns;
    if (updates.followUpDate) updateData.follow_up_date = updates.followUpDate;
    if (updates.followUpNotes) updateData.follow_up_notes = updates.followUpNotes;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', consultationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update consultation: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error updating consultation:', error);
    throw error;
  }
}

/**
 * Create follow-up appointment
 */
export async function createFollowUpAppointment(
  consultationId: string,
  followUpDate: string,
  notes?: string
): Promise<any> {
  try {
    // Get consultation details
    const consultation = await getConsultationById(consultationId);
    if (!consultation) {
      throw new Error('Consultation not found');
    }

    // Create new appointment
    const appointmentData = {
      patient_id: consultation.patient_id,
      doctor_id: consultation.doctor_id,
      appointment_date: followUpDate,
      appointment_time: '10:00', // Default time, can be customized
      type: 'follow-up',
      status: 'scheduled',
      chief_complaint: `Follow-up for consultation on ${new Date(consultation.created_at).toLocaleDateString()}`,
      notes: notes || consultation.follow_up_notes,
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create follow-up appointment: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating follow-up appointment:', error);
    throw error;
  }
}

/**
 * Get doctor's consultation statistics
 */
export async function getDoctorConsultationStats(doctorId: string, dateRange?: { start: string; end: string }) {
  try {
    let query = supabase
      .from('consultations')
      .select('id, created_at, follow_up_date')
      .eq('doctor_id', doctorId);

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch consultation stats: ${error.message}`);
    }

    const totalConsultations = data?.length || 0;
    const followUpsScheduled = data?.filter(c => c.follow_up_date).length || 0;
    const todayConsultations = data?.filter(c => 
      new Date(c.created_at).toDateString() === new Date().toDateString()
    ).length || 0;

    return {
      totalConsultations,
      followUpsScheduled,
      todayConsultations,
      averagePerDay: dateRange ? totalConsultations / 30 : 0 // Assuming 30-day range
    };
  } catch (error) {
    console.error('Error fetching consultation stats:', error);
    throw error;
  }
}