'use client';

import React, { Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'next/navigation';

function LabelContent() {
  const searchParams = useSearchParams();
  const name = searchParams?.get('name') || 'MR. ATHIBAN JOE';
  const uhid = searchParams?.get('uhid') || '24-25/3243';
  const date = searchParams?.get('date') || '23-Jan-2026';
  const orientation = (searchParams?.get('orientation') || 'landscape').toLowerCase();
  const flip = (searchParams?.get('flip') || '0').toLowerCase();
  const cols = Math.max(1, Math.min(2, Number(searchParams?.get('cols') || '2')));
  const rows = Math.max(1, Math.min(2, Number(searchParams?.get('rows') || '1')));

  // Fixed label size per requirement
  const isLandscape = orientation === 'landscape';
  const labelWidthMm = isLandscape ? 50 : 35;
  const labelHeightMm = isLandscape ? 35 : 50;
  const pageWidth = `${labelWidthMm}mm`;
  const pageHeight = `${labelHeightMm}mm`;

  // Sheet size: label size times rows/cols
  const sheetWidth = `${labelWidthMm * cols}mm`;
  const sheetHeight = `${labelHeightMm * rows}mm`;

  // QR should encode UHID (not URL/ID)
  const qrValue = uhid;

  // Bigger QR code (px). 96 DPI is typical browser print; we scale from mm.
  const mmToPx = (mm: number) => Math.round((mm * 96) / 25.4);
  const qrSizePx = Math.max(110, Math.min(220, Math.round(mmToPx(labelHeightMm * 0.88))));

  const rotateDeg = flip === '180' ? '180deg' : '0deg';

  const Label = () => (
    <div className="print-area bg-white overflow-hidden font-sans text-black" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="text-[6px] font-bold text-center uppercase tracking-tighter w-full pt-1 leading-tight" style={{ flex: '0 0 auto' }}>
        ANNAM MULTISPECIALITY HOSPITAL
      </div>

      {/* Content Area */}
      <div className="flex flex-row items-center justify-start px-1 w-full" style={{ flex: '1 1 auto' }}>
        {/* QR Code (Left) */}
        <div className="flex-shrink-0 pt-0.5">
          <QRCodeSVG
            value={qrValue}
            size={qrSizePx}
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
      <div className="px-1 pb-1" style={{ flex: '0 0 auto' }}>
        <div className="text-[7px] font-bold uppercase truncate leading-tight">NAME: {name}</div>
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
              const currCols = Number(next.searchParams.get('cols') || '2') === 2 ? '1' : '2';
              next.searchParams.set('cols', currCols);
              window.location.href = next.toString();
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            {cols === 2 ? '1 Column' : '2 Columns'}
          </button>
          <button
            onClick={() => {
              const next = new URL(window.location.href);
              const currRows = Number(next.searchParams.get('rows') || '2') === 2 ? '1' : '2';
              next.searchParams.set('rows', currRows);
              window.location.href = next.toString();
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium"
          >
            {rows === 2 ? '1 Row' : '2 Rows'}
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
        {Array.from({ length: rows * cols }).map((_, idx) => (
          <React.Fragment key={idx}>
            <Label />
          </React.Fragment>
        ))}
      </div>

      <style jsx global>{`
        .print-sheet {
          width: ${sheetWidth};
          height: ${sheetHeight};
          display: grid;
          grid-template-columns: repeat(${cols}, ${pageWidth});
          grid-template-rows: repeat(${rows}, ${pageHeight});
          gap: 0;
          box-sizing: border-box;
          background: transparent;
          transform: rotate(${rotateDeg});
          transform-origin: center;
        }

        .print-area {
          width: ${pageWidth};
          height: ${pageHeight};
          border: 1px dashed #ccc; /* Border for preview only */
          box-sizing: border-box;
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
