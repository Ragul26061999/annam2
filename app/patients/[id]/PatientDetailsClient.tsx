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
  FolderOpen,
  Microscope,
  Radiation,
  Printer
} from 'lucide-react';
import { getPatientWithRelatedData } from '../../../src/lib/patientService';
import { getPatientVitals, recordVitals, updateVitalRecord } from '../../../src/lib/vitalsService';
import { getMedicalHistory, MedicalHistoryEvent } from '../../../src/lib/medicalHistoryService';
import { getPatientLabOrders, getPatientRadiologyOrders } from '../../../src/lib/labXrayService';
import { getIPComprehensiveBilling, IPComprehensiveBilling } from '../../../src/lib/ipBillingService';
import MedicalHistoryForm from '../../../src/components/MedicalHistoryForm';
import AddDummyMedicalHistory from '../../../src/components/AddDummyMedicalHistory';
import MedicationHistory from '../../../src/components/MedicationHistory';
import { getCurrentUser, getCurrentUserProfile } from '../../../src/lib/supabase';
import { supabase } from '../../../src/lib/supabase';
import PrescriptionForm from '../../../src/components/PrescriptionForm';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DocumentUpload from '../../../src/components/DocumentUpload';
import EnhancedDocumentList from '../../../src/components/EnhancedDocumentList';
import ClinicalRecordsModal from '../../../src/components/ip-clinical/ClinicalRecordsModal';
import { PatientBillingPrint } from '../../../src/components/PatientBillingPrint';

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
  billing?: {
    advance_amount?: number;
    amount_paid?: number;
    balance_due?: number;
    payment_status?: string;
    bill_number?: string;
    bed_allocation_id?: string;
  };
  staff?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

type BillingPaymentRow = {
  method: string;
  amount: number;
  reference?: string | null;
  received_at?: string;
};

type IpBilling = {
  id: string;
  bill_number?: string | null;
  bill_no?: string | null;
  total?: number | null;
  amount_paid?: number | null;
  balance_due?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  issued_at?: string;
  bed_allocation_id?: string | null;
};

interface PatientDetailsClientProps {
  params: { id: string };
}

export default function PatientDetailsClient({ params }: PatientDetailsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (searchParams) {
      const tab = searchParams.get('tab');
      const subtab = searchParams.get('subtab');
      
      if (tab === 'clinical-records') {
        setShowClinicalRecordsModal(true);
        if (subtab) {
          setClinicalRecordsSubTab(subtab as any);
        }
      } else if (tab) {
        setActiveTab(tab);
      }
    }
  }, [searchParams]);

  const [activeSubTab, setActiveSubTab] = useState('appointments');
  const [activeReportTab, setActiveReportTab] = useState('generated');
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
  const [temporaryDocuments, setTemporaryDocuments] = useState<any[]>([]);
  const [showClinicalRecordsModal, setShowClinicalRecordsModal] = useState(false);
  const [clinicalRecordsSubTab, setClinicalRecordsSubTab] = useState<'overview' | 'doctor' | 'nurse' | 'casesheet' | 'discharge'>('overview');

  const [ipAllocation, setIpAllocation] = useState<any | null>(null);
  const [ipBilling, setIpBilling] = useState<IpBilling | null>(null);
  const [ipBillingPayments, setIpBillingPayments] = useState<BillingPaymentRow[]>([]);
  const [comprehensiveBilling, setComprehensiveBilling] = useState<IPComprehensiveBilling | null>(null);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);

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

      // Resolve active/latest IP allocation
      const allocations = Array.isArray(patientData?.bed_allocations) ? patientData.bed_allocations : [];
      
      // Check if a specific allocation ID is provided in URL params
      const allocationId = searchParams?.get('allocation');
      let selectedAllocation = null;
      
      if (allocationId) {
        // Find the specific allocation requested
        selectedAllocation = allocations.find((a: any) => a?.id === allocationId) || null;
      }
      
      // If no specific allocation found or not provided, fall back to default logic
      if (!selectedAllocation) {
        const activeAlloc = allocations.find((a: any) => a?.status === 'active') || null;
        const latestAlloc = allocations.length
          ? allocations
            .slice()
            .sort((a: any, b: any) => {
              const ad = a?.admission_date ? new Date(a.admission_date).getTime() : 0;
              const bd = b?.admission_date ? new Date(b.admission_date).getTime() : 0;
              return bd - ad;
            })[0]
          : null;
        selectedAllocation = activeAlloc || latestAlloc;
      }
      
      const allocForBilling = selectedAllocation;
      setIpAllocation(allocForBilling || null);

      // Fetch comprehensive IP billing data
      try {
        if (allocForBilling?.id) {
          const billingData = await getIPComprehensiveBilling(allocForBilling.id);
          setComprehensiveBilling(billingData);
          
          // Set legacy ipBilling for compatibility
          setIpBilling({
            id: allocForBilling.id,
            total: billingData.summary.gross_total,
            amount_paid: billingData.summary.paid_total,
            balance_due: billingData.summary.pending_amount,
            payment_status: billingData.summary.pending_amount > 0 ? 'pending' : 'paid'
          });
          
          // Set payment data from comprehensive billing
          const paymentRows = billingData.payment_receipts.map(receipt => ({
            method: receipt.payment_type,
            amount: receipt.amount,
            reference: receipt.reference_number,
            received_at: receipt.payment_date
          }));
          setIpBillingPayments(paymentRows);
        } else {
          setComprehensiveBilling(null);
          setIpBilling(null);
          setIpBillingPayments([]);
        }
      } catch (ipBillingErr) {
        console.warn('Failed to load comprehensive IP billing:', ipBillingErr);
        setComprehensiveBilling(null);
        setIpBilling(null);
        setIpBillingPayments([]);
      }

      // Fetch billing information for this patient
      try {
        const { data: billingData, error: billingError } = await supabase
          .from('billing')
          .select('advance_amount, amount_paid, balance_due, payment_status, bill_number, bed_allocation_id')
          .eq('patient_id', patientData.id)
          .order('issued_at', { ascending: false })
          .limit(1)
          .single();

        if (!billingError && billingData) {
          setPatient(prev => prev ? { ...prev, billing: billingData } : prev);
        }
      } catch (billingErr) {
        console.warn('No billing record found for patient:', billingErr);
      }

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

      // Fetch Lab & Radiology Orders
      try {
        const [lOrders, rOrders] = await Promise.all([
          getPatientLabOrders(patientData.id),
          getPatientRadiologyOrders(patientData.id)
        ]);
        setLabOrders(lOrders);
        setRadiologyOrders(rOrders);
      } catch (reportsError) {
        console.error('Error fetching medical reports:', reportsError);
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
    // Convert UTC to Indian time (UTC+5:30)
    const date = new Date(dateString);
    const indianTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    
    return indianTime.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not specified';
    // Convert UTC to Indian time (UTC+5:30)
    const date = new Date(dateString);
    const indianTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    
    return indianTime.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatMoney = (value: any) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    return n.toLocaleString('en-IN');
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
                <span className="ml-2 font-medium">
                  {(() => {
                    const activeAllocation = patient.bed_allocations?.find((alloc: any) => alloc.status === 'active');
                    if (activeAllocation?.bed) {
                      const bed = activeAllocation.bed;
                      return `${bed.room_number || 'N/A'} - Bed ${bed.bed_number || 'N/A'}`;
                    }
                    return `${patient.department_ward || 'N/A'} / ${patient.room_number || 'N/A'}`;
                  })()}
                </span>
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
                { id: 'clinical-records', name: 'Clinical Records', icon: ClipboardList },
                { id: 'medical-history', name: 'Medical History', icon: Heart },
                { id: 'reports-docs', name: 'Medical Records', icon: FolderOpen },
                { id: 'medications', name: 'Medications', icon: Pill },
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

            {/* Clinical Records Tab */}
            {activeTab === 'clinical-records' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Inpatient Clinical Records</h3>
                    <p className="text-sm text-gray-500">View daily progress notes, doctor orders, and nurse records for IP admissions.</p>
                  </div>
                </div>

                {(!patient.bed_allocations || patient.bed_allocations.length === 0) ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h4 className="text-gray-900 font-medium">No IP Admissions Found</h4>
                    <p className="text-gray-500 text-sm mt-1">Clinical records are available only for inpatient admissions.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {patient.bed_allocations.map((alloc: any) => (
                      <div key={alloc.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-colors">
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${alloc.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                <Bed size={24} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-gray-900 text-lg">
                                    {alloc.ip_number || 'IP Admission'}
                                  </h4>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                    alloc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {alloc.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {alloc.bed?.room_number ? `Room ${alloc.bed.room_number}` : 'No Room'} • Bed {alloc.bed?.bed_number || 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => {
                                setIpAllocation(alloc);
                                setShowClinicalRecordsModal(true);
                              }}
                              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                            >
                              <ClipboardList size={18} />
                              Open Clinical Diary
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Admission Date</p>
                              <p className="font-semibold text-gray-900 flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                {formatDateTime(alloc.admission_date)}
                              </p>
                            </div>
                            {alloc.discharge_date && (
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Discharge Date</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-2">
                                  <CheckCircle size={14} className="text-gray-400" />
                                  {formatDateTime(alloc.discharge_date)}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Department</p>
                              <p className="font-semibold text-gray-900">{alloc.bed?.department_name || 'General'}</p>
                            </div>
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

            {/* Medical Records Tab */}
            {activeTab === 'reports-docs' && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 flex gap-6 mb-4">
                  <button 
                    onClick={() => setActiveReportTab('generated')} 
                    className={`pb-3 text-sm font-bold ${activeReportTab === 'generated' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}
                  >
                    LAB & RADIOLOGY
                  </button>
                  <button 
                    onClick={() => setActiveReportTab('uploaded')} 
                    className={`pb-3 text-sm font-bold ${activeReportTab === 'uploaded' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}
                  >
                    UPLOADED DOCUMENTS
                  </button>
                </div>

                {activeReportTab === 'generated' ? (
                  <div className="space-y-8">
                    {/* Lab Reports Section */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Microscope className="h-5 w-5 text-teal-600" />
                        Laboratory Reports
                      </h3>
                      {labOrders.length > 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Test Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Doctor</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {labOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDateTime(order.created_at)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">{order.test_catalog?.test_name || 'Unknown Test'}</div>
                                    <div className="text-xs text-gray-500">{order.test_catalog?.category}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    Dr. {order.ordering_doctor?.name || 'Unknown'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                      ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                        order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                        'bg-gray-100 text-gray-800'}`}>
                                      {order.status ? order.status.replace(/_/g, ' ').toUpperCase() : 'PENDING'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link 
                                      href={`/lab-xray/order/${order.id}`}
                                      className="text-teal-600 hover:text-teal-900 font-bold flex items-center justify-end gap-1"
                                    >
                                      View <ChevronRight size={14} />
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                          <Microscope className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No lab reports found for this patient.</p>
                        </div>
                      )}
                    </div>

                    {/* Radiology Reports Section */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Radiation className="h-5 w-5 text-cyan-600" />
                        Radiology Reports
                      </h3>
                      {radiologyOrders.length > 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Procedure</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Modality</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {radiologyOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDateTime(order.created_at)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">{order.test_catalog?.test_name || 'Unknown Scan'}</div>
                                    <div className="text-xs text-gray-500">{order.body_part || 'General'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">
                                      {order.test_catalog?.modality || 'X-RAY'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                      ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                        order.status === 'report_pending' ? 'bg-amber-100 text-amber-800' : 
                                        'bg-gray-100 text-gray-800'}`}>
                                      {order.status ? order.status.replace(/_/g, ' ').toUpperCase() : 'PENDING'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link 
                                      href={`/lab-xray/order/${order.id}`}
                                      className="text-cyan-600 hover:text-cyan-900 font-bold flex items-center justify-end gap-1"
                                    >
                                      View <ChevronRight size={14} />
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                          <Radiation className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No radiology reports found for this patient.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Upload className="text-blue-600" size={20} /> Upload Documents
                      </h4>
                      <DocumentUpload
                        patientId={patient.id}
                        uhid={patient.patient_id}
                        category="medical-report"
                        onUploadComplete={(doc) => {
                          setDocumentRefreshTrigger(prev => prev + 1);
                          // Add to temporary documents if it's a temp file
                          if (doc.id && doc.id.startsWith('temp-')) {
                            setTemporaryDocuments(prev => [...prev, doc]);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4 px-2">Recent Files</h4>
                      <EnhancedDocumentList 
                        patientId={patient.id} 
                        uhid={patient.patient_id}
                        showDelete={true} 
                        refreshTrigger={documentRefreshTrigger} 
                        temporaryFiles={temporaryDocuments}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medications Tab */}
            {activeTab === 'medications' && <MedicationHistory patientId={patient.id} />}

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
                {/* Consolidated Patient Billing Card */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 rounded-3xl shadow-lg text-white">
                  <div className="flex justify-between items-center mb-8">
                    <h4 className="text-xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        <FileText className="text-white" size={24} />
                      </div>
                      CONSOLIDATED PATIENT BILLING
                    </h4>
                    {comprehensiveBilling && (
                      <button
                        onClick={() => setShowPrintModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                      >
                        <Printer className="h-4 w-4" />
                        Print Bill
                      </button>
                    )}
                  </div>
                  
                  {(() => {
                    // 1. Registration/OP Billing
                    const regTotal = Number(patient.total_amount) || 0;
                    // Only consider it a registration bill if it's not an IP bill
                    const latestBill = patient.billing;
                    const isIpBill = latestBill?.bed_allocation_id;
                    
                    // If the latest bill is IP or doesn't match registration amount logic, we might be cautious.
                    // But for now, we use the existing pattern but fix the balance calculation.
                    const regPaid = isIpBill ? 0 : (Number(latestBill?.amount_paid) || 0);
                    
                    // Fix: Do not rely on balance_due if it's 0 but total > paid. 
                    // Always calculate balance as Total - Paid for consistency in this view.
                    const regBalance = Math.max(0, regTotal - regPaid);

                    // 2. IP Billing (from comprehensive billing)
                    const ipTotal = comprehensiveBilling?.summary.gross_total || 0;
                    const ipPaid = comprehensiveBilling?.summary.paid_total || 0;
                    const ipBalance = comprehensiveBilling?.summary.pending_amount || 0;

                    // 3. Lab & Radiology Billing (included in comprehensive billing)
                    const labTotal = comprehensiveBilling?.summary.lab_total || 0;
                    const radTotal = comprehensiveBilling?.summary.radiology_total || 0;
                    const diagTotal = labTotal + radTotal;
                    const diagPaid = 0; // Included in IP billing payments
                    const diagBalance = 0; // Included in IP billing balance

                    // Grand Totals
                    const overallFee = regTotal + ipTotal;
                    const totalPaid = regPaid + ipPaid;
                    const totalRemaining = regBalance + ipBalance;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Overall Fee</p>
                          <p className="text-4xl font-black text-white">₹{formatMoney(overallFee)}</p>
                          <div className="mt-2 text-xs text-gray-400 flex gap-2">
                             <span>Reg: ₹{formatMoney(regTotal)}</span> • 
                             <span>IP: ₹{formatMoney(ipTotal)}</span> • 
                             <span>Diag: ₹{formatMoney(diagTotal)}</span>
                          </div>
                        </div>
                        <div className="bg-green-500/20 backdrop-blur-sm p-6 rounded-2xl border border-green-500/30">
                          <p className="text-xs font-bold text-green-300 uppercase tracking-widest mb-2">Total Paid</p>
                          <p className="text-4xl font-black text-green-400">₹{formatMoney(totalPaid)}</p>
                          <div className="mt-2 text-xs text-green-300/70">
                            {overallFee > 0 ? Math.round((totalPaid / overallFee) * 100) : 0}% Settled
                          </div>
                        </div>
                        <div className="bg-orange-500/20 backdrop-blur-sm p-6 rounded-2xl border border-orange-500/30">
                          <p className="text-xs font-bold text-orange-300 uppercase tracking-widest mb-2">Remaining Balance</p>
                          <p className="text-4xl font-black text-orange-400">₹{formatMoney(totalRemaining)}</p>
                          {totalRemaining > 0 && (
                             <button className="mt-4 w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-orange-900/20">
                               Pay Now
                             </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-orange-50/30 p-8 rounded-3xl border-2 border-orange-100 border-dashed">
                  <h4 className="text-lg font-black text-orange-900 mb-6 flex items-center gap-2">
                    <FileText className="text-orange-500" /> REGISTRATION BILLING SUMMARY
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Advance Amount</p>
                      <p className="text-2xl font-black text-gray-900">₹{patient.billing?.advance_amount || '0'}</p>
                    </div>
                  </div>
                </div>
                {patient.billing && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h5 className="font-bold text-gray-900 mb-4 text-sm uppercase">Billing Details</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-gray-400 text-xs uppercase font-bold">Amount Paid</p>
                        <p className="font-bold text-gray-900">₹{patient.billing.amount_paid || '0'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase font-bold">Balance Due</p>
                        <p className="font-bold text-gray-900">₹{patient.billing.balance_due || '0'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase font-bold">Payment Status</p>
                        <p className="font-bold text-gray-900 capitalize">{patient.billing.payment_status || 'Pending'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comprehensive IP Billing Breakdown */}
                {comprehensiveBilling && (
                  <div className="bg-blue-50/30 p-8 rounded-3xl border-2 border-blue-100 border-dashed">
                    <h4 className="text-lg font-black text-blue-900 mb-6 flex items-center gap-2">
                      <FileText className="text-blue-500" /> COMPREHENSIVE IP BILLING BREAKDOWN
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Bed Charges</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.bed_charges_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Doctor Consultation</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.doctor_consultation_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Lab Tests</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.lab_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Radiology</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.radiology_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Pharmacy</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.pharmacy_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Doctor Services</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.doctor_services_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Other Charges</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.other_charges_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Other Bills</p>
                        <p className="text-2xl font-black text-gray-900">₹{comprehensiveBilling.summary.other_bills_total || '0'}</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Total Paid</p>
                        <p className="text-2xl font-black text-green-600">₹{comprehensiveBilling.summary.paid_total || '0'}</p>
                      </div>
                    </div>
                    <div className="mt-6 bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-gray-400 text-xs uppercase font-bold">Gross Total</p>
                          <p className="font-bold text-gray-900 text-xl">₹{comprehensiveBilling.summary.gross_total || '0'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs uppercase font-bold">Pending Amount</p>
                          <p className="font-bold text-orange-600 text-xl">₹{comprehensiveBilling.summary.pending_amount || '0'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs uppercase font-bold">Advance Paid</p>
                          <p className="font-bold text-blue-600 text-xl">₹{comprehensiveBilling.summary.advance_paid || '0'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Bills Details */}
                {comprehensiveBilling?.other_bills && comprehensiveBilling.other_bills.length > 0 && (
                  <div className="bg-purple-50/30 p-8 rounded-3xl border-2 border-purple-100 border-dashed">
                    <h4 className="text-lg font-black text-purple-900 mb-6 flex items-center gap-2">
                      <FileText className="text-purple-500" /> OTHER BILLS DETAILS
                    </h4>
                    <div className="space-y-4">
                      {comprehensiveBilling.other_bills.map((bill: any, index: number) => (
                        <div key={bill.id || index} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold">Bill Number</p>
                              <p className="font-bold text-gray-900">{bill.bill_number}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold">Category</p>
                              <p className="font-bold text-gray-900 capitalize">{bill.charge_category}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold">Description</p>
                              <p className="font-bold text-gray-900">{bill.charge_description}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold">Amount</p>
                              <p className="font-bold text-purple-600">₹{Number(bill.total_amount).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold">Payment Status</p>
                              <p className="font-bold text-gray-900 capitalize">{bill.payment_status}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold">Paid Amount</p>
                              <p className="font-bold text-green-600">₹{Number(bill.paid_amount || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold">Bill Date</p>
                              <p className="font-bold text-gray-900">{new Date(bill.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h5 className="font-bold text-gray-900 mb-4 text-sm uppercase flex items-center gap-2">
                    <Bed size={16} /> Legacy IP Billing Summary
                  </h5>

                  {!ipAllocation ? (
                    <div className="text-sm text-gray-600">No IP admission found for this patient.</div>
                  ) : (() => {
                      const totalCharge = Number(ipBilling?.total ?? ipAllocation?.total_charges ?? 0) || 0;
                      const paid = Number(ipBilling?.amount_paid ?? 0) || 0;
                      const pending = Number.isFinite(Number(ipBilling?.balance_due))
                        ? Number(ipBilling?.balance_due)
                        : Math.max(0, totalCharge - paid);

                    const paymentStatus = (ipBilling?.payment_status || ipAllocation?.status || 'pending');
                    const paymentType = (ipBilling?.payment_method || (ipBillingPayments.length === 1 ? ipBillingPayments[0].method : (ipBillingPayments.length > 1 ? 'split' : '—')));

                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total IP Charge</p>
                            <p className="text-2xl font-black text-gray-900">₹{formatMoney(totalCharge)}</p>
                          </div>
                          <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Paid</p>
                            <p className="text-2xl font-black text-gray-900">₹{formatMoney(paid)}</p>
                          </div>
                          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Pending</p>
                            <p className="text-2xl font-black text-gray-900">₹{formatMoney(pending)}</p>
                          </div>
                          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Payment Type</p>
                            <p className="text-xl font-black text-gray-900 uppercase">{String(paymentType || '—')}</p>
                            <p className="text-xs text-indigo-700 mt-1">Status: <span className="font-bold capitalize">{String(paymentStatus)}</span></p>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold text-gray-900">IP Admission & Bill Details</div>
                              {ipBilling?.id && (
                                <div className="text-xs text-gray-500">Bill: <span className="font-semibold">{ipBilling.bill_number || ipBilling.bill_no || ipBilling.id}</span></div>
                              )}
                            </div>
                          </div>
                          <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                              <div>
                                <p className="text-gray-400 text-xs uppercase font-bold">IP Number</p>
                                <p className="font-bold text-gray-900">{ipAllocation.ip_number || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs uppercase font-bold">Admission Date</p>
                                <p className="font-bold text-gray-900">{formatDate(ipAllocation.admission_date)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs uppercase font-bold">Ward / Bed</p>
                                <p className="font-bold text-gray-900">{ipAllocation.bed?.room_number || 'N/A'} - Bed {ipAllocation.bed?.bed_number || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                              <div>
                                <p className="text-gray-400 text-xs uppercase font-bold">Daily Charge</p>
                                <p className="font-bold text-gray-900">₹{formatMoney(ipAllocation.daily_charges ?? 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs uppercase font-bold">Allocation Total</p>
                                <p className="font-bold text-gray-900">₹{formatMoney(ipAllocation.total_charges ?? 0)}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs uppercase font-bold">Ledger Total</p>
                                <p className="font-bold text-gray-900">₹{formatMoney(ipBilling?.total ?? 0)}</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-gray-400 text-xs uppercase font-bold mb-2">Split Payments</p>
                              {ipBillingPayments.length === 0 ? (
                                <div className="text-sm text-gray-600">No split payments recorded.</div>
                              ) : (
                                <div className="space-y-2">
                                  {ipBillingPayments.map((p, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-gray-200 bg-white text-sm">
                                      <div className="col-span-3 font-bold text-gray-900 uppercase">{p.method}</div>
                                      <div className="col-span-3 text-gray-800 font-semibold">₹{formatMoney(p.amount)}</div>
                                      <div className="col-span-6 text-gray-600 truncate">{p.reference || '—'}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Lab & Radiology Billing Summary */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h5 className="font-bold text-gray-900 mb-4 text-sm uppercase flex items-center gap-2">
                    <Microscope size={16} /> Lab & Radiology Billing Summary
                  </h5>
                  
                  {labOrders.length === 0 && radiologyOrders.length === 0 ? (
                     <div className="text-sm text-gray-600">No lab or radiology orders found.</div>
                  ) : (() => {
                    const labTotal = labOrders.reduce((sum, order) => sum + (Number(order.test_catalog?.test_cost) || 0), 0);
                    const radiologyTotal = radiologyOrders.reduce((sum, order) => sum + (Number(order.test_catalog?.test_cost) || 0), 0);
                    const diagnosticTotal = labTotal + radiologyTotal;
                    
                    return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Total Lab Charges</p>
                            <p className="text-2xl font-black text-gray-900">₹{formatMoney(labTotal)}</p>
                            <p className="text-xs text-purple-700 mt-1">{labOrders.length} Orders</p>
                          </div>
                          <div className="bg-cyan-50 p-5 rounded-2xl border border-cyan-100">
                            <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-1">Total Radiology Charges</p>
                            <p className="text-2xl font-black text-gray-900">₹{formatMoney(radiologyTotal)}</p>
                            <p className="text-xs text-cyan-700 mt-1">{radiologyOrders.length} Orders</p>
                          </div>
                          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Grand Total</p>
                             <p className="text-2xl font-black text-gray-900">₹{formatMoney(diagnosticTotal)}</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                           <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                              <div className="font-bold text-gray-900">Recent Diagnostic Charges</div>
                           </div>
                           <div className="divide-y divide-gray-100">
                              {[...labOrders, ...radiologyOrders]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .slice(0, 5)
                                .map((order, idx) => (
                                  <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                     <div>
                                        <p className="font-bold text-gray-900">{order.test_catalog?.test_name || 'Unknown Test'}</p>
                                        <p className="text-xs text-gray-500">{formatDate(order.created_at)} • {order.test_catalog?.category || order.test_catalog?.modality || 'Diagnostic'}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="font-bold text-gray-900">₹{formatMoney(order.test_catalog?.test_cost || 0)}</p>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                           {order.payment_status || 'Pending'}
                                        </span>
                                     </div>
                                  </div>
                                ))
                              }
                           </div>
                        </div>
                    </div>
                    );
                  })()}
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
      {showClinicalRecordsModal && ipAllocation && (
        <ClinicalRecordsModal
          isOpen={showClinicalRecordsModal}
          onClose={() => setShowClinicalRecordsModal(false)}
          allocation={ipAllocation}
          patient={patient}
          defaultTab={clinicalRecordsSubTab}
        />
      )}
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
      
      {/* Print Modal */}
      {showPrintModal && comprehensiveBilling && (
        <>
          <PatientBillingPrint 
            billing={comprehensiveBilling} 
            patient={patient} 
          />
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" 
            onClick={() => setShowPrintModal(false)}
          />
        </>
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