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
  XCircle
} from 'lucide-react';
import { 
  getGroupedLabOrdersForPatient, 
  GroupedLabOrder,
  GroupedLabOrderItem,
  LabXrayAttachment 
} from '../../../src/lib/labXrayService';
import { supabase } from '../../../src/lib/supabase';

interface GroupedLabServicesProps {
  patientId?: string;
}

const GroupedLabServices: React.FC<GroupedLabServicesProps> = ({ patientId }) => {
  const [groupedOrders, setGroupedOrders] = useState<GroupedLabOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<GroupedLabOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    loadGroupedOrders();
  }, [patientId]);

  const loadGroupedOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      let orders;
      if (patientId) {
        orders = await getGroupedLabOrdersForPatient(patientId);
      } else {
        // Load all grouped orders when no patient is specified
        const { data: groupOrders, error } = await supabase
          .from('diagnostic_group_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch grouped lab orders:', error);
          throw new Error(`Failed to fetch grouped lab orders: ${error.message}`);
        }

        // Fetch items and attachments for all orders
        orders = await Promise.all(
          (groupOrders || []).map(async (order: any) => {
            const [items, attachments] = await Promise.all([
              supabase
                .from('diagnostic_group_order_items')
                .select('*')
                .eq('group_order_id', order.id)
                .order('sort_order'),
              supabase
                .from('lab_xray_attachments')
                .select('*')
                .eq('group_order_id', order.id)
                .order('created_at', { ascending: false })
            ]);

            return {
              ...order,
              items: items.data || [],
              attachments: attachments.data || []
            };
          })
        );
      }
      setGroupedOrders(orders);
    } catch (err: any) {
      console.error('Error loading grouped lab orders:', err);
      setError(err.message || 'Failed to load grouped lab orders');
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

  const filteredOrders = groupedOrders.filter(order =>
    order.group_name_snapshot?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.clinical_indication?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.items.some(item => item.item_name_snapshot.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOrderClick = (order: GroupedLabOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handlePrint = (order: GroupedLabOrder) => {
    // Implement print functionality
    console.log('Printing order:', order);
  };

  const handleDownload = (order: GroupedLabOrder) => {
    // Implement download functionality
    console.log('Downloading order:', order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading grouped lab services...</span>
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
          <h2 className="text-2xl font-bold text-gray-900">Grouped Lab Services</h2>
          <p className="text-gray-600 mt-1">
            Multiple services ordered together with shared attachments
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadGroupedOrders}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            placeholder="Search grouped services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
      </div>

      {/* Grouped Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grouped lab services found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : 'No grouped services have been created yet'}
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
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.group_name_snapshot || 'Group Order'}
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
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {order.items.length} services
                      </div>
                      {order.attachments.length > 0 && (
                        <div className="flex items-center">
                          <Paperclip className="w-4 h-4 mr-1" />
                          {order.attachments.length} files
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(order);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Print"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(order);
                      }}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Services Preview */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {order.items.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-md text-sm"
                      >
                        {getServiceIcon(item.service_type)}
                        <span className="text-gray-700">{item.item_name_snapshot}</span>
                      </div>
                    ))}
                    {order.items.length > 5 && (
                      <div className="flex items-center px-2 py-1 bg-gray-100 rounded-md text-sm text-gray-600">
                        +{order.items.length - 5} more
                      </div>
                    )}
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

                {/* Attachments Preview */}
                {order.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Attachments</h4>
                      <span className="text-xs text-gray-500">{order.attachments.length} files</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.attachments.slice(0, 3).map((attachment) => (
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
                  {selectedOrder.group_name_snapshot || 'Group Order Details'}
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
                <div>
                  <p className="text-sm font-medium text-gray-500">Services</p>
                  <p className="text-gray-900">{selectedOrder.items.length} services</p>
                </div>
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
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Services</h4>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getServiceIcon(item.service_type)}
                        <div>
                          <p className="font-medium text-gray-900">{item.item_name_snapshot}</p>
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

              {/* Attachments */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h4>
                {selectedOrder.attachments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No attachments uploaded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedOrder.attachments.map((attachment) => (
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

export default GroupedLabServices;
