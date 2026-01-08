import React, { useState } from 'react';
import { FileText, Stethoscope, User, FileOutput, History } from 'lucide-react';
import CaseSheet from './CaseSheet';
import DoctorOrders from './DoctorOrders';
import NurseRecords from './NurseRecords';
import DischargeSummary from './DischargeSummary';

interface IPClinicalRecordsProps {
  allocations: any[];
  patient: any;
  defaultTab?: 'case_sheet' | 'doctor_orders' | 'nurse_records' | 'discharge_summary';
}

export default function IPClinicalRecords({ allocations, patient, defaultTab = 'case_sheet' }: IPClinicalRecordsProps) {
  // Sort allocations by admission date descending (latest first)
  const sortedAllocations = [...allocations].sort((a, b) => 
    new Date(b.admission_date || 0).getTime() - new Date(a.admission_date || 0).getTime()
  );

  const [selectedAllocationId, setSelectedAllocationId] = useState<string>(
    sortedAllocations.length > 0 ? sortedAllocations[0].id : ''
  );
  const [activeTab, setActiveTab] = useState<'case_sheet' | 'doctor_orders' | 'nurse_records' | 'discharge_summary'>(defaultTab);

  if (allocations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No IP Admissions Found</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Clinical records are only available for inpatient admissions. 
          Admit the patient to start documenting clinical data.
        </p>
      </div>
    );
  }

  const selectedAllocation = sortedAllocations.find(a => a.id === selectedAllocationId) || sortedAllocations[0];

  const tabs = [
    { id: 'case_sheet', label: 'Case Sheet', icon: FileText, color: 'text-blue-600' },
    { id: 'doctor_orders', label: 'Doctor Orders', icon: Stethoscope, color: 'text-teal-600' },
    { id: 'nurse_records', label: 'Nurse Records', icon: User, color: 'text-purple-600' },
    { id: 'discharge_summary', label: 'Discharge Summary', icon: FileOutput, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Admission Selector */}
      {sortedAllocations.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <History className="h-5 w-5 text-gray-400" />
            <span>Select Admission:</span>
          </div>
          <select
            value={selectedAllocationId}
            onChange={(e) => setSelectedAllocationId(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {sortedAllocations.map(alloc => (
              <option key={alloc.id} value={alloc.id}>
                {alloc.ip_number || 'IP (No Number)'} — {new Date(alloc.admission_date).toLocaleDateString()} 
                {alloc.status === 'active' ? ' (Active)' : ` (Discharged: ${alloc.discharge_date ? new Date(alloc.discharge_date).toLocaleDateString() : 'N/A'})`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-gray-100 text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? tab.color : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'case_sheet' && (
          <CaseSheet 
            bedAllocationId={selectedAllocationId} 
            patientId={patient.id} 
          />
        )}
        {activeTab === 'doctor_orders' && (
          <DoctorOrders 
            bedAllocationId={selectedAllocationId} 
          />
        )}
        {activeTab === 'nurse_records' && (
          <NurseRecords 
            bedAllocationId={selectedAllocationId} 
          />
        )}
        {activeTab === 'discharge_summary' && (
          <DischargeSummary 
            bedAllocationId={selectedAllocationId}
            patient={patient}
            bedAllocation={selectedAllocation}
          />
        )}
      </div>
    </div>
  );
}
