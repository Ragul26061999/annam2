import { supabase } from './supabase';

export interface DashboardStats {
  totalPatients: number;
  outpatientPatients: number;
  admittedPatients: number;
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  totalDoctors: number;
  availableDoctors: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  bedOccupancyRate: number;
  criticalPatients: number;
  emergencyAdmissions: number;
  totalStaff: number;
  pendingBills: number;
}

export interface BedStatus {
  bedType: string;
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
}

export interface RecentAppointment {
  id: string;
  patientName: string;
  appointmentTime: string;
  appointmentDate: string;
  type: string;
  status: string;
  doctorName?: string;
  patientInitials?: string;
}

export interface RecentPatient {
  id: string;
  name: string;
  status: string;
  condition: string;
  admissionDate?: string;
  lastVisit?: string;
}

export interface DepartmentStatus {
  id: string;
  name: string;
  status: string;
  location: string | null;
  occupancyRate: number;
  bedCount: number;
  occupiedBeds: number;
}

export interface QuickStats {
  staffOnDuty: number;
  pendingLabResults: number;
  medicineRequests: number;
  dischargeToday: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentAppointments: RecentAppointment[];
  recentPatients: RecentPatient[];
  bedStatus: BedStatus[];
  departmentStatus: DepartmentStatus[];
  quickStats: QuickStats;
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get total patients (all patients regardless of status)
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    // Get outpatient patients (patients with outpatient admission type)
    const { count: outpatientPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('admission_type', 'outpatient');

    // Get admitted patients (patients with active bed allocations)
    const { count: admittedPatients } = await supabase
      .from('bed_allocations')
      .select('patient_id', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('discharge_date', null);

    // Get total appointments - try new table first, then legacy
    let totalAppointments = 0;
    let todayAppointments = 0;
    let upcomingAppointments = 0;
    let completedAppointments = 0;
    let cancelledAppointments = 0;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Try new appointment table
      const { count: newTotal } = await supabase
        .from('appointment')
        .select('*', { count: 'exact', head: true })
        .eq('encounter.patient.admission_type', 'outpatient');
      totalAppointments = newTotal || 0;
      
      const { count: newToday } = await supabase
        .from('appointment')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', today)
        .lt('scheduled_at', `${today}T23:59:59`)
        .eq('encounter.patient.admission_type', 'outpatient');
      todayAppointments = newToday || 0;
      
      const { count: newUpcoming } = await supabase
        .from('appointment')
        .select('*', { count: 'exact', head: true })
        .gt('scheduled_at', `${today}T23:59:59`)
        .eq('encounter.patient.admission_type', 'outpatient');
      upcomingAppointments = newUpcoming || 0;
      
      // For new table, we'll assume all are scheduled for now
      completedAppointments = 0;
      cancelledAppointments = 0;
    } catch (newTableError) {
      // Fall back to legacy appointments table
      try {
        const { count: legacyTotal } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient.admission_type', 'outpatient');
        totalAppointments = legacyTotal || 0;

        const { count: legacyToday } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', today)
          .eq('patient.admission_type', 'outpatient');
        todayAppointments = legacyToday || 0;

        const { count: legacyUpcoming } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gt('appointment_date', today)
          .in('status', ['scheduled', 'confirmed'])
          .eq('patient.admission_type', 'outpatient');
        upcomingAppointments = legacyUpcoming || 0;

        const { count: legacyCompleted } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');
        completedAppointments = legacyCompleted || 0;

        const { count: legacyCancelled } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cancelled');
        cancelledAppointments = legacyCancelled || 0;
      } catch (legacyError) {
        console.warn('Both appointment tables failed:', { newTableError, legacyError });
      }
    }

    // Get total doctors
    const { count: totalDoctors } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true });

    // Get available doctors
    const { count: availableDoctors } = await supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get bed statistics
    const { count: totalBeds } = await supabase
      .from('beds')
      .select('*', { count: 'exact', head: true });

    // Count occupied beds based on active bed allocations, not bed status
    const { count: occupiedBeds } = await supabase
      .from('bed_allocations')
      .select('bed_id', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('discharge_date', null);

    const { count: availableBeds } = await supabase
      .from('beds')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    // Get critical patients (patients with is_critical flag)
    const { count: criticalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('is_critical', true);

    // Get emergency admissions today
    const { count: emergencyAdmissions } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('admission_type', 'emergency')
      .gte('admission_date', today);

    // Get total staff
    const { count: totalStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get pending bills
    const { count: pendingBills } = await supabase
      .from('billing')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending');

    const bedOccupancyRate = totalBeds && totalBeds > 0 ? Math.round(((occupiedBeds || 0) / totalBeds) * 100) : 0;

    return {
      totalPatients: totalPatients || 0,
      outpatientPatients: outpatientPatients || 0,
      admittedPatients: admittedPatients || 0,
      totalAppointments: totalAppointments || 0,
      todayAppointments: todayAppointments || 0,
      upcomingAppointments: upcomingAppointments || 0,
      completedAppointments: completedAppointments || 0,
      cancelledAppointments: cancelledAppointments || 0,
      totalDoctors: totalDoctors || 0,
      availableDoctors: availableDoctors || 0,
      totalBeds: totalBeds || 0,
      occupiedBeds: occupiedBeds || 0,
      availableBeds: availableBeds || 0,
      bedOccupancyRate,
      criticalPatients: criticalPatients || 0,
      emergencyAdmissions: emergencyAdmissions || 0,
      totalStaff: totalStaff || 0,
      pendingBills: pendingBills || 0,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return default values if there's an error
    return {
      totalPatients: 0,
      outpatientPatients: 0,
      admittedPatients: 0,
      totalAppointments: 0,
      todayAppointments: 0,
      upcomingAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      totalDoctors: 0,
      availableDoctors: 0,
      totalBeds: 0,
      occupiedBeds: 0,
      availableBeds: 0,
      bedOccupancyRate: 0,
      criticalPatients: 0,
      emergencyAdmissions: 0,
      totalStaff: 0,
      pendingBills: 0,
    };
  }
}

/**
 * Get recent appointments for dashboard
 */
export async function getRecentAppointments(limit: number = 5): Promise<RecentAppointment[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Try the new appointment table structure first
    try {
      const { data: newAppointments, error: newError } = await supabase
        .from('appointment')
        .select(`
          id,
          scheduled_at,
          encounter:encounter(
            patient:patients(name, admission_type),
            clinician:doctors(
              user:users(name)
            )
          )
        `)
        .gte('scheduled_at', today)
        .lt('scheduled_at', `${today}T23:59:59`)
        .eq('encounter.patient.admission_type', 'outpatient')
        .order('scheduled_at', { ascending: true })
        .limit(limit);
      
      if (newError) {
        console.warn('New appointment table query failed:', newError);
        throw newError;
      }
      
      // Filter for outpatients only
      const outpatientAppointments = (newAppointments || []).filter((apt: any) => 
        apt.encounter?.patient?.admission_type === 'outpatient'
      );
      
      return outpatientAppointments.map((apt: any) => ({
        id: apt.id,
        patientName: apt.encounter?.patient?.name || 'Unknown Patient',
        appointmentTime: new Date(apt.scheduled_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        appointmentDate: new Date(apt.scheduled_at).toISOString().split('T')[0],
        type: 'Consultation',
        status: 'scheduled',
        doctorName: apt.encounter?.clinician?.user?.name || 'Unknown Doctor',
        patientInitials: getInitials(apt.encounter?.patient?.name || 'Unknown Patient'),
      }));
    } catch (newTableError) {
      // Fall back to legacy appointments table - silently fail if doesn't exist
      try {
        const { data: legacyAppointments, error: legacyError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_time,
            appointment_date,
            type,
            status,
            patients!inner(name, admission_type),
            doctors!inner(
              users!inner(name)
            )
          `)
          .eq('appointment_date', today)
          .eq('patients.admission_type', 'outpatient')
          .order('appointment_time', { ascending: true })
          .limit(limit);

        if (legacyError) {
          console.warn('Legacy appointments table also failed:', legacyError);
          return [];
        }
        
        return (legacyAppointments || []).map((appointment: any) => {
          const patientName = appointment.patients?.name || 'Unknown Patient';
          const doctorName = appointment.doctors?.users?.name || 'Unknown Doctor';
          
          return {
            id: appointment.id,
            patientName,
            appointmentTime: appointment.appointment_time,
            appointmentDate: appointment.appointment_date,
            type: appointment.type || 'General Consultation',
            status: appointment.status,
            doctorName,
            patientInitials: getInitials(patientName),
          };
        });
      } catch (legacyError) {
        console.warn('Both appointment tables unavailable, returning empty array');
        return [];
      }
    }
  } catch (error) {
    console.error('Error in getRecentAppointments:', error);
    return [];
  }
}

/**
 * Get recent patients for dashboard
 */
export async function getRecentPatients(limit: number = 4): Promise<RecentPatient[]> {
  try {
    const { data: patients, error } = await supabase
      .from('patients')
      .select(`
        id,
        name,
        status,
        admission_date,
        admission_type,
        primary_complaint
      `)
      .eq('status', 'active')
      .order('admission_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching patients:', error);
      return [];
    }

    return (patients || []).map(patient => ({
      id: patient.id,
      name: patient.name,
      status: patient.status,
      condition: patient.primary_complaint || patient.admission_type || 'General',
      admissionDate: patient.admission_date,
      lastVisit: patient.admission_date,
    }));
  } catch (error) {
    console.error('Error in getRecentPatients:', error);
    return [];
  }
}

/**
 * Get bed status by type
 */
export async function getBedStatus(): Promise<BedStatus[]> {
  try {
    const { data: beds, error } = await supabase
      .from('beds')
      .select('bed_type, status');

    if (error) {
      console.error('Error fetching bed status:', error);
      return [];
    }

    // Group beds by type and calculate statistics
    const bedStats: { [key: string]: { total: number; occupied: number; available: number } } = {};

    (beds || []).forEach(bed => {
      const type = bed.bed_type || 'general';
      if (!bedStats[type]) {
        bedStats[type] = { total: 0, occupied: 0, available: 0 };
      }
      
      bedStats[type].total++;
      if (bed.status === 'occupied') {
        bedStats[type].occupied++;
      } else if (bed.status === 'available') {
        bedStats[type].available++;
      }
    });

    return Object.entries(bedStats).map(([bedType, stats]) => ({
      bedType: bedType.charAt(0).toUpperCase() + bedType.slice(1),
      total: stats.total,
      occupied: stats.occupied,
      available: stats.available,
      occupancyRate: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0,
    }));
  } catch (error) {
    console.error('Error in getBedStatus:', error);
    return [];
  }
}

export async function getDepartmentStatus(): Promise<DepartmentStatus[]> {
  try {
    // Get all beds grouped by bed_type
    const { data: beds, error } = await supabase
      .from('beds')
      .select('id, bed_type, status');

    if (error) {
      console.error('Error fetching beds for department status:', error);
      return [];
    }

    // Get active bed allocations
    const { data: allocations, error: allocError } = await supabase
      .from('bed_allocations')
      .select('bed_id')
      .eq('status', 'active')
      .is('discharge_date', null);

    if (allocError) {
      console.error('Error fetching bed allocations:', allocError);
    }

    const activeBedIds = new Set((allocations || []).map(a => a.bed_id));

    // Group beds by type
    const bedTypeStats: { [key: string]: { total: number; occupied: number } } = {};

    (beds || []).forEach(bed => {
      const type = bed.bed_type || 'General';
      if (!bedTypeStats[type]) {
        bedTypeStats[type] = { total: 0, occupied: 0 };
      }
      
      bedTypeStats[type].total++;
      if (activeBedIds.has(bed.id)) {
        bedTypeStats[type].occupied++;
      }
    });

    // Convert to array format
    return Object.entries(bedTypeStats).map(([bedType, stats]) => {
      const occupancyRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
      
      return {
        id: bedType.toLowerCase().replace(/\s+/g, '_'),
        name: bedType.charAt(0).toUpperCase() + bedType.slice(1),
        status: 'active',
        location: null,
        bedCount: stats.total,
        occupiedBeds: stats.occupied,
        occupancyRate,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error in getDepartmentStatus:', error);
    return [];
  }
}

export async function getQuickStats(): Promise<QuickStats> {
  try {
    // Staff on duty
    const { count: staffOnDuty } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Pending lab results
    const { count: pendingLabResults } = await supabase
      .from('lab_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Medicine requests
    const { count: medicineRequests } = await supabase
      .from('prescriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Discharge today
    const today = new Date().toISOString().split('T')[0];
    const { count: dischargeToday } = await supabase
      .from('bed_allocations')
      .select('*', { count: 'exact', head: true })
      .eq('discharge_date', today);

    return {
      staffOnDuty: staffOnDuty || 0,
      pendingLabResults: pendingLabResults || 0,
      medicineRequests: medicineRequests || 0,
      dischargeToday: dischargeToday || 0,
    };
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    return {
      staffOnDuty: 0,
      pendingLabResults: 0,
      medicineRequests: 0,
      dischargeToday: 0,
    };
  }
}

// Main function to get all dashboard data
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [stats, recentAppointments, recentPatients, bedStatus, departmentStatus, quickStats] = await Promise.all([
      getDashboardStats(),
      getRecentAppointments(),
      getRecentPatients(),
      getBedStatus(),
      getDepartmentStatus(),
      getQuickStats()
    ]);

    return {
      stats,
      recentAppointments,
      recentPatients,
      bedStatus,
      departmentStatus,
      quickStats
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw new Error('Failed to fetch dashboard data');
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

/**
 * Calculate percentage change (for future use with historical data)
 */
export function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) return '+0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Get trend direction
 */
export function getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}