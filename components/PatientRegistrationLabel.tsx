'use client';
import React, { useRef } from 'react';
import { Printer, QrCode } from 'lucide-react';

interface PatientRegistrationLabelProps {
  uhid: string;
  patientName: string;
  dateOfVisit: string;
  qrCode?: string;
}

/**
 * Patient Registration Label Component
 * Designed for 2×3 inch thermal label printers
 * Dimensions: 2 inches (width) × 3 inches (height) = 192px × 288px at 96 DPI
 */
export default function PatientRegistrationLabel({
  uhid,
  patientName,
  dateOfVisit,
  qrCode
}: PatientRegistrationLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the label');
      return;
    }

    const labelContent = labelRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Label - ${uhid}</title>
          <style>
            @page {
              size: 85mm 54mm;
              margin: 0;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
                width: 85mm;
                height: 54mm;
              }
              
              .no-print {
                display: none !important;
              }
              
              .label-container {
                width: 85mm !important;
                height: 54mm !important;
                padding: 4mm !important;
                border: 1px solid #000 !important;
                position: relative !important;
                display: flex !important;
                flex-direction: column !important;
              }
              
              .hospital-header {
                position: absolute !important;
                top: 1mm !important;
                left: 4mm !important;
                right: 4mm !important;
                text-align: center !important;
                font-size: 8pt !important;
                font-weight: bold !important;
                line-height: 1.1 !important;
              }
              
              .hospital-header div:first-child {
                margin-bottom: 0.5mm !important;
              }
              
              .hospital-header div:last-child {
                width: 100% !important;
                height: 0.5pt !important;
                background-color: #000 !important;
                margin-top: 0.5mm !important;
              }
              
              .main-content {
                display: flex !important;
                align-items: flex-start !important;
                gap: 4mm !important;
                margin-top: 10mm !important;
              }
              
              .qr-section {
                flex-shrink: 0 !important;
              }
              
              .qr-code {
                width: 18mm !important;
                height: 18mm !important;
                border: 0.5pt solid #ccc !important;
                padding: 0.5mm !important;
              }
              
              .patient-info {
                flex: 1 !important;
                font-size: 7pt !important;
                line-height: 1.3 !important;
              }
              
              .info-row {
                margin-bottom: 1.5mm !important;
              }
              
              .info-label {
                font-weight: bold !important;
              }
            }
            
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          ${labelContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="w-full">
      {/* Print Preview - Horizontal Layout */}
      <div 
        ref={labelRef}
        className="label-container bg-white border-2 border-gray-800 mx-auto"
        style={{ 
          width: '340px', 
          height: '216px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Hospital Name - Centered at Top */}
        <div className="hospital-header" style={{ 
          position: 'absolute', 
          top: '4px', 
          left: '12px', 
          right: '12px', 
          textAlign: 'center',
          fontSize: '10px', 
          fontWeight: 'bold', 
          lineHeight: '1.1' 
        }}>
          <div>ANNAM MULTISPECIALITY HOSPITAL</div>
          <div style={{ 
            width: '100%', 
            height: '1px', 
            backgroundColor: '#000', 
            marginTop: '2px' 
          }}></div>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className="main-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginTop: '32px' }}>
          {/* QR Code Section - Left */}
          <div className="qr-section" style={{ flexShrink: 0 }}>
            {qrCode && (
              <div style={{ border: '1px solid #ccc', padding: '4px', backgroundColor: 'white' }}>
                <img 
                  src={qrCode} 
                  alt={`QR Code for ${uhid}`}
                  className="qr-code"
                  style={{ width: '80px', height: '80px', display: 'block' }}
                />
              </div>
            )}
          </div>

          {/* Patient Information - Right */}
          <div className="patient-info" style={{ flex: 1, fontSize: '11px', lineHeight: '1.4' }}>
            <div className="info-row" style={{ marginBottom: '8px' }}>
              <span className="info-label" style={{ fontWeight: 'bold' }}>NAME: </span>
              <span style={{ textTransform: 'uppercase' }}>{patientName}</span>
            </div>
            
            <div className="info-row" style={{ marginBottom: '8px' }}>
              <span className="info-label" style={{ fontWeight: 'bold' }}>UHID: </span>
              <span>{uhid}</span>
            </div>
            
            <div className="info-row" style={{ marginBottom: '8px' }}>
              <span className="info-label" style={{ fontWeight: 'bold' }}>DATE: </span>
              <span>{new Date(dateOfVisit).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Bottom Border */}
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', height: '1px', backgroundColor: '#ccc' }}></div>
      </div>

      {/* Print Button */}
      <div className="mt-4 flex justify-center no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
        >
          <Printer className="h-5 w-5" />
          Print Patient Label
        </button>
      </div>

      {/* Alternative: Hospital Visit Slip (Full Page) */}
      <div className="mt-6 no-print">
        <button
          onClick={() => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
              alert('Please allow popups to print');
              return;
            }

            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Patient Registration Slip - ${uhid}</title>
                  <style>
                    @page {
                      size: A4;
                      margin: 20mm;
                    }
                    
                    @media print {
                      body {
                        margin: 0;
                        padding: 20px;
                      }
                      
                      .no-print {
                        display: none !important;
                      }
                    }
                    
                    body {
                      font-family: Arial, sans-serif;
                      line-height: 1.6;
                    }
                    
                    .slip-container {
                      max-width: 600px;
                      margin: 0 auto;
                      border: 2px solid #000;
                      padding: 30px;
                    }
                    
                    .header {
                      text-align: center;
                      margin-bottom: 30px;
                      border-bottom: 2px solid #000;
                      padding-bottom: 15px;
                    }
                    
                    .hospital-name {
                      font-size: 24px;
                      font-weight: bold;
                      margin-bottom: 5px;
                    }
                    
                    .slip-title {
                      font-size: 18px;
                      font-weight: 600;
                      margin-top: 10px;
                    }
                    
                    .content {
                      display: flex;
                      gap: 30px;
                      margin-top: 20px;
                    }
                    
                    .qr-section {
                      flex-shrink: 0;
                    }
                    
                    .qr-code {
                      width: 150px;
                      height: 150px;
                      border: 1px solid #ccc;
                    }
                    
                    .info-section {
                      flex-grow: 1;
                    }
                    
                    .info-row {
                      margin-bottom: 15px;
                      display: flex;
                    }
                    
                    .info-label {
                      font-weight: bold;
                      width: 150px;
                      flex-shrink: 0;
                    }
                    
                    .info-value {
                      flex-grow: 1;
                    }
                    
                    .footer {
                      margin-top: 40px;
                      padding-top: 20px;
                      border-top: 1px solid #ccc;
                      text-align: center;
                      font-size: 12px;
                      color: #666;
                    }
                  </style>
                </head>
                <body>
                  <div class="slip-container">
                    <div class="header">
                      <div class="hospital-name">Annam Multispeciality Hospital</div>
                      <div class="slip-title">Patient Registration Slip</div>
                    </div>
                    
                    <div class="content">
                      ${qrCode ? `
                        <div class="qr-section">
                          <img src="${qrCode}" alt="QR Code" class="qr-code" />
                        </div>
                      ` : ''}
                      
                      <div class="info-section">
                        <div class="info-row">
                          <div class="info-label">UHID:</div>
                          <div class="info-value" style="font-size: 18px; font-weight: bold;">${uhid}</div>
                        </div>
                        
                        <div class="info-row">
                          <div class="info-label">Patient Name:</div>
                          <div class="info-value" style="font-size: 16px; font-weight: 600;">${patientName}</div>
                        </div>
                        
                        <div class="info-row">
                          <div class="info-label">Registration Date:</div>
                          <div class="info-value">${new Date(dateOfVisit).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}</div>
                        </div>
                        
                        <div class="info-row">
                          <div class="info-label">Time:</div>
                          <div class="info-value">${new Date().toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="footer">
                      <p>Please keep this slip for your records and present it during your visits.</p>
                      <p>For appointments and queries, please contact the reception.</p>
                    </div>
                  </div>
                </body>
              </html>
            `);
            
            printWindow.document.close();
            
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 250);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
        >
          <QrCode className="h-5 w-5" />
          Print Registration Slip (A4)
        </button>
      </div>
    </div>
  );
}
