'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, FileText, CheckCircle, XCircle, AlertCircle, Search, Filter, Eye, Edit, Plus, Stethoscope } from 'lucide-react';
import { getAppointments, updateAppointmentStatus, Appointment } from '../../../src/lib/appointmentService';
import { getCurrentUser } from '../../../src/lib/supabase';
import { saveConsultation } from '../../../src/lib/consultationService';
import ConsultationInterface from '../../../components/ConsultationInterface';

interface DoctorAppointmentsProps {}

const DoctorAppointments: React.FC<DoctorAppointmentsProps> = () => {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadAppointments();
    }
  }, [user?.id, selectedDate, statusFilter]);

  const loadCurrentUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Error loading user:', err);
      setError('Failed to load user information');
    }
  };

  const loadAppointments = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await getAppointments({
        doctorId: user.id,
        date: selectedDate,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      
      setAppointments(result.appointments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus as any);
      
      // Refresh appointments
      await loadAppointments();
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment status');
    }
  };

  const handleStartConsultation = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowConsultation(true);
    // Update status to in_progress
    handleStatusUpdate(appointment.id, 'in_progress');
  };

  const handleSaveConsultation = async (consultationData: any) => {
    try {
      if (!user?.id) {
        throw new Error('Doctor ID not found');
      }

      // Save consultation data to database
      await saveConsultation(consultationData, user.id);
      
      // Reload appointments to reflect changes
      await loadAppointments();
      
      // Close consultation interface
      setShowConsultation(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error saving consultation:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'rescheduled': return <Calendar className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = searchTerm === '' || 
      appointment.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.patient?.phone?.includes(searchTerm) ||
      appointment.chief_complaint?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const todayAppointments = filteredAppointments.filter(apt => 
    apt.appointment_date === new Date().toISOString().split('T')[0]
  );

  const upcomingAppointments = filteredAppointments.filter(apt => 
    new Date(apt.appointment_date) > new Date()
  );

  const completedToday = todayAppointments.filter(apt => apt.status === 'completed').length;
  const pendingToday = todayAppointments.filter(apt => 
    ['scheduled', 'confirmed', 'in_progress'].includes(apt.status)
  ).length;

  if (!user || (user.role !== 'doctor' && user.role !== 'md')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
              <p className="text-gray-600 mt-1">Manage your patient appointments and consultations</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Dr. {user.name}</p>
                <p className="text-xs text-gray-500">{user.specialization || 'General Medicine'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Total</p>
                <p className="text-2xl font-bold text-gray-900">{todayAppointments.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedToday}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{pendingToday}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{upcomingAppointments.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search patients, phone, or complaints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
            <AlertCircle className="text-red-500 mr-3" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Appointments List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">No appointments match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chief Complaint
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patient?.name || 'Unknown Patient'}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {appointment.patient?.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.appointment_time}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {appointment.type?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          <span className="ml-1">{appointment.status?.replace('_', ' ').toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {appointment.symptoms || 'No complaint specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowDetailsModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {appointment.status === 'scheduled' && (
                            <button
                              onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                              className="text-green-600 hover:text-green-900 p-1 rounded"
                              title="Confirm"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => handleStartConsultation(appointment)}
                              className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                              title="Start Consultation"
                            >
                              <Stethoscope className="h-4 w-4" />
                            </button>
                          )}
                          
                          {appointment.status === 'in_progress' && (
                            <button
                              onClick={() => handleStartConsultation(appointment)}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded"
                              title="Continue Consultation"
                            >
                              <Stethoscope className="h-4 w-4" />
                            </button>
                          )}
                          
                          {['scheduled', 'confirmed'].includes(appointment.status) && (
                            <button
                              onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Cancel"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Patient Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Patient Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{selectedAppointment.patient?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm font-medium">{selectedAppointment.patient?.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm font-medium">{selectedAppointment.patient?.email || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Appointment Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Appointment Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-sm font-medium">{new Date(selectedAppointment.appointment_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Time:</span>
                    <span className="text-sm font-medium">{selectedAppointment.appointment_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="text-sm font-medium">{selectedAppointment.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium">{selectedAppointment.type?.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Medical Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Chief Complaint:</label>
                    <p className="text-sm font-medium mt-1 p-3 bg-gray-50 rounded-lg">
                      {selectedAppointment.chief_complaint || 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600">Symptoms:</label>
                    <p className="text-sm font-medium mt-1 p-3 bg-gray-50 rounded-lg">
                      {selectedAppointment.symptoms || 'Not specified'}
                    </p>
                  </div>
                  
                  {selectedAppointment.diagnosis && (
                    <div>
                      <label className="text-sm text-gray-600">Diagnosis:</label>
                      <p className="text-sm font-medium mt-1 p-3 bg-gray-50 rounded-lg">
                        {selectedAppointment.diagnosis}
                      </p>
                    </div>
                  )}
                  
                  {selectedAppointment.treatment_plan && (
                    <div>
                      <label className="text-sm text-gray-600">Treatment Plan:</label>
                      <p className="text-sm font-medium mt-1 p-3 bg-gray-50 rounded-lg">
                        {selectedAppointment.treatment_plan}
                      </p>
                    </div>
                  )}
                  
                  {selectedAppointment.notes && (
                    <div>
                      <label className="text-sm text-gray-600">Notes:</label>
                      <p className="text-sm font-medium mt-1 p-3 bg-gray-50 rounded-lg">
                        {selectedAppointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'in_progress') && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleStartConsultation(selectedAppointment);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Stethoscope className="h-4 w-4" />
                  {selectedAppointment.status === 'in_progress' ? 'Continue Consultation' : 'Start Consultation'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Consultation Interface */}
      {showConsultation && selectedAppointment && (
        <ConsultationInterface
          appointment={selectedAppointment}
          onClose={() => {
            setShowConsultation(false);
            setSelectedAppointment(null);
          }}
          onSave={handleSaveConsultation}
        />
      )}
    </div>
  );
};

export default DoctorAppointments;