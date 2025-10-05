import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Loader2,
  User
} from 'lucide-react';
import { getPatientByUHID } from '../lib/patientService';

// Mock patient data (in a real app, this would come from an API)
const patients = [
  { 
    id: '1', 
    name: 'James Wilson', 
    age: 52, 
    gender: 'Male', 
    birthDate: '1971-05-12', 
    address: '123 Main St, Boston, MA 02108',
    phone: '+1 (555) 123-4567',
    email: 'james.wilson@example.com',
    bloodType: 'A+',
    height: '5\'10"',
    weight: '185 lbs',
    allergies: ['Penicillin', 'Peanuts'],
    chronicConditions: ['Hypertension', 'Type 2 Diabetes'],
    insurance: 'BlueCross Health',
    policyNumber: 'BC123456789',
    emergencyContact: {
      name: 'Sarah Wilson',
      relationship: 'Wife',
      phone: '+1 (555) 987-6543'
    },
    image: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    status: 'Critical',
    diagnosis: 'Heart Failure',
    admissionDate: '2023-05-10',
    doctor: 'Dr. Robert Chen',
    room: 'ICU-04',
    medications: [
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', startDate: '2023-01-15' },
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', startDate: '2022-11-30' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime', startDate: '2023-03-22' }
    ],
    appointments: [
      { id: 'a1', date: '2023-06-15T10:00:00', type: 'Follow-up', doctor: 'Dr. Robert Chen', department: 'Cardiology', status: 'Scheduled' },
      { id: 'a2', date: '2023-05-01T14:30:00', type: 'Initial Consultation', doctor: 'Dr. Robert Chen', department: 'Cardiology', status: 'Completed' },
      { id: 'a3', date: '2023-04-12T11:15:00', type: 'Diagnostic Tests', doctor: 'Dr. Lisa Wong', department: 'Radiology', status: 'Completed' }
    ],
    vitals: [
      { date: '2023-05-12', heartRate: 88, bloodPressure: '145/90', temperature: 98.6, respiratoryRate: 18, oxygenSaturation: 95 },
      { date: '2023-05-11', heartRate: 92, bloodPressure: '150/95', temperature: 99.1, respiratoryRate: 20, oxygenSaturation: 94 },
      { date: '2023-05-10', heartRate: 96, bloodPressure: '155/98', temperature: 99.5, respiratoryRate: 22, oxygenSaturation: 93 }
    ],
    labResults: [
      { date: '2023-05-10', name: 'Complete Blood Count', status: 'Completed', result: 'Abnormal', details: 'WBC elevated (12,500/µL)' },
      { date: '2023-05-10', name: 'Comprehensive Metabolic Panel', status: 'Completed', result: 'Abnormal', details: 'Elevated BUN (32 mg/dL)' },
      { date: '2023-05-10', name: 'Cardiac Enzymes', status: 'Completed', result: 'Abnormal', details: 'Elevated Troponin I (0.8 ng/mL)' },
      { date: '2023-05-09', name: 'Lipid Panel', status: 'Completed', result: 'Abnormal', details: 'LDL 165 mg/dL (High)' }
    ],
    treatmentPlan: {
      diagnosis: 'Congestive Heart Failure (CHF)',
      primaryGoal: 'Improve cardiac function and reduce symptoms',
      startDate: '2023-05-10',
      endDate: '2023-08-10',
      interventions: [
        'Medication management',
        'Dietary restrictions (low sodium)',
        'Physical therapy',
        'Cardiac rehabilitation'
      ],
      progress: 'Patient showing mild improvement in symptoms'
    },
    notes: [
      { date: '2023-05-12', author: 'Dr. Robert Chen', content: 'Patient reports feeling slightly better today. Still experiencing shortness of breath on minimal exertion. Continuing current treatment plan.' },
      { date: '2023-05-11', author: 'Nurse Davis', content: 'Administered medications as scheduled. Patient complaining of difficulty sleeping. Will monitor overnight.' },
      { date: '2023-05-10', author: 'Dr. Robert Chen', content: 'Patient admitted with acute exacerbation of CHF. Started on IV diuretics and continued oral medications. ECG shows sinus tachycardia.' }
    ]
  },
  // Additional patients would be here
];

const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPatientDetails(id);
    }
  }, [id]);

  const loadPatientDetails = async (patientId: string) => {
    try {
      setLoading(true);
      setError(null);
      const patientData = await getPatientByUHID(patientId);
      setPatient(patientData);
    } catch (err) {
      console.error('Error loading patient details:', err);
      setError('Failed to load patient details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <span className="ml-2 text-gray-600">Loading patient details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Patient</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => loadPatientDetails(id!)}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Patient not found</h3>
        <p className="text-gray-500 mb-4">Could not find a relationship between 'patients' and 'appointments' in the schema cache</p>
        <Link to="/patients" className="btn-primary">
          Back to Patients
        </Link>
      </div>
    );
  }
  
  const getPatientStatus = () => {
    if (patient.is_critical) {
      return {
        label: 'Critical',
        color: 'text-red-500 bg-red-50'
      };
    } else if (patient.is_admitted) {
      return {
        label: 'Admitted',
        color: 'text-orange-500 bg-orange-50'
      };
    } else {
      return {
        label: 'Stable',
        color: 'text-green-500 bg-green-50'
      };
    }
  };

  const patientStatus = getPatientStatus();
  const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'N/A';
  
  return (
    <div className="space-y-6">
      {/* Header with back button and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/patients" className="flex items-center text-gray-500 hover:text-orange-400 mr-4">
            <ArrowLeft size={20} className="mr-1" />
            <span>Back to Patients</span>
          </Link>
          <h1 className="text-gray-900">{patient.name}</h1>
          <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${patientStatus.color}`}>
            {patientStatus.label}
          </span>
        </div>
        
        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center">
            <Edit size={18} className="mr-2" />
            Edit Profile
          </button>
          <button className="btn-primary flex items-center">
            <Calendar size={18} className="mr-2" />
            Schedule Appointment
          </button>
        </div>
      </div>
      
      {/* Patient Summary Card */}
      <div className="card">
        <div className="flex">
          {/* Patient Image and Basic Info */}
          <div className="flex items-start w-1/3">
            <div className={`h-24 w-24 rounded-xl flex items-center justify-center text-white font-bold text-2xl mr-6 ${
              patient.is_critical ? 'bg-red-600' : 
              patient.is_admitted ? 'bg-orange-500' : 'bg-green-500'
            }`}>
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-gray-900">{patient.name}</h2>
              <p className="text-gray-500 mt-1">{age} years, {patient.gender}</p>
              <p className="text-sm text-gray-400">ID: {patient.patient_id}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-gray-600">
                  <Phone size={16} className="mr-2" />
                  <span>{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail size={16} className="mr-2" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center text-gray-600">
                    <MapPin size={16} className="mr-2" />
                    <span>{patient.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Current Admission Info */}
          <div className="w-1/3 pl-6 border-l border-gray-100">
            <h3 className="text-gray-900 mb-4">Current Admission</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Primary Complaint:</span>
                <span className="text-gray-900 font-medium">{patient.primary_complaint || 'N/A'}</span>
              </div>
              {patient.admission_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Admitted:</span>
                  <span className="text-gray-900">{new Date(patient.admission_date).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Admission Type:</span>
                <span className="text-gray-900 capitalize">{patient.admission_type || 'N/A'}</span>
              </div>
              {patient.room_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Room:</span>
                  <span className="text-gray-900">{patient.room_number}</span>
                </div>
              )}
              {patient.department_ward && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ward:</span>
                  <span className="text-gray-900">{patient.department_ward}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Key Health Indicators */}
          <div className="w-1/3 pl-6 border-l border-gray-100">
            <h3 className="text-gray-900 mb-4">Health Information</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-gray-500 text-sm">Blood Group</span>
                <p className="text-gray-900 font-medium">{patient.blood_group || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Gender</span>
                <p className="text-gray-900 capitalize">{patient.gender || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Marital Status</span>
                <p className="text-gray-900 capitalize">{patient.marital_status || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Insurance</span>
                <p className="text-gray-900">{patient.insurance_provider || 'N/A'}</p>
              </div>
            </div>
            
            {/* Alerts */}
            {patient.allergies && patient.allergies.trim() && (
              <div className="mt-4 p-2 bg-red-50 rounded-lg">
                <div className="flex items-center text-red-500 text-sm font-medium mb-1">
                  <AlertCircle size={14} className="mr-1" />
                  Allergies
                </div>
                <p className="text-gray-700 text-sm">{patient.allergies}</p>
              </div>
            )}
            
            {patient.chronic_conditions && patient.chronic_conditions.trim() && (
              <div className="mt-2 p-2 bg-orange-50 rounded-lg">
                <div className="flex items-center text-orange-500 text-sm font-medium mb-1">
                  <AlertCircle size={14} className="mr-1" />
                  Chronic Conditions
                </div>
                <p className="text-gray-700 text-sm">{patient.chronic_conditions}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <div className="border-b border-gray-100">
        <nav className="flex space-x-8">
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'overview' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-orange-300'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'appointments' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-orange-300'}`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'medications' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-orange-300'}`}
            onClick={() => setActiveTab('medications')}
          >
            Medications
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'lab' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-orange-300'}`}
            onClick={() => setActiveTab('lab')}
          >
            Lab Results
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'vitals' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-orange-300'}`}
            onClick={() => setActiveTab('vitals')}
          >
            Vitals
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'notes' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-orange-300'}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Treatment Plan */}
            <div className="col-span-2 space-y-6">
              {/* Treatment Plan */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-gray-900">Treatment Plan</h3>
                  <button className="text-orange-400 hover:text-orange-500 text-sm font-medium">Edit Plan</button>
                </div>
                
                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Diagnosis</span>
                  <p className="text-gray-900 font-medium">{patient.treatmentPlan.diagnosis}</p>
                </div>
                
                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Primary Goal</span>
                  <p className="text-gray-900">{patient.treatmentPlan.primaryGoal}</p>
                </div>
                
                <div className="flex mb-4">
                  <div className="w-1/2">
                    <span className="text-gray-500 text-sm">Start Date</span>
                    <p className="text-gray-900">{patient.treatmentPlan.startDate}</p>
                  </div>
                  <div className="w-1/2">
                    <span className="text-gray-500 text-sm">Expected End Date</span>
                    <p className="text-gray-900">{patient.treatmentPlan.endDate}</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Interventions</span>
                  <ul className="mt-2 space-y-1">
                    {patient.treatmentPlan.interventions.map((intervention: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="h-5 w-5 rounded-full bg-green-100 text-green-500 flex items-center justify-center text-xs mr-2 mt-0.5">
                          ✓
                        </span>
                        <span className="text-gray-900">{intervention}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <span className="text-gray-500 text-sm">Progress Notes</span>
                  <p className="text-gray-900 mt-1">{patient.treatmentPlan.progress}</p>
                </div>
              </div>
              
              {/* Recent Vitals */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-gray-900">Recent Vitals</h3>
                  <button className="text-orange-400 hover:text-orange-500 text-sm font-medium">View All</button>
                </div>
                
                <div className="space-y-4">
                  {patient.vitals.slice(0, 1).map((vital: any, index: number) => (
                    <div key={index} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-gray-500">{vital.date}</span>
                        <span className="text-sm font-medium text-blue-500">Latest</span>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-4">
                        <div>
                          <div className="flex items-center text-red-500 mb-1">
                            <Heart size={16} className="mr-1" />
                            <span className="text-xs font-medium">Heart Rate</span>
                          </div>
                          <p className="text-gray-900 font-medium">{vital.heartRate} bpm</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center text-blue-500 mb-1">
                            <Activity size={16} className="mr-1" />
                            <span className="text-xs font-medium">Blood Pressure</span>
                          </div>
                          <p className="text-gray-900 font-medium">{vital.bloodPressure}</p>
                        </div>
                        
                        <div>
                          <span className="text-xs font-medium text-gray-500 mb-1">Temperature</span>
                          <p className="text-gray-900 font-medium">{vital.temperature}°F</p>
                        </div>
                        
                        <div>
                          <span className="text-xs font-medium text-gray-500 mb-1">Respiratory Rate</span>
                          <p className="text-gray-900 font-medium">{vital.respiratoryRate} bpm</p>
                        </div>
                        
                        <div>
                          <span className="text-xs font-medium text-gray-500 mb-1">O₂ Saturation</span>
                          <p className="text-gray-900 font-medium">{vital.oxygenSaturation}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right Column - Recent Items */}
            <div className="space-y-6">
              {/* Medications */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-gray-900">Medications</h3>
                  <button className="flex items-center text-orange-400 hover:text-orange-500 text-sm font-medium">
                    <Plus size={16} className="mr-1" />
                    Add
                  </button>
                </div>
                
                <div className="space-y-4">
                  {patient.medications.map((medication: any, index: number) => (
                    <div key={index} className="flex items-start py-2 border-b border-gray-100 last:border-0">
                      <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500 mr-3">
                        <Pill size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{medication.name} {medication.dosage}</p>
                        <p className="text-sm text-gray-500">{medication.frequency}</p>
                        <p className="text-xs text-gray-400 mt-1">Started {medication.startDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Upcoming Appointments */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-gray-900">Upcoming Appointments</h3>
                  <button className="text-orange-400 hover:text-orange-500 text-sm font-medium">View All</button>
                </div>
                
                <div className="space-y-4">
                  {patient.appointments
                    .filter((appointment: any) => new Date(appointment.date) > new Date())
                    .slice(0, 2)
                    .map((appointment: any, index: number) => (
                      <div key={index} className="flex items-start py-2 border-b border-gray-100 last:border-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                          <Calendar size={16} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{appointment.type}</p>
                          <p className="text-sm text-gray-500">{appointment.doctor}, {appointment.department}</p>
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <Clock size={12} className="mr-1" />
                            <span>
                              {new Date(appointment.date).toLocaleDateString()} at {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <span className="badge badge-primary">{appointment.status}</span>
                      </div>
                    ))}
                </div>
              </div>
              
              {/* Recent Notes */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-gray-900">Recent Notes</h3>
                  <button className="flex items-center text-orange-400 hover:text-orange-500 text-sm font-medium">
                    <Plus size={16} className="mr-1" />
                    Add Note
                  </button>
                </div>
                
                <div className="space-y-4">
                  {patient.notes.slice(0, 2).map((note: any, index: number) => (
                    <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{note.author}</span>
                        <span className="text-xs text-gray-500">{note.date}</span>
                      </div>
                      <p className="text-sm text-gray-600">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Appointment History</h3>
              <button className="btn-primary flex items-center">
                <Plus size={16} className="mr-1" />
                Schedule New
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 text-left text-gray-500 text-sm">
                  <tr>
                    <th className="py-3 px-4 font-medium">Date & Time</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium">Provider</th>
                    <th className="py-3 px-4 font-medium">Department</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patient.appointments.map((appointment: any, index: number) => (
                    <tr key={index} className="hover:bg-orange-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {new Date(appointment.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{appointment.type}</td>
                      <td className="py-3 px-4 text-gray-900">{appointment.doctor}</td>
                      <td className="py-3 px-4 text-gray-900">{appointment.department}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          appointment.status === 'Scheduled' ? 'bg-blue-50 text-blue-600' :
                          appointment.status === 'Completed' ? 'bg-green-50 text-green-600' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-3">
                          <button className="text-gray-400 hover:text-orange-400">
                            <Edit size={16} />
                          </button>
                          <button className="text-gray-400 hover:text-orange-400">
                            <File size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Medications Tab */}
        {activeTab === 'medications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-gray-900">Current Medications</h3>
              <button className="btn-primary flex items-center">
                <Plus size={16} className="mr-1" />
                Add Medication
              </button>
            </div>
            
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 text-left text-gray-500 text-sm">
                    <tr>
                      <th className="py-3 px-4 font-medium">Medication</th>
                      <th className="py-3 px-4 font-medium">Dosage</th>
                      <th className="py-3 px-4 font-medium">Frequency</th>
                      <th className="py-3 px-4 font-medium">Start Date</th>
                      <th className="py-3 px-4 font-medium">End Date</th>
                      <th className="py-3 px-4 font-medium">Prescriber</th>
                      <th className="py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {patient.medications.map((medication: any, index: number) => (
                      <tr key={index} className="hover:bg-orange-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{medication.name}</td>
                        <td className="py-3 px-4 text-gray-900">{medication.dosage}</td>
                        <td className="py-3 px-4 text-gray-900">{medication.frequency}</td>
                        <td className="py-3 px-4 text-gray-600">{medication.startDate}</td>
                        <td className="py-3 px-4 text-gray-600">Ongoing</td>
                        <td className="py-3 px-4 text-gray-600">{patient.doctor}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-3">
                            <button className="text-gray-400 hover:text-orange-400">
                              <Edit size={16} />
                            </button>
                            <button className="text-gray-400 hover:text-orange-400">
                              <File size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-8">
              <h3 className="text-gray-900">Medication Schedule</h3>
            </div>
            
            <div className="card">
              <div className="grid grid-cols-7 gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day: string, index: number) => (
                  <div key={index} className="border border-gray-100 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{day}</h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-xs mr-2">
                          AM
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Lisinopril 10mg</p>
                          <p className="text-xs text-gray-500">with breakfast</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-xs mr-2">
                          AM
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Metformin 500mg</p>
                          <p className="text-xs text-gray-500">with breakfast</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-xs mr-2">
                          PM
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Metformin 500mg</p>
                          <p className="text-xs text-gray-500">with dinner</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-xs mr-2">
                          PM
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Atorvastatin 20mg</p>
                          <p className="text-xs text-gray-500">at bedtime</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Lab Results Tab */}
        {activeTab === 'lab' && (
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900">Laboratory Results</h3>
              <button className="btn-primary flex items-center">
                <Plus size={16} className="mr-1" />
                Order New Test
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 text-left text-gray-500 text-sm">
                  <tr>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium">Test Name</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Result</th>
                    <th className="py-3 px-4 font-medium">Details</th>
                    <th className="py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patient.labResults.map((lab: any, index: number) => (
                    <tr key={index} className="hover:bg-orange-50">
                      <td className="py-3 px-4 text-gray-900">{lab.date}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{lab.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          lab.status === 'Completed' ? 'bg-green-50 text-green-600' :
                          lab.status === 'Pending' ? 'bg-orange-50 text-orange-500' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {lab.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${
                          lab.result === 'Normal' ? 'text-green-500' :
                          lab.result === 'Abnormal' ? 'text-red-500' :
                          'text-gray-900'
                        }`}>
                          {lab.result}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{lab.details}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-3">
                          <button className="text-gray-400 hover:text-orange-400">
                            <FileText size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Vitals Tab */}
        {activeTab === 'vitals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-gray-900">Vital Signs History</h3>
              <button className="btn-primary flex items-center">
                <Plus size={16} className="mr-1" />
                Record New Vitals
              </button>
            </div>
            
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 text-left text-gray-500 text-sm">
                    <tr>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Heart Rate</th>
                      <th className="py-3 px-4 font-medium">Blood Pressure</th>
                      <th className="py-3 px-4 font-medium">Temperature</th>
                      <th className="py-3 px-4 font-medium">Respiratory Rate</th>
                      <th className="py-3 px-4 font-medium">O₂ Saturation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {patient.vitals.map((vital: any, index: number) => (
                      <tr key={index} className="hover:bg-orange-50">
                        <td className="py-3 px-4 text-gray-900">{vital.date}</td>
                        <td className="py-3 px-4 text-gray-900">{vital.heartRate} bpm</td>
                        <td className="py-3 px-4 text-gray-900">{vital.bloodPressure}</td>
                        <td className="py-3 px-4 text-gray-900">{vital.temperature}°F</td>
                        <td className="py-3 px-4 text-gray-900">{vital.respiratoryRate} bpm</td>
                        <td className="py-3 px-4 text-gray-900">{vital.oxygenSaturation}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Vitals Charts - In a real app, you would use a charting library here */}
            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h4 className="text-gray-900 mb-4">Blood Pressure Trends</h4>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-xl">
                  <p className="text-gray-500">Blood Pressure Chart would appear here</p>
                </div>
              </div>
              
              <div className="card">
                <h4 className="text-gray-900 mb-4">Heart Rate Trends</h4>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-xl">
                  <p className="text-gray-500">Heart Rate Chart would appear here</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-gray-900">Medical Notes</h3>
              <button className="btn-primary flex items-center">
                <Plus size={16} className="mr-1" />
                Add Note
              </button>
            </div>
            
            <div className="card">
              {patient.notes.map((note: any, index: number) => (
                <div key={index} className="border-b border-gray-100 last:border-0 py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{note.author}</h4>
                      <p className="text-sm text-gray-500">
                        {note.date} - {note.author.includes('Dr.') ? 'Doctor\'s Note' : 'Nurse\'s Note'}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button className="text-gray-400 hover:text-orange-400">
                        <Edit size={16} />
                      </button>
                      <button className="text-gray-400 hover:text-orange-400">
                        <MessageSquare size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-gray-600">
                    <p>{note.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Medical Timeline (only on overview) */}
      {activeTab === 'overview' && (
        <div className="card mt-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-900">Medical Timeline</h3>
            <button className="text-orange-400 hover:text-orange-500 text-sm font-medium">View Full History</button>
          </div>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100"></div>
            
            <div className="space-y-6 relative">
              {/* Timeline Items */}
              <div className="pl-12 relative">
                <div className="absolute left-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 z-10">
                  <Calendar size={16} />
                </div>
                <div className="flex justify-between">
                  <h4 className="font-medium text-gray-900">Admitted for Heart Failure</h4>
                  <span className="text-sm text-gray-500">May 10, 2023</span>
                </div>
                <p className="text-gray-600 mt-1">Patient admitted with symptoms of acute heart failure. Started on IV diuretics.</p>
              </div>
              
              <div className="pl-12 relative">
                <div className="absolute left-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 z-10">
                  <File size={16} />
                </div>
                <div className="flex justify-between">
                  <h4 className="font-medium text-gray-900">Cardiac Enzymes Test</h4>
                  <span className="text-sm text-gray-500">May 10, 2023</span>
                </div>
                <p className="text-gray-600 mt-1">Elevated Troponin I (0.8 ng/mL) indicated myocardial damage.</p>
                <button className="text-sm text-orange-400 hover:text-orange-500 mt-2 flex items-center">
                  View Results <ChevronRight size={16} />
                </button>
              </div>
              
              <div className="pl-12 relative">
                <div className="absolute left-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 z-10">
                  <Pill size={16} />
                </div>
                <div className="flex justify-between">
                  <h4 className="font-medium text-gray-900">Medication Adjustment</h4>
                  <span className="text-sm text-gray-500">May 11, 2023</span>
                </div>
                <p className="text-gray-600 mt-1">Increased Lisinopril dosage to 20mg daily to better manage blood pressure.</p>
              </div>
              
              <div className="pl-12 relative">
                <div className="absolute left-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 z-10">
                  <MessageSquare size={16} />
                </div>
                <div className="flex justify-between">
                  <h4 className="font-medium text-gray-900">Doctor's Note</h4>
                  <span className="text-sm text-gray-500">May 12, 2023</span>
                </div>
                <p className="text-gray-600 mt-1">Patient reports feeling slightly better today. Still experiencing shortness of breath on minimal exertion.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;