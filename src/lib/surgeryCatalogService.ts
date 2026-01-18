import { supabase } from './supabase';

export interface SurgeryCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SurgeryService {
  id: string;
  category_id?: string | null;
  service_code?: string | null;
  service_name: string;
  description?: string | null;
  base_price: number;
  surgeon_fee: number;
  anesthesia_fee: number;
  ot_charges: number;
  consumables_charges: number;
  equipment_charges: number;
  other_charges: number;
  total_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: SurgeryCategory | null;
}

export async function listSurgeryCategories(): Promise<SurgeryCategory[]> {
  const { data, error } = await supabase
    .from('surgery_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as SurgeryCategory[];
}

export async function createSurgeryCategory(input: {
  name: string;
  description?: string | null;
  sort_order?: number;
}): Promise<SurgeryCategory> {
  const { data, error } = await supabase
    .from('surgery_categories')
    .insert({
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: true
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as SurgeryCategory;
}

export async function updateSurgeryCategory(
  id: string,
  updates: Partial<Pick<SurgeryCategory, 'name' | 'description' | 'is_active' | 'sort_order'>>
): Promise<SurgeryCategory> {
  const { data, error } = await supabase
    .from('surgery_categories')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as SurgeryCategory;
}

export async function listSurgeryServices(options?: {
  categoryId?: string;
  includeInactive?: boolean;
}): Promise<SurgeryService[]> {
  let query = supabase
    .from('surgery_services')
    .select(
      `
      *,
      category:surgery_categories(*)
    `
    );

  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }

  if (!options?.includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    base_price: Number(row.base_price || 0),
    surgeon_fee: Number(row.surgeon_fee || 0),
    anesthesia_fee: Number(row.anesthesia_fee || 0),
    ot_charges: Number(row.ot_charges || 0),
    consumables_charges: Number(row.consumables_charges || 0),
    equipment_charges: Number(row.equipment_charges || 0),
    other_charges: Number(row.other_charges || 0),
    total_price: Number(row.total_price || 0)
  })) as SurgeryService[];
}

export async function createSurgeryService(input: {
  category_id?: string | null;
  service_code?: string | null;
  service_name: string;
  description?: string | null;
  base_price?: number;
  surgeon_fee?: number;
  anesthesia_fee?: number;
  ot_charges?: number;
  consumables_charges?: number;
  equipment_charges?: number;
  other_charges?: number;
}): Promise<SurgeryService> {
  const { data, error } = await supabase
    .from('surgery_services')
    .insert({
      category_id: input.category_id ?? null,
      service_code: input.service_code ?? null,
      service_name: input.service_name,
      description: input.description ?? null,
      base_price: input.base_price ?? 0,
      surgeon_fee: input.surgeon_fee ?? 0,
      anesthesia_fee: input.anesthesia_fee ?? 0,
      ot_charges: input.ot_charges ?? 0,
      consumables_charges: input.consumables_charges ?? 0,
      equipment_charges: input.equipment_charges ?? 0,
      other_charges: input.other_charges ?? 0,
      is_active: true
    })
    .select(`*, category:surgery_categories(*)`)
    .single();

  if (error) throw error;

  const row: any = data;
  return {
    ...row,
    base_price: Number(row.base_price || 0),
    surgeon_fee: Number(row.surgeon_fee || 0),
    anesthesia_fee: Number(row.anesthesia_fee || 0),
    ot_charges: Number(row.ot_charges || 0),
    consumables_charges: Number(row.consumables_charges || 0),
    equipment_charges: Number(row.equipment_charges || 0),
    other_charges: Number(row.other_charges || 0),
    total_price: Number(row.total_price || 0)
  } as SurgeryService;
}

export async function updateSurgeryService(
  id: string,
  updates: Partial<Pick<SurgeryService, 'category_id' | 'service_code' | 'service_name' | 'description' | 'is_active' | 'base_price' | 'surgeon_fee' | 'anesthesia_fee' | 'ot_charges' | 'consumables_charges' | 'equipment_charges' | 'other_charges'>>
): Promise<SurgeryService> {
  const { data, error } = await supabase
    .from('surgery_services')
    .update(updates)
    .eq('id', id)
    .select(`*, category:surgery_categories(*)`)
    .single();

  if (error) throw error;

  const row: any = data;
  return {
    ...row,
    base_price: Number(row.base_price || 0),
    surgeon_fee: Number(row.surgeon_fee || 0),
    anesthesia_fee: Number(row.anesthesia_fee || 0),
    ot_charges: Number(row.ot_charges || 0),
    consumables_charges: Number(row.consumables_charges || 0),
    equipment_charges: Number(row.equipment_charges || 0),
    other_charges: Number(row.other_charges || 0),
    total_price: Number(row.total_price || 0)
  } as SurgeryService;
}
