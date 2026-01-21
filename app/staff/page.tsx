'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Edit,
  X
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { StaffMember, getStaffMembers, softDeleteStaffMember, restoreStaffMember } from '@/src/lib/staffService';
import AddStaffModal from '@/src/components/AddStaffModal';
import EditStaffModal from '@/src/components/EditStaffModal';
import ViewStaffModal from '@/src/components/ViewStaffModal';
import StaffAttendanceModal from '@/src/components/StaffAttendanceModal';
import CreateAccountModal from '@/src/components/CreateAccountModal';

interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  nightShift: number;
}

// Simple cache to prevent refetch on navigation
let staffDataCache: StaffMember[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function StaffPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(staffDataCache || []);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>(staffDataCache || []);
  const [deletedStaff, setDeletedStaff] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<StaffStats>(() => {
    if (staffDataCache) {
      return {
        totalStaff: staffDataCache.length,
        activeStaff: staffDataCache.filter(staff => staff.is_active).length,
        onLeave: 0,
        nightShift: 0
      };
    }
    return {
      totalStaff: 0,
      activeStaff: 0,
      onLeave: 0,
      nightShift: 0
    };
  });
  const [loading, setLoading] = useState(!staffDataCache);
  const [isInitialLoad, setIsInitialLoad] = useState(!staffDataCache);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showDeleted, setShowDeleted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const fetchStaffData = useCallback(async (forceRefresh = false) => {
    try {
      const now = Date.now();
      const isCacheValid = staffDataCache && (now - lastFetchTime) < CACHE_DURATION;
      
      // Use cache if available and valid, unless force refresh is requested
      if (isCacheValid && !forceRefresh && staffDataCache) {
        setStaffMembers(staffDataCache);
        
        // Calculate stats from cached data
        const totalStaff = staffDataCache.length;
        const activeStaff = staffDataCache.filter(staff => staff.is_active).length;
        
        setStats({
          totalStaff,
          activeStaff,
          onLeave: 0,
          nightShift: 0
        });
        
        setLoading(false);
        setIsInitialLoad(false);
        return;
      }

      if (!isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const data = (await getStaffMembers()).filter(s => s.role !== 'Doctor');
      
      // Update cache
      staffDataCache = data;
      lastFetchTime = now;
      
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
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  const fetchDeletedStaff = useCallback(async () => {
    try {
      const data = (await getStaffMembers({ include_deleted: true }))
        .filter(s => s.role !== 'Doctor')
        .filter(s => !!s.deleted_at);
      setDeletedStaff(data);
    } catch (err) {
      console.error('Error fetching deleted staff:', err);
      setDeletedStaff([]);
    }
  }, []);

  const filterStaff = useCallback(() => {
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
  }, [searchQuery, roleFilter, staffMembers]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  useEffect(() => {
    if (showDeleted) {
      fetchDeletedStaff();
    }
  }, [showDeleted, fetchDeletedStaff]);

  useEffect(() => {
    filterStaff();
  }, [filterStaff]);

  const roles = useMemo(() => {
    return ['All', ...new Set(staffMembers.map(s => s.role))].filter(role => role !== 'Doctor').sort();
  }, [staffMembers]);

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate staff member "${name}"? They will be hidden from the active list but can be restored later.`)) {
      return;
    }

    try {
      await softDeleteStaffMember(id);
      await fetchStaffData(true); // Force refresh after deletion
      alert('Staff member deactivated successfully.');
    } catch (error) {
      console.error('Error deactivating staff member:', error);
      alert('Failed to deactivate staff member. Please try again.');
    }
  };

  const handleRestoreStaff = async (id: string, name: string) => {
    if (!window.confirm(`Reactivate staff member "${name}"?`)) {
      return;
    }

    try {
      await restoreStaffMember(id);
      await fetchDeletedStaff();
      await fetchStaffData(true);
      alert('Staff member reactivated successfully.');
    } catch (error) {
      console.error('Error restoring staff member:', error);
      alert('Failed to reactivate staff member. Please try again.');
    }
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
  };

  const handleViewStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsViewModalOpen(true);
  };

  if (isInitialLoad && staffMembers.length === 0) {
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
        <div className="flex gap-3">
          <button
            onClick={() => setIsAttendanceModalOpen(true)}
            className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg shadow-blue-100 hover:shadow-blue-200 active:scale-95 gap-2 group"
          >
            <Calendar size={20} />
            Mark Attendance
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg shadow-orange-100 hover:shadow-orange-200 active:scale-95 gap-2 group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Add Staff Member
          </button>
        </div>
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="flex items-center px-4 py-3.5 bg-gray-50 rounded-2xl font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {viewMode === 'list' ? 'Grid View' : 'List View'}
          </button>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`flex items-center px-4 py-3.5 rounded-2xl font-medium transition-colors ${
              showDeleted
                ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {showDeleted ? 'Show Active' : 'Show Deleted'}
          </button>
        </div>
      </div>

      {/* Staff */}
      {!showDeleted && viewMode === 'list' ? (
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
                        <button 
                          className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-green-500 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStaff(staff);
                            setIsCreateAccountModalOpen(true);
                          }}
                          title="Create Login Account"
                        >
                          <UserPlus size={18} />
                        </button>
                        <button 
                          className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-orange-500 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewStaff(staff);
                          }}
                          title="View Staff Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-blue-500 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStaff(staff);
                          }}
                          title="Edit Staff"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-red-500 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStaff(staff.id, staff.name || 'Unknown');
                          }}
                          title="Delete Staff"
                        >
                          <UserMinus size={18} />
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

      ) : null}

      {!showDeleted && viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStaff.map((staff) => (
            <div key={staff.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${staff.is_active ? 'from-orange-400 to-orange-600' : 'from-gray-300 to-gray-400'} flex items-center justify-center text-white font-black text-lg shadow-sm`}>
                    {staff.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-base font-bold text-gray-900 leading-tight">{staff.name}</div>
                    <div className="text-sm text-gray-500">{staff.role}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1">{staff.employee_id || '---'}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide capitalize ${staff.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-50 text-red-600'
                }`}>
                  {staff.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <Building size={16} className="text-gray-400" />
                  {staff.department_name || 'Unassigned'}
                </div>
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <Mail size={16} className="text-gray-400" />
                  {staff.email || 'No email'}
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="px-3 py-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 text-sm font-medium"
                  onClick={() => handleViewStaff(staff)}
                >
                  View
                </button>
                <button
                  className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                  onClick={() => handleEditStaff(staff)}
                >
                  Edit
                </button>
                <button
                  className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 text-sm font-medium"
                  onClick={() => handleDeleteStaff(staff.id, staff.name || 'Unknown')}
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {showDeleted ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Deleted Staff</h3>
            <span className="text-sm text-gray-500">{deletedStaff.length} items</span>
          </div>
          <div className="divide-y divide-gray-50">
            {deletedStaff.map((staff) => (
              <div key={staff.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{staff.name}</div>
                  <div className="text-sm text-gray-500">{staff.role} • {staff.employee_id || '---'}</div>
                </div>
                <button
                  className="px-4 py-2 rounded-2xl bg-green-50 text-green-700 hover:bg-green-100 font-bold text-sm"
                  onClick={() => handleRestoreStaff(staff.id, staff.name || 'Unknown')}
                >
                  Reactivate
                </button>
              </div>
            ))}
            {deletedStaff.length === 0 && (
              <div className="py-16 text-center text-gray-500">No deleted staff.</div>
            )}
          </div>
        </div>
      ) : null}

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchStaffData(true)}
      />

      {/* Edit Staff Modal */}
      {selectedStaff && (
        <EditStaffModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedStaff(null);
          }}
          onSuccess={() => fetchStaffData(true)}
          staff={selectedStaff}
        />
      )}

      {/* View Staff Modal */}
      {selectedStaff && (
        <ViewStaffModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedStaff(null);
          }}
          staff={selectedStaff}
        />
      )}

      {/* Attendance Modal */}
      <StaffAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        staff={filteredStaff}
        onSuccess={() => fetchStaffData(true)}
      />

      {/* Create Account Modal */}
      {selectedStaff && (
        <CreateAccountModal
          isOpen={isCreateAccountModalOpen}
          onClose={() => setIsCreateAccountModalOpen(false)}
          onSuccess={() => fetchStaffData(true)}
          entityId={selectedStaff.id}
          entityType="staff"
          name={selectedStaff.name || ''}
          role={selectedStaff.role || ''}
          initialEmail={selectedStaff.email || ''}
        />
      )}

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