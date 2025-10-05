'use client';

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PrintablePatientSlipProps {
  patientName: string;
  uhid: string;
  visitDate: string;
  qrCodeData?: string;
  onPrint?: () => void;
}

const PrintablePatientSlip: React.FC<PrintablePatientSlipProps> = ({
  patientName,
  uhid,
  visitDate,
  qrCodeData,
  onPrint
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  const handlePrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  const qrData = qrCodeData || uhid;

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .printable-slip,
          .printable-slip * {
            visibility: visible;
          }
          
          .printable-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 85mm !important;
            height: 54mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            border: 1px solid #000 !important;
            box-shadow: none !important;
            font-family: 'Courier New', monospace !important;
          }
          
          .print-hospital-name {
            position: absolute;
            top: 2mm;
            right: 2mm;
            font-size: 8pt !important;
            font-weight: bold !important;
            text-align: right !important;
            line-height: 1.1 !important;
          }
          
          .print-content {
            display: flex !important;
            align-items: flex-start !important;
            gap: 4mm !important;
            margin-top: 8mm !important;
          }
          
          .print-qr-section {
            flex-shrink: 0 !important;
            width: 20mm !important;
          }
          
          .print-qr-code {
            width: 18mm !important;
            height: 18mm !important;
            border: 0.5pt solid #000 !important;
            padding: 0.5mm !important;
          }
          
          .print-qr-code svg {
            width: 100% !important;
            height: 100% !important;
          }
          
          .print-details {
            flex: 1 !important;
            font-size: 7pt !important;
            line-height: 1.3 !important;
          }
          
          .print-detail-row {
            margin-bottom: 1.5mm !important;
            display: block !important;
          }
          
          .print-label {
            font-weight: bold !important;
            display: inline !important;
          }
          
          .print-value {
            display: inline !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        @page {
          size: 85mm 54mm;
          margin: 0;
        }
      `}</style>

      <div className="space-y-4">
        {/* Print Button */}
        <div className="no-print flex justify-center">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Patient Slip
          </button>
        </div>

        {/* Preview Card */}
        <div className="no-print bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Preview:</h3>
          <div className="bg-white border border-gray-300 rounded p-2 inline-block">
            <div className="w-[340px] h-[216px] bg-white border-2 border-gray-800 p-4 font-mono text-black relative scale-75 origin-top-left">
              {/* Hospital Header */}
              <div className="absolute top-2 right-2 text-right">
                <div className="text-xs font-bold tracking-wider">
                  ANNAM MULTISPECIALITY HOSPITAL
                </div>
              </div>

              {/* Content */}
              <div className="flex items-start gap-4 mt-6">
                <div className="flex-shrink-0">
                  <div className="bg-white p-1 border border-gray-300">
                    <QRCodeSVG
                      value={qrData}
                      size={72}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-sm">
                  <div>
                    <span className="font-bold">NAME: </span>
                    <span>{patientName.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="font-bold">UHID: </span>
                    <span>{uhid}</span>
                  </div>
                  <div>
                    <span className="font-bold">DATE: </span>
                    <span>{formatDate(visitDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actual Printable Content (Hidden on Screen) */}
        <div ref={printRef} className="printable-slip" style={{ display: 'none' }}>
          <div className="print-hospital-name">
            ANNAM MULTISPECIALITY HOSPITAL
          </div>
          
          <div className="print-content">
            <div className="print-qr-section">
              <div className="print-qr-code">
                <QRCodeSVG
                  value={qrData}
                  size={100}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
            
            <div className="print-details">
              <div className="print-detail-row">
                <span className="print-label">NAME: </span>
                <span className="print-value">{patientName.toUpperCase()}</span>
              </div>
              
              <div className="print-detail-row">
                <span className="print-label">UHID: </span>
                <span className="print-value">{uhid}</span>
              </div>
              
              <div className="print-detail-row">
                <span className="print-label">DATE: </span>
                <span className="print-value">{formatDate(visitDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintablePatientSlip;
