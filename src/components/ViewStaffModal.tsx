'use client';

import React from 'react';
import { X, Eye, Building, Mail, Phone, IdCard, Calendar, Briefcase, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { StaffMember } from '@/src/lib/staffService';

interface ViewStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff: StaffMember | null;
}

export default function ViewStaffModal({ isOpen, onClose, staff }: ViewStaffModalProps) {
    if (!isOpen || !staff) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const DetailRow = ({ icon: Icon, label, value, className = "" }: { 
        icon: React.ElementType; 
        label: string; 
        value: string | React.ReactNode;
        className?: string;
    }) => (
        <div className={`flex items-start gap-3 p-3 bg-gray-50/50 rounded-xl ${className}`}>
            <div className="p-2 bg-white rounded-lg shadow-sm">
                <Icon size={16} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-2xl">
                            <Eye className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Staff Details</h2>
                            <p className="text-sm text-gray-500">View staff member information</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                    >
                        <X className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    {/* Staff Avatar and Basic Info */}
                    <div className="flex items-center gap-6 mb-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100">
                        <div className="relative">
                            <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${staff.is_active ? 'from-green-400 to-green-600' : 'from-gray-300 to-gray-400'} flex items-center justify-center text-white font-black text-2xl shadow-lg`}>
                                {staff.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            {staff.is_active && (
                                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                                    <CheckCircle size={14} className="text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{staff.name}</h3>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                                    {staff.role}
                                </span>
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide capitalize ${
                                    staff.is_active
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-50 text-red-600'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${staff.is_active ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                                    {staff.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4 mb-8">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Mail size={20} className="text-gray-400" />
                            Contact Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow
                                icon={Mail}
                                label="Email Address"
                                value={staff.email || 'No email provided'}
                            />
                            <DetailRow
                                icon={Phone}
                                label="Phone Number"
                                value={staff.phone || 'No phone provided'}
                            />
                        </div>
                    </div>

                    {/* Employment Details */}
                    <div className="space-y-4 mb-8">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Briefcase size={20} className="text-gray-400" />
                            Employment Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow
                                icon={IdCard}
                                label="Employee ID"
                                value={staff.employee_id || 'Not assigned'}
                                className="font-mono"
                            />
                            <DetailRow
                                icon={Calendar}
                                label="Hire Date"
                                value={formatDate(staff.hire_date)}
                            />
                            <DetailRow
                                icon={Building}
                                label="Department"
                                value={staff.department_name || 'Unassigned'}
                            />
                            <DetailRow
                                icon={Activity}
                                label="Specialization"
                                value={staff.specialization || 'Not specified'}
                            />
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <IdCard size={20} className="text-gray-400" />
                            Additional Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailRow
                                icon={IdCard}
                                label="PF Number"
                                value={staff.pf_number || 'Not provided'}
                            />
                            <DetailRow
                                icon={IdCard}
                                label="ESIC Number"
                                value={staff.esic_number || 'Not provided'}
                            />
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <div>
                                Created: {formatDate(staff.created_at)}
                            </div>
                            <div>
                                Last Updated: {formatDate(staff.updated_at)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 p-8 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-all duration-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
