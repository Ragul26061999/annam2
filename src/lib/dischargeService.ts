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
}

export async function createDischargeSummary(data: DischargeSummaryData) {
    try {
        console.log('Creating discharge summary with data:', data);
        
        const { data: summary, error } = await supabase
            .from('discharge_summaries')
            .insert([data])
            .select()
            .single();

        if (error) {
            console.error('Error creating discharge summary:', error);
            const errorMessage = error.message || error.details || JSON.stringify(error);
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
