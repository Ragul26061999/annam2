'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BillingRecord } from '../../lib/financeService';

interface BillingReceiptPrintProps {
  record: BillingRecord;
  onClose?: () => void;
}

export function BillingReceiptPrint({ record, onClose }: BillingReceiptPrintProps) {
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
      <div style={{ marginBottom: '20px' }}>
        {/* Logo */}
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
           <img 
             src="/images/logo.png" 
             alt="Annam Hospital Logo" 
             style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
           />
        </div>
        
        {/* Hospital Name and Address */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px', margin: '4px 0' }}>
            Annam Multispeciality Hospital
          </h1>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginTop: '4px' }}>
            2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.
          </p>
          <div style={{ fontSize: '14px', color: '#374151', marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>Cell: 8681850592, 8681950592</span>
            <span>Email: annammultispecialityhospital@gmail.com</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '12px', paddingBottom: '8px', borderBottom: '1px solid #4b5563' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', display: 'inline-block', padding: '0 16px 4px', color: '#1e40af', letterSpacing: '1px' }}>
            BILLING RECEIPT
          </h2>
        </div>
      </div>

      {/* Patient and Bill Information */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '32px', fontSize: '14px', fontWeight: '500', paddingTop: '16px' }}>
          {/* Left Column */}
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', width: '120px', flexShrink: 0 }}>Patient Name :</span>
              <span style={{ flex: 1, textTransform: 'uppercase', borderBottom: '1px dotted #9ca3af', paddingBottom: '4px' }}>
                {record.patient?.name || '________________'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', width: '120px', flexShrink: 0 }}>Patient ID :</span>
              <span style={{ flex: 1, textTransform: 'uppercase', borderBottom: '1px dotted #9ca3af', paddingBottom: '4px' }}>
                {record.patient?.patient_id || '________________'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', width: '120px', flexShrink: 0 }}>Phone :</span>
              <span style={{ flex: 1, borderBottom: '1px dotted #9ca3af', paddingBottom: '4px' }}>
                {record.patient?.phone || '________________'}
              </span>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', width: '120px', flexShrink: 0 }}>Bill Number :</span>
              <span style={{ flex: 1, borderBottom: '1px dotted #9ca3af', paddingBottom: '4px' }}>
                {record.bill_id || '________________'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', width: '120px', flexShrink: 0 }}>Bill Date :</span>
              <span style={{ flex: 1, borderBottom: '1px dotted #9ca3af', paddingBottom: '4px' }}>
                {formatDate(record.bill_date)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 'bold', width: '120px', flexShrink: 0 }}>Payment Mode :</span>
              <span style={{ flex: 1, borderBottom: '1px dotted #9ca3af', paddingBottom: '4px' }}>
                {record.payment_method || '________________'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Details */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', textAlign: 'center' }}>Billing Details</h3>
        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>S.No</th>
              <th>Description</th>
              <th style={{ width: '120px' }} className="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>1</td>
              <td>{record.source.charAt(0).toUpperCase() + record.source.slice(1).replace('_', ' ')} Services</td>
              <td className="text-right">{formatCurrency(record.subtotal)}</td>
            </tr>
            {record.tax_amount > 0 && (
              <tr>
                <td style={{ textAlign: 'center' }}>2</td>
                <td>Tax Amount</td>
                <td className="text-right">{formatCurrency(record.tax_amount)}</td>
              </tr>
            )}
            {record.discount_amount > 0 && (
              <tr>
                <td style={{ textAlign: 'center' }}>{record.tax_amount > 0 ? '3' : '2'}</td>
                <td>Discount Amount</td>
                <td className="text-right">-{formatCurrency(record.discount_amount)}</td>
              </tr>
            )}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
              <td colSpan={2} style={{ textAlign: 'right', paddingRight: '16px' }}>Total Amount:</td>
              <td className="text-right">{formatCurrency(record.total_amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Information */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', textAlign: 'center' }}>Payment Information</h3>
        <table>
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Particulars</th>
              <th style={{ width: '120px' }} className="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td className="text-right">{formatCurrency(record.subtotal)}</td>
            </tr>
            {record.tax_amount > 0 && (
              <tr>
                <td>Tax Amount</td>
                <td className="text-right">{formatCurrency(record.tax_amount)}</td>
              </tr>
            )}
            {record.discount_amount > 0 && (
              <tr>
                <td>Discount Amount</td>
                <td className="text-right">-{formatCurrency(record.discount_amount)}</td>
              </tr>
            )}
            <tr style={{ fontWeight: 'bold' }}>
              <td>Total Amount</td>
              <td className="text-right">{formatCurrency(record.total_amount)}</td>
            </tr>
            <tr>
              <td>Payment Status</td>
              <td className="text-right" style={{ textTransform: 'capitalize' }}>
                {record.payment_status}
              </td>
            </tr>
            {record.payment_date && (
              <tr>
                <td>Payment Date</td>
                <td className="text-right">{formatDate(record.payment_date)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Amount in Words */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', textAlign: 'center' }}>Amount in Words</h3>
        <div style={{ 
          padding: '12px', 
          border: '1px solid #d1d5db', 
          borderRadius: '4px',
          backgroundColor: '#f9fafb',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {amountInWords(record.total_amount)}
        </div>
      </div>

      {/* Payment Status */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>
          Payment Status: {record.payment_status}
        </p>
      </div>

      {/* Signatures */}
      <div style={{ marginTop: '60px' }}>
        <table>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center', width: '50%' }}>
                <p style={{ borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px' }}></p>
                <p style={{ fontWeight: 'bold' }}>Patient Signature</p>
              </td>
              <td style={{ textAlign: 'center', width: '50%' }}>
                <p style={{ borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px' }}></p>
                <p style={{ fontWeight: 'bold' }}>Authorized Signatory</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return createPortal(
    printContent,
    document.body
  );
}
