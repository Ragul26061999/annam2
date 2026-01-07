'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, User, FileText, CheckCircle2, PlayCircle, TestTube, FileCheck, ClipboardList, Save, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../../../../src/lib/supabase';
import LabXrayAttachments from '../../../../src/components/LabXrayAttachments';
import { updateLabOrderStatus, updateRadiologyOrder, addLabTestResults, updateLabTestResult, deleteLabTestResult } from '../../../../src/lib/labXrayService';

type OrderType = 'lab' | 'radiology';

export default function LabXrayOrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [results, setResults] = useState<any[]>([]);

  // Result States
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [labResult, setLabResult] = useState({
    parameter: '',
    value: '',
    unit: '',
    notes: ''
  });
  const [radiologyFinding, setRadiologyFinding] = useState('');

  useEffect(() => {
    if (!orderId) return;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try lab first
        const { data: labOrder, error: labErr } = await supabase
          .from('lab_test_orders')
          .select(`
            *,
            patient:patients(*),
            ordering_doctor:doctors!ordering_doctor_id(*),
            test_catalog:lab_test_catalog(*),
            results:lab_test_results(*)
          `)
          .eq('id', orderId)
          .maybeSingle();

        if (labErr) {
          throw new Error(labErr.message);
        }

        if (labOrder) {
          setOrderType('lab');
          setOrder(labOrder);
          setResults(labOrder.results || []);
          return;
        }

        // Try radiology
        const { data: radOrder, error: radErr } = await supabase
          .from('radiology_test_orders')
          .select(`
            *,
            patient:patients(*),
            ordering_doctor:doctors!ordering_doctor_id(*),
            test_catalog:radiology_test_catalog(*)
          `)
          .eq('id', orderId)
          .maybeSingle();

        if (radErr) {
          throw new Error(radErr.message);
        }

        if (radOrder) {
          setOrderType('radiology');
          setOrder(radOrder);
          setRadiologyFinding(radOrder.findings_summary || '');
          return;
        }

        setError('Order not found');
      } catch (e: any) {
        console.error('Error loading order:', e);
        setError(e?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orderId]);

  const refreshData = async () => {
    // Re-fetch order data
    if (orderType === 'lab') {
      const { data } = await supabase
        .from('lab_test_orders')
        .select('*, results:lab_test_results(*)')
        .eq('id', orderId)
        .single();
      if (data) {
        setOrder((prev: any) => ({ ...prev, ...data }));
        setResults(data.results || []);
      }
    } else {
      const { data } = await supabase
        .from('radiology_test_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (data) {
        setOrder((prev: any) => ({ ...prev, ...data }));
        setRadiologyFinding(data.findings_summary || '');
      }
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      if (orderType === 'lab') {
        await updateLabOrderStatus(orderId, newStatus);
      } else {
        await updateRadiologyOrder(orderId, { status: newStatus });
      }
      await refreshData();
    } catch (e) {
      console.error('Error updating status:', e);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveLabResult = async () => {
    if (!labResult.parameter || !labResult.value) {
      alert('Please enter parameter name and value');
      return;
    }

    try {
      setUpdating(true);
      
      if (editingResultId) {
        await updateLabTestResult(editingResultId, {
          parameter_name: labResult.parameter,
          parameter_value: labResult.value,
          unit: labResult.unit,
          technician_notes: labResult.notes
        });
        setEditingResultId(null);
      } else {
        await addLabTestResults([{
          order_id: orderId,
          parameter_name: labResult.parameter,
          parameter_value: labResult.value,
          unit: labResult.unit,
          technician_notes: labResult.notes
        }]);
      }
      
      setLabResult({ parameter: '', value: '', unit: '', notes: '' });
      await refreshData();
    } catch (e) {
      console.error('Error saving result:', e);
      alert('Failed to save result');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditResult = (result: any) => {
    setLabResult({
      parameter: result.parameter_name,
      value: result.parameter_value,
      unit: result.unit || '',
      notes: result.technician_notes || ''
    });
    setEditingResultId(result.id);
  };

  const handleCancelEdit = () => {
    setLabResult({ parameter: '', value: '', unit: '', notes: '' });
    setEditingResultId(null);
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Are you sure you want to delete this result?')) return;
    
    try {
      setUpdating(true);
      await deleteLabTestResult(resultId);
      await refreshData();
    } catch (e) {
      console.error('Error deleting result:', e);
      alert('Failed to delete result');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveRadiologyReport = async () => {
    if (!radiologyFinding) {
      alert('Please enter findings');
      return;
    }

    try {
      setUpdating(true);
      await updateRadiologyOrder(orderId, {
        findings_summary: radiologyFinding,
        report_drafted_at: new Date().toISOString(),
        status: 'report_pending'
      });
      await refreshData();
    } catch (e) {
      console.error('Error saving report:', e);
      alert('Failed to save report');
    } finally {
      setUpdating(false);
    }
  };

  const patient = order?.patient;
  const testName = order?.test_catalog?.test_name || 'Diagnostic Test';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <div className="font-semibold">{error}</div>
          </div>
          <div className="mt-4">
            <Link href="/lab-xray" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-semibold">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/lab-xray" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="text-sm text-gray-500 font-mono">{order?.order_number}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{orderType === 'lab' ? 'Laboratory Order' : 'Radiology Order'}</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{testName}</div>
              <div className="text-sm text-gray-600 mt-1">Status: <span className="font-semibold">{String(order?.status || '').replace(/_/g, ' ')}</span></div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-w-[260px]">
              <div className="flex items-center gap-2 text-gray-700 font-semibold">
                <User className="h-4 w-4" />
                Patient
              </div>
              <div className="mt-2 text-sm text-gray-700">
                <div className="font-bold">{patient?.name}</div>
                <div className="text-gray-500">{patient?.patient_id} • {patient?.phone}</div>
              </div>
            </div>
          </div>

          {/* Workflow Actions */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Workflow Actions</h3>
            <div className="flex flex-wrap gap-3">
              {orderType === 'lab' ? (
                <>
                  {order?.status === 'ordered' && (
                    <button
                      onClick={() => handleUpdateStatus('sample_collected')}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-semibold hover:bg-teal-100 transition-colors"
                    >
                      <TestTube size={16} />
                      Mark Sample Collected
                    </button>
                  )}
                  {order?.status === 'sample_collected' && (
                    <button
                      onClick={() => handleUpdateStatus('in_progress')}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <PlayCircle size={16} />
                      Start Processing
                    </button>
                  )}
                  {order?.status === 'in_progress' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={updating || results.length === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        results.length > 0 
                          ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={results.length === 0 ? "Please add results first" : ""}
                    >
                      <CheckCircle2 size={16} />
                      Complete Order
                    </button>
                  )}
                </>
              ) : (
                <>
                  {order?.status === 'ordered' && (
                    <button
                      onClick={() => handleUpdateStatus('scheduled')}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-lg font-semibold hover:bg-cyan-100 transition-colors"
                    >
                      <ClipboardList size={16} />
                      Schedule Scan
                    </button>
                  )}
                  {order?.status === 'scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus('patient_arrived')}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      <User size={16} />
                      Patient Arrived
                    </button>
                  )}
                  {order?.status === 'patient_arrived' && (
                    <button
                      onClick={() => handleUpdateStatus('scan_completed')}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition-colors"
                    >
                      <PlayCircle size={16} />
                      Scan Completed
                    </button>
                  )}
                  {order?.status === 'scan_completed' && (
                    <button
                      onClick={() => handleUpdateStatus('report_pending')}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg font-semibold hover:bg-amber-100 transition-colors"
                    >
                      <FileText size={16} />
                      Draft Report
                    </button>
                  )}
                  {order?.status === 'report_pending' && (
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={updating || !order.findings_summary}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        order.findings_summary
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={!order.findings_summary ? "Please save findings first" : ""}
                    >
                      <CheckCircle2 size={16} />
                      Finalize & Complete
                    </button>
                  )}
                </>
              )}
              
              {/* Reset / Re-open option for completed orders */}
              {order?.status === 'completed' && (
                 <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-bold flex items-center gap-2">
                   <CheckCircle2 size={16} />
                   Order Completed
                 </div>
              )}
            </div>
          </div>

          {/* Result Entry Section */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">
              {orderType === 'lab' ? 'Lab Results' : 'Radiology Report'}
            </h3>
            
            {orderType === 'lab' ? (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Parameter</label>
                    <input
                      type="text"
                      placeholder="e.g. Hemoglobin"
                      value={labResult.parameter}
                      onChange={(e) => setLabResult({ ...labResult, parameter: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 14.5"
                      value={labResult.value}
                      onChange={(e) => setLabResult({ ...labResult, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. g/dL"
                      value={labResult.unit}
                      onChange={(e) => setLabResult({ ...labResult, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes"
                      value={labResult.notes}
                      onChange={(e) => setLabResult({ ...labResult, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-12 flex justify-end gap-3 mt-2">
                    {editingResultId && (
                      <button
                        onClick={handleCancelEdit}
                        disabled={updating}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handleSaveLabResult}
                      disabled={updating}
                      className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                      {updating ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
                      {editingResultId ? 'Update Result' : 'Add Result'}
                    </button>
                  </div>
                </div>
                
                {/* Results List */}
                {results.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Entered Results</h4>
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200 bg-white">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Parameter</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Value</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {results.map((res: any) => (
                            <tr key={res.id}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{res.parameter_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 font-bold">{res.parameter_value}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{res.unit || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 italic">{res.technician_notes || '-'}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handleEditResult(res)}
                                    className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteResult(res.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Findings & Impression</label>
                  <textarea
                    rows={6}
                    placeholder="Enter detailed radiological findings..."
                    value={radiologyFinding}
                    onChange={(e) => setRadiologyFinding(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveRadiologyReport}
                    disabled={updating}
                    className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-700 transition-colors flex items-center gap-2"
                  >
                    {updating ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
                    Save Report
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 text-gray-800 font-bold">
              <FileText className="h-4 w-4" />
              Attachments
            </div>
            <div className="mt-3">
              <LabXrayAttachments
                patientId={patient?.id}
                testType={orderType as any}
                labOrderId={orderType === 'lab' ? order?.id : undefined}
                radiologyOrderId={orderType === 'radiology' ? order?.id : undefined}
                testName={testName}
                showFileBrowser={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
