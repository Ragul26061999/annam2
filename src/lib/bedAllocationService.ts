import { supabase } from './supabase';

// Types for bed allocation management
export interface BedAllocationData {
  patientId: string;
  bedId: string;
  doctorId?: string;
  admissionDate: string;
  admissionType: 'emergency' | 'elective' | 'scheduled' | 'referred' | 'transfer' | 'inpatient' | 'outpatient';
  reason: string;
  staffId?: string;
  admissionCategory?: string;
  ipNumber?: string; // New field for Inpatient Number
}

export interface BedAllocation {
  id: string;
  patient_id: string;
  bed_id: string;
  doctor_id: string;
  allocated_at: string;
  discharged_at?: string;
  reason: string;
  status: string;
  allocated_by: string;
  ip_number?: string; // Add this
  created_at: string;
  updated_at: string;
  // ...
  patient: {
    name: string;
    uhid: string;
    age?: number;
    gender?: string;
    diagnosis?: string;
    is_critical?: boolean;
    phone?: string;
  };
  bed: Bed;
  doctor: {
    license_number: string;
    name: string;
  };
  staff?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export interface Bed {
  id: string;
  bed_number: string;
  room_number: string;
  bed_type: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  department_id?: string;
  floor_number?: number;
  daily_rate?: number;
  features?: string[];
}

export interface BedStats {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  reserved: number;
  occupancyRate: number;
}

/**
 * Generate a unique IP Number (Inpatient Number)
 * Format: IP{Year}{Month}{XXXX} where XXXX is sequential
 */
export async function getNextIPNumber(): Promise<string> {
  const now = new Date();
  const yearTwoDigits = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `IP${yearTwoDigits}${month}`;

  try {
    const { data, error } = await supabase
      .from('bed_allocations')
      .select('ip_number')
      .like('ip_number', `${prefix}%`)
      .order('ip_number', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Error fetching last IP number:', error);
      return `${prefix}0001`;
    }

    if (data && data.length > 0 && data[0].ip_number) {
      const lastNumber = parseInt(data[0].ip_number.slice(prefix.length));
      const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
      return `${prefix}${nextNumber}`;
    }

    return `${prefix}0001`;
  } catch (error) {
    console.error('Error in getNextIPNumber:', error);
    return `${prefix}0001`;
  }
}

/**
 * Generate a unique bed allocation ID
 * Format: BA{Year}{Month}{Day}{Sequential}
 * Example: BA202501150001
 */
export async function generateAllocationId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  try {
    // Get count of existing allocations for today
    const { count, error } = await supabase
      .from('bed_allocations')
      .select('id', { count: 'exact', head: true })
      .like('allocation_id', `BA${datePrefix}%`);

    if (error) {
      console.warn('Error getting allocation count:', error);
      const timestamp = now.getTime().toString().slice(-4);
      return `BA${datePrefix}${timestamp}`;
    }

    const sequence = ((count || 0) + 1).toString().padStart(4, '0');
    return `BA${datePrefix}${sequence}`;
  } catch (error) {
    console.error('Error in generateAllocationId:', error);
    return `BA${new Date().getTime()}`;
  }
}

/**
 * Allocate bed to patient
 */
export async function allocateBed(allocationData: BedAllocationData): Promise<BedAllocation> {
  try {
    // Check if bed is available
    console.log('Checking bed availability for ID:', allocationData.bedId);
    const { data: bed, error: bedError } = await supabase
      .from('beds')
      .select('*')
      .eq('id', allocationData.bedId)
      .eq('status', 'available')
      .single();

    if (bedError || !bed) {
      console.error('Bed check failed:', bedError, bed);
      throw new Error(`Bed is not available for allocation. (ID: ${allocationData.bedId})`);
    }

    // Check if patient already has an active allocation
    const { data: existingAllocation, error: existingError } = await supabase
      .from('bed_allocations')
      .select('*')
      .eq('patient_id', allocationData.patientId)
      .eq('status', 'active')
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw new Error('Error checking existing allocation');
    }

    if (existingAllocation) {
      throw new Error('Patient already has an active bed allocation');
    }

    const allocationId = await generateAllocationId();
    const now = new Date();
    const admissionTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    // Fetch a sample record to check available columns
    const { data: sampleData } = await supabase
      .from('bed_allocations')
      .select('*')
      .limit(1);

    const availableColumns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [];

    // Create allocation record with available columns
    const allocationRecord: any = {
      patient_id: allocationData.patientId,
      bed_id: allocationData.bedId,
      doctor_id: allocationData.doctorId || null,
      admission_date: allocationData.admissionDate,
      admission_type: allocationData.admissionType || 'elective',
      status: 'active'
    };

    if (allocationData.staffId) {
      allocationRecord.staff_id = allocationData.staffId;
    }

    if (allocationData.admissionCategory) {
      allocationRecord.admission_category = allocationData.admissionCategory;
    }

    // Handle ip_number
    if (allocationData.ipNumber) {
      allocationRecord.ip_number = allocationData.ipNumber;
    } else if (availableColumns.includes('ip_number')) {
      allocationRecord.ip_number = await getNextIPNumber();
    }

    // Add optional columns if they exist
    if (availableColumns.includes('allocation_id')) allocationRecord.allocation_id = allocationId;
    if (availableColumns.includes('admission_time')) allocationRecord.admission_time = admissionTime;

    if (availableColumns.includes('reason_for_admission')) {
      allocationRecord.reason_for_admission = allocationData.reason;
    } else if (availableColumns.includes('reason')) {
      allocationRecord.reason = allocationData.reason;
    }

    const { data: allocation, error: allocationError } = await supabase
      .from('bed_allocations')
      .insert([allocationRecord])
      .select(`
        *,
        patient:patients(name, patient_id),
        bed:beds(id, bed_number, room_number, bed_type, floor_number)
      `)
      .single();

    if (allocationError) {
      console.error('Error creating bed allocation:', allocationError);
      throw new Error(`Failed to create bed allocation: ${allocationError.message || 'Database error'}`);
    }

    // Update bed status to occupied
    const { error: updateError } = await supabase
      .from('beds')
      .update({ status: 'occupied' })
      .eq('id', allocationData.bedId);

    if (updateError) {
      console.error('Error updating bed status:', updateError);
      // Rollback allocation if bed status update fails
      await supabase
        .from('bed_allocations')
        .delete()
        .eq('id', allocation.id);
      throw new Error('Failed to update bed status');
    }

    return allocation;
  } catch (error) {
    console.error('Error allocating bed:', error);
    throw error;
  }
}

/**
 * Discharge patient from bed
 */
export async function dischargeBed(
  allocationId: string,
  dischargeData: {
    dischargeDate: string;
    dischargeTime: string;
    dischargeSummary?: string;
  }
): Promise<BedAllocation> {
  try {
    // Get current allocation
    const { data: allocation, error: allocationError } = await supabase
      .from('bed_allocations')
      .select('*, bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate)')
      .eq('id', allocationId)
      .eq('status', 'active')
      .single();

    if (allocationError || !allocation) {
      throw new Error('Active bed allocation not found');
    }

    // Update allocation with discharge information
    const { data: updatedAllocation, error: updateError } = await supabase
      .from('bed_allocations')
      .update({
        discharge_date: `${dischargeData.dischargeDate}T${dischargeData.dischargeTime}`,
        reason: dischargeData.dischargeSummary || allocation.reason,
        status: 'discharged'
      })
      .eq('id', allocationId)
      .select(`
        *,
        allocated_at:admission_date,
        discharged_at:discharge_date,
        patient:patients(name, uhid:patient_id),
        bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate),
        doctor:doctors(license_number, name:users!user_id(name))
      `)
      .single();

    if (updateError) {
      console.error('Error updating bed allocation:', updateError);
      throw new Error(`Failed to discharge patient: ${updateError.message || 'Database error'}`);
    }

    // Update bed status to available
    const { error: bedUpdateError } = await supabase
      .from('beds')
      .update({ status: 'available' })
      .eq('id', allocation.bed_id);

    if (bedUpdateError) {
      console.error('Error updating bed status after discharge:', bedUpdateError);
      // Note: Don't rollback discharge, just log the error
    }

    return updatedAllocation;
  } catch (error) {
    console.error('Error discharging patient:', error);
    throw error;
  }
}

/**
 * Transfer patient to another bed
 */
export async function transferBed(
  allocationId: string,
  newBedId: string,
  reason: string
): Promise<BedAllocation> {
  try {
    // Check if new bed is available
    const { data: newBed, error: newBedError } = await supabase
      .from('beds')
      .select('id, bed_number, room_number, bed_type, status, department_id, floor_number, daily_rate, features')
      .eq('id', newBedId)
      .eq('status', 'available')
      .single();

    if (newBedError || !newBed) {
      throw new Error('New bed is not available for transfer');
    }

    // Get current allocation
    const { data: currentAllocation, error: currentError } = await supabase
      .from('bed_allocations')
      .select('*, bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate)')
      .eq('id', allocationId)
      .eq('status', 'active')
      .single();

    if (currentError || !currentAllocation) {
      throw new Error('Active bed allocation not found');
    }

    // Update current allocation to transferred
    const { error: updateCurrentError } = await supabase
      .from('bed_allocations')
      .update({
        status: 'transferred',
        discharge_date: new Date().toISOString(),
        reason: `Transferred to bed ${newBedId}. Reason: ${reason}`
      })
      .eq('id', allocationId);

    if (updateCurrentError) {
      throw new Error('Failed to update current allocation');
    }

    // Create new allocation
    const newAllocationRecord = {
      patient_id: currentAllocation.patient_id,
      bed_id: newBedId,
      doctor_id: currentAllocation.doctor_id,
      admission_date: new Date().toISOString(),
      reason: `Transfer from bed ${currentAllocation.bed.id}. Reason: ${reason}`,
      status: 'active',
      allocated_by: currentAllocation.allocated_by
    };

    const { data: newAllocation, error: newAllocationError } = await supabase
      .from('bed_allocations')
      .insert([newAllocationRecord])
      .select(`
        *,
        allocated_at:admission_date,
        discharged_at:discharge_date,
        patient:patients(name, uhid:patient_id),
        bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate),
        doctor:doctors(license_number, name:users!user_id(name))
      `)
      .single();

    if (newAllocationError) {
      throw new Error(`Failed to create new allocation: ${newAllocationError.message || 'Database error'}`);
    }

    // Update bed statuses
    await Promise.all([
      supabase
        .from('beds')
        .update({ status: 'available' })
        .eq('id', currentAllocation.bed_id),
      supabase
        .from('beds')
        .update({ status: 'occupied' })
        .eq('id', newBedId)
    ]);

    return newAllocation;
  } catch (error) {
    console.error('Error transferring patient:', error);
    throw error;
  }
}

/**
 * Get all bed allocations with filtering
 */
export async function getBedAllocations(options: {
  page?: number;
  limit?: number;
  patientId?: string;
  doctorId?: string;
  bedId?: string;
  status?: string;
  admissionType?: string;
  dateRange?: { start: string; end: string };
  searchTerm?: string;
} = {}): Promise<{
  allocations: BedAllocation[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const {
      page = 1,
      limit = 20,
      patientId,
      doctorId,
      bedId,
      status,
      admissionType,
      dateRange,
      searchTerm
    } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('bed_allocations')
      .select(`
        *,
        allocated_at:admission_date,
        discharged_at:discharge_date,
        patient:patients(name, uhid:patient_id, age, gender, diagnosis, is_critical, phone),
        bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate),
        doctor:doctors(license_number, name:users!user_id(name)),
        staff:staff_id(first_name, last_name, employee_id)
      `, { count: 'exact' });

    // Apply filters
    if (patientId) query = query.eq('patient_id', patientId);
    if (doctorId) query = query.eq('doctor_id', doctorId);
    if (bedId) query = query.eq('bed_id', bedId);
    if (status) query = query.eq('status', status);
    // Note: admission_type column doesn't exist in the schema, so we can't filter by it

    if (dateRange) {
      query = query.gte('admission_date', dateRange.start)
        .lte('admission_date', dateRange.end);
    }

    if (searchTerm) {
      query = query.or(`
        reason.ilike.%${searchTerm}%
      `);
    }

    // First try with ordering
    let result;
    try {
      result = await query
        .range(offset, offset + limit - 1)
        .order('admission_date', { ascending: false });
    } catch (orderError) {
      // If ordering fails, try without ordering
      console.warn('Ordering by admission_date failed, trying without ordering:', orderError);
      result = await query.range(offset, offset + limit - 1);
    }

    const { data: allocations, error, count } = result;

    if (error) {
      console.error('Error fetching bed allocations:', error);
      // Return empty data instead of throwing error to prevent app crash
      return {
        allocations: [],
        total: 0,
        page: 1,
        limit: 20
      };
    }

    return {
      allocations: allocations || [],
      total: count || 0,
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching bed allocations:', error);
    throw error;
  }
}

/**
 * Get all beds with their current status
 */
export async function getAllBeds(options: {
  page?: number;
  limit?: number;
  bedType?: string;
  status?: string;
  wardName?: string, // Note: ward_name column doesn't exist in the schema, so this filter is ignored
  floorNumber?: number, // Note: floor_number column doesn't exist in the schema, so this filter is ignored
  searchTerm?: string;
} = {}): Promise<{
  beds: Bed[];
  total: number;
  page: number;
  limit: number;
}> {
  try {
    const {
      page = 1,
      limit = 50,
      bedType,
      status,
      wardName,
      floorNumber,
      searchTerm
    } = options;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('beds')
      .select(`
        id, bed_number, room_number, bed_type, status, department_id, floor_number, daily_rate, features, created_at, updated_at,
        current_allocation:bed_allocations!id(
          *,
          allocated_at:admission_date,
          discharged_at:discharge_date,
          patient:patients(name, uhid:patient_id),
          doctor:doctors(license_number, name:users!user_id(name))
        )
      `, { count: 'exact' });

    // Apply filters
    if (bedType) query = query.eq('bed_type', bedType);
    if (status) query = query.eq('status', status);
    // Note: ward_name column doesn't exist in the schema, so we can't filter by it
    // Note: floor_number column doesn't exist in the schema, so we can't filter by it

    if (searchTerm) {
      query = query.or(`
        bed_number.ilike.%${searchTerm}%
      `);
    }

    const { data: beds, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('bed_number', { ascending: true });

    if (error) {
      console.error('Error fetching beds:', error);
      // Return empty data instead of throwing error to prevent app crash
      return {
        beds: [],
        total: 0,
        page: 1,
        limit: 50
      };
    }

    return {
      beds: beds || [],
      total: count || 0,
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching beds:', error);
    throw error;
  }
}

/**
 * Get bed statistics
 */
export async function getBedStats(): Promise<BedStats> {
  try {
    const { data: beds, error } = await supabase
      .from('beds')
      .select('status');

    if (error) {
      console.error('Error fetching bed stats:', error);
      // Return default stats instead of throwing error to prevent app crash
      return {
        total: 0,
        available: 0,
        occupied: 0,
        maintenance: 0,
        reserved: 0,
        occupancyRate: 0
      };
    }

    const total = beds?.length || 0;
    const available = beds?.filter(b => b.status === 'available').length || 0;
    const occupied = beds?.filter(b => b.status === 'occupied').length || 0;
    const maintenance = beds?.filter(b => b.status === 'maintenance').length || 0;
    const reserved = beds?.filter(b => b.status === 'reserved').length || 0;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    return {
      total,
      available,
      occupied,
      maintenance,
      reserved,
      occupancyRate: Math.round(occupancyRate * 10) / 10
    };
  } catch (error) {
    console.error('Error getting bed stats:', error);
    throw error;
  }
}

/**
 * Get available beds by type
 */
export async function getAvailableBeds(
  bedType?: string,
  wardName?: string, // Note: ward_name column doesn't exist in the schema, so this filter is ignored
  floorNumber?: number // Note: floor_number column doesn't exist in the schema, so this filter is ignored
): Promise<Bed[]> {
  try {
    let query = supabase
      .from('beds')
      .select('id, bed_number, room_number, bed_type, status, department_id, floor_number, daily_rate, features')
      .eq('status', 'available');

    if (bedType) query = query.eq('bed_type', bedType);
    // Note: ward_name column doesn't exist in the schema, so we can't filter by it
    // Note: floor_number column doesn't exist in the schema, so we can't filter by it

    const { data: beds, error } = await query
      .order('bed_number', { ascending: true });

    if (error) {
      console.error('Error fetching available beds:', error);
      // Return empty array instead of throwing error to prevent app crash
      return [];
    }

    return beds || [];
  } catch (error) {
    console.error('Error fetching available beds:', error);
    throw error;
  }
}

/**
 * Get patient bed allocation history
 */
export async function getPatientBedHistory(patientId: string): Promise<BedAllocation[]> {
  try {
    // First try with ordering
    let result;
    try {
      result = await supabase
        .from('bed_allocations')
        .select(`
          *,
          allocated_at:admission_date,
          discharged_at:discharge_date,
          patient:patients(name, uhid:patient_id, age, gender, diagnosis, is_critical, phone),
          bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate),
          doctor:doctors(license_number, name:users!user_id(name))
        `)
        .eq('patient_id', patientId)
        .order('admission_date', { ascending: false });
    } catch (orderError) {
      // If ordering fails, try without ordering
      console.warn('Ordering by admission_date failed, trying without ordering:', orderError);
      result = await supabase
        .from('bed_allocations')
        .select(`
          *,
          allocated_at:admission_date,
          discharged_at:discharge_date,
          bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate),
          doctor:doctors(license_number, name:users!user_id(name))
        `)
        .eq('patient_id', patientId);
    }

    const { data: allocations, error } = result;

    if (error) {
      console.error('Error fetching patient bed history:', error);
      // Return empty array instead of throwing error to prevent app crash
      return [];
    }

    return allocations || [];
  } catch (error) {
    console.error('Error fetching patient bed history:', error);
    throw error;
  }
}

/**
 * Update bed status
 */
export async function updateBedStatus(
  bedId: string,
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
): Promise<Bed> {
  try {
    const { data: bed, error } = await supabase
      .from('beds')
      .update({ status })
      .eq('id', bedId)
      .select('id, bed_number, room_number, bed_type, status, department_id, floor_number, daily_rate, features')
      .single();

    if (error) {
      console.error('Error updating bed status:', error);
      throw new Error(`Failed to update bed status: ${error.message}`);
    }

    return bed;
  } catch (error) {
    console.error('Error updating bed status:', error);
    throw error;
  }
}

/**
 * Get bed allocation by ID
 */
export async function getBedAllocationById(allocationId: string): Promise<BedAllocation | null> {
  try {
    const { data: allocation, error } = await supabase
      .from('bed_allocations')
      .select(`
        *,
        allocated_at:admission_date,
        discharged_at:discharge_date,
        patient:patients(name, uhid:patient_id, age, gender, diagnosis, is_critical, phone),
        bed:beds(id, bed_number, room_number, bed_type, floor_number, daily_rate),
        doctor:doctors(license_number, name:users!user_id(name))
      `)
      .eq('id', allocationId)
      .single();

    if (error) {
      console.error('Error fetching bed allocation:', error);
      // Return null instead of throwing error to prevent app crash
      return null;
    }

    return allocation;
  } catch (error) {
    console.error('Error fetching bed allocation:', error);
    throw error;
  }
}
/**
 * Delete a bed
 */
export async function deleteBed(bedId: string): Promise<void> {
  try {
    // First, check if the bed has any active allocations
    const { data: activeAllocation, error: allocationError } = await supabase
      .from('bed_allocations')
      .select('*')
      .eq('bed_id', bedId)
      .eq('status', 'active')
      .single();

    if (activeAllocation) {
      throw new Error('Cannot delete bed with active patient allocation. Please discharge the patient first.');
    }

    // Delete the bed
    const { error } = await supabase
      .from('beds')
      .delete()
      .eq('id', bedId);

    if (error) {
      console.error('Error deleting bed:', error);
      throw new Error(`Failed to delete bed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteBed:', error);
    throw error;
  }
}

/**
 * Create a new bed
 */
export async function createBed(bedData: {
  bed_number: string;
  room_number: string;
  floor_number: number;
  bed_type: string;
  daily_rate: number;
  department_id: string;
  features?: string[];
}): Promise<Bed> {
  try {
    const { data, error } = await supabase
      .from('beds')
      .insert([{
        bed_number: bedData.bed_number,
        room_number: bedData.room_number,
        floor_number: bedData.floor_number,
        bed_type: bedData.bed_type,
        daily_rate: bedData.daily_rate,
        department_id: bedData.department_id,
        features: bedData.features || [],
        status: 'available'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating bed:', error);
      throw new Error(`Failed to create bed: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating bed:', error);
    throw error;
  }
}