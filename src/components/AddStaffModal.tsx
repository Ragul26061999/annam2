'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Building, Mail, Phone, IdCard, Calendar, Briefcase, Activity, CheckCircle, AlertCircle, RefreshCcw, Award } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { createStaffMember, generateNextEmployeeId } from '@/src/lib/staffService';

interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Department {
    id: string;
    name: string;
}

export default function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isAddingDepartment, setIsAddingDepartment] = useState(false);
    const [newDepartmentName, setNewDepartmentName] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'Staff',
        training_category: '',
        employee_id: '',
        department_id: '',
        hire_date: new Date().toISOString().split('T')[0],
        specialization: '',
        pf_number: '',
        esic_number: '',
        is_active: true
    });

    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
            resetForm();
            generateAndSetId();
        }
    }, [isOpen]);

    const generateAndSetId = async () => {
        try {
            const nextId = await generateNextEmployeeId();
            setFormData(prev => ({ ...prev, employee_id: nextId }));
        } catch (err) {
            console.error('Error generating employee ID:', err);
        }
    };

    const handleAddDepartment = async () => {
        if (!newDepartmentName.trim()) return;
        try {
            setSubmitting(true);
            const { data, error } = await supabase
                .from('departments')
                .insert([{ name: newDepartmentName.trim(), status: 'active' }])
                .select('id, name')
                .single();

            if (error) throw error;
            const created = data as Department;
            await fetchDepartments();
            setFormData(prev => ({ ...prev, department_id: created.id }));
            setNewDepartmentName('');
            setIsAddingDepartment(false);
        } catch (err: any) {
            console.error('Error adding department:', err);
            setError(err.message || 'Failed to add department. It might already exist.');
        } finally {
            setSubmitting(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('departments')
                .select('id, name')
                .eq('status', 'active')
                .order('name');

            if (error) throw error;

            setDepartments(data || []);
            if (data && data.length > 0 && !formData.department_id) {
                setFormData(prev => ({ ...prev, department_id: data[0].id }));
            }
        } catch (err) {
            console.error('Error fetching departments:', err);
            setError('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            role: 'Staff',
            training_category: '',
            employee_id: '',
            department_id: departments.length > 0 ? departments[0].id : '',
            hire_date: new Date().toISOString().split('T')[0],
            specialization: '',
            pf_number: '',
            esic_number: '',
            is_active: true
        });
        setError(null);
        setSuccess(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.first_name.trim()) {
            setError('First name is required');
            return;
        }
        if (!formData.last_name.trim()) {
            setError('Last name is required');
            return;
        }
        if (!formData.role) {
            setError('Role is required');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await createStaffMember({
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                role: formData.role,
                training_category: formData.training_category || undefined,
                employee_id: formData.employee_id || undefined,
                department_id: formData.department_id || undefined,
                hire_date: formData.hire_date || undefined,
                specialization: formData.specialization || undefined,
                pf_number: formData.pf_number || undefined,
                esic_number: formData.esic_number || undefined,
                is_active: formData.is_active
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            console.error('Error creating staff member:', err);
            if (err.code === '42P01' || err.message?.includes('does not exist')) {
                setError('The "staff" table does not exist. Please run the SQL migration script to create it.');
            } else {
                setError(err.message || 'Failed to create staff member. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-2xl">
                            <UserPlus className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Add New Staff</h2>
                            <p className="text-sm text-gray-500">Register a new member to your hospital team</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                        disabled={submitting}
                    >
                        <X className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        placeholder="e.g. John"
                                        className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                        disabled={submitting}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Last Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        placeholder="e.g. Doe"
                                        className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                        disabled={submitting}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Mail size={16} /> Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john.doe@example.com"
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Phone size={16} /> Phone Number
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+1 (555) 000-0000"
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Role */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Briefcase size={16} /> Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                                    disabled={submitting}
                                    required
                                >
                                    <option value="Nurse">Nurse</option>
                                    <option value="Receptionist">Receptionist</option>
                                    <option value="Pharmacist">Pharmacist</option>
                                    <option value="Lab Technician">Lab Technician</option>
                                    <option value="Staff">General Staff</option>
                                    <option value="Administrator">Administrator</option>
                                </select>
                            </div>

                            {/* Training Category */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Award size={16} /> Training Category
                                </label>
                                <input
                                    type="text"
                                    name="training_category"
                                    value={(formData as any).training_category}
                                    onChange={handleChange}
                                    placeholder="e.g. Basic, Advanced, ICU"
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Department */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Building size={16} /> Department
                                </label>
                                {loading ? (
                                    <div className="animate-pulse h-[50px] bg-gray-100 rounded-2xl"></div>
                                ) : (
                                    <div className="space-y-2">
                                        <select
                                            name="department_id"
                                            value={formData.department_id}
                                            onChange={handleChange}
                                            className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none appearance-none"
                                            disabled={submitting}
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>

                                        {!isAddingDepartment ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingDepartment(true)}
                                                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                                                disabled={submitting}
                                            >
                                                + Add new department
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newDepartmentName}
                                                    onChange={(e) => setNewDepartmentName(e.target.value)}
                                                    className="flex-1 pl-4 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                                    placeholder="Department name"
                                                    disabled={submitting}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddDepartment}
                                                    className="px-4 py-2.5 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600"
                                                    disabled={submitting || !newDepartmentName.trim()}
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIsAddingDepartment(false); setNewDepartmentName(''); }}
                                                    className="px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200"
                                                    disabled={submitting}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Employee ID */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <IdCard size={16} /> Employee ID
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="employee_id"
                                        value={formData.employee_id}
                                        onChange={handleChange}
                                        placeholder="EMP-001"
                                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none font-mono"
                                        disabled={submitting}
                                    />
                                    <button
                                        type="button"
                                        onClick={generateAndSetId}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                                        title="Regenerate ID"
                                        disabled={submitting}
                                    >
                                        <RefreshCcw size={16} className={submitting ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 pl-2 italic">Automatically generated. Click refresh icon to update.</p>
                            </div>

                            {/* Hire Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Calendar size={16} /> Hire Date
                                </label>
                                <input
                                    type="date"
                                    name="hire_date"
                                    value={formData.hire_date}
                                    onChange={handleChange}
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Specialization */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Activity size={16} /> Specialization (if applicable)
                                </label>
                                <input
                                    type="text"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleChange}
                                    placeholder="e.g. Cardiology, Pediatrics"
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                    disabled={submitting}
                                />
                            </div>

                            {/* PF Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <IdCard size={16} /> PF Number
                                </label>
                                <input
                                    type="text"
                                    name="pf_number"
                                    value={formData.pf_number}
                                    onChange={handleChange}
                                    placeholder="e.g. PF123456789"
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                    disabled={submitting}
                                />
                            </div>

                            {/* ESIC Number */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <IdCard size={16} /> ESIC Number
                                </label>
                                <input
                                    type="text"
                                    name="esic_number"
                                    value={formData.esic_number}
                                    onChange={handleChange}
                                    placeholder="e.g. ESIC987654321"
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Status */}
                            <div className="md:col-span-2 flex items-center gap-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                                    disabled={submitting}
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Currently active and on duty
                                </label>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-shake">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                <p className="text-sm text-green-700 font-medium">Staff member registered successfully!</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all duration-200"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Registering...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        Register Staff
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
