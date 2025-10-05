'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PatientSlipProps {
  patientName: string;
  uhid: string;
  visitDate: string;
  qrCodeData?: string;
}

const HorizontalPatientSlip: React.FC<PatientSlipProps> = ({
  patientName,
  uhid,
  visitDate,
  qrCodeData
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  const qrData = qrCodeData || uhid;

  return (
    <div className="horizontal-patient-slip">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .horizontal-patient-slip {
            width: 85mm !important;
            height: 54mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            page-break-after: always;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
          
          .hospital-header {
            font-size: 8pt !important;
            margin-bottom: 2mm !important;
          }
          
          .content-area {
            gap: 3mm !important;
          }
          
          .qr-section {
            width: 20mm !important;
          }
          
          .qr-code {
            width: 18mm !important;
            height: 18mm !important;
          }
          
          .patient-details {
            font-size: 7pt !important;
            line-height: 1.2 !important;
          }
          
          .detail-row {
            margin-bottom: 1mm !important;
          }
          
          .label {
            font-weight: bold !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .horizontal-patient-slip,
          .horizontal-patient-slip * {
            visibility: visible;
          }
          
          .horizontal-patient-slip {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
        
        @page {
          size: 85mm 54mm;
          margin: 0;
        }
      `}</style>

      {/* Screen Styles */}
      <div className="bg-white border-2 border-gray-800 w-[340px] h-[216px] p-4 font-mono text-black relative">
        {/* Hospital Header - Top Right */}
        <div className="hospital-header absolute top-2 right-2 text-right">
          <div className="text-xs font-bold tracking-wider">
            ANNAM MULTISPECIALITY HOSPITAL
          </div>
        </div>

        {/* Main Content Area - Horizontal Layout */}
        <div className="content-area flex items-start gap-4 mt-6">
          {/* QR Code Section - Left */}
          <div className="qr-section flex-shrink-0">
            <div className="qr-code bg-white p-1 border border-gray-300">
              <QRCodeSVG
                value={qrData}
                size={72}
                level="M"
                includeMargin={false}
                className="block"
              />
            </div>
          </div>

          {/* Patient Details - Right */}
          <div className="patient-details flex-1 space-y-2 text-sm">
            <div className="detail-row">
              <span className="label font-bold">NAME: </span>
              <span className="value">{patientName.toUpperCase()}</span>
            </div>
            
            <div className="detail-row">
              <span className="label font-bold">UHID: </span>
              <span className="value">{uhid}</span>
            </div>
            
            <div className="detail-row">
              <span className="label font-bold">DATE: </span>
              <span className="value">{formatDate(visitDate)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Border Line */}
        <div className="absolute bottom-2 left-2 right-2 border-t border-gray-400"></div>
      </div>
    </div>
  );
};

export default HorizontalPatientSlip;
