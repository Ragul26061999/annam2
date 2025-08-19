import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  MessageSquare, 
  Pill, 
  Plus,
  Search,
  Filter,
  ChevronRight,
  Edit,
  Trash2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PrescriptionManagement from '../../components/PrescriptionManagement';

const Workstation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showAppointmentDetailsModal, setShowAppointmentDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Mock data for today's schedule
  const todaySchedule = [
    {
      id: 1,
      patientId: '1',
      time: '09:00 AM',
      patientName: 'Sarah Johnson',
      type: 'Follow-up',
      status: 'Scheduled',
      reason: 'Follow-up for hypertension medication adjustment',
      symptoms: ['Headache', 'Dizziness'],
      image: 'https://images.pexels.com/photos/761963/pexels-photo-761963.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    },
    {
      id: 2,
      patientId: '2',
      time: '10:30 AM',
      patientName: 'Michael Rodriguez',
      type: 'Consultation',
      status: 'In Progress',
      reason: 'Chronic back pain evaluation',
      symptoms: ['Lower back pain', 'Numbness in legs'],
      image: 'https://images.pexels.com/photos/769745/pexels-photo-769745.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    },
    {
      id: 3,
      patientId: '3',
      time: '02:15 PM',
      patientName: 'Emma Watson',
      type: 'Check-up',
      status: 'Scheduled',
      reason: 'Annual physical examination',
      symptoms: [],
      image: 'https://images.pexels.com/photos/4714992/pexels-photo-4714992.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    }
  ];

  // Mock data for medical records
  const medicalRecords = [
    {
      id: 1,
      patientId: '1',
      date: '2023-05-15',
      patientName: 'James Wilson',
      diagnosis: 'Heart Failure',
      status: 'Critical',
      lastUpdated: '2 hours ago',
      image: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    },
    {
      id: 2,
      patientId: '2',
      date: '2023-05-14',
      patientName: 'Olivia Martinez',
      diagnosis: 'Pneumonia',
      status: 'Stable',
      lastUpdated: '1 day ago',
      image: 'https://images.pexels.com/photos/3992656/pexels-photo-3992656.png?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    }
  ];

  // Mock data for clinical notes
  const clinicalNotes = [
    {
      id: 1,
      patientId: '1',
      date: '2023-05-15',
      patientName: 'James Wilson',
      note: 'Patient reports feeling slightly better today. Still experiencing shortness of breath on minimal exertion.',
      image: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    },
    {
      id: 2,
      patientId: '2',
      date: '2023-05-14',
      patientName: 'Olivia Martinez',
      note: 'Fever has subsided. Continuing current antibiotic regimen.',
      image: 'https://images.pexels.com/photos/3992656/pexels-photo-3992656.png?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    }
  ];

  // Mock data for prescriptions
  const prescriptions = [
    {
      id: 1,
      patientId: '1',
      date: '2023-05-15',
      patientName: 'James Wilson',
      medications: [
        { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }
      ],
      status: 'Active',
      image: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    },
    {
      id: 2,
      patientId: '2',
      date: '2023-05-14',
      patientName: 'Olivia Martinez',
      medications: [
        { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily' }
      ],
      status: 'Active',
      image: 'https://images.pexels.com/photos/3992656/pexels-photo-3992656.png?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1'
    }
  ];

  const handlePatientClick = (patientId: string) => {
    console.log(`Navigate to patient: ${patientId}`);
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetailsModal(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-gray-900">Doctor's Workstation</h1>
        <p className="text-gray-500 mt-1">Manage your daily tasks and patient care</p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-100">
        <nav className="flex space-x-8">
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'today' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-primary-400'}`}
            onClick={() => setActiveTab('today')}
          >
            Today's Schedule
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'records' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-primary-400'}`}
            onClick={() => setActiveTab('records')}
          >
            Medical Records
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'notes' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-primary-400'}`}
            onClick={() => setActiveTab('notes')}
          >
            Clinical Notes
          </button>
          <button 
            className={`pb-4 px-2 text-sm font-medium ${activeTab === 'prescriptions' ? 'text-primary-500 border-b-2 border-primary-500' : 'text-gray-500 hover:text-primary-400'}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            e-Prescriptions
          </button>
        </nav>
      </div>

      {/* Today's Schedule Tab */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-gray-900">Today's Appointments</h2>
              <span className="text-sm text-gray-500">May 15, 2023</span>
            </div>
            <div className="flex space-x-3">
              <button className="btn-secondary flex items-center">
                <Calendar size={18} className="mr-2" />
                View Calendar
              </button>
              <button className="btn-primary flex items-center">
                <Plus size={18} className="mr-2" />
                Add Appointment
              </button>
            </div>
          </div>

          <div className="card">
            {todaySchedule.map((appointment) => (
              <div 
                key={appointment.id} 
                className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleAppointmentClick(appointment)}
              >
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 mr-4">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{appointment.time}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-gray-600">{appointment.type}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <img 
                        src={appointment.image} 
                        alt={appointment.patientName} 
                        className="h-6 w-6 rounded-full mr-2" 
                      />
                      <span className="text-gray-900">{appointment.patientName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    appointment.status === 'In Progress' ? 'bg-success-100 text-success-600' : 'bg-primary-100 text-primary-600'
                  }`}>
                    {appointment.status}
                  </span>
                  <ArrowRight size={20} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative w-96">
              <input 
                type="text" 
                placeholder="Search medical records..." 
                className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
            </div>
            <div className="flex space-x-3">
              <button className="btn-secondary flex items-center">
                <Filter size={18} className="mr-2" />
                Filter
              </button>
              <button className="btn-primary flex items-center">
                <Plus size={18} className="mr-2" />
                New Record
              </button>
            </div>
          </div>

          <div className="card">
            {medicalRecords.map((record) => (
              <div 
                key={record.id} 
                className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => handlePatientClick(record.patientId)}
              >
                <div className="flex items-center">
                  <img 
                    src={record.image} 
                    alt={record.patientName} 
                    className="h-10 w-10 rounded-full mr-4" 
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{record.patientName}</h3>
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                      <Calendar size={14} className="mr-1" />
                      <span>{record.date}</span>
                      <span className="mx-2">•</span>
                      <span>{record.diagnosis}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    record.status === 'Critical' ? 'bg-danger-100 text-danger-600' : 'bg-success-100 text-success-600'
                  }`}>
                    {record.status}
                  </span>
                  <span className="text-sm text-gray-500">{record.lastUpdated}</span>
                  <ArrowRight size={20} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-gray-900">Clinical Notes</h2>
            <button className="btn-primary flex items-center">
              <Plus size={18} className="mr-2" />
              Add Note
            </button>
          </div>

          <div className="card">
            {clinicalNotes.map((note) => (
              <div 
                key={note.id} 
                className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => handlePatientClick(note.patientId)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <img 
                      src={note.image} 
                      alt={note.patientName} 
                      className="h-8 w-8 rounded-full mr-3" 
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{note.patientName}</h3>
                      <p className="text-sm text-gray-500">{note.date}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-400 hover:text-primary-500">
                      <Edit size={16} />
                    </button>
                    <button className="text-gray-400 hover:text-danger-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600">{note.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* e-Prescriptions Tab */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <PrescriptionManagement doctorId="1" />
        </div>
      )}

      {/* Appointment Details Modal */}
      {showAppointmentDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAppointmentDetailsModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <img 
                      src={selectedAppointment.image} 
                      alt={selectedAppointment.patientName} 
                      className="h-10 w-10 rounded-full mr-3" 
                    />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{selectedAppointment.patientName}</h3>
                      <p className="text-sm text-gray-500">{selectedAppointment.type} - {selectedAppointment.time}</p>
                    </div>
                  </div>
                  <button 
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowAppointmentDetailsModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form className="space-y-6">
                  {/* Reason for Visit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason for Visit</label>
                    <textarea 
                      className="input-field mt-1"
                      rows={3}
                      defaultValue={selectedAppointment.reason}
                    ></textarea>
                  </div>

                  {/* Symptoms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Symptoms</label>
                    <div className="mt-2 space-y-2">
                      {selectedAppointment.symptoms.map((symptom: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <span className="h-2 w-2 bg-warning-500 rounded-full mr-2"></span>
                          <span className="text-gray-700">{symptom}</span>
                        </div>
                      ))}
                      <button type="button" className="text-primary-500 text-sm hover:text-primary-600 mt-2">
                        + Add Symptom
                      </button>
                    </div>
                  </div>

                  {/* Vital Signs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vital Signs</label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500">Blood Pressure</label>
                        <input type="text" className="input-field mt-1" placeholder="120/80" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Heart Rate</label>
                        <input type="text" className="input-field mt-1" placeholder="72 bpm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Temperature</label>
                        <input type="text" className="input-field mt-1" placeholder="98.6 °F" />
                      </div>
                    </div>
                  </div>

                  {/* Examination Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Examination Notes</label>
                    <textarea 
                      className="input-field mt-1"
                      rows={4}
                      placeholder="Enter examination findings and observations..."
                    ></textarea>
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                    <input 
                      type="text" 
                      className="input-field mt-1"
                      placeholder="Enter diagnosis"
                    />
                  </div>

                  {/* Treatment Plan */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Treatment Plan</label>
                    <textarea 
                      className="input-field mt-1"
                      rows={3}
                      placeholder="Describe the treatment plan..."
                    ></textarea>
                  </div>

                  {/* Prescription Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Prescriptions</label>
                      <button 
                        type="button"
                        className="text-primary-500 text-sm hover:text-primary-600"
                        onClick={() => {
                          setShowPrescriptionModal(true);
                          setShowAppointmentDetailsModal(false);
                        }}
                      >
                        + Add Prescription
                      </button>
                    </div>
                    <div className="space-y-2">
                      {/* Sample prescription items */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Pill size={16} className="text-primary-500 mr-2" />
                            <span className="font-medium">Lisinopril 10mg</span>
                          </div>
                          <button type="button" className="text-gray-400 hover:text-primary-500">
                            <Edit size={16} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Take one tablet daily</p>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Follow-up Plan</label>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div>
                        <input 
                          type="date" 
                          className="input-field"
                          placeholder="Select date"
                        />
                      </div>
                      <div>
                        <select className="input-field">
                          <option>Select type</option>
                          <option>Follow-up visit</option>
                          <option>Lab test</option>
                          <option>Imaging</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowAppointmentDetailsModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAppointmentDetailsModal(false)}
                >
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowPrescriptionModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">New Prescription</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-500" 
                    onClick={() => setShowPrescriptionModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form className="space-y-4">
                  <div>
                    <label htmlFor="patient" className="block text-sm font-medium text-gray-700">Patient</label>
                    <select id="patient" className="input-field mt-1">
                      <option>Select Patient</option>
                      <option>James Wilson</option>
                      <option>Olivia Martinez</option>
                      <option>Sarah Johnson</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="medication" className="block text-sm font-medium text-gray-700">Medication</label>
                    <input type="text" id="medication" className="input-field mt-1" placeholder="Enter medication name" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">Dosage</label>
                      <input type="text" id="dosage" className="input-field mt-1" placeholder="e.g., 500mg" />
                    </div>
                    <div>
                      <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">Frequency</label>
                      <input type="text" id="frequency" className="input-field mt-1" placeholder="e.g., Twice daily" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration</label>
                    <input type="text" id="duration" className="input-field mt-1" placeholder="e.g., 7 days" />
                  </div>

                  <div>
                    <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Special Instructions</label>
                    <textarea 
                      id="instructions" 
                      rows={3} 
                      className="input-field mt-1"
                      placeholder="Enter any special instructions"
                    ></textarea>
                  </div>
                </form>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowPrescriptionModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowPrescriptionModal(false)}
                >
                  Create Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workstation;