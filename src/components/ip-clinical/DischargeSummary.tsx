import React, { useState, useEffect } from 'react';
import { Save, Loader2, FileText, CheckCircle, Lock, Printer, Wand2 } from 'lucide-react';
import { 
  getIPDischargeSummary, 
  createOrUpdateIPDischargeSummary, 
  getIPCaseSheet, 
  getIPDoctorOrders,
  IPDischargeSummary 
} from '../../lib/ipClinicalService';

interface DischargeSummaryProps {
  bedAllocationId: string;
  patient: any; // Using any for patient object simplicity
  bedAllocation: any;
}

export default function DischargeSummary({ bedAllocationId, patient, bedAllocation }: DischargeSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Partial<IPDischargeSummary>>({
    status: 'draft'
  });
  
  // Auto-fill source data
  const [caseSheetData, setCaseSheetData] = useState<any>(null);
  const [doctorOrdersData, setDoctorOrdersData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [bedAllocationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, sheet, orders] = await Promise.all([
        getIPDischargeSummary(bedAllocationId),
        getIPCaseSheet(bedAllocationId),
        getIPDoctorOrders(bedAllocationId)
      ]);
      
      setSummary(summaryData || { status: 'draft' });
      setCaseSheetData(sheet);
      setDoctorOrdersData(orders || []);
    } catch (err) {
      console.error('Failed to load discharge summary', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (finalize = false) => {
    if (!bedAllocationId) return;
    setSaving(true);
    try {
      const updates = {
        ...summary,
        status: finalize ? 'final' : summary.status,
        finalized_at: finalize ? new Date().toISOString() : summary.finalized_at,
        
        // Ensure snapshots are saved
        admission_date: bedAllocation?.admission_date,
        discharge_date: new Date().toISOString(), // Current time as discharge time for now
        consultant_name: patient?.consulting_doctor_name || 'Primary Consultant'
      };

      // @ts-ignore - status type mismatch in partial
      const saved = await createOrUpdateIPDischargeSummary(bedAllocationId, updates);
      setSummary(saved);
    } catch (err) {
      console.error('Failed to save summary', err);
    } finally {
      setSaving(false);
    }
  };

  const autoFill = (field: keyof IPDischargeSummary) => {
    let text = '';
    
    if (field === 'final_diagnosis') {
      text = caseSheetData?.provisional_diagnosis || '';
    } else if (field === 'investigations') {
      // Aggregate from doctor orders
      const uniqueTests = new Set(doctorOrdersData.map(o => o.investigation_instructions).filter(Boolean));
      text = Array.from(uniqueTests).join('\n\n');
      if (!text && caseSheetData?.investigation_summary) {
        text = caseSheetData.investigation_summary;
      }
    } else if (field === 'treatment_given') {
      // Aggregate from doctor orders
      const uniqueTreatments = new Set(doctorOrdersData.map(o => o.treatment_instructions).filter(Boolean));
      text = Array.from(uniqueTreatments).join('\n\n');
      if (!text && caseSheetData?.treatment_plan) {
        text = caseSheetData.treatment_plan;
      }
    } else if (field === 'presenting_complaint') {
      text = caseSheetData?.present_complaints || '';
    } else if (field === 'physical_findings') {
      text = caseSheetData?.examination_notes || '';
    }

    if (text) {
      setSummary(prev => ({ ...prev, [field]: text }));
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  const isFinal = summary.status === 'final';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Discharge Summary</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isFinal ? <span className="flex items-center gap-1 text-green-600"><Lock className="h-3 w-3" /> Finalized</span> : <span className="text-amber-600">Draft Mode</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {!isFinal && (
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Draft
              </button>
            )}
            {!isFinal && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to finalize? The summary will become read-only.')) {
                    handleSave(true);
                  }
                }}
                disabled={saving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                Finalize
              </button>
            )}
            {isFinal && (
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
                <Printer className="h-4 w-4" />
                Print Summary
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Patient Name</p>
            <p className="font-semibold text-gray-900">{patient.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">IP Number</p>
            <p className="font-semibold text-gray-900">{bedAllocation?.ip_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Admission Date</p>
            <p className="font-semibold text-gray-900">{bedAllocation?.admission_date ? new Date(bedAllocation.admission_date).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Discharge Date</p>
            <p className="font-semibold text-gray-900">{summary.discharge_date ? new Date(summary.discharge_date).toLocaleDateString() : '(Pending)'}</p>
          </div>
        </div>
      </div>

      {/* Editable Sections */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        {[
          { key: 'presenting_complaint', label: 'Presenting Complaint', rows: 3 },
          { key: 'physical_findings', label: 'Physical Findings', rows: 4 },
          { key: 'investigations', label: 'Investigations', rows: 4 },
          { key: 'final_diagnosis', label: 'Final Diagnosis', rows: 2 },
          { key: 'treatment_given', label: 'Treatment Given', rows: 5 },
          { key: 'follow_up_advice', label: 'Follow-up Advice', rows: 3 },
        ].map((section) => (
          <div key={section.key} className="relative group">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">{section.label}</label>
              {!isFinal && (
                <button 
                  onClick={() => autoFill(section.key as keyof IPDischargeSummary)}
                  className="text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  title="Auto-fill from Case Sheet / Doctor Orders"
                >
                  <Wand2 className="h-3 w-3" /> Auto-fill
                </button>
              )}
            </div>
            <textarea
              disabled={isFinal}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500"
              rows={section.rows}
              value={(summary[section.key as keyof IPDischargeSummary] as string) || ''}
              onChange={(e) => setSummary({...summary, [section.key]: e.target.value})}
            />
          </div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition at Discharge</label>
            <select
              disabled={isFinal}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500"
              value={summary.condition_at_discharge || ''}
              onChange={(e) => setSummary({...summary, condition_at_discharge: e.target.value})}
            >
              <option value="">Select Condition</option>
              <option value="Cured">Cured</option>
              <option value="Improved">Improved</option>
              <option value="Stable">Stable</option>
              <option value="Referred">Referred</option>
              <option value="DAMA">DAMA (Discharge Against Medical Advice)</option>
              <option value="LAMA">LAMA (Left Against Medical Advice)</option>
              <option value="Absconded">Absconded</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Review On</label>
            <input
              type="date"
              disabled={isFinal}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500"
              value={summary.review_date || ''}
              onChange={(e) => setSummary({...summary, review_date: e.target.value})}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
