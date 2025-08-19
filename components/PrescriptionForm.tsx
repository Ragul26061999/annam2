'use client';

import React, { useState, useEffect } from 'react';
import { Medicine, PrescriptionMedicine, createPrescription, getMedicines, searchMedicines } from '../src/lib/prescriptionService';
import { Doctor } from '../src/lib/doctorService';
import { Appointment } from '../src/lib/appointmentService';

// Patient interface for prescription form
interface Patient {
  id: string;
  patient_id: string;
  name: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  allergies?: string;
}

interface PrescriptionFormProps {
  patient: Patient;
  doctor: Doctor;
  appointment?: Appointment;
  onSuccess: () => void;
  onCancel: () => void;
}

interface MedicineFormData {
  medicine_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
}

const PrescriptionForm: React.FC<PrescriptionFormProps> = ({
  patient,
  doctor,
  appointment,
  onSuccess,
  onCancel
}) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptionMedicines, setPrescriptionMedicines] = useState<MedicineFormData[]>([{
    medicine_id: '',
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: 1
  }]);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load available medicines
  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    setIsLoading(true);
    try {
      const { medicines: medicineList, error } = await getMedicines();
      if (error) {
        setError('Failed to load medicines');
      } else {
        setMedicines(medicineList);
      }
    } catch (err) {
      setError('Failed to load medicines');
    } finally {
      setIsLoading(false);
    }
  };

  // Search medicines
  const handleMedicineSearch = async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { medicines: results, error } = await searchMedicines(term);
      if (!error) {
        setSearchResults(results);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Add new medicine row
  const addMedicineRow = () => {
    setPrescriptionMedicines([...prescriptionMedicines, {
      medicine_id: '',
      medicine_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: 1
    }]);
  };

  // Remove medicine row
  const removeMedicineRow = (index: number) => {
    if (prescriptionMedicines.length > 1) {
      setPrescriptionMedicines(prescriptionMedicines.filter((_, i) => i !== index));
    }
  };

  // Update medicine in row
  const updateMedicine = (index: number, field: keyof MedicineFormData, value: string | number) => {
    const updated = [...prescriptionMedicines];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptionMedicines(updated);
  };

  // Select medicine from search
  const selectMedicine = (index: number, medicine: Medicine) => {
    const updated = [...prescriptionMedicines];
    updated[index] = {
      ...updated[index],
      medicine_id: medicine.id,
      medicine_name: medicine.name
    };
    setPrescriptionMedicines(updated);
    setSearchResults([]);
    setSearchTerm('');
  };

  // Submit prescription
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate form
      const validMedicines = prescriptionMedicines.filter(med => 
        med.medicine_id && med.dosage && med.frequency && med.duration
      );

      if (validMedicines.length === 0) {
        setError('Please add at least one medicine with complete details');
        return;
      }

      // Convert to prescription format
      const prescriptionMedicineData: PrescriptionMedicine[] = validMedicines.map(med => ({
        medicine_id: med.medicine_id,
        medicine_name: med.medicine_name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
        quantity: med.quantity
      }));

      // Create prescription
      const { prescription, error } = await createPrescription({
        patient_id: patient.id,
        doctor_id: doctor.id,
        appointment_id: appointment?.id,
        medicines: prescriptionMedicineData,
        instructions: generalInstructions
      });

      if (error) {
        setError('Failed to create prescription');
      } else {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to create prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyOptions = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'As needed',
    'Before meals',
    'After meals',
    'At bedtime'
  ];

  const durationOptions = [
    '3 days',
    '5 days',
    '7 days',
    '10 days',
    '14 days',
    '21 days',
    '30 days',
    '60 days',
    '90 days',
    'Until finished',
    'As needed'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">New Prescription</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Patient Info */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Name:</span> {patient.name}
              </div>
              <div>
                <span className="font-medium">Patient ID:</span> {patient.patient_id}
              </div>
              <div>
                <span className="font-medium">Age:</span> {patient.date_of_birth ? 
                  new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'N/A'}
              </div>
              <div>
                <span className="font-medium">Gender:</span> {patient.gender || 'N/A'}
              </div>
              {patient.allergies && (
                <div className="col-span-2">
                  <span className="font-medium text-red-600">Allergies:</span> 
                  <span className="text-red-600 ml-1">{patient.allergies}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Medicines Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Medicines</h3>
                <button
                  type="button"
                  onClick={addMedicineRow}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Add Medicine
                </button>
              </div>

              {/* Medicine Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleMedicineSearch(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map((medicine) => (
                      <div
                        key={medicine.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          // Add to first empty row or create new row
                          const emptyIndex = prescriptionMedicines.findIndex(med => !med.medicine_id);
                          if (emptyIndex >= 0) {
                            selectMedicine(emptyIndex, medicine);
                          } else {
                            setPrescriptionMedicines([...prescriptionMedicines, {
                              medicine_id: medicine.id,
                              medicine_name: medicine.name,
                              dosage: '',
                              frequency: '',
                              duration: '',
                              instructions: '',
                              quantity: 1
                            }]);
                          }
                          setSearchResults([]);
                          setSearchTerm('');
                        }}
                      >
                        <div className="font-medium">{medicine.name}</div>
                        <div className="text-sm text-gray-600">
                          {medicine.generic_name} - {medicine.strength} - {medicine.dosage_form}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medicine Rows */}
              <div className="space-y-4">
                {prescriptionMedicines.map((medicine, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900">Medicine {index + 1}</h4>
                      {prescriptionMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicineRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Medicine Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Medicine Name *
                        </label>
                        <select
                          value={medicine.medicine_id}
                          onChange={(e) => {
                            const selectedMedicine = medicines.find(m => m.id === e.target.value);
                            if (selectedMedicine) {
                              updateMedicine(index, 'medicine_id', e.target.value);
                              updateMedicine(index, 'medicine_name', selectedMedicine.name);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Medicine</option>
                          {medicines.map((med) => (
                            <option key={med.id} value={med.id}>
                              {med.name} - {med.strength} ({med.dosage_form})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dosage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg, 1 tablet"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency *
                        </label>
                        <select
                          value={medicine.frequency}
                          onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Frequency</option>
                          {frequencyOptions.map((freq) => (
                            <option key={freq} value={freq}>{freq}</option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration *
                        </label>
                        <select
                          value={medicine.duration}
                          onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Duration</option>
                          {durationOptions.map((duration) => (
                            <option key={duration} value={duration}>{duration}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={medicine.quantity}
                          onChange={(e) => updateMedicine(index, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Instructions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Instructions
                        </label>
                        <input
                          type="text"
                          value={medicine.instructions}
                          onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                          placeholder="e.g., Take with food"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Instructions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                General Instructions
              </label>
              <textarea
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                rows={3}
                placeholder="Additional instructions for the patient..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Prescription'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionForm;