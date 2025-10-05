import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, SortAsc, UserPlus, AlertTriangle, Heart, Activity, User, Phone, Mail, Calendar, MapPin, Loader2, CheckCircle, XCircle, MoreVertical, Edit, Eye, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAllPatients, updatePatientStatus, updatePatientCriticalStatus, updatePatientAdmissionStatus } from '../lib/patientService';

// Patient status types
type PatientStatus = 'critical' | 'stable' | 'recovering' | 'admitted' | 'discharged';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  gender: string;
  phone: string;
  email?: string;
  date_of_birth: string;
  address: string;
  status: string;
  is_critical?: boolean;
  is_admitted?: boolean;
  primary_complaint?: string;
  medical_history?: string;
  created_at: string;
  updated_at: string;
}

const PatientManagement: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadPatients();
  }, [currentPage, statusFilter, searchQuery]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowActionMenu(null);
    };
    
    if (showActionMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActionMenu]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllPatients({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter === 'all' ? undefined : statusFilter,
        searchTerm: searchQuery || undefined
      });
      setPatients(response.patients);
      setTotalPatients(response.total);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('Failed to load patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (patientId: string, isCritical?: boolean, isAdmitted?: boolean) => {
    try {
      setUpdatingStatus(patientId);
      await updatePatientStatus(patientId, isAdmitted, isCritical);
      await loadPatients(); // Reload to get fresh data
      setShowActionMenu(null);
    } catch (err) {
      console.error('Error updating patient status:', err);
      setError('Failed to update patient status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getPatientStatusInfo = (patient: Patient) => {
    if (patient.is_critical) {
      return {
        label: 'Critical',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertTriangle size={14} className="text-red-600" />,
        priority: 1
      };
    } else if (patient.is_admitted) {
      return {
        label: 'Admitted',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <Activity size={14} className="text-orange-600" />,
        priority: 2
      };
    } else {
      return {
        label: 'Stable',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle size={14} className="text-green-600" />,
        priority: 3
      };
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const filteredPatients = patients.sort((a, b) => {
    const aStatus = getPatientStatusInfo(a);
    const bStatus = getPatientStatusInfo(b);
    return aStatus.priority - bStatus.priority;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-gray-900">Patient Management</h1>
        <p className="text-gray-500 mt-1">View and manage patient records</p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={loadPatients}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Critical</p>
              <p className="text-2xl font-bold text-gray-900">
                {patients.filter(p => p.is_critical).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Admitted</p>
              <p className="text-2xl font-bold text-gray-900">
                {patients.filter(p => p.is_admitted && !p.is_critical).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Stable</p>
              <p className="text-2xl font-bold text-gray-900">
                {patients.filter(p => !p.is_critical && !p.is_admitted).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalPatients}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, patient ID, or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          <div className="flex space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Patients</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <Link to="/patients/register">
              <button className="btn-primary flex items-center">
                <UserPlus size={18} className="mr-2" />
                Register New Patient
              </button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Patient Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            <span className="ml-2 text-gray-600">Loading patients...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-500">Try adjusting your search criteria.</p>
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
                    Contact Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medical Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => {
                  const statusInfo = getPatientStatusInfo(patient);
                  const age = calculateAge(patient.date_of_birth);
                  
                  return (
                    <tr key={patient.id} className={`hover:bg-gray-50 ${patient.is_critical ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            patient.is_critical ? 'bg-red-600' : 
                            patient.is_admitted ? 'bg-orange-500' : 'bg-green-500'
                          }`}>
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <Link 
                              to={`/patients/${patient.patient_id}`} 
                              className="text-sm font-medium text-gray-900 hover:text-orange-600"
                            >
                              {patient.name}
                            </Link>
                            <div className="text-sm text-gray-500">
                              ID: {patient.patient_id} • {patient.gender} • {age} years
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Phone size={12} className="mr-1 text-gray-400" />
                            {patient.phone}
                          </div>
                          {patient.email && (
                            <div className="flex items-center">
                              <Mail size={12} className="mr-1 text-gray-400" />
                              {patient.email}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.primary_complaint && (
                            <div className="mb-1 font-medium">
                              {patient.primary_complaint}
                            </div>
                          )}
                          {patient.medical_history && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {patient.medical_history}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span className="ml-1">{statusInfo.label}</span>
                          </span>
                          {patient.is_critical && (
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(patient.updated_at).toLocaleDateString()}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative">
                          <button
                            onClick={() => setShowActionMenu(showActionMenu === patient.patient_id ? null : patient.patient_id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            disabled={updatingStatus === patient.patient_id}
                          >
                            {updatingStatus === patient.patient_id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <MoreVertical size={16} />
                            )}
                          </button>
                          
                          {showActionMenu === patient.patient_id && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                  Status Actions
                                </div>
                                
                                {!patient.is_critical && (
                                  <button
                                    onClick={() => handleStatusUpdate(patient.patient_id, true, patient.is_admitted)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                  >
                                    <AlertTriangle size={16} className="mr-3 text-red-500" />
                                    Mark as Critical
                                  </button>
                                )}
                                
                                {patient.is_critical && (
                                  <button
                                    onClick={() => handleStatusUpdate(patient.patient_id, false, patient.is_admitted)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                                  >
                                    <CheckCircle size={16} className="mr-3 text-green-500" />
                                    Mark as Stable
                                  </button>
                                )}
                                
                                {!patient.is_admitted && (
                                  <button
                                    onClick={() => handleStatusUpdate(patient.patient_id, patient.is_critical, true)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                                  >
                                    <Activity size={16} className="mr-3 text-orange-500" />
                                    Admit Patient
                                  </button>
                                )}
                                
                                {patient.is_admitted && (
                                  <button
                                    onClick={() => handleStatusUpdate(patient.patient_id, patient.is_critical, false)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                  >
                                    <CheckCircle size={16} className="mr-3 text-blue-500" />
                                    Discharge Patient
                                  </button>
                                )}
                                
                                <div className="border-t border-gray-100 mt-1">
                                  <Link
                                    to={`/patients/${patient.patient_id}`}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye size={16} className="mr-3 text-gray-500" />
                                    View Details
                                  </Link>
                                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                    <Edit size={16} className="mr-3 text-gray-500" />
                                    Edit Patient
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {totalPatients > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalPatients)}</span> of{' '}
              <span className="font-medium">{totalPatients}</span> patients
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn-secondary text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalPatients / itemsPerPage), currentPage + 1))}
                disabled={currentPage >= Math.ceil(totalPatients / itemsPerPage)}
                className="btn-primary text-sm py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Patient</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-500" 
                    onClick={() => setShowAddModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                      <input type="text" id="firstName" className="input-field mt-1" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input type="text" id="lastName" className="input-field mt-1" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                      <select id="gender" className="input-field mt-1">
                        <option>Select Gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                      <input type="number" id="age" className="input-field mt-1" />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="contact" className="block text-sm font-medium text-gray-700">Contact Number</label>
                    <input type="tel" id="contact" className="input-field mt-1" />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input type="email" id="email" className="input-field mt-1" />
                  </div>
                  
                  <div>
                    <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">Initial Diagnosis</label>
                    <input type="text" id="diagnosis" className="input-field mt-1" />
                  </div>
                </form>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddModal(false)}
                >
                  Add Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManagement;