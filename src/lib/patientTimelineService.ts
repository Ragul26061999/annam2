import { supabase } from './supabase';
import { getPatientMedicationHistory } from './pharmacyService';

export type PatientTimelineEventType =
  | 'registration'
  | 'appointment'
  | 'ip_admission'
  | 'ip_discharge'
  | 'vitals'
  | 'medical_history'
  | 'lab'
  | 'radiology'
  | 'xray'
  | 'scan'
  | 'billing'
  | 'billing_payment'
  | 'ip_payment'
  | 'other_bill'
  | 'other_bill_payment'
  | 'pharmacy_bill'
  | 'medication'
  | 'case_sheet'
  | 'progress_note'
  | 'doctor_order'
  | 'nurse_record'
  | 'discharge_summary';

export type PatientTimelineEvent = {
  id: string;
  type: PatientTimelineEventType;
  title: string;
  subtitle?: string;
  date: string;
  amount?: number;
  status?: string;
  reference?: string;
  link?: string;
  bedAllocationId?: string;
  content?: string;
};

function asIsoOrEmpty(d: any): string {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString();
  } catch {
    return '';
  }
}

function sortDesc(a: PatientTimelineEvent, b: PatientTimelineEvent) {
  const at = a.date ? new Date(a.date).getTime() : 0;
  const bt = b.date ? new Date(b.date).getTime() : 0;
  return bt - at;
}

export async function getPatientCompleteHistory(params: {
  patientUuid: string;
  patientUhid: string;
  patientCreatedAt?: string;
  appointments?: any[];
  bedAllocations?: any[];
  vitals?: any[];
  medicalHistory?: any[];
  labOrders?: any[];
  radiologyOrders?: any[];
  xrayOrders?: any[];
  scanOrders?: any[];
  includeClinicalRecords?: boolean;
}): Promise<PatientTimelineEvent[]> {
  const events: PatientTimelineEvent[] = [];

  if (params.patientUuid) {
    events.push({
      id: `registration_${params.patientUuid}`,
      type: 'registration',
      title: 'Patient Registered',
      date: asIsoOrEmpty(params.patientCreatedAt),
    });
  }

  (params.appointments || []).forEach((a: any, idx: number) => {
    const dateStr = a?.appointment_date
      ? `${a.appointment_date}T${a.appointment_time || '00:00:00'}`
      : a?.created_at;

    events.push({
      id: `appointment_${a?.id || idx}`,
      type: 'appointment',
      title: a?.type ? `OP: ${String(a.type)}` : 'OP Appointment',
      subtitle: a?.status ? `Status: ${String(a.status)}` : undefined,
      date: asIsoOrEmpty(dateStr),
      link: a?.id ? `/appointments/${a.id}` : undefined,
    });
  });

  (params.bedAllocations || []).forEach((ba: any, idx: number) => {
    const ipLabel = ba?.ip_number ? `IP ${ba.ip_number}` : 'IP Admission';

    events.push({
      id: `ip_admission_${ba?.id || idx}`,
      type: 'ip_admission',
      title: ipLabel,
      subtitle: ba?.bed?.room_number
        ? `Room ${ba.bed.room_number} • Bed ${ba.bed?.bed_number || 'N/A'}`
        : undefined,
      date: asIsoOrEmpty(ba?.admission_date),
      status: ba?.status || undefined,
      link: ba?.id ? `/patients/${params.patientUhid}?tab=clinical-records&allocation=${ba.id}` : undefined,
    });

    if (ba?.discharge_date) {
      events.push({
        id: `ip_discharge_${ba?.id || idx}`,
        type: 'ip_discharge',
        title: `${ipLabel} Discharged`,
        subtitle: ba?.discharge_reason ? `Reason: ${String(ba.discharge_reason)}` : undefined,
        date: asIsoOrEmpty(ba.discharge_date),
        status: 'discharged',
        link: ba?.id ? `/patients/${params.patientUhid}?tab=clinical-records&allocation=${ba.id}` : undefined,
      });
    }
  });

  (params.vitals || []).forEach((v: any) => {
    events.push({
      id: `vitals_${v?.id}`,
      type: 'vitals',
      title: 'Vitals Recorded',
      subtitle: v?.recorded_by_user?.name ? `By ${v.recorded_by_user.name}` : undefined,
      date: asIsoOrEmpty(v?.recorded_at),
    });
  });

  (params.medicalHistory || []).forEach((m: any) => {
    events.push({
      id: `med_history_${m?.id}`,
      type: 'medical_history',
      title: m?.event_name ? String(m.event_name) : 'Medical History',
      subtitle: m?.event_type ? String(m.event_type) : undefined,
      date: asIsoOrEmpty(m?.event_date),
    });
  });

  (params.labOrders || []).forEach((o: any) => {
    events.push({
      id: `lab_${o?.id}`,
      type: 'lab',
      title: o?.test_catalog?.test_name ? String(o.test_catalog.test_name) : 'Lab Order',
      subtitle: o?.status ? `Status: ${String(o.status)}` : undefined,
      date: asIsoOrEmpty(o?.created_at),
      link: o?.id ? `/lab-xray/order/${o.id}` : undefined,
    });
  });

  (params.radiologyOrders || []).forEach((o: any) => {
    events.push({
      id: `radiology_${o?.id}`,
      type: 'radiology',
      title: o?.test_catalog?.test_name ? String(o.test_catalog.test_name) : 'Radiology Order',
      subtitle: o?.status ? `Status: ${String(o.status)}` : undefined,
      date: asIsoOrEmpty(o?.created_at),
      link: o?.id ? `/lab-xray/order/${o.id}` : undefined,
    });
  });

  (params.xrayOrders || []).forEach((o: any, idx: number) => {
    events.push({
      id: `xray_${o?.id || idx}`,
      type: 'xray',
      title: o?.scan_name || o?.body_part ? String(o.scan_name || o.body_part) : 'X-ray',
      subtitle: o?.status ? `Status: ${String(o.status)}` : undefined,
      date: asIsoOrEmpty(o?.created_at || o?.ordered_at),
    });
  });

  (params.scanOrders || []).forEach((o: any, idx: number) => {
    events.push({
      id: `scan_${o?.id || idx}`,
      type: 'scan',
      title: o?.scan_name || o?.scan_type ? String(o.scan_name || o.scan_type) : 'Scan',
      subtitle: o?.status ? `Status: ${String(o.status)}` : undefined,
      date: asIsoOrEmpty(o?.created_at || o?.ordered_date),
    });
  });

  const bedAllocationIds = (params.bedAllocations || []).map((ba: any) => ba?.id).filter(Boolean);

  const [billingResult, otherBillsResult, ipPaymentsResult, pharmacyBillsResult, medicationResult, clinicalRecordsResult] = await Promise.allSettled([
    supabase
      .from('billing')
      .select('id, bill_number, bill_no, bill_type, issued_at, total, payment_status, patient_id')
      .eq('patient_id', params.patientUuid)
      .neq('bill_type', 'pharmacy')
      .order('issued_at', { ascending: false }),
    supabase
      .from('other_bills')
      .select('id, bill_number, bill_date, total_amount, payment_status, patient_id')
      .eq('patient_id', params.patientUuid)
      .eq('status', 'active')
      .order('bill_date', { ascending: false }),
    supabase
      .from('ip_payment_receipts')
      .select('id, bed_allocation_id, amount, payment_type, reference_number, payment_date, created_at, patient_id')
      .eq('patient_id', params.patientUuid)
      .order('payment_date', { ascending: false }),
    supabase
      .from('billing')
      .select('id, bill_number, created_at, total_amount, payment_status, payment_method, patient_id, bill_type')
      .eq('patient_id', params.patientUuid)
      .eq('bill_type', 'pharmacy')
      .order('created_at', { ascending: false }),
    getPatientMedicationHistory(params.patientUuid),
    params.includeClinicalRecords && bedAllocationIds.length > 0
      ? Promise.all([
          supabase
            .from('ip_case_sheets')
            .select('id, bed_allocation_id, case_sheet_date, provisional_diagnosis, created_at')
            .in('bed_allocation_id', bedAllocationIds)
            .order('case_sheet_date', { ascending: false }),
          supabase
            .from('ip_progress_notes')
            .select('id, bed_allocation_id, note_date, content, created_at')
            .in('bed_allocation_id', bedAllocationIds)
            .order('note_date', { ascending: false }),
          supabase
            .from('ip_doctor_orders')
            .select('id, bed_allocation_id, order_date, assessment, treatment_instructions, created_at')
            .in('bed_allocation_id', bedAllocationIds)
            .order('order_date', { ascending: false }),
          supabase
            .from('ip_nurse_records')
            .select('id, bed_allocation_id, entry_time, remark, created_at')
            .in('bed_allocation_id', bedAllocationIds)
            .order('entry_time', { ascending: false }),
          supabase
            .from('ip_discharge_summaries')
            .select('id, bed_allocation_id, discharge_date, final_diagnosis, status, created_at')
            .in('bed_allocation_id', bedAllocationIds)
            .order('discharge_date', { ascending: false }),
        ])
      : Promise.resolve(null),
  ]);

  const billingIds: string[] =
    billingResult.status === 'fulfilled'
      ? ((billingResult.value.data || []).map((b: any) => b?.id).filter(Boolean) as string[])
      : [];

  const otherBillIds: string[] =
    otherBillsResult.status === 'fulfilled'
      ? ((otherBillsResult.value.data || []).map((b: any) => b?.id).filter(Boolean) as string[])
      : [];

  const [billingPaymentsResult, otherBillPaymentsResult] = await Promise.allSettled([
    billingIds.length
      ? supabase
          .from('billing_payments')
          .select('id, billing_id, amount, method, reference, received_at, paid_at')
          .in('billing_id', billingIds)
          .order('paid_at', { ascending: false })
      : Promise.resolve({ data: [] } as any),
    otherBillIds.length
      ? supabase
          .from('other_bill_payments')
          .select('id, bill_id, payment_amount, payment_method, transaction_reference, payment_date')
          .in('bill_id', otherBillIds)
          .order('payment_date', { ascending: false })
      : Promise.resolve({ data: [] } as any),
  ]);

  if (billingResult.status === 'fulfilled') {
    (billingResult.value.data || []).forEach((b: any) => {
      let link = undefined;
      if (b.bill_type === 'lab') {
        link = `/lab-xray/order/${b.id}`;
      } else if (b.bill_type === 'radiology' || b.bill_type === 'xray' || b.bill_type === 'scan') {
        link = `/lab-xray/order/${b.id}`;
      } else if (b.bill_type === 'consultation' || b.bill_type === 'op') {
        link = `/finance/billing?bill=${b.id}&type=consultation`;
      } else {
        link = `/finance/billing?bill=${b.id}&type=${b.bill_type || 'general'}`;
      }
      
      events.push({
        id: `bill_${b.id}`,
        type: 'billing',
        title: b.bill_number || b.bill_no || 'Bill',
        subtitle: b.bill_type ? `Type: ${String(b.bill_type)}` : undefined,
        date: asIsoOrEmpty(b.issued_at),
        amount: Number(b.total) || 0,
        status: b.payment_status || undefined,
        link,
      });
    });
  }

  if (billingPaymentsResult.status === 'fulfilled') {
    (billingPaymentsResult.value.data || []).forEach((p: any) => {
      events.push({
        id: `billing_payment_${p.id}`,
        type: 'billing_payment',
        title: 'Billing Payment',
        subtitle: p.method ? String(p.method).toUpperCase() : undefined,
        date: asIsoOrEmpty(p.received_at || p.paid_at),
        amount: Number(p.amount) || 0,
        reference: p.reference || undefined,
        link: `/finance/billing?bill=${p.billing_id}&type=payment`,
      });
    });
  }

  if (otherBillsResult.status === 'fulfilled') {
    (otherBillsResult.value.data || []).forEach((b: any) => {
      events.push({
        id: `other_bill_${b.id}`,
        type: 'other_bill',
        title: b.bill_number || 'Other Bill',
        subtitle: b.charge_category ? `Category: ${String(b.charge_category).replace('_', ' ')}` : undefined,
        date: asIsoOrEmpty(b.bill_date),
        amount: Number(b.total_amount) || 0,
        status: b.payment_status || undefined,
        link: `/other-bills?bill=${b.id}`,
      });
    });
  }

  if (otherBillPaymentsResult.status === 'fulfilled') {
    (otherBillPaymentsResult.value.data || []).forEach((p: any) => {
      events.push({
        id: `other_bill_payment_${p.id}`,
        type: 'other_bill_payment',
        title: 'Other Bill Payment',
        subtitle: p.payment_method ? String(p.payment_method).toUpperCase() : undefined,
        date: asIsoOrEmpty(p.payment_date),
        amount: Number(p.payment_amount) || 0,
        reference: p.transaction_reference || undefined,
        link: `/other-bills?bill=${p.bill_id}`,
      });
    });
  }

  if (ipPaymentsResult.status === 'fulfilled') {
    (ipPaymentsResult.value.data || []).forEach((p: any) => {
      events.push({
        id: `ip_payment_${p.id}`,
        type: 'ip_payment',
        title: 'IP Payment Receipt',
        subtitle: p.payment_type ? String(p.payment_type).toUpperCase() : undefined,
        date: asIsoOrEmpty(p.payment_date || p.created_at),
        amount: Number(p.amount) || 0,
        reference: p.reference_number || undefined,
        link: p.bed_allocation_id ? `/patients/${params.patientUhid}?tab=clinical-records&allocation=${p.bed_allocation_id}` : `/billing/payments/${p.id}`,
      });
    });
  }

  if (pharmacyBillsResult.status === 'fulfilled') {
    (pharmacyBillsResult.value.data || []).forEach((b: any) => {
      events.push({
        id: `pharmacy_bill_${b.id}`,
        type: 'pharmacy_bill',
        title: b.bill_number || 'Pharmacy Bill',
        subtitle: b.payment_method ? String(b.payment_method).toUpperCase() : undefined,
        date: asIsoOrEmpty(b.created_at),
        amount: Number(b.total_amount) || 0,
        status: b.payment_status || undefined,
        link: `/pharmacy/billing`,
      });

      if (String(b.payment_status || '').toLowerCase() === 'paid') {
        events.push({
          id: `pharmacy_payment_${b.id}`,
          type: 'pharmacy_bill',
          title: 'Pharmacy Payment',
          subtitle: b.payment_method ? String(b.payment_method).toUpperCase() : undefined,
          date: asIsoOrEmpty(b.created_at),
          amount: Number(b.total_amount) || 0,
          status: 'paid',
          link: `/pharmacy/billing`,
        });
      }
    });
  }

  if (medicationResult.status === 'fulfilled') {
    (medicationResult.value || []).forEach((m: any) => {
      events.push({
        id: `med_${m.id}`,
        type: 'medication',
        title: m.medication_name ? String(m.medication_name) : 'Medication',
        subtitle: m.status ? String(m.status) : undefined,
        date: asIsoOrEmpty(m.dispensed_date || m.prescribed_date),
      });
    });
  }

  if (clinicalRecordsResult.status === 'fulfilled' && clinicalRecordsResult.value) {
    const [caseSheets, progressNotes, doctorOrders, nurseRecords, dischargeSummaries] = clinicalRecordsResult.value;

    if (caseSheets?.data) {
      caseSheets.data.forEach((cs: any) => {
        events.push({
          id: `case_sheet_${cs.id}`,
          type: 'case_sheet',
          title: 'Case Sheet',
          subtitle: cs.provisional_diagnosis ? String(cs.provisional_diagnosis) : undefined,
          date: asIsoOrEmpty(cs.case_sheet_date || cs.created_at),
          bedAllocationId: cs.bed_allocation_id,
        });
      });
    }

    if (progressNotes?.data) {
      progressNotes.data.forEach((pn: any) => {
        events.push({
          id: `progress_note_${pn.id}`,
          type: 'progress_note',
          title: 'Progress Note',
          subtitle: pn.content ? String(pn.content).substring(0, 50) + '...' : undefined,
          date: asIsoOrEmpty(pn.note_date || pn.created_at),
          bedAllocationId: pn.bed_allocation_id,
          content: pn.content,
        });
      });
    }

    if (doctorOrders?.data) {
      doctorOrders.data.forEach((order: any) => {
        events.push({
          id: `doctor_order_${order.id}`,
          type: 'doctor_order',
          title: 'Doctor Order',
          subtitle: order.assessment ? String(order.assessment).substring(0, 50) + '...' : undefined,
          date: asIsoOrEmpty(order.order_date || order.created_at),
          bedAllocationId: order.bed_allocation_id,
          content: order.treatment_instructions,
        });
      });
    }

    if (nurseRecords?.data) {
      nurseRecords.data.forEach((nr: any) => {
        events.push({
          id: `nurse_record_${nr.id}`,
          type: 'nurse_record',
          title: 'Nurse Record',
          subtitle: nr.remark ? String(nr.remark).substring(0, 50) + '...' : undefined,
          date: asIsoOrEmpty(nr.entry_time || nr.created_at),
          bedAllocationId: nr.bed_allocation_id,
          content: nr.remark,
        });
      });
    }

    if (dischargeSummaries?.data) {
      dischargeSummaries.data.forEach((ds: any) => {
        events.push({
          id: `discharge_summary_${ds.id}`,
          type: 'discharge_summary',
          title: 'Discharge Summary',
          subtitle: ds.final_diagnosis ? String(ds.final_diagnosis) : undefined,
          date: asIsoOrEmpty(ds.discharge_date || ds.created_at),
          bedAllocationId: ds.bed_allocation_id,
          status: ds.status,
        });
      });
    }
  }

  return events
    .filter(e => !!e.date)
    .sort(sortDesc);
}
