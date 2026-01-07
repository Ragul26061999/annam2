'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  IndianRupee,
  Users,
  Activity,
  Filter,
  ChevronDown
} from 'lucide-react';
import { 
  getMonthlyRevenueTrend, 
  getRevenueBreakdown, 
  getPaymentMethodStats,
  getFinanceStats,
  type FinanceStats
} from '../lib/financeService';

interface FinancialReportsProps {
  className?: string;
}

export default function FinancialReports({ className }: FinancialReportsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  React.useEffect(() => {
    loadReportData();
  }, [selectedPeriod, selectedYear, selectedMonth]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      const [
        statsData,
        trendData,
        breakdownData,
        paymentData
      ] = await Promise.all([
        getFinanceStats(),
        getMonthlyRevenueTrend(12),
        getRevenueBreakdown(),
        getPaymentMethodStats()
      ]);

      setStats(statsData);
      setRevenueTrend(trendData);
      setRevenueBreakdown(breakdownData);
      setPaymentMethods(paymentData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleExport = (type: 'csv' | 'pdf') => {
    // Export functionality
    const data = revenueTrend.map(item => ({
      Month: item.month,
      Revenue: item.revenue,
      Expenses: item.expenses,
      Profit: item.profit
    }));

    if (type === 'csv') {
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const getFilteredTrendData = () => {
    if (selectedPeriod === 'monthly') {
      return revenueTrend.filter(item => {
        const date = new Date(item.month);
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
      });
    }
    return revenueTrend;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Financial Reports</h2>
            <p className="text-gray-500 mt-1">Comprehensive financial analysis and reporting</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} className="mr-2" />
              Filters
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} className="mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatAmount(stats?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
