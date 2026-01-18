import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Calendar, Clock, User, ClipboardList, ChevronLeft, ChevronRight, Activity, FileText, Pill } from 'lucide-react';
import { getIPNurseRecords, createIPNurseRecord, getIPDoctorOrders, IPNurseRecord, IPDoctorOrder } from '../../lib/ipClinicalService';
import NurseVitals from './NurseVitals';
import MedicationChecklist from './MedicationChecklist';

interface NurseRecordsProps {
  bedAllocationId: string;
  date?: string;
  currentUser?: any;
}

export default function NurseRecords({ bedAllocationId, date, currentUser }: NurseRecordsProps) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vitals' | 'notes' | 'medications'>('vitals');
  const [records, setRecords] = useState<IPNurseRecord[]>([]);
  const [doctorOrders, setDoctorOrders] = useState<IPDoctorOrder[]>([]);
  // Use date prop if provided, else default to today (but we should prefer prop)
  const displayDate = date || new Date().toISOString().split('T')[0];
  
  const [newRemark, setNewRemark] = useState('');
  const [notedAt, setNotedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [bedAllocationId, displayDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [nurseData, ordersData] = await Promise.all([
        getIPNurseRecords(bedAllocationId, displayDate),
        getIPDoctorOrders(bedAllocationId) // Fetch all orders, filter client side for summary
      ]);
      setRecords(nurseData || []);
      setDoctorOrders(ordersData || []);
    } catch (err) {
      console.error('Failed to load nurse records', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRemark = async () => {
    if (!newRemark.trim()) return;
    setSubmitting(true);
    try {
      // Use current time but force date to selected date if it's not today?
      let entryTime = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      if (displayDate !== today) {
        const d = new Date();
        entryTime = `${displayDate}T${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
      }

      // Use custom noted_at if provided, otherwise use entryTime
      const actualNotedAt = notedAt ? new Date(notedAt).toISOString() : entryTime;

      const record = await createIPNurseRecord(bedAllocationId, newRemark, entryTime, actualNotedAt);
      
      setRecords(prev => [record, ...prev]);
      setNewRemark('');
      setNotedAt('');
    } catch (err) {
      console.error('Failed to add nurse record', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter doctor orders for selected date
  const todaysOrders = doctorOrders.filter(o => o.order_date.startsWith(displayDate));

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation & Sub-tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Removed date navigation buttons as they are handled by parent */}
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <Calendar className="h-5 w-5 text-blue-600" />
            {new Date(displayDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab('vitals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'vitals' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity size={16} /> Vitals
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'medications' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Pill size={16} /> Medications
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'notes' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} /> Daily Notes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Doctor Orders Summary (Always visible) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Doctor's Orders
            </h4>
            {todaysOrders.length === 0 ? (
              <p className="text-sm text-blue-600 italic">No orders found for this date.</p>
            ) : (
              <div className="space-y-3">
                {todaysOrders.map(order => (
                  <div key={order.id} className="bg-white p-3 rounded-lg border border-blue-100 text-sm shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">{new Date(order.order_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div className="font-medium text-gray-800 mb-1">Rx:</div>
                    <p className="text-gray-600 whitespace-pre-wrap">{order.treatment_instructions || 'No specific treatment instructions'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Vitals or Notes */}
        <div className="lg:col-span-2 space-y-6">
          
          {activeTab === 'medications' ? (
            <MedicationChecklist 
              bedAllocationId={bedAllocationId} 
              date={displayDate}
              currentUser={currentUser}
            />
          ) : activeTab === 'vitals' ? (
            <NurseVitals bedAllocationId={bedAllocationId} date={displayDate} />
          ) : (
            <>
              {/* Add Remark Form */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3">Add Nurse Remark</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700">Observation Time (optional - defaults to current time)</label>
                  </div>
                  <input
                    type="datetime-local"
                    value={notedAt}
                    onChange={(e) => setNotedAt(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <div className="flex gap-2">
                    <textarea
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      placeholder="Enter medication administration, care notes, or general observation..."
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={2}
                    />
                    <button
                      onClick={handleAddRemark}
                      disabled={!newRemark.trim() || submitting}
                      className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors flex flex-col items-center justify-center gap-1 min-w-[80px] disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                      <span className="text-xs font-medium">Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Records List */}
              <div className="space-y-4">
                {records.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No nurse records for this date.
                  </div>
                ) : (
                  records.map((record) => (
                    <div key={record.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 ring-4 ring-white"></div>
                        <div className="w-0.5 flex-1 bg-gray-100 group-last:hidden"></div>
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {new Date(record.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {/* Placeholder for nurse name */}
                            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                              <User className="h-3 w-3" /> Nurse
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                            {record.remark}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
