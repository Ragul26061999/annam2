'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Clock, MapPin, Building, Stethoscope, FileText } from 'lucide-react';
import { getAllPatients } from '../../../src/lib/patientService';

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
  is_admitted: boolean;
}

export default function PatientDisplayPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'outpatient' | 'inpatient'>('all');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const result = await getAllPatients({ limit: 100 }); // Fetch up to 100 patients
      setPatients(result.patients);
      setError(null);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(patient => {
    if (filter === 'outpatient') {
      return patient.admission_type === 'outpatient' || !patient.is_admitted;
    }
    if (filter === 'inpatient') {
      return patient.admission_type === 'inpatient' && patient.is_admitted;
    }
    return true;
  });

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/outpatient" 
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
            >
              <ArrowLeft size={16} />
              Back to Outpatient
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading patients...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link 
              href="/outpatient" 
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
            >
              <ArrowLeft size={16} />
              Back to Outpatient
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <FileText size={48} className="mx-auto" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Patients</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                onClick={fetchPatients}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/outpatient" 
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
          >
            <ArrowLeft size={16} />
            Back to Outpatient
          </Link>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patient Display</h1>
              <p className="text-gray-600">View all patients - outpatients and inpatients</p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'all' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Patients
              </button>
              <button
                onClick={() => setFilter('outpatient')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'outpatient' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Outpatients
              </button>
              <button
                onClick={() => setFilter('inpatient')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'inpatient' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inpatients
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <User size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
              <p className="text-gray-500">There are no patients matching your filter criteria.</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div 
                key={patient.id} 
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
                  patient.admission_type === 'inpatient' && patient.is_admitted 
                    ? 'border-l-4 border-l-green-500' 
                    : 'border-l-4 border-l-blue-500'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{patient.name}</h3>
                    <p className="text-gray-500 font-mono">{patient.patient_id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    patient.admission_type === 'inpatient' && patient.is_admitted 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {patient.admission_type === 'inpatient' && patient.is_admitted ? 'Inpatient' : 'Outpatient'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    <span>Age: {calculateAge(patient.date_of_birth)} | {patient.gender}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{patient.admission_date ? new Date(patient.admission_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  
                  {patient.primary_complaint && (
                    <div className="flex items-start text-sm text-gray-600">
                      <Stethoscope className="h-4 w-4 mr-2 mt-0.5" />
                      <span className="truncate" title={patient.primary_complaint}>
                        {patient.primary_complaint.length > 50 
                          ? `${patient.primary_complaint.substring(0, 50)}...` 
                          : patient.primary_complaint}
                      </span>
                    </div>
                  )}
                  
                  {patient.department_ward && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-2" />
                      <span>{patient.department_ward}</span>
                    </div>
                  )}
                  
                  {patient.room_number && patient.admission_type === 'inpatient' && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>Room: {patient.room_number}</span>
                    </div>
                  )}
                  
                  {patient.allergies && (
                    <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                      <p className="text-xs text-red-700">
                        <span className="font-medium">Allergies:</span> {patient.allergies}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link 
                    href={`/patients/${patient.patient_id}`} 
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                  >
                    View Details
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}