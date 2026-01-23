'use client';

import React, { Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'next/navigation';

function LabelContent() {
  const searchParams = useSearchParams();
  const url = searchParams?.get('url') || 'http://localhost:3000/patients/bc646a12-482e-474e-8284-436b9fb8c420';
  const name = searchParams?.get('name') || 'MR. ATHIBAN JOE';
  const uhid = searchParams?.get('uhid') || '24-25/3243';
  const date = searchParams?.get('date') || '23-Jan-2026';

  return (
    <>
      <div className="no-print mb-8 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Label Printer</h1>
        <p className="text-gray-600">Previewing label (5cm x 3.5cm)</p>
        <button 
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Print Label
        </button>
      </div>

      {/* The Label */}
      <div className="print-area bg-white overflow-hidden relative font-sans text-black">
        {/* Header */}
        <div className="text-[6px] font-bold text-center uppercase tracking-tighter w-full pt-1 leading-tight">
          ANNAM MULTISPECIALITY HOSPITAL
        </div>

        {/* Content Area */}
        <div className="flex flex-row items-center justify-start px-1 h-[65%] w-full">
          {/* QR Code (Left) */}
          <div className="flex-shrink-0 pt-0.5">
            <QRCodeSVG 
              value={url} 
              size={60} // Optimized for 3.5cm height
              level="M" 
            />
          </div>

          {/* Details (Right) */}
          <div className="flex-grow flex flex-col justify-center h-full pl-2 space-y-1.5">
            <div className="flex flex-col">
              <span className="text-[6px] font-bold text-gray-600 leading-none">UHID:</span>
              <span className="text-[8px] font-bold leading-none">{uhid}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[6px] font-bold text-gray-600 leading-none">DATE:</span>
              <span className="text-[8px] font-bold leading-none">{date}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-1 left-1 right-1">
           <div className="text-[7px] font-bold uppercase truncate leading-tight">
            NAME: {name}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .print-area {
          width: 5cm;
          height: 3.5cm;
          border: 1px dashed #ccc; /* Border for preview only */
          box-sizing: border-box;
        }

        @media print {
          @page {
            size: 5cm 3.5cm;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          body * {
            visibility: hidden;
          }
          
          .print-area, .print-area * {
            visibility: visible;
          }
          
          .print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 5cm;
            height: 3.5cm;
            border: none;
            box-shadow: none;
            margin: 0;
            padding: 0;
            border-radius: 0;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

export default function PrintLabelPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <LabelContent />
      </Suspense>
    </div>
  );
}
