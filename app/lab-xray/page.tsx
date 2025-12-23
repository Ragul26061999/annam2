'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Microscope, 
  Radiation, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Users,
  Activity,
  RefreshCw,
  Eye,
  Download,
  Printer,
  Beaker,
  Zap,
  FileCheck,
  XCircle
} from 'lucide-react';
import { 
  getLabOrders, 
  getRadiologyOrders,
  getDiagnosticStats 
} from '../../src/lib/labXrayService';

interface DiagnosticStats {
  totalLabOrders: number;
  totalRadiologyOrders: number;
  pendingLabOrders: number;
  pendingRadiologyOrders: number;
  completedToday: number;
}

export default function LabXRayPage() {
  const [activeTab, setActiveTab] = useState<'lab' | 'radiology'>('lab');
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<DiagnosticStats>({
    totalLabOrders: 0,
    totalRadiologyOrders: 0,
    pendingLabOrders: 0,
    pendingRadiologyOrders: 0,
    completedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter, urgencyFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get stats
      const statsData = await getDiagnosticStats();
      setStats(statsData);

      // Get orders based on active tab
      if (activeTab === 'lab') {
        const filters: any = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (urgencyFilter !== 'all') filters.urgency = urgencyFilter;
        
        const orders = await getLabOrders(filters);
        setLabOrders(orders);
      } else {
        const filters: any = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (urgencyFilter !== 'all') filters.urgency = urgencyFilter;
        
        const orders = await getRadiologyOrders(filters);
        setRadiologyOrders(orders);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-blue-100 text-blue-800';
      case 'sample_pending': return 'bg-yellow-100 text-yellow-800';
      case 'sample_collected': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-cyan-100 text-cyan-800';
      case 'patient_arrived': return 'bg-indigo-100 text-indigo-800';
      case 'scan_completed': return 'bg-teal-100 text-teal-800';
      case 'report_pending': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'routine': return 'bg-gray-100 text-gray-700';
      case 'urgent': return 'bg-orange-100 text-orange-700';
      case 'stat': return 'bg-red-100 text-red-700';
      case 'emergency': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrders = (activeTab === 'lab' ? labOrders : radiologyOrders).filter(order => {
    if (!searchTerm) return true;
    const patientName = order.patient?.name?.toLowerCase() || '';
    const orderNumber = order.order_number?.toLowerCase() || '';
    const testName = order.test_catalog?.test_name?.toLowerCase() || '';
    return patientName.includes(searchTerm.toLowerCase()) || 
           orderNumber.includes(searchTerm.toLowerCase()) ||
           testName.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Microscope className="h-12 w-12 animate-spin text-teal-500 mb-4" />
          <p className="text-gray-600">Loading diagnostic services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl">
              <Microscope className="h-8 w-8 text-white" />
            </div>
            Lab & X-Ray Management
          </h1>
          <p className="text-gray-600 mt-2">Comprehensive diagnostic services management</p>
        </div>
        <div className="flex gap-3">
          <Link href="/lab-xray/order">
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all duration-200">
              <Plus className="h-4 w-4" />
              New Order
            </button>
          </Link>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Lab Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalLabOrders}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-teal-500 mr-1" />
                <span className="text-xs text-teal-600">All time</span>
              </div>
            </div>
            <div className="p-3 bg-teal-100 rounded-xl">
              <Beaker className="h-5 w-5 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Radiology Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRadiologyOrders}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-cyan-500 mr-1" />
                <span className="text-xs text-cyan-600">All time</span>
              </div>
            </div>
            <div className="p-3 bg-cyan-100 rounded-xl">
              <Radiation className="h-5 w-5 text-cyan-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pending Lab</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pendingLabOrders}</p>
              <p className="text-xs text-gray-500 mt-1">In queue</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pending Radiology</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.pendingRadiologyOrders}</p>
              <p className="text-xs text-gray-500 mt-1">In queue</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Completed Today</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completedToday}</p>
              <p className="text-xs text-gray-500 mt-1">Reports ready</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <FileCheck className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Overview */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-teal-600" />
          Diagnostic Workflow
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Order</p>
            <p className="text-xs text-gray-600">Doctor Orders Test</p>
          </div>
          <div className="flex-1 h-1 bg-gradient-to-r from-blue-300 to-purple-300 mx-2"></div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <Beaker className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Collection</p>
            <p className="text-xs text-gray-600">Sample/Imaging</p>
          </div>
          <div className="flex-1 h-1 bg-gradient-to-r from-purple-300 to-orange-300 mx-2"></div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Processing</p>
            <p className="text-xs text-gray-600">Analysis/Scan</p>
          </div>
          <div className="flex-1 h-1 bg-gradient-to-r from-orange-300 to-teal-300 mx-2"></div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-teal-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Verification</p>
            <p className="text-xs text-gray-600">Doctor Review</p>
          </div>
          <div className="flex-1 h-1 bg-gradient-to-r from-teal-300 to-green-300 mx-2"></div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <FileCheck className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Report</p>
            <p className="text-xs text-gray-600">Patient Access</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('lab')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'lab'
                  ? 'border-b-2 border-teal-500 text-teal-600 bg-teal-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Beaker className="h-5 w-5" />
                <span>Laboratory Tests</span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-teal-100 text-teal-700">
                  {stats.pendingLabOrders}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('radiology')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'radiology'
                  ? 'border-b-2 border-cyan-500 text-cyan-600 bg-cyan-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Radiation className="h-5 w-5" />
                <span>Radiology & Imaging</span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-cyan-100 text-cyan-700">
                  {stats.pendingRadiologyOrders}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, order number, or test name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Status</option>
              <option value="ordered">Ordered</option>
              {activeTab === 'lab' ? (
                <>
                  <option value="sample_pending">Sample Pending</option>
                  <option value="sample_collected">Sample Collected</option>
                  <option value="in_progress">In Progress</option>
                </>
              ) : (
                <>
                  <option value="scheduled">Scheduled</option>
                  <option value="patient_arrived">Patient Arrived</option>
                  <option value="in_progress">In Progress</option>
                  <option value="scan_completed">Scan Completed</option>
                  <option value="report_pending">Report Pending</option>
                </>
              )}
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Priority</option>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="divide-y divide-gray-100">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              {activeTab === 'lab' ? (
                <Beaker className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              ) : (
                <Radiation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-6">
                There are no {activeTab === 'lab' ? 'laboratory' : 'radiology'} orders matching your criteria.
              </p>
              <Link href="/lab-xray/order">
                <button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:shadow-lg text-white px-4 py-2 rounded-lg font-medium text-sm transition-all">
                  Create New Order
                </button>
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono font-semibold text-teal-600">
                        {order.order_number}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getUrgencyColor(order.urgency)}`}>
                        {order.urgency?.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{order.patient?.name}</h3>
                    <p className="text-sm text-gray-600">
                      Patient ID: {order.patient?.patient_id}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Microscope size={14} />
                        {order.test_catalog?.test_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        Dr. {order.ordering_doctor?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {order.clinical_indication && (
                      <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="text-xs text-amber-900">
                          <span className="font-medium">Clinical Indication:</span> {order.clinical_indication}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/lab-xray/order/${order.id}`}>
                      <button className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="View Details">
                        <Eye size={18} />
                      </button>
                    </Link>
                    {order.status === 'completed' && (
                      <>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download Report">
                          <Download size={18} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Print Report">
                          <Printer size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
