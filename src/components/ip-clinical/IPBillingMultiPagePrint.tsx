'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { IPComprehensiveBilling } from '../../lib/ipBillingService';

interface IPBillingMultiPagePrintProps {
  billing: IPComprehensiveBilling;
}

export function IPBillingMultiPagePrint({ billing }: IPBillingMultiPagePrintProps) {
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

  const printContent = (
    <div className="bg-white text-black print-template hidden print:block print-portal-root">
      <style jsx global>{`
        @media print {
          /* Reset body */
          body {
            margin: 0;
            padding: 0;
            background: white;
            height: auto;
            overflow: visible;
          }
          
          /* Hide EVERYTHING in the body first */
          body > * {
            display: none !important;
          }

          /* But show our portal root */
          body > .print-portal-root {
            display: block !important;
            position: relative;
            top: auto;
            left: auto;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: black;
            background: white;
            z-index: 9999;
            visibility: visible;
          }

          /* Explicitly hide standard app roots just in case */
          #root, #modal-root {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 20mm;
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

        .print-portal-root .text-lg {
          font-size: 18px;
        }

        .print-portal-root .text-xl {
          font-size: 20px;
        }

        .print-portal-root .mb-4 {
          margin-bottom: 16px;
        }

        .print-portal-root .mt-4 {
          margin-top: 16px;
        }
      `}</style>

      {/* PAGE 1: SUMMARY */}
      <div className="section-break">
        {/* Header Block - Matching Discharge Summary Style */}
        <div className="flex flex-col items-center justify-center mb-2">
          {/* Logo */}
          <div className="h-28 w-full flex items-center justify-center mb-2">
             <img 
               src="/images/logo.png" 
               alt="Annam Hospital Logo" 
               className="h-full w-auto object-contain"
             />
          </div>
          
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk,</p>
            <p className="text-sm font-semibold text-gray-800">Thoothukudi - 628 216.</p>
            <div className="text-sm text-gray-800 mt-1 flex flex-col items-center justify-center">
              <span className="font-bold">Cell: 8681850592, 8681950592</span>
              <span>Email: annammultispecialityhospital@gmail.com</span>
            </div>
          </div>
          
          <div className="text-center mt-4 pb-2 border-b-2 border-gray-800">
            <h2 className="text-lg font-bold uppercase inline-block px-4 pb-1 text-blue-900 tracking-wider">
              IP BILLING SUMMARY
            </h2>
          </div>
        </div>

        {/* Patient Identification - Matching Discharge Summary Format */}
        <div className="section-break mb-8">
          <div className="flex gap-8 text-sm font-medium pt-4">
            {/* Left Column */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="flex items-baseline">
                <span className="font-bold w-24 shrink-0">Name :</span>
                <span className="flex-1 uppercase border-b border-dotted border-gray-400 pb-1">{billing.patient.name}</span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-24 shrink-0 mt-1">Address :</span>
                <span className="flex-1 min-h-[48px] whitespace-pre-wrap border-b border-dotted border-gray-400 pb-1">{billing.patient.address || ''}</span>
              </div>
              <div className="flex items-baseline mt-auto">
                <span className="font-bold w-24 shrink-0">Bill No. :</span>
                <span className="flex-1 uppercase font-bold border-b border-dotted border-gray-400 pb-1">{billing.bill_number}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-1/2 flex flex-col gap-3">
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Age & Sex :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">
                  {billing.patient.age || '__'} Yrs / {billing.patient.gender || '__'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-baseline flex-1">
                    <span className="font-bold w-20 shrink-0">O.P. No.</span>
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{billing.patient.patient_id}</span>
                 </div>
                 <div className="flex items-baseline flex-1 ml-4">
                    <span className="font-bold w-16 shrink-0 text-right pr-2">I.P. No.</span>
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{billing.admission.ip_number}</span>
                 </div>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Date of Admission :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(billing.admission.admission_date)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Date of Discharge :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(billing.admission.discharge_date)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Total Days :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{billing.admission.total_days}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        <div className="section-break">
          <h3 className="font-bold uppercase text-sm mb-2 text-blue-900">Billing Summary :</h3>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Service Category</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Bed Charges ({billing.bed_charges.bed_type} - {billing.bed_charges.days} days)</td>
                <td className="text-right">{formatCurrency(billing.summary.bed_charges_total)}</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Doctor Consultation ({billing.doctor_consultation.doctor_name})</td>
                <td className="text-right">{formatCurrency(billing.summary.doctor_consultation_total)}</td>
              </tr>
            {billing.summary.doctor_services_total > 0 && (
              <tr>
                <td>3</td>
                <td>Doctor Services</td>
                <td className="text-right">{formatCurrency(billing.summary.doctor_services_total)}</td>
              </tr>
            )}
            {billing.summary.prescribed_medicines_total > 0 && (
              <tr>
                <td>{3 + (billing.summary.doctor_services_total > 0 ? 1 : 0)}</td>
                <td>Prescribed Medicines</td>
                <td className="text-right">{formatCurrency(billing.summary.prescribed_medicines_total)}</td>
              </tr>
            )}
            {billing.summary.pharmacy_total > 0 && (
              <tr>
                <td>{3 + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0)}</td>
                <td>Pharmacy Bills</td>
                <td className="text-right">{formatCurrency(billing.summary.pharmacy_total)}</td>
              </tr>
            )}
            {billing.summary.lab_total > 0 && (
              <tr>
                <td>{4 + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0) + (billing.summary.pharmacy_total > 0 ? 1 : 0)}</td>
                <td>Laboratory Tests</td>
                <td className="text-right">{formatCurrency(billing.summary.lab_total)}</td>
              </tr>
            )}
            {billing.summary.radiology_total > 0 && (
              <tr>
                <td>{5 + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0) + (billing.summary.pharmacy_total > 0 ? 1 : 0) + (billing.summary.lab_total > 0 ? 1 : 0)}</td>
                <td>Radiology/X-Ray</td>
                <td className="text-right">{formatCurrency(billing.summary.radiology_total)}</td>
              </tr>
            )}
            {billing.summary.other_charges_total > 0 && (
              <tr>
                <td>{6 + (billing.summary.doctor_services_total > 0 ? 1 : 0) + (billing.summary.prescribed_medicines_total > 0 ? 1 : 0) + (billing.summary.pharmacy_total > 0 ? 1 : 0) + (billing.summary.lab_total > 0 ? 1 : 0) + (billing.summary.radiology_total > 0 ? 1 : 0)}</td>
                <td>Other Charges</td>
                <td className="text-right">{formatCurrency(billing.summary.other_charges_total)}</td>
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

        <p className="text-center mt-4" style={{fontSize: '10px'}}>
          ** Detailed breakdown of services available on following pages **
        </p>
      </div>

      {/* PAGE 2: PRESCRIBED MEDICINES DETAIL */}
      {billing.prescribed_medicines.length > 0 && (
        <div className="force-break">
          {/* Reduced Header Block for Service Pages */}
          <div className="flex flex-col items-center justify-center mb-1">
            {/* Logo - Reduced Size */}
            <div className="h-16 w-full flex items-center justify-center mb-1">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            
            {/* Reduced Address */}
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.</p>
              <div className="text-xs text-gray-800 mt-0.5 flex flex-col items-center justify-center">
                <span className="font-bold">Cell: 8681850592, 8681950592</span>
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
            
            <div className="text-center mt-2 pb-1 border-b border-gray-600">
              <h2 className="text-base font-bold uppercase inline-block px-3 pb-0.5 text-blue-900 tracking-wider">
                PRESCRIBED MEDICINES
              </h2>
            </div>
          </div>
          
          <div className="text-center mb-2">
            <p className="text-xs text-gray-600">Bill Number: {billing.bill_number} | Patient: {billing.patient.name}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {billing.prescribed_medicines.map((med, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="font-bold">{med.medicine_name}</div>
                    {med.generic_name && <div style={{fontSize: '10px'}}>{med.generic_name}</div>}
                  </td>
                  <td>{med.dosage}</td>
                  <td>{med.frequency}</td>
                  <td>{med.duration}</td>
                  <td className="text-center">{med.quantity}</td>
                  <td className="text-right">{formatCurrency(med.unit_price)}</td>
                  <td className="text-right">{formatCurrency(med.total_price)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={7} className="text-right">TOTAL MEDICINES:</td>
                <td className="text-right">{formatCurrency(billing.summary.prescribed_medicines_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* PAGE 3: PHARMACY BILLS DETAIL */}
      {billing.pharmacy_billing.length > 0 && (
        <div className="force-break">
          {/* Reduced Header Block for Service Pages */}
          <div className="flex flex-col items-center justify-center mb-1">
            {/* Logo - Reduced Size */}
            <div className="h-16 w-full flex items-center justify-center mb-1">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            
            {/* Reduced Address */}
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.</p>
              <div className="text-xs text-gray-800 mt-0.5 flex flex-col items-center justify-center">
                <span className="font-bold">Cell: 8681850592, 8681950592</span>
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
            
            <div className="text-center mt-2 pb-1 border-b border-gray-600">
              <h2 className="text-base font-bold uppercase inline-block px-3 pb-0.5 text-blue-900 tracking-wider">
                PHARMACY BILLS
              </h2>
            </div>
          </div>
          
          <div className="text-center mb-2">
            <p className="text-xs text-gray-600">Bill Number: {billing.bill_number} | Patient: {billing.patient.name}</p>
          </div>

          {billing.pharmacy_billing.map((pb, pbIdx) => (
            <div key={pbIdx} className="mb-4">
              <h3 className="font-bold">Pharmacy Bill: {pb.bill_number} (Date: {formatDate(pb.bill_date)})</h3>
              <table>
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Medicine Name</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pb.items.map((item, itemIdx) => (
                    <tr key={itemIdx}>
                      <td>{itemIdx + 1}</td>
                      <td>{item.medicine_name}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={4} className="text-right">Bill Total:</td>
                    <td className="text-right">{formatCurrency(pb.total_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          <div className="mt-4">
            <table>
              <tbody>
                <tr className="font-bold text-lg">
                  <td className="text-right">TOTAL PHARMACY CHARGES:</td>
                  <td className="text-right">{formatCurrency(billing.summary.pharmacy_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGE 4: LABORATORY TESTS DETAIL */}
      {billing.lab_billing.length > 0 && (
        <div className="force-break">
          {/* Reduced Header Block for Service Pages */}
          <div className="flex flex-col items-center justify-center mb-1">
            {/* Logo - Reduced Size */}
            <div className="h-16 w-full flex items-center justify-center mb-1">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            
            {/* Reduced Address */}
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.</p>
              <div className="text-xs text-gray-800 mt-0.5 flex flex-col items-center justify-center">
                <span className="font-bold">Cell: 8681850592, 8681950592</span>
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
            
            <div className="text-center mt-2 pb-1 border-b border-gray-600">
              <h2 className="text-base font-bold uppercase inline-block px-3 pb-0.5 text-blue-900 tracking-wider">
                LABORATORY TESTS
              </h2>
            </div>
          </div>
          
          <div className="text-center mb-2">
            <p className="text-xs text-gray-600">Bill Number: {billing.bill_number} | Patient: {billing.patient.name}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Order Number</th>
                <th>Test Name</th>
                <th>Order Date</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {billing.lab_billing.map((lb, lbIdx) => (
                <React.Fragment key={lbIdx}>
                  {lb.tests.map((test, testIdx) => (
                    <tr key={`${lbIdx}-${testIdx}`}>
                      <td>{lbIdx + 1}.{testIdx + 1}</td>
                      <td>{lb.order_number}</td>
                      <td>{test.test_name}</td>
                      <td>{formatDate(lb.order_date)}</td>
                      <td className="text-right">{formatCurrency(test.test_cost)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="font-bold text-lg">
                <td colSpan={4} className="text-right">TOTAL LABORATORY CHARGES:</td>
                <td className="text-right">{formatCurrency(billing.summary.lab_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* PAGE 5: RADIOLOGY/X-RAY DETAIL */}
      {billing.radiology_billing.length > 0 && (
        <div className="force-break">
          {/* Reduced Header Block for Service Pages */}
          <div className="flex flex-col items-center justify-center mb-1">
            {/* Logo - Reduced Size */}
            <div className="h-16 w-full flex items-center justify-center mb-1">
               <img 
                 src="/images/logo.png" 
                 alt="Annam Hospital Logo" 
                 className="h-full w-auto object-contain"
               />
            </div>
            
            {/* Reduced Address */}
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.</p>
              <div className="text-xs text-gray-800 mt-0.5 flex flex-col items-center justify-center">
                <span className="font-bold">Cell: 8681850592, 8681950592</span>
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
            
            <div className="text-center mt-2 pb-1 border-b border-gray-600">
              <h2 className="text-base font-bold uppercase inline-block px-3 pb-0.5 text-blue-900 tracking-wider">
                RADIOLOGY / X-RAY
              </h2>
            </div>
          </div>
          
          <div className="text-center mb-2">
            <p className="text-xs text-gray-600">Bill Number: {billing.bill_number} | Patient: {billing.patient.name}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Order Number</th>
                <th>Scan Name</th>
                <th>Order Date</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {billing.radiology_billing.map((rb, rbIdx) => (
                <React.Fragment key={rbIdx}>
                  {rb.scans.map((scan, scanIdx) => (
                    <tr key={`${rbIdx}-${scanIdx}`}>
                      <td>{rbIdx + 1}.{scanIdx + 1}</td>
                      <td>{rb.order_number}</td>
                      <td>{scan.scan_name}</td>
                      <td>{formatDate(rb.order_date)}</td>
                      <td className="text-right">{formatCurrency(scan.scan_cost)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="font-bold text-lg">
                <td colSpan={4} className="text-right">TOTAL RADIOLOGY CHARGES:</td>
                <td className="text-right">{formatCurrency(billing.summary.radiology_total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENTS: TRANSACTIONS */}
      {billing.payment_receipts && billing.payment_receipts.length > 0 && (
        <div className="force-break">
          {/* Reduced Header Block for Service Pages */}
          <div className="flex flex-col items-center justify-center mb-1">
            <div className="h-16 w-full flex items-center justify-center mb-1">
              <img
                src="/images/logo.png"
                alt="Annam Hospital Logo"
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.</p>
              <div className="text-xs text-gray-800 mt-0.5 flex flex-col items-center justify-center">
                <span className="font-bold">Cell: 8681850592, 8681950592</span>
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
            <div className="text-center mt-2 pb-1 border-b border-gray-600">
              <h2 className="text-base font-bold uppercase inline-block px-3 pb-0.5 text-blue-900 tracking-wider">
                PAYMENT TRANSACTIONS
              </h2>
            </div>
          </div>

          <div className="text-center mb-2">
            <p className="text-xs text-gray-600">Bill Number: {billing.bill_number} | Patient: {billing.patient.name}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Payment Type</th>
                <th>Reference</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {billing.payment_receipts.map((p, idx) => (
                <tr key={p.id}>
                  <td>{idx + 1}</td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>{(p.payment_type || '').replace('_', ' ').toUpperCase()}</td>
                  <td>{p.reference_number || '-'}</td>
                  <td className="text-right">{formatCurrency(p.amount)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={4} className="text-right">TOTAL PAID:</td>
                <td className="text-right">{formatCurrency(billing.summary.paid_total)}</td>
              </tr>
              <tr className="font-bold">
                <td colSpan={4} className="text-right">PENDING AMOUNT:</td>
                <td className="text-right">{formatCurrency(billing.summary.pending_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(printContent, document.body);
}
