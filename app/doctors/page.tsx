'use client';
import React from 'react';
import { 
  Stethoscope, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Calendar, 
  Phone, 
  MapPin,
  Users,
  Clock,
  Star,
  TrendingUp,
  Award,
  Activity,
  CheckCircle,
  MoreVertical
} from 'lucide-react';

export default function DoctorsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-gray-500 mt-1">Manage doctor profiles and schedules</p>
        </div>
        <button className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
          <Plus size={16} className="mr-2" />
          Add Doctor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Doctors</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">2 new this month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Stethoscope className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">On Duty</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">18</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">75% available</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Consultations Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">127</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">42 pending</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-300 to-orange-400 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">4.8</p>
              <div className="flex items-center mt-2">
                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                <span className="text-sm font-medium text-yellow-600">Excellent</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-500 rounded-xl flex items-center justify-center">
              <Award className="text-white" size={20} />
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
              placeholder="Search doctors by name, specialization, license..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Specializations</option>
              <option>Cardiology</option>
              <option>Pediatrics</option>
              <option>Orthopedics</option>
              <option>Emergency Medicine</option>
              <option>Radiology</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Doctor Card 1 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                PS
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Dr. Priya Sharma</h3>
                <p className="text-sm text-gray-500">LICDOC001</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Available
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Stethoscope size={14} className="mr-2" />
              Cardiology • 15 years exp
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              MD, Cardiology
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2" />
              Room 001 • First Floor
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-700">Today's Schedule</p>
              <span className="text-xs text-blue-600">12/30 slots</span>
            </div>
            <p className="text-sm text-blue-900">9:00 AM - 5:00 PM</p>
            <p className="text-xs text-blue-600">Next: Sarah Johnson at 10:00 AM</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.9</span>
              <span className="text-xs text-gray-500 ml-1">(156 reviews)</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">₹1,500</p>
              <p className="text-xs text-gray-500">Consultation</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-blue-50 text-blue-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Calendar size={14} className="mr-1" />
              Schedule
            </button>
          </div>
        </div>

        {/* Doctor Card 2 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                RK
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Dr. Rajesh Kumar</h3>
                <p className="text-sm text-gray-500">LICDOC002</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Available
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Stethoscope size={14} className="mr-2" />
              Pediatrics • 12 years exp
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              MD, Pediatrics
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2" />
              Room 002 • Second Floor
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-green-700">Today's Schedule</p>
              <span className="text-xs text-green-600">18/25 slots</span>
            </div>
            <p className="text-sm text-green-900">8:00 AM - 4:00 PM</p>
            <p className="text-xs text-green-600">Next: Emma Watson at 2:15 PM</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.7</span>
              <span className="text-xs text-gray-500 ml-1">(89 reviews)</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">₹1,200</p>
              <p className="text-xs text-gray-500">Consultation</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-green-50 text-green-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Calendar size={14} className="mr-1" />
              Schedule
            </button>
          </div>
        </div>

        {/* Doctor Card 3 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                AS
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Dr. Amit Singh</h3>
                <p className="text-sm text-gray-500">LICDOC004</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                Busy
              </span>
              <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Stethoscope size={14} className="mr-2" />
              Orthopedics • 8 years exp
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              MD, Orthopedics
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2" />
              Room 003 • Third Floor
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-700">Today's Schedule</p>
              <span className="text-xs text-purple-600">20/25 slots</span>
            </div>
            <p className="text-sm text-purple-900">10:00 AM - 6:00 PM</p>
            <p className="text-xs text-purple-600">Next: Michael Brown at 3:30 PM</p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium text-gray-900">4.8</span>
              <span className="text-xs text-gray-500 ml-1">(124 reviews)</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">₹2,000</p>
              <p className="text-xs text-gray-500">Emergency</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center bg-purple-50 text-purple-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors">
              <Eye size={14} className="mr-1" />
              View
            </button>
            <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
              <Calendar size={14} className="mr-1" />
              Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Doctors
        </button>
      </div>
    </div>
  );
}