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
  const orientation = (searchParams?.get('orientation') || 'portrait').toLowerCase();
  const flip = (searchParams?.get('flip') || '0').toLowerCase();
  const copies = Math.max(1, Math.min(2, Number(searchParams?.get('copies') || '1')));

  const isLandscape = orientation === 'landscape';
  const pageWidth = isLandscape ? '5cm' : '3.5cm';
  const pageHeight = isLandscape ? '3.5cm' : '5cm';
  const rotateDeg = flip === '180' ? '180deg' : '0deg';

  const sheetWidth = copies === 2
    ? (isLandscape ? '10cm' : '7cm')
    : pageWidth;
  const sheetHeight = pageHeight;

  const Label = () => (
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
  );

  return (
    <>
      <div className="no-print mb-8 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Label Printer</h1>
        <p className="text-gray-600">Previewing label ({pageHeight} x {pageWidth})</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              const next = new URL(window.location.href);
              next.searchParams.set('orientation', 'portrait');
              window.location.href = next.toString();
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            Portrait
          </button>
          <button
            onClick={() => {
              const next = new URL(window.location.href);
              next.searchParams.set('orientation', 'landscape');
              window.location.href = next.toString();
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            Landscape
          </button>
          <button
            onClick={() => {
              const next = new URL(window.location.href);
              const curr = (next.searchParams.get('flip') || '0') === '180' ? '0' : '180';
              next.searchParams.set('flip', curr);
              window.location.href = next.toString();
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            Flip 180°
          </button>
          <button
            onClick={() => {
              const next = new URL(window.location.href);
              const curr = Number(next.searchParams.get('copies') || '1') === 2 ? '1' : '2';
              next.searchParams.set('copies', curr);
              window.location.href = next.toString();
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            {copies === 2 ? '1 Label' : '2 Labels'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Print Label
          </button>
        </div>
      </div>

      {/* The Print Sheet */}
      <div className="print-sheet bg-transparent">
        <Label />
        {copies === 2 && <Label />}
      </div>

      <style jsx global>{`
        .print-sheet {
          width: ${sheetWidth};
          height: ${sheetHeight};
          display: flex;
          flex-direction: row;
          align-items: stretch;
          justify-content: flex-start;
          gap: 0;
          box-sizing: border-box;
          background: transparent;
        }

        .print-area {
          width: ${pageWidth};
          height: ${pageHeight};
          border: 1px dashed #ccc; /* Border for preview only */
          box-sizing: border-box;
          transform: rotate(${rotateDeg});
          transform-origin: center;
        }

        @media print {
          @page {
            size: ${sheetWidth} ${sheetHeight};
            margin: 0;
          }

          html, body {
            width: ${sheetWidth};
            height: ${sheetHeight};
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }
          
          .print-sheet, .print-sheet * {
            visibility: visible;
          }
          
          .print-sheet {
            position: fixed;
            left: 0;
            top: 0;
            width: ${sheetWidth};
            height: ${sheetHeight};
            border: none;
            box-shadow: none;
            margin: 0;
            padding: 0;
            border-radius: 0;
          }

          .print-area {
            border: none;
            box-shadow: none;
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
