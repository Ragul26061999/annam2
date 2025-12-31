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
}

export async function createDischargeSummary(data: DischargeSummaryData) {
    try {
        const { data: summary, error } = await supabase
            .from('discharge_summaries')
            .insert([data])
            .select()
            .single();

        if (error) {
            console.error('Error creating discharge summary:', error);
            throw new Error(`Failed to create discharge summary: ${error.message}`);
        }

        // Also update the bed allocation status to discharged if not already done
        const { error: allocationError } = await supabase
            .from('bed_allocations')
            .update({
                status: 'discharged',
                discharge_date: new Date().toISOString()
            })
            .eq('id', data.allocation_id);

        if (allocationError) {
            console.warn('Error updating bed allocation status:', allocationError);
        }

        // Get the bed entry associated with this allocation
        const { data: allocationData } = await supabase
            .from('bed_allocations')
            .select('bed_id')
            .eq('id', data.allocation_id)
            .single();

        if (allocationData?.bed_id) {
            // Update bed status to available
            await supabase
                .from('beds')
                .update({ status: 'available' })
                .eq('id', allocationData.bed_id);
        }

        // Update patient admission status
        await supabase
            .from('patients')
            .update({ is_admitted: false, admission_type: 'outpatient' })
            .eq('id', data.patient_id);

        return summary;
    } catch (error) {
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
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error in getDischargeSummaryByAllocation:', error);
        throw error;
    }
}
