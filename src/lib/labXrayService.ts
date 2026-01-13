import { supabase } from './supabase';

// ============================================
// INTERFACES & TYPES
// ============================================

export interface LabTestCatalog {
  id: string;
  test_code: string;
  test_name: string;
  category: string;
  subcategory?: string;
  sample_type?: string;
  sample_volume?: string;
  container_type?: string;
  fasting_required: boolean;
  normal_turnaround_time?: number;
  urgent_turnaround_time?: number;
  test_cost: number;
  is_active: boolean;
}

export interface RadiologyTestCatalog {
  id: string;
  test_code: string;
  test_name: string;
  modality: string;
  body_part?: string;
  contrast_required: boolean;
  radiation_exposure?: string;
  requires_sedation: boolean;
  average_duration?: number;
  normal_turnaround_time?: number;
  urgent_turnaround_time?: number;
  test_cost: number;
  is_active: boolean;
}

export interface LabTestOrder {
  id?: string;
  order_number?: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  ordering_doctor_id: string;
  test_catalog_id: string;
  clinical_indication: string;
  provisional_diagnosis?: string;
  special_instructions?: string;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  fasting_status?: boolean;
  preferred_collection_date?: string;
  preferred_collection_time?: string;
  status?: string;
  staff_id?: string;
}

export interface RadiologyTestOrder {
  id?: string;
  order_number?: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  ordering_doctor_id: string;
  test_catalog_id: string;
  clinical_indication: string;
  provisional_diagnosis?: string;
  special_instructions?: string;
  body_part?: string;
  laterality?: string;
  contrast_required?: boolean;
  contrast_type?: string;
  patient_preparation_notes?: string;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  preferred_scan_date?: string;
  preferred_scan_time?: string;
  status?: string;
  staff_id?: string;
}

export interface LabTestResult {
  id?: string;
  order_id: string;
  parameter_name: string;
  parameter_value: string;
  unit?: string;
  reference_range?: string;
  is_abnormal?: boolean;
  abnormal_flag?: string;
  technician_notes?: string;
}

// ============================================
// LAB TEST CATALOG FUNCTIONS
// ============================================

/**
 * Get all active lab tests from catalog
 */
export async function getLabTestCatalog(): Promise<LabTestCatalog[]> {
  try {
    const { data, error } = await supabase
      .from('lab_test_catalog')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('test_name', { ascending: true });

    if (error) {
      console.warn('Lab test catalog not available:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLabTestCatalog:', error);
    return [];
  }
}

/**
 * Create a new lab test in the catalog
 */
export async function createLabTestCatalogEntry(testData: Partial<LabTestCatalog>): Promise<LabTestCatalog> {
  const { data, error } = await supabase
    .from('lab_test_catalog')
    .insert([{
      fasting_required: false, // Default
      ...testData,
      test_code: testData.test_code || `LAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      is_active: true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating lab test:', error);
    throw new Error(`Failed to create lab test: ${error.message || error.code || 'Check console for details'}`);
  }
  return data;
}

/**
 * Get lab tests by category
 */
export async function getLabTestsByCategory(category: string): Promise<LabTestCatalog[]> {
  try {
    const { data, error } = await supabase
      .from('lab_test_catalog')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('test_name', { ascending: true });

    if (error) {
      console.warn('Lab test catalog not available:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLabTestsByCategory:', error);
    return [];
  }
}

// ============================================
// RADIOLOGY TEST CATALOG FUNCTIONS
// ============================================

/**
 * Get all active radiology tests from catalog
 */
export async function getRadiologyTestCatalog(): Promise<RadiologyTestCatalog[]> {
  try {
    const { data, error } = await supabase
      .from('radiology_test_catalog')
      .select('*')
      .eq('is_active', true)
      .order('modality', { ascending: true })
      .order('test_name', { ascending: true });

    if (error) {
      console.warn('Radiology test catalog not available:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRadiologyTestCatalog:', error);
    return [];
  }
}

/**
 * Create a new radiology test in the catalog
 */
export async function createRadiologyTestCatalogEntry(testData: Partial<RadiologyTestCatalog>): Promise<RadiologyTestCatalog> {
  const { data, error } = await supabase
    .from('radiology_test_catalog')
    .insert([{
      contrast_required: false, // Default
      requires_sedation: false, // Default
      ...testData,
      test_code: testData.test_code || `RAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      is_active: true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating radiology test:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create radiology test: ${error.message || error.code || 'Unknown error'}`);
  }
  return data;
}

/**
 * Get radiology tests by modality
 */
export async function getRadiologyTestsByModality(modality: string): Promise<RadiologyTestCatalog[]> {
  try {
    const { data, error } = await supabase
      .from('radiology_test_catalog')
      .select('*')
      .eq('modality', modality)
      .eq('is_active', true)
      .order('test_name', { ascending: true });

    if (error) {
      console.warn('Radiology test catalog not available:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRadiologyTestsByModality:', error);
    return [];
  }
}

// ============================================
// LAB ORDER FUNCTIONS
// ============================================

/**
 * Generate unique lab order number
 */
function generateLabOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LAB-${year}${month}${day}-${random}`;
}

/**
 * Create a new lab test order
 */
export async function createLabTestOrder(orderData: LabTestOrder): Promise<any> {
  try {
    const orderNumber = generateLabOrderNumber();

    const { data: order, error } = await supabase
      .from('lab_test_orders')
      .insert([{
        ...orderData,
        order_number: orderNumber,
        status: 'ordered',
        staff_id: orderData.staff_id
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create lab test order:', error);
      throw new Error(`Failed to create lab test order: ${error.message}`);
    }

    // Create billing item
    if (order) {
      // Fetch catalog data separately
      const { data: catalog, error: catalogError } = await supabase
        .from('lab_test_catalog')
        .select('*')
        .eq('id', order.test_catalog_id)
        .single();

      if (catalogError) {
        console.error('Error fetching catalog for billing:', catalogError);
      } else if (catalog) {
        await createDiagnosticBilling('lab', order.id, orderData.patient_id, catalog.test_name, catalog.test_cost);
      }
    }

    // Return the complete order with related data
    if (order) {
      const [patient, doctor, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .eq('id', order.patient_id)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('id', order.ordering_doctor_id)
          .single(),
        supabase
          .from('lab_test_catalog')
          .select('*')
          .eq('id', order.test_catalog_id)
          .single()
      ]);

      return {
        ...order,
        patient: patient.data,
        ordering_doctor: doctor.data,
        test_catalog: catalog.data
      };
    }

    return order;
  } catch (error) {
    console.error('Error in createLabTestOrder:', error);
    throw error;
  }
}

/**
 * Get lab orders for a patient
 */
export async function getPatientLabOrders(patientId: string): Promise<any[]> {
  try {
    const { data: orders, error } = await supabase
      .from('lab_test_orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Lab orders table not available:', error.message);
      return [];
    }

    // Fetch related data separately
    if (orders && orders.length > 0) {
      const doctorIds = [...new Set(orders.map(order => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map(order => order.test_catalog_id))];
      const orderIds = orders.map(order => order.id);

      const [patient, doctors, catalog, results] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name')
          .eq('id', patientId)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .in('id', doctorIds),
        supabase
          .from('lab_test_catalog')
          .select('*')
          .in('id', catalogIds),
        supabase
          .from('lab_test_results')
          .select('*')
          .in('order_id', orderIds)
      ]);

      // Combine the data
      return orders.map(order => ({
        ...order,
        patient: patient.data,
        ordering_doctor: doctors.data?.find(d => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find(c => c.id === order.test_catalog_id),
        results: results.data?.filter(r => r.order_id === order.id) || []
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in getPatientLabOrders:', error);
    return [];
  }
}

/**
 * Get all lab orders with filters
 */
export async function getLabOrders(filters?: {
  status?: string;
  urgency?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('lab_test_orders')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.urgency) {
      query = query.eq('urgency', filters.urgency);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      console.warn('Lab orders table not available:', error.message);
      return [];
    }

    // Fetch related data separately
    if (orders && orders.length > 0) {
      const patientIds = [...new Set(orders.map(order => order.patient_id))];
      const doctorIds = [...new Set(orders.map(order => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map(order => order.test_catalog_id))];

      const [patients, doctors, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .in('id', patientIds),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .in('id', doctorIds),
        supabase
          .from('lab_test_catalog')
          .select('*')
          .in('id', catalogIds)
      ]);

      // Combine the data
      return orders.map(order => ({
        ...order,
        patient: patients.data?.find(p => p.id === order.patient_id),
        ordering_doctor: doctors.data?.find(d => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find(c => c.id === order.test_catalog_id)
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in getLabOrders:', error);
    return [];
  }
}

/**
 * Update lab order status
 */
export async function updateLabOrderStatus(
  orderId: string,
  status: string,
  additionalData?: any
): Promise<any> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'sample_collected' && additionalData) {
      updateData.sample_collected_at = new Date().toISOString();
      updateData.sample_collected_by = additionalData.collected_by;
      updateData.sample_id = additionalData.sample_id;
    }

    const { data: order, error } = await supabase
      .from('lab_test_orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update lab order:', error);
      throw new Error(`Failed to update lab order: ${error.message}`);
    }

    // Return the complete order with related data
    if (order) {
      const [patient, doctor, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .eq('id', order.patient_id)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('id', order.ordering_doctor_id)
          .single(),
        supabase
          .from('lab_test_catalog')
          .select('*')
          .eq('id', order.test_catalog_id)
          .single()
      ]);

      return {
        ...order,
        patient: patient.data,
        ordering_doctor: doctor.data,
        test_catalog: catalog.data
      };
    }

    return order;
  } catch (error) {
    console.error('Error in updateLabOrderStatus:', error);
    throw error;
  }
}

/**
 * Delete lab order
 */
export async function deleteLabOrder(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('lab_test_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Failed to delete lab order:', error);
      throw new Error(`Failed to delete lab order: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteLabOrder:', error);
    throw error;
  }
}

// ============================================
// LAB RESULTS FUNCTIONS
// ============================================

/**
 * Add lab test results
 */
export async function addLabTestResults(results: LabTestResult[]): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('lab_test_results')
      .insert(results)
      .select();

    if (error) {
      console.error('Failed to add lab results:', error);
      throw new Error(`Failed to add lab results: ${error.message}`);
    }

    // Update order status to completed
    if (results.length > 0) {
      await updateLabOrderStatus(results[0].order_id, 'completed');
    }

    return data;
  } catch (error) {
    console.error('Error in addLabTestResults:', error);
    throw error;
  }
}

/**
 * Get lab results for an order
 */
export async function getLabOrderResults(orderId: string): Promise<LabTestResult[]> {
  try {
    const { data, error } = await supabase
      .from('lab_test_results')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Lab test results table not available:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLabOrderResults:', error);
    return [];
  }
}

/**
 * Update a lab test result
 */
export async function updateLabTestResult(resultId: string, updates: Partial<LabTestResult>): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('lab_test_results')
      .update(updates)
      .eq('id', resultId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update lab result:', error);
      throw new Error(`Failed to update lab result: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in updateLabTestResult:', error);
    throw error;
  }
}

/**
 * Delete a lab test result
 */
export async function deleteLabTestResult(resultId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('lab_test_results')
      .delete()
      .eq('id', resultId);

    if (error) {
      console.error('Failed to delete lab result:', error);
      throw new Error(`Failed to delete lab result: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteLabTestResult:', error);
    throw error;
  }
}

// ============================================
// RADIOLOGY ORDER FUNCTIONS
// ============================================

/**
 * Generate unique radiology order number
 */
function generateRadiologyOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RAD-${year}${month}${day}-${random}`;
}

/**
 * Create a new radiology test order
 */
export async function createRadiologyTestOrder(orderData: RadiologyTestOrder): Promise<any> {
  try {
    const orderNumber = generateRadiologyOrderNumber();

    const { data: order, error } = await supabase
      .from('radiology_test_orders')
      .insert([{
        ...orderData,
        order_number: orderNumber,
        status: 'ordered',
        staff_id: orderData.staff_id
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create radiology test order:', error);
      throw new Error(`Failed to create radiology test order: ${error.message}`);
    }

    // Create billing item
    if (order) {
      // Fetch catalog data separately
      const { data: catalog, error: catalogError } = await supabase
        .from('radiology_test_catalog')
        .select('*')
        .eq('id', order.test_catalog_id)
        .single();

      if (catalogError) {
        console.error('Error fetching catalog for billing:', catalogError);
      } else if (catalog) {
        await createDiagnosticBilling('radiology', order.id, orderData.patient_id, catalog.test_name, catalog.test_cost);
      }
    }

    // Return the complete order with related data
    if (order) {
      const [patient, doctor, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .eq('id', order.patient_id)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('id', order.ordering_doctor_id)
          .single(),
        supabase
          .from('radiology_test_catalog')
          .select('*')
          .eq('id', order.test_catalog_id)
          .single()
      ]);

      return {
        ...order,
        patient: patient.data,
        ordering_doctor: doctor.data,
        test_catalog: catalog.data
      };
    }

    return order;
  } catch (error) {
    console.error('Error in createRadiologyTestOrder:', error);
    throw error;
  }
}

/**
 * Get radiology orders for a patient
 */
export async function getPatientRadiologyOrders(patientId: string): Promise<any[]> {
  try {
    const { data: orders, error } = await supabase
      .from('radiology_test_orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Radiology orders table not available:', error.message);
      return [];
    }

    // Fetch related data separately
    if (orders && orders.length > 0) {
      const doctorIds = [...new Set(orders.map(order => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map(order => order.test_catalog_id))];

      const [patient, doctors, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name')
          .eq('id', patientId)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .in('id', [...new Set([...doctorIds, ...orders.map(o => o.radiologist_id).filter(id => id !== null)])]),
        supabase
          .from('radiology_test_catalog')
          .select('*')
          .in('id', catalogIds)
      ]);

      // Combine the data
      return orders.map(order => ({
        ...order,
        patient: patient.data,
        ordering_doctor: doctors.data?.find(d => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find(c => c.id === order.test_catalog_id),
        radiologist: doctors.data?.find(d => d.id === order.radiologist_id)
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in getPatientRadiologyOrders:', error);
    return [];
  }
}

/**
 * Get all radiology orders with filters
 */
export async function getRadiologyOrders(filters?: {
  status?: string;
  urgency?: string;
  modality?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('radiology_test_orders')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.urgency) {
      query = query.eq('urgency', filters.urgency);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.modality) {
      // Need to join with radiology_test_catalog to filter by modality
      const { data: catalogTests, error: catalogError } = await supabase
        .from('radiology_test_catalog')
        .select('id')
        .eq('modality', filters.modality);

      if (catalogError) {
        console.warn('Radiology catalog not available for modality filter:', catalogError.message);
      }

      const catalogIds = catalogTests?.map(test => test.id) || [];
      if (catalogIds.length > 0) {
        query = query.in('test_catalog_id', catalogIds);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      console.warn('Radiology orders table not available:', error.message);
      return [];
    }

    // Fetch related data separately
    if (orders && orders.length > 0) {
      const patientIds = [...new Set(orders.map(order => order.patient_id))];
      const doctorIds = [...new Set(orders.map(order => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map(order => order.test_catalog_id))];

      const [patients, doctors, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .in('id', patientIds),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .in('id', doctorIds),
        supabase
          .from('radiology_test_catalog')
          .select('*')
          .in('id', catalogIds)
      ]);

      // Combine the data
      return orders.map(order => ({
        ...order,
        patient: patients.data?.find(p => p.id === order.patient_id),
        ordering_doctor: doctors.data?.find(d => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find(c => c.id === order.test_catalog_id)
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in getRadiologyOrders:', error);
    return [];
  }
}

/**
 * Update radiology order
 */
export async function updateRadiologyOrder(
  orderId: string,
  updateData: any
): Promise<any> {
  try {
    const { data: order, error } = await supabase
      .from('radiology_test_orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update radiology order:', error);
      throw new Error(`Failed to update radiology order: ${error.message}`);
    }

    // Return the complete order with related data
    if (order) {
      const [patient, doctor, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .eq('id', order.patient_id)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('id', order.ordering_doctor_id)
          .single(),
        supabase
          .from('radiology_test_catalog')
          .select('*')
          .eq('id', order.test_catalog_id)
          .single()
      ]);

      return {
        ...order,
        patient: patient.data,
        ordering_doctor: doctor.data,
        test_catalog: catalog.data
      };
    }

    return order;
  } catch (error) {
    console.error('Error in updateRadiologyOrder:', error);
    throw error;
  }
}

/**
 * Delete radiology order
 */
export async function deleteRadiologyOrder(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('radiology_test_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Failed to delete radiology order:', error);
      throw new Error(`Failed to delete radiology order: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteRadiologyOrder:', error);
    throw error;
  }
}

// ============================================
// BILLING INTEGRATION
// ============================================

/**
 * Create diagnostic billing item
 */
async function createDiagnosticBilling(
  orderType: 'lab' | 'radiology' | 'scan',
  orderId: string,
  patientId: string,
  testName: string,
  amount: number
): Promise<void> {
  try {
    const billingData: any = {
      order_type: orderType,
      patient_id: patientId,
      test_name: testName,
      amount: amount,
      billing_status: 'pending'
    };

    if (orderType === 'lab') {
      billingData.lab_order_id = orderId;
    } else if (orderType === 'radiology') {
      billingData.radiology_order_id = orderId;
    } else {
      billingData.scan_order_id = orderId;
    }

    const { error } = await supabase
      .from('diagnostic_billing_items')
      .insert([billingData]);

    if (error) {
      console.warn('Diagnostic billing items table not available:', error.message);
      // Don't throw - billing error shouldn't block order creation
    }
  } catch (error) {
    console.error('Error in createDiagnosticBilling:', error);
  }
}

/**
 * Get all diagnostic billing items
 */
export async function getDiagnosticBillingItems(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('diagnostic_billing_items')
      .select(`
        *,
        patients:patient_id (id, patient_id, name, phone, gender, date_of_birth)
      `);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('billing_status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.warn('Diagnostic billing items table not available:', error.message);
      return [];
    }

    let result = data || [];

    // Client-side search since we can't easily search across joined tables with simple filters
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter((item: any) => 
        item.test_name?.toLowerCase().includes(term) ||
        item.patients?.name?.toLowerCase().includes(term) ||
        item.patients?.patient_id?.toLowerCase().includes(term)
      );
    }

    return result.map(item => ({
        ...item,
        patient: item.patients // Map the joined patient data
    }));
  } catch (error) {
    console.error('Error in getDiagnosticBillingItems:', error);
    return [];
  }
}

/**
 * Update billing status
 */
export async function updateDiagnosticBillingStatus(
  id: string,
  status: 'pending' | 'billed' | 'paid',
  paymentMethod?: string | null
): Promise<boolean> {
  try {
    const updates: any = {
      billing_status: status
    };

    if (status === 'billed') {
      updates.billed_at = new Date().toISOString();
    } else if (status === 'paid') {
      updates.paid_at = new Date().toISOString();
      if (paymentMethod) {
        updates.payment_method = paymentMethod;
      }
    }

    const { error } = await supabase
      .from('diagnostic_billing_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Failed to update billing status:', error);
      throw new Error(`Failed to update billing status: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in updateDiagnosticBillingStatus:', error);
    throw error;
  }
}

/**
 * Get diagnostic statistics
 */
export async function getDiagnosticStats(): Promise<{
  totalLabOrders: number;
  totalRadiologyOrders: number;
  totalScanOrders: number;
  pendingLabOrders: number;
  pendingRadiologyOrders: number;
  pendingScanOrders: number;
  completedToday: number;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Query lab, radiology, and scan orders with error handling for missing tables
    const [labOrdersResult, radiologyOrdersResult, scanOrdersResult] = await Promise.allSettled([
      supabase.from('lab_test_orders').select('id, status, created_at'),
      supabase.from('radiology_test_orders').select('id, status, created_at'),
      supabase.from('scan_test_orders').select('id, status, created_at')
    ]);

    // Handle lab orders result
    let labOrdersData: any[] = [];
    if (labOrdersResult.status === 'fulfilled' && !labOrdersResult.value.error) {
      labOrdersData = labOrdersResult.value.data || [];
    } else {
      // If table doesn't exist, log and continue with empty data
      console.warn('Lab orders table not available:', labOrdersResult.status === 'rejected' ? labOrdersResult.reason : labOrdersResult.value.error?.message);
    }

    // Handle radiology orders result
    let radiologyOrdersData: any[] = [];
    if (radiologyOrdersResult.status === 'fulfilled' && !radiologyOrdersResult.value.error) {
      radiologyOrdersData = radiologyOrdersResult.value.data || [];
    } else {
      // If table doesn't exist, log and continue with empty data
      console.warn('Radiology orders table not available:', radiologyOrdersResult.status === 'rejected' ? radiologyOrdersResult.reason : radiologyOrdersResult.value.error?.message);
    }

    // Handle scan orders result
    let scanOrdersData: any[] = [];
    if (scanOrdersResult.status === 'fulfilled' && !scanOrdersResult.value.error) {
      scanOrdersData = scanOrdersResult.value.data || [];
    } else {
      // If table doesn't exist, log and continue with empty data
      console.warn('Scan orders table not available:', scanOrdersResult.status === 'rejected' ? scanOrdersResult.reason : scanOrdersResult.value.error?.message);
    }

    const stats = {
      totalLabOrders: labOrdersData.length,
      totalRadiologyOrders: radiologyOrdersData.length,
      totalScanOrders: scanOrdersData.length,
      pendingLabOrders: labOrdersData.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
      pendingRadiologyOrders: radiologyOrdersData.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
      pendingScanOrders: scanOrdersData.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
      completedToday: [
        ...labOrdersData,
        ...radiologyOrdersData,
        ...scanOrdersData
      ].filter(o => o.status === 'completed' && o.created_at?.startsWith(today)).length
    };

    return stats;
  } catch (error) {
    console.error('Error in getDiagnosticStats:', error);
    // Return default stats in case of unexpected errors
    return {
      totalLabOrders: 0,
      totalRadiologyOrders: 0,
      totalScanOrders: 0,
      pendingLabOrders: 0,
      pendingRadiologyOrders: 0,
      pendingScanOrders: 0,
      completedToday: 0
    };
  }
}

// ============================================
// SCAN TEST CATALOG FUNCTIONS
// ============================================

export interface ScanTestCatalog {
  id: string;
  test_code: string;
  test_name: string;
  modality: string; // CT, MRI, Ultrasound, etc.
  body_part?: string;
  contrast_required: boolean;
  radiation_exposure?: string; // Low, Medium, High (NULL for non-radiation scans like MRI/USG)
  requires_sedation: boolean;
  requires_prep: boolean;
  prep_instructions?: string;
  average_duration?: number; // in minutes
  normal_turnaround_time?: number; // in hours
  urgent_turnaround_time?: number; // in hours
  test_cost: number;
  is_active: boolean;
  requires_radiologist: boolean;
}

/**
 * Get all active scan tests from catalog
 */
export async function getScanTestCatalog(): Promise<ScanTestCatalog[]> {
  try {
    const { data, error } = await supabase
      .from('scan_test_catalog')
      .select('*')
      .eq('is_active', true)
      .order('modality', { ascending: true })
      .order('test_name', { ascending: true });

    if (error) {
      console.warn('Scan test catalog not available:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getScanTestCatalog:', error);
    return [];
  }
}

/**
 * Create a new scan test in the catalog
 */
export async function createScanTestCatalogEntry(testData: Partial<ScanTestCatalog>): Promise<ScanTestCatalog> {
  const { data, error } = await supabase
    .from('scan_test_catalog')
    .insert([{      
      contrast_required: false, // Default
      requires_sedation: false, // Default
      requires_prep: false, // Default
      requires_radiologist: true, // Default
      ...testData,
      test_code: testData.test_code || `SCN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      is_active: true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating scan test:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create scan test: ${error.message || error.code || 'Unknown error'}`);
  }
  return data;
}

// ============================================
// SCAN ORDER FUNCTIONS
// ============================================

/**
 * Generate unique scan order number
 */
function generateScanOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SCN-${year}${month}${day}-${random}`;
}

export interface ScanTestOrder {
  id?: string;
  order_number?: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  ordering_doctor_id: string;
  test_catalog_id: string;
  clinical_indication: string;
  provisional_diagnosis?: string;
  special_instructions?: string;
  body_part?: string;
  laterality?: string;
  contrast_required?: boolean;
  contrast_type?: string;
  patient_preparation_notes?: string;
  allergies_checked?: boolean;
  prep_completed?: boolean;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  preferred_scan_date?: string;
  preferred_scan_time?: string;
  status?: string;
  staff_id?: string;
}

/**
 * Create a new scan test order
 */
export async function createScanTestOrder(orderData: ScanTestOrder): Promise<any> {
  try {
    const orderNumber = generateScanOrderNumber();

    const { data: order, error } = await supabase
      .from('scan_test_orders')
      .insert([{
        ...orderData,
        order_number: orderNumber,
        status: 'ordered',
        staff_id: orderData.staff_id
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create scan test order:', error);
      throw new Error(`Failed to create scan test order: ${error.message}`);
    }

    // Create billing item
    if (order) {
      // Fetch catalog data separately
      const { data: catalog, error: catalogError } = await supabase
        .from('scan_test_catalog')
        .select('*')
        .eq('id', order.test_catalog_id)
        .single();

      if (catalogError) {
        console.error('Error fetching catalog for billing:', catalogError);
      } else if (catalog) {
        await createDiagnosticBilling('scan', order.id, orderData.patient_id, catalog.test_name, catalog.test_cost);
      }
    }

    // Return the complete order with related data
    if (order) {
      const [patient, doctor, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .eq('id', order.patient_id)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('id', order.ordering_doctor_id)
          .single(),
        supabase
          .from('scan_test_catalog')
          .select('*')
          .eq('id', order.test_catalog_id)
          .single()
      ]);

      return {
        ...order,
        patient: patient.data,
        ordering_doctor: doctor.data,
        test_catalog: catalog.data
      };
    }

    return order;
  } catch (error) {
    console.error('Error in createScanTestOrder:', error);
    throw error;
  }
}

/**
 * Get scan orders for a patient
 */
export async function getPatientScanOrders(patientId: string): Promise<any[]> {
  try {
    const { data: orders, error } = await supabase
      .from('scan_test_orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Scan orders table not available:', error.message);
      return [];
    }

    // Fetch related data separately
    if (orders && orders.length > 0) {
      const doctorIds = [...new Set(orders.map(order => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map(order => order.test_catalog_id))];
      const orderIds = orders.map(order => order.id);

      const [patient, doctors, catalog, results] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name')
          .eq('id', patientId)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .in('id', doctorIds),
        supabase
          .from('scan_test_catalog')
          .select('*')
          .in('id', catalogIds),
        supabase
          .from('scan_test_results') // Assuming scan test results table exists
          .select('*')
          .in('order_id', orderIds)
      ]);

      // Combine the data
      return orders.map(order => ({
        ...order,
        patient: patient.data,
        ordering_doctor: doctors.data?.find(d => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find(c => c.id === order.test_catalog_id),
        results: results.data?.filter(r => r.order_id === order.id) || []
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in getPatientScanOrders:', error);
    return [];
  }
}

/**
 * Get all scan orders with filters
 */
export async function getScanOrders(filters?: {
  status?: string;
  urgency?: string;
  modality?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]> {
  try {
    let query = supabase
      .from('scan_test_orders')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.urgency) {
      query = query.eq('urgency', filters.urgency);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.modality) {
      // Need to join with scan_test_catalog to filter by modality
      const { data: catalogTests, error: catalogError } = await supabase
        .from('scan_test_catalog')
        .select('id')
        .eq('modality', filters.modality);

      if (catalogError) {
        console.warn('Scan catalog not available for modality filter:', catalogError.message);
      }

      const catalogIds = catalogTests?.map(test => test.id) || [];
      if (catalogIds.length > 0) {
        query = query.in('test_catalog_id', catalogIds);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) {
      console.warn('Scan orders table not available:', error.message);
      return [];
    }

    // Fetch related data separately
    if (orders && orders.length > 0) {
      const patientIds = [...new Set(orders.map(order => order.patient_id))];
      const doctorIds = [...new Set(orders.map(order => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map(order => order.test_catalog_id))];

      const [patients, doctors, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .in('id', patientIds),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .in('id', doctorIds),
        supabase
          .from('scan_test_catalog')
          .select('*')
          .in('id', catalogIds)
      ]);

      // Combine the data
      return orders.map(order => ({
        ...order,
        patient: patients.data?.find(p => p.id === order.patient_id),
        ordering_doctor: doctors.data?.find(d => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find(c => c.id === order.test_catalog_id)
      }));
    }

    return [];
  } catch (error) {
    console.error('Error in getScanOrders:', error);
    return [];
  }
}

/**
 * Update scan order
 */
export async function updateScanOrder(
  orderId: string,
  updateData: any
): Promise<any> {
  try {
    const { data: order, error } = await supabase
      .from('scan_test_orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update scan order:', error);
      throw new Error(`Failed to update scan order: ${error.message}`);
    }

    // Return the complete order with related data
    if (order) {
      const [patient, doctor, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name, phone, date_of_birth, gender')
          .eq('id', order.patient_id)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('id', order.ordering_doctor_id)
          .single(),
        supabase
          .from('scan_test_catalog')
          .select('*')
          .eq('id', order.test_catalog_id)
          .single()
      ]);

      return {
        ...order,
        patient: patient.data,
        ordering_doctor: doctor.data,
        test_catalog: catalog.data
      };
    }

    return order;
  } catch (error) {
    console.error('Error in updateScanOrder:', error);
    throw error;
  }
}

/**
 * Delete scan order
 */
export async function deleteScanOrder(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scan_test_orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Failed to delete scan order:', error);
      throw new Error(`Failed to delete scan order: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteScanOrder:', error);
    throw error;
  }
}

/**
 * Get scan orders for dashboard analytics
 */
export async function getScanOrdersForAnalytics(): Promise<any[]> {
  try {
    const { data: orders, error } = await supabase
      .from('scan_test_orders')
      .select('id, status, created_at, urgency');

    if (error) {
      console.warn('Scan orders table not available:', error.message);
      return [];
    }

    return orders || [];
  } catch (error) {
    console.error('Error in getScanOrdersForAnalytics:', error);
    return [];
  }
}
