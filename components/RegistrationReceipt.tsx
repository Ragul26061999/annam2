'use client';
import React, { useRef } from 'react';
import { Printer, Download, CheckCircle } from 'lucide-react';

interface ReceiptProps {
  uhid: string;
  patientName: string;
  age?: number;
  gender?: string;
  phone?: string;
  admissionType: 'outpatient' | 'inpatient';
  doctorName?: string;
  bedNumber?: string;
  billNumber: string;
  billDate: string;
  charges: {
    label: string;
    amount: number;
  }[];
  totalAmount: number;
}

export default function RegistrationReceipt({
  uhid,
  patientName,
  age,
  gender,
  phone,
  admissionType,
  doctorName,
  bedNumber,
  billNumber,
  billDate,
  charges,
  totalAmount
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (printWindow && receiptRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Registration Receipt - ${billNumber}</title>
            <style>
              @media print {
                @page { margin: 0.5in; }
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              }
              body { font-family: Arial, sans-serif; }
              .receipt-container { max-width: 800px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 20px; margin-bottom: 20px; }
              .hospital-name { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
              .receipt-title { font-size: 18px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
              .info-item { padding: 10px; background: #f9fafb; border-left: 3px solid #f97316; }
              .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
              .info-value { font-size: 16px; font-weight: 600; color: #1f2937; margin-top: 4px; }
              .charges-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .charges-table th { background: #f97316; color: white; padding: 12px; text-align: left; }
              .charges-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
              .total-row { background: #fef3c7; font-weight: bold; font-size: 18px; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Action Buttons - Not printed */}
      <div className="flex justify-end gap-3 p-4 bg-gray-50 border-b border-gray-200 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Receipt Content - Printable */}
      <div ref={receiptRef} className="p-8">
        {/* Header */}
        <div className="text-center border-b-4 border-orange-500 pb-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <h1 className="text-3xl font-bold text-gray-900">ANNAM MULTISPECIALITY HOSPITAL</h1>
          </div>
          <p className="text-sm text-gray-600 mb-1">123 Hospital Road, Medical District, City - 600001</p>
          <p className="text-sm text-gray-600 mb-3">Phone: +91-44-1234-5678 | Email: info@annamhospital.com</p>
          <div className="inline-block bg-orange-100 px-6 py-2 rounded-full">
            <p className="text-lg font-semibold text-orange-700 uppercase tracking-wide">
              {admissionType === 'outpatient' ? 'Outpatient Registration' : 'Inpatient Admission'} Receipt
            </p>
          </div>
        </div>

        {/* Bill Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Bill Number</p>
            <p className="text-lg font-bold text-gray-900">{billNumber}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-orange-500">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Bill Date</p>
            <p className="text-lg font-bold text-gray-900">{billDate}</p>
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
            Patient Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">UHID</p>
              <p className="text-base font-bold text-blue-900">{uhid}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Patient Name</p>
              <p className="text-base font-bold text-blue-900">{patientName}</p>
            </div>
            {age && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Age</p>
                <p className="text-base font-bold text-blue-900">{age} years</p>
              </div>
            )}
            {gender && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Gender</p>
                <p className="text-base font-bold text-blue-900 capitalize">{gender}</p>
              </div>
            )}
            {phone && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Phone</p>
                <p className="text-base font-bold text-blue-900">{phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Admission Details */}
        {(doctorName || bedNumber) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
              Admission Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {doctorName && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Consulting Doctor</p>
                  <p className="text-base font-bold text-green-900">{doctorName}</p>
                </div>
              )}
              {bedNumber && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Bed Number</p>
                  <p className="text-base font-bold text-green-900">{bedNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charges Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-gray-200">
            Billing Details
          </h3>
          <table className="w-full">
            <thead>
              <tr className="bg-orange-500 text-white">
                <th className="text-left py-3 px-4 font-semibold">S.No</th>
                <th className="text-left py-3 px-4 font-semibold">Description</th>
                <th className="text-right py-3 px-4 font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-700">{index + 1}</td>
                  <td className="py-3 px-4 text-gray-900 font-medium">{charge.label}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-semibold">
                    {charge.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-yellow-50 border-t-2 border-orange-500">
                <td colSpan={2} className="py-4 px-4 text-right text-lg font-bold text-gray-900">
                  Total Amount
                </td>
                <td className="py-4 px-4 text-right text-xl font-bold text-orange-600">
                  ₹ {totalAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-2 border-gray-200">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Payment Status:</p>
              <div className="inline-block bg-green-100 px-4 py-2 rounded-lg">
                <p className="text-sm font-semibold text-green-700">✓ Paid</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">Authorized Signature</p>
              <div className="border-b-2 border-gray-300 w-48 ml-auto mb-1"></div>
              <p className="text-xs text-gray-500">Reception/Billing Counter</p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 mt-6 pt-4 border-t border-gray-200">
            <p className="mb-1">Thank you for choosing Annam Multispeciality Hospital</p>
            <p className="text-xs">This is a computer-generated receipt and does not require a signature</p>
            <p className="text-xs mt-2">For queries, please contact: billing@annamhospital.com | +91-44-1234-5678</p>
          </div>
        </div>
      </div>
    </div>
  );
}
