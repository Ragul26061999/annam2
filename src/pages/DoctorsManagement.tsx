import React, { useState, useRef } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, Heart, Brain, Settings as Lungs, Baby, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// Department definitions with icons
const departments = [
  { id: 'cardiology', name: 'Cardiology', icon: Heart, color: 'text-red-500 bg-red-100' },
  { id: 'neurology', name: 'Neurology', icon: Brain, color: 'text-purple-500 bg-purple-100' },
  { id: 'pulmonology', name: 'Pulmonology', icon: Lungs, color: 'text-blue-500 bg-blue-100' },
  { id: 'pediatrics', name: 'Pediatrics', icon: Baby, color: 'text-green-500 bg-green-100' },
  { id: 'obstetrics', name: 'Obstetrics', icon: UserRound, color: 'text-pink-500 bg-pink-100' },
];

const doctors = [
  {
    id: 1,
    name: 'Dr. Robert Chen',
    specialty: 'Cardiology',
    department: 'Internal Medicine',
    status: 'Available',
    image: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=1'
  },
  {
    id: 2,
    name: 'Dr. Lisa Wong',
    specialty: 'Neurology',
    department: 'Neuroscience',
    status: 'In Surgery',
    image: 'https://images.pexels.com/photos/5214997/pexels-photo-5214997.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=1'
  },
  {
    id: 3,
    name: 'Dr. James Wilson',
    specialty: 'Orthopedics',
    department: 'Surgery',
    status: 'Off-Duty',
    image: 'https://images.pexels.com/photos/5407206/pexels-photo-5407206.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&dpr=1'
  }
];

const DoctorsManagement: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState(departments[0].id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [view, setView] = useState<'card' | 'table'>('card');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-50 text-green-600';
      case 'In Surgery':
        return 'bg-orange-50 text-orange-600';
      case 'Off-Duty':
        return 'bg-gray-50 text-gray-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-gray-900">Doctors Management</h1>
        <p className="text-gray-500 mt-1">Manage hospital doctors and their schedules</p>
      </div>

      {/* Department Tabs */}
      <div className="relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <button 
            className="p-2 rounded-full bg-white shadow-neu-small hover:shadow-neu-small-pressed"
            onClick={() => scroll('left')}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto hide-scrollbar flex space-x-4 px-12 py-2"
        >
          {departments.map((dept) => {
            const Icon = dept.icon;
            return (
              <motion.button
                key={dept.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  selectedDepartment === dept.id 
                    ? 'bg-white shadow-neu-small' 
                    : 'hover:bg-white hover:shadow-neu-small'
                }`}
                onClick={() => setSelectedDepartment(dept.id)}
              >
                <div className={`p-2 rounded-lg ${dept.color}`}>
                  <Icon size={20} />
                </div>
                <span className="font-medium whitespace-nowrap">{dept.name}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
          <button 
            className="p-2 rounded-full bg-white shadow-neu-small hover:shadow-neu-small-pressed"
            onClick={() => scroll('right')}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search by name, specialty..." 
              className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl w-96 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
          </div>
          <button className="btn-secondary flex items-center">
            <Filter size={18} className="mr-2" />
            Filter
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button 
              className={`px-3 py-1 rounded-lg text-sm ${view === 'card' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setView('card')}
            >
              Cards
            </button>
            <button 
              className={`px-3 py-1 rounded-lg text-sm ${view === 'table' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
          <button 
            className="btn-primary flex items-center"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} className="mr-2" />
            Add Doctor
          </button>
        </div>
      </div>

      {/* Doctors Grid View */}
      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <img 
                    src={doctor.image} 
                    alt={doctor.name} 
                    className="h-12 w-12 rounded-full object-cover" 
                  />
                  <div className="ml-3">
                    <Link to={`/doctors/${doctor.id}`} className="font-medium text-gray-900 hover:text-primary-500">
                      {doctor.name}
                    </Link>
                    <span className="text-sm text-gray-500">{doctor.specialty}</span>
                  </div>
                </div>
                              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Department</span>
                  <span className="text-gray-900">{doctor.department}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(doctor.status)}`}>
                    {doctor.status}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  className="btn-secondary text-sm py-1 px-3 flex items-center"
                  onClick={() => {
                    setSelectedDoctor(doctor);
                    setShowScheduleModal(true);
                  }}
                >
                  <Calendar size={14} className="mr-1" />
                  Schedule
                </button>
                <button className="btn-primary text-sm py-1 px-3 flex items-center">
                  <Edit size={14} className="mr-1" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Doctors Table View */}
      {view === 'table' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4">Doctor</th>
                  <th className="text-left py-3 px-4">Specialty</th>
                  <th className="text-left py-3 px-4">Department</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-t border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <img 
                          src={doctor.image} 
                          alt={doctor.name} 
                          className="h-8 w-8 rounded-full object-cover" 
                        />
                        <Link to={`/doctors/${doctor.id}`} className="ml-3 font-medium text-gray-900 hover:text-primary-500">
                          {doctor.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{doctor.specialty}</td>
                    <td className="py-3 px-4 text-gray-500">{doctor.department}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(doctor.status)}`}>
                        {doctor.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        <button className="text-gray-400 hover:text-orange-400">
                          <Calendar size={18} />
                        </button>
                        <button className="text-gray-400 hover:text-orange-400">
                          <Edit size={18} />
                        </button>
                        <button className="text-gray-400 hover:text-red-400">
                          <Trash2 size={18} />
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

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Doctor</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowAddModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                        <Plus size={24} className="text-gray-400" />
                      </div>
                      <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-orange-200 flex items-center justify-center">
                        <Edit size={14} className="text-gray-700" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input type="text" className="input-field mt-1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input type="text" className="input-field mt-1" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" className="input-field mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="tel" className="input-field mt-1" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Specialty</label>
                    <select className="input-field mt-1">
                      <option>Select Specialty</option>
                      <option>Cardiology</option>
                      <option>Neurology</option>
                      <option>Orthopedics</option>
                      <option>Pediatrics</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select className="input-field mt-1">
                      <option>Select Department</option>
                      <option>Internal Medicine</option>
                      <option>Surgery</option>
                      <option>Emergency</option>
                      <option>Outpatient</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Working Hours From</label>
                      <input type="time" className="input-field mt-1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Working Hours To</label>
                      <input type="time" className="input-field mt-1" />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-orange-300 rounded border-gray-300" />
                    <label className="ml-2 text-sm text-gray-700">Available for emergency calls</label>
                  </div>
                </form>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowAddModal(false)}
                >
                  Add Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowScheduleModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <img 
                      src={selectedDoctor.image} 
                      alt={selectedDoctor.name} 
                      className="h-10 w-10 rounded-full object-cover" 
                    />
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{selectedDoctor.name}</h3>
                      <p className="text-sm text-gray-500">{selectedDoctor.specialty}</p>
                    </div>
                  </div>
                  <button 
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center">
                      <div className="font-medium text-gray-900 mb-2">{day}</div>
                      <div className="space-y-2">
                        {Array.from({ length: 8 }, (_, i) => (
                          <div 
                            key={i}
                            className={`p-2 rounded-lg text-xs cursor-pointer ${
                              Math.random() > 0.7 ? 'bg-orange-100 text-orange-600' :
                              Math.random() > 0.5 ? 'bg-gray-100 text-gray-600' :
                              'bg-white border border-gray-200 hover:border-orange-200'
                            }`}
                          >
                            {`${9 + i}:00`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="h-4 w-4 bg-orange-100 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">Booked</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-4 bg-gray-100 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">Unavailable</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-4 w-4 bg-white border border-gray-200 rounded mr-2"></div>
                      <span className="text-sm text-gray-600">Available</span>
                    </div>
                  </div>
                  <button className="btn-primary">Save Schedule</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsManagement;