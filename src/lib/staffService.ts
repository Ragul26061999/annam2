import { supabase } from './supabase';

export interface StaffMember {
  id: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: string;
  training_category?: string;
  department_id?: string;
  is_active: boolean;
  hire_date?: string;
  specialization?: string;
  pf_number?: string;
  esic_number?: string;
  image?: string;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
  // UI helper fields
  name?: string;
  department_name?: string;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  attendance_date: string;
  time_in?: string;
  time_out?: string;
  status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';
  attendance_type: 'manual' | 'biometric' | 'system';
  notes?: string;
  marked_by?: string;
  created_at?: string;
  updated_at?: string;
  // UI helper fields
  staff_name?: string;
  total_hours?: string;
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
    include_deleted?: boolean;
  }
): Promise<StaffMember[]> {
  try {
    let query = supabase
      .from('staff')
      .select('*');

    // Exclude soft-deleted staff by default
    if (!filters?.include_deleted) {
      query = query.is('deleted_at', null);
    }

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
      console.error('Error fetching staff members:', error.message, error.details);
      throw error;
    }

    // Fetch departments separately to map names (since no FK relationship exists)
    const { data: depts, error: deptsError } = await supabase.from('departments').select('id, name');
    if (deptsError) {
      console.warn('Could not fetch departments for staff mapping:', deptsError.message);
    }
    const deptMap = Object.fromEntries(depts?.map(d => [d.id, d.name]) || []);

    return (staff || []).map(s => ({
      ...s,
      name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      department_name: s.department_id ? deptMap[s.department_id] : undefined
    }));
  } catch (error) {
    console.error('Error in getStaffMembers:', error instanceof Error ? error.message : error);
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
      console.error('Error fetching staff member:', error.message, error.details);
      throw error;
    }

    // Fetch department name manually
    let departmentName = undefined;
    if (staff.department_id) {
      const { data: dept, error: deptError } = await supabase
        .from('departments')
        .select('name')
        .eq('id', staff.department_id)
        .single();

      if (deptError) {
        console.warn(`Could not fetch department name for staff ${id}:`, deptError.message);
      } else {
        departmentName = dept?.name;
      }
    }

    return {
      ...staff,
      name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
      department_name: departmentName
    };
  } catch (error) {
    console.error('Error in getStaffMemberById:', error instanceof Error ? error.message : error);
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
      console.error('Error creating staff member:', error.message, error.details);
      throw error;
    }

    return staff;
  } catch (error) {
    console.error('Error in createStaffMember:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Update staff member
 */
export async function updateStaffMember(id: string, updates: Partial<StaffMember>): Promise<StaffMember> {
  try {
    // Strip UI-only fields before sending to Supabase
    const { name, department_name, created_at, updated_at, ...dbUpdates } = updates as any;

    const { data: staff, error } = await supabase
      .from('staff')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff member:', error.message, error.details);
      throw error;
    }

    return staff;
  } catch (error) {
    console.error('Error in updateStaffMember:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Soft delete staff member
 */
export async function softDeleteStaffMember(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error soft deleting staff member:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in softDeleteStaffMember:', error);
    throw error;
  }
}

/**
 * Restore soft deleted staff member
 */
export async function restoreStaffMember(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('staff')
      .update({ deleted_at: null, is_active: true })
      .eq('id', id);

    if (error) {
      console.error('Error restoring staff member:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in restoreStaffMember:', error);
    throw error;
  }
}

/**
 * Hard delete staff member (permanent)
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
      .select('department_id, role, is_active');

    if (error) {
      console.error('Error fetching staff stats:', error.message, error.details);
      throw error;
    }

    // Fetch departments for mapping
    const { data: depts, error: deptsError } = await supabase.from('departments').select('id, name');
    if (deptsError) {
      console.warn('Could not fetch departments for staff stats:', deptsError.message);
    }
    const deptMap = Object.fromEntries(depts?.map(d => [d.id, d.name]) || []);

    const totalStaff = staff?.length || 0;
    const activeStaff = staff?.filter(s => s.is_active).length || 0;
    const onLeaveStaff = 0; // Placeholder

    const departmentCounts: { [department: string]: number } = {};
    const roleCounts: { [role: string]: number } = {};

    staff?.forEach(member => {
      const deptName = member.department_id ? deptMap[member.department_id] : 'Unassigned';
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
      .select('*');

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
      console.error('Error fetching staff schedule:', error.message, error.details);
      throw error;
    }

    // Fetch staff info separately to map names
    const { data: staffMembers } = await supabase.from('staff').select('id, first_name, last_name, role');
    const staffMap = Object.fromEntries(staffMembers?.map(s => [s.id, s]) || []);

    return (schedules || []).map(s => {
      const staffInfo = staffMap[s.staff_id];
      return {
        ...s,
        staff_name: staffInfo ? `${staffInfo.first_name} ${staffInfo.last_name}` : 'Unknown'
      };
    });
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
export async function getDepartments(): Promise<{ id: string, name: string }[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .eq('status', 'active')
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
    // Strip UI-only fields
    const { name, department_name, created_at, updated_at, ...dbUpdates } = updates as any;

    const { error } = await supabase
      .from('staff')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
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

/**
 * Generate the next unique employee ID
 */
export async function generateNextEmployeeId(): Promise<string> {
  try {
    const { data: staff, error } = await supabase
      .from('staff')
      .select('employee_id')
      .not('employee_id', 'is', null)
      .like('employee_id', 'EMP-%');

    if (error) {
      console.error('Error fetching employee IDs:', error);
      return 'EMP-001';
    }

    if (!staff || staff.length === 0) {
      return 'EMP-001';
    }

    // Extract numbers and find max
    const numbers = staff
      .map(s => {
        const match = s.employee_id?.match(/EMP-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => !isNaN(n));

    const maxId = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextId = maxId + 1;

    // Pad with leading zeros
    return `EMP-${nextId.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error in generateNextEmployeeId:', error);
    return 'EMP-001';
  }
}

/**
 * Mark staff attendance
 */
export async function markAttendance(attendanceData: {
  staff_id: string;
  attendance_date: string;
  time_in?: string;
  time_out?: string;
  status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';
  notes?: string;
  marked_by?: string;
}): Promise<StaffAttendance> {
  try {
    const { data, error } = await supabase
      .from('staff_attendance')
      .upsert({
        ...attendanceData,
        attendance_type: 'manual',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'staff_id,attendance_date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in markAttendance:', error);
    throw error;
  }
}

/**
 * Get staff attendance for a date range
 */
export async function getStaffAttendance(filters?: {
  staff_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}): Promise<StaffAttendance[]> {
  try {
    let query = supabase
      .from('staff_attendance')
      .select('*');

    if (filters?.staff_id) {
      query = query.eq('staff_id', filters.staff_id);
    }

    if (filters?.start_date) {
      query = query.gte('attendance_date', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('attendance_date', filters.end_date);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('attendance_date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }

    // Fetch staff info to add names
    const { data: staff } = await supabase
      .from('staff')
      .select('id, first_name, last_name');
    
    const staffMap = Object.fromEntries(
      staff?.map(s => [s.id, `${s.first_name} ${s.last_name}`]) || []
    );

    return (data || []).map(a => ({
      ...a,
      staff_name: staffMap[a.staff_id] || 'Unknown'
    }));
  } catch (error) {
    console.error('Error in getStaffAttendance:', error);
    throw error;
  }
}

/**
 * Get today's attendance for all staff
 */
export async function getTodayAttendance(): Promise<StaffAttendance[]> {
  const today = new Date().toISOString().split('T')[0];
  return getStaffAttendance({ start_date: today, end_date: today });
}

/**
 * Update attendance time in/out
 */
export async function updateAttendanceTime(
  staff_id: string,
  attendance_date: string,
  updates: { time_in?: string; time_out?: string; notes?: string }
): Promise<StaffAttendance> {
  try {
    const { data, error } = await supabase
      .from('staff_attendance')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('staff_id', staff_id)
      .eq('attendance_date', attendance_date)
      .select()
      .single();

    if (error) {
      console.error('Error updating attendance time:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateAttendanceTime:', error);
    throw error;
  }
}

/**
 * Get attendance summary for a staff member
 */
export async function getStaffAttendanceSummary(staff_id: string, month?: string): Promise<{
  total_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  attendance_percentage: number;
}> {
  try {
    const startDate = month ? `${month}-01` : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = month 
      ? new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().split('T')[0]
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('staff_attendance')
      .select('status')
      .eq('staff_id', staff_id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }

    const total_days = data?.length || 0;
    const present_days = data?.filter(a => a.status === 'present').length || 0;
    const absent_days = data?.filter(a => a.status === 'absent').length || 0;
    const half_days = data?.filter(a => a.status === 'half_day').length || 0;
    const leave_days = data?.filter(a => a.status === 'leave').length || 0;
    const attendance_percentage = total_days > 0 ? (present_days / total_days) * 100 : 0;

    return {
      total_days,
      present_days,
      absent_days,
      half_days,
      leave_days,
      attendance_percentage: Math.round(attendance_percentage * 100) / 100
    };
  } catch (error) {
    console.error('Error in getStaffAttendanceSummary:', error);
    throw error;
  }
}