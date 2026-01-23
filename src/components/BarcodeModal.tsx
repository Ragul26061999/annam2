import React, { useState } from 'react';
import { Printer, X, QrCode } from 'lucide-react';
import Barcode from 'react-barcode';
import { generateQRCode } from '../lib/qrCodeService';

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
  const [printPlacement, setPrintPlacement] = useState<'left' | 'right' | 'both'>('both');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

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

  const handlePrint2 = async () => {
    try {
      setIsGeneratingQr(true);
      const patientUuid = patient.id || patient.patient_id;
      const qrDataUrl = await generateQRCode(patient.patient_id, 512);
      const currentDate = formatDate(new Date().toISOString());

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Patient Label - ${patient.patient_id}</title>
            <style>
              @page {
                size: 10cm 3.5cm;
                margin: 0;
              }
              
              body {
                margin: 0;
                padding: 0;
                width: 10cm;
                height: 3.5cm;
                font-family: sans-serif;
                background: white;
              }

              .sheet {
                width: 10cm;
                height: 3.5cm;
                display: flex;
                flex-direction: row;
                align-items: stretch;
                justify-content: flex-start;
              }

              .label-container {
                width: 5cm;
                height: 3.5cm;
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
              }

              .header {
                font-size: 6px;
                font-weight: bold;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: -0.02em;
                width: 100%;
                padding-top: 4px;
                line-height: 1.1;
              }

              .content {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: flex-start;
                padding: 0 4px;
                height: 65%;
                width: 100%;
                box-sizing: border-box;
              }

              .qr-code {
                flex-shrink: 0;
                padding-top: 18px;
              }

              .qr-code img {
                width: 26mm;
                height: 26mm;
              }

              .details {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                height: 100%;
                padding-left: 8px;
                gap: 4px;
              }

              .detail-item {
                display: flex;
                flex-direction: column;
              }

              .detail-label {
                font-size: 6px;
                font-weight: bold;
                color: #4b5563;
                line-height: 1;
              }

              .detail-value {
                font-size: 10px;
                font-weight: bold;
                color: #000;
                line-height: 1;
              }

              .footer {
                position: absolute;
                bottom: 2px;
                left: 4px;
                right: 4px;
              }

              .patient-name {
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.1;
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              <div class="label-container">
                <div class="header">
                  ANNAM MULTISPECIALITY HOSPITAL
                </div>

                <div class="content">
                  <div class="qr-code">
                    <img src="${qrDataUrl}" alt="QR" />
                  </div>

                  <div class="details">
                    <div class="detail-item">
                      <span class="detail-label">UHID:</span>
                      <span class="detail-value">${patient.patient_id}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">DATE:</span>
                      <span class="detail-value">${currentDate}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">AGE:</span>
                      <span class="detail-value">${patient.age || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div class="footer">
                  <div class="patient-name">
                    NAME: ${patient.name}
                  </div>
                </div>
              </div>

              <div class="label-container">
                <div class="header">
                  ANNAM MULTISPECIALITY HOSPITAL
                </div>

                <div class="content">
                  <div class="qr-code">
                    <img src="${qrDataUrl}" alt="QR" />
                  </div>

                  <div class="details">
                    <div class="detail-item">
                      <span class="detail-label">UHID:</span>
                      <span class="detail-value">${patient.patient_id}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">DATE:</span>
                      <span class="detail-value">${currentDate}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">AGE:</span>
                      <span class="detail-value">${patient.age || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div class="footer">
                  <div class="patient-name">
                    NAME: ${patient.name}
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for image to load before printing
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);

    } catch (error) {
      console.error('Error generating label:', error);
      alert('Failed to generate label');
    } finally {
      setIsGeneratingQr(false);
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
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Print placement</label>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setPrintPlacement('left')}
                className={`flex-1 py-2 px-3 border rounded-lg text-sm font-semibold transition-colors ${printPlacement === 'left' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Left
              </button>
              <button
                type="button"
                onClick={() => setPrintPlacement('right')}
                className={`flex-1 py-2 px-3 border rounded-lg text-sm font-semibold transition-colors ${printPlacement === 'right' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Right
              </button>
              <button
                type="button"
                onClick={() => setPrintPlacement('both')}
                className={`flex-1 py-2 px-3 border rounded-lg text-sm font-semibold transition-colors ${printPlacement === 'both' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Both
              </button>
            </div>
          </div>

          <div id="barcode-print-area" className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-lg bg-white">
            <div className="text-center mb-4">
              <p className="patient-name font-bold text-xl text-black">{patient.name}</p>
              <p className="patient-meta text-sm text-gray-600">{patient.gender?.charAt(0).toUpperCase()} / {patient.age || 'N/A'}</p>
              <p className="patient-meta text-xs text-gray-500 mt-1">{formatDate(new Date().toISOString())}</p>
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
              onClick={handlePrint2}
              disabled={isGeneratingQr}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <QrCode className="h-4 w-4" />
              {isGeneratingQr ? '...' : 'Print'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
