import { supabase } from './supabase';

// Simplified interfaces for the new single vitals table
export interface VitalSigns {
  patientId: string;
  recordedBy?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  painScale?: number;
  bloodGlucose?: number;
  notes?: string;
  recordedAt?: string;
}

export interface VitalRecord {
  id: string;
  patient_id: string;
  recorded_by: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  pain_scale?: number;
  blood_glucose?: number;
  notes?: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  
  // Related data
  patient?: { patient_id: string; name: string };
  recorded_by_user?: { name: string };
}

// Record new vitals
export async function recordVitals(vitalsData: VitalSigns): Promise<VitalRecord> {
  try {
    console.log('recordVitals called with:', vitalsData);
    
    // Convert patient display ID to UUID if needed
    let actualPatientId = vitalsData.patientId;
    
    if (!vitalsData.patientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', vitalsData.patientId)
        .single();
      
      if (patientError || !patient) {
        throw new Error(`Patient not found: ${vitalsData.patientId}`);
      }
      
      actualPatientId = patient.id;
    }

    // Validate recorded_by field - it must be a valid user ID
    if (!vitalsData.recordedBy) {
      console.error('No recordedBy provided:', vitalsData.recordedBy);
      
      // Try to get a default user (first doctor or admin)
      const { data: defaultUser } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['doctor', 'md', 'admin'])
        .limit(1)
        .single();
      
      if (defaultUser) {
        console.log('Using default user:', defaultUser);
        vitalsData.recordedBy = defaultUser.id;
      } else {
        throw new Error('No valid user found to record vitals. Please ensure you are logged in.');
      }
    }

    console.log('Checking if user exists with ID:', vitalsData.recordedBy);
    
    // Verify the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', vitalsData.recordedBy)
      .single();

    console.log('User lookup result:', { user, userError });

    if (userError || !user) {
      console.error('User validation failed:', { userError, user });
      
      // Try to get a default user as fallback
      const { data: fallbackUser } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['doctor', 'md', 'admin'])
        .limit(1)
        .single();
      
      if (fallbackUser) {
        console.log('Using fallback user:', fallbackUser);
        vitalsData.recordedBy = fallbackUser.id;
      } else {
        throw new Error(`No valid users found in the system. Please contact administrator.`);
      }
    } else {
      console.log('User validated successfully:', user);
    }

    // Get the current encounter for the patient
    const { data: encounter, error: encounterError } = await supabase
      .from('encounter')
      .select('id')
      .eq('patient_id', actualPatientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (encounterError || !encounter) {
      throw new Error(`No active encounter found for patient: ${vitalsData.patientId}`);
    }

    const vitalRecord = {
      patient_id: actualPatientId,
      encounter_id: encounter.id,
      recorded_by: vitalsData.recordedBy,
      blood_pressure_systolic: vitalsData.bloodPressureSystolic,
      blood_pressure_diastolic: vitalsData.bloodPressureDiastolic,
      heart_rate: vitalsData.heartRate,
      temperature: vitalsData.temperature,
      respiratory_rate: vitalsData.respiratoryRate,
      oxygen_saturation: vitalsData.oxygenSaturation,
      weight: vitalsData.weight,
      height: vitalsData.height,
      pain_scale: vitalsData.painScale,
      blood_glucose: vitalsData.bloodGlucose,
      notes: vitalsData.notes,
      recorded_at: vitalsData.recordedAt || new Date().toISOString()
    };

    console.log('Inserting vital record:', vitalRecord);

    const { data, error } = await supabase
      .from('vitals')
      .insert(vitalRecord)
      .select('*')
      .single();

    console.log('Insert result:', { data, error });

    if (error) {
      console.error('Database insert error:', error);
      throw new Error(`Failed to record vitals: ${error.message}`);
    }

    // Fetch related data
    const [patientData, userData] = await Promise.all([
      supabase.from('patients').select('patient_id, name').eq('id', data.patient_id).single(),
      supabase.from('users').select('name').eq('id', data.recorded_by).single()
    ]);

    return {
      ...data,
      patient: patientData.data,
      recorded_by_user: userData.data
    };
  } catch (error) {
    console.error('Error in recordVitals:', error);
    throw error;
  }
}

// Get patient vitals history
export async function getPatientVitals(patientId: string): Promise<VitalRecord[]> {
  try {
    // Convert patient display ID to UUID if needed
    let actualPatientId = patientId;
    
    if (!patientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', patientId)
        .single();
      
      if (patientError || !patient) {
        return [];
      }
      
      actualPatientId = patient.id;
    }

    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', actualPatientId)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching patient vitals:', error);
      throw new Error(`Failed to fetch patient vitals: ${error.message}`);
    }

    // Fetch related data for each record
    const vitalsWithRelations = await Promise.all(
      data.map(async (vital) => {
        const [patientData, userData] = await Promise.all([
          supabase.from('patients').select('patient_id, name').eq('id', vital.patient_id).single(),
          supabase.from('users').select('name').eq('id', vital.recorded_by).single()
        ]);

        return {
          ...vital,
          patient: patientData.data,
          recorded_by_user: userData.data
        };
      })
    );

    return vitalsWithRelations;
  } catch (error) {
    console.error('Error in getPatientVitals:', error);
    throw error;
  }
}

// Get latest vitals for a patient
export async function getLatestVitals(patientId: string): Promise<VitalRecord | null> {
  try {
    // Convert patient display ID to UUID if needed
    let actualPatientId = patientId;
    
    if (!patientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', patientId)
        .single();
      
      if (patientError || !patient) {
        return null;
      }
      
      actualPatientId = patient.id;
    }

    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', actualPatientId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No records found
      }
      console.error('Error fetching latest vitals:', error);
      throw new Error(`Failed to fetch latest vitals: ${error.message}`);
    }

    // Fetch related data
    const [patientData, userData] = await Promise.all([
      supabase.from('patients').select('patient_id, name').eq('id', data.patient_id).single(),
      supabase.from('users').select('name').eq('id', data.recorded_by).single()
    ]);

    return {
      ...data,
      patient: patientData.data,
      recorded_by_user: userData.data
    };
  } catch (error) {
    console.error('Error in getLatestVitals:', error);
    throw error;
  }
}

// Update vital record
export async function updateVitalRecord(vitalId: string, updates: Partial<VitalSigns>): Promise<VitalRecord> {
  try {
    const updateData = {
      blood_pressure_systolic: updates.bloodPressureSystolic,
      blood_pressure_diastolic: updates.bloodPressureDiastolic,
      heart_rate: updates.heartRate,
      temperature: updates.temperature,
      respiratory_rate: updates.respiratoryRate,
      oxygen_saturation: updates.oxygenSaturation,
      weight: updates.weight,
      height: updates.height,
      pain_scale: updates.painScale,
      blood_glucose: updates.bloodGlucose,
      notes: updates.notes,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('vitals')
      .update(updateData)
      .eq('id', vitalId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating vital record:', error);
      throw new Error(`Failed to update vital record: ${error.message}`);
    }

    // Fetch related data
    const [patientData, userData] = await Promise.all([
      supabase.from('patients').select('patient_id, name').eq('id', data.patient_id).single(),
      supabase.from('users').select('name').eq('id', data.recorded_by).single()
    ]);

    return {
      ...data,
      patient: patientData.data,
      recorded_by_user: userData.data
    };
  } catch (error) {
    console.error('Error in updateVitalRecord:', error);
    throw error;
  }
}

// Delete vital record
export async function deleteVitalRecord(vitalId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('vitals')
      .delete()
      .eq('id', vitalId);

    if (error) {
      console.error('Error deleting vital record:', error);
      throw new Error(`Failed to delete vital record: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteVitalRecord:', error);
    throw error;
  }
}

// Get vitals summary for dashboard
export async function getVitalsSummary(patientId: string): Promise<{
  latestVitals: VitalRecord | null;
  totalReadings: number;
  lastRecordedAt: string | null;
}> {
  try {
    // Convert patient display ID to UUID if needed
    let actualPatientId = patientId;
    
    if (!patientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', patientId)
        .single();
      
      if (patientError || !patient) {
        return { latestVitals: null, totalReadings: 0, lastRecordedAt: null };
      }
      
      actualPatientId = patient.id;
    }

    const [latestVitals, countResult] = await Promise.all([
      getLatestVitals(patientId),
      supabase.from('vitals').select('*', { count: 'exact', head: true }).eq('patient_id', actualPatientId)
    ]);

    return {
      latestVitals,
      totalReadings: countResult.count || 0,
      lastRecordedAt: latestVitals?.recorded_at || null
    };
  } catch (error) {
    console.error('Error in getVitalsSummary:', error);
    return { latestVitals: null, totalReadings: 0, lastRecordedAt: null };
  }
}