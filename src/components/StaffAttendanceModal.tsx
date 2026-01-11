'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, XCircle, Calendar, Save } from 'lucide-react';
import { StaffMember, StaffAttendance, markAttendance, getStaffAttendance, updateAttendanceTime } from '@/src/lib/staffService';

interface StaffAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember[];
  onSuccess: () => void;
}

export default function StaffAttendanceModal({ isOpen, onClose, staff, onSuccess }: StaffAttendanceModalProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Map<string, {
    status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday';
    time_in: string;
    time_out: string;
    notes: string;
  }>>(new Map());
  const [existingAttendance, setExistingAttendance] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && selectedDate) {
      loadExistingAttendance();
    }
  }, [isOpen, selectedDate]);

  const loadExistingAttendance = async () => {
    try {
      setLoading(true);
      const attendance = await getStaffAttendance({
        start_date: selectedDate,
        end_date: selectedDate
      });
      setExistingAttendance(attendance);

      // Pre-populate attendance data
      const dataMap = new Map();
      attendance.forEach(a => {
        dataMap.set(a.staff_id, {
          status: a.status,
          time_in: a.time_in || '',
          time_out: a.time_out || '',
          notes: a.notes || ''
        });
      });
      setAttendanceData(dataMap);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (staffId: string, status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday') => {
    const current = attendanceData.get(staffId) || { status: 'present', time_in: '', time_out: '', notes: '' };
    setAttendanceData(new Map(attendanceData.set(staffId, { ...current, status })));
  };

  const handleTimeChange = (staffId: string, field: 'time_in' | 'time_out', value: string) => {
    const current = attendanceData.get(staffId) || { status: 'present', time_in: '', time_out: '', notes: '' };
    setAttendanceData(new Map(attendanceData.set(staffId, { ...current, [field]: value })));
  };

  const handleNotesChange = (staffId: string, notes: string) => {
    const current = attendanceData.get(staffId) || { status: 'present', time_in: '', time_out: '', notes: '' };
    setAttendanceData(new Map(attendanceData.set(staffId, { ...current, notes })));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      
      // Save attendance for all staff members
      const promises = staff.map(async (member) => {
        const data = attendanceData.get(member.id);
        if (data) {
          await markAttendance({
            staff_id: member.id,
            attendance_date: selectedDate,
            time_in: data.time_in || undefined,
            time_out: data.time_out || undefined,
            status: data.status,
            notes: data.notes || undefined
          });
        }
      });

      await Promise.all(promises);
      alert('Attendance marked successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-200';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'half_day': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'leave': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'holiday': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-6 pt-5 pb-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Calendar className="text-orange-500 mr-3" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Mark Staff Attendance</h3>
                  <p className="text-sm text-gray-500">Record attendance with time in/out</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X size={24} />
              </button>
            </div>

            {/* Date Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Attendance Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading attendance data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staff.map((member) => {
                      const data = attendanceData.get(member.id) || { status: 'present', time_in: '', time_out: '', notes: '' };
                      return (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.employee_id}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{member.role}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={data.status}
                              onChange={(e) => handleStatusChange(member.id, e.target.value as any)}
                              className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(data.status)}`}
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="half_day">Half Day</option>
                              <option value="leave">Leave</option>
                              <option value="holiday">Holiday</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="time"
                              value={data.time_in}
                              onChange={(e) => handleTimeChange(member.id, 'time_in', e.target.value)}
                              disabled={data.status === 'absent' || data.status === 'leave' || data.status === 'holiday'}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="time"
                              value={data.time_out}
                              onChange={(e) => handleTimeChange(member.id, 'time_out', e.target.value)}
                              disabled={data.status === 'absent' || data.status === 'leave' || data.status === 'holiday'}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={data.notes}
                              onChange={(e) => handleNotesChange(member.id, e.target.value)}
                              placeholder="Add notes..."
                              className="px-2 py-1 border border-gray-300 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center disabled:opacity-50"
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
