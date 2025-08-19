import { supabase } from './supabase';

export interface DashboardStats {
  totalPatients: number;
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
}

export interface RecentPatient {
  id: string;
  name: string;
  status: string;
  condition: string;
  admissionDate?: string;
  lastVisit?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentAppointments: RecentAppointment[];
  recentPatients: RecentPatient[];
  bedStatus: BedStatus[];
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

    // Get total patients count
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get appointment statistics
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, status')
      .gte('appointment_date', today);

    const todayAppointments = appointments?.filter(apt => 
      apt.appointment_date === today
    ).length || 0;

    const upcomingAppointments = appointments?.filter(apt => 
      new Date(apt.appointment_date) > now && 
      ['scheduled', 'confirmed'].includes(apt.status)
    ).length || 0;

    const { count: completedAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: cancelledAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled');

    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true });

    // Get doctor statistics
    const { count: totalDoctors } = await supabase
      .from('doctors')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: availableDoctors } = await supabase
      .from('doctors')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('availability_status', 'available');

    // Get bed statistics
    const { count: totalBeds } = await supabase
      .from('beds')
      .select('id', { count: 'exact', head: true });

    const { count: occupiedBeds } = await supabase
      .from('bed_allocations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const availableBeds = (totalBeds || 0) - (occupiedBeds || 0);
    const bedOccupancyRate = totalBeds ? Math.round(((occupiedBeds || 0) / totalBeds) * 100) : 0;

    return {
      totalPatients: totalPatients || 0,
      totalAppointments: totalAppointments || 0,
      todayAppointments,
      upcomingAppointments,
      completedAppointments: completedAppointments || 0,
      cancelledAppointments: cancelledAppointments || 0,
      totalDoctors: totalDoctors || 0,
      availableDoctors: availableDoctors || 0,
      totalBeds: totalBeds || 0,
      occupiedBeds: occupiedBeds || 0,
      availableBeds,
      bedOccupancyRate
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

/**
 * Get recent appointments for dashboard
 */
export async function getRecentAppointments(limit: number = 5): Promise<RecentAppointment[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        type,
        status,
        patient:patients(name),
        doctor:doctors(
          user:users(name)
        )
      `)
      .in('appointment_date', [today, tomorrowStr])
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent appointments:', error);
      return [];
    }

    return appointments?.map((apt: any) => ({
      id: apt.id,
      patientName: apt.patient?.name || 'Unknown Patient',
      appointmentTime: apt.appointment_time,
      appointmentDate: apt.appointment_date === today ? 'Today' : 'Tomorrow',
      type: apt.type || 'Consultation',
      status: apt.status,
      doctorName: apt.doctor?.user?.name
    })) || [];
  } catch (error) {
    console.error('Error fetching recent appointments:', error);
    return [];
  }
}

/**
 * Get recent patients for dashboard
 */
export async function getRecentPatients(limit: number = 4): Promise<RecentPatient[]> {
  try {
    // Get recently admitted patients or those with recent appointments
    const { data: recentAdmissions, error: admissionError } = await supabase
      .from('bed_allocations')
      .select(`
        patient:patients(id, name, status),
        admission_date,
        reason_for_admission
      `)
      .eq('status', 'active')
      .order('admission_date', { ascending: false })
      .limit(limit);

    if (admissionError) {
      console.error('Error fetching recent admissions:', admissionError);
    }

    // Get patients with recent appointments if we don't have enough admissions
    const { data: recentAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        patient:patients(id, name, status),
        appointment_date,
        chief_complaint,
        diagnosis
      `)
      .gte('appointment_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('appointment_date', { ascending: false })
      .limit(limit * 2);

    if (appointmentError) {
      console.error('Error fetching recent appointments:', appointmentError);
    }

    // Map patient status to valid status types
    const mapPatientStatus = (status: string, context: 'admission' | 'appointment', hasDiagnosis?: boolean): string => {
      const statusMap: { [key: string]: string } = {
        'critical': 'Critical',
        'stable': 'Stable', 
        'admitted': 'Admitted',
        'diagnosed': 'Diagnosed',
        'consulting': 'Consulting',
        'recovering': 'Recovering',
        'active': context === 'admission' ? 'Admitted' : 'Stable',
        'inactive': 'Stable'
      };
      
      if (context === 'appointment') {
        return hasDiagnosis ? 'Diagnosed' : 'Consulting';
      }
      
      return statusMap[status?.toLowerCase()] || 'Stable';
    };

    const patients: RecentPatient[] = [];
    const seenPatients = new Set<string>();

    // Add admitted patients first
    recentAdmissions?.forEach((admission: any) => {
      if (admission.patient && !seenPatients.has(admission.patient.id)) {
        patients.push({
          id: admission.patient.id,
          name: admission.patient.name,
          status: mapPatientStatus(admission.patient.status, 'admission'),
          condition: admission.reason_for_admission || 'General Care',
          admissionDate: admission.admission_date
        });
        seenPatients.add(admission.patient.id);
      }
    });

    // Add patients from recent appointments if we need more
    recentAppointments?.forEach((appointment: any) => {
      if (patients.length < limit && appointment.patient && !seenPatients.has(appointment.patient.id)) {
        patients.push({
          id: appointment.patient.id,
          name: appointment.patient.name,
          status: mapPatientStatus(appointment.patient.status, 'appointment', !!appointment.diagnosis),
          condition: appointment.diagnosis || appointment.chief_complaint || 'General Consultation',
          lastVisit: appointment.appointment_date
        });
        seenPatients.add(appointment.patient.id);
      }
    });

    return patients.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent patients:', error);
    return [];
  }
}

/**
 * Get bed status by type
 */
export async function getBedStatus(): Promise<BedStatus[]> {
  try {
    const { data: beds, error: bedsError } = await supabase
      .from('beds')
      .select('id, bed_type');

    if (bedsError) {
      console.error('Error fetching beds:', bedsError);
      return [];
    }

    const { data: allocations, error: allocationsError } = await supabase
      .from('bed_allocations')
      .select(`
        bed_id,
        bed:beds(bed_type)
      `)
      .eq('status', 'active');

    if (allocationsError) {
      console.error('Error fetching bed allocations:', allocationsError);
      return [];
    }

    // Group beds by type
    const bedsByType: { [key: string]: { total: number; occupied: number } } = {};

    beds?.forEach(bed => {
      const bedType = bed.bed_type || 'general';
      if (!bedsByType[bedType]) {
        bedsByType[bedType] = { total: 0, occupied: 0 };
      }
      bedsByType[bedType].total++;
    });

    allocations?.forEach((allocation: any) => {
      const bedType = allocation.bed?.bed_type || 'general';
      if (bedsByType[bedType]) {
        bedsByType[bedType].occupied++;
      }
    });

    return Object.entries(bedsByType).map(([bedType, stats]) => ({
      bedType: bedType.charAt(0).toUpperCase() + bedType.slice(1),
      total: stats.total,
      occupied: stats.occupied,
      available: stats.total - stats.occupied,
      occupancyRate: Math.round((stats.occupied / stats.total) * 100)
    }));
  } catch (error) {
    console.error('Error fetching bed status:', error);
    return [];
  }
}

/**
 * Get all dashboard data in one call
 */
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [stats, recentAppointments, recentPatients, bedStatus] = await Promise.all([
      getDashboardStats(),
      getRecentAppointments(),
      getRecentPatients(),
      getBedStatus()
    ]);

    return {
      stats,
      recentAppointments,
      recentPatients,
      bedStatus
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
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