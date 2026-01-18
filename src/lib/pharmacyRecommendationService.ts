import { supabase } from './supabase';

 function describeSupabaseError(err: any): string {
   if (!err) return 'Unknown error';
   if (typeof err === 'string') return err;
   if (err instanceof Error && err.message) return err.message;

   try {
     const props = Object.getOwnPropertyNames(err).reduce<Record<string, any>>((acc, key) => {
       acc[key] = (err as any)[key];
       return acc;
     }, {});
     const json = JSON.stringify(props);
     return json === '{}' ? String(err) : json;
   } catch {
     return String(err);
   }
 }

 function toServiceError(context: string, err: any): Error {
   const message = describeSupabaseError(err);
   const wrapped = new Error(`${context}: ${message}`);
   (wrapped as any).cause = err;
   return wrapped;
 }

 function isUuid(value: string): boolean {
   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
 }

export interface MedicationRecommendation {
  id: string;
  patient_id: string;
  medication_id: string;
  medication_name: string;
  generic_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  reason_for_recommendation: string;
  recommended_by: string;
  recommendation_date: string;
  status: 'pending' | 'approved' | 'dispensed' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface IPatientRecommendationRequest {
  patient_id: string;
  diagnosis: string;
  allergies: string[];
  current_medications: string[];
  vital_signs?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    weight?: number;
  };
  lab_results?: {
    blood_sugar?: number;
    creatinine?: number;
    liver_function?: string;
  };
}

export interface RecommendationRule {
  id: string;
  rule_name: string;
  condition: string;
  medication_recommendations: {
    medication_id: string;
    dosage: string;
    frequency: string;
    duration: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  contraindications: string[];
  notes: string;
  is_active: boolean;
}

// Get medication recommendations for IP patient based on clinical data
export async function getIPatientMedicationRecommendations(
  request: IPatientRecommendationRequest
): Promise<MedicationRecommendation[]> {
  try {
    const recommendations: MedicationRecommendation[] = [];

    // Note: recommendation rules table is not present in current schema.
    // We only generate standard prophylactic recommendations.

    // Add standard prophylactic medications for IP patients
    const prophylacticMeds = await getProphylacticMedications(request);
    recommendations.push(...prophylacticMeds);

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[getRecommendationPriority(a)] - priorityOrder[getRecommendationPriority(b)];
    });
  } catch (error) {
    console.error('Error in getIPatientMedicationRecommendations:', error);
    throw error;
  }
}

// Get standard prophylactic medications for IP patients
async function getProphylacticMedications(
  request: IPatientRecommendationRequest
): Promise<MedicationRecommendation[]> {
  const recommendations: MedicationRecommendation[] = [];

  try {
    // Standard IP medications (examples)
    const standardIPMeds = [
      {
        condition: 'all',
        medication_name: 'Vitamin B Complex',
        dosage: '1 tablet',
        frequency: 'once daily',
        duration: '7 days',
        reason: 'Nutritional support for hospitalized patients'
      },
      {
        condition: 'all',
        medication_name: 'Pantoprazole',
        dosage: '40 mg',
        frequency: 'once daily',
        duration: 'hospital stay',
        reason: 'Stress ulcer prophylaxis'
      }
    ];

    for (const med of standardIPMeds) {
      if (med.condition === 'all' || request.diagnosis.toLowerCase().includes(med.condition)) {
        const { data: medication } = await supabase
          .from('medications')
          .select('*')
          .ilike('name', `%${med.medication_name}%`)
          .limit(1)
          .single();

        if (medication) {
          recommendations.push({
            id: crypto.randomUUID(),
            patient_id: request.patient_id,
            medication_id: medication.id,
            medication_name: medication.name,
            generic_name: medication.generic_name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            quantity: calculateQuantity(med.dosage, med.frequency, med.duration),
            instructions: generateInstructions(medication, med),
            reason_for_recommendation: med.reason,
            recommended_by: 'system',
            recommendation_date: new Date().toISOString().split('T')[0],
            status: 'pending'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error getting prophylactic medications:', error);
  }

  return recommendations;
}

// Calculate medication quantity based on dosage, frequency, and duration
function calculateQuantity(dosage: string, frequency: string, duration: string): number {
  try {
    // Parse frequency to get daily doses
    let dailyDoses = 1;
    if (frequency.includes('twice') || frequency.includes('bid')) dailyDoses = 2;
    if (frequency.includes('thrice') || frequency.includes('tid')) dailyDoses = 3;
    if (frequency.includes('four') || frequency.includes('qid')) dailyDoses = 4;

    // Parse duration to get days
    let days = 1;
    if (duration.includes('hospital stay')) days = 7; // Default for hospital stay
    else if (duration.includes('days')) {
      const match = duration.match(/(\d+)/);
      days = match ? parseInt(match[1]) : 1;
    } else if (duration.includes('week')) {
      days = 7;
    }

    return dailyDoses * days;
  } catch (error) {
    console.error('Error calculating quantity:', error);
    return 1;
  }
}

// Generate medication instructions
function generateInstructions(medication: any, recommendation: any): string {
  let instructions = '';

  // Add food instructions based on medication type
  if (medication.name.toLowerCase().includes('pantoprazole') || 
      medication.name.toLowerCase().includes('omeprazole')) {
    instructions += 'Take before food. ';
  } else if (medication.name.toLowerCase().includes('metformin')) {
    instructions += 'Take with or after food. ';
  }

  // Add specific instructions based on dosage form
  if (medication.dosage_form === 'injection') {
    instructions += 'For injection use only. ';
  } else if (medication.dosage_form === 'syrup') {
    instructions += 'Shake well before use. ';
  }

  return instructions || 'Take as prescribed.';
}

// Get recommendation priority
function getRecommendationPriority(rec: MedicationRecommendation): 'high' | 'medium' | 'low' {
  if (rec.reason_for_recommendation.includes('prophylaxis')) return 'low';
  if (rec.reason_for_recommendation.includes('support')) return 'medium';
  return 'high';
}

// Save medication recommendations for patient
export async function saveMedicationRecommendations(
  recommendations: MedicationRecommendation[]
): Promise<void> {
  try {
    const payload = recommendations.map(rec => ({
      patient_id: rec.patient_id,
      medication_id: rec.medication_id || null,
      medication_name: rec.medication_name,
      dosage: rec.dosage || null,
      frequency: rec.frequency || null,
      duration: rec.duration || null,
      quantity: rec.quantity ?? 1,
      instructions: rec.instructions || null,
      prescribed_by: rec.approved_by || null,
      status: rec.status === 'rejected' ? 'cancelled' : rec.status,
      notes: rec.notes || rec.reason_for_recommendation || null
    }));

    const { error } = await supabase
      .from('ip_pharmacy_recommendations')
      .insert(payload);

    if (error) {
      console.error('Error saving recommendations:', error);
      throw toServiceError('Error saving recommendations', error);
    }
  } catch (error) {
    console.error('Error in saveMedicationRecommendations:', error);
    throw toServiceError('Error in saveMedicationRecommendations', error);
  }
}

// Get existing recommendations for patient
export async function getPatientMedicationRecommendations(
  patientId: string
): Promise<MedicationRecommendation[]> {
  try {
    if (!patientId || !isUuid(patientId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('ip_pharmacy_recommendations')
      .select('*')
      .eq('patient_id', patientId)
      .order('prescribed_at', { ascending: false });

    if (error) {
      console.error('Error fetching recommendations:', error);
      throw toServiceError('Error fetching recommendations', error);
    }

    const mapped: MedicationRecommendation[] = (data || []).map((row: any) => {
      const rawStatus = String(row.status || 'pending');
      const status: MedicationRecommendation['status'] =
        rawStatus === 'cancelled' ? 'rejected' :
        rawStatus === 'dispensed' ? 'dispensed' :
        rawStatus === 'approved' ? 'approved' :
        'pending';

      return {
        id: row.id,
        patient_id: row.patient_id,
        medication_id: row.medication_id || '',
        medication_name: row.medication_name,
        generic_name: '',
        dosage: row.dosage || '',
        frequency: row.frequency || '',
        duration: row.duration || '',
        quantity: row.quantity ?? 1,
        instructions: row.instructions || '',
        reason_for_recommendation: row.notes || '',
        recommended_by: row.prescribed_by || 'system',
        recommendation_date: row.prescribed_at ? String(row.prescribed_at).split('T')[0] : new Date().toISOString().split('T')[0],
        status,
        approved_by: row.prescribed_by || undefined,
        approved_at: row.prescribed_at || undefined,
        notes: row.notes || undefined
      };
    });

    return mapped;
  } catch (error) {
    console.error('Error in getPatientMedicationRecommendations:', error);
    throw toServiceError('Error in getPatientMedicationRecommendations', error);
  }
}

// Update recommendation status
export async function updateRecommendationStatus(
  recommendationId: string,
  status: 'pending' | 'approved' | 'dispensed' | 'rejected',
  approvedBy?: string,
  notes?: string
): Promise<void> {
  try {
    const updateData: any = {
      status: status === 'rejected' ? 'cancelled' : status
    };
    if (approvedBy) updateData.edited_by = approvedBy;
    if (approvedBy) updateData.edited_at = new Date().toISOString();
    if (notes) updateData.notes = notes;

    const { error } = await supabase
      .from('ip_pharmacy_recommendations')
      .update(updateData)
      .eq('id', recommendationId);

    if (error) {
      console.error('Error updating recommendation:', error);
      throw toServiceError('Error updating recommendation', error);
    }
  } catch (error) {
    console.error('Error in updateRecommendationStatus:', error);
    throw toServiceError('Error in updateRecommendationStatus', error);
  }
}

// Convert approved recommendations to prescriptions
export async function convertRecommendationsToPrescription(
  patientId: string,
  doctorId: string,
  recommendationIds: string[]
): Promise<void> {
  try {
    // Get recommendations
    const { data: recommendations, error: fetchError } = await supabase
      .from('medication_recommendations')
      .select('*')
      .eq('patient_id', patientId)
      .in('id', recommendationIds)
      .eq('status', 'approved');

    if (fetchError) {
      console.error('Error fetching recommendations:', fetchError);
      throw fetchError;
    }

    // Create prescriptions
    const prescriptions = recommendations?.map((rec: any) => ({
      patient_id: patientId,
      doctor_id: doctorId,
      medication_name: rec.medication_name,
      generic_name: rec.generic_name,
      dosage: rec.dosage,
      frequency: rec.frequency,
      duration: rec.duration,
      quantity: rec.quantity,
      instructions: rec.instructions,
      status: 'active',
      prescribed_date: new Date().toISOString().split('T')[0],
      start_date: new Date().toISOString().split('T')[0]
    })) || [];

    if (prescriptions.length > 0) {
      const { error: insertError } = await supabase
        .from('prescriptions')
        .insert(prescriptions);

      if (insertError) {
        console.error('Error creating prescriptions:', insertError);
        throw insertError;
      }

      // Update recommendation status
      await updateRecommendationStatus(recommendationIds[0], 'dispensed', doctorId);
    }
  } catch (error) {
    console.error('Error in convertRecommendationsToPrescription:', error);
    throw error;
  }
}
