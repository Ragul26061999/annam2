import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Calendar, Filter, UserPlus, UserCog, AlertCircle } from 'lucide-react';
import { 
  getStaffMembers, 
  getDepartments, 
  getRoles, 
  createStaffMember, 
  updateStaffMember, 
  deleteStaffMember,
  bulkDeleteStaff,
  StaffMember 
} from '../lib/staffService';

const StaffManagement: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadStaffMembers();
  }, [searchTerm, selectedDepartment, selectedRole]);

  const loadInitialData = async () => {
    try {
      const [departmentsData, rolesData] = await Promise.all([
        getDepartments(),
        getRoles()
      ]);
      setDepartments(departmentsData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadStaffMembers = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (searchTerm) filters.search = searchTerm;
      if (selectedDepartment) filters.department = selectedDepartment;
      if (selectedRole) filters.role = selectedRole;
      
      const data = await getStaffMembers(filters);
      setStaffMembers(data);
      setError(null);
    } catch (err) {
      console.error('Error loading staff members:', err);
      setError('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await deleteStaffMember(id);
        await loadStaffMembers();
      } catch (err) {
        console.error('Error deleting staff member:', err);
        alert('Failed to delete staff member');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedRows.length} staff members?`)) {
      try {
        await bulkDeleteStaff(selectedRows);
        setSelectedRows([]);
        await loadStaffMembers();
      } catch (err) {
        console.error('Error bulk deleting staff:', err);
        alert('Failed to delete staff members');
      }
    }
  };

  const handleRowSelect = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === staffMembers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(staffMembers.map(staff => staff.id));
    }
  };

  const filteredStaffMembers = staffMembers;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <button 
            onClick={loadStaffMembers}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-gray-900">Staff Management</h1>
        <p className="text-gray-500 mt-1">Manage hospital staff and their schedules</p>
      </div>

      {/* Search and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search by name, role, department..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl w-96 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500" size={20} />
          </div>
          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <button className="btn-secondary flex items-center">
            <Filter size={18} className="mr-2" />
            Filter
          </button>
        </div>

        <div className="flex space-x-3">
          <button 
            className="btn-secondary flex items-center"
            onClick={() => setShowRoleModal(true)}
          >
            <UserCog size={18} className="mr-2" />
            New Role
          </button>
          <button 
            className="btn-primary flex items-center"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={18} className="mr-2" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Role Filter Chips */}
      <div className="flex space-x-2">
        {['All Staff', 'Nurses', 'Lab Technicians', 'Pharmacists', 'Administrative'].map((role) => (
          <button 
            key={role}
            className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-600"
          >
            {role}
          </button>
        ))}
      </div>

      {/* Staff Table */}
      <div className="card">
        {selectedRows.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between rounded-t-2xl">
            <span className="text-sm text-gray-600">{selectedRows.length} selected</span>
            <div className="space-x-2">
              <button className="btn-secondary text-sm">Assign Shift</button>
              <button 
                onClick={handleBulkDelete}
                className="btn-secondary text-sm text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 py-3 px-4">
                  <input 
                    type="checkbox"
                    checked={selectedRows.length === staffMembers.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-orange-300 rounded border-gray-300"
                  />
                </th>
                <th className="text-left py-3 px-4">Staff Member</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-left py-3 px-4">Shift</th>
                <th className="text-left py-3 px-4">Contact</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffMembers.map((staff, index) => (
                <tr 
                  key={staff.id} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50`}
                >
                  <td className="py-3 px-4">
                    <input 
                      type="checkbox"
                      checked={selectedRows.includes(staff.id)}
                      onChange={() => handleRowSelect(staff.id)}
                      className="h-4 w-4 text-orange-300 rounded border-gray-300"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <img 
                        src={staff.image} 
                        alt={staff.name} 
                        className="h-8 w-8 rounded-full object-cover" 
                      />
                      <span className="ml-3 font-medium text-gray-900">{staff.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{staff.role}</td>
                  <td className="py-3 px-4 text-gray-500">{staff.department}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      staff.shift === 'Morning' ? 'bg-green-50 text-green-600' :
                      staff.shift === 'Evening' ? 'bg-orange-50 text-orange-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {staff.shift}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{staff.contact}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end space-x-2">
                      <button 
                        className="text-gray-400 hover:text-orange-400"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setShowScheduleModal(true);
                        }}
                      >
                        <Calendar size={18} />
                      </button>
                      <button className="text-gray-400 hover:text-orange-400">
                        <Edit size={18} />
                      </button>
                      <button 
                        className="text-gray-400 hover:text-red-400"
                        onClick={() => handleDeleteStaff(staff.id)}
                      >
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Staff Member</h3>
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
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select className="input-field mt-1">
                      <option>Select Role</option>
                      <option>Nurse</option>
                      <option>Lab Technician</option>
                      <option>Pharmacist</option>
                      <option>Administrative Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select className="input-field mt-1">
                      <option>Select Department</option>
                      <option>ICU</option>
                      <option>Emergency</option>
                      <option>Laboratory</option>
                      <option>Pharmacy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Shift</label>
                    <select className="input-field mt-1">
                      <option>Select Shift</option>
                      <option>Morning (6:00 AM - 2:00 PM)</option>
                      <option>Evening (2:00 PM - 10:00 PM)</option>
                      <option>Night (10:00 PM - 6:00 AM)</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-orange-300 rounded border-gray-300" />
                    <label className="ml-2 text-sm text-gray-700">Send email notification</label>
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
                  Add Staff Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedStaff && (
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
                      src={selectedStaff.image} 
                      alt={selectedStaff.name} 
                      className="h-10 w-10 rounded-full object-cover" 
                    />
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{selectedStaff.name}</h3>
                      <p className="text-sm text-gray-500">{selectedStaff.role} - {selectedStaff.department}</p>
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
                        {['Morning', 'Evening', 'Night'].map((shift) => (
                          <div 
                            key={shift}
                            className={`p-2 rounded-lg text-xs cursor-pointer ${
                              Math.random() > 0.7 ? 'bg-orange-100 text-orange-600' :
                              Math.random() > 0.5 ? 'bg-gray-100 text-gray-600' :
                              'bg-white border border-gray-200 hover:border-orange-200'
                            }`}
                          >
                            {shift}
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
                      <span className="text-sm text-gray-600">Assigned</span>
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

      {/* New Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowRoleModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-5 pb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create New Role</h3>
                  <button 
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowRoleModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role Name</label>
                    <input type="text" className="input-field mt-1" placeholder="e.g., Senior Nurse" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select className="input-field mt-1">
                      <option>Select Department</option>
                      <option>ICU</option>
                      <option>Emergency</option>
                      <option>Laboratory</option>
                      <option>Pharmacy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role Description</label>
                    <textarea 
                      className="input-field mt-1" 
                      rows={3}
                      placeholder="Describe the responsibilities and requirements for this role"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Access Level</label>
                    <select className="input-field mt-1">
                      <option>Select Access Level</option>
                      <option>Basic</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>Administrative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Permissions</label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-primary-500 rounded border-gray-300" />
                        <span className="ml-2 text-sm text-gray-700">View patient records</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-primary-500 rounded border-gray-300" />
                        <span className="ml-2 text-sm text-gray-700">Edit patient records</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-primary-500 rounded border-gray-300" />
                        <span className="ml-2 text-sm text-gray-700">Manage appointments</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="h-4 w-4 text-primary-500 rounded border-gray-300" />
                        <span className="ml-2 text-sm text-gray-700">Access reports</span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowRoleModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setShowRoleModal(false)}
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;