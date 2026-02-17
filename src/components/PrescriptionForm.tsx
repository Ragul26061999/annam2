'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  Pill, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Stethoscope,
  ExternalLink,
  Upload,
  Image,
  Beaker,
  Camera,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import NewMedicineModal from './NewMedicineModal';
import LabXrayScanModal from './LabXrayScanModal';

interface Medication {
  id: string;
  medication_code: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  selling_price: number;
  available_stock: number;
  is_active: boolean;
  is_external?: boolean;
}

interface PrescriptionItem {
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  frequency_times: string[]; // Morning, Afternoon, Evening, Night
  meal_timing: string; // before_meal, after_meal, with_meal, empty_stomach
  duration: string;
  duration_days: number;
  instructions: string;
  quantity: number;
  auto_calculate_quantity: boolean;
  unit_price: number;
  total_price: number;
  stock_quantity: number;
}

interface SelectedTest {
  id: string;
  name: string;
  type: 'lab' | 'xray' | 'scan';
  category: string;
  price: number;
}

interface PrescriptionFormProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onPrescriptionCreated: () => void;
  currentUser: any;
  bedAllocationId?: string; // Add this for IP patients
}

export default function PrescriptionForm({ 
  patientId, 
  patientName, 
  onClose, 
  onPrescriptionCreated, 
  currentUser,
  bedAllocationId 
}: PrescriptionFormProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Medication[]>([]);
  const [showMedicationSearch, setShowMedicationSearch] = useState(false);
  const [showNewMedicineModal, setShowNewMedicineModal] = useState(false);
  const [isAddingNewMedicine, setIsAddingNewMedicine] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState('');
  const [showInjectionSearch, setShowInjectionSearch] = useState(false);
  const [isAddingNewInjection, setIsAddingNewInjection] = useState(false);
  const [newInjectionName, setNewInjectionName] = useState('');
  const [newInjectionDosage, setNewInjectionDosage] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchAnimation, setSearchAnimation] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [prescriptionImage, setPrescriptionImage] = useState<File | null>(null);
  const [prescriptionImageUrl, setPrescriptionImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showLabXrayScanModal, setShowLabXrayScanModal] = useState(false);
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);

  useEffect(() => {
    testSupabaseConnection();
    fetchMedications();
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      console.log('Fetching doctors...');
      
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          license_number,
          specialization,
          user_id
        `)
        .eq('status', 'active')
        .order('id', { ascending: true });
      
      if (error) {
        console.error('Error fetching doctors:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return;
      }
      
      console.log('Doctors fetched successfully:', data?.length || 0, 'doctors');
      
      // Fetch user names separately for each doctor
      const doctorsWithNames = await Promise.all(
        (data || []).map(async (doctor: any) => {
          try {
            if (doctor.user_id) {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', doctor.user_id)
                .single();
              
              if (userError) {
                console.warn('Failed to fetch user data for doctor:', doctor.id, userError);
              }
              
              return {
                ...doctor,
                users: userData || { name: 'Unknown Doctor', email: null }
              };
            }
            return {
              ...doctor,
              users: { name: 'Unknown Doctor', email: null }
            };
          } catch (userErr) {
            console.warn('Error fetching user for doctor:', doctor.id, userErr);
            return {
              ...doctor,
              users: { name: 'Unknown Doctor', email: null }
            };
          }
        })
      );
      
      setDoctors(doctorsWithNames);
      console.log('Final doctors list with names:', doctorsWithNames);
    } catch (error: any) {
      console.error('Error fetching doctors:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setDoctors([]);
    }
  };

  const testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      
      // Test basic connection with a simple query
      const { data, error } = await supabase
        .from('medications')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Supabase connection test failed:', error);
        if (error.message?.includes('Failed to fetch')) {
          const errorMsg = 'Network connection error. Please check your internet connection and try again.';
          setConnectionError(errorMsg);
          console.error('This is likely a network or configuration issue.');
          console.error('Please check:');
          console.error('1. .env.local file exists and contains correct Supabase URL and keys');
          console.error('2. Network connection is working');
          console.error('3. Supabase project is active and accessible');
        }
      } else {
        console.log('Supabase connection test passed!');
        setConnectionError(null);
      }
    } catch (error: any) {
      console.error('Supabase connection test error:', error);
      if (error.message?.includes('environment variables')) {
        const errorMsg = 'Configuration error. Please check your environment variables.';
        setConnectionError(errorMsg);
      }
    }
  };

  const fetchMedications = async () => {
    try {
      console.log('Fetching medications...');
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
      console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
      
      const { data, error } = await supabase
        .from('medications')
        .select('id, medication_code, name, generic_name, manufacturer, category, dosage_form, strength, selling_price, available_stock, is_active, is_external')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Medications fetched successfully:', data?.length || 0, 'items');
      setMedications(data || []);
    } catch (error: any) {
      console.error('Error fetching medications:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('fetch')) {
        const errorMsg = 'Network connection error. Unable to fetch medications.';
        setConnectionError(errorMsg);
        console.error('Network/Connection error - Check Supabase configuration');
      } else if (error.message?.includes('API')) {
        const errorMsg = 'API error. Please try again later.';
        setConnectionError(errorMsg);
        console.error('API error - Check Supabase service status');
      } else if (error.message?.includes('environment variables')) {
        const errorMsg = 'Configuration error. Please check your environment setup.';
        setConnectionError(errorMsg);
        console.error('Environment variables error - Check .env.local file');
      }
      
      // Set empty array to prevent further errors
      setMedications([]);
    }
  };

  const searchMedications = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setHighlightedIndex(-1);
      setSearchAnimation(false);
      return;
    }
    
    setIsSearching(true);
    setSearchAnimation(true);
    
    // Simulate smooth search delay for better UX
    setTimeout(() => {
      const filtered = medications.filter(med => 
        med.name.toLowerCase().includes(term.toLowerCase()) ||
        (med.generic_name && med.generic_name.toLowerCase().includes(term.toLowerCase())) ||
        (med.category && med.category.toLowerCase().includes(term.toLowerCase()))
      );
      setSearchResults(filtered);
      setHighlightedIndex(-1);
      setIsSearching(false);
      
      // Remove animation class after results appear
      setTimeout(() => setSearchAnimation(false), 300);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;
    
    if (key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const newIndex = prev < searchResults.length - 1 ? prev + 1 : prev;
        // Scroll to highlighted item
        setTimeout(() => scrollToHighlightedItem(newIndex), 0);
        return newIndex;
      });
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const newIndex = prev > 0 ? prev - 1 : prev;
        // Scroll to highlighted item
        setTimeout(() => scrollToHighlightedItem(newIndex), 0);
        return newIndex;
      });
    } else if (key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
        addMedicationToPrescription(searchResults[highlightedIndex]);
      }
    } else if (key === 'Escape') {
      setSearchTerm('');
      setSearchResults([]);
      setHighlightedIndex(-1);
    }
  };

  const scrollToHighlightedItem = (index: number) => {
    if (dropdownRef.current && index >= 0) {
      const container = dropdownRef.current;
      const highlightedElement = container.children[index] as HTMLElement;
      
      if (highlightedElement) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elementTop = highlightedElement.offsetTop;
        const elementBottom = elementTop + highlightedElement.clientHeight;
        
        // Scroll up if element is above visible area
        if (elementTop < containerTop) {
          container.scrollTop = elementTop;
        }
        // Scroll down if element is below visible area
        else if (elementBottom > containerBottom) {
          container.scrollTop = elementBottom - container.clientHeight;
        }
      }
    }
  };

  const addMedicationToPrescription = (medication: Medication) => {
    // Add smooth selection animation
    const selectedItem = document.getElementById(`med-${medication.id}`);
    if (selectedItem) {
      selectedItem.classList.add('scale-95', 'opacity-50');
    }
    
    setTimeout(() => {
      const newItem: PrescriptionItem = {
        medication_id: medication.id,
        medication_name: medication.name,
        dosage: '',
        frequency: '',
        frequency_times: [],
        meal_timing: '',
        duration: '',
        duration_days: 1,
        instructions: '',
        quantity: 1,
        auto_calculate_quantity: true,
        unit_price: medication.selling_price || 0,
        total_price: medication.selling_price || 0,
        stock_quantity: medication.available_stock || 0
      };
      
      setPrescriptionItems(prev => [newItem, ...prev]);
      setSearchTerm('');
      setSearchResults([]);
      setHighlightedIndex(-1);
      setShowMedicationSearch(false);
      setSearchAnimation(false);
      
      // Focus back to search input for continuous adding
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }, 150);
  };

  const handleNewMedicineAdded = (newMedicine: Medication) => {
    // Add the new medicine to the medications list
    setMedications(prev => [...prev, newMedicine]);
    // Automatically add it to the prescription
    addMedicationToPrescription(newMedicine);
  };

  const handleAddNewMedicineFromSearch = async () => {
    if (!newMedicineName.trim()) {
      return;
    }

    try {
      // Generate medication code for external medicine
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const medicationCode = `EXT${timestamp}${random}`;

      // Create new external medicine
      const { data: newMedicine, error } = await supabase
        .from('medications')
        .insert({
          medication_code: medicationCode,
          name: newMedicineName.trim(),
          generic_name: null,
          manufacturer: 'External Pharmacy',
          category: 'External',
          dosage_form: null,
          strength: null,
          selling_price: 0,
          purchase_price: 0,
          is_external: true,
          is_active: true,
          available_stock: 0,
          total_stock: 0,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the new medicine to medications list and prescription
      setMedications(prev => [...prev, newMedicine]);
      addMedicationToPrescription(newMedicine);
      
      // Reset the new medicine input
      setNewMedicineName('');
      setIsAddingNewMedicine(false);
      setSearchTerm('');
      setSearchResults([]);

    } catch (error: any) {
      console.error('Error adding new medicine:', error);
      // You could show an error message here if needed
    }
  };

  const handleAddNewInjectionFromSearch = async () => {
    if (!newInjectionName.trim() || !newInjectionDosage.trim()) {
      return;
    }

    try {
      // Generate medication code for external injection
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const medicationCode = `INJ${timestamp}${random}`;

      // Create new external injection (stored as medication with injection dosage form)
      const { data: newInjection, error } = await supabase
        .from('medications')
        .insert({
          medication_code: medicationCode,
          name: newInjectionName.trim(),
          generic_name: null,
          manufacturer: 'External Pharmacy',
          category: 'Injection',
          dosage_form: 'Injection',
          strength: newInjectionDosage.trim(),
          selling_price: 0,
          purchase_price: 0,
          is_external: true,
          is_active: true,
          available_stock: 0,
          total_stock: 0,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the new injection to medications list and prescription
      setMedications(prev => [...prev, newInjection]);
      addMedicationToPrescription(newInjection);
      
      // Reset the new injection input
      setNewInjectionName('');
      setNewInjectionDosage('');
      setIsAddingNewInjection(false);
      setSearchTerm('');
      setSearchResults([]);

    } catch (error: any) {
      console.error('Error adding new injection:', error);
      // You could show an error message here if needed
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setImageUploading(true);
    setPrescriptionImage(file);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `prescription-images/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prescription-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('prescription-images')
        .getPublicUrl(filePath);

      setPrescriptionImageUrl(urlData.publicUrl);
      console.log('Image uploaded successfully:', urlData.publicUrl);

    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message}`);
      setPrescriptionImage(null);
      setPrescriptionImageUrl(null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPrescriptionImage(null);
    setPrescriptionImageUrl(null);
  };

  const handleTestsSelected = (tests: SelectedTest[]) => {
    setSelectedTests(prev => [...prev, ...tests]);
  };

  const removeSelectedTest = (index: number) => {
    setSelectedTests(prev => prev.filter((_, i) => i !== index));
  };

  const calculateAutoQuantity = (frequencyTimes: string[], durationDays: number) => {
    const timesPerDay = frequencyTimes.length;
    return timesPerDay * durationDays;
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: string | number | string[] | boolean) => {
    const updatedItems = [...prescriptionItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate quantity if enabled
    if (updatedItems[index].auto_calculate_quantity && 
        (field === 'frequency_times' || field === 'duration_days')) {
      const autoQuantity = calculateAutoQuantity(
        updatedItems[index].frequency_times, 
        updatedItems[index].duration_days
      );
      updatedItems[index].quantity = autoQuantity;
      updatedItems[index].total_price = updatedItems[index].unit_price * autoQuantity;
    } else if (field === 'quantity') {
      updatedItems[index].total_price = updatedItems[index].unit_price * (value as number);
    }
    
    setPrescriptionItems(updatedItems);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const calculateTotalAmount = () => {
    return prescriptionItems.reduce((total, item) => total + item.total_price, 0);
  };

  const generatePrescriptionId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RX${year}${month}${day}${timestamp}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prescriptionItems.length === 0) {
      alert('Please add at least one medication to the prescription.');
      return;
    }
    
    if (!selectedDoctor) {
      alert('Please select a prescribing doctor.');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting prescription creation...');
      
      // Convert patient_id (like AH2601-0003) to actual UUID
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('patient_id', patientId)
        .single();

      if (patientError) {
        console.error('Patient lookup error:', patientError);
        throw new Error(`Patient not found: ${patientError.message}`);
      }

      const patientUuid = patientData.id;
      console.log('Patient UUID found:', patientUuid);

      // Generate unique prescription ID
      const prescriptionId = generatePrescriptionId();
      console.log('Generated prescription ID:', prescriptionId);

      // Use selected doctor from dropdown
      let doctorId = null;
      let doctorName = 'Unknown Doctor';
      
      if (selectedDoctor) {
        const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
        if (selectedDoctorData) {
          doctorId = selectedDoctorData.id;
          doctorName = selectedDoctorData.users?.name || 'Unknown Doctor';
          console.log('Using selected doctor:', doctorName, 'ID:', doctorId);
        }
      } else {
        // Fallback to current user if no doctor selected
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Auth error:', authError);
          throw new Error(`Authentication error: ${authError.message}`);
        }
        
        if (user?.id) {
          const { data: doctorData, error: doctorError } = await supabase
            .from('doctors')
            .select('id')
            .eq('id', user.id)
            .single();
          
          if (!doctorError && doctorData) {
            doctorId = user.id;
            doctorName = user.user_metadata?.name || user.email?.split('@')[0] || 'Current User';
            console.log('Using current user as doctor:', doctorName, 'ID:', doctorId);
          }
        }
      }

      // Create a new encounter record first
      const encounterPayload = {
        patient_id: patientUuid,
        clinician_id: doctorId,
        start_at: new Date().toISOString(),
        status_id: null,
        type_id: null,
        department_id: null
      };
      
      console.log('Creating encounter with payload:', encounterPayload);
      
      const { data: encounterData, error: encounterError } = await supabase
        .from('encounter')
        .insert(encounterPayload)
        .select()
        .single();

      if (encounterError) {
        console.error('Error creating encounter:', encounterError);
        throw new Error(`Failed to create encounter: ${encounterError.message}`);
      }

      const encounterId = encounterData.id;
      console.log('Encounter created successfully:', encounterId);

      // Create prescription record with correct schema
      const prescriptionPayload = {
        patient_id: patientUuid,
        doctor_id: doctorId,
        prescription_id: prescriptionId,
        issue_date: new Date().toISOString().split('T')[0],
        instructions: `Prescription created by ${doctorName}`,
        status: 'active',
        prescription_image_url: prescriptionImageUrl || null,
        has_lab_tests: selectedTests.length > 0
      };
      
      console.log('Creating prescription with payload:', prescriptionPayload);
      console.log('Selected tests count:', selectedTests.length);
      console.log('Selected tests:', selectedTests);
      
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert(prescriptionPayload)
        .select()
        .single();

      if (prescriptionError) {
        console.error('Prescription error:', prescriptionError);
        throw new Error(`Failed to create prescription: ${prescriptionError.message}`);
      }

      const dbPrescriptionId = prescriptionData.id;
      console.log('Prescription created successfully:', dbPrescriptionId);

      // Create prescription items with proper frequency formatting
      for (const item of prescriptionItems) {
        const frequencyText = item.frequency_times.length > 0 
          ? `${item.frequency_times.join(', ')} (${item.frequency_times.length}x daily)` 
          : 'As directed';
        
        const durationText = `${item.duration_days} days`;
        
        const fullInstructions = [
          item.instructions,
          item.meal_timing ? `Meal timing: ${item.meal_timing.replace('_', ' ')}` : '',
          `Frequency: ${frequencyText}`
        ].filter(Boolean).join(' | ');

        const { error: itemError } = await supabase
          .from('prescription_items')
          .insert({
            prescription_id: dbPrescriptionId,
            medication_id: item.medication_id,
            dosage: item.dosage,
            frequency: frequencyText,
            duration: durationText,
            instructions: fullInstructions,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: 'pending'
          });

        if (itemError) {
          console.error('Prescription item error - Details:', JSON.stringify(itemError, null, 2));
          console.error('Prescription item error - Message:', (itemError as any)?.message);
          throw itemError;
        }
      }

      // If this is an IP patient, create administration schedule
      if (bedAllocationId) {
        const { error: scheduleError } = await supabase
          .rpc('create_prescription_schedule', {
            p_bed_allocation_id: bedAllocationId,
            p_prescription_id: dbPrescriptionId,
            p_patient_id: patientUuid
          });

        if (scheduleError) {
          console.error('Error creating prescription schedule:', scheduleError);
          // Don't fail the prescription creation if schedule fails
        }
      }

      alert('Prescription created successfully!');
      onPrescriptionCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating prescription - Details:', JSON.stringify(error, null, 2));
      console.error('Error creating prescription - Message:', error?.message);
      alert(`Error creating prescription: ${error?.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Pill className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">New Prescription</h2>
                <p className="text-gray-600 text-sm">
                  Patient: {patientName} • ID: {patientId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Connection Error Alert */}
            {connectionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Connection Error</h4>
                    <p className="text-sm text-red-700 mb-2">{connectionError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setConnectionError(null);
                        testSupabaseConnection();
                        fetchMedications();
                      }}
                      className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prescribing Doctor *
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select a doctor...</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.users?.name || 'Unknown Doctor'} - {doctor.specialization}
                  </option>
                ))}
              </select>
              {selectedDoctor && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {doctors.find(d => d.id === selectedDoctor)?.users?.name || 'Unknown Doctor'}
                </p>
              )}
            </div>

            {/* Prescription Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prescription Image (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {!prescriptionImageUrl ? (
                  <div className="text-center">
                    <input
                      type="file"
                      id="prescription-image"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="hidden"
                    />
                    <label
                      htmlFor="prescription-image"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {imageUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Prescription Image
                        </>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: JPEG, PNG, GIF (Max 5MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={prescriptionImageUrl}
                        alt="Prescription"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Image uploaded successfully
                    </p>
                  </div>
                )}
              </div>
            </div>


            {/* Medication Search */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Prescribed Medications</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMedicationSearch(!showMedicationSearch)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Medication
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLabXrayScanModal(true)}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Lab/X-ray/Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInjectionSearch(!showInjectionSearch)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Injection
                  </button>
                </div>
              </div>

              {showMedicationSearch && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 transition-all duration-300 ease-in-out">
                  <div className="relative">
                    <Search className={`h-4 w-4 absolute left-3 top-3 transition-colors duration-200 ${
                      isSearching ? 'text-green-500 animate-pulse' : 'text-gray-400'
                    }`} />
                    
                    {isAddingNewMedicine ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newMedicineName}
                          onChange={(e) => setNewMedicineName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewMedicineFromSearch();
                            } else if (e.key === 'Escape') {
                              setIsAddingNewMedicine(false);
                              setNewMedicineName('');
                            }
                          }}
                          className="flex-1 pl-10 pr-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter new medicine name..."
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddNewMedicineFromSearch}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewMedicine(false);
                            setNewMedicineName('');
                          }}
                          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            searchMedications(e.target.value);
                          }}
                          onKeyDown={handleKeyDown}
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          placeholder="Search medications by name, generic name, or category..."
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewMedicine(true);
                            setSearchTerm('');
                            setSearchResults([]);
                          }}
                          className="absolute right-2 top-2 p-1.5 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                          title="Add new medicine"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    {isSearching && !isAddingNewMedicine && (
                      <div className="absolute right-12 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                      </div>
                    )}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div 
                      ref={dropdownRef}
                      className={`mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white transition-all duration-300 ease-out ${
                        searchAnimation ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
                      }`}
                    >
                      {searchResults.map((medication, index) => (
                        <div
                          key={medication.id}
                          id={`med-${medication.id}`}
                          onClick={() => addMedicationToPrescription(medication)}
                          className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all duration-200 transform hover:scale-[1.02] ${
                            highlightedIndex === index
                              ? 'bg-green-100 border-green-300 shadow-sm scale-[1.02]'
                              : 'hover:bg-green-50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 flex items-center gap-2">
                                {medication.name}
                                {medication.is_external && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 animate-fade-in">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    External
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">{medication.generic_name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {medication.strength} • {medication.dosage_form} • {medication.manufacturer}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-medium text-green-600">₹{medication.selling_price || 0}</p>
                              <p className={`text-xs mt-1 ${
                                medication.is_external 
                                  ? 'text-purple-600' 
                                  : medication.available_stock > 10 
                                    ? 'text-green-600' 
                                    : medication.available_stock > 0 
                                      ? 'text-yellow-600' 
                                      : 'text-red-600'
                              }`}>
                                {medication.is_external ? 'External' : `Stock: ${medication.available_stock || 0}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchTerm && searchResults.length === 0 && !isSearching && (
                    <div className="mt-3 p-4 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                      <div className="flex flex-col items-center">
                        <Search className="h-8 w-8 mb-2 text-gray-300" />
                        <p className="text-sm">No medications found</p>
                        <p className="text-xs mt-1">Try different keywords or add a new medicine</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Injection Search */}
              {showInjectionSearch && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 transition-all duration-300 ease-in-out">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-blue-400" />
                    
                    {isAddingNewInjection ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newInjectionName}
                            onChange={(e) => setNewInjectionName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                document.getElementById('injection-dosage-input')?.focus();
                              } else if (e.key === 'Escape') {
                                setIsAddingNewInjection(false);
                                setNewInjectionName('');
                                setNewInjectionDosage('');
                              }
                            }}
                            className="flex-1 pl-10 pr-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter injection name..."
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            id="injection-dosage-input"
                            type="text"
                            value={newInjectionDosage}
                            onChange={(e) => setNewInjectionDosage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewInjectionFromSearch();
                              } else if (e.key === 'Escape') {
                                setIsAddingNewInjection(false);
                                setNewInjectionName('');
                                setNewInjectionDosage('');
                              }
                            }}
                            className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter dosage (e.g., 2ml, 5mg)..."
                          />
                          <button
                            type="button"
                            onClick={handleAddNewInjectionFromSearch}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewInjection(false);
                              setNewInjectionName('');
                              setNewInjectionDosage('');
                            }}
                            className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            searchMedications(e.target.value);
                          }}
                          onKeyDown={handleKeyDown}
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Search injections by name, generic name, or category..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewInjection(true);
                            setSearchTerm('');
                            setSearchResults([]);
                          }}
                          className="absolute right-2 top-2 p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Add new injection"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    {isSearching && !isAddingNewInjection && (
                      <div className="absolute right-12 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div 
                      ref={dropdownRef}
                      className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white"
                    >
                      {searchResults
                        .filter(medication => medication.dosage_form === 'Injection' || medication.category === 'Injection')
                        .map((medication, index) => (
                        <div
                          key={medication.id}
                          id={`med-${medication.id}`}
                          onClick={() => addMedicationToPrescription(medication)}
                          className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-all duration-200 transform hover:scale-[1.02] ${
                            highlightedIndex === index
                              ? 'bg-blue-100 border-blue-300 shadow-sm scale-[1.02]'
                              : 'hover:bg-blue-50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{medication.name}</h4>
                                {medication.is_external && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">External</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{medication.generic_name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {medication.strength} • {medication.dosage_form} • {medication.manufacturer}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-medium text-blue-600">₹{medication.selling_price || 0}</p>
                              <p className={`text-xs mt-1 ${
                                medication.is_external 
                                  ? 'text-purple-600' 
                                  : medication.available_stock > 10 
                                    ? 'text-green-600' 
                                    : medication.available_stock > 0 
                                      ? 'text-yellow-600' 
                                      : 'text-red-600'
                              }`}>
                                {medication.is_external ? 'External' : `Stock: ${medication.available_stock || 0}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchTerm && searchResults.filter(medication => medication.dosage_form === 'Injection' || medication.category === 'Injection').length === 0 && !isSearching && (
                    <div className="mt-3 p-4 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
                      <div className="flex flex-col items-center">
                        <Search className="h-8 w-8 mb-2 text-gray-300" />
                        <p className="text-sm">No injections found</p>
                        <p className="text-xs mt-1">Try different keywords or add a new injection</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Lab/X-ray/Scan Tests */}
            {selectedTests.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Ordered Lab/X-ray/Scan Tests</h3>
                  <span className="text-sm text-gray-600">{selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected</span>
                </div>
                <div className="space-y-3">
                  {selectedTests.map((test, index) => (
                    <div key={index} className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-2 rounded-lg ${
                              test.type === 'lab' ? 'bg-green-100' : 
                              test.type === 'xray' ? 'bg-blue-100' : 'bg-orange-100'
                            }`}>
                              {test.type === 'lab' ? (
                                <Beaker className="h-4 w-4 text-green-600" />
                              ) : test.type === 'xray' ? (
                                <Camera className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Activity className="h-4 w-4 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{test.name}</h4>
                              <p className="text-sm text-gray-600">{test.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              test.type === 'lab' ? 'bg-green-100 text-green-800' : 
                              test.type === 'xray' ? 'bg-blue-100 text-blue-800' : 
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {test.type.toUpperCase()}
                            </span>
                            <span className="font-medium text-gray-900">₹{test.price || 0}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedTest(index)}
                          className="text-red-500 hover:text-red-700 p-1 ml-4"
                          title="Remove test"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prescription Items */}
            {prescriptionItems.length > 0 && (
              <div className="space-y-4">
                {prescriptionItems.map((item, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.medication_name}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePrescriptionItem(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {/* Stock Information */}
                    <div className={`mb-4 p-3 rounded-lg border ${
                      medications.find(m => m.id === item.medication_id)?.is_external
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          medications.find(m => m.id === item.medication_id)?.is_external
                            ? 'text-purple-800'
                            : 'text-blue-800'
                        }`}>
                          {medications.find(m => m.id === item.medication_id)?.is_external
                            ? 'Medicine Type:'
                            : 'Current Stock:'
                          }
                        </span>
                        <span className={`text-sm font-bold ${
                          medications.find(m => m.id === item.medication_id)?.is_external
                            ? 'text-purple-600'
                            : item.stock_quantity > 10 
                              ? 'text-green-600' 
                              : item.stock_quantity > 0 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                        }`}>
                          {medications.find(m => m.id === item.medication_id)?.is_external
                            ? 'External Pharmacy'
                            : `${item.stock_quantity} units available`
                          }
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Dosage *</label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => updatePrescriptionItem(index, 'dosage', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g., 500mg, 1 tablet"
                          required
                        />
                      </div>
                      
                      {/* Duration (Days) - Hide for injections */}
                      {!(medications.find(m => m.id === item.medication_id)?.dosage_form === 'Injection' || medications.find(m => m.id === item.medication_id)?.category === 'Injection') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Duration (Days) *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.duration_days}
                            onChange={(e) => updatePrescriptionItem(index, 'duration_days', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Frequency Times - Hide for injections */}
                    {!(medications.find(m => m.id === item.medication_id)?.dosage_form === 'Injection' || medications.find(m => m.id === item.medication_id)?.category === 'Injection') && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Frequency Times *</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                            <label key={time} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={item.frequency_times.includes(time)}
                                onChange={(e) => {
                                  const newTimes = e.target.checked
                                    ? [...item.frequency_times, time]
                                    : item.frequency_times.filter(t => t !== time);
                                  updatePrescriptionItem(index, 'frequency_times', newTimes);
                                }}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">{time}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meal Timing - Hide for injections */}
                    {!(medications.find(m => m.id === item.medication_id)?.dosage_form === 'Injection' || medications.find(m => m.id === item.medication_id)?.category === 'Injection') && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Meal Timing</label>
                        <select
                          value={item.meal_timing}
                          onChange={(e) => updatePrescriptionItem(index, 'meal_timing', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="">Select meal timing</option>
                          <option value="before_meal">Before Meal</option>
                          <option value="after_meal">After Meal</option>
                          <option value="with_meal">With Meal</option>
                          <option value="empty_stomach">Empty Stomach</option>
                        </select>
                      </div>
                    )}

                    {/* Quantity Section - Hide auto calculate and random quantity for injections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        {!(medications.find(m => m.id === item.medication_id)?.dosage_form === 'Injection' || medications.find(m => m.id === item.medication_id)?.category === 'Injection') ? (
                          <>
                            <label className="flex items-center space-x-2 mb-2">
                              <input
                                type="checkbox"
                                checked={item.auto_calculate_quantity}
                                onChange={(e) => updatePrescriptionItem(index, 'auto_calculate_quantity', e.target.checked)}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-xs font-medium text-gray-700">Auto Calculate Quantity</span>
                            </label>
                            {item.auto_calculate_quantity ? (
                              <div className="px-3 py-2 text-sm bg-green-50 border border-green-300 rounded font-medium text-green-600">
                                Auto: {calculateAutoQuantity(item.frequency_times, item.duration_days)} units
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="1"
                                max={item.stock_quantity}
                                value={item.quantity}
                                onChange={(e) => updatePrescriptionItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Custom quantity"
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Quantity *</label>
                            <input
                              type="number"
                              min="1"
                              max={item.stock_quantity}
                              value={item.quantity}
                              onChange={(e) => updatePrescriptionItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              placeholder="Enter quantity"
                              required
                            />
                          </>
                        )}
                      </div>
                      
                      {/* Random Quantity - Hide for injections */}
                      {!(medications.find(m => m.id === item.medication_id)?.dosage_form === 'Injection' || medications.find(m => m.id === item.medication_id)?.category === 'Injection') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Random Quantity</label>
                          <button
                            type="button"
                            onClick={() => {
                              const randomQty = Math.floor(Math.random() * Math.min(item.stock_quantity, 30)) + 1;
                              updatePrescriptionItem(index, 'quantity', randomQty);
                              updatePrescriptionItem(index, 'auto_calculate_quantity', false);
                            }}
                            className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 transition-colors"
                          >
                            Generate Random
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                      <textarea
                        value={item.instructions}
                        onChange={(e) => updatePrescriptionItem(index, 'instructions', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., Take after meals, Avoid alcohol, Complete the full course"
                        rows={2}
                      />
                      {item.meal_timing && (
                        <p className="mt-1 text-xs text-blue-600">
                          Meal timing: {item.meal_timing.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      )}
                      {item.frequency_times.length > 0 && (
                        <p className="mt-1 text-xs text-green-600">
                          Times: {item.frequency_times.join(', ')} ({item.frequency_times.length} times daily)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {prescriptionItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No medications added yet. Click "Add Medication" to start prescribing.</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || prescriptionItems.length === 0}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Prescription
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* New Medicine Modal */}
      <NewMedicineModal
        isOpen={showNewMedicineModal}
        onClose={() => setShowNewMedicineModal(false)}
        onMedicineAdded={handleNewMedicineAdded}
      />
      
      {/* Lab/X-ray/Scan Modal */}
      <LabXrayScanModal
        isOpen={showLabXrayScanModal}
        onClose={() => setShowLabXrayScanModal(false)}
        patientId={patientId}
        patientName={patientName}
        onOrderCreated={() => {
          // Optional: Refresh any data if needed
          console.log('Lab/X-ray/Scan order created');
        }}
        onTestsSelected={handleTestsSelected}
      />
    </div>
  );
}