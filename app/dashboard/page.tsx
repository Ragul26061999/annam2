'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Bed, 
  ArrowUpRight, 
  TrendingUp, 
  Heart, 
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Building2,
  Stethoscope,
  Brain,
  Eye,
  Bone,
  Baby,
  Zap,
  Shield,
  Pill,
  FlaskConical,
  UserPlus,
  LogOut,
  TrendingDown,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { getDashboardData, DashboardData } from '../../src/lib/dashboardService';
import { getCurrentUserProfile } from '../../src/lib/supabase';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const userProfile = await getCurrentUserProfile();
        setUser(userProfile);

        const data = await getDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    getDashboardData()
      .then(setDashboardData)
      .catch((err) => {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-xl text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name || 'Doctor'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-900">Today</p>
            <p className="text-xs text-gray-500">{currentDate}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Patients */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboardData?.stats?.totalPatients || 0}
              </p>
              <div className="flex items-center mt-2">
                 <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                 <span className="text-sm font-medium text-green-600">
                   +8.2%
                 </span>
                 <span className="text-xs text-gray-500 ml-1">from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Admitted Patients */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Admitted</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboardData?.stats?.admittedPatients || 0}
              </p>
              <div className="flex items-center mt-2">
                <UserCheck className="h-3 w-3 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-blue-600">Currently admitted</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <UserCheck className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Appointments Today */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboardData?.stats?.todayAppointments || 0}
              </p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">
                  {dashboardData?.stats?.upcomingAppointments || 0} upcoming
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
              <Calendar className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Bed Occupancy */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Bed Occupancy</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboardData?.stats?.occupiedBeds || 0}
              </p>
              <div className="flex items-center mt-2">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" 
                    style={{ width: `${dashboardData?.stats?.bedOccupancyRate || 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {dashboardData?.stats?.occupiedBeds || 0}/{dashboardData?.stats?.totalBeds || 0} beds
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
              <Bed className="text-white" size={20} />
            </div>
          </div>
        </div>

        {/* Critical Patients */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Critical Cases</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboardData?.stats?.criticalPatients || 0}
              </p>
              <div className="flex items-center mt-2">
                <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">Requires attention</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
              <Heart className="text-white" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-900">Today&apos;s Appointments</h2>
            <button className="flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-all duration-200">
              View all <ArrowUpRight size={14} className="ml-1" />
            </button>
          </div>
          
          <div className="space-y-3">
            {dashboardData?.recentAppointments?.slice(0, 3).map((appointment, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  {appointment.patientName?.split(' ').map(n => n[0]).join('') || 'P'}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{appointment.patientName}</h3>
                  <p className="text-xs text-gray-500">{appointment.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 text-sm">
                    {new Date(appointment.appointmentDate).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {appointment.status === 'confirmed' && <CheckCircle2 size={10} className="mr-1" />}
                    {appointment.status === 'pending' && <Clock size={10} className="mr-1" />}
                    {appointment.status === 'scheduled' && <UserCheck size={10} className="mr-1" />}
                    {appointment.status}
                  </span>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No appointments scheduled for today</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Hospital Status */}
        <div className="space-y-5">
          {/* Department Status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Department Status</h3>
            <div className="space-y-3">
              {dashboardData?.departmentStatus?.slice(0, 4).map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      dept.occupancyRate > 90 ? 'bg-red-500' :
                      dept.occupancyRate > 70 ? 'bg-orange-500' :
                      'bg-green-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    dept.occupancyRate > 90 ? 'text-red-600' :
                    dept.occupancyRate > 70 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {dept.occupancyRate}% Full
                  </span>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500">
                  <Building2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No department data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Staff on Duty</span>
                <span className="font-semibold text-gray-900">
                  {dashboardData?.quickStats?.staffOnDuty || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Pending Lab Results</span>
                <span className="font-semibold text-gray-900">
                  {dashboardData?.quickStats?.pendingLabResults || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Medicine Requests</span>
                <span className="font-semibold text-gray-900">
                  {dashboardData?.quickStats?.medicineRequests || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Discharge Today</span>
                <span className="font-semibold text-gray-900">
                  {dashboardData?.quickStats?.dischargeToday || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}