import { supabase } from './supabase';

export interface DischargeSummaryData {
    allocation_id: string;
    patient_id: string;
    uhid: string;
    patient_name: string;
    address: string;
    gender: string;
    age: number;
    ip_number: string;
    admission_date: string;
    surgery_date?: string;
    discharge_date: string;
    consultant_id: string;
    presenting_complaint: string;
    physical_findings: string;
    investigations: string;
    anesthesiologist: string;
    past_history: string;
    final_diagnosis: string;
    diagnosis_category: string; // management, procedure, treatment
    condition_at_discharge: string; // cured, improved, referred, dis at request, lama, absconed
    follow_up_advice: string;
    review_on?: string;
    prescription: string;
    created_by?: string;

    // Billing fields (pending bills)
    bed_days?: number;
    bed_daily_rate?: number;
    bed_total?: number;
    pharmacy_amount?: number;
    lab_amount?: number;
    procedure_amount?: number;
    other_amount?: number;
    discount_amount?: number;
    gross_amount?: number;
    net_amount?: number;
    paid_amount?: number;
    pending_amount?: number;
    payment_splits?: any;
}

export async function createDischargeSummary(data: DischargeSummaryData) {
    try {
        console.log('Creating discharge summary with data:', data);
        
        const { data: summary, error } = await supabase
            .from('discharge_summaries')
            .upsert([data], { onConflict: 'allocation_id' })
            .select()
            .single();

        if (error) {
            console.error('Error creating discharge summary:', {
                message: error.message,
                details: (error as any).details,
                hint: (error as any).hint,
                code: (error as any).code
            });
            const errorMessage =
                error.message ||
                (error as any).details ||
                (error as any).hint ||
                JSON.stringify(error);
            throw new Error(`Failed to create discharge summary: ${errorMessage}`);
        }

        console.log('Discharge summary created successfully:', summary);
        return summary;
    } catch (error: any) {
        console.error('Error in createDischargeSummary:', error);
        throw error;
    }
}

export async function getDischargeSummaryByAllocation(allocationId: string) {
    try {
        const { data, error } = await supabase
            .from('discharge_summaries')
            .select('*')
            .eq('allocation_id', allocationId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching discharge summary:', error);
            throw new Error(`Failed to fetch discharge summary: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error('Error in getDischargeSummaryByAllocation:', error);
        throw error;
    }
}

export async function getDischargeSummaryIdsByAllocations(allocationIds: string[]) {
    if (!allocationIds.length) return {} as Record<string, string>;

    const { data, error } = await supabase
        .from('discharge_summaries')
        .select('id, allocation_id')
        .in('allocation_id', allocationIds);

    if (error) {
        console.error('Error fetching discharge summaries by allocations:', error);
        throw new Error(`Failed to fetch discharge summaries: ${error.message}`);
    }

    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => {
        if (row?.allocation_id && row?.id) map[String(row.allocation_id)] = String(row.id);
    });
    return map;
}
