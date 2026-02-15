import React from 'react';
import { createPortal } from 'react-dom';
import { IPComprehensiveBilling } from '../../lib/ipBillingService';

interface IPBillingPrintTemplateProps {
  billing: IPComprehensiveBilling;
}

export const IPBillingPrintTemplate = React.forwardRef<HTMLDivElement, IPBillingPrintTemplateProps>(
  ({ billing }, ref) => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString('en-IN');
    };

    const formatCurrency = (amount: number) => {
      return amount.toFixed(0);
    };

    const numberToWords = (num: number): string => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

      if (num === 0) return 'Zero Rupees only';

      const convertLessThanThousand = (n: number): string => {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
      };

      const crore = Math.floor(num / 10000000);
      const lakh = Math.floor((num % 10000000) / 100000);
      const thousand = Math.floor((num % 100000) / 1000);
      const remainder = Math.floor(num % 1000);

      let result = '';
      if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
      if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
      if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
      if (remainder > 0) result += convertLessThanThousand(remainder);

      return result.trim() + ' Rupees only';
    };

    return createPortal(
      <div ref={ref} className="bg-white text-black print-template hidden print:block print-portal-root">
        <style jsx global>{`
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white;
              height: auto;
              overflow: visible;
            }
            
            body > * {
              display: none !important;
            }

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
              font-size: 10pt;
              line-height: 1.4;
              color: black;
              background: white;
              z-index: 9999;
              visibility: visible;
            }

            #root, #modal-root {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 15mm;
            }

            .section-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            .force-break {
              break-before: page;
              page-break-before: always;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th, td {
              border: 1px solid #333;
              padding: 6px 8px;
              text-align: left;
            }

            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
          }
        `}</style>

        {/* Header Block */}
        <div className="section-break mb-4">
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="h-24 w-full flex items-center justify-center mb-2">
              <img 
                src="/images/logo.png" 
                alt="Annam Hospital Logo" 
                className="h-full w-auto object-contain"
              />
            </div>
            
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-800">2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk,</p>
              <p className="text-xs font-semibold text-gray-800">Thoothukudi - 628 216.</p>
              <div className="text-xs text-gray-800 mt-1">
                <span className="font-bold">Cell: 8681850592, 8681950592</span>
                <span className="mx-2">|</span>
                <span>Email: annammultispecialityhospital@gmail.com</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-3 pb-2 border-b-2 border-gray-800">
            <h2 className="text-base font-bold uppercase inline-block px-4 pb-1 text-blue-900 tracking-wider">
              IP BILL
            </h2>
          </div>
        </div>

        {/* Patient Information & Bill Details */}
        <div className="section-break mb-4">
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Left Column - Patient Information */}
            <div className="border border-gray-800 p-3">
              <h3 className="font-bold mb-2 text-sm">Patient Information</h3>
              <div className="space-y-1">
                <div className="flex">
                  <span className="font-bold w-24">IP No</span>
                  <span>: {billing.admission.ip_number}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-24">UH ID</span>
                  <span>: {billing.patient.patient_id}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-24">Patient Name</span>
                  <span>: {billing.patient.name}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-24">Age/Gender</span>
                  <span>: {billing.patient.age} / {billing.patient.gender}</span>
                </div>
              </div>
            </div>

            {/* Right Column - Bill Details */}
            <div className="border border-gray-800 p-3">
              <h3 className="font-bold mb-2 text-sm">Bill Details</h3>
              <div className="space-y-1">
                <div className="flex">
                  <span className="font-bold w-32">Bill No</span>
                  <span>: {billing.bill_number}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-32">Bill Date</span>
                  <span>: {formatDate(billing.bill_date)}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-32">Doctor Name</span>
                  <span>: {billing.doctor_consultation.doctor_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admission Details */}
        <div className="section-break mb-4">
          <div className="border border-gray-800 p-3 text-xs">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex">
                <span className="font-bold">Admission Date:</span>
                <span className="ml-2">{formatDate(billing.admission.admission_date)}</span>
              </div>
              <div className="flex">
                <span className="font-bold">Discharge Date:</span>
                <span className="ml-2">{formatDate(billing.admission.discharge_date)}</span>
              </div>
              <div className="flex">
                <span className="font-bold">Total Days:</span>
                <span className="ml-2">{billing.admission.total_days}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Details Table */}
        <div className="section-break mb-4">
          <h3 className="font-bold text-sm mb-2">Service Details</h3>
          <table className="text-xs">
            <thead>
              <tr>
                <th className="w-12">S.No</th>
                <th>Service Name</th>
                <th className="w-24 text-center">Fees</th>
                <th className="w-24 text-center">No/Hrs/Days</th>
                <th className="w-28 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Bed Charges */}
              <tr>
                <td>1</td>
                <td className="font-semibold">{billing.bed_charges.bed_type}</td>
                <td className="text-center">{formatCurrency(billing.bed_charges.daily_rate)}</td>
                <td className="text-center">{billing.bed_charges.days}</td>
                <td className="text-right">{formatCurrency(billing.bed_charges.total_amount)}</td>
              </tr>

              {/* Doctor Consultation */}
              <tr>
                <td>2</td>
                <td className="font-semibold">Doctor Consultation - {billing.doctor_consultation.doctor_name}</td>
                <td className="text-center">{formatCurrency(billing.doctor_consultation.consultation_fee)}</td>
                <td className="text-center">{billing.doctor_consultation.days}</td>
                <td className="text-right">{formatCurrency(billing.doctor_consultation.total_amount)}</td>
              </tr>

              {/* Individual Doctor Services */}
              {billing.doctor_services.map((service, index) => (
                <tr key={index}>
                  <td>{3 + index}</td>
                  <td className="font-semibold">{service.doctor_name} - {service.service_type}</td>
                  <td className="text-center">{formatCurrency(service.fee)}</td>
                  <td className="text-center">{service.quantity}</td>
                  <td className="text-right">{formatCurrency(service.total_amount)}</td>
                </tr>
              ))}

              {/* Prescribed Medicines */}
              {billing.prescribed_medicines.length > 0 && (
                <>
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="font-bold text-sm py-2">PRESCRIBED MEDICINES</td>
                  </tr>
                  {billing.prescribed_medicines.map((medicine, index) => (
                    <tr key={index}>
                      <td>{3 + billing.doctor_services.length + index}</td>
                      <td>
                        <div className="font-semibold">{medicine.medicine_name}</div>
                        <div className="text-[9px] text-gray-600 ml-2">
                          {medicine.generic_name && <div>Generic: {medicine.generic_name}</div>}
                          <div>Dosage: {medicine.dosage} | Frequency: {medicine.frequency} | Duration: {medicine.duration}</div>
                        </div>
                      </td>
                      <td className="text-center">{formatCurrency(medicine.unit_price)}</td>
                      <td className="text-center">{medicine.quantity}</td>
                      <td className="text-right">{formatCurrency(medicine.total_price)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Pharmacy Billing */}
              {billing.pharmacy_billing.length > 0 && (
                <tr>
                  <td>{3 + billing.doctor_services.length + billing.prescribed_medicines.length}</td>
                  <td className="font-semibold">
                    Pharmacy Bill
                    {billing.pharmacy_billing.map((pb, idx) => (
                      <div key={idx} className="text-[9px] text-gray-600 ml-2">
                        • {pb.bill_number} ({formatDate(pb.bill_date)})
                      </div>
                    ))}
                  </td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                  <td className="text-right">{formatCurrency(billing.summary.pharmacy_total)}</td>
                </tr>
              )}

              {/* Lab Billing */}
              {billing.lab_billing.length > 0 && (
                <tr>
                  <td>{3 + billing.doctor_services.length + billing.prescribed_medicines.length + (billing.pharmacy_billing.length > 0 ? 1 : 0)}</td>
                  <td className="font-semibold">
                    Laboratory Tests
                    {billing.lab_billing.map((lb, idx) => (
                      <div key={idx} className="text-[9px] text-gray-600 ml-2">
                        {lb.tests.map((test, tidx) => (
                          <div key={tidx}>• {test.test_name}</div>
                        ))}
                      </div>
                    ))}
                  </td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                  <td className="text-right">{formatCurrency(billing.summary.lab_total)}</td>
                </tr>
              )}

              {/* Radiology Billing */}
              {billing.radiology_billing.length > 0 && (
                <tr>
                  <td>{3 + billing.doctor_services.length + billing.prescribed_medicines.length + (billing.pharmacy_billing.length > 0 ? 1 : 0) + (billing.lab_billing.length > 0 ? 1 : 0)}</td>
                  <td className="font-semibold">
                    Radiology/X-Ray
                    {billing.radiology_billing.map((rb, idx) => (
                      <div key={idx} className="text-[9px] text-gray-600 ml-2">
                        {rb.scans.map((scan, sidx) => (
                          <div key={sidx}>• {scan.scan_name}</div>
                        ))}
                      </div>
                    ))}
                  </td>
                  <td className="text-center">-</td>
                  <td className="text-center">-</td>
                  <td className="text-right">{formatCurrency(billing.summary.radiology_total)}</td>
                </tr>
              )}

              {/* Other Charges */}
              {billing.other_charges.map((charge, idx) => (
                <tr key={idx}>
                  <td>{3 + billing.doctor_services.length + billing.prescribed_medicines.length + (billing.pharmacy_billing.length > 0 ? 1 : 0) + (billing.lab_billing.length > 0 ? 1 : 0) + (billing.radiology_billing.length > 0 ? 1 : 0) + idx}</td>
                  <td>{charge.service_name}</td>
                  <td className="text-center">{formatCurrency(charge.rate)}</td>
                  <td className="text-center">{charge.quantity}</td>
                  <td className="text-right">{formatCurrency(charge.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="section-break mb-4">
          <div className="border-t-2 border-gray-800 pt-2">
            <div className="flex justify-end">
              <div className="w-80 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-300">
                  <span className="font-bold">Total Bill :</span>
                  <span className="font-bold">{formatCurrency(billing.summary.gross_total)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-300">
                  <span>Advance :</span>
                  <span>{formatCurrency(billing.summary.advance_paid)}</span>
                </div>
                {billing.summary.discount > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-300">
                    <span>Concession Amount :</span>
                    <span>{formatCurrency(billing.summary.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b-2 border-gray-800">
                  <span className="font-bold text-sm">Bill Amount :</span>
                  <span className="font-bold text-sm">{formatCurrency(billing.summary.net_payable)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="section-break mb-6">
          <div className="text-xs">
            <span className="font-bold">Total Amount {numberToWords(Math.floor(billing.summary.net_payable))}</span>
          </div>
        </div>

        {/* Payment Status Stamp */}
        <div className="section-break mb-8 flex justify-center">
          <div className="text-center">
            <div className="inline-block border-4 border-gray-800 px-8 py-3 transform -rotate-12">
              <span className="text-2xl font-bold uppercase tracking-wider">
                {billing.status === 'paid' ? 'CASH PAID' : billing.status === 'partial' ? 'PARTIAL PAID' : 'PENDING'}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="section-break mt-12">
          <div className="flex justify-between text-xs">
            <div className="text-center">
              <div className="h-16"></div>
              <div className="border-t-2 border-gray-800 pt-1 w-40">
                <p className="font-bold">Patient Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="h-16"></div>
              <div className="border-t-2 border-gray-800 pt-1 w-40">
                <p className="font-bold">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>

      </div>,
      document.body
    );
  }
);

IPBillingPrintTemplate.displayName = 'IPBillingPrintTemplate';
