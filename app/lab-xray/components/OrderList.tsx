'use client';

import { useMemo, useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Eye, 
  Printer, 
  X,
  Calendar,
  User,
  Stethoscope,
  Beaker,
  Radiation,
  Scissors,
  Zap,
  RefreshCw,
  Filter
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';

interface OrderListProps {
  onRefresh?: () => void;
}

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
  items: any[];
  total_amount?: number;
  attachments: any[];
}

export default function OrderList({ onRefresh }: OrderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load orders function defined before use
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
            lab_test_catalog!inner(test_name, test_cost)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('radiology_test_orders')
          .select(`
            id, order_number, patient_id, clinical_indication, urgency, status, created_at,
            test_catalog_id, ordering_doctor_id,
            patients!inner(name, patient_id),
            doctors!inner(name),
            radiology_test_catalog!inner(test_name, test_cost)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('scan_orders')
          .select(`
            id, order_number, patient_id, clinical_indication, urgency, status, created_at,
            scan_test_catalog_id, doctor_id,
            patients!inner(name, patient_id),
            doctors!inner(name),
            scan_test_catalog!inner(test_name, test_cost)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('xray_orders')
          .select(`
            id, order_number, patient_id, clinical_indication, urgency, status, created_at,
            radiology_test_catalog_id, doctor_id,
            patients!inner(name, patient_id),
            doctors!inner(name),
            radiology_test_catalog!inner(test_name, test_cost)
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
        let testCost = 0;
        let testName = 'Unknown Test';
        
        // Get test cost and name based on service type
        if (order.lab_test_catalog) {
          testCost = order.lab_test_catalog.test_cost || 0;
          testName = order.lab_test_catalog.test_name || 'Unknown Test';
        } else if (order.radiology_test_catalog) {
          testCost = order.radiology_test_catalog.test_cost || 0;
          testName = order.radiology_test_catalog.test_name || 'Unknown Test';
        } else if (order.scan_test_catalog) {
          testCost = order.scan_test_catalog.test_cost || 0;
          testName = order.scan_test_catalog.test_name || 'Unknown Test';
        } else if (order.radiology_test_catalog) {
          testCost = order.radiology_test_catalog.test_cost || 0;
          testName = order.radiology_test_catalog.test_name || 'Unknown Test';
        }
        
        unifiedOrders.push({
          id: order.id,
          order_number: order.order_number,
          patient_id: order.patient_id,
          patient_name: order.patients?.name || 'Unknown',
          patient_uhid: order.patients?.patient_id || 'Unknown',
          service_type: order.test_catalog_id ? 'lab' : order.radiology_test_catalog_id ? 'radiology' : order.scan_test_catalog_id ? 'scan' : 'xray',
          test_name: testName,
          clinical_indication: order.clinical_indication,
          urgency: order.urgency,
          status: order.status,
          created_at: order.created_at,
          doctor_name: order.doctors?.name,
          items: [],
          total_amount: testCost,
          attachments: []
        });
      });

      // Process grouped orders
      if (groupedOrders.data && groupedOrders.data.length > 0) {
        const groupOrderIds = (groupedOrders.data || []).map((g: any) => g.id);

        // Load grouped order items without inner joins (inner joins would filter out most rows)
        const { data: allGroupItems, error: itemsError } = await supabase
          .from('diagnostic_group_order_items')
          .select('id, group_order_id, service_type, item_name_snapshot, catalog_id, status, sort_order, created_at')
          .in('group_order_id', groupOrderIds)
          .order('sort_order', { ascending: true });

        if (itemsError) {
          console.error('Failed to fetch grouped order items:', itemsError);
          throw itemsError;
        }

        // Resolve catalog costs in bulk per service type
        const itemsArr = allGroupItems || [];
        const idsByType: Record<string, string[]> = {
          lab: [],
          radiology: [],
          scan: [],
          xray: [],
        };

        for (const it of itemsArr as any[]) {
          const t = String(it.service_type || '').toLowerCase();
          const id = it.catalog_id;
          if (!id) continue;
          if (t in idsByType) idsByType[t].push(id);
        }

        const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
        const [labCats, radCats, scanCats, xrayCats] = await Promise.all([
          uniq(idsByType.lab).length
            ? supabase.from('lab_test_catalog').select('id, test_name, test_cost').in('id', uniq(idsByType.lab))
            : Promise.resolve({ data: [], error: null } as any),
          uniq(idsByType.radiology).length
            ? supabase.from('radiology_test_catalog').select('id, test_name, test_cost').in('id', uniq(idsByType.radiology))
            : Promise.resolve({ data: [], error: null } as any),
          uniq(idsByType.scan).length
            ? supabase.from('scan_test_catalog').select('id, test_name, test_cost').in('id', uniq(idsByType.scan))
            : Promise.resolve({ data: [], error: null } as any),
          // X-ray uses radiology_test_catalog via radiology_test_catalog_id in xray_orders
          uniq(idsByType.xray).length
            ? supabase.from('radiology_test_catalog').select('id, test_name, test_cost').in('id', uniq(idsByType.xray))
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        const catCost = new Map<string, number>();
        const catName = new Map<string, string>();
        const addCats = (rows: any[] | null | undefined) => {
          (rows || []).forEach((r: any) => {
            if (!r?.id) return;
            catCost.set(r.id, Number(r.test_cost) || 0);
            catName.set(r.id, r.test_name || '');
          });
        };

        addCats(labCats.data);
        addCats(radCats.data);
        addCats(scanCats.data);
        addCats(xrayCats.data);

        // Load all attachments at once
        const { data: allAttachments } = await supabase
          .from('lab_xray_attachments')
          .select('*')
          .in('group_order_id', groupOrderIds);

        for (const group of groupedOrders.data || []) {
          const groupItems = itemsArr.filter((item: any) => item.group_order_id === group.id) || [];
          const attachments = allAttachments?.filter((att: any) => att.group_order_id === group.id) || [];
          
          const totalAmount = groupItems.reduce((sum: number, item: any) => {
            return sum + (catCost.get(item.catalog_id) || 0);
          }, 0);

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
            items: groupItems.map((it: any) => ({
              ...it,
              test_name: catName.get(it.catalog_id) || it.item_name_snapshot || 'Service',
              test_cost: catCost.get(it.catalog_id) || 0,
            })),
            total_amount: totalAmount,
            attachments: attachments
          };

          unifiedOrders.push(groupOrder);
        }
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

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'lab':
        return <Beaker className="w-4 h-4" />;
      case 'radiology':
        return <Radiation className="w-4 h-4" />;
      case 'scan':
        return <Scissors className="w-4 h-4" />;
      case 'xray':
        return <Zap className="w-4 h-4" />;
      case 'group':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return orders.filter((order: UnifiedOrder) => {
      const orderNo = String(order.order_number || '').toLowerCase();
      const patientName = String(order.patient_name || '').toLowerCase();
      const patientId = String(order.patient_uhid || '').toLowerCase();
      const testName = String(order.test_name || '').toLowerCase();

      const matchesSearch = !term || orderNo.includes(term) || patientName.includes(term) || patientId.includes(term) || testName.includes(term);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'all' || order.urgency === urgencyFilter;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [orders, searchTerm, statusFilter, urgencyFilter]);

  const openViewOrder = async (order: UnifiedOrder) => {
    setSelectedOrder(order);
    setShowViewModal(true);
    setViewLoading(true);
    setViewItems([]);

    try {
      if (order.service_type === 'group') {
        // For grouped orders, the items are already loaded
        setViewItems(order.items || []);
      } else {
        // For individual orders, create a single item
        setViewItems([{
          id: order.id,
          service_type: order.service_type,
          test_name: order.test_name,
          status: order.status,
          created_at: order.created_at
        }]);
      }
    } catch (error) {
      console.error('Failed to load order data:', error);
      setViewItems([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    // Implement print functionality
    console.log('Printing order:', selectedOrder);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <X className="w-5 h-5 text-red-600 mr-2" />
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
          <h2 className="text-2xl font-bold text-gray-900">All Orders</h2>
          <p className="text-gray-600 mt-1">
            Unified view of all lab and diagnostic orders
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
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Order #, Patient Name, ID, or Test Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
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
            className="px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">All Urgency</option>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">Stat</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Orders List - Following Billing Pattern */}
      <div className="mt-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-gray-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'No orders have been created yet'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order: UnifiedOrder) => (
            <div key={order.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {getServiceIcon(order.service_type)}
                  <div className="text-sm font-extrabold text-gray-900 truncate">
                    {order.order_number}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusColor(order.status)}`}>
                    {String(order.status).toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {order.patient_name} • {order.patient_uhid}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {order.service_type === 'group' ? 
                    `Group: ${order.items.length} services${order.total_amount ? ` • Total: ₹${order.total_amount.toFixed(2)}` : ''}` 
                    : order.test_name
                  }
                  {order.total_amount && order.service_type !== 'group' && ` • Total: ₹${order.total_amount.toFixed(2)}`}
                </div>
                {order.doctor_name && (
                  <div className="text-xs text-gray-500 truncate">
                    Dr. {order.doctor_name}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => openViewOrder(order)}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                  title="View"
                >
                  <Eye size={16} />
                  View
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(order);
                    handlePrint();
                  }}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                  title="Print"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Modal - Following Billing Pattern */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedOrder.service_type === 'group' ? selectedOrder.group_name : selectedOrder.test_name}
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    Order #{selectedOrder.order_number} • {selectedOrder.patient_name} ({selectedOrder.patient_uhid})
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Date</p>
                  <p className="text-gray-900">
                    {new Date(selectedOrder.created_at).toLocaleString()}
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
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.urgency || 'routine')}`}>
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

              {/* Items List */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedOrder.service_type === 'group' ? 'Services' : 'Service Details'}
                </h4>
                {viewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewItems.map((item: any, index) => (
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
                )}
              </div>

              {/* Attachments */}
              {selectedOrder.attachments && selectedOrder.attachments.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h4>
                  <div className="space-y-3">
                    {selectedOrder.attachments.map((attachment: any) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-blue-600" />
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
