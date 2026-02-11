'use client';
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Clock, 
  User,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  MoreVertical,
  Phone,
  Stethoscope,
  Loader2,
  Hash,
  FileText,
  Trash2
} from 'lucide-react';
import NewAppointmentBookingForm from '../../components/NewAppointmentBookingForm';
import AppointmentSuccessPage from '../../components/AppointmentSuccessPage';
import ClinicalEntryForm from '../../components/ClinicalEntryForm';
import ClinicalEntryForm2 from '../../components/ClinicalEntryForm2';
import AppointmentDetailsModal from '../../components/AppointmentDetailsModal';
import { getAppointments, updateAppointmentStatus, deleteAppointment, getAppointmentStats, type Appointment } from '../../src/lib/appointmentService';

interface AppointmentStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  todayCount: number;
  upcomingCount: number;
}

export default function AppointmentsPage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSuccessPageOpen, setIsSuccessPageOpen] = useState(false);
  const [appointmentResult, setAppointmentResult] = useState<{
    appointmentId: string;
    patientName: string;
    uhid: string;
  } | null>(null);
  const [isClinicalFormOpen, setIsClinicalFormOpen] = useState(false);
  const [isClinicalForm2Open, setIsClinicalForm2Open] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    todayCount: 0,
    upcomingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed' | 'cancelled'>('today');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [completingAppointment, setCompletingAppointment] = useState<string | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<string | null>(null);

  const handleAppointmentSuccess = (result: { appointmentId: string; patientName: string; uhid: string }) => {
    console.log('Appointment created:', result);
    setAppointmentResult(result);
    setIsBookingModalOpen(false);
    setIsSuccessPageOpen(true);
    fetchAppointments();
    fetchStats();
  };

  const handleBackToBooking = () => {
    setIsSuccessPageOpen(false);
    setAppointmentResult(null);
    setIsBookingModalOpen(true);
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      const requestDate = activeTab === 'today' ? today : undefined;
      const requestStatus = activeTab === 'completed' ? 'completed' : activeTab === 'cancelled' ? 'cancelled' : undefined;

      const response = await getAppointments({
        date: requestDate,
        searchTerm: searchTerm || undefined,
        status: requestStatus,
        limit: 50
      });

      let nextAppointments = response.appointments;

      if (activeTab === 'upcoming') {
        nextAppointments = (nextAppointments || []).filter((apt) => {
          const aptDate = apt.appointment_date;
          if (!aptDate) return false;
          return aptDate > today && !['completed', 'cancelled'].includes(apt.status);
        });
      }

      if (activeTab === 'today') {
        nextAppointments = (nextAppointments || []).filter((apt) => apt.appointment_date === today);
      }

      setAppointments(nextAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await getAppointmentStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't show error for stats as it's not critical
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: 'completed' | 'cancelled') => {
    try {
      setUpdatingStatus(appointmentId);
      await updateAppointmentStatus(appointmentId, newStatus);
      await fetchAppointments();
      await fetchStats();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError(`Failed to update appointment status. Please try again.`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingAppointment(appointmentId);
      await deleteAppointment(appointmentId);
      await fetchAppointments();
      await fetchStats();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      setError(`Failed to delete appointment. Please try again.`);
    } finally {
      setDeletingAppointment(null);
    }
  };

  const handleCompleteAppointment = async (appointment: Appointment) => {
    try {
      setCompletingAppointment(appointment.id);

      // Update appointment status to completed
      await updateAppointmentStatus(appointment.id, 'completed');
      
      // Refresh appointments and stats
      await fetchAppointments();
      await fetchStats();
      
      // Show success message
      setError(null);
      alert('Appointment completed successfully!');
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      setError(error.message || 'Failed to complete appointment. Please try again.');
    } finally {
      setCompletingAppointment(null);
    }
  };

  const handleOpenClinicalForm = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsClinicalFormOpen(true);
  };

  const handleOpenClinicalForm2 = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsClinicalForm2Open(true);
  };

  const handleClinicalFormSuccess = () => {
    setIsClinicalFormOpen(false);
    setSelectedAppointment(null);
    fetchAppointments();
  };

  const handleClinicalForm2Success = () => {
    setIsClinicalForm2Open(false);
    setSelectedAppointment(null);
    fetchAppointments();
  };

  const handlePatientClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const extractTokenNumber = (notes: string | null): string => {
    if (!notes) return 'N/A';
    const match = notes.match(/Token:\s*(\d+)/);
    return match ? match[1] : 'N/A';
  };

  const isWithinAppointmentSession = (appointmentDate: string, appointmentTime: string): boolean => {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    
    // Check if it's the same date
    const isSameDate = now.toDateString() === appointmentDateTime.toDateString();
    
    if (!isSameDate) return false;
    
    // Allow completion 15 minutes before and 30 minutes after appointment time
    const timeDiff = now.getTime() - appointmentDateTime.getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    const thirtyMinutes = 30 * 60 * 1000;
    
    return timeDiff >= -fifteenMinutes && timeDiff <= thirtyMinutes;
  };

  useEffect(() => {
    fetchAppointments();
    fetchStats();
  }, [searchTerm, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'from-green-500 to-green-600';
      case 'cancelled': return 'from-red-500 to-red-600';
      case 'in_progress': return 'from-yellow-500 to-yellow-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage patient appointments and schedules</p>
        </div>
        <button 
          onClick={() => setIsBookingModalOpen(true)}
          className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Plus size={16} className="mr-2" />
          New Appointment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayCount}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">Total: {stats.total}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completed}</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success rate
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.scheduled}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Upcoming: {stats.upcomingCount}</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-300 to-orange-400 rounded-xl flex items-center justify-center">
              <Clock className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.cancelled}</p>
              <div className="flex items-center mt-2">
                <XCircle className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">
                  {stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0}% cancellation
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <XCircle className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'today' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'upcoming' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'completed' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'cancelled' ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            Cancelled
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search appointments by patient name, doctor, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Appointments</h2>
          <p className="text-sm text-gray-600 mt-1">Manage and track patient appointments</p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-2 text-gray-600">Loading appointments...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No appointments found for the selected criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map((appointment) => {
              const tokenNumber = extractTokenNumber(appointment.notes || null);
              const patientName = appointment.patient?.name || 'Unknown Patient';
              const doctorName = appointment.doctor?.user?.name || 'Unknown Doctor';
              const patientInitials = patientName
                .split(' ')
                .map((name: string) => name.charAt(0))
                .join('')
                .toUpperCase();
              
              return (
                <div key={appointment.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handlePatientClick(appointment)}
                        className="flex items-center space-x-4 hover:bg-blue-50 rounded-lg p-2 transition-colors cursor-pointer"
                        title="Click to view patient details"
                      >
                        <div className={`w-12 h-12 bg-gradient-to-r ${getTimeColor(appointment.status)} rounded-xl flex items-center justify-center`}>
                          <span className="text-white font-semibold text-sm">{patientInitials}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">{patientName}</h3>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                            {tokenNumber !== 'N/A' && (
                              <span className="flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                <Hash size={12} className="mr-1" />
                                {tokenNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 flex-wrap">
                            <span className="text-sm text-gray-600 flex items-center">
                              <Clock size={14} className="mr-1" />
                              {new Date(appointment.appointment_date).toLocaleDateString()} • {appointment.appointment_time}
                            </span>
                            <span className="text-sm text-gray-600 flex items-center">
                              <User size={14} className="mr-1" />
                              {doctorName}
                            </span>
                            {appointment.chief_complaint && (
                              <span className="text-sm text-gray-600 flex items-center">
                                <span className="mr-1">•</span>
                                {appointment.chief_complaint}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      {appointment.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleOpenClinicalForm2(appointment)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                            title="Open clinical entry form 2.0"
                          >
                            <Stethoscope size={14} />
                            <span>Clinical 2.0</span>
                          </button>
                          <button
                            onClick={() => handleCompleteAppointment(appointment)}
                            disabled={completingAppointment === appointment.id}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                            title="Complete appointment"
                          >
                            {completingAppointment === appointment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle size={14} />
                                <span>Complete</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                            disabled={updatingStatus === appointment.id || deletingAppointment === appointment.id}
                            className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            {updatingStatus === appointment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Cancel'
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            disabled={deletingAppointment === appointment.id || updatingStatus === appointment.id}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            {deletingAppointment === appointment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Appointments
        </button>
      </div>

      {/* New Appointment Booking Form */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="min-h-screen py-8 px-4">
            <NewAppointmentBookingForm
              onComplete={handleAppointmentSuccess}
              onCancel={() => setIsBookingModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Appointment Success Page */}
      {isSuccessPageOpen && appointmentResult && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <AppointmentSuccessPage
            appointmentId={appointmentResult.appointmentId}
            patientName={appointmentResult.patientName}
            uhid={appointmentResult.uhid}
            onBack={handleBackToBooking}
          />
        </div>
      )}

      {/* Clinical Entry Form */}
      {isClinicalFormOpen && selectedAppointment && (
        <ClinicalEntryForm
          isOpen={isClinicalFormOpen}
          onClose={() => {
            setIsClinicalFormOpen(false);
            setSelectedAppointment(null);
          }}
          appointmentId={selectedAppointment.id}
          encounterId={selectedAppointment.encounter?.id || ''}
          patientId={selectedAppointment.patient_id}
          doctorId={selectedAppointment.doctor_id}
          patientName={selectedAppointment.patient?.name || 'Unknown Patient'}
          patientUHID={(selectedAppointment.patient as any)?.patient_id || ''}
          onSuccess={handleClinicalFormSuccess}
        />
      )}

      {/* Clinical Entry Form 2.0 */}
      {isClinicalForm2Open && selectedAppointment && (
        <ClinicalEntryForm2
          isOpen={isClinicalForm2Open}
          onClose={() => {
            setIsClinicalForm2Open(false);
            setSelectedAppointment(null);
          }}
          appointmentId={selectedAppointment.id}
          encounterId={selectedAppointment.encounter?.id || ''}
          patientId={selectedAppointment.patient_id}
          doctorId={selectedAppointment.doctor_id}
          patientName={selectedAppointment.patient?.name || 'Unknown Patient'}
          patientUHID={(selectedAppointment.patient as any)?.patient_id || ''}
          onSuccess={handleClinicalForm2Success}
        />
      )}

      {/* Appointment Details Modal */}
      {isDetailsModalOpen && selectedAppointment && (
        <AppointmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleDetailsModalClose}
          appointmentId={selectedAppointment.id}
        />
      )}
    </div>
  );
}