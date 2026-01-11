import React, { useState, useEffect } from 'react';
import { Loader2, Printer, DollarSign } from 'lucide-react';
import { 
  getIPComprehensiveBilling, 
  saveIPBilling,
  saveIPPrescribedMedicines,
  IPComprehensiveBilling,
  IPPrescribedMedicine
} from '../../lib/ipBillingService';
import IPBillingMedicinesEditor from './IPBillingMedicinesEditor';
import IPBillingLabEditor from './IPBillingLabEditor';
import IPPaymentReceiptModal from './IPPaymentReceiptModal';
import { IPBillingMultiPagePrint } from './IPBillingMultiPagePrint';

interface IPBillingViewProps {
  bedAllocationId: string;
  patient: any;
  bedAllocation: any;
}

export default function IPBillingView({ bedAllocationId, patient, bedAllocation }: IPBillingViewProps) {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<IPComprehensiveBilling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [bedAllocationId]);

  const loadBillingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const billingData = await getIPComprehensiveBilling(bedAllocationId);
      setBilling(billingData);
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError('Failed to load billing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBilling = async (updatedBilling: IPComprehensiveBilling) => {
    try {
      await saveIPBilling(bedAllocationId, updatedBilling);
      setBilling(updatedBilling);
    } catch (err) {
      console.error('Failed to save billing:', err);
      throw err;
    }
  };

  const handleSaveMedicines = async (medicines: IPPrescribedMedicine[]) => {
    if (!billing) return;
    try {
      await saveIPPrescribedMedicines(
        bedAllocationId,
        billing.patient.id,
        medicines
      );
      await loadBillingData();
    } catch (err) {
      console.error('Failed to save medicines:', err);
      throw err;
    }
  };

  const handleSaveLabTests = async (updatedLabOrders: any[]) => {
    if (!billing) return;
    try {
      // Update billing with new lab data
      const updatedBilling = {
        ...billing,
        lab_billing: updatedLabOrders,
        summary: {
          ...billing.summary,
          lab_total: updatedLabOrders.reduce((sum: number, order: any) => 
            sum + order.tests.reduce((orderSum: number, test: any) => orderSum + test.test_cost, 0), 0
          )
        }
      };
      
      // Recalculate gross total
      updatedBilling.summary.gross_total = 
        updatedBilling.summary.bed_charges_total +
        updatedBilling.summary.doctor_consultation_total +
        updatedBilling.summary.doctor_services_total +
        updatedBilling.summary.prescribed_medicines_total +
        updatedBilling.summary.pharmacy_total +
        updatedBilling.summary.lab_total +
        updatedBilling.summary.radiology_total +
        updatedBilling.summary.other_charges_total;

      // Recalculate net payable
      updatedBilling.summary.net_payable = 
        updatedBilling.summary.gross_total - 
        updatedBilling.summary.advance_paid - 
        updatedBilling.summary.discount;

      // Just update local state - lab data is already in database
      setBilling(updatedBilling);
    } catch (err) {
      console.error('Failed to save lab tests:', err);
      throw err;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-3 text-gray-600">Loading billing details...</span>
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'No billing data available'}</p>
          <button
            onClick={loadBillingData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6 print:hidden p-6">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">IP Billing</h1>
              <p className="text-blue-100 mt-2">
                Patient: {billing.patient.name} | IP#: {billing.admission.ip_number}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-md"
              >
                <DollarSign className="h-5 w-5" />
                Receive Payment
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold shadow-md"
              >
                <Printer className="h-5 w-5" />
                Print Bill
              </button>
            </div>
          </div>
        </div>

        {/* Patient & Admission Info */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Patient Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Patient Name</p>
              <p className="text-lg font-bold text-gray-900">{billing.patient.name}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">IP Number</p>
              <p className="text-lg font-bold text-gray-900">{billing.admission.ip_number}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Admission Date</p>
              <p className="text-lg font-bold text-gray-900">{new Date(billing.admission.admission_date).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Days</p>
              <p className="text-lg font-bold text-gray-900">{billing.admission.total_days} days</p>
            </div>
          </div>
        </div>

        {/* Bed Charges */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Bed Charges</h2>
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.bed_charges_total)}</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Bed Type</p>
                <p className="font-semibold text-gray-900">{billing.bed_charges.bed_type}</p>
              </div>
              <div>
                <p className="text-gray-600">Daily Rate</p>
                <p className="font-semibold text-gray-900">{formatCurrency(billing.bed_charges.daily_rate)}/day</p>
              </div>
              <div>
                <p className="text-gray-600">Days</p>
                <p className="font-semibold text-gray-900">{billing.bed_charges.days} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Consultation */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Doctor Consultation</h2>
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.doctor_consultation_total)}</span>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Doctor Name</p>
                <p className="font-semibold text-gray-900">{billing.doctor_consultation.doctor_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Consultation Fee</p>
                <p className="font-semibold text-gray-900">{formatCurrency(billing.doctor_consultation.consultation_fee)}/day</p>
              </div>
              <div>
                <p className="text-gray-600">Days</p>
                <p className="font-semibold text-gray-900">{billing.doctor_consultation.days} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Services */}
        {billing.doctor_services.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Doctor Services</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.doctor_services_total)}</span>
            </div>
            <div className="space-y-2">
              {billing.doctor_services.map((service, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{service.doctor_name}</p>
                    <p className="text-sm text-gray-600">{service.service_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(service.total_amount)}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(service.fee)} × {service.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prescribed Medicines */}
        <IPBillingMedicinesEditor
          medicines={billing.prescribed_medicines}
          onSave={handleSaveMedicines}
          isEditable={true}
        />

        {/* Pharmacy Bills */}
        {billing.pharmacy_billing.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Pharmacy Bills</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.pharmacy_total)}</span>
            </div>
            {billing.pharmacy_billing.map((pb, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-2 p-3 bg-purple-50 rounded-t-lg">
                  <h3 className="font-semibold text-gray-900">Bill #{pb.bill_number}</h3>
                  <span className="text-sm text-gray-600">{new Date(pb.bill_date).toLocaleDateString()}</span>
                </div>
                <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Medicine</th>
                        <th className="px-4 py-2 text-center">Qty</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pb.items.map((item, itemIdx) => (
                        <tr key={itemIdx} className="border-t">
                          <td className="px-4 py-2">{item.medicine_name}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={3} className="px-4 py-2 text-right">Bill Total:</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(pb.total_amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Laboratory Tests */}
        <IPBillingLabEditor
          labOrders={billing.lab_billing}
          onSave={handleSaveLabTests}
          isEditable={true}
        />

        {/* Radiology/X-Ray */}
        {billing.radiology_billing.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Radiology / X-Ray</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.radiology_total)}</span>
            </div>
            {billing.radiology_billing.map((rb, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-2 p-3 bg-indigo-50 rounded-t-lg">
                  <h3 className="font-semibold text-gray-900">Order #{rb.order_number}</h3>
                  <span className="text-sm text-gray-600">{new Date(rb.order_date).toLocaleDateString()}</span>
                </div>
                <div className="border border-gray-200 rounded-b-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Scan Name</th>
                        <th className="px-4 py-2 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rb.scans.map((scan, scanIdx) => (
                        <tr key={scanIdx} className="border-t">
                          <td className="px-4 py-2">{scan.scan_name}</td>
                          <td className="px-4 py-2 text-right font-semibold">{formatCurrency(scan.scan_cost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-2 text-right">Order Total:</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(rb.scans.reduce((sum, scan) => sum + scan.scan_cost, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other Charges */}
        {billing.other_charges.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Other Charges</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.other_charges_total)}</span>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Service</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.other_charges.map((charge, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{charge.service_name}</td>
                      <td className="px-4 py-2 text-center">{charge.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(charge.rate)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(charge.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Billing Summary - Final Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing Summary</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Gross Total</span>
              <span className="font-semibold text-gray-900">{formatCurrency(billing.summary.gross_total)}</span>
            </div>

            <div className="flex justify-between text-lg">
              <span className="text-gray-700">Total Paid</span>
              <span className="font-semibold text-green-700">{formatCurrency(billing.summary.paid_total)}</span>
            </div>
            
            {billing.summary.discount > 0 && (
              <div className="flex justify-between text-lg">
                <span className="text-gray-700">Discount</span>
                <span className="font-semibold text-green-600">- {formatCurrency(billing.summary.discount)}</span>
              </div>
            )}
            
            <div className="border-t-2 border-blue-300 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">Pending Amount</span>
                <span className="text-3xl font-bold text-blue-600">{formatCurrency(billing.summary.pending_amount)}</span>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Payment Status: </span>
                <span className={`font-bold ${
                  billing.status === 'paid' ? 'text-green-600' :
                  billing.status === 'partial' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {billing.status.toUpperCase()}
                </span>
              </p>
            </div>

            {billing.payment_receipts.length > 0 && (
              <div className="mt-4 bg-white rounded-lg border border-blue-200 overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
                  <h3 className="font-bold text-gray-900">Payment Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Ref</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.payment_receipts.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-4 py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2 capitalize">{p.payment_type.replace('_', ' ')}</td>
                          <td className="px-4 py-2">{p.reference_number || '-'}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Page Print Template */}
      <IPBillingMultiPagePrint billing={billing} />

      {/* Payment Receipt Modal */}
      <IPPaymentReceiptModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        bedAllocationId={bedAllocationId}
        patientId={billing.patient.id}
        patientName={billing.patient.name}
        totalAmount={billing.summary.gross_total}
        pendingAmount={billing.summary.pending_amount}
        onPaymentSuccess={loadBillingData}
      />
    </>
  );
}
