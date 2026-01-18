import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Calendar, Activity, Pill, Microscope, Stethoscope } from 'lucide-react';
import { getIPDoctorOrders, createIPDoctorOrder, IPDoctorOrder } from '../../lib/ipClinicalService';
import IPPrescriptionForm from './IPPrescriptionForm';

interface DoctorOrdersProps {
  bedAllocationId: string;
  date?: string;
  patientId?: string;
  patientName?: string;
  currentUser?: any;
  selectedTimelineDate?: string; // Add selected date from timeline
}

export default function DoctorOrders({ bedAllocationId, date, patientId, patientName, currentUser, selectedTimelineDate }: DoctorOrdersProps) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<IPDoctorOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Use prop date or default to today
  const displayDate = date || new Date().toISOString().split('T')[0];

  const [newOrder, setNewOrder] = useState({
    assessment: '',
    treatment_instructions: '',
    investigation_instructions: ''
  });

  useEffect(() => {
    loadData();
  }, [bedAllocationId, displayDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getIPDoctorOrders(bedAllocationId);
      // Filter by date client side (or implement date filtering in getIPDoctorOrders if preferred, but client side is fine for now as per requirement)
      // Actually, user wants "only that days records alone". So filtering is necessary.
      const filtered = (data || []).filter((o: any) => o.order_date.startsWith(displayDate));
      setOrders(filtered);
    } catch (err) {
      console.error('Failed to load doctor orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedAllocationId) return;

    setSubmitting(true);
    try {
      // Determine correct order date
      let orderDate = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      if (displayDate !== today) {
        const d = new Date();
        // If backdating, set to noon or preserve current time
        orderDate = `${displayDate}T${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
      }

      const order = await createIPDoctorOrder(bedAllocationId, {
        ...newOrder,
        order_date: orderDate
      });
      setOrders(prev => [order, ...prev]);
      setNewOrder({
        assessment: '',
        treatment_instructions: '',
        investigation_instructions: ''
      });
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create doctor order', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrescriptionCreated = () => {
    // Refresh the orders list to show new prescriptions
    loadData();
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-teal-600" />
          Doctor's Orders
        </h3>
        <div className="flex gap-2">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 text-sm"
        >
          {showForm ? 'Cancel' : <><Plus className="h-4 w-4" /> New Order</>}
        </button>
        {patientId && patientName && (
          <button
            onClick={() => setShowPrescriptionForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Pill className="h-4 w-4" />
            New Prescription
          </button>
        )}
      </div>
      </div>

      {showPrescriptionForm && patientId && patientName && (
        <IPPrescriptionForm
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowPrescriptionForm(false)}
          onPrescriptionCreated={handlePrescriptionCreated}
          currentUser={currentUser}
          bedAllocationId={bedAllocationId}
          selectedDate={selectedTimelineDate || date} // Pass selected timeline date
        />
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-teal-200 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h4 className="font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">New Order Entry</h4>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-400" /> Daily Assessment
            </label>
            <textarea
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              rows={2}
              value={newOrder.assessment}
              onChange={(e) => setNewOrder({...newOrder, assessment: e.target.value})}
              placeholder="Patient condition, progress..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Pill className="h-4 w-4 text-gray-400" /> Treatment / Medication
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                rows={4}
                value={newOrder.treatment_instructions}
                onChange={(e) => setNewOrder({...newOrder, treatment_instructions: e.target.value})}
                placeholder="Medications, diet, nursing care..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Microscope className="h-4 w-4 text-gray-400" /> Investigations
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                rows={4}
                value={newOrder.investigation_instructions}
                onChange={(e) => setNewOrder({...newOrder, investigation_instructions: e.target.value})}
                placeholder="Lab tests, scans..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Order
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No doctor orders recorded yet.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold text-gray-800">
                    {new Date(order.order_date).toLocaleDateString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {/* Placeholder for doctor name if available via join */}
                <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-600">
                  Dr. Record
                </span>
              </div>
              
              <div className="p-6 grid grid-cols-1 gap-6">
                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Daily Assessment</h5>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap">{order.assessment}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <h5 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Pill className="h-3 w-3" /> Treatment Ordered
                    </h5>
                    {order.treatment_instructions ? (
                      <p className="text-gray-800 text-sm whitespace-pre-wrap bg-teal-50 p-3 rounded-lg border border-teal-100">
                        {order.treatment_instructions}
                      </p>
                    ) : (
                      <span className="text-gray-400 text-sm italic">None</span>
                    )}
                  </div>
                  
                  <div>
                    <h5 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Microscope className="h-3 w-3" /> Investigations Ordered
                    </h5>
                    {order.investigation_instructions ? (
                      <p className="text-gray-800 text-sm whitespace-pre-wrap bg-purple-50 p-3 rounded-lg border border-purple-100">
                        {order.investigation_instructions}
                      </p>
                    ) : (
                      <span className="text-gray-400 text-sm italic">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
