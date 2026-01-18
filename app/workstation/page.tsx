'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Plus,
  Eye,
  Monitor,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Settings,
  MoreVertical,
  Download,
  Upload,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';

interface LabTest {
  id: string;
  test_name: string;
  test_type: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  priority: string;
  sample_collected_at: string;
  results_available_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LabReport {
  id: string;
  test_id: string;
  report_data: any;
  generated_at: string;
  reviewed_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WorkstationStats {
  activeTests: number;
  equipmentOnline: number;
  totalEquipment: number;
  pendingReports: number;
  alerts: number;
}

export default function WorkstationPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [stats, setStats] = useState<WorkstationStats>({
    activeTests: 0,
    equipmentOnline: 0,
    totalEquipment: 0,
    pendingReports: 0,
    alerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkstationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch lab tests
      const { data: testsData, error: testsError } = await supabase
        .from('lab_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      // Fetch lab reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      setLabTests(testsData || []);
      setLabReports(reportsData || []);

      // Calculate stats
      const activeTests = (testsData || []).filter((test: any) =>
        test.status === 'in_progress' || test.status === 'pending'
      ).length;

      const pendingReports = (reportsData || []).filter((report: any) =>
        report.status === 'pending' || report.reviewed_by === null
      ).length;

      // Mock equipment data since we don't have equipment table
      const equipmentOnline = 18;
      const totalEquipment = 20;
      const alerts = totalEquipment - equipmentOnline;

      setStats({
        activeTests,
        equipmentOnline,
        totalEquipment,
        pendingReports,
        alerts
      });

    } catch (err) {
      console.error('Error fetching workstation data:', err);
      setError('Failed to load workstation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkstationData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchWorkstationData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Workstation</h1>
          <p className="text-gray-500 mt-1">Monitor lab tests, equipment, and diagnostic reports</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Upload size={16} className="mr-2" />
            Upload Report
          </button>
          <button className="flex items-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
            <Plus size={16} className="mr-2" />
            New Test
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Active Tests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeTests}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">Real-time data</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Activity className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Equipment Online</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.equipmentOnline}/{stats.totalEquipment}</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">{Math.round((stats.equipmentOnline / stats.totalEquipment) * 100)}% uptime</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Monitor className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pending Reports</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingReports}</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Awaiting review</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <FileText className="text-white" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Alerts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.alerts}</p>
              <div className="flex items-center mt-2">
                <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-600">Equipment issues</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-white" size={20} />
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
              placeholder="Search by test name, patient ID, or equipment..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Filter size={16} className="mr-2" />
              Filter
            </button>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Tests</option>
              <option>Blood Work</option>
              <option>Radiology</option>
              <option>Pathology</option>
              <option>Microbiology</option>
            </select>
            <select className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Status</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Pending</option>
              <option>On Hold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lab Tests and Equipment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lab Tests */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Lab Tests</h2>

          {labTests.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Tests Found</h3>
              <p className="text-gray-500 mb-4">There are currently no lab tests in the system.</p>
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
                Create New Test
              </button>
            </div>
          ) : (
            labTests.slice(0, 5).map((test) => (
              <div key={test.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                      {test.test_type?.substring(0, 3).toUpperCase() || 'LAB'}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">{test.test_name}</h3>
                      <p className="text-sm text-gray-500">Patient ID: {test.patient_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                    <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical size={16} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Test ID:</span>
                    <span className="font-medium text-gray-900">{test.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium text-gray-900">{formatDate(test.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Priority:</span>
                    <span className="font-medium text-gray-900">{test.priority || 'Normal'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
                    <Eye size={14} className="mr-1" />
                    View
                  </button>
                  <button className="flex-1 flex items-center justify-center bg-gray-50 text-gray-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
                    <Download size={14} className="mr-1" />
                    Report
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Equipment Status */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Equipment Status</h2>

          {/* Mock Equipment Data - Since no equipment table exists */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Equipment Management</h3>
            <p className="text-gray-500 mb-4">Equipment tracking system is not yet configured. Contact IT to set up equipment monitoring.</p>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors">
              Configure Equipment
            </button>
          </div>
        </div>
      </div>

      {/* Load More */}
      {labTests.length > 5 && (
        <div className="flex justify-center">
          <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
            Load More Tests
          </button>
        </div>
      )}
    </div>
  );
}