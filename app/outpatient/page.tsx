'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users, Calendar, Clock, Stethoscope, Filter, Search,
  UserPlus, RefreshCw, Eye, CheckCircle, XCircle,
  AlertCircle, Phone, Hash, ArrowRight, Loader2,
  TrendingUp, Activity, User, X as CloseIcon,
  MoreVertical, Edit3, Trash2, Printer, FileText,
  Receipt, CreditCard, IndianRupee, Download
} from 'lucide-react';
import { getDashboardStats } from '../../src/lib/dashboardService';
import { getAppointments, type Appointment } from '../../src/lib/appointmentService';
import { getPatientByUHID, registerNewPatient, getAllPatients } from '../../src/lib/patientService';
import { supabase } from '../../src/lib/supabase';
import VitalsQueueCard from '../../components/VitalsQueueCard';
import { getQueueStats } from '../../src/lib/outpatientQueueService';
import { getBillingRecords, type BillingRecord } from '../../src/lib/financeService';

interface OutpatientStats {
  totalPatients: number;
  outpatientPatients: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  waitingPatients: number;
  inConsultation: number;
}

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
  status: string;
  primary_complaint: string;
  admission_type: string;
  department_ward: string;
  room_number: string;
  created_at: string;
  is_critical?: boolean;
  is_admitted?: boolean;
  // Bed allocation fields
  bed_id?: string | null;
  admission_date?: string | null;
  discharge_date?: string | null;
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
  op_card_amount?: string;
  consultation_fee?: string;
  total_amount?: string;
  payment_mode?: string;
  consulting_doctor_name?: string;
  staff?: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

function OutpatientPageContent() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<OutpatientStats>({
    totalPatients: 0,
    outpatientPatients: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    waitingPatients: 0,
    inConsultation: 0
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  // State for patient search
  const [searchedPatient, setSearchedPatient] = useState<any | null>(null);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  // Dropdown menu state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  // Tab state for queue management
  const [activeTab, setActiveTab] = useState<'queue' | 'appointments' | 'patients' | 'billing'>('queue');
  const [queueStats, setQueueStats] = useState({ totalWaiting: 0, totalInProgress: 0, totalCompleted: 0, averageWaitTime: 0 });

  // Billing state
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSearch, setBillingSearch] = useState('');
  const [billingStartDate, setBillingStartDate] = useState<string>('');
  const [billingEndDate, setBillingEndDate] = useState<string>('');
  const [billingDateFilter, setBillingDateFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showThermalModal, setShowThermalModal] = useState(false);

  // Effect to update date inputs when date filter changes
  useEffect(() => {
    if (billingDateFilter !== 'all' && !billingStartDate && !billingEndDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (billingDateFilter) {
        case 'daily':
          setBillingStartDate(today.toISOString().split('T')[0]);
          setBillingEndDate(today.toISOString().split('T')[0]);
          break;
        case 'weekly':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay()); // Sunday
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // Saturday
          setBillingStartDate(weekStart.toISOString().split('T')[0]);
          setBillingEndDate(weekEnd.toISOString().split('T')[0]);
          break;
        case 'monthly':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          setBillingStartDate(monthStart.toISOString().split('T')[0]);
          setBillingEndDate(monthEnd.toISOString().split('T')[0]);
          break;
      }
    }
  }, [billingDateFilter]);

  // Check for registration success parameter
  useEffect(() => {
    if (searchParams && searchParams.get('registration') === 'success') {
      setShowRegistrationSuccess(true);
      // Hide the notification after 5 seconds
      const timer = setTimeout(() => {
        setShowRegistrationSuccess(false);
        // Remove the parameter from URL without reloading
        window.history.replaceState({}, document.title, '/outpatient');
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Check for tab parameter
    const tab = searchParams?.get('tab');
    if (tab === 'queue' || tab === 'appointments' || tab === 'patients' || tab === 'billing') {
      setActiveTab(tab);
    }

    // Check for vitals completed notification
    if (searchParams?.get('vitals') === 'completed') {
      setShowRegistrationSuccess(true);
      setTimeout(() => {
        setShowRegistrationSuccess(false);
        window.history.replaceState({}, document.title, '/outpatient');
      }, 5000);
    }
  }, [searchParams]);
  useEffect(() => {
    loadOutpatientData();
    loadQueueStats();

    // Auto-refresh every 30 seconds
    const intervalMs = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    if (intervalMs > 0) {
      interval = setInterval(() => {
        loadOutpatientData();
        loadQueueStats();
      }, intervalMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, statusFilter]);


  const loadQueueStats = async () => {
    try {
      const result = await getQueueStats(selectedDate);
      if (result.success && result.stats) {
        setQueueStats(result.stats);
      }
    } catch (err) {
      console.error('Error loading queue stats:', err);
    }
  };

  const loadBillingRecords = async () => {
    try {
      setBillingLoading(true);
      
      // Calculate date range based on filter
      let startDate = billingStartDate;
      let endDate = billingEndDate;
      
      if (billingDateFilter !== 'all' && !startDate && !endDate) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (billingDateFilter) {
          case 'daily':
            startDate = today.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay()); // Sunday
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Saturday
            startDate = weekStart.toISOString().split('T')[0];
            endDate = weekEnd.toISOString().split('T')[0];
            break;
          case 'monthly':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            startDate = monthStart.toISOString().split('T')[0];
            endDate = monthEnd.toISOString().split('T')[0];
            break;
        }
      }
      
      const result = await getBillingRecords(50, 0, {
        search: billingSearch,
        dateFrom: startDate,
        dateTo: endDate
      });
      
      // Filter for outpatient records only
      const outpatientRecords = result.records.filter(record => record.source === 'outpatient');
      
      setBillingRecords(outpatientRecords);
    } catch (error) {
      console.error('Error loading billing records:', error);
    } finally {
      setBillingLoading(false);
    }
  };

  // Load billing records when billing tab is active or search/date changes
  useEffect(() => {
    if (activeTab === 'billing') {
      loadBillingRecords();
    }
  }, [activeTab, billingSearch, billingStartDate, billingEndDate, billingDateFilter]);

  // Handle manual date input changes - reset the date filter to 'all'
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillingStartDate(e.target.value);
    if (billingDateFilter !== 'all') {
      setBillingDateFilter('all');
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillingEndDate(e.target.value);
    if (billingDateFilter !== 'all') {
      setBillingDateFilter('all');
    }
  };

  const loadOutpatientData = async () => {
    try {
      setLoading(true);

      // Get general dashboard stats
      const dashboardStats = await getDashboardStats();

      // Get patients - fetch a larger batch to filter
      const response = await getAllPatients({
        page: 1,
        limit: 100,
        status: statusFilter === '' ? undefined : statusFilter,
        searchTerm: searchTerm || undefined
      });

      // GET TODAY'S APPOINTMENTS FOR THE QUEUE
      const appointmentsResponse = await getAppointments({
        date: selectedDate,
        status: statusFilter === 'all' || statusFilter === '' ? undefined : statusFilter,
        limit: 100
      });

      // Filter for outpatient patients only 
      // A patient is an outpatient if they are NOT admitted AND (admission_type is 'outpatient' OR null)
      const outpatientPatients = response.patients.filter((p: any) =>
        !p.is_admitted && (!p.admission_type || p.admission_type === 'outpatient')
      );

      // Filter appointments to only show those for outpatients
      const outpatientAppointments = appointmentsResponse.appointments.filter((apt: any) => {
        const patientIsAdmitted = apt.patient?.is_admitted;
        const patientAdmissionType = apt.patient?.admission_type;
        return !patientIsAdmitted && (!patientAdmissionType || patientAdmissionType === 'outpatient');
      });

      setAppointments(outpatientAppointments);

      setStats({
        totalPatients: dashboardStats.totalPatients,
        outpatientPatients: outpatientPatients.length,
        todayAppointments: outpatientAppointments.length,
        upcomingAppointments: dashboardStats.upcomingAppointments,
        completedAppointments: outpatientAppointments.filter(a => a.status === 'completed').length,
        waitingPatients: outpatientAppointments.filter(a => a.status === 'scheduled').length,
        inConsultation: outpatientAppointments.filter(a => a.status === 'in_progress').length
      });

      setPatients(outpatientPatients);
      setError(null);
    } catch (err) {
      console.error('Error loading outpatient data:', err);
      setError('Failed to load outpatient data. Please try again.');
    } finally {
      setLoading(false);
    }
  };



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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'in_progress': return <Activity className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const calculateAge = (dateOfBirth: string) => {
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

  const handlePatientSearch = async (patientId: string) => {
    if (!patientId.trim()) {
      setSearchedPatient(null);
      setPatientSearchError(null);
      return;
    }

    setPatientSearchLoading(true);
    setPatientSearchError(null);

    try {
      const patientData = await getPatientByUHID(patientId);

      // Check if patient is an inpatient
      const isAdmitted = patientData.is_admitted;
      const isAdminType = patientData.admission_type && patientData.admission_type !== 'outpatient';

      if (isAdmitted || isAdminType) {
        setPatientSearchError('Patient found but is currently an Inpatient. Please check the Inpatient department.');
        setSearchedPatient(null);
      } else {
        setSearchedPatient(patientData);
      }
    } catch (err) {
      console.error('Error searching patient:', err);
      setPatientSearchError('Patient not found. Please check the Patient ID.');
      setSearchedPatient(null);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  // Handle search term changes
  useEffect(() => {
    // If search term looks like a patient ID (starts with AH and has dash), search for patient
    if (searchTerm && searchTerm.match(/^AH\d{4}-\d{4}$/)) {
      handlePatientSearch(searchTerm);
    } else if (searchTerm && searchTerm.trim() !== '') {
      // For other search terms, we'll filter appointments as before
      setSearchedPatient(null);
    } else {
      setSearchedPatient(null);
      setPatientSearchError(null);
    }
  }, [searchTerm]);

  const filteredAppointments = appointments.filter(apt => {
    if (!searchTerm) return true;
    const patientName = apt.patient?.name?.toLowerCase() || '';
    const doctorName = apt.doctor?.user?.name?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase()) ||
      doctorName.includes(searchTerm.toLowerCase());
  });

  const handlePrintBill = (patient: any) => {
    // Format the current date and time
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const dateTime = `${formattedDate} ${formattedTime}`;

    // Create a new window with bill details
    const billWindow = window.open('', '_blank', 'width=77mm,height=297mm');
    if (billWindow) {
      billWindow.document.write(`
        <html>
        <head>
          <title>Bill - ${patient.name}</title>
          <style>
            @page { 
              margin: 5mm; 
              size: 77mm 297mm; 
            }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              margin: 0; 
              padding: 10px;
              font-size: 14px;
              line-height: 1.2;
              width: 77mm;
            }
            .header-14cm { 
              font-size: 16pt; 
              font-weight: bold; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .header-9cm { 
              font-size:11pt; 
              font-weight: bold; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .header-10cm { 
              font-size: 12pt; 
              font-weight: bold; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .header-8cm { 
              font-size: 10pt; 
              font-weight: bold; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .items-8cm { 
              font-size: 10pt; 
              font-weight: bold; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .bill-info-10cm { 
              font-size: 12pt; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .bill-info-bold { 
              font-weight: bold; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .footer-7cm { 
              font-size: 9pt; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .center { 
              text-align: center; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .right { 
              text-align: right; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .table { 
              width: 100%; 
              border-collapse: collapse; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .table td { 
              padding: 2px; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .totals-line { 
              display: flex; 
              justify-content: space-between; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .footer { 
              margin-top: 15px; 
              font-family: 'Times New Roman', Times, serif; 
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <!-- Header Section -->
          <div class="center">
            <div class="header-14cm">ANNAM HOSPITAL</div>
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div class="header-10cm">Gst No: 33AJWPR2713G2ZZ</div>
            <div style="margin-top: 5px; font-weight: bold;">OUTPATIENT BILL</div>
          </div>
          
          <!-- Bill Information Section -->
          <div style="margin-top: 10px;">
            <table class="table">
              <tbody>
                <tr>
                  <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${patient.bill_id || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${patient.patient_id}</td>
                </tr>
                <tr>
                  <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${patient.name}</td>
                </tr>
                <tr>
                  <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${dateTime}</td>
                </tr>
                <tr>
                  <td class="header-10cm">Payment Mode&nbsp;:&nbsp;&nbsp;</td>
                  <td class="header-10cm bill-info-bold">${(patient.payment_mode || 'CASH').toUpperCase()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Items Table Section -->
          <div style="margin-top: 10px;">
            <table class="table">
              <thead>
                <tr style="border-bottom: 1px dashed #000;">
                  <td width="30%" class="items-8cm">S.No</td>
                  <td width="40%" class="items-8cm">Description</td>
                  <td width="15%" class="items-8cm text-center">Qty</td>
                  <td width="15%" class="items-8cm text-right">Amt</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="items-8cm">1.</td>
                  <td class="items-8cm">Consultation Fee</td>
                  <td class="items-8cm text-center">1</td>
                  <td class="items-8cm text-right">${patient.consultation_fee || patient.total_amount || '0'}</td>
                </tr>
                ${patient.op_card_amount ? `
                <tr>
                  <td class="items-8cm">2.</td>
                  <td class="items-8cm">OP Card</td>
                  <td class="items-8cm text-center">1</td>
                  <td class="items-8cm text-right">${patient.op_card_amount}</td>
                </tr>` : ''}
              </tbody>
            </table>
          </div>

          <!-- Totals Section -->
          <div style="margin-top: 10px;">
            <div class="totals-line items-8cm">
              <span>Taxable Amount</span>
              <span>${patient.total_amount || '0.00'}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
              <span>${patient.discount_amount || '0.00'}</span>
            </div>
            <div class="totals-line items-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
              <span>0.00</span>
            </div>
            <div class="totals-line header-8cm">
              <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
              <span>0.00</span>
            </div>
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${patient.total_amount || '0.00'}</span>
            </div>
          </div>

          <!-- Footer Section -->
          <div class="footer">
            <div class="totals-line footer-7cm">
              <span>Printed on ${dateTime}</span>
              <span>Cashier Sign</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      billWindow.document.close();
    }
  };

  const handleBillUHID = (patient: any) => {
    // Copy UHID to clipboard
    const uhid = patient.patient_id;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(uhid).then(() => {
        // Show success message
        alert(`UHID ${uhid} copied to clipboard!`);
      }).catch(err => {
        console.error('Failed to copy UHID:', err);
        // Fallback: select text
        const textArea = document.createElement('textarea');
        textArea.value = uhid;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert(`UHID ${uhid} copied to clipboard!`);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outpatient (OP) Management</h1>
          <p className="text-gray-600 mt-2">Manage outpatient appointments and patient visits</p>
        </div>
        <div className="flex gap-3">
          <Link href="/outpatient/quick-register">
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
              <UserPlus className="h-4 w-4" />
              Quick Register
            </button>
          </Link>
          <Link href="/outpatient/create-outpatient">
            <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <UserPlus className="h-4 w-4" />
              Full Registration
            </button>
          </Link>
        </div>
      </div>

      {/* Registration Success Notification */}
      {showRegistrationSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Registration Successful</h3>
              <p className="text-sm text-green-700">New patient has been registered and added to today's queue.</p>
            </div>
            <button
              onClick={() => setShowRegistrationSuccess(false)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Outpatients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total OP</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.outpatientPatients}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-green-600">All time</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">Appointments</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Waiting for Vitals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('queue')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Waiting Vitals</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{queueStats.totalWaiting}</p>
              <p className="text-xs text-gray-500 mt-1">Pending entry</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* In Consultation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">In Consult</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.inConsultation}</p>
              <p className="text-xs text-gray-500 mt-1">With doctor</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Stethoscope className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedAppointments}</p>
              <p className="text-xs text-gray-500 mt-1">Done today</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Quick Actions:</span>

          <Link href="/appointments">
            <button className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
              Book Appointment
            </button>
          </Link>
          <Link href="/inpatient">
            <button className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center gap-1">
              Convert to IP <ArrowRight className="h-3 w-3" />
            </button>
          </Link>
          <Link href="/outpatient/patient-display">
            <button className="text-sm bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              View All Patients
            </button>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'queue'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Clock className="h-4 w-4" />
              Waiting for Vitals ({queueStats.totalWaiting})
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'appointments'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Calendar className="h-4 w-4" />
              Today's Queue
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'patients'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Users className="h-4 w-4" />
              Recent Patients
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'billing'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Receipt className="h-4 w-4" />
              OP Billing
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'queue' && (
            <VitalsQueueCard
              selectedDate={selectedDate}
              onRefresh={() => {
                loadOutpatientData();
                loadQueueStats();
              }}
            />
          )}

          {activeTab === 'appointments' && (
            <div>
              {/* Existing appointments section will go here */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Today's Appointment Queue</h3>
                <div className="flex gap-3">
                  <div className="flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <Calendar size={14} className="mr-2 text-gray-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent focus:outline-none"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Waiting</option>
                    <option value="in_progress">In Consultation</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              {/* Appointments list will be rendered below */}
            </div>
          )}

          {activeTab === 'patients' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Registered Outpatients</h3>
              {/* Patients list will be rendered below */}
            </div>
          )}
        </div>
      </div>

      {/* Patient Search Result */}
      {patientSearchLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
            <span>Searching for patient...</span>
          </div>
        </div>
      )}

      {patientSearchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Patient Not Found</h3>
              <p className="text-sm text-red-700">{patientSearchError}</p>
            </div>
          </div>
        </div>
      )}

      {searchedPatient && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Patient Information</h2>
            <Link href={`/patients/${searchedPatient.id}`}>
              <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Eye size={14} />
                View Full Record
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {searchedPatient.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{searchedPatient.name || 'Unknown Patient'}</h3>
                <p className="text-sm text-gray-600">{searchedPatient.patient_id}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Phone size={14} className="mr-2" />
                <span>{searchedPatient.phone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <User size={14} className="mr-2" />
                <span className="capitalize">{searchedPatient.gender || 'Not specified'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Hash size={14} className="mr-2" />
                <span>Blood Group: {searchedPatient.blood_group || 'Not specified'}</span>
              </div>
              {searchedPatient.allergies && (
                <div className="flex items-center text-sm text-red-600">
                  <AlertCircle size={14} className="mr-2" />
                  <span>Allergies: {searchedPatient.allergies}</span>
                </div>
              )}
            </div>
          </div>

          {searchedPatient.primary_complaint && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                <span className="font-medium">Primary Complaint:</span> {searchedPatient.primary_complaint}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Render appointments in the tab if appointments tab is active */}
      {activeTab === 'appointments' && filteredAppointments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
          <div className="divide-y divide-gray-100">
            {filteredAppointments.map((appointment, index) => {
              const patientName = appointment.patient?.name || 'Unknown Patient';
              const doctorName = appointment.doctor?.user?.name ||
                appointment.patient?.consulting_doctor_name ||
                'Unknown Doctor';

              return (
                <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{patientName}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                            {getStatusIcon(appointment.status)}
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {appointment.appointment_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope size={12} />
                            Dr. {doctorName}
                          </span>
                          {appointment.chief_complaint && (
                            <span className="text-gray-500">• {appointment.chief_complaint}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/patients/${appointment.patient_id}`}>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Patient">
                          <Eye size={18} />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Render patients in the tab if patients tab is active */}
      {activeTab === 'patients' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          {patients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.slice(0, 6).map((patient) => (
                <div
                  key={patient.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{patient.name}</h3>
                      <p className="text-gray-500 text-sm font-mono">{patient.patient_id}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Outpatient
                    </span>
                  </div>

                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">
                        Age: {patient.age || calculateAge(patient.date_of_birth)} | {patient.gender}
                      </span>
                    </div>

                    {patient.consulting_doctor_name && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-purple-500" />
                        <span className="text-purple-700 font-medium">Dr. {patient.consulting_doctor_name}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {patient.bmi && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-100 text-[10px] font-bold">
                          BMI: {patient.bmi}
                        </span>
                      )}
                      {patient.bp_systolic && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 text-[10px] font-bold">
                          BP: {patient.bp_systolic}/{patient.bp_diastolic}
                        </span>
                      )}
                    </div>

                    {patient.diagnosis && (
                      <div className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                        <span className="text-xs line-clamp-2" title={patient.diagnosis}>
                          {patient.diagnosis}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center justify-center gap-1 w-full py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      View Patient Case File
                      <ArrowRight size={12} />
                    </Link>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handlePrintBill(patient)}
                        className="flex-1 text-green-600 hover:text-green-800 text-xs font-bold flex items-center justify-center gap-1 py-1.5 rounded bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        <Printer size={12} />
                        Print Bill
                      </button>
                      <button
                        onClick={() => handleBillUHID(patient)}
                        className="flex-1 text-purple-600 hover:text-purple-800 text-xs font-bold flex items-center justify-center gap-1 py-1.5 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                      >
                        <FileText size={12} />
                        Bill UHID
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No recent outpatients found</p>
            </div>
          )}
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          {/* Billing Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Outpatient Billing</h3>
              <p className="text-sm text-gray-600">Manage OP consultation bills and payments</p>
            </div>
            <button
              onClick={() => loadBillingRecords()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search bills by patient name, bill ID..."
                value={billingSearch}
                onChange={(e) => setBillingSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={billingDateFilter}
                onChange={(e) => setBillingDateFilter(e.target.value as 'all' | 'daily' | 'weekly' | 'monthly')}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              >
                <option value="all">All Time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <input
                type="date"
                value={billingStartDate}
                onChange={handleStartDateChange}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                placeholder="From Date"
              />
              <input
                type="date"
                value={billingEndDate}
                onChange={handleEndDateChange}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Billing Records */}
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading billing records...</span>
            </div>
          ) : billingRecords.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.bill_id}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{record.patient?.name || 'Unknown Patient'}</div>
                            <div className="text-gray-500">{record.patient?.patient_id || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.bill_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <IndianRupee size={14} className="text-gray-500" />
                            <span className="font-medium">{record.total_amount.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : record.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {record.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedBill(record);
                                setShowThermalModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                              title="Thermal Print"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBill(record);
                                setShowPaymentModal(true);
                              }}
                              className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                              title="Process Payment"
                            >
                              <CreditCard size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBill(record);
                                // View details
                              }}
                              className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No billing records found</p>
            </div>
          )}
        </div>
      )}

      {/* Outpatient Display Section - HIDDEN, replaced by tabs */}
      <div className="hidden bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Outpatient Overview</h2>
            <p className="text-sm text-gray-600">Recently registered outpatients</p>
          </div>
          <Link href="/outpatient/patient-display">
            <button className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              View All Patients
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>

        {patients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.slice(0, 3).map((patient) => (
              <div
                key={patient.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{patient.name}</h3>
                    <p className="text-gray-500 text-sm font-mono">{patient.patient_id}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Outpatient
                  </span>
                </div>

                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">
                      Age: {patient.age || calculateAge(patient.date_of_birth)} | {patient.gender}
                    </span>
                  </div>

                  {patient.consulting_doctor_name && (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-purple-500" />
                      <span className="text-purple-700 font-medium">Dr. {patient.consulting_doctor_name}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    {patient.bmi && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-100 text-[10px] font-bold">
                        BMI: {patient.bmi}
                      </span>
                    )}
                    {patient.bp_systolic && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 text-[10px] font-bold">
                        BP: {patient.bp_systolic}/{patient.bp_diastolic}
                      </span>
                    )}
                    {patient.temperature && (
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100 text-[10px] font-bold">
                        Temp: {patient.temperature}°{patient.temp_unit === 'celsius' ? 'C' : 'F'}
                      </span>
                    )}
                  </div>

                  {patient.diagnosis && (
                    <div className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                      <span className="text-xs line-clamp-2" title={patient.diagnosis}>
                        {patient.diagnosis}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-[11px]">{patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    {patient.total_amount && (
                      <div className="text-green-600 font-bold">
                        ₹{patient.total_amount}
                      </div>
                    )}
                  </div>

                  {patient.staff && (
                    <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 italic">
                      <User size={10} className="text-blue-500" />
                      <span>Registered By: {patient.staff.first_name} {patient.staff.last_name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href={`/patients/${patient.id}`}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center justify-center gap-1 w-full py-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    View Patient Case File
                    <ArrowRight size={12} />
                  </Link>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handlePrintBill(patient)}
                      className="flex-1 text-green-600 hover:text-green-800 text-xs font-bold flex items-center justify-center gap-1 py-1.5 rounded bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <Printer size={12} />
                      Print Bill
                    </button>
                    <button
                      onClick={() => handleBillUHID(patient)}
                      className="flex-1 text-purple-600 hover:text-purple-800 text-xs font-bold flex items-center justify-center gap-1 py-1.5 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <FileText size={12} />
                      Bill UHID
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No recent outpatients found</p>
          </div>
        )
        }
      </div >

      {/* Appointments Section */}
      < div className="bg-white rounded-xl shadow-sm border border-gray-100" >
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Today's OP Queue</h2>
              <p className="text-sm text-gray-600">Manage outpatient visits for {new Date(selectedDate).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <Calendar size={14} className="mr-2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent focus:outline-none"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by Patient ID, Name, Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Waiting</option>
                <option value="in_progress">In Consultation</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600 mb-6">There are no outpatient appointments matching your criteria.</p>
              {/* <Link href="/patients/enhanced-register">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                  Register New Patient
                </button>
              </Link> */}
            </div>
          ) : (
            filteredAppointments.map((appointment, index) => {
              const patientName = appointment.patient?.name || 'Unknown Patient';
              const doctorName = appointment.doctor?.user?.name ||
                appointment.patient?.consulting_doctor_name ||
                'Unknown Doctor';
              const patientInitials = patientName.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase();

              return (
                <div key={appointment.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Token Number */}
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{index + 1}</span>
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{patientName}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                            {getStatusIcon(appointment.status)}
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {appointment.appointment_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope size={12} />
                            Dr. {doctorName}
                          </span>
                          {appointment.chief_complaint && (
                            <span className="text-gray-500">
                              • {appointment.chief_complaint}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link href={`/patients/${appointment.patient_id}`}>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Patient">
                          <Eye size={18} />
                        </button>
                      </Link>
                      {appointment.status === 'scheduled' && (
                        <Link href="/inpatient">
                          <button className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                            Admit to IP
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div >

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
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

      {/* Thermal Print Modal */}
      {showThermalModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Thermal Print Preview</h3>
              <button
                onClick={() => setShowThermalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon size={24} />
              </button>
            </div>

            <div className="bg-white p-4 border border-gray-200 rounded font-mono text-sm">
              {/* Thermal Print Content - Following exact format from guide */}
              <div className="text-center mb-4">
                <div className="header-14cm" style={{ fontSize: '16pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>ANNAM HOSPITAL</div>
                <div style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: 'bold' }}>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
                <div className="header-9cm" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Phone- 04639 252592</div>
                <div className="header-10cm" style={{ fontSize: '14pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Gst No: 33AJWPR2713G2ZZ</div>
                <div style={{ marginTop: '8px', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', fontSize: '14pt' }}>INVOICE</div>
              </div>

              {/* Bill Information Section */}
              <div style={{ margin: '5px 0', fontFamily: 'Times New Roman, Times, serif', fontWeight: 'bold' }}>
                <div style={{ fontSize: '12pt', margin: '3px 0', whiteSpace: 'pre' }}>Bill No  :   {selectedBill.bill_id}</div>
                <div style={{ fontSize: '12pt', margin: '3px 0', whiteSpace: 'pre' }}>UHID         :   {selectedBill.patient?.patient_id || 'N/A'}</div>
                <div style={{ fontSize: '12pt', margin: '3px 0', whiteSpace: 'pre' }}>Patient Name :   {selectedBill.patient?.name || 'Unknown Patient'}</div>
                <div style={{ fontSize: '12pt', margin: '3px 0', whiteSpace: 'pre' }}>Date           :   {new Date(selectedBill.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(selectedBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                <div style={{ fontSize: '12pt', margin: '3px 0', whiteSpace: 'pre' }}>Sales Type :   {(selectedBill.payment_method || 'CASH').toUpperCase()}</div>
              </div>

              {/* Items Table Section */}
              <div style={{ marginTop: '10px' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Times New Roman, Times, serif', fontWeight: 'bold' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px dashed #000' }}>
                      <td width="15%" className="items-8cm" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>S.No</td>
                      <td width="55%" className="items-8cm" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Service</td>
                      <td width="15%" className="items-8cm text-center" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'center' }}>Qty</td>
                      <td width="15%" className="items-8cm text-right" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'right' }}>Amount</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="items-8cm" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>1.</td>
                      <td className="items-8cm" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>Consultation Fee</td>
                      <td className="items-8cm text-center" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'center' }}>1</td>
                      <td className="items-8cm text-right" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'right' }}>{selectedBill.total_amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div style={{ marginTop: '10px' }}>
                <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>Subtotal</span>
                  <span>{selectedBill.total_amount.toFixed(2)}</span>
                </div>
                {selectedBill.discount_amount > 0 && (
                  <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                    <span>Discount</span>
                    <span>-{selectedBill.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>GST (0%)</span>
                  <span>0.00</span>
                </div>
                <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', borderTop: '1px solid #000', padding: '4px 0 0 0' }}>
                  <span>Total Amount</span>
                  <span>{(selectedBill.total_amount - (selectedBill.discount_amount || 0)).toFixed(2)}</span>
                </div>
              </div>

              {/* Footer Section */}
              <div className="footer" style={{ marginTop: '20px', fontFamily: 'Times New Roman, Times, serif', fontWeight: 'bold' }}>
                <div className="totals-line footer-7cm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', fontFamily: 'Times New Roman, Times, serif', fontWeight: 'bold' }}>
                  <span>Printed on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                  <span>Authorized Sign</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowThermalModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Print functionality using exact thermal format
                  const now = new Date();
                  const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                  const thermalContent = `
                    <html>
                    <head>
                      <title>Thermal Receipt - ${selectedBill.bill_id}</title>
                      <style>
                      @page { 
                        margin: 2mm; 
                        size: 77mm 297mm; 
                      }
                      body { 
                        font-family: 'Times New Roman', Times, serif; 
                        margin: 0; 
                        padding: 5px;
                        font-size: 14px;
                        font-weight: bold;
                        line-height: 1.2;
                        width: 77mm;
                      }
                      .header-14cm { 
                        font-size: 16pt; 
                        font-weight: bold; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .header-9cm { 
                        font-size: 12pt; 
                        font-weight: bold; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .header-10cm { 
                        font-size: 14pt; 
                        font-weight: bold; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .header-8cm { 
                        font-size: 12pt; 
                        font-weight: bold; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .items-8cm { 
                        font-size: 12pt; 
                        font-weight: bold; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .bill-info-10cm { 
                        font-size: 12pt; 
                        font-weight: bold; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .bill-info-bold { 
                        font-weight: bold; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .footer-7cm { 
                        font-size: 10pt; 
                        font-weight: bold;
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .center { 
                        text-align: center; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .right { 
                        text-align: right; 
                        font-family: 'Times New Roman', Times, serif; 
                      }
                      .table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-family: 'Times New Roman', Times, serif; 
                        margin: 5px 0;
                      }
                      .table td { 
                        padding: 3px 2px; 
                        font-family: 'Times New Roman', Times, serif; 
                        font-weight: bold;
                      }
                      .totals-line { 
                        display: flex; 
                        justify-content: space-between; 
                        font-family: 'Times New Roman', Times, serif; 
                        margin: 3px 0;
                        font-weight: bold;
                      }
                      .footer { 
                        margin-top: 10px; 
                        font-family: 'Times New Roman', Times, serif; 
                        font-weight: bold;
                      }
                      </style>
                    </head>
                    <body>
                      <!-- Header Section -->
                      <div class="center">
                        <div class="header-14cm">ANNAM HOSPITAL</div>
                        <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
                        <div class="header-9cm">Phone- 04639 252592</div>
                        <div class="header-10cm">Gst No: 33AJWPR2713G2ZZ</div>
                        <div style="margin: 5px 0; font-weight: bold;">INVOICE</div>
                      </div>

                      <!-- Bill Information Section -->
                      <div style="margin: 5px 0; font-family: 'Times New Roman', Times, serif; font-weight: bold;">
                        <div style="font-size: 12pt; white-space: pre;">Bill No  :   ${selectedBill.bill_id}</div>
                        <div style="font-size: 12pt; white-space: pre;">UHID         :   ${selectedBill.patient?.patient_id || 'N/A'}</div>
                        <div style="font-size: 12pt; white-space: pre;">Patient Name :   ${selectedBill.patient?.name || 'Unknown Patient'}</div>
                        <div style="font-size: 12pt; white-space: pre;">Date           :   ${new Date(selectedBill.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(selectedBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                        <div style="font-size: 12pt; white-space: pre;">Sales Type :   ${(selectedBill.payment_method || 'CASH').toUpperCase()}</div>
                      </div>

                      <!-- Items Table Section -->
                      </div>

                      <!-- Items Table Section -->
                      <div style="margin: 5px 0;">
                        <table class="table" style="width: 100%; border-collapse: collapse; margin-bottom: 10px; border: none;">
                          <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                              <td width="30%" class="items-8cm">S.No</td>
                              <td width="40%" class="items-8cm">Service</td>
                              <td width="15%" class="items-8cm text-center">Qty</td>
                              <td width="15%" class="items-8cm text-right">Amt</td>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td class="items-8cm">1.</td>
                              <td class="items-8cm">Consultation Fee</td>
                              <td class="items-8cm text-center">1</td>
                              <td class="items-8cm text-right">${selectedBill.total_amount.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <!-- Totals Section -->
                      <div style="margin: 5px 0;">
                        <div class="totals-line items-8cm">
                          <span>Taxable Amount</span>
                          <span>${selectedBill.total_amount.toFixed(2)}</span>
                        </div>
                        <div class="totals-line items-8cm">
                          <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
                          <span>${selectedBill.discount_amount.toFixed(2)}</span>
                        </div>
                        <div class="totals-line items-8cm">
                          <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
                          <span>0.00</span>
                        </div>
                        <div class="totals-line header-8cm">
                          <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
                          <span>0.00</span>
                        </div>
                        <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
                          <span>Total Amount</span>
                          <span>${selectedBill.total_amount.toFixed(2)}</span>
                        </div>
                      </div>

                      <!-- Footer Section -->
                      <div class="footer">
                        <div style="text-align: center; margin-top: 20px; font-size: 10pt;">
                          <div style="border-top: 1px dashed #000; width: 60%; margin: 0 auto; padding-top: 5px;">
                            Authorized Sign
                          </div>
                        </div>
                      </div>

                      <script>
                        window.onload = function() {
                          window.print();
                        }
                      </script>
                    </body>
                    </html>
                  `;

                  const printWindow = window.open('', '_blank', 'width=400,height=600');
                  if (printWindow) {
                    printWindow.document.write(thermalContent);
                    printWindow.document.close();
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Printer size={16} className="inline mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Process Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Bill Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Bill ID:</span>
                    <span className="font-medium">{selectedBill.bill_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Patient:</span>
                    <span className="font-medium">{selectedBill.patient?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">₹{selectedBill.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedBill.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : selectedBill.payment_status === 'partial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {selectedBill.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Credit</option>
                  <option value="others">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    placeholder="0.00"
                    className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    defaultValue={selectedBill.total_amount}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Process payment logic here
                    alert('Payment processed successfully!');
                    setShowPaymentModal(false);
                    loadBillingRecords(); // Refresh records
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <CreditCard size={16} className="inline mr-2" />
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div >
  );
}

export default function OutpatientPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-blue-500" />Loading...</div>}>
      <OutpatientPageContent />
    </Suspense>
  );
}
