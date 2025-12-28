import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Loader2 } from 'lucide-react';

interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface StaffSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    required?: boolean;
    label?: string;
    department?: string; // Optional filter by department
}

export default function StaffSelect({
    value,
    onChange,
    className = '',
    required = false,
    label = 'Attending Staff',
    department
}: StaffSelectProps) {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStaff();
    }, [department]);

    const fetchStaff = async () => {
        try {
            let query = supabase
                .from('staff')
                .select('id, first_name, last_name, role')
                .eq('is_active', true)
                .order('first_name');

            // Filter out Doctors as they are usually handled separately, unless requested otherwise
            // The user asked to track which *staff* created the data. Doctors usually dictate, staff enters.
            // We will exclude 'Doctor' role to keep it clean, or keep them if they also do data entry.
            // Based on previous context, 'Doctor' was removed from staff lists.
            // query = query.neq('role', 'Doctor'); 

            const { data, error } = await query;

            if (error) throw error;
            setStaff(data || []);

            // If we have a value but it's not in the list (e.g. inactive), handle gracefully?
            // For now, standard select.
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`space-y-1 ${className}`}>
            {label && (
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <User size={16} />}
                </div>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50"
                >
                    <option value="">Select Staff Member...</option>
                    {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                            {member.first_name} {member.last_name} ({member.role})
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
