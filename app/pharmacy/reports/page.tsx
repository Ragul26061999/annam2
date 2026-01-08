'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, BarChart3, IndianRupee, Package, Download, Calendar, 
  TrendingUp, TrendingDown, AlertTriangle, Printer, Filter
} from 'lucide-react'
import {
  getGSTReport,
  getDrugStockReport,
  getMedicalReport
} from '@/src/lib/enhancedPharmacyService'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

type ReportType = 'medical' | 'gst' | 'stock'

export default function PharmacyReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('medical')
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    from_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0]
  })
  
  // Report data
  const [medicalReport, setMedicalReport] = useState<any>(null)
  const [gstReport, setGstReport] = useState<any>(null)
  const [stockReport, setStockReport] = useState<any>(null)

  useEffect(() => {
    loadReport()
  }, [activeReport, dateRange])

  const loadReport = async () => {
    setLoading(true)
    try {
      switch (activeReport) {
        case 'medical':
          const medData = await getMedicalReport(dateRange)
          setMedicalReport(medData)
          break
        case 'gst':
          const gstData = await getGSTReport(dateRange)
          setGstReport(gstData)
          break
        case 'stock':
          const stockData = await getDrugStockReport()
          setStockReport(stockData)
          break
      }
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderMedicalReport = () => {
    if (!medicalReport) return <div className="p-8 text-center text-gray-500">No data available</div>

    const { summary, top_selling_drugs } = medicalReport

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-700">Total Sales</div>
                <div className="text-2xl font-bold text-green-800">{formatCurrency(summary.total_sales)}</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-700">Total Purchases</div>
                <div className="text-2xl font-bold text-blue-800">{formatCurrency(summary.total_purchases)}</div>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-700">Returns & Damages</div>
                <div className="text-2xl font-bold text-red-800">{formatCurrency(summary.total_returns + summary.total_damaged)}</div>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-700">Net Revenue</div>
                <div className="text-2xl font-bold text-purple-800">{formatCurrency(summary.net_revenue)}</div>
              </div>
              <IndianRupee className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Bills</div>
            <div className="text-xl font-bold">{summary.total_bills}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Average Bill Value</div>
            <div className="text-xl font-bold">{formatCurrency(summary.average_bill_value)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Gross Margin</div>
            <div className="text-xl font-bold text-green-600">
              {summary.total_sales > 0 ? ((summary.net_revenue / summary.total_sales) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {/* Top Selling Drugs */}
        {top_selling_drugs && top_selling_drugs.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">Top Selling Medicines</h3>
            </div>
            <div className="p-6">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="pb-2">Rank</th>
                    <th className="pb-2">Medicine</th>
                    <th className="pb-2">Quantity Sold</th>
                    <th className="pb-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {top_selling_drugs.slice(0, 10).map((drug: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="py-2">{index + 1}</td>
                      <td className="py-2">{drug.medications?.name || 'Unknown'}</td>
                      <td className="py-2">{Math.abs(drug.quantity)}</td>
                      <td className="py-2">{formatCurrency(Math.abs(drug.total_amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderGSTReport = () => {
    if (!gstReport) return <div className="p-8 text-center text-gray-500">No data available</div>

    const { summary, entries } = gstReport

    return (
      <div className="space-y-6">
        {/* GST Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Taxable Amount</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_taxable)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total GST</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_gst)}</div>
            <div className="text-xs text-gray-500 mt-1">
              CGST: {formatCurrency(summary.total_cgst)} | SGST: {formatCurrency(summary.total_sgst)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Amount</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_amount)}</div>
          </div>
        </div>

        {/* GST Breakdown by Type */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">GST Transaction Details</h3>
            <button className="text-blue-600 text-sm flex items-center">
              <Download className="w-4 h-4 mr-1" /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Party</th>
                  <th className="px-6 py-3">Taxable</th>
                  <th className="px-6 py-3">CGST</th>
                  <th className="px-6 py-3">SGST</th>
                  <th className="px-6 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 50).map((entry: any, index: number) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm">{formatDate(entry.transaction_date)}</td>
                    <td className="px-6 py-3 text-sm capitalize">{entry.transaction_type.replace('_', ' ')}</td>
                    <td className="px-6 py-3 text-sm text-blue-600">{entry.reference_number || '-'}</td>
                    <td className="px-6 py-3 text-sm">{entry.party_name || '-'}</td>
                    <td className="px-6 py-3 text-sm">{formatCurrency(entry.taxable_amount)}</td>
                    <td className="px-6 py-3 text-sm">{formatCurrency(entry.cgst_amount)}</td>
                    <td className="px-6 py-3 text-sm">{formatCurrency(entry.sgst_amount)}</td>
                    <td className="px-6 py-3 text-sm font-medium">{formatCurrency(entry.total_amount)}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No GST entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderStockReport = () => {
    if (!stockReport) return <div className="p-8 text-center text-gray-500">No data available</div>

    const { summary, items } = stockReport

    return (
      <div className="space-y-6">
        {/* Stock Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Medicines</div>
            <div className="text-2xl font-bold">{summary.total_medicines}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Stock Value</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_stock_value)}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
            <div className="text-sm text-yellow-700">Low Stock</div>
            <div className="text-2xl font-bold text-yellow-800">{summary.low_stock_count}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <div className="text-sm text-red-700">Expired</div>
            <div className="text-2xl font-bold text-red-800">{summary.expired_count}</div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4 border border-orange-200">
            <div className="text-sm text-orange-700">Expiring Soon</div>
            <div className="text-2xl font-bold text-orange-800">{summary.expiring_soon_count}</div>
          </div>
        </div>

        {/* Stock List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium">Drug Stock Details</h3>
            <button className="text-blue-600 text-sm flex items-center">
              <Download className="w-4 h-4 mr-1" /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Min Level</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 100).map((item: any, index: number) => (
                  <tr key={index} className={`border-t hover:bg-gray-50 ${item.is_low_stock ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono">{item.medicine_code}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm">{item.category}</td>
                    <td className="px-4 py-3 text-sm font-bold">{item.available_stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.minimum_stock_level}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(item.selling_price || 0)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(item.stock_value)}</td>
                    <td className="px-4 py-3">
                      {item.is_low_stock && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center w-fit">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Low
                        </span>
                      )}
                      {item.expired_quantity > 0 && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Expired: {item.expired_quantity}</span>
                      )}
                      {!item.is_low_stock && item.expired_quantity === 0 && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Reports</h1>
          <p className="text-gray-600">View medical, GST, and stock reports</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveReport('medical')}
              className={`px-4 py-2 rounded-lg flex items-center ${activeReport === 'medical' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Medical Report
            </button>
            <button
              onClick={() => setActiveReport('gst')}
              className={`px-4 py-2 rounded-lg flex items-center ${activeReport === 'gst' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <IndianRupee className="w-4 h-4 mr-2" />
              GST Report
            </button>
            <button
              onClick={() => setActiveReport('stock')}
              className={`px-4 py-2 rounded-lg flex items-center ${activeReport === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <Package className="w-4 h-4 mr-2" />
              Drug Stock Report
            </button>
          </div>
          
          {activeReport !== 'stock' && (
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.from_date}
                  onChange={(e) => setDateRange({...dateRange, from_date: e.target.value})}
                  className="border rounded px-2 py-1 text-sm"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateRange.to_date}
                  onChange={(e) => setDateRange({...dateRange, to_date: e.target.value})}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-lg">Loading report...</div>
        </div>
      ) : (
        <div>
          {activeReport === 'medical' && renderMedicalReport()}
          {activeReport === 'gst' && renderGSTReport()}
          {activeReport === 'stock' && renderStockReport()}
        </div>
      )}
    </div>
  )
}
