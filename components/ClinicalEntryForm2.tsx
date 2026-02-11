'use client';
import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Activity,
  Pill,
  Calendar,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  Stethoscope,
  Clock,
  Syringe
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { SearchableSelect } from '../src/components/ui/SearchableSelect';
import {
  getRadiologyTestCatalog,
  createRadiologyTestCatalogEntry,
  type RadiologyTestCatalog,
  getLabTestCatalog,
  createLabTestCatalogEntry,
  type LabTestCatalog
} from '../src/lib/labXrayService';
import { createPrescription, type PrescriptionData } from '../src/lib/prescriptionService';

interface ClinicalEntryForm2Props {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  patientUHID: string;
  onSuccess?: () => void;
}

type TabType = 'notes' | 'lab' | 'xray' | 'prescriptions' | 'injections' | 'followup' | 'vitals';

// Lab Test Interface
interface LabTest {
  lab_test_catalog_id?: string;
  test_type: string;
  test_name: string;
  test_category: string;
  urgency: 'routine' | 'urgent' | 'stat' | 'emergency';
  clinical_indication: string;
  special_instructions: string;
}

interface LabTestSelection {
  testId: string;
  testName: string;
  groupName: string; // category
  clinicalIndication: string;
  specialInstructions: string;
}

// X-ray/Scan Interface
interface XRayOrder {
  radiology_test_catalog_id?: string;
  scan_type: string;
  scan_name: string;
  body_part: string;
  urgency: 'routine' | 'urgent' | 'stat' | 'emergency';
  clinical_indication: string;
  special_instructions: string;
}

interface XrayTestSelection {
  testId: string;
  testName: string;
  groupName: string; // modality
  bodyPart: string; // specific region / view details
  clinicalIndication: string;
  specialInstructions: string;
}

// Prescription Interface
interface PrescriptionItem {
  medication_id: string;
  medication_name: string;
  generic_name: string;
  dosage: string;
  frequency_times: string[];
  meal_timing: string;
  duration_days: number;
  instructions: string;
  quantity: number;
  auto_calculate_quantity: boolean;
  stock_quantity: number;
}

// Clinical Notes Interface
interface ClinicalNotes {
  present_complaints: string;
  history_present_illness: string;
  past_history: string;
  family_history: string;
  personal_history: string;
  examination_notes: string;
  provisional_diagnosis: string;
  investigation_summary: string;
  treatment_plan: string;
}

export default function ClinicalEntryForm2({
  isOpen,
  onClose,
  appointmentId,
  encounterId,
  patientId,
  doctorId,
  patientName,
  patientUHID,
  onSuccess
}: ClinicalEntryForm2Props) {
  const [activeTab, setActiveTab] = useState<TabType>('vitals');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clinical Notes State
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNotes>({
    present_complaints: '',
    history_present_illness: '',
    past_history: '',
    family_history: '',
    personal_history: '',
    examination_notes: '',
    provisional_diagnosis: '',
    investigation_summary: '',
    treatment_plan: ''
  });

  // Map form fields to DB columns
  const mapClinicalNotesToDB = (notes: ClinicalNotes) => ({
    chief_complaint: notes.present_complaints,
    history_of_present_illness: notes.history_present_illness,
    physical_examination: notes.examination_notes,
    assessment: notes.provisional_diagnosis,
    clinical_impression: notes.investigation_summary,
    differential_diagnosis: null, // array, not used in form yet
    doctor_notes: Object.values(notes).filter(v => v).join('\n\n'),
    follow_up_notes: null
  });

  // Lab Tests State
  const [labCatalog, setLabCatalog] = useState<LabTestCatalog[]>([]);
  const [selectedLabTests, setSelectedLabTests] = useState<LabTestSelection[]>([
    { testId: '', testName: '', groupName: '', clinicalIndication: '', specialInstructions: '' }
  ]);
  const [labUrgency, setLabUrgency] = useState<'routine' | 'urgent' | 'stat' | 'emergency'>('routine');

  // X-ray Orders State
  const [radCatalog, setRadCatalog] = useState<RadiologyTestCatalog[]>([]);
  const [selectedXrayTests, setSelectedXrayTests] = useState<XrayTestSelection[]>([
    { testId: '', testName: '', groupName: '', bodyPart: '', clinicalIndication: '', specialInstructions: '' }
  ]);
  const [xrayUrgency, setXrayUrgency] = useState<'routine' | 'urgent' | 'stat' | 'emergency'>('routine');

  // New Catalog UI (Lab + Xray)
  const [showNewLabTestModal, setShowNewLabTestModal] = useState(false);
  const [creatingLabTest, setCreatingLabTest] = useState(false);
  const [newLabTestData, setNewLabTestData] = useState({
    testName: '',
    groupName: ''
  });

  const [showNewXrayTestModal, setShowNewXrayTestModal] = useState(false);
  const [creatingXrayTest, setCreatingXrayTest] = useState(false);
  const [newXrayTestData, setNewXrayTestData] = useState({
    testName: '',
    groupName: ''
  });

  // Prescriptions State
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showMedicationSearch, setShowMedicationSearch] = useState(false);
  const [expandedPrescriptionIndexes, setExpandedPrescriptionIndexes] = useState<number[]>([]);

  // Injection State
  const [injectionItems, setInjectionItems] = useState<PrescriptionItem[]>([]);
  const [showInjectionSearch, setShowInjectionSearch] = useState(false);
  const [injectionSearchTerm, setInjectionSearchTerm] = useState('');
  const [injectionSearchResults, setInjectionSearchResults] = useState<any[]>([]);
  const [isAddingNewInjection, setIsAddingNewInjection] = useState(false);
  const [newInjectionName, setNewInjectionName] = useState('');
  const [newInjectionDosage, setNewInjectionDosage] = useState('');
  const [expandedInjectionIndexes, setExpandedInjectionIndexes] = useState<number[]>([]);

  // Vitals & Complaints State
  const [vitalsData, setVitalsData] = useState<any>(null);
  const [complaintsData, setComplaintsData] = useState<any>(null);
  const [patientComplaint, setPatientComplaint] = useState<string>('');
  const [vitalsLoading, setVitalsLoading] = useState(false);

  // Follow-up State
  const [followUp, setFollowUp] = useState({
    follow_up_date: '',
    follow_up_time: '',
    reason: '',
    instructions: '',
    priority: 'routine' as 'routine' | 'important' | 'urgent'
  });

  const tabs = [
    { id: 'vitals' as TabType, label: 'Vitals & Complaints', icon: Activity },
    { id: 'notes' as TabType, label: 'Clinical Notes', icon: FileText },
    { id: 'lab' as TabType, label: 'Lab Tests', icon: Activity },
    { id: 'xray' as TabType, label: 'X-Ray & Scans', icon: Activity },
    { id: 'prescriptions' as TabType, label: 'Prescriptions', icon: Pill },
    { id: 'injections' as TabType, label: 'Injections', icon: Syringe },
    { id: 'followup' as TabType, label: 'Follow-up', icon: Calendar }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchMedications();
      fetchRadiologyCatalog();
      fetchLabCatalog();
      fetchVitalsAndComplaints();
    }
  }, [isOpen]);

  const fetchVitalsAndComplaints = async () => {
    setVitalsLoading(true);
    try {
      // Fetch vitals for this appointment - try appointment_id first
      let vitals: any = null;
      const { data: vitalsById } = await supabase
        .from('vitals')
        .select('*')
        .eq('patient_id', patientId)
        .eq('appointment_id', appointmentId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      vitals = vitalsById;

      // If not found by appointment_id, try encounter_id
      if (!vitals && encounterId) {
        const { data: vitalsByEnc } = await supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', patientId)
          .eq('encounter_id', encounterId)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        vitals = vitalsByEnc;
      }

      // If still not found, try latest vitals for this patient
      if (!vitals) {
        const { data: latestVitals } = await supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', patientId)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        vitals = latestVitals;
      }

      // If no vitals in vitals table, fall back to patient record
      if (!vitals) {
        const { data: patientVitals } = await supabase
          .from('patients')
          .select('bp_systolic, bp_diastolic, pulse, temperature, spo2, respiratory_rate, weight, height, bmi, random_blood_sugar, vital_notes')
          .eq('id', patientId)
          .single();
        if (patientVitals && (patientVitals.bp_systolic || patientVitals.pulse || patientVitals.temperature || patientVitals.weight || patientVitals.height || patientVitals.spo2)) {
          vitals = {
            blood_pressure_systolic: patientVitals.bp_systolic,
            blood_pressure_diastolic: patientVitals.bp_diastolic,
            heart_rate: patientVitals.pulse,
            temperature: patientVitals.temperature,
            oxygen_saturation: patientVitals.spo2,
            respiratory_rate: patientVitals.respiratory_rate,
            weight: patientVitals.weight,
            height: patientVitals.height,
            blood_glucose: patientVitals.random_blood_sugar,
            notes: patientVitals.vital_notes,
            recorded_at: null
          };
        }
      }
      setVitalsData(vitals);

      // Fetch clinical notes (complaints) for this appointment
      let notes: any = null;
      const { data: notesById } = await supabase
        .from('clinical_notes')
        .select('chief_complaint, history_of_present_illness, physical_examination, assessment, clinical_impression, doctor_notes')
        .eq('patient_id', patientId)
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      notes = notesById;

      // If not found by appointment_id, try encounter_id
      if (!notes && encounterId) {
        const { data: notesByEnc } = await supabase
          .from('clinical_notes')
          .select('chief_complaint, history_of_present_illness, physical_examination, assessment, clinical_impression, doctor_notes')
          .eq('patient_id', patientId)
          .eq('encounter_id', encounterId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        notes = notesByEnc;
      }
      setComplaintsData(notes);

      // Fetch patient primary complaint
      const { data: patient } = await supabase
        .from('patients')
        .select('primary_complaint')
        .eq('id', patientId)
        .single();
      setPatientComplaint(patient?.primary_complaint || '');
    } catch (err) {
      console.error('Error fetching vitals/complaints:', err);
    } finally {
      setVitalsLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('is_active', true)
        .gt('available_stock', 0)
        .order('name');
      
      if (!error && data) {
        setMedications(data);
      }
    } catch (err) {
      console.error('Error loading medications:', err);
    }
  };

  const fetchRadiologyCatalog = async () => {
    try {
      const catalog = await getRadiologyTestCatalog();
      setRadCatalog(catalog || []);
    } catch (err) {
      console.error('Error loading radiology catalog:', err);
    }
  };

  const fetchLabCatalog = async () => {
    try {
      const catalog = await getLabTestCatalog();
      setLabCatalog(catalog || []);
    } catch (err) {
      console.error('Error loading lab catalog:', err);
    }
  };

  const searchMedications = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    const filtered = medications.filter(med => 
      med.name.toLowerCase().includes(term.toLowerCase()) ||
      (med.generic_name && med.generic_name.toLowerCase().includes(term.toLowerCase()))
    );
    setSearchResults(filtered);
  };

  const addMedicationToPrescription = (medication: any) => {
    const newItem: PrescriptionItem = {
      medication_id: medication.id,
      medication_name: medication.name,
      generic_name: medication.generic_name || '',
      dosage: '',
      frequency_times: [],
      meal_timing: '',
      duration_days: 1,
      instructions: '',
      quantity: 0,
      auto_calculate_quantity: true,
      stock_quantity: medication.available_stock || 0
    };
    
    setPrescriptions((prev) => {
      const next = [...prev, newItem];
      const newIndex = next.length - 1;
      setExpandedPrescriptionIndexes((expanded) => Array.from(new Set([...expanded, newIndex])));
      return next;
    });
    setSearchTerm('');
    setSearchResults([]);
    setShowMedicationSearch(true);
  };

  const togglePrescriptionExpanded = (index: number) => {
    setExpandedPrescriptionIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const removePrescriptionAtIndex = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
    setExpandedPrescriptionIndexes((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    );
  };

  const calculateAutoQuantity = (frequencyTimes: string[], durationDays: number) => {
    return frequencyTimes.length * durationDays;
  };

  const formatFrequency = (frequencyTimes: string[]) => {
    if (!frequencyTimes || frequencyTimes.length === 0) return '';
    return frequencyTimes.join(', ');
  };

  const formatMealTiming = (mealTiming: string) => {
    if (!mealTiming) return null;
    switch (mealTiming) {
      case 'before_meal':
        return 'before food';
      case 'after_meal':
        return 'after food';
      case 'with_meal':
        return 'with food';
      case 'empty_stomach':
        return 'empty stomach';
      default:
        return mealTiming;
    }
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updatedItems = [...prescriptions];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (updatedItems[index].auto_calculate_quantity && 
        (field === 'frequency_times' || field === 'duration_days')) {
      const autoQuantity = calculateAutoQuantity(
        updatedItems[index].frequency_times, 
        updatedItems[index].duration_days
      );
      updatedItems[index].quantity = autoQuantity;
    }
    
    setPrescriptions(updatedItems);
  };

  // Injection Functions
  const searchInjections = (term: string) => {
    if (!term.trim()) {
      setInjectionSearchResults([]);
      return;
    }
    const filtered = medications.filter(med =>
      (med.dosage_form?.toLowerCase() === 'injection' || med.category?.toLowerCase() === 'injection') &&
      (med.name.toLowerCase().includes(term.toLowerCase()) ||
        (med.generic_name && med.generic_name.toLowerCase().includes(term.toLowerCase())))
    );
    // Also search all medications if no injection-specific results
    if (filtered.length === 0) {
      const allFiltered = medications.filter(med =>
        med.name.toLowerCase().includes(term.toLowerCase()) ||
        (med.generic_name && med.generic_name.toLowerCase().includes(term.toLowerCase()))
      );
      setInjectionSearchResults(allFiltered);
    } else {
      setInjectionSearchResults(filtered);
    }
  };

  const addInjectionToList = (medication: any) => {
    const newItem: PrescriptionItem = {
      medication_id: medication.id,
      medication_name: medication.name,
      generic_name: medication.generic_name || '',
      dosage: medication.strength || '',
      frequency_times: [],
      meal_timing: '',
      duration_days: 1,
      instructions: '',
      quantity: 1,
      auto_calculate_quantity: false,
      stock_quantity: medication.available_stock || 0
    };
    setInjectionItems((prev) => {
      const next = [...prev, newItem];
      const newIndex = next.length - 1;
      setExpandedInjectionIndexes((expanded) => Array.from(new Set([...expanded, newIndex])));
      return next;
    });
    setInjectionSearchTerm('');
    setInjectionSearchResults([]);
    setShowInjectionSearch(true);
  };

  const handleAddNewInjection = async () => {
    if (!newInjectionName.trim() || !newInjectionDosage.trim()) return;
    try {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const medicationCode = `INJ${timestamp}${random}`;

      const { data: newInj, error } = await supabase
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

      if (error) throw error;

      setMedications(prev => [...prev, newInj]);
      addInjectionToList(newInj);
      setNewInjectionName('');
      setNewInjectionDosage('');
      setIsAddingNewInjection(false);
    } catch (err) {
      console.error('Error adding new injection:', err);
    }
  };

  const toggleInjectionExpanded = (index: number) => {
    setExpandedInjectionIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const removeInjectionAtIndex = (index: number) => {
    setInjectionItems((prev) => prev.filter((_, i) => i !== index));
    setExpandedInjectionIndexes((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  };

  const updateInjectionItem = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updatedItems = [...injectionItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setInjectionItems(updatedItems);
  };

  const addLabRow = () => {
    setSelectedLabTests(prev => [...prev, { testId: '', testName: '', groupName: '', clinicalIndication: '', specialInstructions: '' }]);
  };

  const removeLabRow = (index: number) => {
    setSelectedLabTests(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleLabTestChange = (index: number, testId: string) => {
    const test = labCatalog.find(t => t.id === testId);
    if (!test) return;

    setSelectedLabTests(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        testId: test.id,
        testName: test.test_name,
        groupName: test.category || 'N/A'
      };
      return next;
    });
  };

  const handleLabRowFieldChange = (
    index: number,
    field: 'clinicalIndication' | 'specialInstructions',
    value: string
  ) => {
    setSelectedLabTests(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCreateNewLabTest = async () => {
    if (!newLabTestData.testName || !newLabTestData.groupName) {
      setError('Test name and group name are required.');
      return;
    }
    try {
      setCreatingLabTest(true);
      const newEntry = await createLabTestCatalogEntry({
        test_name: newLabTestData.testName,
        category: newLabTestData.groupName,
        test_cost: 0
      });

      setLabCatalog(prev => [...prev, newEntry]);

      // Auto-select into first empty row
      setSelectedLabTests(prev => {
        const next = [...prev];
        const emptyIndex = next.findIndex(t => !t.testId);
        const selection = {
          testId: newEntry.id,
          testName: newEntry.test_name,
          groupName: newEntry.category || 'N/A',
          clinicalIndication: '',
          specialInstructions: ''
        };
        if (emptyIndex !== -1) next[emptyIndex] = selection;
        else next.push(selection);
        return next;
      });

      setNewLabTestData({ testName: '', groupName: '' });
      setShowNewLabTestModal(false);
    } catch (err) {
      console.error('Error creating lab test:', err);
      setError('Failed to create new test catalog entry.');
    } finally {
      setCreatingLabTest(false);
    }
  };

  const addXrayRow = () => {
    setSelectedXrayTests(prev => [...prev, { testId: '', testName: '', groupName: '', bodyPart: '', clinicalIndication: '', specialInstructions: '' }]);
  };

  const removeXrayRow = (index: number) => {
    setSelectedXrayTests(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleXrayTestChange = (index: number, testId: string) => {
    const test = radCatalog.find(t => t.id === testId);
    if (!test) return;

    setSelectedXrayTests(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        testId: test.id,
        testName: test.test_name,
        groupName: test.modality || 'X-Ray',
        bodyPart: test.body_part || ''
      };
      return next;
    });
  };

  const handleXrayBodyPartChange = (index: number, bodyPart: string) => {
    setSelectedXrayTests(prev => {
      const next = [...prev];
      next[index] = { ...next[index], bodyPart };
      return next;
    });
  };

  const handleXrayRowFieldChange = (
    index: number,
    field: 'clinicalIndication' | 'specialInstructions',
    value: string
  ) => {
    setSelectedXrayTests(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCreateNewXrayTest = async () => {
    if (!newXrayTestData.testName || !newXrayTestData.groupName) {
      setError('Procedure name and modality are required.');
      return;
    }
    try {
      setCreatingXrayTest(true);
      const newEntry = await createRadiologyTestCatalogEntry({
        test_name: newXrayTestData.testName,
        modality: newXrayTestData.groupName,
        test_cost: 0
      });

      setRadCatalog(prev => [...prev, newEntry]);

      // Auto-select into first empty row
      setSelectedXrayTests(prev => {
        const next = [...prev];
        const emptyIndex = next.findIndex(t => !t.testId);
        const selection = {
          testId: newEntry.id,
          testName: newEntry.test_name,
          groupName: newEntry.modality || 'X-Ray',
          bodyPart: newEntry.body_part || '',
          clinicalIndication: '',
          specialInstructions: ''
        };
        if (emptyIndex !== -1) next[emptyIndex] = selection;
        else next.push(selection);
        return next;
      });

      setNewXrayTestData({ testName: '', groupName: '' });
      setShowNewXrayTestModal(false);
    } catch (err) {
      console.error('Error creating radiology test:', err);
      setError('Failed to create new radiology catalog entry.');
    } finally {
      setCreatingXrayTest(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save Clinical Notes
      const notesData = mapClinicalNotesToDB(clinicalNotes);

      if (notesData.doctor_notes) {
        const { error: notesError } = await supabase
          .from('clinical_notes')
          .insert([{
            encounter_id: encounterId,
            appointment_id: appointmentId,
            doctor_id: doctorId,
            patient_id: patientId,
            ...notesData
          }]);

        if (notesError) throw notesError;
      }

      // Save Lab Tests
      const validLabRows = selectedLabTests.filter(t => t.testId);
      if (validLabRows.length > 0) {
        try {
          const labRecords = validLabRows.map((t, idx) => {
            const now = new Date();
            const today = now.toISOString().slice(0, 10).replace(/-/g, '');
            const ms = String(now.getMilliseconds()).padStart(3, '0');
            const orderNumber = `LAB-${today}-${String(idx + 1).padStart(4, '0')}-${ms}`;
            return {
              order_number: orderNumber,
              encounter_id: encounterId,
              appointment_id: appointmentId,
              patient_id: patientId,
              ordering_doctor_id: doctorId,
              test_catalog_id: t.testId,
              clinical_indication: t.clinicalIndication || 'N/A',
              special_instructions: t.specialInstructions,
              urgency: labUrgency
            };
          });

          const { error: labError } = await supabase
            .from('lab_test_orders')
            .insert(labRecords);

          if (labError) {
            try {
              console.error('Lab test orders error:', {
                message: labError?.message,
                details: labError?.details,
                hint: labError?.hint,
                code: labError?.code,
                raw: labError,
                stringified: JSON.stringify(labError, (key, value) => {
                  if (typeof value === 'function') return '[Function]';
                  if (value instanceof Error) return value.toString();
                  return value;
                }, 2),
                keys: Object.getOwnPropertyNames(labError || {}),
                constructor: labError?.constructor?.name
              });
              console.dir(labError, { depth: 3 });
            } catch (logErr) {
              console.error('Failed to log lab error:', logErr);
              console.error('Original lab error:', labError);
            }
            throw labError;
          }
        } catch (labErr: any) {
          console.error('Failed to save lab tests:', labErr);
          // Continue without failing the entire form
        }
      }

      // Save X-ray Orders
      const validXrayRows = selectedXrayTests.filter(t => t.testId);
      if (validXrayRows.length > 0) {
        try {
          const xrayRecords = validXrayRows.map((t, idx) => {
            const now = new Date();
            const today = now.toISOString().slice(0, 10).replace(/-/g, '');
            const ms = String(now.getMilliseconds()).padStart(3, '0');
            const orderNumber = `RAD-${today}-${String(idx + 1).padStart(4, '0')}-${ms}`;
            return {
              order_number: orderNumber,
              encounter_id: encounterId,
              appointment_id: appointmentId,
              patient_id: patientId,
              ordering_doctor_id: doctorId,
              test_catalog_id: t.testId,
              clinical_indication: t.clinicalIndication || 'N/A',
              special_instructions: t.specialInstructions,
              body_part: t.bodyPart,
              urgency: xrayUrgency
            };
          });

          const { error: xrayError } = await supabase
            .from('radiology_test_orders')
            .insert(xrayRecords);

          if (xrayError) {
            try {
              console.error('Radiology test orders error:', {
                message: xrayError?.message,
                details: xrayError?.details,
                hint: xrayError?.hint,
                code: xrayError?.code,
                raw: xrayError,
                stringified: JSON.stringify(xrayError, (key, value) => {
                  if (typeof value === 'function') return '[Function]';
                  if (value instanceof Error) return value.toString();
                  return value;
                }, 2),
                keys: Object.getOwnPropertyNames(xrayError || {}),
                constructor: xrayError?.constructor?.name
              });
              console.dir(xrayError, { depth: 3 });
            } catch (logErr) {
              console.error('Failed to log xray error:', logErr);
              console.error('Original xray error:', xrayError);
            }
            throw xrayError;
          }
        } catch (xrayErr: any) {
          console.error('Failed to save x-ray orders:', xrayErr);
          // Continue without failing the entire form
        }
      }

      // Save Prescriptions
      if (prescriptions.length > 0) {
        console.log('Prescription save context:', {
          encounterId,
          appointmentId,
          patientId,
          doctorId,
          prescriptionsCount: prescriptions.length
        });

        const medicines = prescriptions.map(prescription => ({
          medication_id: prescription.medication_id,
          medicine_name: prescription.medication_name,
          dosage: prescription.dosage || 'As prescribed',
          frequency: formatFrequency(prescription.frequency_times),
          duration: `${prescription.duration_days} days`,
          quantity: prescription.auto_calculate_quantity
            ? calculateAutoQuantity(prescription.frequency_times, prescription.duration_days)
            : prescription.quantity,
          instructions: prescription.instructions || ''
        }));

        const prescriptionData: PrescriptionData = {
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_id: appointmentId,
          encounter_id: encounterId,
          medicines,
          instructions: 'Prescribed during clinical encounter'
        };

        console.log('Prescription data to save:', prescriptionData);

        const { error: prescriptionsError } = await createPrescription(prescriptionData);
        if (prescriptionsError) throw prescriptionsError;
      }

      // Save Injections (as prescriptions with injection type)
      if (injectionItems.length > 0) {
        try {
          const injectionMedicines = injectionItems.map(inj => ({
            medication_id: inj.medication_id,
            medicine_name: inj.medication_name,
            dosage: inj.dosage || 'As prescribed',
            frequency: formatFrequency(inj.frequency_times),
            duration: `${inj.duration_days} days`,
            quantity: inj.quantity || 1,
            instructions: inj.instructions || 'Injection'
          }));

          const injectionPrescriptionData: PrescriptionData = {
            patient_id: patientId,
            doctor_id: doctorId,
            appointment_id: appointmentId,
            encounter_id: encounterId,
            medicines: injectionMedicines,
            instructions: 'Injection prescribed during clinical encounter'
          };

          const { error: injectionError } = await createPrescription(injectionPrescriptionData);
          if (injectionError) {
            console.error('Failed to save injections:', injectionError);
          }
        } catch (injErr) {
          console.error('Error saving injections:', injErr);
        }
      }

      // Save Follow-up
      if (followUp.follow_up_date && followUp.reason) {
        const { error: followUpError } = await supabase
          .from('follow_up_appointments')
          .insert([{
            encounter_id: encounterId,
            appointment_id: appointmentId,
            patient_id: patientId,
            doctor_id: doctorId,
            ...followUp
          }]);

        if (followUpError) throw followUpError;
      }

      // Update appointment status to completed
      const completedAppointmentStatusId = '5ccb55a0-46cd-4610-8d70-b1049de293ef';
      const { error: appointmentStatusError } = await supabase
        .from('appointment')
        .update({ status_id: completedAppointmentStatusId })
        .eq('id', appointmentId);

      if (appointmentStatusError) {
        console.error('Failed to update appointment status:', {
          message: appointmentStatusError?.message,
          details: appointmentStatusError?.details,
          hint: appointmentStatusError?.hint,
          code: appointmentStatusError?.code,
          raw: appointmentStatusError,
          stringified: JSON.stringify(appointmentStatusError, (key, value) => {
            if (typeof value === 'function') return '[Function]';
            if (value instanceof Error) return value.toString();
            return value;
          }, 2),
          keys: Object.getOwnPropertyNames(appointmentStatusError || {}),
          constructor: appointmentStatusError?.constructor?.name
        });
        // Don't fail the whole operation, just log it
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      const supabaseError = err;
      // Guaranteed fallback logging
      console.error('Raw error object:', supabaseError);
      console.dir(supabaseError, { depth: 5 });
      
      try {
        console.error('Error saving clinical data:', {
          message: supabaseError?.message,
          details: supabaseError?.details,
          hint: supabaseError?.hint,
          code: supabaseError?.code,
          raw: supabaseError,
          stringified: JSON.stringify(supabaseError, (key, value) => {
            if (typeof value === 'function') return '[Function]';
            if (value instanceof Error) return value.toString();
            return value;
          }, 2),
          keys: Object.getOwnPropertyNames(supabaseError || {}),
          constructor: supabaseError?.constructor?.name
        });
        console.dir(supabaseError, { depth: 3 });
      } catch (logErr) {
        console.error('Failed to log error details:', logErr);
        console.error('Original error:', supabaseError);
        console.dir(supabaseError, { depth: 3 });
      }
      setError(supabaseError?.message || 'Failed to save clinical data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const clinicalNotesSections = [
    { key: 'present_complaints', label: 'Present Complaints', rows: 3 },
    { key: 'history_present_illness', label: 'History of Present Illness', rows: 4 },
    { key: 'past_history', label: 'Past History', rows: 3 },
    { key: 'family_history', label: 'Family History', rows: 3 },
    { key: 'personal_history', label: 'Personal History', rows: 3 },
    { key: 'examination_notes', label: 'Physical Examination (General + Systemic)', rows: 6 },
    { key: 'provisional_diagnosis', label: 'Provisional Diagnosis', rows: 2 },
    { key: 'investigation_summary', label: 'Investigations (Summary)', rows: 3 },
    { key: 'treatment_plan', label: 'Treatment Plan', rows: 3 },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Clinical Entry Form 2.0</h2>
                <p className="text-gray-600 text-sm">
                  Patient: {patientName} • ID: {patientUHID}
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-white font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {/* Vitals & Complaints Tab */}
          {activeTab === 'vitals' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {vitalsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-500">Loading vitals & complaints...</span>
                </div>
              ) : (
                <>
                  {/* Vitals Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
                      {vitalsData?.recorded_at && (
                        <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(vitalsData.recorded_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {vitalsData ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {vitalsData.blood_pressure_systolic != null && (
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Blood Pressure</p>
                            <p className="text-xl font-bold text-red-700 mt-1">{vitalsData.blood_pressure_systolic}/{vitalsData.blood_pressure_diastolic}</p>
                            <p className="text-[10px] text-red-400">mmHg</p>
                          </div>
                        )}
                        {vitalsData.heart_rate != null && (
                          <div className="bg-pink-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider">Heart Rate</p>
                            <p className="text-xl font-bold text-pink-700 mt-1">{vitalsData.heart_rate}</p>
                            <p className="text-[10px] text-pink-400">bpm</p>
                          </div>
                        )}
                        {vitalsData.temperature != null && (
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">Temperature</p>
                            <p className="text-xl font-bold text-orange-700 mt-1">{vitalsData.temperature}</p>
                            <p className="text-[10px] text-orange-400">&deg;F</p>
                          </div>
                        )}
                        {vitalsData.oxygen_saturation != null && (
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">SpO2</p>
                            <p className="text-xl font-bold text-blue-700 mt-1">{vitalsData.oxygen_saturation}%</p>
                            <p className="text-[10px] text-blue-400">Oxygen</p>
                          </div>
                        )}
                        {vitalsData.respiratory_rate != null && (
                          <div className="bg-teal-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">Resp. Rate</p>
                            <p className="text-xl font-bold text-teal-700 mt-1">{vitalsData.respiratory_rate}</p>
                            <p className="text-[10px] text-teal-400">breaths/min</p>
                          </div>
                        )}
                        {vitalsData.weight != null && (
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">Weight</p>
                            <p className="text-xl font-bold text-green-700 mt-1">{vitalsData.weight}</p>
                            <p className="text-[10px] text-green-400">kg</p>
                          </div>
                        )}
                        {vitalsData.height != null && (
                          <div className="bg-indigo-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Height</p>
                            <p className="text-xl font-bold text-indigo-700 mt-1">{vitalsData.height}</p>
                            <p className="text-[10px] text-indigo-400">cm</p>
                          </div>
                        )}
                        {vitalsData.blood_glucose != null && (
                          <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Blood Glucose</p>
                            <p className="text-xl font-bold text-amber-700 mt-1">{vitalsData.blood_glucose}</p>
                            <p className="text-[10px] text-amber-400">mg/dL</p>
                          </div>
                        )}
                        {vitalsData.pain_scale != null && (
                          <div className="bg-purple-50 rounded-lg p-3 text-center">
                            <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Pain Scale</p>
                            <p className="text-xl font-bold text-purple-700 mt-1">{vitalsData.pain_scale}/10</p>
                            <p className="text-[10px] text-purple-400">severity</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No vitals recorded for this appointment</p>
                      </div>
                    )}
                    {vitalsData?.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{vitalsData.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Complaints Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <Stethoscope className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Complaints & History</h3>
                    </div>
                    {(patientComplaint || complaintsData) ? (
                      <div className="space-y-4">
                        {patientComplaint && (
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-1">Primary Complaint (Registration)</p>
                            <p className="text-sm text-purple-900">{patientComplaint}</p>
                          </div>
                        )}
                        {complaintsData?.chief_complaint && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Chief Complaint</p>
                            <p className="text-sm text-blue-900">{complaintsData.chief_complaint}</p>
                          </div>
                        )}
                        {complaintsData?.history_of_present_illness && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">History of Present Illness</p>
                            <p className="text-sm text-gray-700">{complaintsData.history_of_present_illness}</p>
                          </div>
                        )}
                        {complaintsData?.physical_examination && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Physical Examination</p>
                            <p className="text-sm text-gray-700">{complaintsData.physical_examination}</p>
                          </div>
                        )}
                        {complaintsData?.assessment && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assessment / Provisional Diagnosis</p>
                            <p className="text-sm text-gray-700">{complaintsData.assessment}</p>
                          </div>
                        )}
                        {complaintsData?.clinical_impression && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Clinical Impression</p>
                            <p className="text-sm text-gray-700">{complaintsData.clinical_impression}</p>
                          </div>
                        )}
                        {complaintsData?.doctor_notes && (
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Doctor Notes</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{complaintsData.doctor_notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No complaints recorded for this appointment</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Clinical Notes Tab - IP Case Sheet Style */}
          {activeTab === 'notes' && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-800">Case Sheet</h3>
                  <p className="text-sm text-gray-500 ml-auto">
                    Date: {new Date().toLocaleDateString('en-IN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                <div className="space-y-6">
                  {clinicalNotesSections.map((section) => (
                    <div key={section.key} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {section.label}
                      </label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                        rows={section.rows}
                        value={clinicalNotes[section.key as keyof ClinicalNotes]}
                        onChange={(e) => setClinicalNotes({ 
                          ...clinicalNotes, 
                          [section.key]: e.target.value 
                        })}
                        placeholder={`Enter ${section.label.toLowerCase()}...`}
                        data-allow-enter="true"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lab Tests Tab - Lab Test Selection Style */}
          {activeTab === 'lab' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Lab Test Selection</h3>
                      <p className="text-sm text-gray-500">Add required diagnostics for clinical analysis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewLabTestModal(true)}
                      className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Catalog Entry
                    </button>
                    <button
                      type="button"
                      onClick={addLabRow}
                      className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Row
                    </button>
                  </div>
                </div>

                <div className="bg-teal-50 rounded-xl p-6 space-y-4 border border-teal-100">
                  {selectedLabTests.map((row, index) => {
                    const options = labCatalog.map((t) => ({
                      value: t.id,
                      label: t.test_name,
                      group: t.category || 'N/A'
                    }));

                    return (
                      <div key={index} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                              Test Name
                            </label>
                            <SearchableSelect
                              options={options}
                              value={row.testId}
                              onChange={(val) => handleLabTestChange(index, val)}
                              placeholder="Search & Select Test..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                              Group Name
                            </label>
                            <input
                              type="text"
                              value={row.groupName || 'N/A'}
                              readOnly
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
                            />
                          </div>

                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                                Urgency
                              </label>
                              <select
                                value={labUrgency}
                                onChange={(e) => setLabUrgency(e.target.value as any)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                              >
                                <option value="routine">Routine</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat">STAT</option>
                                <option value="emergency">Emergency</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLabRow(index)}
                              disabled={selectedLabTests.length === 1}
                              className="h-[46px] w-[46px] flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove row"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Clinical Indication</label>
                            <textarea
                              value={row.clinicalIndication}
                              onChange={(e) => handleLabRowFieldChange(index, 'clinicalIndication', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                              placeholder="Reason for this test..."
                              data-allow-enter="true"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Special Instructions</label>
                            <textarea
                              value={row.specialInstructions}
                              onChange={(e) => handleLabRowFieldChange(index, 'specialInstructions', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                              placeholder="Any special instructions"
                              data-allow-enter="true"
                            />
                          </div>
                        </div>

                        {index !== selectedLabTests.length - 1 && (
                          <div className="border-t border-teal-100" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lab Tests List */}
              {selectedLabTests.filter(t => t.testId).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Selected Lab Tests ({selectedLabTests.filter(t => t.testId).length})</h3>
                  {selectedLabTests.filter(t => t.testId).map((test, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{test.testName}</span>
                          {test.groupName && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700">
                              {test.groupName}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            labUrgency === 'emergency' ? 'bg-red-100 text-red-700' :
                            labUrgency === 'stat' ? 'bg-orange-100 text-orange-700' :
                            labUrgency === 'urgent' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {labUrgency}
                          </span>
                        </div>
                        {test.clinicalIndication && (
                          <p className="text-sm text-gray-500">{test.clinicalIndication}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeLabRow(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* X-Ray Tab - Radiological Procedures Style */}
          {activeTab === 'xray' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Radiological Procedures</h3>
                      <p className="text-sm text-gray-500">Select modality and body regions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewXrayTestModal(true)}
                      className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Catalog
                    </button>
                    <button
                      type="button"
                      onClick={addXrayRow}
                      className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Row
                    </button>
                  </div>
                </div>

                <div className="bg-teal-50 rounded-xl p-6 space-y-4 border border-teal-100">
                  {selectedXrayTests.map((row, index) => {
                    const options = radCatalog.map((t) => ({
                      value: t.id,
                      label: t.test_name,
                      group: t.modality || 'X-Ray',
                      subLabel: t.body_part || ''
                    }));

                    return (
                      <div key={index} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                              Procedure Name
                            </label>
                            <SearchableSelect
                              options={options}
                              value={row.testId}
                              onChange={(val) => handleXrayTestChange(index, val)}
                              placeholder="CHOOSE SCAN..."
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                              Modality
                            </label>
                            <input
                              type="text"
                              value={row.groupName || 'IMAGE'}
                              readOnly
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
                            />
                          </div>

                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                                Priority / Scan
                              </label>
                              <select
                                value={xrayUrgency}
                                onChange={(e) => setXrayUrgency(e.target.value as any)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                              >
                                <option value="routine">Routine</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat">STAT</option>
                                <option value="emergency">Emergency</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeXrayRow(index)}
                              disabled={selectedXrayTests.length === 1}
                              className="h-[46px] w-[46px] flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove row"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                            Specific Region / View Details
                          </label>
                          <textarea
                            value={row.bodyPart}
                            onChange={(e) => handleXrayBodyPartChange(index, e.target.value)}
                            rows={2}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            placeholder="E.g. AP & LATERAL, OBLIQUE VIEW, CONTRAST REQUIRED"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Clinical Instruction</label>
                            <textarea
                              value={row.clinicalIndication}
                              onChange={(e) => handleXrayRowFieldChange(index, 'clinicalIndication', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                              placeholder="INDICATIONS FOR THIS SCAN..."
                              data-allow-enter="true"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Radiation Safety / Consents</label>
                            <textarea
                              value={row.specialInstructions}
                              onChange={(e) => handleXrayRowFieldChange(index, 'specialInstructions', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                              placeholder="Any special instructions / consent notes"
                              data-allow-enter="true"
                            />
                          </div>
                        </div>

                        {index !== selectedXrayTests.length - 1 && (
                          <div className="border-t border-teal-100" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-ray Orders List */}
              {selectedXrayTests.filter(t => t.testId).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Selected Scans ({selectedXrayTests.filter(t => t.testId).length})</h3>
                  {selectedXrayTests.filter(t => t.testId).map((xray, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between hover:shadow-md transition-shadow">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-gray-900">{xray.testName}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700 uppercase">
                            {xray.groupName || 'IMAGE'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            xrayUrgency === 'emergency' ? 'bg-red-100 text-red-700' :
                            xrayUrgency === 'stat' ? 'bg-orange-100 text-orange-700' :
                            xrayUrgency === 'urgent' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {xrayUrgency}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{xray.bodyPart}</p>
                        {xray.clinicalIndication && (
                          <p className="text-sm text-gray-500 mt-1">{xray.clinicalIndication}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeXrayRow(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prescriptions Tab - Exact PrescriptionForm Style */}
          {activeTab === 'prescriptions' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Prescribed Medications</h3>
                  <button
                    onClick={() => setShowMedicationSearch(!showMedicationSearch)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Medication
                  </button>
                </div>

                {showMedicationSearch && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          searchMedications(e.target.value);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Search medications by name, generic name, or category..."
                      />
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                        {searchResults.map((medication) => (
                          <div
                            key={medication.id}
                            onClick={() => addMedicationToPrescription(medication)}
                            className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{medication.name}</p>
                                <p className="text-sm text-gray-600">{medication.generic_name}</p>
                                <p className="text-xs text-gray-500">
                                  {medication.strength} • {medication.dosage_form}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Stock: {medication.available_stock || 0}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Prescription Items */}
                {prescriptions.length > 0 && (
                  <div className="space-y-4">
                    {prescriptions.map((item, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePrescriptionExpanded(index)}
                          className="w-full p-4 flex items-start justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex-1 pr-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-medium text-gray-900">{item.medication_name}</h4>
                                {item.generic_name && (
                                  <p className="text-sm text-gray-600">{item.generic_name}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 text-xs rounded-full border ${
                                    item.stock_quantity > 10
                                      ? 'bg-green-50 border-green-200 text-green-700'
                                      : item.stock_quantity > 0
                                        ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                        : 'bg-red-50 border-red-200 text-red-700'
                                  }`}
                                >
                                  Stock: {item.stock_quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removePrescriptionAtIndex(index);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-2 text-xs text-gray-500">
                              {item.frequency_times.length > 0 ? `Freq: ${item.frequency_times.join(', ')}` : 'Freq: —'}
                              {' • '}
                              {item.duration_days ? `Duration: ${item.duration_days}d` : 'Duration: —'}
                            </div>
                          </div>

                          <div className="pt-1 text-gray-500">
                            {expandedPrescriptionIndexes.includes(index) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>

                        {expandedPrescriptionIndexes.includes(index) && (
                          <div className="p-4 border-t border-gray-200">
                        
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-800">Current Stock:</span>
                                <span className={`text-sm font-bold ${item.stock_quantity > 10 ? 'text-green-600' : item.stock_quantity > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {item.stock_quantity} units available
                                </span>
                              </div>
                            </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Duration (Days) *</label>
                            <input
                              type="number"
                              min="1"
                              value={item.duration_days}
                              onChange={(e) => updatePrescriptionItem(index, 'duration_days', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={item.instructions}
                            onChange={(e) => updatePrescriptionItem(index, 'instructions', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                            placeholder="e.g., Take after meals, Avoid alcohol, Complete the full course"
                            rows={2}
                            data-allow-enter="true"
                          />
                        </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {prescriptions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No medications added yet. Click "Add Medication" to start prescribing.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Injections Tab */}
          {activeTab === 'injections' && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Syringe className="h-5 w-5 text-blue-600" />
                    Injections
                  </h3>
                  <button
                    onClick={() => setShowInjectionSearch(!showInjectionSearch)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Injection
                  </button>
                </div>

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
                                  document.getElementById('cf2-injection-dosage-input')?.focus();
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
                              id="cf2-injection-dosage-input"
                              type="text"
                              value={newInjectionDosage}
                              onChange={(e) => setNewInjectionDosage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddNewInjection();
                                } else if (e.key === 'Escape') {
                                  setIsAddingNewInjection(false);
                                  setNewInjectionName('');
                                  setNewInjectionDosage('');
                                }
                              }}
                              className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Dosage (e.g., 500mg, 1ml)..."
                            />
                            <button
                              type="button"
                              onClick={handleAddNewInjection}
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
                            value={injectionSearchTerm}
                            onChange={(e) => {
                              setInjectionSearchTerm(e.target.value);
                              searchInjections(e.target.value);
                            }}
                            className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Search injections by name, generic name, or category..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewInjection(true);
                              setInjectionSearchTerm('');
                              setInjectionSearchResults([]);
                            }}
                            className="absolute right-2 top-2 p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Add new injection"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {injectionSearchResults.length > 0 && !isAddingNewInjection && (
                      <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                        {injectionSearchResults.map((medication) => (
                          <div
                            key={medication.id}
                            onClick={() => addInjectionToList(medication)}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{medication.name}</p>
                                <p className="text-sm text-gray-600">{medication.generic_name}</p>
                                <p className="text-xs text-gray-500">
                                  {medication.strength} • {medication.dosage_form}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Stock: {medication.available_stock || 0}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Injection Items */}
                {injectionItems.length > 0 && (
                  <div className="space-y-4">
                    {injectionItems.map((item, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleInjectionExpanded(index)}
                          className="w-full p-4 flex items-start justify-between hover:bg-gray-50 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex-1 pr-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-medium text-gray-900">{item.medication_name}</h4>
                                {item.generic_name && (
                                  <p className="text-sm text-gray-600">{item.generic_name}</p>
                                )}
                                {item.dosage && (
                                  <p className="text-xs text-blue-600 mt-0.5">Dosage: {item.dosage}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-xs rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                                  Qty: {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeInjectionAtIndex(index);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="pt-1 text-gray-500">
                            {expandedInjectionIndexes.includes(index) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>

                        {expandedInjectionIndexes.includes(index) && (
                          <div className="p-4 border-t border-gray-200 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Dosage</label>
                                <input
                                  type="text"
                                  value={item.dosage}
                                  onChange={(e) => updateInjectionItem(index, 'dosage', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="e.g., 500mg, 1ml"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateInjectionItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Duration (Days)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.duration_days}
                                  onChange={(e) => updateInjectionItem(index, 'duration_days', parseInt(e.target.value) || 1)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">Frequency</label>
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
                                        updateInjectionItem(index, 'frequency_times', newTimes);
                                      }}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{time}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                              <textarea
                                value={item.instructions}
                                onChange={(e) => updateInjectionItem(index, 'instructions', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                placeholder="e.g., IM injection, IV drip over 30 mins, SC injection..."
                                rows={2}
                                data-allow-enter="true"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {injectionItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Syringe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No injections added yet. Click &quot;Add Injection&quot; to start.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Tab */}
          {activeTab === 'followup' && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Schedule Follow-up Appointment</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date *
                      </label>
                      <input
                        type="date"
                        value={followUp.follow_up_date}
                        onChange={(e) => setFollowUp({ ...followUp, follow_up_date: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Time
                      </label>
                      <input
                        type="time"
                        value={followUp.follow_up_time}
                        onChange={(e) => setFollowUp({ ...followUp, follow_up_time: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={followUp.priority}
                        onChange={(e) => setFollowUp({ ...followUp, priority: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="routine">Routine</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Follow-up *
                    </label>
                    <textarea
                      value={followUp.reason}
                      onChange={(e) => setFollowUp({ ...followUp, reason: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Reason for follow-up appointment"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions for Patient
                    </label>
                    <textarea
                      value={followUp.instructions}
                      onChange={(e) => setFollowUp({ ...followUp, instructions: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Instructions for patient before follow-up"
                      data-allow-enter="true"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Lab Catalog Modal */}
        {showNewLabTestModal && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">New Lab Catalog Entry</div>
                  <div className="text-xs text-slate-500">Create a new lab test for dropdown selection</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewLabTestModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-50 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Test Name</label>
                  <input
                    value={newLabTestData.testName}
                    onChange={(e) => setNewLabTestData({ ...newLabTestData, testName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., CBC, LFT, RBS"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Group Name</label>
                  <input
                    value={newLabTestData.groupName}
                    onChange={(e) => setNewLabTestData({ ...newLabTestData, groupName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., Hematology, Biochemistry"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewLabTestModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewLabTest}
                  disabled={creatingLabTest}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {creatingLabTest ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New X-ray Catalog Modal */}
        {showNewXrayTestModal && (
          <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">New Radiology Catalog Entry</div>
                  <div className="text-xs text-slate-500">Create a new procedure for dropdown selection</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewXrayTestModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-50 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Procedure Name</label>
                  <input
                    value={newXrayTestData.testName}
                    onChange={(e) => setNewXrayTestData({ ...newXrayTestData, testName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., Chest X-Ray, USG Abdomen"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Modality</label>
                  <input
                    value={newXrayTestData.groupName}
                    onChange={(e) => setNewXrayTestData({ ...newXrayTestData, groupName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., X-Ray, CT Scan, MRI"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewXrayTestModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewXrayTest}
                  disabled={creatingXrayTest}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {creatingXrayTest ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-white">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <p className="text-green-800 text-sm">Clinical data saved successfully!</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Clinical Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
