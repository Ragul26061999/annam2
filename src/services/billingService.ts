import { supabase } from '../lib/supabase';

export interface FeeCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface FeeRate {
  id: string;
  category_id: string;
  service_name: string;
  rate_per_unit: number;
  unit_type: 'per_service' | 'per_day' | 'per_hour' | 'per_item';
  description?: string;
  is_active: boolean;
  category?: FeeCategory;
}

export interface PatientAdmission {
  id: string;
  patient_id: string;
  bed_allocation_id?: string;
  admission_date: string;
  discharge_date?: string;
  status: 'active' | 'discharged' | 'transferred';
  admission_type: 'emergency' | 'elective' | 'transfer';
  primary_diagnosis?: string;
  secondary_diagnosis?: string;
  treatment_summary?: string;
  discharge_notes?: string;
  total_stay_days?: number;
  room_charges: number;
  total_bill_amount: number;
}

export interface BillingItem {
  id?: string;
  patient_admission_id: string;
  billing_summary_id?: string;
  fee_rate_id?: string;
  service_name: string;
  quantity: number;
  unit_rate: number;
  total_amount?: number;
  service_date: string;
  notes?: string;
}

export interface BillingSummary {
  id?: string;
  patient_admission_id: string;
  bill_number: string;
  bill_date: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount?: number;
  discount_percentage: number;
  discount_amount?: number;
  total_amount?: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'cancelled';
  payment_method?: 'cash' | 'card' | 'upi' | 'insurance' | 'cheque';
  payment_date?: string;
  notes?: string;
}

export class BillingService {
  
  /**
   * Get all active fee categories
   */
  static async getFeeCategories(): Promise<FeeCategory[]> {
    const { data, error } = await supabase
      .from('fee_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching fee categories:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get fee rates by category
   */
  static async getFeeRatesByCategory(categoryId: string): Promise<FeeRate[]> {
    const { data, error } = await supabase
      .from('fee_rates')
      .select(`
        *,
        category:fee_categories(*)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('service_name');

    if (error) {
      console.error('Error fetching fee rates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all active fee rates with categories
   */
  static async getAllFeeRates(): Promise<FeeRate[]> {
    const { data, error } = await supabase
      .from('fee_rates')
      .select(`
        *,
        category:fee_categories(*)
      `)
      .eq('is_active', true)
      .order('service_name');

    if (error) {
      console.error('Error fetching all fee rates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Calculate room charges based on bed type and stay duration
   */
  static async calculateRoomCharges(
    bedId: string, 
    admissionDate: string, 
    dischargeDate: string
  ): Promise<{ days: number; dailyRate: number; totalCharges: number; bedType: string }> {
    try {
      // Get bed information
      const { data: bedData, error: bedError } = await supabase
        .from('beds')
        .select('bed_number, room_number, bed_type, daily_rate')
        .eq('id', bedId)
        .single();

      if (bedError) throw bedError;

      // Calculate stay duration
      const admission = new Date(admissionDate);
      const discharge = new Date(dischargeDate);
      const diffTime = Math.abs(discharge.getTime() - admission.getTime());
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Determine bed type label
      const rawBedType = String((bedData as any)?.bed_type || '').toLowerCase();
      let bedType = 'General Ward Bed';

      if (rawBedType.includes('icu')) bedType = 'ICU Bed';
      else if (rawBedType.includes('emergency')) bedType = 'Emergency Bed';
      else if (rawBedType.includes('private')) bedType = 'Private Room';

      // Prefer bed.daily_rate if present
      let dailyRate = typeof (bedData as any)?.daily_rate === 'number'
        ? (bedData as any).daily_rate
        : Number((bedData as any)?.daily_rate);

      if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
        dailyRate = 800; // Default rate
      }

      // Try to get actual rate from fee_rates table (fallback/override)
      const { data: rateData } = await supabase
        .from('fee_rates')
        .select('rate_per_unit')
        .eq('service_name', bedType)
        .eq('is_active', true)
        .single();

      if (rateData) {
        dailyRate = rateData.rate_per_unit;
      }

      const totalCharges = diffDays * dailyRate;

      return {
        days: diffDays,
        dailyRate,
        totalCharges,
        bedType
      };
    } catch (error) {
      console.error('Error calculating room charges:', error);
      // Return default values if calculation fails
      return {
        days: 1,
        dailyRate: 800,
        totalCharges: 800,
        bedType: 'General Ward Bed'
      };
    }
  }

  /**
   * Create a patient admission record
   */
  static async createPatientAdmission(admission: Omit<PatientAdmission, 'id'>): Promise<PatientAdmission> {
    const { data, error } = await supabase
      .from('patient_admissions')
      .insert(admission)
      .select()
      .single();

    if (error) {
      console.error('Error creating patient admission:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update patient admission (for discharge)
   */
  static async updatePatientAdmission(
    admissionId: string, 
    updates: Partial<PatientAdmission>
  ): Promise<PatientAdmission> {
    const { data, error } = await supabase
      .from('patient_admissions')
      .update(updates)
      .eq('id', admissionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient admission:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get patient admission by bed allocation
   */
  static async getPatientAdmissionByBedAllocation(bedAllocationId: string): Promise<PatientAdmission | null> {
    const { data, error } = await supabase
      .from('patient_admissions')
      .select('*')
      .eq('bed_allocation_id', bedAllocationId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      const errAny: any = error as any;
      const code = errAny?.code;
      const message = errAny?.message;
      const details = errAny?.details;
      const hint = errAny?.hint;

      // If PostgREST returns "no rows", treat it as not found.
      if (code === 'PGRST116' || code === 'PGRST117') {
        return null;
      }

      console.error('Error fetching patient admission:', {
        code,
        message,
        details,
        hint
      });
      throw error;
    }

    return data;
  }

  /**
   * Generate unique bill number
   */
  static generateBillNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getTime()).slice(-6);
    
    return `BILL-${year}${month}${day}-${time}`;
  }

  /**
   * Create billing summary
   */
  static async createBillingSummary(summary: Omit<BillingSummary, 'id'>): Promise<BillingSummary> {
    const { data, error } = await supabase
      .from('billing_summary')
      .insert(summary)
      .select()
      .single();

    if (error) {
      console.error('Error creating billing summary:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create billing items
   */
  static async createBillingItems(items: BillingItem[]): Promise<BillingItem[]> {
    const { data, error } = await supabase
      .from('billing_items')
      .insert(items)
      .select();

    if (error) {
      console.error('Error creating billing items:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Calculate bill totals
   */
  static calculateBillTotals(
    items: BillingItem[], 
    taxPercentage: number = 0, 
    discountPercentage: number = 0
  ) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_rate), 0);
    const taxAmount = (subtotal * taxPercentage) / 100;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;

    return {
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(taxAmount),
      discountAmount: Math.round(discountAmount),
      totalAmount: Math.round(totalAmount)
    };
  }

  /**
   * Get patient admission history
   */
  static async getPatientAdmissionHistory(patientId: string): Promise<PatientAdmission[]> {
    const { data, error } = await supabase
      .from('patient_admissions')
      .select('*')
      .eq('patient_id', patientId)
      .order('admission_date', { ascending: false });

    if (error) {
      console.error('Error fetching patient admission history:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get billing history for a patient
   */
  static async getPatientBillingHistory(patientId: string) {
    const { data, error } = await supabase
      .from('billing_summary_detailed')
      .select('*')
      .eq('patient_id', patientId)
      .order('bill_date', { ascending: false });

    if (error) {
      console.error('Error fetching patient billing history:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get detailed billing items for an admission
   */
  static async getBillingItemsForAdmission(admissionId: string): Promise<BillingItem[]> {
    const { data, error } = await supabase
      .from('billing_items')
      .select('*')
      .eq('patient_admission_id', admissionId)
      .order('service_date', { ascending: false });

    if (error) {
      console.error('Error fetching billing items:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Process complete discharge with billing
   */
  static async processDischarge(
    bedAllocationId: string,
    dischargeDate: string,
    dischargeNotes: string,
    additionalServices: BillingItem[] = [],
    taxPercentage: number = 0,
    discountPercentage: number = 0
  ) {
    try {
      // Get bed allocation details
      const { data: bedAllocation, error: bedError } = await supabase
        .from('bed_allocations')
        .select(`
          *,
          patient:patients(*),
          bed:beds(*)
        `)
        .eq('id', bedAllocationId)
        .single();

      if (bedError) throw bedError;

      // Get or create patient admission record
      let patientAdmission = await this.getPatientAdmissionByBedAllocation(bedAllocationId);
      
      if (!patientAdmission) {
        // Create admission record if it doesn't exist
        patientAdmission = await this.createPatientAdmission({
          patient_id: bedAllocation.patient_id,
          bed_allocation_id: bedAllocationId,
          admission_date: bedAllocation.admission_date,
          status: 'active',
          admission_type: bedAllocation.admission_type || 'elective',
          room_charges: 0,
          total_bill_amount: 0
        });
      }

      // Calculate room charges
      const roomCharges = await this.calculateRoomCharges(
        bedAllocation.bed_id,
        bedAllocation.admission_date,
        dischargeDate
      );

      // Prepare billing items
      const billingItems: BillingItem[] = [
        {
          patient_admission_id: patientAdmission.id,
          service_name: roomCharges.bedType,
          quantity: roomCharges.days,
          unit_rate: roomCharges.dailyRate,
          service_date: new Date().toISOString().split('T')[0],
          notes: `Room charges for ${roomCharges.days} days`
        },
        ...additionalServices.map(service => ({
          ...service,
          patient_admission_id: patientAdmission.id
        }))
      ];

      // Calculate totals
      const totals = this.calculateBillTotals(billingItems, taxPercentage, discountPercentage);

      // Create billing summary
      const billingSummary = await this.createBillingSummary({
        patient_admission_id: patientAdmission.id,
        bill_number: this.generateBillNumber(),
        bill_date: new Date().toISOString(),
        subtotal: totals.subtotal,
        tax_percentage: taxPercentage,
        discount_percentage: discountPercentage,
        payment_status: 'pending',
        notes: dischargeNotes
      });

      // Create billing items
      const createdItems = await this.createBillingItems(
        billingItems.map(item => ({
          ...item,
          billing_summary_id: billingSummary.id
        }))
      );

      // Update patient admission
      const updatedAdmission = await this.updatePatientAdmission(patientAdmission.id, {
        discharge_date: dischargeDate,
        status: 'discharged',
        discharge_notes: dischargeNotes,
        room_charges: roomCharges.totalCharges,
        total_bill_amount: totals.totalAmount
      });

      // Update bed allocation
      const { error: updateError } = await supabase
        .from('bed_allocations')
        .update({ 
          discharge_date: dischargeDate,
          status: 'discharged'
        })
        .eq('id', bedAllocationId);

      if (updateError) throw updateError;

      // Update bed status
      const { error: bedUpdateError } = await supabase
        .from('beds')
        .update({ status: 'available' })
        .eq('id', bedAllocation.bed_id);

      if (bedUpdateError) throw bedUpdateError;

      return {
        admission: updatedAdmission,
        billing: billingSummary,
        items: createdItems,
        roomCharges,
        totals
      };

    } catch (error) {
      console.error('Error processing discharge:', error);
      throw error;
    }
  }
}

export default BillingService;