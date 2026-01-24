'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, FileText, Download, Users, BedDouble, Stethoscope, Activity, Heart, Brain, Eye, Scissors, Pill, TestTube, Camera } from 'lucide-react';
import Link from 'next/link';
import { 
  getIPComprehensiveBilling, 
  IPComprehensiveBilling
} from '../../../../src/lib/ipBillingService';
import { IPBreakdownBillPrint } from '../../../../src/components/ip-clinical/IPBreakdownBillPrint';

interface DepartmentSummary {
  name: string;
  icon: React.ElementType;
  charges: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  color: string;
}

export default function BreakdownBillPage() {
  const params = useParams();
  const router = useRouter();
  const bedAllocationId = params?.id as string;
  const [billing, setBilling] = useState<IPComprehensiveBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bedAllocationId) {
      loadBillingData();
    }
  }, [bedAllocationId]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const billingData = await getIPComprehensiveBilling(bedAllocationId);
      setBilling(billingData);
    } catch (err) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getDepartmentBreakdown = (): DepartmentSummary[] => {
    if (!billing) return [];

    const departments: DepartmentSummary[] = [];

    // Room/Bed Charges
    if (billing.summary.bed_charges_total > 0) {
      departments.push({
        name: 'Room & Board',
        icon: BedDouble,
        charges: billing.summary.bed_charges_total,
        items: [
          {
            description: `${billing.bed_charges.bed_type} Room`,
            quantity: billing.bed_charges.days,
            unitPrice: billing.bed_charges.daily_rate,
            total: billing.summary.bed_charges_total
          }
        ],
        color: 'blue'
      });
    }

    // Doctor Consultation
    if (billing.summary.doctor_consultation_total > 0) {
      departments.push({
        name: 'Doctor Consultation',
        icon: Stethoscope,
        charges: billing.summary.doctor_consultation_total,
        items: [
          {
            description: `Dr. ${billing.doctor_consultation.doctor_name} - Daily Consultation`,
            quantity: billing.doctor_consultation.days,
            unitPrice: billing.doctor_consultation.consultation_fee,
            total: billing.summary.doctor_consultation_total
          }
        ],
        color: 'green'
      });
    }

    // Doctor Services - Group duplicate services with improved formatting
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
        icon: Users,
        charges: billing.summary.doctor_services_total,
        items: serviceItems,
        color: 'purple'
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
        icon: Pill,
        charges: billing.summary.pharmacy_total,
        items: Object.values(groupedMedicines),
        color: 'pink'
      });
    }

    // Laboratory - Group duplicate tests with simplified format
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
        icon: TestTube,
        charges: billing.summary.lab_total,
        items: Object.values(groupedTests),
        color: 'yellow'
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
        icon: Camera,
        charges: billing.summary.radiology_total,
        items: Object.values(groupedScans),
        color: 'indigo'
      });
    }

    // Other Charges
    if (billing.summary.other_charges_total > 0) {
      departments.push({
        name: 'Other Services',
        icon: Activity,
        charges: billing.summary.other_charges_total,
        items: [
          {
            description: 'Miscellaneous Charges',
            quantity: 1,
            unitPrice: billing.summary.other_charges_total,
            total: billing.summary.other_charges_total
          }
        ],
        color: 'gray'
      });
    }

    return departments;
  };

  const getTotalCharges = () => {
    return getDepartmentBreakdown().reduce((sum, dept) => sum + dept.charges, 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDoc = () => {
    if (!billing) return;

    // Create the content for the document
    const docContent = generateDocumentContent();
    
    // Create a blob with the content
    const blob = new Blob([docContent], { type: 'application/msword' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Breakdown-Bill-${billing.admission?.ip_number || 'Unknown'}.doc`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateDocumentContent = () => {
    if (!billing) return '';

    const departments = getDepartmentBreakdown();
    
    let content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Department-wise Bill Breakdown</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .hospital-name { font-size: 18px; font-weight: bold; }
        .address { font-size: 12px; margin-bottom: 10px; }
        .title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; }
        .patient-info { margin-bottom: 20px; }
        .patient-row { display: flex; margin-bottom: 5px; }
        .patient-label { width: 150px; font-weight: bold; }
        .department { margin-bottom: 20px; page-break-inside: avoid; }
        .dept-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
        .dept-total { text-align: right; font-weight: bold; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #000; padding: 5px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .summary { margin-top: 30px; border: 2px solid #000; padding: 15px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .summary-total { font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="hospital-name">ANNAM MULTISPECIALITY HOSPITAL</div>
        <div class="address">
            2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk,<br>
            Thoothukudi - 628 216.<br>
            Cell: 8681850592, 8681950592 | Email: annammultispecialityhospital@gmail.com
        </div>
        <div class="title">DEPARTMENT-WISE BILL BREAKDOWN</div>
    </div>

    <div class="patient-info">
        <div class="patient-row">
            <span class="patient-label">Name:</span>
            <span>${billing.patient?.name || 'N/A'}</span>
            <span class="patient-label" style="margin-left: 50px;">Age & Sex:</span>
            <span>${billing.patient?.age || 'N/A'} Yrs / ${billing.patient?.gender || 'N/A'}</span>
        </div>
        <div class="patient-row">
            <span class="patient-label">Address:</span>
            <span>${billing.patient?.address || 'N/A'}</span>
        </div>
        <div class="patient-row">
            <span class="patient-label">O.P. No.:</span>
            <span>${billing.patient?.patient_id || 'N/A'}</span>
            <span class="patient-label" style="margin-left: 50px;">I.P. No.:</span>
            <span>${billing.admission?.ip_number || 'N/A'}</span>
        </div>
        <div class="patient-row">
            <span class="patient-label">Date of Admission:</span>
            <span>${new Date(billing.admission?.admission_date || '').toLocaleDateString('en-GB')}</span>
            <span class="patient-label" style="margin-left: 50px;">Date of Discharge:</span>
            <span>${new Date(billing.admission?.discharge_date || '').toLocaleDateString('en-GB')}</span>
        </div>
        <div class="patient-row">
            <span class="patient-label">Room/Bed:</span>
            <span>${billing.admission?.room_number || 'N/A'} / ${billing.admission?.bed_number || 'N/A'}</span>
            <span class="patient-label" style="margin-left: 50px;">Bill No.:</span>
            <span>BREAKDOWN-${billing.admission?.ip_number || 'N/A'}</span>
        </div>
    </div>
`;

    // Add departments
    departments.forEach((department) => {
      content += `
    <div class="department">
        <div class="dept-title">${department.name}</div>
        <div style="text-align: center; margin-bottom: 10px;">${department.items.length} items</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">S.No</th>
                    <th>${
                      department.name === 'Professional Services' ? 'Service Category' : 
                      department.name === 'Pharmacy' ? 'Medicine Name' :
                      department.name === 'Laboratory' ? 'Test Name' :
                      department.name === 'Radiology & Imaging' ? 'Scan Name' : 'Description'
                    }</th>
                    ${department.name === 'Professional Services' ? '<th>Doctors</th>' : ''}
                    <th style="width: 60px;" class="text-center">${
                      department.name === 'Room & Board' ? 'Days' : 'Qty'
                    }</th>
                    <th style="width: 100px;" class="text-right">Unit Price</th>
                    <th style="width: 100px;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
`;

      department.items.forEach((item, index) => {
        content += `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.description}</td>
                    ${department.name === 'Professional Services' ? `<td>${(item as any).doctors?.join(', ') || '-'}</td>` : ''}
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                    <td class="text-right">${formatCurrency(item.total)}</td>
                </tr>
`;
      });

      content += `
            </tbody>
        </table>
        <div class="dept-total">Department Total: ${formatCurrency(department.charges)}</div>
    </div>
`;
    });

    // Add summary
    const totalCharges = billing.summary.bed_charges_total + billing.summary.doctor_consultation_total + 
                        billing.summary.doctor_services_total + billing.summary.pharmacy_total + 
                        billing.summary.lab_total + billing.summary.radiology_total + 
                        billing.summary.other_charges_total;

    content += `
    <div class="summary">
        <div style="text-align: center; font-weight: bold; margin-bottom: 15px;">Final Summary</div>
        <div class="summary-row">
            <span>Total Charges:</span>
            <span>${formatCurrency(totalCharges)}</span>
        </div>
        <div class="summary-row">
            <span>Advance Paid:</span>
            <span>${formatCurrency(billing.summary.advance_paid)}</span>
        </div>
        <div class="summary-row">
            <span>Discount:</span>
            <span>${formatCurrency(billing.summary.discount)}</span>
        </div>
        <div class="summary-row summary-total">
            <span>Net Payable:</span>
            <span>${formatCurrency(billing.summary.net_payable)}</span>
        </div>
    </div>
</body>
</html>`;

    return content;
  };

  if (!bedAllocationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Request</h2>
          <p className="text-gray-600 mb-4">No bed allocation ID provided</p>
          <Link href="/inpatient">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Back to Inpatient
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading breakdown bill...</p>
        </div>
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'No billing data available'}</p>
          <button
            onClick={loadBillingData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-3"
          >
            Retry
          </button>
          <Link href="/inpatient">
            <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
              Back to Inpatient
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const departments = getDepartmentBreakdown();
  const totalCharges = getTotalCharges();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/inpatient">
                <button className="p-2 bg-white text-gray-600 hover:text-gray-900 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Department-wise Bill Breakdown</h1>
                <p className="text-sm text-gray-600">
                  Patient: {billing.patient.name} | IP#: {billing.admission.ip_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDoc}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download DOC
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Patient Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Patient Name</p>
              <p className="text-lg font-semibold text-gray-900">{billing.patient.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">IP Number</p>
              <p className="text-lg font-semibold text-gray-900">{billing.admission.ip_number}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Admission Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(billing.admission.admission_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Days</p>
              <p className="text-lg font-semibold text-gray-900">{billing.admission.total_days} days</p>
            </div>
          </div>
        </div>

        {/* Overall Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Bill Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Total Departments</p>
              <p className="text-2xl font-bold">{departments.length}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Total Charges</p>
              <p className="text-2xl font-bold">{formatCurrency(totalCharges)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-blue-100 text-sm">Net Payable</p>
              <p className="text-2xl font-bold">{formatCurrency(billing.summary.net_payable)}</p>
            </div>
          </div>
        </div>

        {/* Department-wise Breakdown */}
        <div className="space-y-6">
          {departments.map((department, index) => {
            const Icon = department.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Department Header */}
                <div className={`bg-${department.color}-50 border-b border-${department.color}-100 p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${department.color}-100 rounded-lg`}>
                        <Icon className={`h-6 w-6 text-${department.color}-600`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                        <p className="text-sm text-gray-600">{department.items.length} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Department Total</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(department.charges)}</p>
                    </div>
                  </div>
                </div>

                {/* Department Items */}
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-700 w-12">S.No</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-700">
                            {department.name === 'Professional Services' ? 'Service Category' : 
                             department.name === 'Pharmacy' ? 'Medicine Name' :
                             department.name === 'Laboratory' ? 'Test Name' :
                             department.name === 'Radiology & Imaging' ? 'Scan Name' : 'Description'}
                          </th>
                          {department.name === 'Professional Services' && (
                            <th className="text-left py-2 px-2 font-medium text-gray-700">Doctors</th>
                          )}
                          <th className="text-center py-2 px-2 font-medium text-gray-700">
                            {department.name === 'Room & Board' ? 'Days' : 'Qty'}
                          </th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Unit Price</th>
                          <th className="text-right py-2 px-2 font-medium text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {department.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-b border-gray-100">
                            <td className="py-3 px-2 text-gray-900">{itemIndex + 1}</td>
                            <td className="py-3 px-2 text-gray-900">{item.description}</td>
                            {department.name === 'Professional Services' && (
                              <td className="py-3 px-2 text-gray-900 text-xs">
                                {(item as any).doctors?.join(', ') || '-'}
                              </td>
                            )}
                            <td className="py-3 px-2 text-center text-gray-900">{item.quantity}</td>
                            <td className="py-3 px-2 text-right text-gray-900">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 px-2 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Final Summary */}
        <div className="bg-gray-50 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Charges:</span>
              <span className="font-medium">{formatCurrency(totalCharges)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Advance Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(billing.summary.advance_paid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium text-orange-600">{formatCurrency(billing.summary.discount)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Net Payable:</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(billing.summary.net_payable)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Breakdown Bill Print Template */}
      {billing && <IPBreakdownBillPrint billing={billing} />}
    </div>
  );
}
