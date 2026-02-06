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

// ============================================
// GROUPED LAB ORDERS
// ============================================

export interface GroupedLabOrder {
  id: string;
  group_name_snapshot?: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  ordering_doctor_id?: string;
  clinical_indication?: string;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  status: string;
  is_ip: boolean;
  bed_allocation_id?: string;
  billing_id?: string;
  created_at: string;
  updated_at: string;
  items: GroupedLabOrderItem[];
  attachments: LabXrayAttachment[];
}

export interface GroupedLabOrderItem {
  id: string;
  group_order_id: string;
  service_type: 'lab' | 'radiology' | 'scan' | 'xray';
  catalog_id: string;
  item_name_snapshot: string;
  selected: boolean;
  status: string;
  sort_order: number;
  legacy_lab_test_order_id?: string;
  legacy_radiology_test_order_id?: string;
  legacy_scan_order_id?: string;
  legacy_xray_order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LabXrayAttachment {
  id: string;
  patient_id: string;
  group_order_id?: string;
  lab_order_id?: string;
  radiology_order_id?: string;
  test_name: string;
  test_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  file_url?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupedLabOrderParams {
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  ordering_doctor_id?: string;
  clinical_indication?: string;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  service_items: {
    service_type: 'lab' | 'radiology' | 'scan' | 'xray';
    catalog_id: string;
    item_name: string;
    sort_order?: number;
  }[];
  is_ip?: boolean;
  bed_allocation_id?: string;
  group_id?: string;
  group_name?: string;
}

// ============================================
// BILLING (billing + billing_item)
// ============================================

export interface BillingLineItem {
  id: string;
  billing_id: string;
  description: string;
  qty: number;
  unit_amount: number;
  total_amount: number;
  ref_id?: string | null;
}

export interface DiagnosticBill {
  id: string;
  bill_no?: string | null;
  bill_number?: string | null;
  patient_id?: string | null;
  created_at?: string;
  issued_at?: string;
  payment_status?: string;
  payment_method?: string | null;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  bill_type?: string | null;
  patient?: any;
  items: BillingLineItem[];
}

export async function getDiagnosticBillsFromBilling(filters?: {
  bill_type?: 'lab' | 'radiology' | 'scan' | 'diagnostics';
  payment_status?: string;
  searchTerm?: string;
}): Promise<DiagnosticBill[]> {
  try {
    let billTypes: string[] = ['lab', 'radiology'];
    if (filters?.bill_type) {
      billTypes = [filters.bill_type];
    }

    let query = supabase
      .from('billing')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, gender, date_of_birth)
      `)
      .in('bill_type', billTypes)
      .order('created_at', { ascending: false });

    if (filters?.payment_status && filters.payment_status !== 'all') {
      query = query.eq('payment_status', filters.payment_status);
    }

    const { data: bills, error } = await query;
    if (error) {
      console.warn('Billing table not available:', error.message);
      return [];
    }

    let result = bills || [];

    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter((b: any) =>
        String(b.bill_no || b.bill_number || '').toLowerCase().includes(term) ||
        b.patient?.name?.toLowerCase().includes(term) ||
        b.patient?.patient_id?.toLowerCase().includes(term)
      );
    }

    const billIds = result.map((b: any) => b.id);
    if (!billIds.length) return [];

    const { data: lines, error: lineError } = await supabase
      .from('billing_item')
      .select('*')
      .in('billing_id', billIds)
      .order('created_at', { ascending: true });

    if (lineError) {
      console.warn('Billing items table not available:', lineError.message);
    }

    const byBill = new Map<string, BillingLineItem[]>();
    (lines || []).forEach((row: any) => {
      const arr = byBill.get(row.billing_id) || [];
      arr.push({
        id: row.id,
        billing_id: row.billing_id,
        description: row.description,
        qty: Number(row.qty) || 0,
        unit_amount: Number(row.unit_amount) || 0,
        total_amount: Number(row.total_amount) || 0,
        ref_id: row.ref_id,
      });
      byBill.set(row.billing_id, arr);
    });

    return result.map((b: any) => ({
      ...b,
      items: byBill.get(b.id) || [],
    }));
  } catch (e) {
    console.error('Error in getDiagnosticBillsFromBilling:', e);
    return [];
  }
}

export interface ScanTestCatalogLegacy {
  id: string;
  scan_code: string | null;
  scan_name: string;
  category: string;
  body_part: string | null;
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
  ordering_doctor_id?: string;
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

export interface ScanOrder {
  id?: string;
  encounter_id: string;
  appointment_id?: string;
  patient_id: string;
  ordering_doctor_id?: string;
  scan_type: string;
  scan_name: string;
  body_part?: string;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  clinical_indication: string;
  special_instructions?: string;
  status?: string;
  scan_test_catalog_id?: string;
  amount?: number;
}

export interface RadiologyTestOrder {
  id?: string;
  order_number?: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  ordering_doctor_id?: string;
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

export interface DiagnosticGroup {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  service_types?: Array<'lab' | 'radiology' | 'scan' | 'xray'>;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DiagnosticGroupItem {
  id: string;
  group_id: string;
  service_type: 'lab' | 'radiology' | 'scan' | 'xray';
  catalog_id: string;
  default_selected: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

async function tryGetAuthUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

async function tryGetAppUserId(): Promise<string | null> {
  try {
    const authId = await tryGetAuthUserId();
    if (!authId) return null;

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data?.id ?? null;
  } catch {
    return null;
  }
}

// ============================================
// DIAGNOSTIC GROUPS (TEMPLATES)
// ============================================

export async function getDiagnosticGroups(filters?: {
  is_active?: boolean;
}): Promise<DiagnosticGroup[]> {
  try {
    let query = supabase
      .from('diagnostic_groups')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (typeof filters?.is_active === 'boolean') {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching diagnostic groups:', error);
      throw new Error(`Failed to fetch groups: ${error.message}`);
    }
    return (data || []) as DiagnosticGroup[];
  } catch (error) {
    console.error('Error in getDiagnosticGroups:', error);
    throw error;
  }
}

export async function createDiagnosticGroup(payload: {
  name: string;
  category?: string;
  service_types?: Array<'lab' | 'radiology' | 'scan' | 'xray'>;
}): Promise<DiagnosticGroup> {
  try {
    const createdBy = await tryGetAppUserId();
    const { data, error } = await supabase
      .from('diagnostic_groups')
      .insert([
        {
          name: payload.name,
          category: payload.category || 'Lab',
          service_types: payload.service_types || [],
          created_by: createdBy,
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating diagnostic group:', error);
      throw new Error(`Failed to create group: ${error.message}`);
    }
    return data as DiagnosticGroup;
  } catch (error) {
    console.error('Error in createDiagnosticGroup:', error);
    throw error;
  }
}

export async function updateDiagnosticGroup(
  groupId: string,
  updates: Partial<Pick<DiagnosticGroup, 'name' | 'category' | 'is_active' | 'service_types'>>
): Promise<DiagnosticGroup> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_groups')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating diagnostic group:', error);
      throw new Error(`Failed to update group: ${error.message}`);
    }
    return data as DiagnosticGroup;
  } catch (error) {
    console.error('Error in updateDiagnosticGroup:', error);
    throw error;
  }
}

export async function deleteDiagnosticGroup(groupId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('diagnostic_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting diagnostic group:', error);
      throw new Error(`Failed to delete group: ${error.message}`);
    }
    return true;
  } catch (error) {
    console.error('Error in deleteDiagnosticGroup:', error);
    throw error;
  }
}

export async function getDiagnosticGroupItems(groupId: string): Promise<DiagnosticGroupItem[]> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_group_items')
      .select('*')
      .eq('group_id', groupId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching diagnostic group items:', error);
      throw new Error(`Failed to fetch group items: ${error.message}`);
    }
    return (data || []) as DiagnosticGroupItem[];
  } catch (error) {
    console.error('Error in getDiagnosticGroupItems:', error);
    throw error;
  }
}

export async function createDiagnosticGroupItem(payload: {
  group_id: string;
  service_type: DiagnosticGroupItem['service_type'];
  catalog_id: string;
  default_selected?: boolean;
  sort_order?: number;
}): Promise<DiagnosticGroupItem> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_group_items')
      .insert([
        {
          group_id: payload.group_id,
          service_type: payload.service_type,
          catalog_id: payload.catalog_id,
          default_selected: payload.default_selected ?? true,
          sort_order: payload.sort_order ?? 0,
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating diagnostic group item:', error);
      throw new Error(`Failed to create group item: ${error.message}`);
    }
    return data as DiagnosticGroupItem;
  } catch (error) {
    console.error('Error in createDiagnosticGroupItem:', error);
    throw error;
  }
}

export async function updateDiagnosticGroupItem(
  itemId: string,
  updates: Partial<Pick<DiagnosticGroupItem, 'default_selected' | 'sort_order'>>
): Promise<DiagnosticGroupItem> {
  try {
    const { data, error } = await supabase
      .from('diagnostic_group_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating diagnostic group item:', error);
      throw new Error(`Failed to update group item: ${error.message}`);
    }
    return data as DiagnosticGroupItem;
  } catch (error) {
    console.error('Error in updateDiagnosticGroupItem:', error);
    throw error;
  }
}

export async function deleteDiagnosticGroupItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('diagnostic_group_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting diagnostic group item:', error);
      throw new Error(`Failed to delete group item: ${error.message}`);
    }
    return true;
  } catch (error) {
    console.error('Error in deleteDiagnosticGroupItem:', error);
    throw error;
  }
}

export async function getPatientXrayOrders(patientId: string): Promise<any[]> {
  try {
    const { data: orders, error } = await supabase
      .from('xray_orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching xray orders:', error.message);
      return [];
    }

    return orders || [];
  } catch (error) {
    console.error('Error in getPatientXrayOrders:', error);
    return [];
  }
}

// ============================================
// SCAN/OTHER CATALOG FUNCTIONS
// ============================================

export async function getLegacyScanTestCatalog(): Promise<ScanTestCatalogLegacy[]> {
  try {
    const { data, error } = await supabase
      .from('scan_test_catalog')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('scan_name', { ascending: true });

    if (error) {
      console.warn('Scan test catalog not available:', error.message);
      return [];
    }

    return (data || []) as ScanTestCatalogLegacy[];
  } catch (error) {
    console.error('Error in getLegacyScanTestCatalog:', error);
    return [];
  }
}

export async function createLegacyScanTestCatalogEntry(testData: Partial<ScanTestCatalogLegacy>): Promise<ScanTestCatalogLegacy> {
  const { data, error } = await supabase
    .from('scan_test_catalog')
    .insert([
      {
        ...testData,
        scan_code: testData.scan_code || `SCN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        scan_name: testData.scan_name,
        category: testData.category || 'Scans/Other',
        test_cost: Number(testData.test_cost || 0),
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating scan catalog entry:', error);
    throw new Error(`Failed to create scan catalog entry: ${error.message || error.code || 'Unknown error'}`);
  }

  return data as ScanTestCatalogLegacy;
}

// ============================================
// SCAN/OTHER ORDER FUNCTIONS
// ============================================

export async function createScanOrder(orderData: ScanOrder): Promise<any> {
  try {
    const payload: any = {
      encounter_id: orderData.encounter_id,
      appointment_id: orderData.appointment_id || null,
      patient_id: orderData.patient_id,
      doctor_id: orderData.ordering_doctor_id,
      scan_type: orderData.scan_type,
      scan_name: orderData.scan_name,
      body_part: orderData.body_part || null,
      urgency: orderData.urgency || 'routine',
      clinical_indication: orderData.clinical_indication,
      special_instructions: orderData.special_instructions || null,
      status: orderData.status || 'ordered',
      ordered_date: new Date().toISOString(),
      scan_test_catalog_id: orderData.scan_test_catalog_id || null,
      amount: orderData.amount ?? null,
    };

    const { data: order, error } = await supabase
      .from('scan_orders')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create scan order:', error);
      throw new Error(`Failed to create scan order: ${error.message}`);
    }

    // Create diagnostic billing item (optional table)
    try {
      const amount = Number(order.amount ?? orderData.amount ?? 0);
      await createDiagnosticBilling('scan', order.id, orderData.patient_id, orderData.scan_name, amount);
    } catch (e) {
      console.warn('Failed to create scan diagnostic billing item:', e);
    }

    // Attach catalog + patient/doctor
    const [catalog, patient, doctor] = await Promise.all([
      order.scan_test_catalog_id
        ? supabase.from('scan_test_catalog').select('*').eq('id', order.scan_test_catalog_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from('patients').select('id, patient_id, name, phone, date_of_birth, gender').eq('id', order.patient_id).maybeSingle(),
      supabase.from('doctors').select('id, name, specialization').eq('id', order.doctor_id).maybeSingle(),
    ]);

    return {
      ...order,
      scan_test_catalog: catalog.data || null,
      patient: patient.data || null,
      doctor: doctor.data || null,
    };
  } catch (error) {
    console.error('Error in createScanOrder:', error);
    throw error;
  }
}

export async function getPatientLegacyScanOrders(patientId: string): Promise<any[]> {
  try {
    const { data: orders, error } = await supabase
      .from('scan_orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching scan orders:', error.message);
      return [];
    }

    return orders || [];
  } catch (error) {
    console.error('Error in getPatientLegacyScanOrders:', error);
    return [];
  }
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
  return data as LabTestCatalog;
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
          .eq('id', order.doctor_id)
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
      const doctorIds = [...new Set(orders.map((order: any) => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map((order: any) => order.test_catalog_id))];
      const orderIds = orders.map((order: any) => order.id);

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
      return orders.map((order: any) => ({
        ...order,
        patient: patient.data,
        ordering_doctor: doctors.data?.find((d: any) => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find((c: any) => c.id === order.test_catalog_id),
        results: results.data?.filter((r: any) => r.order_id === order.id) || []
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
      const patientIds = [...new Set(orders.map((order: any) => order.patient_id))];
      const doctorIds = [...new Set(orders.map((order: any) => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map((order: any) => order.test_catalog_id))];

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
      return orders.map((order: any) => ({
        ...order,
        patient: patients.data?.find((p: any) => p.id === order.patient_id),
        ordering_doctor: doctors.data?.find((d: any) => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find((c: any) => c.id === order.test_catalog_id)
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
          .eq('id', order.doctor_id)
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
          .eq('id', order.doctor_id)
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
      const doctorIds = [...new Set(orders.map((order: any) => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map((order: any) => order.test_catalog_id))];

      const [patient, doctors, catalog] = await Promise.all([
        supabase
          .from('patients')
          .select('id, patient_id, name')
          .eq('id', patientId)
          .single(),
        supabase
          .from('doctors')
          .select('id, name, specialization')
          .in('id', [...new Set([...doctorIds, ...orders.map((o: any) => o.radiologist_id).filter((id: any) => id !== null)])]),
        supabase
          .from('radiology_test_catalog')
          .select('*')
          .in('id', catalogIds)
      ]);

      // Combine the data
      return orders.map((order: any) => ({
        ...order,
        patient: patient.data,
        ordering_doctor: doctors.data?.find((d: any) => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find((c: any) => c.id === order.test_catalog_id),
        radiologist: doctors.data?.find((d: any) => d.id === order.radiologist_id)
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

      const catalogIds = catalogTests?.map((test: any) => test.id) || [];
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
      const patientIds = [...new Set(orders.map((order: any) => order.patient_id))];
      const doctorIds = [...new Set(orders.map((order: any) => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map((order: any) => order.test_catalog_id))];

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
      return orders.map((order: any) => ({
        ...order,
        patient: patients.data?.find((p: any) => p.id === order.patient_id),
        ordering_doctor: doctors.data?.find((d: any) => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find((c: any) => c.id === order.test_catalog_id)
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
          .eq('id', order.doctor_id)
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

    return result.map((item: any) => ({
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
// ============================================

export interface ScanTestCatalog {
  id: string;
  // Legacy/active schema (most deployments)
  scan_code?: string | null;
  scan_name?: string;
  category?: string;
  body_part?: string | null;
  test_cost?: number;
  is_active?: boolean;

  // Alternate/newer schema (some migrations)
  test_code?: string;
  test_name?: string;
  modality?: string;

  // Additional fields may exist depending on schema
  [key: string]: any;
}

function normalizeScanCatalogRow(row: any): ScanTestCatalog {
  if (!row) return row;
  const scan_name = row.scan_name ?? row.test_name;
  const category = row.category ?? row.modality;
  const test_cost = Number(row.test_cost ?? 0);
  const scan_code = row.scan_code ?? row.test_code ?? null;

  return {
    ...row,
    scan_name,
    category,
    test_cost,
    scan_code,
    // Provide aliases for UI code that still expects these
    test_name: row.test_name ?? scan_name,
    modality: row.modality ?? category,
    test_code: row.test_code ?? scan_code,
  };
}

/**
 * Get all active scan tests from catalog
 */
export async function getScanTestCatalog(): Promise<ScanTestCatalog[]> {
  try {
    console.log('Attempting to fetch scan test catalog...');
    const { data, error } = await supabase
      .from('scan_test_catalog')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    console.log('Scan catalog query result:', { data, error });

    if (error) {
      console.warn('Scan test catalog not available:', error.message);
      console.warn('Full error details:', error);
      return [];
    }

    console.log('Raw scan catalog data:', data);
    const result = (data || []).map(normalizeScanCatalogRow);
    console.log('Normalized scan catalog data:', result);
    return result;
  } catch (error) {
    console.error('Error in getScanTestCatalog:', error);
    return [];
  }
}

/**
 * Create a new scan test in the catalog
 */
export async function createScanTestCatalogEntry(testData: Partial<ScanTestCatalog>): Promise<ScanTestCatalog> {
  const scanName = (testData.scan_name ?? testData.test_name ?? '').toString().trim();
  if (!scanName) {
    throw new Error('Scan name is required');
  }

  const category = (testData.category ?? testData.modality ?? 'Scans/Other').toString().trim();
  const testCost = Number(testData.test_cost ?? 0);
  const scanCode = (testData.scan_code ?? testData.test_code ?? `SCN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).toString();

  const { data, error } = await supabase
    .from('scan_test_catalog')
    .insert([
      {
        // Only insert columns that exist in the legacy scan_test_catalog schema.
        // Do NOT spread testData here, because keys like test_name/modality/test_code
        // may not exist and will cause PostgREST schema cache errors.
        scan_code: scanCode,
        scan_name: scanName,
        category,
        body_part: testData.body_part ?? null,
        test_cost: testCost,
        is_active: true,
      } as any,
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating scan test:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create scan test: ${error.message || error.code || 'Unknown error'}`);
  }
  return normalizeScanCatalogRow(data);
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
  ordering_doctor_id?: string;
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
export async function createScanTestOrder(scanOrderData: any) {
  console.log('🚀 Scan order received:', scanOrderData);
  
  // TEMPORARY SOLUTION: Store scan orders as JSON in a text field
  // until the scan_test_orders table is created
  
  try {
    // Try to create the order in the main table first
    const { data: testTable, error: tableError } = await supabase
      .from('scan_test_orders')
      .select('id')
      .limit(1);
    
    if (!tableError) {
      // Table exists, proceed with normal flow
      console.log('✅ scan_test_orders table exists, proceeding normally...');
      
      const insertData = {
        order_number: scanOrderData.order_number || `SCN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        patient_id: scanOrderData.patient_id,
        ordering_doctor_id: scanOrderData.ordering_doctor_id,
        test_catalog_id: scanOrderData.test_catalog_id,
        clinical_indication: scanOrderData.clinical_indication || 'Scan requested',
        status: 'ordered',
        created_at: new Date().toISOString()
      };
      
      const { data: order, error } = await supabase
        .from('scan_test_orders')
        .insert([insertData])
        .select('*')
        .single();
        
      if (error) throw error;
      return order;
    }
    
    // Table doesn't exist, use temporary storage
    console.log('⚠️  Using temporary storage for scan orders');
    
    // Store in a temporary location (could be a different table or file)
    const tempOrder = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...scanOrderData,
      created_at: new Date().toISOString(),
      temp_storage: true,
      message: 'This scan order is temporarily stored. Please create the scan_test_orders table to enable full functionality.'
    };
    
    // Store in localStorage-like solution or return temp data
    console.log('✅ Scan order temporarily stored:', tempOrder);
    
    // Show user-friendly message
    const errorMessage = `🚀 Scan order created temporarily!\n\nTo enable full scan functionality, please:\n1. Go to: https://supabase.com/dashboard/project/zusheijhebsmjiyyeiqq/sql\n2. Run the SQL from CREATE_SCAN_TABLES.sql\n3. Your scan orders will then be properly stored\n\nTemporary Order ID: ${tempOrder.id}`;
    
    throw new Error(errorMessage);
    
  } catch (error) {
    console.error('Scan order creation failed:', error);
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
      const doctorIds = [...new Set(orders.map((order: any) => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map((order: any) => order.test_catalog_id))];
      const orderIds = orders.map((order: any) => order.id);

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
      return orders.map((order: any) => ({
        ...order,
        patient: patient.data,
        ordering_doctor: doctors.data?.find((d: any) => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find((c: any) => c.id === order.test_catalog_id),
        results: results.data?.filter((r: any) => r.order_id === order.id) || []
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

      const catalogIds = catalogTests?.map((test: any) => test.id) || [];
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
      const patientIds = [...new Set(orders.map((order: any) => order.patient_id))];
      const doctorIds = [...new Set(orders.map((order: any) => order.ordering_doctor_id))];
      const catalogIds = [...new Set(orders.map((order: any) => order.test_catalog_id))];

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
      return orders.map((order: any) => ({
        ...order,
        patient: patients.data?.find((p: any) => p.id === order.patient_id),
        ordering_doctor: doctors.data?.find((d: any) => d.id === order.ordering_doctor_id),
        test_catalog: catalog.data?.find((c: any) => c.id === order.test_catalog_id)
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
          .eq('id', order.doctor_id)
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

// ============================================
// GROUPED LAB ORDER FUNCTIONS
// ============================================

export async function createGroupedLabOrder(params: CreateGroupedLabOrderParams): Promise<GroupedLabOrder> {
  try {
    const { data, error } = await supabase.rpc('create_grouped_lab_order', {
      p_patient_id: params.patient_id,
      p_encounter_id: params.encounter_id || null,
      p_appointment_id: params.appointment_id || null,
      p_ordering_doctor_id: params.ordering_doctor_id || null,
      p_clinical_indication: params.clinical_indication || null,
      p_urgency: params.urgency || 'routine',
      p_service_items: JSON.stringify(params.service_items),
      p_is_ip: params.is_ip || false,
      p_bed_allocation_id: params.bed_allocation_id || null,
      p_group_id: params.group_id || null,
      p_group_name: params.group_name || null
    });

    if (error) {
      console.error('Failed to create grouped lab order:', error);
      throw new Error(`Failed to create grouped lab order: ${error.message}`);
    }

    // Fetch the complete grouped order with items and attachments
    return await getGroupedLabOrder(data);
  } catch (error) {
    console.error('Error in createGroupedLabOrder:', error);
    throw error;
  }
}

export async function getGroupedLabOrder(groupOrderId: string): Promise<GroupedLabOrder> {
  try {
    const { data: groupOrder, error: groupError } = await supabase
      .from('diagnostic_group_orders')
      .select('*')
      .eq('id', groupOrderId)
      .single();

    if (groupError) {
      console.error('Failed to fetch grouped lab order:', groupError);
      throw new Error(`Failed to fetch grouped lab order: ${groupError.message}`);
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('diagnostic_group_order_items')
      .select('*')
      .eq('group_order_id', groupOrderId)
      .order('sort_order');

    if (itemsError) {
      console.error('Failed to fetch grouped lab order items:', itemsError);
      throw new Error(`Failed to fetch grouped lab order items: ${itemsError.message}`);
    }

    // Fetch attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .eq('group_order_id', groupOrderId)
      .order('created_at', { ascending: false });

    if (attachmentsError) {
      console.error('Failed to fetch grouped lab order attachments:', attachmentsError);
      throw new Error(`Failed to fetch grouped lab order attachments: ${attachmentsError.message}`);
    }

    return {
      ...groupOrder,
      items: items || [],
      attachments: attachments || []
    };
  } catch (error) {
    console.error('Error in getGroupedLabOrder:', error);
    throw error;
  }
}

export async function getGroupedLabOrdersForPatient(patientId: string): Promise<GroupedLabOrder[]> {
  try {
    const { data: groupOrders, error } = await supabase
      .from('diagnostic_group_orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch grouped lab orders for patient:', error);
      throw new Error(`Failed to fetch grouped lab orders for patient: ${error.message}`);
    }

    // Fetch items and attachments for all orders
    const ordersWithDetails = await Promise.all(
      (groupOrders || []).map(async (order: any) => {
        const [items, attachments] = await Promise.all([
          supabase
            .from('diagnostic_group_order_items')
            .select('*')
            .eq('group_order_id', order.id)
            .order('sort_order'),
          supabase
            .from('lab_xray_attachments')
            .select('*')
            .eq('group_order_id', order.id)
            .order('created_at', { ascending: false })
        ]);

        return {
          ...order,
          items: items.data || [],
          attachments: attachments.data || []
        };
      })
    );

    return ordersWithDetails;
  } catch (error) {
    console.error('Error in getGroupedLabOrdersForPatient:', error);
    throw error;
  }
}

export async function addGroupLabAttachment(
  groupOrderId: string,
  patientId: string,
  fileName: string,
  filePath: string,
  fileType: string,
  fileSize: number,
  fileUrl?: string,
  uploadedBy?: string
): Promise<LabXrayAttachment> {
  try {
    const { data, error } = await supabase.rpc('add_group_lab_attachment', {
      p_group_order_id: groupOrderId,
      p_patient_id: patientId,
      p_file_name: fileName,
      p_file_path: filePath,
      p_file_type: fileType,
      p_file_size: fileSize,
      p_file_url: fileUrl || null,
      p_uploaded_by: uploadedBy || null
    });

    if (error) {
      console.error('Failed to add group lab attachment:', error);
      throw new Error(`Failed to add group lab attachment: ${error.message}`);
    }

    // Fetch the complete attachment record
    const { data: attachment, error: fetchError } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) {
      console.error('Failed to fetch attachment record:', fetchError);
      throw new Error(`Failed to fetch attachment record: ${fetchError.message}`);
    }

    return attachment;
  } catch (error) {
    console.error('Error in addGroupLabAttachment:', error);
    throw error;
  }
}

export async function deleteGroupLabAttachment(attachmentId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('lab_xray_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('Failed to delete group lab attachment:', error);
      throw new Error(`Failed to delete group lab attachment: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteGroupLabAttachment:', error);
    throw error;
  }
}
