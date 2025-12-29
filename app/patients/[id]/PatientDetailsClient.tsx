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
  // New outpatient fields
  age?: number;
  diagnosis?: string;
  height?: string;
  weight?: string;
  bmi?: string;
  temperature?: string;
  temp_unit?: string;
  bp_systolic?: string;
  bp_diastolic?: string;
  pulse?: string;
  spo2?: string;
  respiratory_rate?: string;
  random_blood_sugar?: string;
  vital_notes?: string;
  op_card_amount?: string;
  consultation_fee?: string;
  total_amount?: string;
  payment_mode?: string;
  consulting_doctor_name?: string;
  alternate_phone?: string;
  city?: string;
  state?: string;
  pincode?: string;
  appointments: any[];
  bed_allocations: any[];
  staff?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
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
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const userProfile = await getCurrentUserProfile();
      setCurrentUser(userProfile);
    };
    fetchUser();
  }, []);

  useEffect(() => {
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
      const patientData = await getPatientWithRelatedData(params.id.trim());
      setPatient(patientData);

      setVitalsLoading(true);
      try {
        const vitalsData = await getPatientVitals(patientData.id);
        setVitals(vitalsData);
      } catch (vitalsError) {
        console.error('Error fetching vitals data:', vitalsError);
      } finally {
        setVitalsLoading(false);
      }

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

  const calculateAge = (dateOfBirth: string, directAge?: number) => {
    if (directAge) return directAge;
    if (!dateOfBirth) return 'N/A';
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
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'stable': return 'text-green-500 bg-green-50 border-green-200';
      case 'recovering': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'active': return 'text-blue-500 bg-blue-50 border-blue-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
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

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || 'Patient Not Found'}</h2>
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
                  {patient.staff && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      <Users size={12} />
                      <span>Registered By: {patient.staff.first_name} {patient.staff.last_name}</span>
                    </div>
                  )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Personal Info</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">DOB:</span>
                <span className="ml-2 font-medium">{formatDate(patient.date_of_birth)} ({patient.age || calculateAge(patient.date_of_birth)})</span>
              </div>
              <div className="flex items-center text-sm">
                <Phone className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-medium">{patient.phone}</span>
              </div>
              {patient.alternate_phone && (
                <div className="flex items-center text-sm ml-7">
                  <span className="text-gray-500 italic">Alt: {patient.alternate_phone}</span>
                </div>
              )}
              <div className="flex items-start text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                <div className="flex-1">
                  <span className="text-gray-600">Address:</span>
                  <p className="ml-2 font-medium text-gray-900 break-words">
                    {patient.address}<br />
                    {[patient.city, patient.state, patient.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency & Guardian */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Emergency & Guardian</h3>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-red-50/50 rounded-lg border border-red-100">
                <h4 className="text-xs font-bold text-red-800 uppercase mb-2">Emergency Contact</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Name:</span> <span className="font-medium">{patient.emergency_contact_name || 'N/A'}</span></p>
                  <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{patient.emergency_contact_phone || 'N/A'}</span></p>
                </div>
              </div>
              {(patient.guardian_name || patient.guardian_phone) && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Guardian</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Name:</span> <span className="font-medium">{patient.guardian_name || 'N/A'}</span></p>
                    <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{patient.guardian_phone || 'N/A'}</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Medical Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Heart className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Medical Info</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <span className="text-gray-500">Blood Group</span>
                <span className="font-bold text-red-600">{patient.blood_group || 'N/A'}</span>
              </div>
              {patient.diagnosis && (
                <div className="bg-blue-50 p-2 rounded border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-1">Diagnosis</p>
                  <p className="text-sm font-medium text-blue-900">{patient.diagnosis}</p>
                </div>
              )}
              {patient.allergies && (
                <div className="bg-red-50 p-2 rounded border border-red-100">
                  <p className="text-xs font-bold text-red-700 uppercase mb-1">Allergies</p>
                  <p className="text-sm text-red-900">{patient.allergies}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admission Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Admission Info</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Admitted:</span>
                <span className="ml-2 font-medium">{formatDateTime(patient.admission_date)}</span>
              </div>
              <div className="flex items-center text-sm">
                <FileText className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium capitalize">{patient.admission_type || 'OP'}</span>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Ward/Room:</span>
                <span className="ml-2 font-medium">{patient.department_ward || 'N/A'} / {patient.room_number || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="border-b border-gray-200 bg-white">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: Eye },
                { id: 'vitals', name: 'Vitals', icon: Activity },
                { id: 'medical-history', name: 'Medical History', icon: Heart },
                { id: 'medications', name: 'Medications', icon: Pill },
                { id: 'documents', name: 'Documents', icon: FolderOpen },
                { id: 'appointments', name: 'Appointments', icon: Calendar },
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
                    <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2 text-sm uppercase">
                      <ClipboardList className="h-4 w-4" />
                      Primary Complaint / Reason for Visit
                    </h4>
                    <p className="text-orange-900 font-medium">{patient.primary_complaint}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {patient.consulting_doctor_name && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-bold text-purple-900 mb-2 text-xs uppercase">Consulting Doctor</h4>
                      <p className="text-purple-900 font-bold">{patient.consulting_doctor_name}</p>
                      <p className="text-purple-600 text-sm">{patient.department_ward}</p>
                    </div>
                  )}
                  {patient.referring_doctor_facility && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-bold text-blue-900 mb-2 text-xs uppercase">Referring Doc/Facility</h4>
                      <p className="text-blue-900 font-medium">{patient.referring_doctor_facility}</p>
                    </div>
                  )}
                  {patient.referred_by && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-bold text-green-900 mb-2 text-xs uppercase">Referred By</h4>
                      <p className="text-green-900 font-medium">{patient.referred_by}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase">Activity History</h4>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Patient Registered</p>
                        <p className="text-xs text-gray-500">{formatDateTime(patient.created_at)}</p>
                      </div>
                    </div>
                    {patient.admission_date && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Patient Admitted</p>
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
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Vital Signs Tracking</h3>
                  <button
                    onClick={() => { setEditingVital(null); setShowVitalsForm(true); }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Record New Vitals
                  </button>
                </div>

                {/* Registration Vitals (Baseline) */}
                {(patient.height || patient.weight || patient.temperature || patient.bp_systolic || patient.pulse) && (
                  <div className="bg-orange-50/50 rounded-xl border border-orange-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-sm font-bold text-orange-800 uppercase flex items-center gap-2">
                        <Activity size={18} />
                        Registration Baseline Vitals
                      </h4>
                      <span className="text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full font-bold">INITIAL</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {patient.bp_systolic && (
                        <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                          <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Blood Pressure</p>
                          <p className="text-xl font-black text-gray-900">{patient.bp_systolic}/{patient.bp_diastolic}</p>
                          <p className="text-[10px] text-gray-400">mmHg</p>
                        </div>
                      )}
                      {patient.pulse && (
                        <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                          <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Pulse Rate</p>
                          <p className="text-xl font-black text-gray-900">{patient.pulse} <span className="text-xs font-normal">bpm</span></p>
                        </div>
                      )}
                      {patient.temperature && (
                        <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                          <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Temp</p>
                          <p className="text-xl font-black text-gray-900">{patient.temperature}°{patient.temp_unit || 'F'}</p>
                        </div>
                      )}
                      {patient.spo2 && (
                        <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                          <p className="text-[10px] text-gray-500 uppercase font-black mb-1">SpO2</p>
                          <p className="text-xl font-black text-gray-900">{patient.spo2}%</p>
                        </div>
                      )}
                      {patient.weight && (
                        <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                          <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Weight</p>
                          <p className="text-xl font-black text-gray-900">{patient.weight} <span className="text-xs font-normal">kg</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* History */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Recorded History</h4>
                  {vitalsLoading ? (
                    <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div></div>
                  ) : vitals.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-500">No vital history recorded yet.</p>
                    </div>
                  ) : (
                    vitals.map((vital) => (
                      <div key={vital.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-orange-200 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-gray-900">{formatDateTime(vital.recorded_at)}</p>
                            <p className="text-xs text-gray-500">Recorded by {vital.recorded_by_user?.name || 'Staff'}</p>
                          </div>
                          <button onClick={() => { setEditingVital(vital); setShowVitalsForm(true); }} className="text-orange-600 font-bold text-xs hover:underline">EDIT</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {vital.blood_pressure_systolic && <div className="text-sm"><p className="text-gray-400 text-[10px] uppercase font-bold">BP</p><p className="font-bold">{vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic}</p></div>}
                          {vital.heart_rate && <div className="text-sm"><p className="text-gray-400 text-[10px] uppercase font-bold">Pulse</p><p className="font-bold">{vital.heart_rate} bpm</p></div>}
                          {vital.temperature && <div className="text-sm"><p className="text-gray-400 text-[10px] uppercase font-bold">Temp</p><p className="font-bold">{vital.temperature}°F</p></div>}
                          {vital.oxygen_saturation && <div className="text-sm"><p className="text-gray-400 text-[10px] uppercase font-bold">SpO2</p><p className="font-bold">{vital.oxygen_saturation}%</p></div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Medical History Tab */}
            {activeTab === 'medical-history' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Medical History Timeline</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setShowMedicalHistoryForm(true)} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16} /> Add Event</button>
                    <AddDummyMedicalHistory patientId={patient.id} onSuccess={fetchPatientData} />
                  </div>
                </div>
                <div className="relative pl-8 border-l-2 border-orange-100 ml-4 space-y-8 py-4">
                  {medicalHistory.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-orange-500 border-4 border-white shadow-sm"></div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900">{event.event_name}</h4>
                          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">{formatDate(event.event_date)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{event.details}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs">
                          {event.doctor_name && <span className="text-blue-600 font-medium">Dr. {event.doctor_name}</span>}
                          {event.facility_name && <span className="text-purple-600 font-medium">{event.facility_name}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {medicalHistory.length === 0 && <p className="text-center text-gray-500 py-12">No medical history entries found.</p>}
                </div>
              </div>
            )}

            {/* Medications Tab */}
            {activeTab === 'medications' && <MedicationHistory patientId={patient.id} />}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Upload className="text-blue-600" size={20} /> Upload Documents
                  </h4>
                  <DocumentUpload
                    patientId={patient.id}
                    uhid={patient.patient_id}
                    category="medical-report"
                    onUploadComplete={() => setDocumentRefreshTrigger(prev => prev + 1)}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 px-2">Recent Files</h4>
                  <DocumentList patientId={patient.id} showDelete={true} refreshTrigger={documentRefreshTrigger} />
                </div>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 flex gap-6 mb-4">
                  <button onClick={() => setActiveSubTab('appointments')} className={`pb-3 text-sm font-bold ${activeSubTab === 'appointments' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>APPOINTMENTS</button>
                  <button onClick={() => setActiveSubTab('admissions')} className={`pb-3 text-sm font-bold ${activeSubTab === 'admissions' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}>ADMISSIONS</button>
                </div>
                {activeSubTab === 'appointments' ? (
                  <div className="space-y-4">
                    {patient.appointments?.map((app, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                        <div>
                          <p className="font-bold text-gray-900">{app.type}</p>
                          <p className="text-sm text-gray-500">{formatDate(app.appointment_date)} at {app.appointment_time}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${app.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{app.status}</span>
                      </div>
                    ))}
                    {(!patient.appointments || patient.appointments.length === 0) && <p className="text-center py-12 text-gray-500">No appointments found.</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patient.bed_allocations?.map((alloc, i) => (
                      <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3 items-center">
                            <div className={`p-2 rounded-lg ${alloc.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}><Bed size={18} /></div>
                            <div><h5 className="font-bold text-gray-900">Ward {alloc.bed?.room_number || 'N/A'} - Bed {alloc.bed?.bed_number || 'N/A'}</h5><p className="text-xs text-gray-500">{alloc.admission_type}</p></div>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${alloc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{alloc.status}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                          <div><p className="text-gray-400 text-xs">Admitted</p><p className="font-medium text-gray-900">{formatDate(alloc.admission_date)}</p></div>
                          {alloc.discharge_date && <div><p className="text-gray-400 text-xs">Discharged</p><p className="font-medium text-gray-900">{formatDate(alloc.discharge_date)}</p></div>}
                          {alloc.reason && <div className="col-span-2"><p className="text-gray-400 text-xs">Reason</p><p className="font-medium text-gray-900">{alloc.reason}</p></div>}
                        </div>
                      </div>
                    ))}
                    {(!patient.bed_allocations || patient.bed_allocations.length === 0) && <p className="text-center py-12 text-gray-500">No admission history found.</p>}
                  </div>
                )}
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-8">
                <div className="bg-orange-50/30 p-8 rounded-3xl border-2 border-orange-100 border-dashed">
                  <h4 className="text-lg font-black text-orange-900 mb-6 flex items-center gap-2">
                    <FileText className="text-orange-500" /> REGISTRATION BILLING SUMMARY
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Total Fee</p>
                      <p className="text-3xl font-black text-gray-900">₹{patient.total_amount || '0'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Payment Mode</p>
                      <p className="text-2xl font-black text-gray-900">{patient.payment_mode || 'CASH'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Consultation</p>
                      <p className="text-2xl font-black text-gray-900">₹{patient.consultation_fee || '0'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">OP Card</p>
                      <p className="text-2xl font-black text-gray-900">₹{patient.op_card_amount || '0'}</p>
                    </div>
                  </div>
                </div>
                {patient.consulting_doctor_name && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h5 className="font-bold text-gray-900 mb-4 text-sm uppercase">Billing Context</h5>
                    <div className="flex gap-12">
                      <div><p className="text-gray-400 text-xs uppercase font-bold">Doctor</p><p className="font-bold text-gray-900">{patient.consulting_doctor_name}</p></div>
                      <div><p className="text-gray-400 text-xs uppercase font-bold">Department</p><p className="font-bold text-gray-900">{patient.department_ward || 'General'}</p></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forms Modals */}
      {showVitalsForm && (
        <VitalsForm
          patientId={patient.patient_id}
          onClose={() => { setShowVitalsForm(false); setEditingVital(null); }}
          onVitalsRecorded={fetchPatientData}
          editingVital={editingVital}
          currentUser={currentUser}
        />
      )}
      {showPrescriptionForm && (
        <PrescriptionForm
          patientId={patient.patient_id}
          patientName={patient.name}
          currentUser={currentUser}
          onClose={() => setShowPrescriptionForm(false)}
          onPrescriptionCreated={fetchPatientData}
        />
      )}
      {showMedicalHistoryForm && (
        <MedicalHistoryForm
          patientId={patient.id}
          onClose={() => setShowMedicalHistoryForm(false)}
          onSuccess={fetchPatientData}
        />
      )}
    </div>
  );
}

// Sub-components
function VitalsForm({ patientId, onClose, onVitalsRecorded, editingVital, currentUser }: any) {
  const [formData, setFormData] = useState({
    bloodPressureSystolic: '', bloodPressureDiastolic: '', heartRate: '', temperature: '',
    respiratoryRate: '', oxygenSaturation: '', weight: '', height: '',
    bloodGlucose: '', painScale: '', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        patientId,
        recordedBy: currentUser?.id,
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
        notes: formData.notes
      };
      if (editingVital) await updateVitalRecord(editingVital.id, data);
      else await recordVitals(data);
      onVitalsRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-gray-900">{editingVital ? 'Update Vitals' : 'Record New Vitals'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
        </div>
        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold border border-red-100">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div><label className="block text-xs font-black text-gray-500 uppercase mb-2">BP Systolic</label><input type="number" value={formData.bloodPressureSystolic} onChange={e => setFormData({ ...formData, bloodPressureSystolic: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
            <div><label className="block text-xs font-black text-gray-500 uppercase mb-2">BP Diastolic</label><input type="number" value={formData.bloodPressureDiastolic} onChange={e => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
            <div><label className="block text-xs font-black text-gray-500 uppercase mb-2">Heart Rate</label><input type="number" value={formData.heartRate} onChange={e => setFormData({ ...formData, heartRate: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
            <div><label className="block text-xs font-black text-gray-500 uppercase mb-2">Temp (°F)</label><input type="number" step="0.1" value={formData.temperature} onChange={e => setFormData({ ...formData, temperature: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
            <div><label className="block text-xs font-black text-gray-500 uppercase mb-2">SpO2 (%)</label><input type="number" value={formData.oxygenSaturation} onChange={e => setFormData({ ...formData, oxygenSaturation: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
            <div><label className="block text-xs font-black text-gray-500 uppercase mb-2">Resp Rate</label><input type="number" value={formData.respiratoryRate} onChange={e => setFormData({ ...formData, respiratoryRate: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Cancel</button>
            <button type="submit" disabled={loading} className="px-8 py-3 bg-orange-600 text-white font-black rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-100 disabled:opacity-50">{loading ? 'Saving...' : 'Record Vitals'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}