import React, { useState, useEffect } from 'react';
import { Users, Calendar, Pill, Bed, TrendingUp, ArrowUpRight } from 'lucide-react';

// Components
import StatCard from '../components/StatCard';
import AppointmentItem from '../components/AppointmentItem';
import PatientRow from '../components/PatientRow';
import { getDashboardData, DashboardData } from '../lib/dashboardService';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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
          <span className="text-red-800">{error}</span>
          <button 
            onClick={loadDashboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, Dr. Chen</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Patients" 
          value={dashboardData.stats.totalPatients.toLocaleString()} 
          change="+0%" 
          trend="up" 
          icon={<Users className="text-orange-300" />} 
        />
        <StatCard 
          title="Today's Appointments" 
          value={dashboardData.stats.todayAppointments.toString()} 
          change="+0%" 
          trend="up" 
          icon={<Calendar className="text-blue-400" />} 
        />
        <StatCard 
          title="Available Beds" 
          value={dashboardData.stats.availableBeds.toString()} 
          change={`${dashboardData.stats.bedOccupancyRate}% occupied`} 
          trend="up" 
          icon={<Bed className="text-green-400" />} 
        />
        <StatCard 
          title="Active Doctors" 
          value={dashboardData.stats.availableDoctors.toString()} 
          change={`of ${dashboardData.stats.totalDoctors} total`} 
          trend="up" 
          icon={<Users className="text-red-400" />} 
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-gray-900">Upcoming Appointments</h2>
            <button className="text-orange-400 hover:text-orange-500 text-sm font-medium flex items-center">
              View all <ArrowUpRight size={16} className="ml-1" />
            </button>
          </div>
          
          <div className="card divide-y divide-gray-100">
            {dashboardData.recentAppointments.map((appointment) => (
              <AppointmentItem 
                key={appointment.id}
                name={appointment.patientName} 
                time={appointment.appointmentTime} 
                date={appointment.appointmentDate} 
                type={appointment.type} 
                image="https://images.pexels.com/photos/761963/pexels-photo-761963.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1"
              />
            ))}
          </div>
        </div>
        
        {/* Recent Patients */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-gray-900">Recent Patients</h2>
            <button className="text-orange-400 hover:text-orange-500 text-sm font-medium flex items-center">
              View all <ArrowUpRight size={16} className="ml-1" />
            </button>
          </div>
          
          <div className="card">
            {dashboardData.recentPatients.map((patient) => (
              <PatientRow 
                key={patient.id}
                name={patient.name} 
                status={patient.status as 'Critical' | 'Stable' | 'Recovering' | 'Admitted' | 'Diagnosed' | 'Consulting'} 
                condition={patient.condition} 
                image="https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=30&h=30&dpr=1"
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Hospital Status */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-gray-900">Hospital Status</h2>
          <button className="text-orange-400 hover:text-orange-500 text-sm font-medium">Refresh</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardData.bedStatus.map((status, index) => (
            <div key={index} className="flex flex-col">
              <span className="text-gray-500 text-sm">{status.bedType} Beds</span>
              <div className="flex items-end mt-2">
                <span className="text-2xl font-medium text-gray-900">{status.occupied}/{status.total}</span>
                <span className={`text-xs ml-2 ${
                  status.occupancyRate > 80 ? 'text-red-500' : 
                  status.occupancyRate > 60 ? 'text-orange-500' : 'text-green-500'
                }`}>{status.occupancyRate}% occupied</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className={`h-2 rounded-full ${
                  status.occupancyRate > 80 ? 'bg-red-400' : 
                  status.occupancyRate > 60 ? 'bg-orange-300' : 'bg-green-400'
                }`} style={{ width: `${status.occupancyRate}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;