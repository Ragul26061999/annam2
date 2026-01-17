'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  ArrowRight,
  Trash2,
  CreditCard,
  Scissors
} from 'lucide-react';
import {
  getLabOrders,
  getRadiologyOrders,
  getScanOrders,
  getDiagnosticStats,
  updateLabOrderStatus,
  updateRadiologyOrder,
  updateScanOrder,
  deleteLabOrder,
  deleteRadiologyOrder,
  deleteScanOrder,
  getDiagnosticBillingItems
} from '../../src/lib/labXrayService';
import { supabase } from '../../src/lib/supabase';
import BillingList from './components/BillingList';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface DiagnosticStats {
  totalLabOrders: number;
  totalRadiologyOrders: number;
  totalScanOrders: number;
  pendingLabOrders: number;
  pendingRadiologyOrders: number;
  pendingScanOrders: number;
  completedToday: number;
}

const COLORS = ['#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function LabXRayPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'management'>('management');
  const [activeSubTab, setActiveSubTab] = useState<'lab' | 'radiology' | 'scan' | 'billing'>('lab');
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<any[]>([]);
  const [scanOrders, setScanOrders] = useState<any[]>([]);
  const [billingItems, setBillingItems] = useState<any[]>([]);
  const [stats, setStats] = useState<DiagnosticStats>({
    totalLabOrders: 0,
    totalRadiologyOrders: 0,
    totalScanOrders: 0,
    pendingLabOrders: 0,
    pendingRadiologyOrders: 0,
    pendingScanOrders: 0,
    completedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeSubTab, statusFilter, urgencyFilter]);

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setIsRefreshing(true);

      // Get stats
      const statsData = await getDiagnosticStats();
      setStats(statsData);

      // Get orders and billing
      const [lab, radiology, scan, billing] = await Promise.all([
        getLabOrders(),
        getRadiologyOrders(),
        getScanOrders(),
        getDiagnosticBillingItems()
      ]);

      setLabOrders(lab || []);
      setRadiologyOrders(radiology || []);
      setBillingItems(billing || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCancelOrder = async (order: any) => {
    const ok = window.confirm('Are you sure you want to cancel this order?');
    if (!ok) return;

    try {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const updatePayload = {
        status: 'cancelled',
        cancelled_at: nowIso,
        cancellation_reason: 'Cancelled from dashboard'
      };

      if (activeSubTab === 'lab') {
        await updateLabOrderStatus(order.id, 'cancelled', updatePayload);
      } else if (activeSubTab === 'radiology') {
        await updateRadiologyOrder(order.id, updatePayload);
      } else {
        // For scan orders, use updateScanOrder function
        await updateScanOrder(order.id, updatePayload);
      }

      await loadData();
    } catch (e) {
      console.error('Error cancelling order:', e);
      alert('Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (order: any) => {
    const ok = window.confirm('Are you sure you want to PERMANENTLY delete this order? This action cannot be undone.');
    if (!ok) return;

    try {
      setLoading(true);
      
      if (activeSubTab === 'lab') {
        await deleteLabOrder(order.id);
      } else if (activeSubTab === 'radiology') {
        await deleteRadiologyOrder(order.id);
      } else {
        // For scan orders, use deleteScanOrder function
        await deleteScanOrder(order.id);
      }

      await loadData();
    } catch (e) {
      console.error('Error deleting order:', e);
      alert('Failed to delete order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sample_pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sample_collected': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'patient_arrived': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'scan_completed': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'report_pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'routine': return 'bg-slate-100 text-slate-700';
      case 'urgent': return 'bg-amber-100 text-amber-700';
      case 'stat': return 'bg-red-100 text-red-700';
      case 'emergency': return 'bg-red-200 text-red-900 font-bold animate-pulse';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredOrders = useMemo(() => {
    let orders: any[] = [];
    if (activeSubTab === 'lab') {
      orders = labOrders;
    } else if (activeSubTab === 'radiology') {
      orders = radiologyOrders;
    } else if (activeSubTab === 'scan') {
      orders = scanOrders;
    } else {
      orders = [];
    }
    return orders.filter(order => {
      // Apply status and urgency filters
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && order.urgency !== urgencyFilter) return false;

      // Apply search term
      if (!searchTerm) return true;
      const patientName = order.patient?.name?.toLowerCase() || '';
      const orderNumber = order.order_number?.toLowerCase() || '';
      const testName = order.test_catalog?.test_name?.toLowerCase() || '';
      return patientName.includes(searchTerm.toLowerCase()) ||
        orderNumber.includes(searchTerm.toLowerCase()) ||
        testName.includes(searchTerm.toLowerCase());
    });
  }, [activeSubTab, labOrders, radiologyOrders, scanOrders, searchTerm, statusFilter, urgencyFilter]);

  // Analytics Calculations
  const analyticsData = useMemo(() => {
    // Volume by Type
    const volumeData = [
      { name: 'Laboratory', count: stats.totalLabOrders, color: '#14b8a6' },
      { name: 'Radiology', count: stats.totalRadiologyOrders, color: '#06b6d4' },
      { name: 'Scan', count: stats.totalScanOrders, color: '#8b5cf6' }
    ];

    // Status Distribution
    const allOrders = [...labOrders, ...radiologyOrders, ...scanOrders];
    const statusCounts: Record<string, number> = {};
    allOrders.forEach(o => {
      const status = o.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const distributionData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').toUpperCase(),
      value
    }));

    // Daily Trends (last 7 days)
    const dailyData: any[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayLabs = labOrders.filter(o => o.created_at?.startsWith(dateStr)).length;
      const dayRads = radiologyOrders.filter(o => o.created_at?.startsWith(dateStr)).length;
      const dayScans = scanOrders.filter(o => o.created_at?.startsWith(dateStr)).length;

      dailyData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        lab: dayLabs,
        radiology: dayRads,
        scan: dayScans,
        total: dayLabs + dayRads + dayScans
      });
    }

    return { volumeData, distributionData, dailyData };
  }, [labOrders, radiologyOrders, scanOrders, stats]);

  const WorkflowVisualizer = ({ status, type }: { status: string, type: 'lab' | 'radiology' | 'scan' }) => {
    const labSteps = ['ordered', 'sample_pending', 'sample_collected', 'in_progress', 'completed'];
    const radSteps = ['ordered', 'scheduled', 'patient_arrived', 'scan_completed', 'report_pending', 'completed'];
    const scanSteps = ['ordered', 'scheduled', 'patient_arrived', 'scan_completed', 'report_pending', 'completed'];
    const steps = type === 'lab' ? labSteps : (type === 'scan' ? scanSteps : radSteps);
    const currentIndex = steps.indexOf(status);

    return (
      <div className="flex items-center gap-1 w-full max-w-sm mt-2">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div
              className={`h-2 rounded-full flex-1 transition-all duration-500 ${idx <= currentIndex
                ? (type === 'lab' ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : (type === 'scan' ? 'bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'))
                : 'bg-gray-200'
                }`}
              title={step.replace(/_/g, ' ')}
            />
            {idx < steps.length - 1 && (
              <div className={`h-[1px] w-2 ${idx < currentIndex ? (type === 'lab' ? 'bg-teal-300' : (type === 'scan' ? 'bg-purple-300' : 'bg-cyan-300')) : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="h-24 w-24 border-4 border-teal-100 rounded-full animate-pulse"></div>
            <Microscope className="h-10 w-10 text-teal-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
          </div>
          <p className="text-gray-500 font-medium mt-6 tracking-wide">INITIALIZING DIAGNOSTIC SUITE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#fcfcfd] min-h-screen space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-teal-600 transition-colors">Home</Link>
            <ChevronRight size={14} />
            <span className="text-teal-600 font-medium">Lab & Radiology</span>
          </nav>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-4">
            Diagnostic Health Center
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse delay-75"></span>
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse delay-150"></span>
            </div>
            {isRefreshing && (
              <span className="ml-2 text-xs font-normal text-gray-400 flex items-center gap-1 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                Updating...
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Real-time tracking and clinical analytics for all diagnostic services.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('management')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'management'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Management
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'analytics'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              Analytics
            </button>
          </div>
          <div className="flex gap-2">
            <Link href="/lab-xray/lab">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl shadow-lg hover:bg-teal-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                <Microscope size={18} />
                <span className="font-semibold">Lab</span>
              </button>
            </Link>
            <Link href="/lab-xray/xray">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 text-white rounded-xl shadow-lg hover:bg-cyan-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                <Radiation size={18} />
                <span className="font-semibold">X-ray</span>
              </button>
            </Link>
            <Link href="/lab-xray/scan">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]">
                <Scissors size={18} />
                <span className="font-semibold">Scan</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Summary - Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Lab', value: stats.totalLabOrders, icon: Beaker, color: 'teal', trend: 'Orders' },
          { label: 'Total Radiology', value: stats.totalRadiologyOrders, icon: Radiation, color: 'cyan', trend: 'Scans' },
          { label: 'Total Scan', value: stats.totalScanOrders, icon: Scissors, color: 'purple', trend: 'Scans' },
          { label: 'Active Lab', value: stats.pendingLabOrders, icon: Clock, color: 'orange', trend: 'In Queue' },
          { label: 'Active Radiology', value: stats.pendingRadiologyOrders, icon: Zap, color: 'purple', trend: 'In Queue' },
          { label: 'Active Scan', value: stats.pendingScanOrders, icon: Activity, color: 'indigo', trend: 'In Queue' },
          { label: 'Release Today', value: stats.completedToday, icon: FileCheck, color: 'emerald', trend: 'Reports' },
        ].map((item, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={item.label}
            className="group relative overflow-hidden bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <item.icon size={64} className={`text-${item.color}-600`} />
            </div>
            <div className={`p-3 bg-${item.color}-50 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <item.icon size={20} className={`text-${item.color}-600`} />
            </div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{item.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900">{item.value}</p>
              <p className={`text-xs font-bold text-${item.color}-600`}>{item.trend}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'analytics' ? (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Volume Trend */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="text-teal-500" />
                    Diagnostic Volume Trends
                  </h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-teal-500" /> Lab</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-cyan-500" /> Rad</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-purple-500" /> Scan</span>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.dailyData}>
                      <defs>
                        <linearGradient id="colorLab" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorScan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Area type="monotone" dataKey="lab" stroke="#14b8a6" fillOpacity={1} fill="url(#colorLab)" strokeWidth={3} />
                      <Area type="monotone" dataKey="radiology" stroke="#06b6d4" fillOpacity={1} fill="url(#colorRad)" strokeWidth={3} />
                      <Area type="monotone" dataKey="scan" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorScan)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <PieChartIcon className="text-purple-500" />
                  Order Status Distribution
                </h3>
                <div className="h-[300px] w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-indigo-900 text-white p-8 rounded-3xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-md">
                  <h2 className="text-2xl font-bold mb-2">Diagnostic Performance Report</h2>
                  <p className="text-indigo-200 text-sm leading-relaxed">
                    All diagnostic efficiency metrics are within optimal range. Average turnaround time for STAT orders is currently 42 minutes.
                  </p>
                  <div className="mt-6 flex gap-4">
                    <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition-all backdrop-blur-sm border border-white/10">
                      <Download size={16} />
                      Monthly Export
                    </button>
                  </div>
                </div>
                <div className="flex gap-12 text-center">
                  <div>
                    <p className="text-gray-400 text-xs font-bold uppercase mb-1">Efficiency</p>
                    <p className="text-3xl font-black">94.8%</p>
                    <span className="text-emerald-400 text-[10px] font-bold">+2.4% vs last mo</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-bold uppercase mb-1">Avg TAT</p>
                    <p className="text-3xl font-black">2.4h</p>
                    <span className="text-emerald-400 text-[10px] font-bold">Optimal</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[100px] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="management"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Sub Tabs for Management */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveSubTab('lab')}
                className={`px-8 py-4 text-sm font-bold transition-all border-b-2 relative ${activeSubTab === 'lab'
                  ? 'border-teal-600 text-teal-600 bg-teal-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Beaker size={18} />
                  LABORATORY
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-teal-100 text-teal-700">
                    {stats.pendingLabOrders} NEW
                  </span>
                </div>
                {activeSubTab === 'lab' && <motion.div layoutId="activeSubTabUnderline" className="absolute bottom-0 left-0 w-full h-[2px] bg-teal-600" />}
              </button>
              <button
                onClick={() => setActiveSubTab('radiology')}
                className={`px-8 py-4 text-sm font-bold transition-all border-b-2 relative ${activeSubTab === 'radiology'
                  ? 'border-cyan-600 text-cyan-600 bg-cyan-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Radiation size={18} />
                  RADIOLOGY
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-100 text-cyan-700">
                    {stats.pendingRadiologyOrders} NEW
                  </span>
                </div>
                {activeSubTab === 'radiology' && <motion.div layoutId="activeSubTabUnderline" className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-600" />}
              </button>
              <button
                onClick={() => setActiveSubTab('scan')}
                className={`px-8 py-4 text-sm font-bold transition-all border-b-2 relative ${activeSubTab === 'scan'
                  ? 'border-purple-600 text-purple-600 bg-purple-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Scissors size={18} />
                  SCAN
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700">
                    {stats.pendingScanOrders} NEW
                  </span>
                </div>
                {activeSubTab === 'scan' && <motion.div layoutId="activeSubTabUnderline" className="absolute bottom-0 left-0 w-full h-[2px] bg-purple-600" />}
              </button>
              <button
                onClick={() => setActiveSubTab('billing')}
                className={`px-8 py-4 text-sm font-bold transition-all border-b-2 relative ${activeSubTab === 'billing'
                  ? 'border-green-600 text-green-600 bg-green-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard size={18} />
                  BILLING
                </div>
                {activeSubTab === 'billing' && <motion.div layoutId="activeSubTabUnderline" className="absolute bottom-0 left-0 w-full h-[2px] bg-green-600" />}
              </button>
            </div>

            {/* Controls */}
            {activeSubTab !== 'billing' && (
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Patient Name, ID, or Order #"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                  >
                    <option value="all">Any Status</option>
                    <option value="ordered">Ordered</option>
                    <option value="in_progress">Processing</option>
                    <option value="completed">Completed</option>
                  </select>
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                  >
                    <option value="all">Any Urgency</option>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
              </div>
            )}

            {/* Orders Feed */}
            {activeSubTab === 'billing' && (
              <BillingList items={billingItems} onRefresh={() => loadData(true)} />
            )}

            {activeSubTab !== 'billing' && (
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-gray-300" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
                  <p className="text-gray-500 mt-1">Adjust your filters or start a new clinical order.</p>
                </div>
              ) : (
                filteredOrders.map((order, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={order.id}
                    className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-teal-500/50 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full transition-colors group-hover:scale-y-110" style={{ backgroundColor: order.urgency === 'stat' ? '#ef4444' : (activeSubTab === 'lab' ? '#14b8a6' : (activeSubTab === 'scan' ? '#8b5cf6' : '#06b6d4')) }} />

                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-gray-100 rounded-md text-gray-600 uppercase tracking-tighter">
                            {order.order_number}
                          </span>
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border ${getStatusColor(order.status)} uppercase tracking-widest`}>
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${getUrgencyColor(order.urgency)} uppercase tracking-widest`}>
                            {order.urgency}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                            <Clock size={12} />
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                              {order.patient?.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-xs">{order.patient?.patient_id}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{order.patient?.gender}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span>{order.patient?.phone}</span>
                            </div>
                          </div>

                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-gray-900">{order.test_catalog?.test_name}</p>
                            <p className="text-xs text-gray-500">Ordered by Dr. {order.ordering_doctor?.name}</p>
                          </div>
                        </div>

                        {/* Workflow Visualization */}
                        <div className="mt-6 border-t border-gray-100 pt-5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Process Flow</p>
                            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Step: {order.status?.replace(/_/g, ' ').toUpperCase()}</p>
                          </div>
                          <WorkflowVisualizer status={order.status} type={activeSubTab as 'lab' | 'radiology' | 'scan'} />
                        </div>
                      </div>

                      <div className="lg:w-48 flex lg:flex-col justify-end gap-2">
                        <Link href={`/lab-xray/order/${order.id}`} className="flex-1">
                          <button className="w-full h-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-teal-50 text-gray-700 hover:text-teal-600 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-teal-100">
                            <Eye size={16} />
                            Review / Files
                          </button>
                        </Link>
                        {String(order.status || '').toLowerCase() === 'cancelled' ? (
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 rounded-xl text-sm font-bold transition-all border border-red-100 hover:border-red-200"
                            title="Permanently Delete Order"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl text-sm font-bold transition-all border border-transparent hover:border-red-100"
                            title="Cancel Order"
                          >
                            <XCircle size={16} />
                            Cancel
                          </button>
                        )}
                        {order.status === 'completed' && (
                          <div className="flex gap-2">
                            <button className="flex-1 flex items-center justify-center p-2.5 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded-xl transition-all" title="Download Results">
                              <Download size={18} />
                            </button>
                            <button className="flex-1 flex items-center justify-center p-2.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl transition-all" title="Print Request">
                              <Printer size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-4">
        <p>© 2025 Annam Hospital • Diagnostic Management System V2.4</p>
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Lab Bridge Connected</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PACS Gateway Active</span>
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> HL7 Feed Synced</span>
        </div>
      </div>
    </div>
  );
}
