import { supabase } from './supabase';
import { generateSequentialBillNumber } from './billNumberGenerator';

// =====================================================
// INTERFACES AND TYPES
// =====================================================

export interface IPBillingItem {
  service_name: string;
  rate: number;
  quantity: number;
  days?: number;
  amount: number;
}

export interface IPPrescribedMedicine {
  id?: string;
  prescription_id: string;
  prescription_item_id: string;
  medicine_name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status?: string;
  notes?: string;
}

export interface IPDoctorConsultation {
  doctor_name: string;
  consultation_fee: number;
  days: number;
  total_amount: number;
}

export interface IPDoctorService {
  doctor_name: string;
  service_type: string;
  fee: number;
  quantity: number;
  total_amount: number;
}

export interface IPBedCharges {
  bed_type: string;
  daily_rate: number;
  days: number;
  total_amount: number;
}

export interface IPPharmacyBilling {
  bill_number: string;
  bill_date: string;
  items: Array<{
    medicine_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  total_amount: number;
}

export interface IPLabBilling {
  order_number: string;
  order_date: string;
  tests: Array<{
    test_name: string;
    test_cost: number;
  }>;
  total_amount: number;
}

export interface IPRadiologyBilling {
  order_number: string;
  order_date: string;
  scans: Array<{
    scan_name: string;
    scan_cost: number;
  }>;
  total_amount: number;
}

export interface IPPaymentReceipt {
  id: string;
  payment_type: string;
  amount: number;
  reference_number?: string | null;
  notes?: string | null;
  payment_date: string;
  created_at: string;
}

export interface IPComprehensiveBilling {
  // Patient & Admission Info
  patient: {
    id: string;
    patient_id: string;
    name: string;
    age: number;
    gender: string;
    phone?: string;
    address?: string;
  };
  
  admission: {
    ip_number: string;
    admission_date: string;
    discharge_date: string;
    total_days: number;
    bed_number?: string;
    room_number?: string;
    department?: string;
  };
  
  // Billing Details
  bed_charges: IPBedCharges;
  doctor_consultation: IPDoctorConsultation;
  doctor_services: IPDoctorService[];
  prescribed_medicines: IPPrescribedMedicine[];
  pharmacy_billing: IPPharmacyBilling[];
  lab_billing: IPLabBilling[];
  radiology_billing: IPRadiologyBilling[];
  other_charges: IPBillingItem[];
  other_bills: any[];

  // Payments
  payment_receipts: IPPaymentReceipt[];
  
  // Summary
  summary: {
    bed_charges_total: number;
    doctor_consultation_total: number;
    doctor_services_total: number;
    prescribed_medicines_total: number;
    pharmacy_total: number;
    lab_total: number;
    radiology_total: number;
    other_charges_total: number;
    other_bills_total: number;
    other_bills_paid_total: number;
    gross_total: number;
    // Legacy advance amount (from bed_allocation), kept for display
    advance_paid: number;
    // Total payments received so far (advance_paid + receipts sum)
    paid_total: number;
    discount: number;
    net_payable: number;
    pending_amount: number;
  };
  
  // Bill Info
  bill_number: string;
  bill_date: string;
  status: 'pending' | 'partial' | 'paid';
}

// =====================================================
// BILLING FUNCTIONS
// =====================================================

/**
 * Calculate days between two dates (minimum 1 day)
 */
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Generate IP Bill Number
 * Format: IPB{YY}{Sequential}
 */
export async function generateIPBillNumber(): Promise<string> {
  const now = new Date();
  const yearShort = now.getFullYear().toString().slice(-2);
  const prefix = `IPB${yearShort}`;

  try {
    const { count, error } = await supabase
      .from('billing')
      .select('id', { count: 'exact', head: true })
      .like('bill_number', `${prefix}%`);

    if (error) {
      console.error('Error getting bill count:', error);
      throw new Error('Failed to generate bill number');
    }

    const sequence = ((count || 0) + 1).toString().padStart(5, '0');
    return `${prefix}${sequence}`;
  } catch (error) {
    console.error('Error generating IP bill number:', error);
    throw error;
  }
}

/**
 * Get comprehensive IP billing for a bed allocation
 */
export async function getIPComprehensiveBilling(
  bedAllocationId: string
): Promise<IPComprehensiveBilling> {
  try {
    // 1. Get bed allocation with patient details
    const { data: allocation, error: allocError } = await supabase
      .from('bed_allocations')
      .select(`
        *,
        patient:patients(*),
        bed:beds(*)
      `)
      .eq('id', bedAllocationId)
      .single();

    if (allocError || !allocation) {
      throw new Error('Bed allocation not found');
    }

    const patient = Array.isArray(allocation.patient) 
      ? allocation.patient[0] 
      : allocation.patient;
    
    const bed = Array.isArray(allocation.bed) 
      ? allocation.bed[0] 
      : allocation.bed;

    const admissionDate = allocation.admission_date;
    const dischargeDate = allocation.discharge_date || new Date().toISOString();
    const totalDays = calculateDays(admissionDate, dischargeDate);

    const admissionDateOnly = String(admissionDate).split('T')[0];
    const dischargeDateOnly = String(dischargeDate).split('T')[0];

    // Optional overrides from discharge_summaries. This can fail with 400 if
    // columns/migrations are not applied yet; in that case, we just ignore.
    let dischargeSummary: any = null;
    try {
      const { data: ds, error: dsError } = await supabase
        .from('discharge_summaries')
        .select('bed_days, bed_daily_rate, bed_total, doctor_consultation_days, doctor_consultation_fee, doctor_consultation_total')
        .eq('allocation_id', bedAllocationId)
        .maybeSingle();

      if (!dsError) dischargeSummary = ds;
    } catch (e) {
      dischargeSummary = null;
    }

    // 2. Get doctor consultation details
    const { data: doctor } = await supabase
      .from('doctors')
      .select('user:users(name), consultation_fee')
      .eq('id', allocation.doctor_id)
      .single();

    const doctorName = doctor?.user?.[0]?.name || 'Consulting Doctor';
    const defaultConsultationFee = doctor?.consultation_fee || 500;
    const doctorConsultDays = Number(dischargeSummary?.doctor_consultation_days ?? totalDays);
    const consultationFee = Number(dischargeSummary?.doctor_consultation_fee ?? defaultConsultationFee);
    const doctorConsultationTotal = Number(dischargeSummary?.doctor_consultation_total ?? (consultationFee * doctorConsultDays));

    // 3. Get bed charges
    const defaultBedDailyRate = bed?.daily_rate || 1000;
    const bedDays = Number(dischargeSummary?.bed_days ?? totalDays);
    const bedDailyRate = Number(dischargeSummary?.bed_daily_rate ?? defaultBedDailyRate);
    const bedChargesTotal = Number(dischargeSummary?.bed_total ?? (bedDailyRate * bedDays));

    // 4. Get pharmacy billing
    // NOTE: Some DBs define bill_date as DATE (not timestamptz). Using date-only strings avoids 400.
    // Also, embedding items requires FK relationships; if not present PostgREST returns 400.
    const { data: pharmacyBills, error: pharmacyError } = await supabase
      .from('pharmacy_bills')
      .select('bill_number, bill_date, total_amount')
      .eq('patient_id', patient.id)
      .gte('bill_date', admissionDateOnly)
      .lte('bill_date', dischargeDateOnly);

    const pharmacyBilling: IPPharmacyBilling[] = (pharmacyError ? [] : (pharmacyBills || [])).map((bill: any) => ({
      bill_number: bill.bill_number,
      bill_date: bill.bill_date,
      items: [],
      total_amount: Number(bill.total_amount || 0)
    }));

    const pharmacyTotal = pharmacyBilling.reduce((sum, bill) => sum + bill.total_amount, 0);

    // 4.5. Get prescribed medicines for IP billing from existing prescriptions
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select(`
        *,
        items:prescription_items(
          *,
          medication:medications(name, generic_name, selling_price)
        )
      `)
      .eq('patient_id', patient.id)
      .gte('created_at', admissionDate)
      .lte('created_at', dischargeDate);

    let prescribedMedicines: IPPrescribedMedicine[] = [];

    if (prescriptions && prescriptions.length > 0) {
      prescribedMedicines = prescriptions.flatMap((prescription: any) =>
        (prescription.items || []).map((item: any) => ({
          prescription_id: prescription.id,
          prescription_item_id: item.id,
          medicine_name: item.medication?.name || 'Unknown Medicine',
          generic_name: item.medication?.generic_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          unit_price: item.unit_price || item.medication?.selling_price || 0,
          total_price: (item.quantity || 0) * (item.unit_price || item.medication?.selling_price || 0),
          status: item.status || 'pending',
          notes: item.instructions
        }))
      );
    }

    const prescribedMedicinesTotal = prescribedMedicines.reduce((sum, med) => sum + med.total_price, 0);

    // 5. Get lab billing
    const { data: labOrders } = await supabase
      .from('lab_test_orders')
      .select(`
        *,
        lab_test_catalog(test_name, test_cost)
      `)
      .eq('patient_id', patient.id)
      .gte('created_at', admissionDate)
      .lte('created_at', dischargeDate);

    const labBilling: IPLabBilling[] = (labOrders || []).map((order: any) => ({
      order_number: order.order_number,
      order_date: order.created_at,
      tests: [{
        test_name: order.lab_test_catalog?.test_name || 'Lab Test',
        test_cost: Number(order.lab_test_catalog?.test_cost) || 0
      }],
      total_amount: Number(order.lab_test_catalog?.test_cost) || 0
    }));

    const labTotal = labBilling.reduce((sum, bill) => sum + bill.total_amount, 0);

    // 6. Get radiology billing
    const { data: radioOrders } = await supabase
      .from('radiology_test_orders')
      .select(`
        *,
        radiology_test_catalog(test_name, test_cost)
      `)
      .eq('patient_id', patient.id)
      .gte('created_at', admissionDate)
      .lte('created_at', dischargeDate);

    const radiologyBilling: IPRadiologyBilling[] = (radioOrders || []).map((order: any) => ({
      order_number: order.order_number,
      order_date: order.created_at,
      scans: [{
        scan_name: order.radiology_test_catalog?.test_name || 'Radiology Scan',
        scan_cost: Number(order.radiology_test_catalog?.test_cost) || 0
      }],
      total_amount: Number(order.radiology_test_catalog?.test_cost) || 0
    }));

    const radiologyTotal = radiologyBilling.reduce((sum, bill) => sum + bill.total_amount, 0);

    // 6.5. Get payment receipts (supports partial/multiple-day payments)
    const { data: paymentReceipts } = await supabase
      .from('ip_payment_receipts')
      .select('id, payment_type, amount, reference_number, notes, payment_date, created_at')
      .eq('bed_allocation_id', bedAllocationId)
      .order('payment_date', { ascending: true });

    const payment_receipts: IPPaymentReceipt[] = (paymentReceipts || []).map((p: any) => ({
      id: p.id,
      payment_type: p.payment_type,
      amount: Number(p.amount || 0),
      reference_number: p.reference_number,
      notes: p.notes,
      payment_date: p.payment_date,
      created_at: p.created_at
    }));

    // 7. Get individual doctor services
    const doctorServices: IPDoctorService[] = [];
    
    // Get doctor orders/procedures during IP stay
    const { data: doctorOrders, error: doctorOrdersError } = await supabase
      .from('ip_doctor_orders')
      .select('*')
      .eq('bed_allocation_id', bedAllocationId)
      .gte('created_at', admissionDate)
      .lte('created_at', dischargeDate);

    if (!doctorOrdersError && doctorOrders && doctorOrders.length > 0) {
      // Group by doctor and calculate totals
      const doctorMap = new Map<string, { name: string; services: any[] }>();
      
      doctorOrders.forEach((order: any) => {
        const doctorName = 'Unknown Doctor';
        if (!doctorMap.has(doctorName)) {
          doctorMap.set(doctorName, { name: doctorName, services: [] });
        }
        doctorMap.get(doctorName)!.services.push(order);
      });

      // Create doctor service entries
      doctorMap.forEach((doctorData, doctorName) => {
        const totalServices = doctorData.services.length;
        const serviceFee = 500; // Default service fee, can be customized
        
        doctorServices.push({
          doctor_name: doctorName,
          service_type: 'Professional Services',
          fee: serviceFee,
          quantity: totalServices,
          total_amount: serviceFee * totalServices
        });
      });
    }

    // 7.1 Additional doctor consultations entered in IP billing
    const { data: additionalConsultations } = await supabase
      .from('ip_doctor_consultations')
      .select('total_amount')
      .eq('bed_allocation_id', bedAllocationId);

    const additionalConsultationsTotal = (additionalConsultations || []).reduce(
      (sum: number, c: any) => sum + Number(c.total_amount || 0),
      0
    );

    // 8. Get other charges (from billing_items if exists)
    let otherItems: any[] = [];
    try {
      // In this DB, billing_item uses ref_id to link to IP stay / other references.
      const { data: oi, error: oiError } = await supabase
        .from('billing_item')
        .select('*')
        .eq('ref_id', bedAllocationId);
      if (!oiError) otherItems = oi || [];
    } catch (e) {
      otherItems = [];
    }

    // 9. Get Other Bills for this patient during IP stay
    const { data: otherBills } = await supabase
      .from('other_bills')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('status', 'active')
      .gte('created_at', admissionDate)
      .lte('created_at', dischargeDate);

    const otherCharges: IPBillingItem[] = [
      ...(otherItems || []).map((item: any) => ({
        service_name: item.description,
        rate: item.unit_amount,
        quantity: item.qty,
        amount: item.total_amount
      })),
      ...(otherBills || []).map((bill: any) => ({
        service_name: `${bill.charge_category}: ${bill.charge_description}`,
        rate: Number(bill.unit_price),
        quantity: Number(bill.quantity),
        amount: Number(bill.total_amount)
      }))
    ];

    const otherChargesTotal = otherCharges.reduce((sum, item) => sum + item.amount, 0);
    const otherBillsTotal = (otherBills || []).reduce(
      (sum: number, bill: any) => sum + Number(bill.total_amount),
      0
    );

    // 8. Calculate summary
    const doctorServicesTotal =
      doctorServices.reduce((sum, service) => sum + service.total_amount, 0) + additionalConsultationsTotal;
    const grossTotal = 
      bedChargesTotal + 
      doctorConsultationTotal + 
      doctorServicesTotal +
      prescribedMedicinesTotal +
      pharmacyTotal + 
      labTotal + 
      radiologyTotal + 
      otherChargesTotal + 
      otherBillsTotal;

    // Calculate paid amounts from Other Bills
    const otherBillsPaidTotal = (otherBills || []).reduce(
      (sum: number, bill: any) => sum + Number(bill.paid_amount || 0),
      0
    );
    
    const advancePaid = allocation.advance_amount || 0;
    const discount = 0; // Can be fetched from discharge_summaries if needed
    const receiptsTotal = payment_receipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const paidTotal = advancePaid + receiptsTotal + otherBillsPaidTotal;
    const netPayable = grossTotal - advancePaid - discount;
    const pendingAmount = Math.max(0, grossTotal - discount - paidTotal);

    // 9. Generate bill number
    const billNumber = await generateIPBillNumber();

    return {
      patient: {
        id: patient.id,
        patient_id: patient.patient_id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address
      },
      admission: {
        ip_number: allocation.ip_number,
        admission_date: admissionDate,
        discharge_date: dischargeDate,
        total_days: totalDays,
        bed_number: bed?.bed_number,
        room_number: bed?.room_number,
        department: bed?.department_ward
      },
      bed_charges: {
        bed_type: bed?.bed_type || 'General Ward',
        daily_rate: bedDailyRate,
        days: bedDays,
        total_amount: bedChargesTotal
      },
      doctor_consultation: {
        doctor_name: doctorName,
        consultation_fee: consultationFee,
        days: doctorConsultDays,
        total_amount: doctorConsultationTotal
      },
      doctor_services: doctorServices,
      prescribed_medicines: prescribedMedicines,
      pharmacy_billing: pharmacyBilling,
      lab_billing: labBilling,
      radiology_billing: radiologyBilling,
      other_charges: otherCharges,
      other_bills: otherBills || [],
      payment_receipts,
      summary: {
        bed_charges_total: bedChargesTotal,
        doctor_consultation_total: doctorConsultationTotal,
        doctor_services_total: doctorServicesTotal,
        prescribed_medicines_total: prescribedMedicinesTotal,
        pharmacy_total: pharmacyTotal,
        lab_total: labTotal,
        radiology_total: radiologyTotal,
        other_charges_total: otherChargesTotal,
        other_bills_total: otherBillsTotal,
        other_bills_paid_total: otherBillsPaidTotal,
        gross_total: grossTotal,
        advance_paid: advancePaid,
        paid_total: paidTotal,
        discount: discount,
        net_payable: netPayable,
        pending_amount: pendingAmount
      },
      bill_number: billNumber,
      bill_date: new Date().toISOString(),
      status: pendingAmount <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'pending'
    };
  } catch (error) {
    console.error('Error fetching IP comprehensive billing:', error);
    throw error;
  }
}

/**
 * Save prescribed medicines to existing prescription_items table
 */
export async function saveIPPrescribedMedicines(
  bedAllocationId: string,
  patientId: string,
  medicines: IPPrescribedMedicine[],
  userId?: string
): Promise<void> {
  try {
    // Update existing prescription_items with billing information
    for (const medicine of medicines) {
      if (medicine.prescription_item_id) {
        // Update existing prescription item
        const { error } = await supabase
          .from('prescription_items')
          .update({
            unit_price: medicine.unit_price,
            quantity: medicine.quantity,
            instructions: medicine.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', medicine.prescription_item_id);

        if (error) {
          console.error('Error updating prescription item:', error);
          throw new Error('Failed to update prescription item');
        }
      }
    }
  } catch (error) {
    console.error('Error in saveIPPrescribedMedicines:', error);
    throw error;
  }
}

/**
 * Save IP billing data to discharge_summaries table
 */
export async function saveIPBilling(
  bedAllocationId: string,
  billingData: IPComprehensiveBilling
): Promise<void> {
  try {
    // Compute paid/pending from receipts to support multi-day partial payments
    const { data: paymentReceipts } = await supabase
      .from('ip_payment_receipts')
      .select('amount')
      .eq('bed_allocation_id', bedAllocationId);

    const receiptsTotal = (paymentReceipts || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );
    const paidAmount =
      (billingData.summary.advance_paid || 0) +
      receiptsTotal +
      (billingData.summary.other_bills_paid_total || 0);
    const pendingAmount = Math.max(
      0,
      (billingData.summary.gross_total || 0) - (billingData.summary.discount || 0) - paidAmount
    );

    // Align the discharge_summaries.other_amount to reflect the comprehensive billing breakdown.
    // discharge_summaries has only a single catch-all "other_amount" column.
    const otherAmount =
      (billingData.summary.doctor_consultation_total || 0) +
      (billingData.summary.doctor_services_total || 0) +
      (billingData.summary.prescribed_medicines_total || 0) +
      (billingData.summary.other_charges_total || 0) +
      (billingData.summary.other_bills_total || 0);

    // Avoid upsert(onConflict) here because PostgREST returns 400 if the unique constraint
    // doesn't exist in the deployed DB (common when migrations drift).
    const dischargeDateOnly = String(billingData.admission.discharge_date || new Date().toISOString()).split('T')[0];
    const admissionDateOnly = String(billingData.admission.admission_date || new Date().toISOString()).split('T')[0];

    const dischargePayload: any = {
      allocation_id: bedAllocationId,
      patient_id: billingData.patient.id,
      discharge_date: dischargeDateOnly,
      admission_date: admissionDateOnly,
      bed_days: billingData.bed_charges.days,
      bed_daily_rate: billingData.bed_charges.daily_rate,
      bed_total: billingData.summary.bed_charges_total,
      doctor_consultation_days: billingData.doctor_consultation.days,
      doctor_consultation_fee: billingData.doctor_consultation.consultation_fee,
      doctor_consultation_total: billingData.doctor_consultation.total_amount,
      pharmacy_amount: billingData.summary.pharmacy_total,
      lab_amount: billingData.summary.lab_total,
      procedure_amount: billingData.summary.radiology_total,
      other_amount: otherAmount,
      gross_amount: billingData.summary.gross_total,
      discount_amount: billingData.summary.discount,
      net_amount: billingData.summary.net_payable,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
    };

    const { data: existingSummary, error: existingSummaryError } = await supabase
      .from('discharge_summaries')
      .select('id')
      .eq('allocation_id', bedAllocationId)
      .maybeSingle();

    let dischargeError: any = null;
    if (!existingSummaryError && existingSummary?.id) {
      const { error: updErr } = await supabase
        .from('discharge_summaries')
        .update(dischargePayload)
        .eq('id', existingSummary.id);
      dischargeError = updErr;
    } else {
      const { error: insErr } = await supabase
        .from('discharge_summaries')
        .insert(dischargePayload);
      dischargeError = insErr;
    }

    if (dischargeError) {
      console.error('Error saving IP billing:', dischargeError);
      throw dischargeError;
    }
  } catch (error) {
    console.error('Error in saveIPBilling:', error);
    throw error;
  }
}
