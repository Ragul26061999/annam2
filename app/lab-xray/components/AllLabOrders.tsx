'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Activity,
  Eye,
  Download,
  Printer,
  Paperclip,
  Plus,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Beaker,
  Radiation,
  Scissors,
  Zap,
  XCircle,
  User,
  Stethoscope
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';

interface UnifiedOrder {
  id: string;
  order_number: string;
  patient_id: string;
  patient_name: string;
  patient_uhid: string;
  service_type: 'lab' | 'radiology' | 'scan' | 'xray' | 'group';
  test_name: string;
  clinical_indication?: string;
  urgency?: 'routine' | 'urgent' | 'stat' | 'emergency';
  status: string;
  created_at: string;
  doctor_name?: string;
  group_order_id?: string;
  group_name?: string;
  items?: UnifiedOrder[];
  attachments: any[];
}

const AllLabOrders: React.FC = () => {
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all orders from different tables
      const [labOrders, radiologyOrders, scanOrders, xrayOrders, groupedOrders] = await Promise.all([
        supabase
          .from('lab_test_orders')
          .select(`
            id, order_number, patient_id, clinical_indication, urgency, status, created_at,
            test_catalog_id, ordering_doctor_id,
            patients!inner(name, patient_id),
            doctors!inner(name),
            lab_test_catalog!inner(test_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('radiology_test_orders')
          .select(`
            id, order_number, patient_id, clinical_indication, urgency, status, created_at,
            test_catalog_id, ordering_doctor_id,
            patients!inner(name, patient_id),
            doctors!inner(name),
            radiology_test_catalog!inner(test_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('scan_test_orders')
          .select(`
            id, order_number, patient_id, clinical_indication, urgency, status, created_at,
            scan_test_catalog_id, doctor_id,
            patients!inner(name, patient_id),
            doctors!inner(name),
            scan_test_catalog!inner(test_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('radiology_test_orders')
          .select(`
            id, order_number, patient_id, clinical_indication, urgency, status, created_at,
            radiology_test_catalog_id, doctor_id,
            patients!inner(name, patient_id),
            doctors!inner(name),
            radiology_test_catalog!inner(test_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('diagnostic_group_orders')
          .select(`
            id, group_name_snapshot, patient_id, clinical_indication, urgency, status, created_at,
            patients!inner(name, patient_id)
          `)
          .order('created_at', { ascending: false })
      ]);

      // Transform data into unified format
      const unifiedOrders: UnifiedOrder[] = [];

      // Process individual orders
      [...(labOrders.data || []), ...(radiologyOrders.data || []), ...(scanOrders.data || []), ...(xrayOrders.data || [])].forEach((order: any) => {
        unifiedOrders.push({
          id: order.id,
          order_number: order.order_number,
          patient_id: order.patient_id,
          patient_name: order.patients?.name || 'Unknown',
          patient_uhid: order.patients?.patient_id || 'Unknown',
          service_type: order.test_catalog_id ? 'lab' : order.radiology_test_catalog_id ? 'radiology' : order.scan_test_catalog_id ? 'scan' : 'xray',
          test_name: order.lab_test_catalog?.test_name || order.radiology_test_catalog?.test_name || order.scan_test_catalog?.test_name || order.radiology_test_catalog?.test_name || 'Unknown Test',
          clinical_indication: order.clinical_indication,
          urgency: order.urgency,
          status: order.status,
          created_at: order.created_at,
          doctor_name: order.doctors?.name,
          attachments: []
        });
      });

      // Process grouped orders
      for (const group of groupedOrders.data || []) {
        const groupItems = await supabase
          .from('diagnostic_group_order_items')
          .select(`
            service_type, item_name_snapshot, catalog_id,
            lab_test_catalog!inner(test_name),
            radiology_test_catalog!inner(test_name),
            scan_test_catalog!inner(test_name),
            radiology_test_catalog!inner(test_name)
          `)
          .eq('group_order_id', group.id);

        const attachments = await supabase
          .from('lab_xray_attachments')
          .select('*')
          .eq('group_order_id', group.id);

        const groupOrder: UnifiedOrder = {
          id: group.id,
          order_number: `GROUP-${group.id.slice(0, 8)}`,
          patient_id: group.patient_id,
          patient_name: group.patients?.name || 'Unknown',
          patient_uhid: group.patients?.patient_id || 'Unknown',
          service_type: 'group',
          test_name: group.group_name_snapshot || 'Group Order',
          clinical_indication: group.clinical_indication,
          urgency: group.urgency,
          status: group.status,
          created_at: group.created_at,
          group_order_id: group.id,
          group_name: group.group_name_snapshot,
          items: (groupItems.data || []).map((item: any) => ({
            id: item.id,
            order_number: '',
            patient_id: group.patient_id,
            patient_name: group.patients?.name || 'Unknown',
            patient_uhid: group.patients?.patient_id || 'Unknown',
            service_type: item.service_type,
            test_name: item.item_name_snapshot,
            status: group.status,
            created_at: group.created_at,
            attachments: []
          })),
          attachments: attachments.data || []
        };

        unifiedOrders.push(groupOrder);
      }

      // Sort by created date
      unifiedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(unifiedOrders);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'lab':
        return <Beaker className="w-4 h-4 text-blue-600" />;
      case 'radiology':
        return <Radiation className="w-4 h-4 text-purple-600" />;
      case 'scan':
        return <Scissors className="w-4 h-4 text-green-600" />;
      case 'xray':
        return <Zap className="w-4 h-4 text-orange-600" />;
      case 'group':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'routine':
        return 'bg-gray-100 text-gray-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      case 'stat':
        return 'bg-red-100 text-red-800';
      case 'emergency':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient_uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.test_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || order.urgency === urgencyFilter;

    return matchesSearch && matchesStatus && matchesUrgency;
  });

  const handleOrderClick = (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading all orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Lab Orders</h2>
          <p className="text-gray-600 mt-1">
            Unified view of all individual and grouped lab orders
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadOrders}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by patient, order #, or test name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="ordered">Ordered</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="all">All Urgency</option>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">Stat</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'No orders have been created yet'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOrderClick(order)}
            >
              <div className="p-6">
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getServiceIcon(order.service_type)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.service_type === 'group' ? order.group_name : order.test_name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(order.urgency || 'routine')}`}>
                        {order.urgency || 'routine'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="font-medium">#{order.order_number}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {order.patient_name} ({order.patient_uhid})
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                      {order.doctor_name && (
                        <div className="flex items-center">
                          <Stethoscope className="w-4 h-4 mr-1" />
                          Dr. {order.doctor_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle print
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Print"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Clinical Indication */}
                {order.clinical_indication && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Clinical Indication:</span> {order.clinical_indication}
                    </p>
                  </div>
                )}

                {/* Group Items */}
                {order.items && order.items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Services ({order.items.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-md text-sm"
                        >
                          {getServiceIcon(item.service_type)}
                          <span className="text-gray-700">{item.test_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {order.attachments && order.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Attachments</h4>
                      <span className="text-xs text-gray-500">{order.attachments.length} files</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.attachments.slice(0, 3).map((attachment: any) => (
                        <div
                          key={attachment.id}
                          className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-md text-xs"
                        >
                          <Paperclip className="w-3 h-3 text-blue-600" />
                          <span className="text-blue-700 truncate max-w-32">{attachment.file_name}</span>
                        </div>
                      ))}
                      {order.attachments.length > 3 && (
                        <div className="flex items-center px-2 py-1 bg-blue-50 rounded-md text-xs text-blue-600">
                          +{order.attachments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedOrder.service_type === 'group' ? selectedOrder.group_name : selectedOrder.test_name}
                </h3>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Number</p>
                  <p className="text-gray-900">#{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Patient</p>
                  <p className="text-gray-900">{selectedOrder.patient_name} ({selectedOrder.patient_uhid})</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Date</p>
                  <p className="text-gray-900">
                    {format(new Date(selectedOrder.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Urgency</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(selectedOrder.urgency || 'routine')}`}>
                    {selectedOrder.urgency || 'routine'}
                  </span>
                </div>
                {selectedOrder.doctor_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Doctor</p>
                    <p className="text-gray-900">Dr. {selectedOrder.doctor_name}</p>
                  </div>
                )}
              </div>

              {/* Clinical Indication */}
              {selectedOrder.clinical_indication && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-2">Clinical Indication</p>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedOrder.clinical_indication}
                  </p>
                </div>
              )}

              {/* Services List */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Services</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getServiceIcon(item.service_type)}
                          <div>
                            <p className="font-medium text-gray-900">{item.test_name}</p>
                            <p className="text-sm text-gray-600 capitalize">{item.service_type}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h4>
                {(!selectedOrder.attachments || selectedOrder.attachments.length === 0) ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No attachments uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedOrder.attachments.map((attachment: any) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Paperclip className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">{attachment.file_name}</p>
                            <p className="text-sm text-gray-600">
                              {(attachment.file_size / 1024).toFixed(1)} KB • {attachment.file_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllLabOrders;
