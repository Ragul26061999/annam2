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
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import NewMedicineModal from '../NewMedicineModal';

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

interface IPPrescriptionItem {
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

interface IPPrescriptionFormProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onPrescriptionCreated: () => void;
  currentUser: any;
  bedAllocationId: string;
  selectedDate?: string; // Add selected date from timeline
}

export default function IPPrescriptionForm({ 
  patientId, 
  patientName, 
  onClose, 
  onPrescriptionCreated, 
  currentUser,
  bedAllocationId,
  selectedDate 
}: IPPrescriptionFormProps) {
  // Debug logging to see what props are being passed
  console.log('IPPrescriptionForm props:', { patientId, patientName, bedAllocationId, currentUser });

  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<IPPrescriptionItem[]>([]);
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('id, medication_code, name, generic_name, manufacturer, category, dosage_form, strength, selling_price, available_stock, is_active, is_external')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching medications:', error);
        throw error;
      }
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const searchMedications = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setHighlightedIndex(-1);
      return;
    }
    
    const filtered = medications.filter(med => 
      med.name.toLowerCase().includes(term.toLowerCase()) ||
      (med.generic_name && med.generic_name.toLowerCase().includes(term.toLowerCase())) ||
      (med.category && med.category.toLowerCase().includes(term.toLowerCase()))
    );
    setSearchResults(filtered);
    setHighlightedIndex(-1);
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
    const newItem: IPPrescriptionItem = {
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
    
    setPrescriptionItems([...prescriptionItems, newItem]);
    setSearchTerm('');
    setSearchResults([]);
    setHighlightedIndex(-1);
    setShowMedicationSearch(false);
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

  const calculateAutoQuantity = (frequencyTimes: string[], durationDays: number) => {
    const timesPerDay = frequencyTimes.length;
    return timesPerDay * durationDays;
  };

  const updatePrescriptionItem = (index: number, field: keyof IPPrescriptionItem, value: string | number | string[] | boolean) => {
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

    setLoading(true);
    try {
      // Find patient using the correct column for ERPH database
      let patientData;
      
      console.log('Debug - Looking up patient with:', { patientId, patientName });
      
      // First try by patient_id column
      const { data: initialPatientData, error: patientError } = await supabase
        .from('patients')
        .select('id, patient_id, name')
        .eq('patient_id', patientId)
        .single();

      console.log('Debug - Patient lookup result:', { data: initialPatientData, error: patientError });

      if (patientError || !initialPatientData) {
        console.error('Patient lookup error:', patientError);
        // Try alternative lookup by name if patient_id doesn't work
        const { data: nameData, error: nameError } = await supabase
          .from('patients')
          .select('id, patient_id, name')
          .eq('name', patientName)
          .single();
        
        console.log('Debug - Name lookup result:', { data: nameData, error: nameError });
        
        if (nameError || !nameData) {
          // Try by UUID if patientId looks like a UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(patientId)) {
            const { data: uuidData, error: uuidError } = await supabase
              .from('patients')
              .select('id, patient_id, name')
              .eq('id', patientId)
              .single();
            
            console.log('Debug - UUID lookup result:', { data: uuidData, error: uuidError });
            
            if (!uuidError && uuidData) {
              patientData = uuidData;
            } else {
              throw new Error(`Patient not found. Tried ID: ${patientId}, Name: ${patientName}, UUID lookup failed`);
            }
          } else {
            throw new Error(`Patient not found. Tried ID: ${patientId}, Name: ${patientName}`);
          }
        } else {
          patientData = nameData;
        }
      } else {
        patientData = initialPatientData;
      }

      const patientUuid = patientData.id;

      // Generate unique prescription ID
      const prescriptionId = generatePrescriptionId();

      // Check if current user is a valid doctor
      let doctorId = null;
      if (currentUser?.id) {
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('id')
          .eq('id', currentUser.id)
          .single();
        
        if (!doctorError && doctorData) {
          doctorId = currentUser.id;
        }
      }

      // Create a new encounter record first
      const { data: encounterData, error: encounterError } = await supabase
        .from('encounter')
        .insert({
          patient_id: patientUuid,
          clinician_id: doctorId,
          start_at: new Date().toISOString(),
          status_id: null,
          type_id: null,
          department_id: null
        })
        .select()
        .single();

      if (encounterError) {
        console.error('Error creating encounter:', encounterError);
        throw encounterError;
      }

      const encounterId = encounterData.id;

      // Create prescription record with correct schema
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          prescription_id: prescriptionId,
          patient_id: patientUuid,
          doctor_id: doctorId,
          encounter_id: encounterId,
          issue_date: new Date().toISOString().split('T')[0],
          instructions: 'IP Prescription created by doctor',
          status: 'active'
        })
        .select()
        .single();

      if (prescriptionError) {
        console.error('Prescription error:', prescriptionError);
        throw prescriptionError;
      }

      const dbPrescriptionId = prescriptionData.id;

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
        // First, update the existing schedule records with proper frequency times
        for (const item of prescriptionItems) {
          const frequencyText = item.frequency_times.length > 0 
            ? `${item.frequency_times.join(', ')} (${item.frequency_times.length}x daily)` 
            : 'As directed';
          
          // Update prescription item with proper frequency text
          const { error: updateError } = await supabase
            .from('prescription_items')
            .update({
              frequency: frequencyText,
              instructions: [
                item.instructions,
                item.meal_timing ? `Meal timing: ${item.meal_timing.replace('_', ' ')}` : '',
                `Frequency: ${frequencyText}`
              ].filter(Boolean).join(' | ')
            })
            .eq('prescription_id', dbPrescriptionId)
            .eq('medication_id', item.medication_id);

          if (updateError) {
            console.error('Error updating prescription item frequency:', updateError);
          }
        }

        // Use selected date or today as start date
        const prescriptionStartDate = selectedDate || new Date().toISOString().split('T')[0];
        
        const { error: scheduleError } = await supabase
          .rpc('create_prescription_schedule_with_date', {
            p_bed_allocation_id: bedAllocationId,
            p_prescription_id: dbPrescriptionId,
            p_patient_id: patientUuid,
            p_start_date: prescriptionStartDate
          });

        if (scheduleError) {
          console.error('Error creating prescription schedule:', scheduleError);
          // Fallback to original function if new function doesn't exist
          const { error: fallbackError } = await supabase
            .rpc('create_prescription_schedule', {
              p_bed_allocation_id: bedAllocationId,
              p_prescription_id: dbPrescriptionId,
              p_patient_id: patientUuid
            });

          if (fallbackError) {
            console.error('Fallback schedule creation also failed:', fallbackError);
          }
        } else {
          // Refresh the materialized view after creating schedule
          try {
            await supabase.rpc('refresh_nurse_medication_checklist');
            console.log('Materialized view refreshed successfully');
          } catch (refreshError) {
            console.error('Error refreshing materialized view:', refreshError);
          }
        }
      }

      alert('IP Prescription created successfully!');
      onPrescriptionCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating IP prescription - Details:', JSON.stringify(error, null, 2));
      console.error('Error creating IP prescription - Message:', error?.message);
      alert(`Error creating IP prescription: ${error?.message || 'Please try again.'}`);
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
                <h2 className="text-xl font-semibold text-gray-900">New IP Prescription</h2>
                <p className="text-gray-600 text-sm">
                  Patient: {patientName} • ID: {patientId} • IP: {bedAllocationId}
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
                    onClick={() => setShowInjectionSearch(!showInjectionSearch)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Injection
                  </button>
                </div>
              </div>

              {showMedicationSearch && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    
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
                          className="flex-1 pl-10 pr-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            searchMedications(e.target.value);
                          }}
                          onKeyDown={handleKeyDown}
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Search medications by name, generic name, or category..."
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
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div 
                      ref={dropdownRef}
                      className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white"
                    >
                      {searchResults.map((medication, index) => (
                        <div
                          key={medication.id}
                          onClick={() => addMedicationToPrescription(medication)}
                          className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            highlightedIndex === index
                              ? 'bg-green-100 border-green-300'
                              : 'hover:bg-green-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {medication.name}
                                {medication.is_external && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    External
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">{medication.generic_name}</p>
                              <p className="text-xs text-gray-500">
                                {medication.strength} • {medication.dosage_form} • {medication.manufacturer}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600">₹{medication.selling_price || 0}</p>
                              <p className={`text-xs ${
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
                </div>
              )}

              {/* Injection Search */}
              {showInjectionSearch && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
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
                                document.getElementById('injection-dosage-input-ip')?.focus();
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
                            id="injection-dosage-input-ip"
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
                          onClick={() => addMedicationToPrescription(medication)}
                          className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            highlightedIndex === index
                              ? 'bg-blue-100 border-blue-300'
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {medication.name}
                                {medication.is_external && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    External
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">{medication.generic_name}</p>
                              <p className="text-xs text-gray-500">
                                {medication.strength} • {medication.dosage_form} • {medication.manufacturer}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-blue-600">₹{medication.selling_price || 0}</p>
                              <p className={`text-xs ${
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
                </div>
              )}
            </div>

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
                    </div>

                    {/* Frequency Times */}
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

                    {/* Meal Timing */}
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

                    {/* Quantity Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
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
                      </div>
                      
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
                  Create IP Prescription
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
    </div>
  );
}
