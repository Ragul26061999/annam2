'use client';
import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Clock, 
  User, 
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  CalendarDays,
  MoreVertical,
  Phone,
  Stethoscope
} from 'lucide-react';
import AppointmentBookingModal from '../../src/components/AppointmentBookingModal';

export default function AppointmentsPage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleAppointmentSuccess = (appointment: any) => {
    console.log('Appointment created:', appointment);
    // Refresh appointments list or update state
    setIsBookingModalOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage patient appointments and schedules</p>
        </div>
        <button 
          onClick={() => setIsBookingModalOpen(true)}
          className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Plus size={16} className="mr-2" />
          New Appointment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">42</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+8 from yesterday</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Calendar className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">28</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">67% success rate</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Next at 10:30 AM</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-300 to-orange-400 rounded-xl flex items-center justify-center">
              <Clock className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">2</p>
              <div className="flex items-center mt-2">
                <XCircle className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">5% cancellation</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <XCircle className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search appointments by patient name, doctor, or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Status</option>
              <option>Scheduled</option>
              <option>Completed</option>
              <option>Cancelled</option>
              <option>No Show</option>
            </select>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Custom Range</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {/* Appointment Card 1 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                10:00
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Yogitha S</h3>
                <p className="text-sm text-gray-500">AH25075452 • Cardiology Consultation</p>
                <div className="flex items-center mt-1 space-x-4">
                  <div className="flex items-center text-xs text-gray-600">
                    <Stethoscope size={12} className="mr-1" />
                    Dr. Priya Sharma
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin size={12} className="mr-1" />
                    ROOM001
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Phone size={12} className="mr-1" />
                    9988778899
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Scheduled
              </span>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Card 2 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                09:30
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">James Wilson</h3>
                <p className="text-sm text-gray-500">PAT002 • Emergency Medicine Consultation</p>
                <div className="flex items-center mt-1 space-x-4">
                  <div className="flex items-center text-xs text-gray-600">
                    <Stethoscope size={12} className="mr-1" />
                    Dr. Amit Singh
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin size={12} className="mr-1" />
                    ROOM004
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Phone size={12} className="mr-1" />
                    +1-555-123-4567
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Completed
              </span>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Card 3 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                14:15
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Olivia Martinez</h3>
                <p className="text-sm text-gray-500">PAT003 • Pediatric Consultation</p>
                <div className="flex items-center mt-1 space-x-4">
                  <div className="flex items-center text-xs text-gray-600">
                    <Stethoscope size={12} className="mr-1" />
                    Dr. Rajesh Kumar
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin size={12} className="mr-1" />
                    ROOM002
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Phone size={12} className="mr-1" />
                    +1-555-987-6543
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                Scheduled
              </span>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Card 4 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                11:45
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Noah Parker</h3>
                <p className="text-sm text-gray-500">PAT004 • Orthopedic Consultation</p>
                <div className="flex items-center mt-1 space-x-4">
                  <div className="flex items-center text-xs text-gray-600">
                    <Stethoscope size={12} className="mr-1" />
                    Dr. Sunita Patel
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <MapPin size={12} className="mr-1" />
                    ROOM003
                  </div>
                  <div className="flex items-center text-xs text-gray-600">
                    <Phone size={12} className="mr-1" />
                    +1-555-234-5678
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                Cancelled
              </span>
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Appointments
        </button>
      </div>

      {/* Appointment Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={handleAppointmentSuccess}
      />
    </div>
  );
}