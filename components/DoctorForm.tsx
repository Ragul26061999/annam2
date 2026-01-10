'use client';

import React, { useState } from 'react';
import { User, Stethoscope, Clock, Save, X, Plus, Check, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionTiming {
  startTime: string;
  endTime: string;
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
  onSubmit: () => Promise<void>;
  formData: DoctorFormData;
  setFormData: (data: DoctorFormData) => void;
  specializations: string[];
  departments: string[];
  isEditing?: boolean;
  title?: string;
  onAddDepartment?: (name: string) => Promise<void>;
}

interface ValidationErrors {
  [key: string]: string;
}

interface ErrorDialogProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({ show, title, message, onClose }) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
            <div className="flex items-center text-white">
              <AlertCircle size={24} className="mr-3" />
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed">{message}</p>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium"
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface SuccessDialogProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({ show, message, onClose }) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
            <div className="flex items-center text-white">
              <CheckCircle2 size={24} className="mr-3" />
              <h3 className="text-lg font-semibold">Success</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed">{message}</p>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium"
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

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
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogContent, setErrorDialogContent] = useState({ title: '', message: '' });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [openSections, setOpenSections] = useState({
    personal: true,
    professional: true,
    schedule: false
  });

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }

    // Email validation (optional)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional)
    if (formData.phone.trim() && !/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Specialization validation
    if (!formData.specialization) {
      errors.specialization = 'Specialization is required';
    }

    // Qualification validation (optional)
    // No validation required - qualification is optional

    // Experience validation
    if (formData.experienceYears < 0) {
      errors.experienceYears = 'Experience cannot be negative';
    }

    // Consultation fee validation
    if (formData.consultationFee < 0) {
      errors.consultationFee = 'Consultation fee cannot be negative';
    }

    // Working days validation (optional)
    // No validation required - working days are optional

    // Available sessions validation (optional)
    // No validation required - sessions are optional

    // Session timing validation
    for (const sessionKey of formData.availableSessions) {
      const session = formData.sessions[sessionKey as keyof typeof formData.sessions];
      if (session.startTime >= session.endTime) {
        errors[`session_${sessionKey}`] = `${sessionKey} session: Start time must be before end time`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      setErrorDialogContent({
        title: 'Validation Error',
        message: 'Please fill in all required fields correctly before submitting.'
      });
      setShowErrorDialog(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
      setSuccessMessage(isEditing ? 'Doctor updated successfully!' : 'Doctor created successfully!');
      setShowSuccessDialog(true);
      
      // Close form after short delay
      setTimeout(() => {
        setShowSuccessDialog(false);
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error submitting doctor form:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      let errorTitle = 'Error';

      if (error.message) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('email') && (msg.includes('already exists') || msg.includes('already registered') || msg.includes('duplicate'))) {
          errorTitle = 'Email Already Exists';
          errorMessage = `A doctor with the email "${formData.email}" already exists in the system. Please use a different email address or contact the administrator.`;
        } else if (msg.includes('phone') && msg.includes('duplicate')) {
          errorTitle = 'Phone Number Already Exists';
          errorMessage = 'This phone number is already registered in the system. Please use a different phone number.';
        } else if (msg.includes('license') && msg.includes('duplicate')) {
          errorTitle = 'License Number Already Exists';
          errorMessage = 'This license number is already registered. Please verify the license number.';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorTitle = 'Network Error';
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
        } else if (msg.includes('permission') || msg.includes('unauthorized')) {
          errorTitle = 'Permission Denied';
          errorMessage = 'You do not have permission to perform this action. Please contact your administrator.';
        } else {
          errorMessage = error.message;
        }
      }

      setErrorDialogContent({ title: errorTitle, message: errorMessage });
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDept = async () => {
    if (!newDeptName.trim() || !onAddDepartment) return;

    setIsSubmittingDept(true);
    try {
      await onAddDepartment(newDeptName.trim());
      setFormData({ ...formData, department: newDeptName.trim() });
      setNewDeptName('');
      setIsAddingDepartment(false);
    } catch (error: any) {
      console.error('Error adding department:', error);
      setErrorDialogContent({
        title: 'Error Adding Department',
        message: error.message || 'Failed to add department. It might already exist.'
      });
      setShowErrorDialog(true);
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors[fieldName];
  };

  const hasFieldError = (fieldName: string): boolean => {
    return !!validationErrors[fieldName];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm"
    >
      <div className="flex items-start sm:items-center justify-center min-h-screen p-4 sm:p-6 text-center">
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
              <div className="rounded-2xl border border-gray-200 bg-white/70">
                <button
                  type="button"
                  onClick={() => setOpenSections((p) => ({ ...p, personal: !p.personal }))}
                  className="w-full px-5 py-4 flex items-center justify-between"
                >
                  <h4 className="text-lg font-medium text-gray-900 flex items-center">
                    <User size={20} className="mr-2 text-blue-500" />
                    Personal Information
                  </h4>
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${openSections.personal ? 'rotate-180' : ''}`}
                  />
                </button>
                {openSections.personal && (
                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            if (hasFieldError('name')) {
                              const newErrors = { ...validationErrors };
                              delete newErrors.name;
                              setValidationErrors(newErrors);
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white/80 backdrop-blur-sm transition-colors ${
                            hasFieldError('name')
                              ? 'border-red-300 focus:ring-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-300'
                          }`}
                          placeholder="Dr. John Doe"
                        />
                        {hasFieldError('name') && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={14} className="mr-1" />
                            {getFieldError('name')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (hasFieldError('email')) {
                              const newErrors = { ...validationErrors };
                              delete newErrors.email;
                              setValidationErrors(newErrors);
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white/80 backdrop-blur-sm transition-colors ${
                            hasFieldError('email')
                              ? 'border-red-300 focus:ring-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-300'
                          }`}
                          placeholder="doctor@hospital.com"
                          disabled={isEditing}
                        />
                        {hasFieldError('email') && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={14} className="mr-1" />
                            {getFieldError('email')}
                          </p>
                        )}
                        {!isEditing && !formData.email.trim() && !hasFieldError('email') && (
                          <p className="mt-1 text-xs text-gray-500">Optional. If left empty, a system email like name0001@annam.com will be generated.</p>
                        )}
                        {isEditing && (
                          <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value });
                            if (hasFieldError('phone')) {
                              const newErrors = { ...validationErrors };
                              delete newErrors.phone;
                              setValidationErrors(newErrors);
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white/80 backdrop-blur-sm transition-colors ${
                            hasFieldError('phone')
                              ? 'border-red-300 focus:ring-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-300'
                          }`}
                          placeholder="+91 9876543210"
                        />
                        {hasFieldError('phone') && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={14} className="mr-1" />
                            {getFieldError('phone')}
                          </p>
                        )}
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
                )}
              </div>

              {/* Professional Information */}
              <div className="rounded-2xl border border-gray-200 bg-white/70">
                <button
                  type="button"
                  onClick={() => setOpenSections((p) => ({ ...p, professional: !p.professional }))}
                  className="w-full px-5 py-4 flex items-center justify-between"
                >
                  <h4 className="text-lg font-medium text-gray-900 flex items-center">
                    <Stethoscope size={20} className="mr-2 text-purple-500" />
                    Professional Information
                  </h4>
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${openSections.professional ? 'rotate-180' : ''}`}
                  />
                </button>
                {openSections.professional && (
                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Specialization <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.specialization}
                          onChange={(e) => {
                            const selectedSpec = e.target.value;
                            setFormData({
                              ...formData,
                              specialization: selectedSpec,
                              department: selectedSpec
                            });
                            if (hasFieldError('specialization')) {
                              const newErrors = { ...validationErrors };
                              delete newErrors.specialization;
                              setValidationErrors(newErrors);
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white/80 backdrop-blur-sm transition-colors ${
                            hasFieldError('specialization')
                              ? 'border-red-300 focus:ring-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-300'
                          }`}
                          required
                        >
                          <option value="">Select Specialization</option>
                          {specializations.map(spec => (
                            <option key={spec} value={spec}>{spec}</option>
                          ))}
                        </select>
                        {hasFieldError('specialization') && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={14} className="mr-1" />
                            {getFieldError('specialization')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 backdrop-blur-sm"
                          placeholder="Auto-filled from specialization"
                          readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">Auto-filled based on specialization</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                        <input
                          type="text"
                          value={formData.qualification}
                          onChange={(e) => {
                            setFormData({ ...formData, qualification: e.target.value });
                            if (hasFieldError('qualification')) {
                              const newErrors = { ...validationErrors };
                              delete newErrors.qualification;
                              setValidationErrors(newErrors);
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white/80 backdrop-blur-sm transition-colors ${
                            hasFieldError('qualification')
                              ? 'border-red-300 focus:ring-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-300'
                          }`}
                          placeholder="MD, Cardiology"
                        />
                        {hasFieldError('qualification') && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={14} className="mr-1" />
                            {getFieldError('qualification')}
                          </p>
                        )}
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
                )}
              </div>

              {/* Schedule Information */}
              <div className="rounded-2xl border border-gray-200 bg-white/70">
                <button
                  type="button"
                  onClick={() => setOpenSections((p) => ({ ...p, schedule: !p.schedule }))}
                  className="w-full px-5 py-4 flex items-center justify-between"
                >
                  <h4 className="text-lg font-medium text-gray-900 flex items-center">
                    <Clock size={20} className="mr-2 text-orange-500" />
                    Session-Based Availability
                  </h4>
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${openSections.schedule ? 'rotate-180' : ''}`}
                  />
                </button>

                {openSections.schedule && (
                  <div className="px-5 pb-5">
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
                )}
              </div>
            </form>

          <div className="bg-gray-50/80 backdrop-blur-sm px-6 py-4 flex justify-end space-x-3">
            <button
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
              className={`px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {isEditing ? 'Update Doctor' : 'Add Doctor'}
                </>
              )}
            </motion.button>
          </div>
        </div>
        </motion.div>
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        show={showErrorDialog}
        title={errorDialogContent.title}
        message={errorDialogContent.message}
        onClose={() => setShowErrorDialog(false)}
      />

      {/* Success Dialog */}
      <SuccessDialog
        show={showSuccessDialog}
        message={successMessage}
        onClose={() => {
          setShowSuccessDialog(false);
          onClose();
        }}
      />
    </motion.div>
  );
};

export default DoctorForm;