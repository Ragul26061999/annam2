'use client';

import React from 'react';
import { type OtherBillWithPatient, CHARGE_CATEGORIES } from '../lib/otherBillsService';

interface OtherBillPrintTemplateProps {
  bill: OtherBillWithPatient;
}

export default function OtherBillPrintTemplate({ bill }: OtherBillPrintTemplateProps) {
  const getCategoryLabel = (category: string) => {
    const cat = CHARGE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const items = (bill.items && bill.items.length > 0)
    ? bill.items
    : [
        {
          charge_category: bill.charge_category,
          charge_description: bill.charge_description,
          quantity: bill.quantity,
          unit_price: bill.unit_price,
          discount_percent: bill.discount_percent,
          tax_percent: bill.tax_percent,
        },
      ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="print-template bg-white p-8 max-w-4xl mx-auto">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-template,
          .print-template * {
            visibility: visible;
          }
          .print-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="border-2 border-gray-800 p-6">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">ANNAM HOSPITAL</h1>
          <p className="text-sm text-gray-600 mt-1">
            123 Hospital Road, Medical District, City - 600001
          </p>
          <p className="text-sm text-gray-600">
            Phone: +91 9876543210 | Email: info@annamhospital.com
          </p>
          <div className="mt-3">
            <h2 className="text-xl font-bold text-gray-900">OTHER CHARGES BILL</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="font-semibold py-1">Bill Number:</td>
                  <td className="py-1">{bill.bill_number}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1">Bill Date:</td>
                  <td className="py-1">{formatDate(bill.bill_date)}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1">Bill Time:</td>
                  <td className="py-1">{formatTime(bill.bill_date)}</td>
                </tr>
                {bill.reference_number && (
                  <tr>
                    <td className="font-semibold py-1">Reference No:</td>
                    <td className="py-1">{bill.reference_number}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="font-semibold py-1">Patient Name:</td>
                  <td className="py-1">{bill.patient_name}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1">Patient Type:</td>
                  <td className="py-1">{bill.patient_type}</td>
                </tr>
                {bill.patient_phone && (
                  <tr>
                    <td className="font-semibold py-1">Phone:</td>
                    <td className="py-1">{bill.patient_phone}</td>
                  </tr>
                )}
                {bill.patient?.patient_id && (
                  <tr>
                    <td className="font-semibold py-1">Patient ID:</td>
                    <td className="py-1">{bill.patient.patient_id}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6">
          <table className="w-full border border-gray-800">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-4 py-2 text-left text-sm font-bold">
                  Charge Category
                </th>
                <th className="border border-gray-800 px-4 py-2 text-left text-sm font-bold">
                  Description
                </th>
                <th className="border border-gray-800 px-4 py-2 text-right text-sm font-bold">
                  Qty
                </th>
                <th className="border border-gray-800 px-4 py-2 text-right text-sm font-bold">
                  Rate
                </th>
                <th className="border border-gray-800 px-4 py-2 text-right text-sm font-bold">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-800 px-4 py-2 text-sm">
                    {getCategoryLabel(item.charge_category)}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-sm">
                    {item.charge_description}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-right text-sm">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-right text-sm">
                    ₹{(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-right text-sm font-semibold">
                    ₹{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-6">
          <div className="w-1/2">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 px-4 text-right font-semibold">Subtotal:</td>
                  <td className="py-1 px-4 text-right">
                    ₹{bill.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {bill.discount_amount > 0 && (
                  <tr>
                    <td className="py-1 px-4 text-right font-semibold">
                      Discount ({bill.discount_percent}%):
                    </td>
                    <td className="py-1 px-4 text-right text-red-600">
                      -₹{bill.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {bill.tax_amount > 0 && (
                  <tr>
                    <td className="py-1 px-4 text-right font-semibold">
                      Tax ({bill.tax_percent}%):
                    </td>
                    <td className="py-1 px-4 text-right">
                      ₹{bill.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                <tr className="border-t-2 border-gray-800">
                  <td className="py-2 px-4 text-right font-bold text-lg">Total Amount:</td>
                  <td className="py-2 px-4 text-right font-bold text-lg">
                    ₹{bill.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {bill.paid_amount > 0 && (
                  <>
                    <tr>
                      <td className="py-1 px-4 text-right font-semibold text-green-600">
                        Paid Amount:
                      </td>
                      <td className="py-1 px-4 text-right text-green-600">
                        ₹{bill.paid_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-400">
                      <td className="py-1 px-4 text-right font-bold text-orange-600">
                        Balance Due:
                      </td>
                      <td className="py-1 px-4 text-right font-bold text-orange-600">
                        ₹{bill.balance_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {bill.remarks && (
          <div className="mb-6 border-t border-gray-400 pt-4">
            <p className="text-sm font-semibold mb-1">Remarks:</p>
            <p className="text-sm text-gray-700">{bill.remarks}</p>
          </div>
        )}

        <div className="border-t-2 border-gray-800 pt-4 mt-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-2">Payment Status:</p>
              <p className="text-sm font-semibold uppercase">
                {bill.payment_status}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 mb-2">Authorized Signature</p>
              <div className="border-t border-gray-800 w-48 ml-auto mt-8"></div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>This is a computer-generated bill and does not require a signature.</p>
          <p className="mt-1">For any queries, please contact the billing department.</p>
        </div>
      </div>
    </div>
  );
}
