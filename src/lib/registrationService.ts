import { supabase } from './supabase';

/**
 * Fetch all active doctors with their consultation fees
 */
export async function fetchActiveDoctors() {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        id,
        user_id,
        license_number,
        specialization,
        qualification,
        consultation_fee,
        room_number,
        status,
        users:user_id (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('status', 'active')
      .order('users(name)', { ascending: true });

    if (error) {
      console.error('Error fetching doctors:', error);
      throw new Error(`Failed to fetch doctors: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching doctors:', error);
    throw error;
  }
}

/**
 * Fetch available beds with pricing
 */
export async function fetchAvailableBeds() {
  try {
    const { data, error } = await supabase
      .from('beds')
      .select(`
        id,
        bed_number,
        bed_type,
        hourly_rate,
        status,
        features,
        department_id,
        departments:department_id (
          id,
          name,
          location
        )
      `)
      .eq('status', 'available')
      .order('bed_number', { ascending: true });

    if (error) {
      console.error('Error fetching beds:', error);
      throw new Error(`Failed to fetch beds: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching beds:', error);
    throw error;
  }
}

/**
 * Calculate registration charges based on admission type and selections
 */
export interface RegistrationCharges {
  registrationFee: number;
  consultationFee: number;
  bedCharges: number;
  totalAmount: number;
  breakdown: {
    label: string;
    amount: number;
  }[];
}

export function calculateRegistrationCharges(
  admissionType: 'outpatient' | 'inpatient',
  doctorFee?: number,
  bedDailyRate?: number
): RegistrationCharges {
  const registrationFee = 100; // Base registration fee
  const consultationFee = doctorFee || 0;
  const bedCharges = admissionType === 'inpatient' && bedDailyRate ? bedDailyRate : 0;

  const breakdown = [
    { label: 'Registration Fee', amount: registrationFee }
  ];

  if (consultationFee > 0) {
    breakdown.push({ label: 'Consultation Fee', amount: consultationFee });
  }

  if (bedCharges > 0) {
    breakdown.push({ label: 'Bed Charges (Per Day)', amount: bedCharges });
  }

  const totalAmount = registrationFee + consultationFee + bedCharges;

  return {
    registrationFee,
    consultationFee,
    bedCharges,
    totalAmount,
    breakdown
  };
}

/**
 * Generate bill number
 */
export function generateBillNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BILL${year}${month}${random}`;
}
