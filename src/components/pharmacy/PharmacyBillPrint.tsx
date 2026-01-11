'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PharmacyBillPrintProps {
  prescription: {
    id: string;
    prescription_id: string;
    patient_name: string;
    patient_id: string;
    doctor_name: string;
    prescription_date: string;
    items: Array<{
      medication_name: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      dispensed_quantity: number;
      unit_price: number;
      total_price: number;
      instructions?: string;
    }>;
  };
  onClose?: () => void;
}

export function PharmacyBillPrint({ prescription, onClose }: PharmacyBillPrintProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '______________________';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const amountInWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (amount === 0) return 'Zero Rupees Only';

    const convertToWords = (num: number): string => {
      if (num === 0) return '';
      if (num < 10) return ones[num];
      if (num < 20) return teens[num - 10];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertToWords(num % 100) : '');
      if (num < 100000) return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertToWords(num % 1000) : '');
      if (num < 10000000) return convertToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convertToWords(num % 100000) : '');
      return convertToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convertToWords(num % 10000000) : '');
    };

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = convertToWords(rupees) + ' Rupees';
    if (paise > 0) {
      result += ' and ' + convertToWords(paise) + ' Paise';
    }
    return result + ' Only';
  };

  const calculateTotal = () => {
    return prescription.items.reduce((total, item) => total + item.total_price, 0);
  };

  // Trigger print dialog when component mounts
  useEffect(() => {
    document.body.classList.add('print-active');
    
    const timer = setTimeout(() => {
      window.print();
      
      const afterPrintTimer = setTimeout(() => {
        document.body.classList.remove('print-active');
        if (onClose) {
          onClose();
        }
      }, 1000);
      
      return () => clearTimeout(afterPrintTimer);
    }, 500);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('print-active');
    };
  }, [onClose]);

  const printContent = (
    <div className="print-portal-root" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.4' }}>
      <style>{`
        @media print {
          @page {
            margin: 15mm;
            size: A4;
          }
          
          body:not(.print-active) * {
            visibility: visible;
          }
          
          body.print-active * {
            visibility: hidden;
          }
          
          body.print-active .print-portal-root,
          body.print-active .print-portal-root * {
            visibility: visible;
          }
          
          body.print-active .print-portal-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .no-break {
            page-break-inside: avoid;
          }

          .print-only {
            display: block !important;
          }

          .screen-only {
            display: none !important;
          }
        }

        .print-portal-root table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }

        .print-portal-root th,
        .print-portal-root td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }

        .print-portal-root th {
          background-color: #f0f0f0;
          font-weight: bold;
        }

        .print-portal-root .text-center {
          text-align: center;
        }

        .print-portal-root .text-right {
          text-align: right;
        }

        .print-portal-root .font-bold {
          font-weight: bold;
        }

        .print-portal-root .uppercase {
          text-transform: uppercase;
        }
      `}</style>

      {/* Header */}
      <div className="no-break">
        {/* Logo and Hospital Info */}
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="h-20 w-full flex items-center justify-center mb-2">
            <img 
              src="/images/logo.png" 
              alt="Annam Hospital Logo" 
              className="h-full w-auto object-contain"
            />
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wider">Annam Multispeciality Hospital</h1>
            <p className="text-sm font-semibold text-gray-800 mt-1">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.</p>
            <div className="text-sm text-gray-800 mt-1 flex flex-col items-center justify-center">
              <span className="font-bold">Cell: 8681850592, 8681950592</span>
              <span>Email: annammultispecialityhospital@gmail.com</span>
            </div>
          </div>
          
          <div className="text-center mt-3 pb-2 border-b-2 border-gray-800">
            <h2 className="text-xl font-bold uppercase inline-block px-4 pb-1 text-blue-900 tracking-wider">
              Pharmacy Bill
            </h2>
          </div>
        </div>

        {/* Patient and Prescription Information */}
        <div className="mb-4">
          <div className="flex gap-8 text-sm font-medium pt-4">
            {/* Left Column */}
            <div className="w-1/2 flex flex-col gap-3">
              <div className="flex items-baseline">
                <span className="font-bold w-28 shrink-0">Patient Name:</span>
                <span className="flex-1 uppercase border-b border-dotted border-gray-400 pb-1">{prescription.patient_name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-28 shrink-0">Doctor Name:</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">Dr. {prescription.doctor_name}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-1/2 flex flex-col gap-3">
              <div className="flex items-baseline">
                <span className="font-bold w-28 shrink-0">Prescription Date:</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(prescription.prescription_date)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-28 shrink-0">Bill Date:</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Medicines Details */}
        <div className="mt-4 no-break">
          <h3 className="font-bold text-lg mb-3 text-center">Medicines Details</h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>S.No</th>
                <th>Medicine Name</th>
                <th style={{ width: '80px' }}>Dosage</th>
                <th style={{ width: '80px' }}>Frequency</th>
                <th style={{ width: '80px' }}>Duration</th>
                <th style={{ width: '60px' }}>Qty</th>
                <th style={{ width: '60px' }}>Disp</th>
                <th style={{ width: '80px' }} className="text-right">Unit Price</th>
                <th style={{ width: '90px' }} className="text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items.map((item, index) => (
                <tr key={index}>
                  <td className="text-center">{index + 1}</td>
                  <td className="font-medium">{item.medication_name}</td>
                  <td className="text-center">{item.dosage}</td>
                  <td className="text-center">{item.frequency}</td>
                  <td className="text-center">{item.duration}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-center">{item.dispensed_quantity}</td>
                  <td className="text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right font-medium">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
              
              {/* Instructions row if any */}
              {prescription.items.some(item => item.instructions) && (
                <tr>
                  <td colSpan={9} className="text-center font-semibold bg-gray-50">
                    Instructions
                  </td>
                </tr>
              )}
              {prescription.items.map((item, index) => (
                item.instructions ? (
                  <tr key={`instruction-${index}`}>
                    <td colSpan={2} className="text-right font-medium">{item.medication_name}:</td>
                    <td colSpan={7} className="text-blue-600">{item.instructions}</td>
                  </tr>
                ) : null
              ))}
              
              {/* Total Row */}
              <tr className="font-bold text-lg bg-gray-100">
                <td colSpan={8} className="text-right">TOTAL AMOUNT:</td>
                <td className="text-right">{formatCurrency(calculateTotal())}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="mt-4 mb-4 no-break">
          <p className="font-bold">Amount in Words:</p>
          <p className="text-blue-800">{amountInWords(calculateTotal())}</p>
        </div>

        {/* Payment Status */}
        <div className="mt-4 mb-4 no-break">
          <div className="flex gap-8">
            <div className="w-1/2">
              <p className="font-bold">Payment Status: <span className="text-green-600">PAID</span></p>
              <p className="font-bold">Payment Mode: <span className="text-blue-600">CASH/CARD/UPI</span></p>
            </div>
            <div className="w-1/2 text-right">
              <p className="font-bold text-lg">Total Amount: {formatCurrency(calculateTotal())}</p>
              <p className="text-sm text-gray-600">Bill Amount Paid in Full</p>
            </div>
          </div>
        </div>

        
        {/* Signatures */}
        <div className="mt-6" style={{marginTop: '60px'}}>
          <table>
            <tbody>
              <tr>
                <td className="text-center w-1/3">
                  <p>_____________________</p>
                  <p className="font-bold">Patient Signature</p>
                </td>
                <td className="text-center w-1/3">
                  <p>_____________________</p>
                  <p className="font-bold">Pharmacist Signature</p>
                </td>
                <td className="text-center w-1/3">
                  <p>_____________________</p>
                  <p className="font-bold">Authorized Signatory</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-gray-400 text-center text-xs text-gray-600">
          <p className="font-bold">Thank you for choosing Annam Multispeciality Hospital!</p>
          <p>This is a computer generated bill and does not require signature</p>
          <p>For any queries, please contact: 8681850592, 8681950592</p>
        </div>
      </div>
    </div>
  );

  return createPortal(printContent, document.body);
}
