import React from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import ClinicalDiary from './ClinicalDiary';

interface ClinicalRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: any;
  patient: any;
  defaultTab?: 'overview' | 'doctor' | 'nurse' | 'casesheet' | 'discharge' | 'lab';
}

export default function ClinicalRecordsModal({ isOpen, onClose, allocation, patient, defaultTab }: ClinicalRecordsModalProps) {
  if (!isOpen || !allocation) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-white w-full h-full max-w-[1600px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Clinical Records</h2>
            <div className="flex items-center gap-3 text-sm mt-1">
              <span className="font-semibold text-blue-600">{patient.name}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">{allocation.ip_number}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Admitted: {new Date(allocation.admission_date).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ClinicalDiary 
            bedAllocationId={allocation.id} 
            patientId={patient.id} 
            patientName={patient.name}
            admissionDate={allocation.admission_date}
            dischargeDate={allocation.discharge_date}
            ipNumber={allocation.ip_number}
            defaultTab={defaultTab}
          />
        </div>
      </div>
    </div>
  );
}
