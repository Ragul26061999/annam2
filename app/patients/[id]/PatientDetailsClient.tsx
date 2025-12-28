'use client';
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  File,
  Pill,
  Activity,
  MessageSquare,
  Edit,
  Phone,
  Mail,
  MapPin,
  Clock,
  Plus,
  AlertCircle,
  FileText,
  ChevronRight,
  Heart,
  Building,
  User,
  Users,
  Shield,
  Stethoscope,
  ClipboardList,
  Hash,
  UserCheck,
  Eye,
  CheckCircle,
  AlertTriangle,
  X,
  Bed,
  LogIn,
  LogOut,
  Upload,
  FolderOpen
} from 'lucide-react';
import { getPatientWithRelatedData } from '../../../src/lib/patientService';
import { getPatientVitals, recordVitals, updateVitalRecord } from '../../../src/lib/vitalsService';
import { getMedicalHistory, MedicalHistoryEvent } from '../../../src/lib/medicalHistoryService';
import MedicalHistoryForm from '../../../src/components/MedicalHistoryForm';
import AddDummyMedicalHistory from '../../../src/components/AddDummyMedicalHistory';
import MedicationHistory from '../../../src/components/MedicationHistory';
import { getCurrentUser, getCurrentUserProfile } from '../../../src/lib/supabase';
import PrescriptionForm from '../../../src/components/PrescriptionForm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DocumentUpload from '../../../src/components/DocumentUpload';
import DocumentList from '../../../src/components/DocumentList';

interface Patient {
  id: string;
  patient_id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  blood_group: string;
  allergies: string;
  medical_history: string;
  admission_date: string;
  admission_time: string;
  primary_complaint: string;
  admission_type: string;
  referring_doctor_facility: string;
  department_ward: string;
  room_number: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  insurance_provider: string;
  insurance_number: string;
  initial_symptoms: string;
  referred_by: string;
  status: string;
  created_at: string;
  appointments: any[];
  bed_allocations: any[];
}

interface PatientDetailsClientProps {
  params: { id: string };
}

export default function PatientDetailsClient({ params }: PatientDetailsClientProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('appointments');
  const [vitals, setVitals] = useState<any[]>([]);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [editingVital, setEditingVital] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showMedicalHistoryForm, setShowMedicalHistoryForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      console.log('Fetching user profile...');
      const userProfile = await getCurrentUserProfile();
      console.log('User profile fetched:', userProfile);
      setCurrentUser(userProfile);

      // If no user profile, try to get auth user for debugging
      if (!userProfile) {
        const authUser = await getCurrentUser();
        console.log('Auth user (for debugging):', authUser);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Only fetch data if we have a valid patient ID
    if (params.id && params.id.trim() !== '') {
      fetchPatientData();
    } else {
      setError('Invalid patient ID provided');
      setLoading(false);
    }
  }, [params.id]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);

      // Validate the patient ID
      if (!params.id || params.id.trim() === '') {
        throw new Error('Invalid patient ID provided');
      }

      const patientData = await getPatientWithRelatedData(params.id.trim());
      setPatient(patientData);

      // Fetch vitals data using the database ID
      setVitalsLoading(true);
      try {
        const vitalsData = await getPatientVitals(patientData.id);
        setVitals(vitalsData);
      } catch (vitalsError) {
        console.error('Error fetching vitals data:', vitalsError);
      } finally {
        setVitalsLoading(false);
      }

      // Fetch medical history data using the database ID
      setHistoryLoading(true);
      try {
        const historyData = await getMedicalHistory(patientData.id);
        setMedicalHistory(historyData);
      } catch (historyError) {
        console.error('Error fetching medical history data:', historyError);
      } finally {
        setHistoryLoading(false);
      }
    } catch (err) {
      console.error('Error fetching patient data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'critical':
        return 'text-red-500 bg-red-50 border-red-200';
      case 'stable':
        return 'text-green-500 bg-green-50 border-green-200';
      case 'recovering':
        return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'active':
        return 'text-blue-500 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Patient</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/patients">
            <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors">
              Back to Patients
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient Not Found</h2>
          <p className="text-gray-600 mb-4">The requested patient could not be found.</p>
          <Link href="/patients">
            <button className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors">
              Back to Patients
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/patients">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-lg font-mono text-orange-600">{patient.patient_id}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                    {patient.status?.charAt(0).toUpperCase() + patient.status?.slice(1) || 'Active'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/patients/${patient.patient_id}/edit`)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Patient
              </button>
              <button
                onClick={() => setShowPrescriptionForm(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Pill className="h-4 w-4" />
                Prescribe Medicine
              </button>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Patient Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Personal Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Personal Information</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Age:</span>
                <span className="ml-2 font-medium">{calculateAge(patient.date_of_birth)} years</span>
              </div>

              <div className="flex items-center text-sm">
                <User className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Gender:</span>
                <span className="ml-2 font-medium capitalize">{patient.gender}</span>
              </div>

              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-medium">{patient.phone}</span>
              </div>

              <div className="flex items-center text-sm">
                <Mail className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{patient.email}</span>
              </div>

              <div className="flex items-start text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <span className="text-gray-600">Address:</span>
                  <p className="ml-2 font-medium">{patient.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Heart className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Medical Information</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Heart className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Blood Group:</span>
                <span className="ml-2 font-medium">{patient.blood_group || 'Not specified'}</span>
              </div>

              {patient.allergies && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="flex items-center text-red-700 text-sm font-medium mb-1">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Allergies
                  </div>
                  <p className="text-red-600 text-sm">{patient.allergies}</p>
                </div>
              )}

              {patient.initial_symptoms && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <div className="flex items-center text-yellow-700 text-sm font-medium mb-1">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Initial Symptoms
                  </div>
                  <p className="text-yellow-600 text-sm">{patient.initial_symptoms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admission Information Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Admission Information</h3>
            </div>

            <div className="space-y-3">
              {patient.admission_date && (
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Admitted:</span>
                  <span className="ml-2 font-medium">{formatDateTime(patient.admission_date)}</span>
                </div>
              )}

              {patient.admission_type && (
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium capitalize">{patient.admission_type}</span>
                </div>
              )}

              {patient.department_ward && (
                <div className="flex items-center text-sm">
                  <Building className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Department:</span>
                  <span className="ml-2 font-medium">{patient.department_ward}</span>
                </div>
              )}

              {patient.room_number && (
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Room:</span>
                  <span className="ml-2 font-medium">{patient.room_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: Eye },
                { id: 'vitals', name: 'Vitals', icon: Activity },
                { id: 'medical-history', name: 'Medical History', icon: Heart },
                { id: 'medications', name: 'Medications', icon: Pill },
                { id: 'documents', name: 'Documents', icon: FolderOpen },
                { id: 'appointments', name: 'Appointments & Admissions', icon: Calendar },
                { id: 'billing', name: 'Billing', icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {patient.primary_complaint && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Primary Complaint / Reason for Visit
                    </h4>
                    <p className="text-orange-800">{patient.primary_complaint}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {patient.referring_doctor_facility && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2">Referring Doctor/Facility</h4>
                      <p className="text-blue-800">{patient.referring_doctor_facility}</p>
                    </div>
                  )}

                  {patient.referred_by && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-2">Referred By</h4>
                      <p className="text-green-800">{patient.referred_by}</p>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">Patient registered</p>
                        <p className="text-xs text-gray-500">{formatDateTime(patient.created_at)}</p>
                      </div>
                    </div>
                    {patient.admission_date && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">Patient admitted</p>
                          <p className="text-xs text-gray-500">{formatDateTime(patient.admission_date)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Vitals Tab */}
            {activeTab === 'vitals' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Patient Vitals</h3>
                  <button
                    onClick={() => {
                      setEditingVital(null);
                      setShowVitalsForm(true);
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Record New Vitals
                  </button>
                </div>

                {vitalsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                  </div>
                ) : vitals.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No vitals recorded</h4>
                    <p className="text-gray-500 mb-4">Get started by recording new vitals for this patient.</p>
                    <button
                      onClick={() => {
                        setEditingVital(null);
                        setShowVitalsForm(true);
                      }}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Record First Vitals
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vitals.map((vital) => (
                      <div key={vital.id} className="bg-white rounded-lg border border-gray-200 p-4 relative">
                        {/* Alert indicator */}
                        {vital.alerts && vital.alerts.length > 0 && (
                          <div className="absolute top-2 right-2">
                            <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {vital.alerts.length} Alert{vital.alerts.length > 1 ? 's' : ''}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Recorded on {new Date(vital.recorded_at).toLocaleString()}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Recorded by: {vital.recorded_by_user?.name || 'Unknown'}</span>
                              {vital.recording_location && (
                                <span>Location: {vital.recording_location}</span>
                              )}
                              {vital.recording_device && (
                                <span>Device: {vital.recording_device}</span>
                              )}
                              {vital.version > 1 && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  v{vital.version}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {vital.is_validated && (
                              <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                <CheckCircle className="h-3 w-3" />
                                Validated
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setEditingVital(vital);
                                setShowVitalsForm(true);
                              }}
                              className="text-orange-500 hover:text-orange-700 text-sm font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {vital.blood_pressure_systolic && vital.blood_pressure_diastolic && (
                            <div className="bg-red-50 p-3 rounded-lg">
                              <p className="text-xs text-red-600 font-medium">Blood Pressure</p>
                              <p className="text-lg font-semibold text-red-800">
                                {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}
                              </p>
                              <p className="text-xs text-red-600">mmHg</p>
                            </div>
                          )}

                          {vital.heart_rate && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-600 font-medium">Heart Rate</p>
                              <p className="text-lg font-semibold text-blue-800">
                                {vital.heart_rate} <span className="text-sm">bpm</span>
                              </p>
                            </div>
                          )}

                          {vital.temperature && (
                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <p className="text-xs text-yellow-600 font-medium">Temperature</p>
                              <p className="text-lg font-semibold text-yellow-800">
                                {vital.temperature}°F
                              </p>
                            </div>
                          )}

                          {vital.oxygen_saturation && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-xs text-green-600 font-medium">Oxygen Saturation</p>
                              <p className="text-lg font-semibold text-green-800">
                                {vital.oxygen_saturation}%
                              </p>
                            </div>
                          )}

                          {vital.respiratory_rate && (
                            <div className="bg-cyan-50 p-3 rounded-lg">
                              <p className="text-xs text-cyan-600 font-medium">Respiratory Rate</p>
                              <p className="text-lg font-semibold text-cyan-800">
                                {vital.respiratory_rate} <span className="text-sm">bpm</span>
                              </p>
                            </div>
                          )}

                          {vital.weight && (
                            <div className="bg-purple-50 p-3 rounded-lg">
                              <p className="text-xs text-purple-600 font-medium">Weight</p>
                              <p className="text-lg font-semibold text-purple-800">
                                {vital.weight} <span className="text-sm">kg</span>
                              </p>
                            </div>
                          )}

                          {vital.height && (
                            <div className="bg-indigo-50 p-3 rounded-lg">
                              <p className="text-xs text-indigo-600 font-medium">Height</p>
                              <p className="text-lg font-semibold text-indigo-800">
                                {vital.height} <span className="text-sm">cm</span>
                              </p>
                            </div>
                          )}

                          {vital.bmi && (
                            <div className="bg-teal-50 p-3 rounded-lg">
                              <p className="text-xs text-teal-600 font-medium">BMI</p>
                              <p className="text-lg font-semibold text-teal-800">{vital.bmi}</p>
                            </div>
                          )}

                          {vital.blood_glucose && (
                            <div className="bg-pink-50 p-3 rounded-lg">
                              <p className="text-xs text-pink-600 font-medium">Blood Glucose</p>
                              <p className="text-lg font-semibold text-pink-800">
                                {vital.blood_glucose} <span className="text-sm">mg/dL</span>
                              </p>
                            </div>
                          )}

                          {vital.pain_scale !== undefined && vital.pain_scale !== null && (
                            <div className="bg-orange-50 p-3 rounded-lg">
                              <p className="text-xs text-orange-600 font-medium">Pain Scale</p>
                              <p className="text-lg font-semibold text-orange-800">
                                {vital.pain_scale}/10
                              </p>
                            </div>
                          )}

                        </div>

                        {vital.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {vital.notes}
                            </p>
                          </div>
                        )}

                        {/* Metadata footer */}
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                          <div className="flex items-center gap-4">
                            {vital.updated_at !== vital.created_at && (
                              <span>Last updated: {new Date(vital.updated_at).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Medical History Tab */}
            {activeTab === 'medical-history' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Medical History Timeline</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowMedicalHistoryForm(true)}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Medical Event
                    </button>
                    {patient?.id && (
                      <AddDummyMedicalHistory
                        patientId={patient.id}
                        onSuccess={async () => {
                          setHistoryLoading(true);
                          try {
                            const historyData = await getMedicalHistory(patient.id);
                            setMedicalHistory(historyData);
                          } catch (error) {
                            console.error('Error fetching medical history:', error);
                          } finally {
                            setHistoryLoading(false);
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                  </div>
                ) : medicalHistory.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No medical history found</h4>
                    <p className="text-gray-500 mb-4">No medical events have been recorded for this patient.</p>
                    <button
                      onClick={() => setShowMedicalHistoryForm(true)}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Record First Medical Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {medicalHistory.map((event) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                          <div className="w-px h-full bg-gray-300"></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-700">{event.event_name}</p>
                          <p className="text-sm text-gray-500">{new Date(event.event_date).toLocaleDateString()} - {event.event_type}</p>
                          <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                          {event.doctor_name && <p className="text-sm text-blue-600 mt-1">Doctor: {event.doctor_name}</p>}
                          {event.facility_name && <p className="text-sm text-purple-600 mt-1">Facility: {event.facility_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Medical History Form Modal */}
                {showMedicalHistoryForm && patient?.id && (
                  <MedicalHistoryForm
                    patientId={patient.id}
                    onClose={() => setShowMedicalHistoryForm(false)}
                    onSuccess={async () => {
                      setHistoryLoading(true);
                      try {
                        const historyData = await getMedicalHistory(patient.id);
                        setMedicalHistory(historyData);
                      } catch (error) {
                        console.error('Error fetching medical history:', error);
                      } finally {
                        setHistoryLoading(false);
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Medications Tab */}
            {activeTab === 'medications' && (
              <MedicationHistory patientId={patient.id} />
            )}

            {/* Appointments & Admissions Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-6">
                {/* Sub-tabs for Appointments and Admissions */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => setActiveSubTab('appointments')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeSubTab === 'appointments'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Calendar className="h-4 w-4" />
                      Appointments
                    </button>
                    <button
                      onClick={() => setActiveSubTab('admissions')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeSubTab === 'admissions'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Bed className="h-4 w-4" />
                      Admission History
                    </button>
                  </nav>
                </div>

                {/* Appointments Sub-tab */}
                {activeSubTab === 'appointments' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-900">Appointment History</h4>
                      <button className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        New Appointment
                      </button>
                    </div>

                    {patient.appointments && patient.appointments.length > 0 ? (
                      <div className="space-y-3">
                        {patient.appointments.map((appointment, index) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{appointment.type}</p>
                                <p className="text-sm text-gray-600">
                                  {formatDate(appointment.appointment_date)} at {appointment.appointment_time}
                                </p>
                                {appointment.doctor && (
                                  <p className="text-sm text-gray-600">
                                    Dr. {appointment.doctor.user?.name || 'Unknown'} - {appointment.doctor.user?.specialization || 'General'}
                                  </p>
                                )}
                                {appointment.symptoms && (
                                  <p className="text-sm text-gray-500 mt-1">Symptoms: {appointment.symptoms}</p>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {appointment.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No appointments found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Admissions Sub-tab */}
                {activeSubTab === 'admissions' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-900">Admission & Discharge History</h4>
                    </div>

                    {patient.bed_allocations && patient.bed_allocations.length > 0 ? (
                      <div className="space-y-3">
                        {patient.bed_allocations.map((allocation, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${allocation.status === 'active' ? 'bg-green-100' :
                                    allocation.status === 'discharged' ? 'bg-blue-100' : 'bg-gray-100'
                                  }`}>
                                  {allocation.status === 'active' ? (
                                    <LogIn className={`h-4 w-4 ${allocation.status === 'active' ? 'text-green-600' :
                                        allocation.status === 'discharged' ? 'text-blue-600' : 'text-gray-600'
                                      }`} />
                                  ) : (
                                    <LogOut className={`h-4 w-4 ${allocation.status === 'active' ? 'text-green-600' :
                                        allocation.status === 'discharged' ? 'text-blue-600' : 'text-gray-600'
                                      }`} />
                                  )}
                                </div>
                                <div>
                                  <h5 className="font-medium text-gray-900">
                                    {allocation.status === 'active' ? 'Current Admission' : 'Previous Admission'}
                                  </h5>
                                  <p className="text-sm text-gray-600">
                                    Bed: {allocation.bed?.bed_number || 'N/A'} • Room: {allocation.bed?.room_number || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${allocation.status === 'active' ? 'bg-green-100 text-green-800' :
                                  allocation.status === 'discharged' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {allocation.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Admission Date:</span>
                                <p className="font-medium">{formatDateTime(allocation.admission_date)}</p>
                              </div>
                              {allocation.discharge_date && (
                                <div>
                                  <span className="text-gray-600">Discharge Date:</span>
                                  <p className="font-medium">{formatDateTime(allocation.discharge_date)}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Admission Type:</span>
                                <p className="font-medium">{allocation.admission_type || 'N/A'}</p>
                              </div>
                              {allocation.reason && (
                                <div>
                                  <span className="text-gray-600">Reason:</span>
                                  <p className="font-medium">{allocation.reason}</p>
                                </div>
                              )}
                              {allocation.daily_charges && (
                                <div>
                                  <span className="text-gray-600">Daily Charges:</span>
                                  <p className="font-medium">₹{allocation.daily_charges}</p>
                                </div>
                              )}
                              {allocation.total_charges && (
                                <div>
                                  <span className="text-gray-600">Total Charges:</span>
                                  <p className="font-medium">₹{allocation.total_charges}</p>
                                </div>
                              )}
                            </div>

                            {allocation.status === 'active' && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  Currently admitted
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Bed className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No admission history found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Billing Information</h4>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Billing information will be available soon</p>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Patient Documents</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload Section */}
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                      Upload New Documents
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload medical reports, lab results, prescriptions, or any other relevant documents.
                    </p>
                    <DocumentUpload
                      patientId={patient.id}
                      uhid={patient.patient_id}
                      category="medical-report"
                      onUploadComplete={(doc) => {
                        console.log('Document uploaded:', doc);
                        // Force refresh of document list
                      }}
                      onUploadError={(error) => {
                        console.error('Upload error:', error);
                      }}
                    />
                  </div>

                  {/* Documents List */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <DocumentList
                      patientId={patient.id}
                      showDelete={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showVitalsForm && patient && (
        <VitalsForm
          patientId={patient.patient_id}
          onClose={() => {
            setShowVitalsForm(false);
            setEditingVital(null);
          }}
          onVitalsRecorded={() => {
            // Refresh vitals data
            fetchPatientData();
          }}
          editingVital={editingVital}
          currentUser={currentUser}
        />
      )}

      {showPrescriptionForm && patient && (
        <PrescriptionForm
          patientId={patient.patient_id}
          patientName={patient.name}
          currentUser={currentUser}
          onClose={() => setShowPrescriptionForm(false)}
          onPrescriptionCreated={() => {
            // Refresh patient data to show new prescription
            fetchPatientData();
          }}
        />
      )}
    </div>
  );
}

// Vitals Form Component
function VitalsForm({
  patientId,
  onClose,
  onVitalsRecorded,
  editingVital,
  currentUser
}: {
  patientId: string;
  onClose: () => void;
  onVitalsRecorded: () => void;
  editingVital: any | null;
  currentUser: any | null;
}) {
  const [formData, setFormData] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    bloodGlucose: '',
    painScale: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing data when editing
  useEffect(() => {
    if (editingVital) {
      setFormData({
        bloodPressureSystolic: editingVital.blood_pressure_systolic?.toString() || '',
        bloodPressureDiastolic: editingVital.blood_pressure_diastolic?.toString() || '',
        heartRate: editingVital.heart_rate?.toString() || '',
        temperature: editingVital.temperature?.toString() || '',
        respiratoryRate: editingVital.respiratory_rate?.toString() || '',
        oxygenSaturation: editingVital.oxygen_saturation?.toString() || '',
        weight: editingVital.weight?.toString() || '',
        height: editingVital.height?.toString() || '',
        bloodGlucose: editingVital.blood_glucose?.toString() || '',
        painScale: editingVital.pain_scale?.toString() || '',
        notes: editingVital.notes || ''
      });
    }
  }, [editingVital]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const vitalsData: any = {
        patientId,
        recordedBy: currentUser?.id || null,
        bloodPressureSystolic: formData.bloodPressureSystolic ? parseInt(formData.bloodPressureSystolic) : undefined,
        bloodPressureDiastolic: formData.bloodPressureDiastolic ? parseInt(formData.bloodPressureDiastolic) : undefined,
        heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : undefined,
        oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        bloodGlucose: formData.bloodGlucose ? parseInt(formData.bloodGlucose) : undefined,
        painScale: formData.painScale ? parseInt(formData.painScale) : undefined,
        notes: formData.notes || undefined
      };

      if (editingVital) {
        // Update existing vital record
        await updateVitalRecord(editingVital.id, vitalsData);
      } else {
        // Record new vital signs
        await recordVitals(vitalsData);
      }

      onVitalsRecorded();
      onClose();
    } catch (err) {
      console.error('Error recording vitals:', err);
      setError(err instanceof Error ? err.message : 'Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingVital ? 'Edit Vitals' : 'Record New Vitals'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Blood Pressure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Systolic BP (mmHg)
                </label>
                <input
                  type="number"
                  name="bloodPressureSystolic"
                  value={formData.bloodPressureSystolic}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diastolic BP (mmHg)
                </label>
                <input
                  type="number"
                  name="bloodPressureDiastolic"
                  value={formData.bloodPressureDiastolic}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Vital Signs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  name="heartRate"
                  value={formData.heartRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="temperature"
                  value={formData.temperature}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respiratory Rate (bpm)
                </label>
                <input
                  type="number"
                  name="respiratoryRate"
                  value={formData.respiratoryRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oxygen Saturation (%)
                </label>
                <input
                  type="number"
                  name="oxygenSaturation"
                  value={formData.oxygenSaturation}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Physical Measurements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Glucose (mg/dL)
                </label>
                <input
                  type="number"
                  name="bloodGlucose"
                  value={formData.bloodGlucose}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pain Scale (0-10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  name="painScale"
                  value={formData.painScale}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Additional notes about the patient's condition..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : editingVital ? 'Update Vitals' : 'Record Vitals'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}