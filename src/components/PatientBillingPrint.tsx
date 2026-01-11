'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IPComprehensiveBilling } from '../lib/ipBillingService';

interface PatientBillingPrintProps {
  billing: IPComprehensiveBilling;
  patient: any;
  onClose?: () => void;
}

export function PatientBillingPrint({ billing, patient, onClose }: PatientBillingPrintProps) {
  // Debug: Log the data being passed
  console.log('PatientBillingPrint - patient data:', patient);
  console.log('PatientBillingPrint - billing data:', billing);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '______________________';
    return new Date(dateString).toLocaleDateString('en-GB'); // DD/MM/YYYY format
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

  // Trigger print dialog when component mounts
  useEffect(() => {
    // Add print-active class to body
    document.body.classList.add('print-active');
    
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      window.print();
      
      // Remove print-active class after print dialog closes
      const afterPrintTimer = setTimeout(() => {
        document.body.classList.remove('print-active');
        if (onClose) {
          onClose();
        }
      }, 1000);
      
      return () => clearTimeout(afterPrintTimer);
    }, 500);

    // Cleanup function
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
          
          /* Hide everything except print content */
          body:not(.print-active) * {
            visibility: visible;
          }
          
          body.print-active * {
            visibility: hidden;
          }
          
          /* Show only the print content */
          body.print-active .print-portal-root,
          body.print-active .print-portal-root * {
            visibility: visible;
          }
          
          /* Ensure print content takes full page */
          body.print-active .print-portal-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .section-break {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 2rem;
          }
          
          .force-break {
            break-before: page;
            page-break-before: always;
          }

          .page-break {
            break-after: page;
            page-break-after: always;
            page-break-inside: avoid;
          }

          .no-break {
            page-break-inside: avoid;
          }

          /* Ensure first page doesn't overflow */
          .first-page-break {
            break-after: page;
            page-break-after: always;
          }

          /* Hide elements that should not be in print */
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
      `}</style>

      {/* PAGE 1: BILLING SUMMARY */}
      <div className="section-break">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-4">
          {/* Logo */}
          <div className="h-20 w-full flex items-center justify-center mb-2">
             <img 
               src="/images/logo.png" 
               alt="Annam Hospital Logo" 
               className="h-full w-auto object-contain"
             />
          </div>
          
          {/* Hospital Name and Address */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-900 uppercase tracking-wider">Annam Multispeciality Hospital</h1>
            <p className="text-sm font-semibold text-gray-800 mt-1">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.</p>
            <div className="text-sm text-gray-800 mt-1 flex flex-col items-center justify-center">
              <span className="font-bold">Cell: 8681850592, 8681950592</span>
              <span>Email: annammultispecialityhospital@gmail.com</span>
            </div>
          </div>
          
          <div className="text-center mt-3 pb-2 border-b border-gray-600">
            <h2 className="text-lg font-bold uppercase inline-block px-4 pb-1 text-blue-900 tracking-wider">
              Comprehensive Patient Billing Statement
            </h2>
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-4">
          <div className="flex gap-8 text-sm font-medium pt-4">
            {/* Left Column */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="flex items-baseline">
                <span className="font-bold w-24 shrink-0">Name :</span>
                <span className="flex-1 uppercase border-b border-dotted border-gray-400 pb-1">{patient.name}</span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-24 shrink-0 mt-1">Address :</span>
                <span className="flex-1 min-h-[48px] whitespace-pre-wrap border-b border-dotted border-gray-400 pb-1">{patient.address || ''}</span>
              </div>
              <div className="flex items-baseline mt-auto">
                <span className="font-bold w-24 shrink-0">Patient ID :</span>
                <span className="flex-1 uppercase font-bold border-b border-dotted border-gray-400 pb-1">{patient.patient_id}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-1/2 flex flex-col gap-3">
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Age & Sex :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">
                  {patient.age || '__'} Yrs / {patient.gender || '__'}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Phone :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{patient.phone || ''}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Bill Date :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="mt-4">
          <h3 className="font-bold text-lg mb-2 text-center">Billing Summary</h3>
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>S.No</th>
                <th>Particulars</th>
                <th style={{ width: '120px' }} className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {billing?.admission && (
                <tr>
                  <td>1</td>
                  <td>Bed Charges ({billing.admission.total_days} days @ ₹{billing.bed_charges.daily_rate}/day)</td>
                  <td className="text-right">{formatCurrency(billing.summary.bed_charges_total)}</td>
                </tr>
              )}
              {billing.summary.doctor_consultation_total > 0 && (
                <tr>
                  <td>{billing?.admission ? 2 : 1}</td>
                  <td>Doctor Consultation</td>
                  <td className="text-right">{formatCurrency(billing.summary.doctor_consultation_total)}</td>
                </tr>
              )}
              {billing.summary.doctor_services_total > 0 && (
                <tr>
                  <td>{(billing?.admission ? 2 : 1) + (billing.summary.doctor_consultation_total > 0 ? 1 : 0)}</td>
                  <td>Doctor Services</td>
                  <td className="text-right">{formatCurrency(billing.summary.doctor_services_total)}</td>
                </tr>
              )}
              {billing.summary.prescribed_medicines_total > 0 && (
                <tr>
                  <td>{(billing?.admission ? 2 : 1) + (billing.summary.doctor_consultation_total > 0 ? 1 : 0) + (billing.summary.doctor_services_total > 0 ? 1 : 0)}</td>
                  <td>Prescribed Medicines</td>
                  <td className="text-right">{formatCurrency(billing.summary.prescribed_medicines_total)}</td>
                </tr>
              )}
              {billing.summary.pharmacy_total > 0 && (
                <tr>
                  <td>{(billing?.admission ? 2 : 1) + (billing.summary.doctor_consultation_total > 0 ? 1 : 0) + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0)}</td>
                  <td>Pharmacy</td>
                  <td className="text-right">{formatCurrency(billing.summary.pharmacy_total)}</td>
                </tr>
              )}
              {billing.summary.lab_total > 0 && (
                <tr>
                  <td>{(billing?.admission ? 2 : 1) + (billing.summary.doctor_consultation_total > 0 ? 1 : 0) + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0) + (billing.summary.pharmacy_total > 0 ? 1 : 0)}</td>
                  <td>Laboratory Tests</td>
                  <td className="text-right">{formatCurrency(billing.summary.lab_total)}</td>
                </tr>
              )}
              {billing.summary.radiology_total > 0 && (
                <tr>
                  <td>{(billing?.admission ? 2 : 1) + (billing.summary.doctor_consultation_total > 0 ? 1 : 0) + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0) + (billing.summary.pharmacy_total > 0 ? 1 : 0) + (billing.summary.lab_total > 0 ? 1 : 0)}</td>
                  <td>Radiology/X-Ray</td>
                  <td className="text-right">{formatCurrency(billing.summary.radiology_total)}</td>
                </tr>
              )}
              {billing.summary.other_charges_total > 0 && (
                <tr>
                  <td>{(billing?.admission ? 2 : 1) + (billing.summary.doctor_consultation_total > 0 ? 1 : 0) + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0) + (billing.summary.pharmacy_total > 0 ? 1 : 0) + (billing.summary.lab_total > 0 ? 1 : 0) + (billing.summary.radiology_total > 0 ? 1 : 0)}</td>
                  <td>Other Charges</td>
                  <td className="text-right">{formatCurrency(billing.summary.other_charges_total)}</td>
                </tr>
              )}
              {billing.summary.other_bills_total > 0 && (
                <tr>
                  <td>{(billing?.admission ? 2 : 1) + (billing.summary.doctor_consultation_total > 0 ? 1 : 0) + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0) + (billing.summary.pharmacy_total > 0 ? 1 : 0) + (billing.summary.lab_total > 0 ? 1 : 0) + (billing.summary.radiology_total > 0 ? 1 : 0) + (billing.summary.other_charges_total > 0 ? 1 : 0)}</td>
                  <td>Other Bills</td>
                  <td className="text-right">{formatCurrency(billing.summary.other_bills_total)}</td>
                </tr>
              )}
              <tr className="font-bold">
                <td colSpan={2} className="text-right">GROSS TOTAL:</td>
                <td className="text-right">{formatCurrency(billing.summary.gross_total)}</td>
              </tr>
              {billing.summary.advance_paid > 0 && (
                <tr>
                  <td colSpan={2} className="text-right">Less: Advance Paid</td>
                  <td className="text-right">- {formatCurrency(billing.summary.advance_paid)}</td>
                </tr>
              )}
              {billing.summary.discount > 0 && (
                <tr>
                  <td colSpan={2} className="text-right">Less: Discount</td>
                  <td className="text-right">- {formatCurrency(billing.summary.discount)}</td>
                </tr>
              )}
              <tr className="font-bold text-lg">
                <td colSpan={2} className="text-right">NET PAYABLE:</td>
                <td className="text-right">{formatCurrency(billing.summary.net_payable)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="mt-4 mb-4">
          <p className="font-bold">Amount in Words:</p>
          <p>{amountInWords(billing.summary.pending_amount)}</p>
        </div>

        {/* Payment Status */}
        <div className="mt-4">
          <p className="font-bold">Payment Status: {billing.status.toUpperCase()}</p>
          <p className="font-bold">Total Paid: {formatCurrency(billing.summary.paid_total)}</p>
          <p className="font-bold">Pending Amount: {formatCurrency(billing.summary.pending_amount)}</p>
        </div>

        {/* Signatures */}
        <div className="mt-4" style={{marginTop: '60px'}}>
          <table>
            <tbody>
              <tr>
                <td className="text-center">
                  <p>_____________________</p>
                  <p className="font-bold">Patient Signature</p>
                </td>
                <td className="text-center">
                  <p>_____________________</p>
                  <p className="font-bold">Authorized Signatory</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

              </div>

      {/* PAGE 2: LAB TESTS DETAIL */}
      <div className="force-break">
          {/* Reduced Header */}
          <div className="flex flex-col items-center justify-center mb-1">
            <div className="h-12 w-full flex items-center justify-center mb-1">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">Annam Multispeciality Hospital</p>
            </div>
            <div className="text-center mt-1 pb-1 border-b border-gray-600">
              <h2 className="text-sm font-bold uppercase inline-block px-2 pb-0.5 text-blue-900 tracking-wider">
                LABORATORY TESTS DETAIL
              </h2>
            </div>
          </div>

          <div className="mt-2">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Order Number</th>
                  <th>Test Name</th>
                  <th>Order Date</th>
                  <th className="text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {billing.lab_billing.map((lab, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{lab.order_number}</td>
                    <td>{lab.tests[0]?.test_name || 'Lab Test'}</td>
                    <td>{formatDate(lab.order_date)}</td>
                    <td className="text-right">{formatCurrency(lab.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* PAGE 3: OTHER BILLS DETAIL */}
      <div className="page-break"></div>
      <div className="force-break">
          {/* Reduced Header */}
          <div className="flex flex-col items-center justify-center mb-1">
            <div className="h-12 w-full flex items-center justify-center mb-1">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">Annam Multispeciality Hospital</p>
            </div>
            <div className="text-center mt-1 pb-1 border-b border-gray-600">
              <h2 className="text-sm font-bold uppercase inline-block px-2 pb-0.5 text-blue-900 tracking-wider">
                OTHER BILLS DETAIL
              </h2>
            </div>
          </div>

          <div className="mt-2">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Bill Number</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Bill Date</th>
                  <th>Payment Status</th>
                  <th className="text-right">Total (₹)</th>
                  <th className="text-right">Paid (₹)</th>
                </tr>
              </thead>
              <tbody>
                {billing.other_bills.map((bill, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{bill.bill_number}</td>
                    <td className="capitalize">{bill.charge_category}</td>
                    <td>{bill.charge_description}</td>
                    <td>{formatDate(bill.created_at)}</td>
                    <td className="capitalize">{bill.payment_status}</td>
                    <td className="text-right">{formatCurrency(Number(bill.total_amount))}</td>
                    <td className="text-right">{formatCurrency(Number(bill.paid_amount || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* PAGE 4: PAYMENT TRANSACTIONS */}
      <div className="force-break">
          {/* Reduced Header */}
          <div className="flex flex-col items-center justify-center mb-1">
            <div className="h-12 w-full flex items-center justify-center mb-1">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">Annam Multispeciality Hospital</p>
            </div>
            <div className="text-center mt-1 pb-1 border-b border-gray-600">
              <h2 className="text-sm font-bold uppercase inline-block px-2 pb-0.5 text-blue-900 tracking-wider">
                PAYMENT TRANSACTIONS
              </h2>
            </div>
          </div>

          <div className="mt-2">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Payment Date</th>
                  <th>Payment Type</th>
                  <th>Amount (₹)</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {billing.payment_receipts.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td>{formatDate(p.payment_date)}</td>
                    <td className="capitalize">{p.payment_type}</td>
                    <td className="text-right">{formatCurrency(p.amount)}</td>
                    <td>{p.reference_number || '-'}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td colSpan={3} className="text-right">Total Paid:</td>
                  <td className="text-right">{formatCurrency(billing.summary.paid_total)}</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="mt-4">
            <h4 className="font-bold mb-2">Payment Summary:</h4>
            <table>
              <tbody>
                <tr>
                  <td style={{ width: '150px' }}>Advance Paid:</td>
                  <td className="text-right">{formatCurrency(billing.summary.advance_paid)}</td>
                </tr>
                <tr>
                  <td>Other Bills Paid:</td>
                  <td className="text-right">{formatCurrency(billing.summary.other_bills_paid_total || 0)}</td>
                </tr>
                <tr>
                  <td>Receipts Total:</td>
                  <td className="text-right">{formatCurrency(billing.payment_receipts.reduce((sum, r) => sum + r.amount, 0))}</td>
                </tr>
                <tr className="font-bold">
                  <td>Total Paid:</td>
                  <td className="text-right">{formatCurrency(billing.summary.paid_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );

  return createPortal(
    printContent,
    document.body
  );
}
