'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Clock,
  Phone,
  MapPin,
  UserCheck,
  TrendingUp,
  Shield,
  Award,
  Calendar,
  Star,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  UserPlus,
  ArrowUpDown,
  Mail,
  Building,
  Activity,
  UserMinus,
  X
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { StaffMember, getStaffMembers } from '@/src/lib/staffService';
import AddStaffModal from '@/src/components/AddStaffModal';

interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  nightShift: number;
}

export default function StaffPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    totalStaff: 0,
    activeStaff: 0,
    onLeave: 0,
    nightShift: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchStaffData();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [searchQuery, roleFilter, staffMembers]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = (await getStaffMembers()).filter(s => s.role !== 'Doctor');
      setStaffMembers(data);

      // Calculate stats
      const totalStaff = data.length;
      const activeStaff = data.filter(staff => staff.is_active).length;
      const onLeave = 0; // Placeholder until leave data is available
      const nightShift = 0; // Placeholder until shift data is available

      setStats({
        totalStaff,
        activeStaff,
        onLeave,
        nightShift
      });

    } catch (err: any) {
      console.error('Error fetching staff data:', err);
      const errorMessage = err.message || 'Failed to load staff data.';
      setError(`${errorMessage}. Please ensure the "staff" table exists in your database.`);
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staffMembers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(staff =>
        (staff.name || '').toLowerCase().includes(query) ||
        (staff.role || '').toLowerCase().includes(query) ||
        (staff.email || '').toLowerCase().includes(query) ||
        (staff.employee_id || '').toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'All') {
      filtered = filtered.filter(staff => staff.role === roleFilter);
    }

    setFilteredStaff(filtered);
  };

  const roles = ['All', ...new Set(staffMembers.map(s => s.role))].filter(role => role !== 'Doctor').sort();

  if (loading && staffMembers.length === 0) {
    return (
      <div className="space-y-6 p-8 bg-gray-50/50 min-h-screen">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-10">
            <div>
              <div className="h-10 bg-gray-200 rounded-xl w-48 mb-3"></div>
              <div className="h-5 bg-gray-200 rounded-lg w-72"></div>
            </div>
            <div className="h-12 bg-gray-200 rounded-2xl w-40"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 h-32 shadow-sm border border-gray-100"></div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 h-96 shadow-sm"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 bg-gray-50/50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Hospital Staff</h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2">
            <Users size={16} className="text-orange-500" />
            Manage team members, roles, and department allocations
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg shadow-orange-100 hover:shadow-orange-200 active:scale-95 gap-2 group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Add Staff Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'indigo', subtext: 'Registered members', bg: 'bg-indigo-50', text: 'text-indigo-600' },
          { label: 'Active Now', value: stats.activeStaff, icon: UserCheck, color: 'green', subtext: `${Math.round((stats.activeStaff / (stats.totalStaff || 1)) * 100)}% of total`, bg: 'bg-green-50', text: 'text-green-600' },
          { label: 'On Leave', value: stats.onLeave, icon: UserMinus, color: 'orange', subtext: 'Seasonal & Medical', bg: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Departments', value: new Set(staffMembers.map(s => s.department_id)).size, icon: Building, color: 'blue', subtext: 'Functional units', bg: 'bg-blue-50', text: 'text-blue-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                </div>
                <p className="text-sm font-medium text-gray-500 mt-1">{stat.subtext}</p>
              </div>
              <div className={`w-14 h-14 ${stat.bg} ${stat.text} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon size={28} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by name, role, email or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-3 min-w-[200px]">
          <Filter className="text-gray-400" size={20} />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 py-3.5 px-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none transition-all font-medium text-gray-700"
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Staff Member</th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">ID & Role</th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Department</th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${staff.is_active ? 'from-orange-400 to-orange-600' : 'from-gray-300 to-gray-400'} flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform`}>
                            {staff.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          {staff.is_active && (
                            <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <div className="text-base font-bold text-gray-900 leading-tight">{staff.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Mail size={12} className="text-gray-400" />
                            {staff.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold mb-1 uppercase tracking-wider">
                        {staff.role}
                      </div>
                      <div className="text-sm text-gray-400 font-mono">{staff.employee_id || '---'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <Building size={16} className="text-gray-400" />
                        {staff.department_name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide capitalize ${staff.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-50 text-red-600'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${staff.is_active ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-orange-500 transition-all">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-blue-500 transition-all">
                          <ArrowUpDown size={18} />
                        </button>
                        <button className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-indigo-500 transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <Users className="text-gray-300" size={40} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">No staff members found</h3>
                      <p className="text-gray-500 mt-1 max-w-xs mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
                      <button
                        onClick={() => { setSearchQuery(''); setRoleFilter('All'); }}
                        className="mt-6 text-orange-500 font-bold hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchStaffData}
      />

      {/* Error Toast (if any) */}
      {error && (
        <div className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500 z-50">
          <AlertCircle size={24} />
          <div>
            <p className="font-bold">Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}