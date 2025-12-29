'use client';

import React, { useState } from 'react';
import { User, Stethoscope, Clock, Save, X, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface SessionTiming {
  startTime: string;
  endTime: string;
  maxPatients: number;
}

export interface DoctorFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  licenseNumber: string;
  specialization: string;
  department: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
  roomNumber: string;
  floorNumber: number;
  emergencyAvailable: boolean;
  sessions: {
    morning: SessionTiming;
    afternoon: SessionTiming;
    evening: SessionTiming;
  };
  availableSessions: string[];
}

interface DoctorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: DoctorFormData;
  setFormData: (data: DoctorFormData) => void;
  specializations: string[];
  departments: string[];
  isEditing?: boolean;
  title?: string;
  onAddDepartment?: (name: string) => Promise<void>;
}

const DoctorForm: React.FC<DoctorFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  specializations,
  departments,
  isEditing = false,
  title,
  onAddDepartment
}) => {
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  if (!isOpen) return null;

  const handleAddDept = async () => {
    if (!newDeptName.trim() || !onAddDepartment) return;

    setIsSubmittingDept(true);
    try {
      await onAddDepartment(newDeptName.trim());
      setFormData({ ...formData, department: newDeptName.trim() });
      setNewDeptName('');
      setIsAddingDepartment(false);
    } catch (error) {
      console.error('Error adding department:', error);
      alert('Failed to add department. It might already exist.');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="inline-block align-bottom bg-white/95 backdrop-blur-sm rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="bg-white/90 backdrop-blur-sm px-6 pt-5 pb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {title || (isEditing ? 'Edit Doctor' : 'Add New Doctor')}
              </h3>
              <button
                className="text-gray-400 hover:text-gray-500 transition-colors"
                onClick={onClose}
              >
                <X size={24} />
              </button>
            </div>

            <form className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User size={20} className="mr-2 text-blue-500" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="Dr. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="doctor@hospital.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="LICDOC001"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                    placeholder="Complete address"
                  />
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Stethoscope size={20} className="mr-2 text-purple-500" />
                  Professional Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                    >
                      <option value="">Select Specialization</option>
                      {specializations.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <div className="flex gap-2">
                      {isAddingDepartment ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            placeholder="Dept Name"
                            className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddDept}
                            disabled={isSubmittingDept || !newDeptName.trim()}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                            title="Save Department"
                          >
                            <Check size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingDepartment(false);
                              setNewDeptName('');
                            }}
                            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                            title="Cancel"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                          >
                            <option value="">Select Department</option>
                            {departments.filter(dept => dept !== 'All').map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsAddingDepartment(true)}
                            className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Add New Department"
                          >
                            <Plus size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="MD, Cardiology"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      value={formData.experienceYears}
                      onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      value={formData.consultationFee}
                      onChange={(e) => setFormData({ ...formData, consultationFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="1500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                      placeholder="001"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clock size={20} className="mr-2 text-orange-500" />
                  Session-Based Availability
                </h4>

                {/* Session Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Available Sessions</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: 'morning', label: 'Morning', icon: '🌅', time: '9:00 AM - 12:00 PM' },
                      { key: 'afternoon', label: 'Afternoon', icon: '☀️', time: '2:00 PM - 5:00 PM' },
                      { key: 'evening', label: 'Evening', icon: '🌆', time: '6:00 PM - 9:00 PM' }
                    ].map((session) => (
                      <div key={session.key} className="relative">
                        <input
                          type="checkbox"
                          id={session.key}
                          checked={formData.availableSessions.includes(session.key)}
                          onChange={(e) => {
                            const newSessions = e.target.checked
                              ? [...formData.availableSessions, session.key]
                              : formData.availableSessions.filter(s => s !== session.key);
                            setFormData({ ...formData, availableSessions: newSessions });
                          }}
                          className="sr-only"
                        />
                        <label
                          htmlFor={session.key}
                          className={`block p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${formData.availableSessions.includes(session.key)
                              ? 'border-orange-300 bg-gradient-to-br from-orange-50/80 to-orange-100/60 shadow-lg'
                              : 'border-gray-200 bg-white/80 hover:border-orange-200 hover:bg-orange-50/40'
                            }`}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">{session.icon}</div>
                            <div className="font-medium text-gray-900">{session.label}</div>
                            <div className="text-sm text-gray-600 mt-1">{session.time}</div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Details */}
                {formData.availableSessions.map((sessionKey) => (
                  <div key={sessionKey} className="mb-6 p-4 bg-gradient-to-r from-orange-50/50 to-orange-100/30 rounded-xl border border-orange-200/50">
                    <h5 className="font-medium text-gray-900 mb-3 capitalize flex items-center">
                      <span className="mr-2">
                        {sessionKey === 'morning' ? '🌅' : sessionKey === 'afternoon' ? '☀️' : '🌆'}
                      </span>
                      {sessionKey} Session Details
                    </h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={formData.sessions[sessionKey as keyof typeof formData.sessions].startTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            sessions: {
                              ...formData.sessions,
                              [sessionKey]: {
                                ...formData.sessions[sessionKey as keyof typeof formData.sessions],
                                startTime: e.target.value
                              }
                            }
                          })}
                          className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/90 backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={formData.sessions[sessionKey as keyof typeof formData.sessions].endTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            sessions: {
                              ...formData.sessions,
                              [sessionKey]: {
                                ...formData.sessions[sessionKey as keyof typeof formData.sessions],
                                endTime: e.target.value
                              }
                            }
                          })}
                          className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/90 backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Patients</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={formData.sessions[sessionKey as keyof typeof formData.sessions].maxPatients}
                          onChange={(e) => setFormData({
                            ...formData,
                            sessions: {
                              ...formData.sessions,
                              [sessionKey]: {
                                ...formData.sessions[sessionKey as keyof typeof formData.sessions],
                                maxPatients: parseInt(e.target.value) || 1
                              }
                            }
                          })}
                          className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/90 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Working Days */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Working Days</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        className={`px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 border-2 ${formData.workingDays.includes(index)
                            ? 'border-orange-300 bg-gradient-to-br from-orange-50/80 to-orange-100/60 text-orange-700 shadow-lg'
                            : 'border-gray-200 bg-white/80 text-gray-600 hover:border-orange-200 hover:bg-orange-50/40'
                          }`}
                        onClick={() => {
                          const newWorkingDays = formData.workingDays.includes(index)
                            ? formData.workingDays.filter(d => d !== index)
                            : [...formData.workingDays, index];
                          setFormData({ ...formData, workingDays: newWorkingDays });
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emergency Availability */}
                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id="emergencyAvailable"
                    checked={formData.emergencyAvailable}
                    onChange={(e) => setFormData({ ...formData, emergencyAvailable: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="emergencyAvailable" className="ml-2 text-sm text-gray-700">
                    Available for emergency calls
                  </label>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 flex justify-end space-x-3">
            <button
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center"
              onClick={onSubmit}
            >
              <Save size={16} className="mr-2" />
              {isEditing ? 'Update Doctor' : 'Add Doctor'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DoctorForm;