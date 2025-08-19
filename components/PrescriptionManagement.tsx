'use client';

import React, { useState, useEffect } from 'react';
import PrescriptionForm from './PrescriptionForm';
import PrescriptionList from './PrescriptionList';
import { Prescription } from '../src/lib/prescriptionService';
import { Doctor, getDoctorById } from '../src/lib/doctorService';
import { Appointment, getAppointmentById } from '../src/lib/appointmentService';
import { getPatientByUHID } from '../src/lib/patientService';

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

interface PrescriptionManagementProps {
  doctorId: string;
  appointmentId?: string;
  patientId?: string;
}

const PrescriptionManagement: React.FC<PrescriptionManagementProps> = ({
  doctorId,
  appointmentId,
  patientId
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('list');
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>(appointmentId || '');
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);

  // Load doctor data
  useEffect(() => {
    const loadDoctor = async () => {
      try {
         const doctorData = await getDoctorById(doctorId);
         if (doctorData) {
           setDoctor(doctorData);
         }
      } catch (error) {
        console.error('Failed to load doctor:', error);
      }
    };
    loadDoctor();
  }, [doctorId]);

  // Load patient and appointment data when needed
  useEffect(() => {
    const loadData = async () => {
      if (activeTab === 'new' && (selectedPatientId || selectedAppointmentId)) {
        setLoading(true);
        try {
          // Load appointment if appointmentId is provided
          if (selectedAppointmentId) {
             const appointmentData = await getAppointmentById(selectedAppointmentId);
             if (appointmentData) {
               setAppointment(appointmentData);
               // Get patient from appointment
               if (appointmentData.patient) {
                setPatient({
                  id: appointmentData.patient.id,
                  patient_id: appointmentData.patient.patient_id,
                  name: appointmentData.patient.name,
                  phone: appointmentData.patient.phone,
                  email: appointmentData.patient.email,
                  date_of_birth: appointmentData.patient.date_of_birth,
                  gender: appointmentData.patient.gender,
                  allergies: appointmentData.patient.allergies
                });
              }
            }
          }
          // Load patient directly if patientId is provided
          else if (selectedPatientId) {
            const { patient: patientData } = await getPatientByUHID(selectedPatientId);
            if (patientData) {
              setPatient({
                id: patientData.id,
                patient_id: patientData.patient_id,
                name: patientData.name,
                phone: patientData.phone,
                email: patientData.email,
                date_of_birth: patientData.date_of_birth,
                gender: patientData.gender,
                allergies: patientData.allergies
              });
            }
          }
        } catch (error) {
          console.error('Failed to load data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [activeTab, selectedPatientId, selectedAppointmentId]);

  // If appointmentId is provided, default to new prescription tab
  useEffect(() => {
    if (appointmentId) {
      setActiveTab('new');
      setSelectedAppointmentId(appointmentId);
    }
  }, [appointmentId]);

  const handlePrescriptionCreated = () => {
    // Switch to list view after creating prescription
    setActiveTab('list');
    setEditingPrescription(null);
    setSelectedPatientId('');
    setSelectedAppointmentId('');
  };

  const handleEditPrescription = (prescription: Prescription) => {
    setEditingPrescription(prescription);
    setSelectedPatientId(prescription.patient_id);
    setSelectedAppointmentId(prescription.appointment_id || '');
    setActiveTab('new');
  };

  const handleViewPrescription = (prescription: Prescription) => {
    // For now, just switch to edit mode
    handleEditPrescription(prescription);
  };

  const handleCancelEdit = () => {
    setEditingPrescription(null);
    setSelectedPatientId('');
    setSelectedAppointmentId('');
    setActiveTab('list');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Prescription Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage prescriptions for your patients
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setActiveTab('list');
                if (!editingPrescription) {
                  setSelectedPatientId('');
                  setSelectedAppointmentId('');
                }
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Prescriptions List
            </button>
            <button
              onClick={() => {
                setActiveTab('new');
                if (!editingPrescription) {
                  setSelectedPatientId(patientId || '');
                  setSelectedAppointmentId(appointmentId || '');
                }
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'new'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {editingPrescription ? 'Edit Prescription' : 'New Prescription'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'list' ? (
          <PrescriptionList
            doctorId={doctorId}
            patientId={patientId}
            showStats={true}
            onViewPrescription={handleViewPrescription}
            onEditPrescription={handleEditPrescription}
          />
        ) : (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingPrescription ? 'Edit Prescription' : 'Create New Prescription'}
                </h3>
                {editingPrescription && (
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              {editingPrescription && (
                <div className="mt-2 text-sm text-gray-600">
                  Editing prescription: <span className="font-medium">{editingPrescription.prescription_id}</span>
                </div>
              )}
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : doctor && patient ? (
                <PrescriptionForm
                  doctor={doctor}
                  patient={patient}
                  appointment={appointment || undefined}
                  onSuccess={handlePrescriptionCreated}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {!doctor ? 'Loading doctor information...' : 'Please select a patient or appointment to create a prescription.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {activeTab === 'list' && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => {
              setEditingPrescription(null);
              setSelectedPatientId(patientId || '');
              setSelectedAppointmentId(appointmentId || '');
              setActiveTab('new');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors"
            title="Create New Prescription"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default PrescriptionManagement;