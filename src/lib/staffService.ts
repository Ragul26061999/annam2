import { supabase } from './supabase';

export interface StaffMember {
  id: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: string;
  department_id?: string;
  is_active: boolean;
  hire_date?: string;
  specialization?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
  // UI helper fields
  name?: string; 
  department_name?: string;
}

export interface StaffRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  department?: string;
  created_at?: string;
}

export interface StaffSchedule {
  id: string;
  staff_id: string;
  date: string;
  shift_start: string;
  shift_end: string;
  shift_type: 'morning' | 'evening' | 'night';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  onLeaveStaff: number;
  departmentCounts: { [department: string]: number };
  roleCounts: { [role: string]: number };
}

/**
 * Get all staff members with optional filtering
 */
export async function getStaffMembers(
  filters?: {
    department_id?: string;
    role?: string;
    is_active?: boolean;
    search?: string;
  }
): Promise<StaffMember[]> {
  try {
    let query = supabase
      .from('staff')
      .select(`
        *,
        departments(name)
      `);

    if (filters?.department_id) {
      query = query.eq('department_id', filters.department_id);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,role.ilike.%${filters.search}%`);
    }

    const { data: staff, error } = await query.order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching staff members:', error);
      throw error;
    }

    return (staff || []).map(s => ({
      ...s,
      name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      department_name: s.departments?.name
    }));
  } catch (error) {
    console.error('Error in getStaffMembers:', error);
    throw error;
  }
}

/**
 * Get staff member by ID
 */
export async function getStaffMemberById(id: string): Promise<StaffMember | null> {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*, departments(name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching staff member:', error);
      throw error;
    }

    return {
      ...staff,
      name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
      department_name: staff.departments?.name
    };
  } catch (error) {
    console.error('Error in getStaffMemberById:', error);
    throw error;
  }
}

/**
 * Create a new staff member
 */
export async function createStaffMember(staffData: Omit<StaffMember, 'id' | 'created_at' | 'updated_at' | 'name' | 'department_name'>): Promise<StaffMember> {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .insert([staffData])
      .select()
      .single();

    if (error) {
      console.error('Error creating staff member:', error);
      throw error;
    }

    return staff;
  } catch (error) {
    console.error('Error in createStaffMember:', error);
    throw error;
  }
}

/**
 * Update staff member
 */
export async function updateStaffMember(id: string, updates: Partial<StaffMember>): Promise<StaffMember> {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff member:', error);
      throw error;
    }

    return staff;
  } catch (error) {
    console.error('Error in updateStaffMember:', error);
    throw error;
  }
}

/**
 * Delete staff member
 */
export async function deleteStaffMember(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting staff member:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteStaffMember:', error);
    throw error;
  }
}

/**
 * Get staff statistics
 */
export async function getStaffStats(): Promise<StaffStats> {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('department_id, role, is_active, departments(name)');

    if (error) {
      console.error('Error fetching staff stats:', error);
      throw error;
    }

    const totalStaff = staff?.length || 0;
    const activeStaff = staff?.filter(s => s.is_active).length || 0;
    const onLeaveStaff = 0; // Placeholder

    const departmentCounts: { [department: string]: number } = {};
    const roleCounts: { [role: string]: number } = {};

    staff?.forEach(member => {
      const deptName = (member.departments as any)?.name || 'Unassigned';
      departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;
      
      if (member.role) {
        roleCounts[member.role] = (roleCounts[member.role] || 0) + 1;
      }
    });

    return {
      totalStaff,
      activeStaff,
      onLeaveStaff,
      departmentCounts,
      roleCounts
    };
  } catch (error) {
    console.error('Error in getStaffStats:', error);
    throw error;
  }
}

/**
 * Get staff roles
 */
export async function getStaffRoles(): Promise<StaffRole[]> {
  try {
    const { data: roles, error } = await supabase
      .from('staff_roles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching staff roles:', error);
      throw error;
    }

    return roles || [];
  } catch (error) {
    console.error('Error in getStaffRoles:', error);
    throw error;
  }
}

/**
 * Create staff role
 */
export async function createStaffRole(roleData: Omit<StaffRole, 'id' | 'created_at'>): Promise<StaffRole> {
  try {
    const { data: role, error } = await supabase
      .from('staff_roles')
      .insert([roleData])
      .select()
      .single();

    if (error) {
      console.error('Error creating staff role:', error);
      throw error;
    }

    return role;
  } catch (error) {
    console.error('Error in createStaffRole:', error);
    throw error;
  }
}

/**
 * Get staff schedule
 */
export async function getStaffSchedule(
  staffId?: string,
  dateRange?: { start: string; end: string }
): Promise<StaffSchedule[]> {
  try {
    let query = supabase
      .from('staff_schedules')
      .select(`
        id,
        staff_id,
        date,
        shift_start,
        shift_end,
        shift_type,
        status,
        notes,
        staff:staff(first_name, last_name, role)
      `);

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }

    const { data: schedules, error } = await query.order('date', { ascending: true });

    if (error) {
      console.error('Error fetching staff schedule:', error);
      throw error;
    }

    return (schedules || []).map(s => ({
      ...s,
      staff_name: s.staff ? `${(s.staff as any).first_name} ${(s.staff as any).last_name}` : 'Unknown'
    }));
  } catch (error) {
    console.error('Error in getStaffSchedule:', error);
    throw error;
  }
}

/**
 * Create staff schedule
 */
export async function createStaffSchedule(scheduleData: Omit<StaffSchedule, 'id'>): Promise<StaffSchedule> {
  try {
    const { data: schedule, error } = await supabase
      .from('staff_schedules')
      .insert([scheduleData])
      .select()
      .single();

    if (error) {
      console.error('Error creating staff schedule:', error);
      throw error;
    }

    return schedule;
  } catch (error) {
    console.error('Error in createStaffSchedule:', error);
    throw error;
  }
}

/**
 * Update staff schedule
 */
export async function updateStaffSchedule(id: string, updates: Partial<StaffSchedule>): Promise<StaffSchedule> {
  try {
    const { data: schedule, error } = await supabase
      .from('staff_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff schedule:', error);
      throw error;
    }

    return schedule;
  } catch (error) {
    console.error('Error in updateStaffSchedule:', error);
    throw error;
  }
}

/**
 * Get departments list
 */
export async function getDepartments(): Promise<{id: string, name: string}[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDepartments:', error);
    throw error;
  }
}

/**
 * Get roles list
 */
export async function getRoles(): Promise<string[]> {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('role')
      .not('role', 'is', null);

    if (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }

    const roles = [...new Set(staff?.map(s => s.role).filter(Boolean))] as string[];
    return roles.sort();
  } catch (error) {
    console.error('Error in getRoles:', error);
    throw error;
  }
}

/**
 * Bulk update staff members
 */
export async function bulkUpdateStaff(ids: string[], updates: Partial<StaffMember>): Promise<void> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      console.error('Error bulk updating staff:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in bulkUpdateStaff:', error);
    throw error;
  }
}

/**
 * Bulk delete staff members
 */
export async function bulkDeleteStaff(ids: string[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('staff')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error bulk deleting staff:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in bulkDeleteStaff:', error);
    throw error;
  }
}