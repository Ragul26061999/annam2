import { supabase } from './supabase';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  shift: string;
  contact: string;
  email?: string;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date?: string;
  employee_id?: string;
  specialization?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
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
    department?: string;
    role?: string;
    status?: string;
    search?: string;
  }
): Promise<StaffMember[]> {
  try {
    let query = supabase
      .from('staff')
      .select(`
        id,
        employee_id,
        name,
        role,
        department,
        shift,
        contact,
        email,
        status,
        hire_date,
        specialization,
        created_at,
        updated_at
      `);

    if (filters?.department) {
      query = query.eq('department', filters.department);
    }

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,role.ilike.%${filters.search}%,department.ilike.%${filters.search}%`);
    }

    const { data: staff, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Error fetching staff members:', error);
      throw error;
    }

    return staff || [];
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
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching staff member:', error);
      throw error;
    }

    return staff;
  } catch (error) {
    console.error('Error in getStaffMemberById:', error);
    throw error;
  }
}

/**
 * Create a new staff member
 */
export async function createStaffMember(staffData: Omit<StaffMember, 'id' | 'created_at' | 'updated_at'>): Promise<StaffMember> {
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
      .select('department, role, status');

    if (error) {
      console.error('Error fetching staff stats:', error);
      throw error;
    }

    const totalStaff = staff?.length || 0;
    const activeStaff = staff?.filter(s => s.status === 'active').length || 0;
    const onLeaveStaff = staff?.filter(s => s.status === 'on_leave').length || 0;

    const departmentCounts: { [department: string]: number } = {};
    const roleCounts: { [role: string]: number } = {};

    staff?.forEach(member => {
      if (member.department) {
        departmentCounts[member.department] = (departmentCounts[member.department] || 0) + 1;
      }
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
        staff:staff(name, role, department)
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

    return schedules || [];
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
export async function getDepartments(): Promise<string[]> {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('department')
      .not('department', 'is', null);

    if (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }

    const departments = [...new Set(staff?.map(s => s.department).filter(Boolean))] as string[];
    return departments.sort();
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