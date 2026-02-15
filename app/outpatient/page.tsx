'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Users, Calendar, Clock, Stethoscope, Filter, Search,
  UserPlus, RefreshCw, Eye, CheckCircle, XCircle,
  AlertCircle, Phone, Hash, ArrowRight, Loader2,
  TrendingUp, Activity, User, X as CloseIcon,
  MoreVertical, Edit3, Trash2, Printer, FileText,
  Receipt, CreditCard, IndianRupee, Download, Syringe,
  MapPin
} from 'lucide-react';
import { getDashboardStats } from '../../src/lib/dashboardService';
import { getAppointments, getRecentPatients, type Appointment } from '../../src/lib/appointmentService';
import { getPatientByUHID, registerNewPatient, getAllPatients } from '../../src/lib/patientService';
import { supabase } from '../../src/lib/supabase';
import VitalsQueueCard from '../../components/VitalsQueueCard';
import { getQueueEntries, getQueueStats, type QueueEntry } from '../../src/lib/outpatientQueueService';
import { getBillingRecords, type BillingRecord } from '../../src/lib/financeService';
import StaffSelect from '../../src/components/StaffSelect';

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
  const router = useRouter();
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
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
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
  const [activeTab, setActiveTab] = useState<'outpatient' | 'queue' | 'injection' | 'appointments' | 'patients' | 'recent' | 'billing'>('outpatient');
  const [queueStats, setQueueStats] = useState({ totalWaiting: 0, totalInProgress: 0, totalCompleted: 0, averageWaitTime: 0 });
  
  // Injection queue state
  const [injectionQueue, setInjectionQueue] = useState<any[]>([]);
  const [updatedInjections, setUpdatedInjections] = useState<any[]>([]);
  const [injectionLoading, setInjectionLoading] = useState(false);
  
  // Outpatient queue state for Today's Queue tab
  const [outpatientQueueEntries, setOutpatientQueueEntries] = useState<QueueEntry[]>([]);
  const [queueEntriesLoading, setQueueEntriesLoading] = useState(false);

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

  // Additional state for patient listing
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [placeFilter, setPlaceFilter] = useState('');

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
    if (tab === 'outpatient' || tab === 'queue' || tab === 'injection' || tab === 'appointments' || tab === 'patients' || tab === 'recent' || tab === 'billing') {
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
    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables:', {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });
      return;
    }

    loadOutpatientData();
    loadQueueStats();
    loadInjectionQueue();
    loadUpdatedInjections();
    loadOutpatientQueueEntries();
    loadRecentPatients();

    // Auto-refresh every 30 seconds
    const intervalMs = 0;
    let interval: NodeJS.Timeout;
    
    if (intervalMs > 0) {
      interval = setInterval(() => {
        loadOutpatientData();
        loadQueueStats();
        loadInjectionQueue();
        loadUpdatedInjections();
      }, intervalMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, statusFilter, currentPage, searchTerm, startDate, endDate, placeFilter]);


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

  const loadUpdatedInjections = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch prescriptions with injection medications that have been updated (dispensed or expired)
      const { data: updatedPrescriptions, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_id,
          patient_id,
          issue_date,
          created_at,
          status,
          edited_by_name,
          updated_at,
          patient:patients(id, patient_id, name, date_of_birth, gender, phone),
          prescription_items(
            id,
            medication_id,
            dosage,
            frequency,
            duration,
            quantity,
            dispensed_quantity,
            medication:medications(id, name, dosage_form)
          )
        `)
        .in('status', ['dispensed', 'expired'])
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) {
        console.error('Error fetching updated injections:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setUpdatedInjections([]);
        return;
      }

      // Filter prescriptions that have injection medications
      const updatedInjectionPrescriptions = (updatedPrescriptions || []).filter((prescription: any) => {
        const items = prescription.prescription_items || [];
        return items.some((item: any) => {
          const dosageForm = item.medication?.dosage_form?.toLowerCase() || '';
          return dosageForm.includes('injection') || 
                 dosageForm.includes('inject') || 
                 dosageForm.includes('iv') || 
                 dosageForm.includes('im') || 
                 dosageForm.includes('sc') || 
                 dosageForm.includes('vial') || 
                 dosageForm.includes('ampoule');
        });
      });

      // Format data for display and map database status back to UI status
      const formattedUpdatedInjections = updatedInjectionPrescriptions.map((prescription: any) => {
        const patient = prescription.patient;
        const items = prescription.prescription_items || [];
        const injectionItems = items.filter((item: any) => {
          const dosageForm = item.medication?.dosage_form?.toLowerCase() || '';
          return dosageForm.includes('injection') || 
                 dosageForm.includes('inject') || 
                 dosageForm.includes('iv') || 
                 dosageForm.includes('im') || 
                 dosageForm.includes('sc') || 
                 dosageForm.includes('vial') || 
                 dosageForm.includes('ampoule');
        });

        // Map database status back to UI status
        let uiStatus = 'pending';
        if (prescription.status === 'dispensed') uiStatus = 'completed';
        else if (prescription.status === 'expired') uiStatus = 'cancelled';
        else if (prescription.status === 'active') uiStatus = 'pending';

        return {
          id: prescription.id,
          prescription_id: prescription.prescription_id,
          patient: patient,
          injection_items: injectionItems,
          created_at: prescription.created_at,
          issue_date: prescription.issue_date,
          status: uiStatus, // UI status for display
          dbStatus: prescription.status, // Database status
          updatedByName: prescription.edited_by_name || 'Unknown Staff',
          updatedAt: prescription.updated_at
        };
      });

      setUpdatedInjections(formattedUpdatedInjections);
    } catch (err) {
      console.error('Error loading updated injections:', err);
      setUpdatedInjections([]);
    }
  };

  const loadOutpatientQueueEntries = async () => {
    try {
      setQueueEntriesLoading(true);
      const result = await getQueueEntries(selectedDate, 'waiting');
      if (result.success && result.entries) {
        setOutpatientQueueEntries(result.entries);
      } else {
        setOutpatientQueueEntries([]);
      }
    } catch (err) {
      console.error('Error loading outpatient queue entries:', err);
      setOutpatientQueueEntries([]);
    } finally {
      setQueueEntriesLoading(false);
    }
  };

  const loadInjectionQueue = async () => {
    try {
      setInjectionLoading(true);
      
      // Check authentication status before querying
      try {
        console.log('Checking Supabase authentication status...');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log('Auth status:', { 
          user: authData?.user ? 'authenticated' : 'not authenticated', 
          error: authError,
          userId: authData?.user?.id
        });
        
        if (authError || !authData?.user) {
          console.warn('User is not authenticated - this will cause RLS to block prescriptions table access');
          console.warn('RLS Policy requires: auth.role() = authenticated, but auth.role() returns null');
        }
      } catch (authCheckErr) {
        console.error('Error checking auth status:', authCheckErr);
      }
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Loading injection queue for today:', today);
      
      // First, try a simple query to test connectivity
      try {
        console.log('Testing basic Supabase connectivity...');
        const { data: testData, error: testError } = await supabase
          .from('prescriptions')
          .select('count')
          .limit(1)
          .single();
        
        if (testError) {
          console.error('Basic connectivity test failed:', testError);
          setInjectionQueue([]);
          return;
        }
        console.log('Basic connectivity test passed');
      } catch (testErr) {
        console.error('Basic connectivity test exception:', testErr);
        setInjectionQueue([]);
        return;
      }
      
      // Fetch prescriptions with injection medications for today
      // First try a simpler query without joins to isolate the issue
      console.log('Trying simplified query first...');
      let prescriptions = null;
      let error = null;
      
      try {
        const { data: simpleData, error: simpleError } = await supabase
          .from('prescriptions')
          .select('id, prescription_id, patient_id, issue_date, created_at, status')
          .not('status', 'eq', 'expired')
          .not('status', 'eq', 'dispensed')
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`)
          .limit(50); // Limit to prevent large responses
        
        console.log('Simplified query result:', { data: simpleData, error: simpleError });
        
        if (simpleError) {
          console.error('Simplified query failed:', simpleError);
          
          // Check if this is an RLS issue
          if (!simpleError.message && !simpleError.details && !simpleError.hint && !simpleError.code) {
            console.error('🔒 RLS ISSUE DETECTED: Empty error object suggests Row Level Security is blocking access');
            console.error('💡 SOLUTION: The prescriptions table has RLS enabled but user is not authenticated');
            console.error('💡 QUICK FIX: Run: ALTER TABLE public.prescriptions DISABLE ROW LEVEL SECURITY;');
            console.error('💡 LONG FIX: Implement proper Supabase authentication');
            // Don't throw - handle gracefully by setting empty queue
            console.warn('Injection queue failed due to RLS, but continuing with empty queue. This is likely due to RLS policies.');
            setInjectionQueue([]);
            return;
          }
          
          throw simpleError;
        }
        
        if (!simpleData || simpleData.length === 0) {
          console.log('No prescriptions found for today');
          setInjectionQueue([]);
          return;
        }
        
        // Now try the complex query with joins
        console.log('Simplified query succeeded, trying complex query...');
        const { data: complexData, error: complexError } = await supabase
          .from('prescriptions')
          .select(`
            id,
            prescription_id,
            patient_id,
            issue_date,
            created_at,
            patient:patients(id, patient_id, name, date_of_birth, gender, phone),
            prescription_items(
              id,
              medication_id,
              dosage,
              frequency,
              duration,
              quantity,
              dispensed_quantity,
              medication:medications(id, name, dosage_form)
            )
          `)
          .not('status', 'eq', 'expired')
          .not('status', 'eq', 'dispensed')
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`);
        
        prescriptions = complexData;
        error = complexError;
        
      } catch (queryError) {
        console.error('Query failed:', queryError);
        error = queryError;
      }

      console.log('Query executed, checking results...');
      console.log('Prescriptions data:', prescriptions);
      console.log('Error object:', error);

      if (error) {
        console.error('Error fetching injection prescriptions:', {
          message: error?.message || 'Unknown error',
          details: error?.details || null,
          hint: error?.hint || null,
          code: error?.code || null,
          error: error,
          errorType: typeof error,
          errorKeys: error ? Object.keys(error) : 'error is null/undefined'
        });
        
        // Check if this is an RLS issue
        if (!error?.message && !error?.details && !error?.hint && !error?.code) {
          console.error('🔒 RLS ISSUE DETECTED: Empty error object suggests Row Level Security is blocking access');
          console.error('💡 SOLUTION: The prescriptions table has RLS enabled but user is not authenticated');
          console.error('💡 QUICK FIX: Run: ALTER TABLE public.prescriptions DISABLE ROW LEVEL SECURITY;');
          console.error('💡 LONG FIX: Implement proper Supabase authentication');
        }
        
        // For now, don't fail the entire page load due to injection queue issues
        // This allows the outpatient page to work even if injection queue has RLS issues
        console.warn('Injection queue failed, but continuing with empty queue. This is likely due to RLS policies.');
        setInjectionQueue([]);
        return;
      }

      // Debug: Log the raw data to understand what's happening
      console.log('Raw prescriptions data:', prescriptions);
      console.log('Prescriptions type:', typeof prescriptions);
      console.log('Prescriptions is array:', Array.isArray(prescriptions));
      
      if (!prescriptions || !Array.isArray(prescriptions)) {
        console.warn('Prescriptions data is not an array:', prescriptions);
        setInjectionQueue([]);
        return;
      }

      // Filter prescriptions that have injection medications
      const injectionPrescriptions = (prescriptions || []).filter((prescription: any) => {
        const items = prescription.prescription_items || [];
        return items.some((item: any) => {
          const dosageForm = item.medication?.dosage_form?.toLowerCase() || '';
          return dosageForm.includes('injection') || 
                 dosageForm.includes('inject') || 
                 dosageForm.includes('iv') || 
                 dosageForm.includes('im') || 
                 dosageForm.includes('sc') || 
                 dosageForm.includes('vial') || 
                 dosageForm.includes('ampoule');
        });
      });

      // Format the data for display
      const formattedQueue = injectionPrescriptions.map((prescription: any) => {
        const patient = prescription.patient;
        const items = prescription.prescription_items || [];
        const injectionItems = items.filter((item: any) => {
          const dosageForm = item.medication?.dosage_form?.toLowerCase() || '';
          return dosageForm.includes('injection') || 
                 dosageForm.includes('inject') || 
                 dosageForm.includes('iv') || 
                 dosageForm.includes('im') || 
                 dosageForm.includes('sc') || 
                 dosageForm.includes('vial') || 
                 dosageForm.includes('ampoule');
        });

        return {
          id: prescription.id,
          prescription_id: prescription.prescription_id,
          patient: patient,
          injection_items: injectionItems,
          created_at: prescription.created_at,
          issue_date: prescription.issue_date
        };
      });

      setInjectionQueue(formattedQueue);
    } catch (err) {
      console.error('Error loading injection queue:', {
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : null,
        errorType: typeof err
      });
      setInjectionQueue([]);
    } finally {
      setInjectionLoading(false);
    }
  };

  const updateInjectionStatus = async (itemId: string, status: string, staffName: string | null) => {
    console.log('=== UPDATE INJECTION STATUS CALLED ===', new Date().toISOString());
    console.log('Updating injection status:', { itemId, status, staffName });

    // Map UI status values to database-allowed values
    const statusMapping: { [key: string]: string } = {
      'completed': 'dispensed',
      'pending': 'active',
      'cancelled': 'expired'
    };

    const dbStatus = statusMapping[status] || 'active';
    console.log('Mapped status:', { uiStatus: status, dbStatus });
    
    // Double-check the mapping
    if (status === 'completed' && dbStatus !== 'dispensed') {
      console.error('Mapping error: completed should map to dispensed');
    }
    if (status === 'pending' && dbStatus !== 'active') {
      console.error('Mapping error: pending should map to active');
    }
    if (status === 'cancelled' && dbStatus !== 'expired') {
      console.error('Mapping error: cancelled should map to expired');
    }
    
    try {
      const updateData = {
        status: dbStatus,
        edited_by_name: staffName || 'Unknown Staff',
        updated_at: new Date().toISOString()
      };
      
      console.log('Updating prescription with data:', updateData);

      const { data, error } = await supabase
        .from('prescriptions')
        .update(updateData)
        .eq('id', itemId)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Error updating injection status:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Failed to update status: ${error.message || 'Unknown error'}`);
        return;
      }

      if (!data || data.length === 0) {
        console.error('No prescription found with ID:', itemId);
        alert('Prescription not found');
        return;
      }

      console.log('Successfully updated prescription:', data[0]);

      // Find the item in the current queue
      const itemToUpdate = injectionQueue.find(item => item.id === itemId);
      if (itemToUpdate) {
        const updatedItem = { 
          ...itemToUpdate, 
          status: status, // Keep the UI status for display
          dbStatus: dbStatus, // Store the database status
          updatedByName: staffName || 'Unknown Staff',
          updatedAt: new Date().toISOString()
        };

        console.log('Updating local state with item:', updatedItem);

        // Move to updated injections for all processed items
        setUpdatedInjections(prev => [...prev, updatedItem]);
        setInjectionQueue(prev => prev.filter(item => item.id !== itemId));
        console.log('Moved item to updated injections');
      } else {
        console.error('Item not found in local queue:', itemId);
      }

      // Refresh the queue
      console.log('Refreshing injection queue...');
      loadInjectionQueue();
      loadUpdatedInjections();
    } catch (err) {
      console.error('Unexpected error in updateInjectionStatus:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined
      });
      alert(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

      // Get patients - fetch with pagination and filters
      const response = await getAllPatients({
        page: currentPage,
        limit: 20,
        status: statusFilter === '' ? undefined : statusFilter,
        searchTerm: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        place: placeFilter || undefined
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
      setTotalPatients(response.total);
      setError(null);
    } catch (err) {
      console.error('Error loading outpatient data:', err);
      setError('Failed to load outpatient data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentPatients = async () => {
    try {
      const response = await getRecentPatients(10);
      setRecentPatients(response.patients);
    } catch (err) {
      console.error('Error loading recent patients:', err);
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

  // Utility functions for patient listing
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOutpatientData();
    setRefreshing(false);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePatientStartDateChange = (date: string) => {
    setStartDate(date);
    setCurrentPage(1);
  };

  const handlePatientEndDateChange = (date: string) => {
    setEndDate(date);
    setCurrentPage(1);
  };

  const handlePlaceFilter = (place: string) => {
    setPlaceFilter(place);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPlaceFilter('');
    setCurrentPage(1);
  };

  const getTruncatedText = (text: string, maxLength: number = 30) => {
    if (!text) return 'Not specified';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getGradientColors = (name: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-pink-500 to-rose-500',
      'from-cyan-500 to-blue-500',
      'from-emerald-500 to-green-500'
    ];

    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  const toggleDropdown = (patientId: string) => {
    setOpenDropdownId(openDropdownId === patientId ? null : patientId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

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

  const calculateWaitTime = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
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

  const showThermalPreviewWithLogo = () => {
    if (!selectedBill) return;

    const now = new Date();
    const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Get patient UHID
    const patientUhid = selectedBill.patient?.patient_id || 'WALK-IN';

    // Get sales type
    let salesType = selectedBill.payment_method?.toUpperCase() || 'CASH';
    if (salesType === 'CREDIT') {
      salesType = 'CREDIT';
    }

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${selectedBill.bill_id}</title>
          <style>
            @page { margin: 1mm; size: 77mm 297mm; }
            body { 
              font-family: 'Verdana', sans-serif; 
              font-weight: bold;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0; 
              padding: 2px;
              font-size: 14px;
              line-height: 1.2;
              width: 77mm;
            }
            html, body { background: #fff; }
            .header-14cm { font-size: 16pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-9cm { font-size: 11pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-10cm { font-size: 12pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .items-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .bill-info-10cm { font-size: 12pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .bill-info-bold { font-weight: bold; font-family: 'Verdana', sans-serif; }
            .footer-7cm { font-size: 9pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .center { text-align: center; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .right { text-align: right; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table td { padding: 1px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .totals-line { display: flex; justify-content: space-between; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .footer { margin-top: 15px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .signature-area { margin-top: 25px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .logo { width: 350px; height: auto; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo/annamHospital-bk.png" alt="ANNAM LOGO" class="logo" />
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div style="margin-top: 5px; font-weight: bold;">OUTPATIENT BILL</div>
          </div>
          
          <div style="margin-top: 10px;">
            <table class="table">
              <tr>
                <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${selectedBill.bill_id}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${patientUhid}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${selectedBill.patient?.name || 'Unknown Patient'}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${new Date(selectedBill.bill_date).toLocaleDateString()} ${new Date(selectedBill.bill_date).toLocaleTimeString()}</td>
              </tr>
              <tr>
                <td class="header-10cm">Payment Type&nbsp;:&nbsp;&nbsp;</td>
                <td class="header-10cm bill-info-bold">${salesType}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <table class="table">
              <tr style="border-bottom: 1px dashed #000;">
                <td width="30%" class="items-8cm">S.No</td>
                <td width="40%" class="items-8cm">Service</td>
                <td width="15%" class="items-8cm text-center">Qty</td>
                <td width="15%" class="items-8cm text-right">Amt</td>
              </tr>
              <tr>
                <td class="items-8cm">1.</td>
                <td class="items-8cm">Consultation Fee</td>
                <td class="items-8cm text-center">1</td>
                <td class="items-8cm text-right">${Number(selectedBill.total_amount || 0).toFixed(0)}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${(selectedBill.total_amount - (selectedBill.discount_amount || 0)).toFixed(0)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="totals-line footer-7cm">
              <span>Printed on ${printedDateTime}</span>
              <span>Authorized Sign</span>
            </div>
          </div>

          <script>
            (function() {
              function triggerPrint() {
                try {
                  window.focus();
                } catch (e) {}
                setTimeout(function() {
                  window.print();
                }, 250);
              }

              window.onafterprint = function() {
                try {
                  window.close();
                } catch (e) {}
              };

              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                triggerPrint();
              } else {
                document.addEventListener('DOMContentLoaded', triggerPrint);
              }
            })();
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(thermalContent);
      printWindow.document.close();
    }
  };

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
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0; 
              padding: 10px;
              font-size: 14px;
              line-height: 1.2;
              width: 77mm;
            }
            html, body { background: #fff; }
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
          <Link href="/outpatient/revisit">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              <RefreshCw className="h-4 w-4" />
              Revisit
            </button>
          </Link>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

        {/* Waiting for Injection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('injection')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Injections</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{injectionQueue.length}</p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <Syringe className="h-5 w-5 text-red-600" />
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
          <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl">
            <button
              onClick={() => setActiveTab('outpatient')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'outpatient'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Users className="h-4 w-4" />
              Outpatient
            </button>
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
              onClick={() => setActiveTab('injection')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'injection'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Syringe className="h-4 w-4" />
              Waiting for Injection ({injectionQueue.length})
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'appointments'
                ? 'bg-orange-100 text-orange-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Calendar className="h-4 w-4" />
              Today's Queue ({filteredAppointments.length + outpatientQueueEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${activeTab === 'recent'
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
          {activeTab === 'outpatient' && (
            <div>
              {/* Header with View Toggle */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Outpatient Patients</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage outpatient patient records and information</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {viewMode === 'grid' ? 'List View' : 'Grid View'}
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search patients by name, ID, or phone..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => handleStatusFilter(e.target.value)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="critical">Critical</option>
                    </select>

                    <input
                      type="date"
                      placeholder="Start Date"
                      value={startDate}
                      onChange={(e) => handlePatientStartDateChange(e.target.value)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    />

                    <input
                      type="date"
                      placeholder="End Date"
                      value={endDate}
                      onChange={(e) => handlePatientEndDateChange(e.target.value)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    />

                    <input
                      type="text"
                      placeholder="Filter by place (city/state/address)"
                      value={placeFilter}
                      onChange={(e) => handlePlaceFilter(e.target.value)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                    />

                    <button
                      onClick={clearFilters}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Patients */}
              {patients.length > 0 ? (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {patients.map((patient) => (
                        <div key={patient.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              <div className={`w-12 h-12 bg-gradient-to-r ${getGradientColors(patient.name)} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>
                                {getInitials(patient.name)}
                              </div>
                              <div className="ml-3">
                                <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                                <div className="flex items-center gap-2">
                                  <Hash className="h-3 w-3 text-gray-400" />
                                  <p className="text-sm text-orange-600 font-mono">{patient.patient_id}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Show Critical badge for emergency patients */}
                              {patient.is_critical && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Critical
                                </span>
                              )}

                              {/* Dropdown Menu */}
                              <div className="relative dropdown-container">
                                <button
                                  onClick={() => toggleDropdown(patient.id)}
                                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <MoreVertical size={16} className="text-gray-500" />
                                </button>

                                {openDropdownId === patient.id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 dropdown-container">
                                    <div className="py-1">
                                      <Link href={`/patients/${patient.id}`} className="w-full">
                                        <button
                                          onClick={() => setOpenDropdownId(null)}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                          <Eye size={14} />
                                          View Details
                                        </button>
                                      </Link>
                                      <Link href={`/patients/${patient.id}/edit`} className="w-full">
                                        <button
                                          onClick={() => setOpenDropdownId(null)}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                          <Edit3 size={14} />
                                          Edit Patient
                                        </button>
                                      </Link>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar size={14} className="mr-2 text-blue-500" />
                              <span className="font-medium">
                                Age: {patient.age || calculateAge(patient.date_of_birth)} • {patient.gender?.charAt(0).toUpperCase() + patient.gender?.slice(1)} • {patient.blood_group || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone size={14} className="mr-2 text-green-500" />
                              {patient.phone}
                            </div>
                            <div className="flex items-start text-sm text-gray-600">
                              <MapPin size={14} className="mr-2 mt-1 text-red-500" />
                              {getTruncatedText(patient.address, 35)}
                            </div>

                            {/* Vitals summary if available */}
                            {(patient.bmi || patient.bp_systolic || patient.pulse) && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {patient.bmi && (
                                  <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-bold border border-green-100">
                                    BMI: {patient.bmi}
                                  </span>
                                )}
                                {patient.bp_systolic && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                                    BP: {patient.bp_systolic}/{patient.bp_diastolic}
                                  </span>
                                )}
                                {patient.pulse && (
                                  <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold border border-orange-100">
                                    Pulse: {patient.pulse}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {patient.primary_complaint && (
                            <div className="bg-orange-50 rounded-xl p-3 mb-4">
                              <p className="text-xs font-medium text-orange-700 mb-1">Primary Complaint</p>
                              <p className="text-sm text-orange-900">{getTruncatedText(patient.primary_complaint, 50)}</p>
                            </div>
                          )}

                          {patient.allergies && (
                            <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
                              <p className="text-xs font-medium text-red-700 mb-1 flex items-center">
                                <AlertCircle size={12} className="mr-1" />
                                Allergies
                              </p>
                              <p className="text-sm text-red-900">{getTruncatedText(patient.allergies, 40)}</p>
                            </div>
                          )}

                          {/* Registered By Staff */}
                          {patient.staff && (
                            <div className="bg-green-50 rounded-xl p-3 mb-4 border border-green-100">
                              <p className="text-xs font-medium text-green-700 mb-1 flex items-center">
                                <Users size={12} className="mr-1" />
                                Registered By
                              </p>
                              <p className="text-sm text-green-900 font-medium">
                                {patient.staff.first_name} {patient.staff.last_name}
                                <span className="text-xs text-green-600 ml-1">({patient.staff.employee_id})</span>
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Link href={`/patients/${patient.id}`} className="flex-1">
                              <button className="w-full flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
                                <Eye size={14} className="mr-1" />
                                View
                              </button>
                            </Link>
                            <button
                              onClick={() => router.push(`/patients/${patient.id}/edit`)}
                              className="flex-1 flex items-center justify-center bg-blue-50 text-blue-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                            >
                              <Edit3 size={14} className="mr-1" />
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {patients.map((patient) => (
                              <tr key={patient.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className={`w-10 h-10 bg-gradient-to-r ${getGradientColors(patient.name)} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                                      {getInitials(patient.name)}
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                                      <div className="text-sm text-orange-600 font-mono">{patient.patient_id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{patient.phone}</div>
                                  <div className="text-sm text-gray-500">{getTruncatedText(patient.address, 25)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {patient.age || calculateAge(patient.date_of_birth)} • {patient.gender}
                                  </div>
                                  <div className="text-sm text-gray-500">{patient.blood_group || 'Unknown'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {patient.is_critical && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                                        <AlertCircle size={10} />
                                        Critical
                                      </span>
                                    )}
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      Outpatient
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center gap-2">
                                    <Link href={`/patients/${patient.id}`}>
                                      <button className="text-orange-600 hover:text-orange-900">
                                        <Eye size={16} />
                                      </button>
                                    </Link>
                                    <Link href={`/patients/${patient.id}/edit`}>
                                      <button className="text-blue-600 hover:text-blue-900">
                                        <Edit3 size={16} />
                                      </button>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPatients > 20 && (
                    <div className="flex items-center justify-between mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalPatients)} of {totalPatients} patients
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md">
                          {currentPage}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalPatients / 20), prev + 1))}
                          disabled={currentPage >= Math.ceil(totalPatients / 20)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Outpatient Patients Found</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter || startDate || endDate || placeFilter
                      ? 'No patients match your current filters. Try adjusting your search criteria.'
                      : 'No outpatient patients registered yet.'}
                  </p>
                  {(searchTerm || statusFilter || startDate || endDate || placeFilter) && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'queue' && (
            <VitalsQueueCard
              selectedDate={selectedDate}
              onRefresh={() => {
                loadOutpatientData();
                loadQueueStats();
              }}
            />
          )}

          {activeTab === 'injection' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Waiting for Injection</h3>
                  <p className="text-sm text-gray-600 mt-1">Patients prescribed with injection medications</p>
                </div>
                <button
                  onClick={() => {
                    loadInjectionQueue();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {injectionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">Loading injection queue...</span>
                </div>
              ) : injectionQueue.length === 0 ? (
                <div className="text-center py-12">
                  <Syringe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Waiting for Injection</h3>
                  <p className="text-gray-600">No patients have been prescribed injection medications today.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {injectionQueue.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <Syringe className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.patient?.name || 'Unknown Patient'}</h4>
                              <p className="text-sm text-gray-600">UHID: {item.patient?.patient_id || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Age/Gender:</span>
                              <span className="ml-2 text-gray-600">
                                {item.patient?.date_of_birth ? calculateAge(item.patient.date_of_birth) : 'N/A'} / {item.patient?.gender || 'N/A'}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Phone:</span>
                              <span className="ml-2 text-gray-600">{item.patient?.phone || 'N/A'}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Prescription ID:</span>
                              <span className="ml-2 text-gray-600">{item.prescription_id || 'N/A'}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Time:</span>
                              <span className="ml-2 text-gray-600">
                                {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <h5 className="font-medium text-gray-900 mb-2">Prescribed Injections:</h5>
                            <div className="space-y-2">
                              {item.injection_items.map((injection: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Syringe className="h-4 w-4 text-red-600" />
                                    <span className="font-medium text-gray-900">{injection.medication?.name || 'Unknown'}</span>
                                    <span className="text-sm text-gray-600">
                                      ({injection.dosage} • {injection.frequency} • {injection.duration})
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Qty: {injection.quantity} | Dispensed: {injection.dispensed_quantity || 0}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Status Controls with Staff Name Input */}
                          <div className="border-t pt-3 mt-3">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Staff Name</label>
                                <input
                                  type="text"
                                  placeholder="Enter staff name..."
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  onChange={(e) => {
                                    setInjectionQueue(prev => prev.map(queueItem => 
                                      queueItem.id === item.id ? { ...queueItem, staffName: e.target.value } : queueItem
                                    ));
                                  }}
                                  value={item.staffName || ''}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Update Status</label>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      console.log('Dispensed button clicked:', { 
                                        itemId: item.id, 
                                        staffName: item.staffName,
                                        item: item 
                                      });
                                      updateInjectionStatus(item.id, 'completed', item.staffName);
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-md hover:bg-green-200 transition-colors"
                                  >
                                    Dispensed
                                  </button>
                                  <button
                                    onClick={() => {
                                      console.log('Active button clicked:', { 
                                        itemId: item.id, 
                                        staffName: item.staffName,
                                        item: item 
                                      });
                                      updateInjectionStatus(item.id, 'pending', item.staffName);
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md hover:bg-yellow-200 transition-colors"
                                  >
                                    Active
                                  </button>
                                  <button
                                    onClick={() => {
                                      console.log('Expired button clicked:', { 
                                        itemId: item.id, 
                                        staffName: item.staffName,
                                        item: item 
                                      });
                                      updateInjectionStatus(item.id, 'cancelled', item.staffName);
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200 transition-colors"
                                  >
                                    Expired
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          {item.status && item.updatedByName && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                              Status: <span className="font-medium">
                                {item.status === 'completed' ? 'Dispensed' : 
                                 item.status === 'pending' ? 'Active' : 
                                 item.status === 'cancelled' ? 'Expired' : 
                                 item.status}
                              </span> by 
                              <span className="font-medium">
                                {item.updatedByName || 'Unknown Staff'}
                              </span>
                              {item.updatedAt && ` at ${new Date(item.updatedAt).toLocaleTimeString()}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Updated Injections Section */}
              {updatedInjections.length > 0 && (
                <div className="mt-8">
                  <div className="mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Updated Injections</h3>
                      <p className="text-sm text-gray-600 mt-1">Injections that have been completed or cancelled</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {updatedInjections.map((item) => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`p-2 rounded-lg ${
                                item.status === 'completed' ? 'bg-green-100' : 
                                item.status === 'pending' ? 'bg-yellow-100' : 
                                'bg-red-100'
                              }`}>
                                <Syringe className={`h-5 w-5 ${
                                  item.status === 'completed' ? 'text-green-600' : 
                                  item.status === 'pending' ? 'text-yellow-600' : 
                                  'text-red-600'
                                }`} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{item.patient?.name || 'Unknown Patient'}</h4>
                                <p className="text-sm text-gray-600">UHID: {item.patient?.patient_id || 'N/A'}</p>
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : item.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {item.status === 'completed' ? 'Dispensed' : 
                                 item.status === 'pending' ? 'Active' : 
                                 item.status === 'cancelled' ? 'Expired' : 
                                 item.status}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Age/Gender:</span>
                                <span className="ml-2 text-gray-600">
                                  {item.patient?.date_of_birth ? calculateAge(item.patient.date_of_birth) : 'N/A'} / {item.patient?.gender || 'N/A'}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Phone:</span>
                                <span className="ml-2 text-gray-600">{item.patient?.phone || 'N/A'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Prescription ID:</span>
                                <span className="ml-2 text-gray-600">{item.prescription_id || 'N/A'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-gray-700">Time:</span>
                                <span className="ml-2 text-gray-600">
                                  {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'N/A'}
                                </span>
                              </div>
                            </div>

                            <div className="border-t pt-3">
                              <h5 className="font-medium text-gray-900 mb-2">Prescribed Injections:</h5>
                              <div className="space-y-2">
                                {item.injection_items.map((injection: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Syringe className="h-4 w-4 text-gray-600" />
                                      <span className="font-medium text-gray-900">{injection.medication?.name || 'Unknown'}</span>
                                      <span className="text-sm text-gray-600">
                                        ({injection.dosage} • {injection.frequency} • {injection.duration})
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Qty: {injection.quantity} | Dispensed: {injection.dispensed_quantity || 0}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Status Update Information */}
                            <div className="border-t pt-3 mt-3">
                              <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                Status: <span className="font-medium">
                                  {item.status === 'completed' ? 'Dispensed' : 
                                   item.status === 'pending' ? 'Active' : 
                                   item.status === 'cancelled' ? 'Expired' : 
                                   item.status}
                                </span> by 
                                <span className="font-medium">
                                  {item.updatedByName || 'Unknown Staff'}
                                </span>
                                {item.updatedAt && ` at ${new Date(item.updatedAt).toLocaleTimeString()}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Patient Registration</h3>
              <p className="text-gray-600 mb-4">
                Register new patients and manage their records.
              </p>
              <button
                onClick={() => setActiveTab('outpatient')}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                Go to Outpatient Tab
              </button>
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Recent Patients</h3>
                  </div>
                  <span className="text-sm text-gray-500">Last 10 appointments</span>
                </div>
                
                {recentPatients.length > 0 ? (
                  <div className="space-y-3">
                    {recentPatients.map((patient, index) => (
                      <div key={patient.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{patient.name}</h4>
                                <p className="text-sm text-gray-500">UHID: {patient.patient_id}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {patient.appointment_status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="h-4 w-4" />
                              <span>{patient.phone || 'Not provided'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{patient.last_appointment_date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{patient.last_appointment_time}</span>
                            </div>
                          </div>
                          
                          {patient.doctor_name && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Stethoscope className="h-4 w-4" />
                                <span>Dr. {patient.doctor_name}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Patients</h3>
                    <p className="text-gray-600">No patient appointments found in the system.</p>
                  </div>
                )}
              </div>
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

      {/* Render appointments and queue entries in the appointments tab */}
      {activeTab === 'appointments' && (filteredAppointments.length > 0 || outpatientQueueEntries.length > 0) && (
        <div className="space-y-6 mt-6">
          {/* Appointments Section */}
          {filteredAppointments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Scheduled Appointments</h3>
                <p className="text-sm text-gray-600">Patients with confirmed appointments</p>
              </div>
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
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg flex items-center justify-center">
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

          {/* Outpatient Queue Section - Patients who completed vitals */}
          {outpatientQueueEntries.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Today's OP Queue</h3>
                <p className="text-sm text-gray-600">Patients who completed vitals and are ready for consultation</p>
              </div>
              <div className="divide-y divide-gray-100">
                {outpatientQueueEntries.map((queueEntry, index) => {
                  const patient = queueEntry.patient;
                  if (!patient) return null;

                  const waitTime = calculateWaitTime(queueEntry.created_at);

                  return (
                    <div key={queueEntry.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">Q{queueEntry.queue_number}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                <CheckCircle size={12} />
                                Ready for Consultation
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                UHID: {patient.patient_id}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Wait: {waitTime}
                              </span>
                              {patient.primary_complaint && (
                                <span className="text-gray-500">• {patient.primary_complaint}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/patients/${patient.id}`}>
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
        </div>
      )}

      {activeTab === 'appointments' && filteredAppointments.length === 0 && outpatientQueueEntries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mt-6">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patients in Today's Queue</h3>
            <p className="text-gray-600">There are no scheduled appointments or patients ready for consultation today.</p>
          </div>
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
                            <span className="font-medium">{record.total_amount.toFixed(0)}</span>
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

        {(() => {
          // Filter patients for current day only
          const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
          const todaysPatients = patients.filter(patient => {
            const patientDate = new Date(patient.created_at).toISOString().split('T')[0];
            return patientDate === today;
          });

          return todaysPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysPatients.slice(0, 3).map((patient) => (
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
                        Temp: {patient.temperature}°F
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
            <p className="text-gray-500">No patients registered today</p>
          </div>
        );
        })()}
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
                        <Link href={`/inpatient/create-inpatient?patientId=${appointment.patient_id}`}>
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
                      <td className="items-8cm text-right" style={{ fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', textAlign: 'right' }}>{selectedBill.total_amount.toFixed(0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div style={{ marginTop: '10px' }}>
                <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>Subtotal</span>
                  <span>{selectedBill.total_amount.toFixed(0)}</span>
                </div>
                {selectedBill.discount_amount > 0 && (
                  <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                    <span>Discount</span>
                    <span>-{selectedBill.discount_amount.toFixed(0)}</span>
                  </div>
                )}
                <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif' }}>
                  <span>GST (0%)</span>
                  <span>0.00</span>
                </div>
                <div className="totals-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14pt', fontWeight: 'bold', fontFamily: 'Times New Roman, Times, serif', borderTop: '1px solid #000', padding: '4px 0 0 0' }}>
                  <span>Total Amount</span>
                  <span>{(selectedBill.total_amount - (selectedBill.discount_amount || 0)).toFixed(0)}</span>
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
                onClick={showThermalPreviewWithLogo}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Printer size={16} className="inline mr-2" />
                Thermal 2
              </button>
              <button
                onClick={() => {
                  // ESC/POS Thermal Printer Implementation
                  const now = new Date();
                  const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                  // Build ESC/POS commands for thermal printer
                  const escPosCommands = [
                    // Initialize printer
                    '\x1B\x40', // ESC @ - Initialize printer
                    '\x1B\x21\x00', // ESC ! 0 - Reset text formatting
                    
                    // Center align for header
                    '\x1B\x61\x01', // ESC a 1 - Center align
                    
                    // Hospital header
                    '\x1B\x45\x01', // ESC E 1 - Bold on
                    'ANNAM HOSPITAL\n',
                    '\x1B\x45\x00', // ESC E 0 - Bold off
                    '2/301, Raj Kanna Nagar,\n',
                    'Veerapandian Patanam,\n',
                    'Tiruchendur - 628216\n',
                    'Phone- 04639 252592\n',
                    '\x1B\x45\x01', // Bold on
                    'INVOICE\n',
                    '\x1B\x45\x00', // Bold off
                    
                    // Left align for bill info
                    '\x1B\x61\x00', // ESC a 0 - Left align
                    
                    // Bill information
                    `Bill No  :   ${selectedBill.bill_id}\n`,
                    `UHID         :   ${selectedBill.patient?.patient_id || 'N/A'}\n`,
                    `Patient Name :   ${selectedBill.patient?.name || 'Unknown Patient'}\n`,
                    `Date           :   ${new Date(selectedBill.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(selectedBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}\n`,
                    `Sales Type :   ${(selectedBill.payment_method || 'CASH').toUpperCase()}\n`,
                    
                    // Items table header
                    '\x1B\x45\x01', // Bold on
                    'S.No   Service              Qty   Amount\n',
                    '--------------------------------\n',
                    '\x1B\x45\x00', // Bold off
                    
                    // Item row
                    '1.     Consultation Fee     1    ' + selectedBill.total_amount.toFixed(0) + '\n',
                    
                    // Totals
                    '\x1B\x45\x01', // Bold on
                    'Subtotal: ' + selectedBill.total_amount.toFixed(0) + '\n',
                    '------------------------\n',
                    'Total Amount: ' + (selectedBill.total_amount - (selectedBill.discount_amount || 0)).toFixed(0) + '\n',
                    '\x1B\x45\x00', // Bold off
                    
                    // Footer
                    '\x1B\x61\x01', // Center align
                    'Printed on ' + printedDateTime + '\n',
                    'Authorized Sign\n',
                    
                    // Cut paper
                    '\x1B\x64\x03', // ESC d 3 - Feed 3 line breaks
                    '\x1D\x56\x00'  // GS V 0 - Paper cut (partial cut)
                  ].join('');

                  // Send to thermal printer via browser print API
                  const printWindow = window.open('', '_blank', 'width=400,height=600');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Thermal Receipt - ${selectedBill.bill_id}</title>
                          <style>
                            @page { margin: 2mm; size: 77mm 297mm; }
                            body { 
                              font-family: 'Verdana', sans-serif; 
                              margin: 0; 
                              padding: 5px;
                              font-size: 12px;
                              font-weight: bold;
                              line-height: 1.1;
                              width: 77mm;
                            }
                            .center { text-align: center; }
                            .left { text-align: left; }
                          </style>
                        </head>
                        <body>
                          <div class="center">
                            <div>ANNAM HOSPITAL</div>
                            <div>2/301, Raj Kanna Nagar,</div>
                            <div>Veerapandian Patanam,</div>
                            <div>Tiruchendur - 628216</div>
                            <div>Phone- 04639 252592</div>
                            <div style="margin-top: 5px;">INVOICE</div>
                          </div>
                          <div class="left" style="margin-top: 5px;">
                            <div>Bill No  :   ${selectedBill.bill_id}</div>
                            <div>UHID         :   ${selectedBill.patient?.patient_id || 'N/A'}</div>
                            <div>Patient Name :   ${selectedBill.patient?.name || 'Unknown Patient'}</div>
                            <div>Date           :   ${new Date(selectedBill.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(selectedBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                            <div>Sales Type :   ${(selectedBill.payment_method || 'CASH').toUpperCase()}</div>
                          </div>
                          <div style="margin-top: 5px;">
                            <div>S.No   Service              Qty   Amount</div>
                            <div>--------------------------------</div>
                            <div>1.     Consultation Fee     1    ${selectedBill.total_amount.toFixed(0)}</div>
                          </div>
                          <div style="margin-top: 5px;">
                            <div>Subtotal: ${selectedBill.total_amount.toFixed(0)}</div>
                            <div>------------------------</div>
                            <div>Total Amount: ${(selectedBill.total_amount - (selectedBill.discount_amount || 0)).toFixed(0)}</div>
                          </div>
                          <div class="center" style="margin-top: 10px;">
                            <div>Printed on ${printedDateTime}</div>
                            <div>Authorized Sign</div>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    
                    // Alternative: Try to use Web Bluetooth or USB if available
                    if ((navigator as any).bluetooth) {
                      console.log('Web Bluetooth available - could implement direct thermal printer connection');
                    }
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
                    <span className="font-medium">₹{selectedBill.total_amount.toFixed(0)}</span>
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


    </div>
  );
}

export default function OutpatientPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-blue-500" />Loading...</div>}>
      <OutpatientPageContent />
    </Suspense>
  );
}
