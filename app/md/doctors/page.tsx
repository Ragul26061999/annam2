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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Doctors Management</h1>
              <p className="text-gray-600 mt-1">Manage doctor profiles and schedules</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-50 px-4 py-2 rounded-xl">
                <span className="text-sm text-blue-600 font-medium">24 Doctors</span>
              </div>
              <button className="flex items-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                <Plus size={16} className="mr-2" />
                Add Doctor
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Doctors</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
                <div className="flex items-center mt-3">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-600">2 new this month</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Stethoscope className="text-white" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">On Duty</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">18</p>
                <div className="flex items-center mt-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-600">75% available</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Activity className="text-white" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Consultations Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">127</p>
                <div className="flex items-center mt-3">
                  <Clock className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-blue-600">42 pending</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="text-white" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search doctors by name, specialization, license..."
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:bg-white/80 transition-all duration-200"
              />
            </div>
            <div className="flex gap-3">
              <button className="flex items-center px-5 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 hover:shadow-md transition-all duration-200">
                <Filter size={16} className="mr-2" />
                Filter
              </button>
              <select className="px-5 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:bg-white/80 transition-all duration-200">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  PS
                </div>
                <div className="ml-4">
                  <h3 className="font-bold text-gray-900 text-lg">Dr. Priya Sharma</h3>
                  <p className="text-sm text-gray-500 font-medium">LICDOC001</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100/80 backdrop-blur-sm text-green-800 text-xs font-semibold rounded-full border border-green-200/50">
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

          <div className="bg-purple-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-700">Today's Schedule</p>
              <span className="text-xs text-purple-600">12/30 slots</span>
            </div>
            <p className="text-sm text-purple-900">9:00 AM - 5:00 PM</p>
            <p className="text-xs text-purple-600">Next: Sarah Johnson at 10:00 AM</p>
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
            <button className="flex-1 flex items-center justify-center bg-primary-50 text-primary-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors">
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
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
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

          <div className="bg-blue-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-blue-700">Today's Schedule</p>
              <span className="text-xs text-blue-600">18/25 slots</span>
            </div>
            <p className="text-sm text-blue-900">8:00 AM - 4:00 PM</p>
            <p className="text-xs text-blue-600">Next: Emma Watson at 2:15 PM</p>
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
            <button className="flex-1 flex items-center justify-center bg-primary-50 text-primary-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors">
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
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                AS
              </div>
              <div className="ml-3">
                <h3 className="font-semibold text-gray-900">Dr. Amit Singh</h3>
                <p className="text-sm text-gray-500">LICDOC004</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
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
              Emergency Medicine • 8 years exp
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Award size={14} className="mr-2" />
              MD, Emergency Medicine
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2" />
              Emergency • Ground Floor
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-red-700">Today's Schedule</p>
              <span className="text-xs text-red-600">24/24 slots</span>
            </div>
            <p className="text-sm text-red-900">24/7 Emergency Duty</p>
            <p className="text-xs text-red-600">Currently: Emergency Case</p>
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
            <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
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
    </div>
  );
}