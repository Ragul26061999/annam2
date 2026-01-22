import React from 'react';
import { Printer, X } from 'lucide-react';
import Barcode from 'react-barcode';

interface Patient {
  name: string;
  gender: string;
  age?: number | string;
  patient_id: string;
  [key: string]: any;
}

interface BarcodeModalProps {
  patient: Patient;
  onClose: () => void;
}

export default function BarcodeModal({ patient, onClose }: BarcodeModalProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const indianTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return indianTime.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    const printContent = document.getElementById('barcode-print-area');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Printer className="h-4 w-4 text-purple-600" />
            Print Patient Barcode
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center space-y-6">
          <div id="barcode-print-area" className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-lg bg-white">
            <div className="text-center mb-4">
              <p className="font-bold text-xl text-black">{patient.name}</p>
              <p className="text-sm text-gray-600">{patient.gender?.charAt(0).toUpperCase()} / {patient.age || 'N/A'}</p>
              <p className="text-xs text-gray-500 mt-1">{formatDate(new Date().toISOString())}</p>
            </div>
            <Barcode value={patient.patient_id} width={2} height={60} fontSize={16} />
          </div>
          
          <div className="flex gap-3 w-full">
            <button 
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
