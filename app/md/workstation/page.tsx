import React from 'react';
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

export default function WorkstationPage() {
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
              <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">+8 since morning</span>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">18/20</p>
              <div className="flex items-center mt-2">
                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-600">90% uptime</span>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-sm font-medium text-orange-600">Due today</span>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">3</p>
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
          <h2 className="text-lg font-semibold text-gray-900">Active Lab Tests</h2>

          {/* Test Card 1 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  CBC
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">Complete Blood Count</h3>
                  <p className="text-sm text-gray-500">Sarah Johnson • PAT001</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  In Progress
                </span>
                <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Test ID:</span>
                <span className="font-medium text-gray-900">LAB001</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium text-gray-900">09:30 AM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Expected:</span>
                <span className="font-medium text-gray-900">11:00 AM</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-blue-700">Progress</p>
                <span className="text-xs text-blue-600">75% Complete</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
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

          {/* Test Card 2 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  XR
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">Chest X-Ray</h3>
                  <p className="text-sm text-gray-500">Michael Rodriguez • PAT002</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Completed
                </span>
                <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Test ID:</span>
                <span className="font-medium text-gray-900">RAD001</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium text-gray-900">08:45 AM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Technician:</span>
                <span className="font-medium text-gray-900">Anita Roy</span>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-green-700">Status</p>
                <span className="text-xs text-green-600">Ready for Review</span>
              </div>
              <p className="text-sm text-green-900">Report available for download</p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
                <Eye size={14} className="mr-1" />
                View
              </button>
              <button className="flex-1 flex items-center justify-center bg-green-50 text-green-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                <Download size={14} className="mr-1" />
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Equipment Status */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Equipment Status</h2>

          {/* Equipment Card 1 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  MRI
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">MRI Scanner</h3>
                  <p className="text-sm text-gray-500">EQ001 • Radiology</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Online
                </span>
                <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium text-green-600">99.5%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Service:</span>
                <span className="font-medium text-gray-900">15 days ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Queue:</span>
                <span className="font-medium text-gray-900">3 patients</span>
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-purple-700">Current Status</p>
                <span className="text-xs text-purple-600">Operational</span>
              </div>
              <p className="text-sm text-purple-900">Next scan: 11:30 AM</p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
                <Eye size={14} className="mr-1" />
                Monitor
              </button>
            </div>
          </div>

          {/* Equipment Card 2 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  CT
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900">CT Scanner</h3>
                  <p className="text-sm text-gray-500">EQ002 • Radiology</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  Maintenance
                </span>
                <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium text-red-600">0% (Down)</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Issue:</span>
                <span className="font-medium text-red-600">Calibration needed</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ETA:</span>
                <span className="font-medium text-gray-900">2 hours</span>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-red-700">Current Status</p>
                <span className="text-xs text-red-600">Under Maintenance</span>
              </div>
              <p className="text-sm text-red-900">Scheduled maintenance in progress</p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center bg-orange-50 text-orange-600 py-2 px-3 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors">
                <Eye size={14} className="mr-1" />
                Monitor
              </button>
              <button className="flex-1 flex items-center justify-center bg-red-50 text-red-700 py-2 px-3 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                <AlertCircle size={14} className="mr-1" />
                Alert
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
          Load More Tests
        </button>
      </div>
    </div>
  );
} 