'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { IPComprehensiveBilling } from '../../lib/ipBillingService';

interface IPBreakdownBillPrintProps {
  billing: IPComprehensiveBilling;
}

export function IPBreakdownBillPrint({ billing }: IPBreakdownBillPrintProps) {
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

  const getDepartmentBreakdown = () => {
    if (!billing) return [];

    const departments = [];

    // Room/Bed Charges
    if (billing.summary.bed_charges_total > 0) {
      departments.push({
        name: 'Room & Board',
        charges: billing.summary.bed_charges_total,
        items: [
          {
            description: `${billing.bed_charges.bed_type} Room`,
            quantity: billing.bed_charges.days,
            unitPrice: billing.bed_charges.daily_rate,
            total: billing.summary.bed_charges_total
          }
        ]
      });
    }

    // Doctor Consultation
    if (billing.summary.doctor_consultation_total > 0) {
      departments.push({
        name: 'Doctor Consultation',
        charges: billing.summary.doctor_consultation_total,
        items: [
          {
            description: `Dr. ${billing.doctor_consultation.doctor_name} - Daily Consultation`,
            quantity: billing.doctor_consultation.days,
            unitPrice: billing.doctor_consultation.consultation_fee,
            total: billing.summary.doctor_consultation_total
          }
        ]
      });
    }

    // Doctor Services - Group duplicate services
    if (billing.summary.doctor_services_total > 0 && billing.doctor_services.length > 0) {
      const groupedServices = billing.doctor_services.reduce((acc: any, service: any) => {
        const key = service.service_type;
        if (acc[key]) {
          acc[key].quantity += service.quantity;
          acc[key].total += service.total_amount;
          acc[key].doctors.push(service.doctor_name);
        } else {
          acc[key] = {
            description: service.service_type,
            quantity: service.quantity,
            unitPrice: service.fee,
            total: service.total_amount,
            doctors: [service.doctor_name]
          };
        }
        return acc;
      }, {});

      const serviceItems = Object.values(groupedServices).map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        doctors: item.doctors
      }));

      departments.push({
        name: 'Professional Services',
        charges: billing.summary.doctor_services_total,
        items: serviceItems
      });
    }

    // Pharmacy - Group duplicate medicines
    if (billing.summary.pharmacy_total > 0 && billing.pharmacy_billing.length > 0) {
      const pharmacyItems = billing.pharmacy_billing.flatMap((pb: any) => 
        (pb.items || []).map((item: any) => ({
          description: item.medicine_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total
        }))
      );

      // Group duplicate medicines
      const groupedMedicines = pharmacyItems.reduce((acc: any, item: any) => {
        const key = item.description;
        if (acc[key]) {
          acc[key].quantity += item.quantity;
          acc[key].total += item.total;
        } else {
          acc[key] = { ...item };
        }
        return acc;
      }, {});
      
      departments.push({
        name: 'Pharmacy',
        charges: billing.summary.pharmacy_total,
        items: Object.values(groupedMedicines)
      });
    }

    // Laboratory - Group duplicate tests
    if (billing.summary.lab_total > 0 && billing.lab_billing.length > 0) {
      const labItems = billing.lab_billing.flatMap((order: any) =>
        (order.tests || []).map((test: any) => ({
          description: test.test_name,
          quantity: 1,
          unitPrice: test.test_cost,
          total: test.test_cost
        }))
      );

      // Group duplicate tests
      const groupedTests = labItems.reduce((acc: any, test: any) => {
        const key = test.description;
        if (acc[key]) {
          acc[key].quantity += test.quantity;
          acc[key].total += test.total;
        } else {
          acc[key] = { ...test };
        }
        return acc;
      }, {});
      
      departments.push({
        name: 'Laboratory',
        charges: billing.summary.lab_total,
        items: Object.values(groupedTests)
      });
    }

    // Radiology - Group duplicate scans
    if (billing.summary.radiology_total > 0 && billing.radiology_billing.length > 0) {
      const radiologyItems = billing.radiology_billing.flatMap((rb: any) =>
        (rb.scans || []).map((scan: any) => ({
          description: scan.scan_name,
          quantity: 1,
          unitPrice: scan.scan_cost,
          total: scan.scan_cost
        }))
      );

      // Group duplicate scans
      const groupedScans = radiologyItems.reduce((acc: any, scan: any) => {
        const key = scan.description;
        if (acc[key]) {
          acc[key].quantity += scan.quantity;
          acc[key].total += scan.total;
        } else {
          acc[key] = { ...scan };
        }
        return acc;
      }, {});
      
      departments.push({
        name: 'Radiology & Imaging',
        charges: billing.summary.radiology_total,
        items: Object.values(groupedScans)
      });
    }

    // Other Charges
    if (billing.summary.other_charges_total > 0) {
      departments.push({
        name: 'Other Services',
        charges: billing.summary.other_charges_total,
        items: [
          {
            description: 'Miscellaneous Charges',
            quantity: 1,
            unitPrice: billing.summary.other_charges_total,
            total: billing.summary.other_charges_total
          }
        ]
      });
    }

    return departments;
  };

  const departments = getDepartmentBreakdown();

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
        }
      `}</style>

      <div className="p-6">
        {/* Header Block - Matching Regular Billing Style */}
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
              DEPARTMENT-WISE BILL BREAKDOWN
            </h2>
          </div>
        </div>

        {/* Patient Identification - Matching Regular Billing Format */}
        <div className="section-break mb-8">
          <div className="flex gap-8 text-sm font-medium pt-4">
            {/* Left Column */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="flex items-baseline">
                <span className="font-bold w-24 shrink-0">Name :</span>
                <span className="flex-1 uppercase border-b border-dotted border-gray-400 pb-1">{billing.patient?.name || ''}</span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-24 shrink-0 mt-1">Address :</span>
                <span className="flex-1 min-h-[48px] whitespace-pre-wrap border-b border-dotted border-gray-400 pb-1">{billing.patient?.address || ''}</span>
              </div>
              <div className="flex items-baseline mt-auto">
                <span className="font-bold w-24 shrink-0">Bill No. :</span>
                <span className="flex-1 uppercase font-bold border-b border-dotted border-gray-400 pb-1">BREAKDOWN-{billing.admission?.ip_number || 'N/A'}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-1/2 flex flex-col gap-3">
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Age & Sex :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">
                  {billing.patient?.age || '__'} Yrs / {billing.patient?.gender || '__'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-baseline flex-1">
                    <span className="font-bold w-20 shrink-0">O.P. No.</span>
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{billing.patient?.patient_id || ''}</span>
                 </div>
                 <div className="flex items-baseline flex-1 ml-4">
                    <span className="font-bold w-16 shrink-0 text-right pr-2">I.P. No.</span>
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{billing.admission?.ip_number || ''}</span>
                 </div>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Date of Admission :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(billing.admission?.admission_date)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Date of Discharge :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{formatDate(billing.admission?.discharge_date)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-36 shrink-0">Room/Bed :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 pb-1">{billing.admission?.room_number || 'N/A'} / {billing.admission?.bed_number || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Department-wise Breakdown */}
        {departments.map((department, deptIndex) => (
          <div key={deptIndex} className="department-section">
            <div className="department-header">
              {department.name}
            </div>
            
            <div className="text-center" style={{marginBottom: '10px'}}>
              {department.items.length} items
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th style={{width: '50'}}>S.No</th>
                  <th>
                    {department.name === 'Professional Services' ? 'Service Category' : 
                     department.name === 'Pharmacy' ? 'Medicine Name' :
                     department.name === 'Laboratory' ? 'Test Name' :
                     department.name === 'Radiology & Imaging' ? 'Scan Name' : 'Description'}
                  </th>
                  {department.name === 'Professional Services' && (
                    <th style={{width: '150'}}>Doctors</th>
                  )}
                  <th style={{width: '60'}} className="text-center">
                    {department.name === 'Room & Board' ? 'Days' : 'Qty'}
                  </th>
                  <th style={{width: '100'}} className="text-right">Unit Price</th>
                  <th style={{width: '100'}} className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {department.items.map((item: any, itemIndex) => (
                  <tr key={itemIndex}>
                    <td className="text-center">{itemIndex + 1}</td>
                    <td>{item.description}</td>
                    {department.name === 'Professional Services' && (
                      <td className="text-xs">{item.doctors?.join(', ') || '-'}</td>
                    )}
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="department-total text-right">
              Department Total: {formatCurrency(department.charges)}
            </div>
          </div>
        ))}

        {/* Final Summary */}
        <div className="final-summary">
          <div className="print-title" style={{marginBottom: '15px'}}>Final Summary</div>
          
          <div className="final-summary-row">
            <span>Total Charges:</span>
            <span>{formatCurrency(billing.summary.bed_charges_total + billing.summary.doctor_consultation_total + billing.summary.doctor_services_total + billing.summary.pharmacy_total + billing.summary.lab_total + billing.summary.radiology_total + billing.summary.other_charges_total)}</span>
          </div>
          
          <div className="final-summary-row">
            <span>Advance Paid:</span>
            <span>{formatCurrency(billing.summary.advance_paid)}</span>
          </div>
          
          <div className="final-summary-row">
            <span>Discount:</span>
            <span>{formatCurrency(billing.summary.discount)}</span>
          </div>
          
          <div className="final-summary-row final-summary-total">
            <span>Net Payable:</span>
            <span>{formatCurrency(billing.summary.net_payable)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(printContent, document.body);
}
