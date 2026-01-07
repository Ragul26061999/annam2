import { createClient } from '@supabase/supabase-js';

let supabase: any = null;

// Function to get Supabase client (created only when needed)
const getSupabaseClient = () => {
  if (!supabase && typeof window !== 'undefined') {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
};

export interface BillingRecord {
  id: string;
  bill_id: string;
  patient_id: string;
  bill_date: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    uhid: string;
    phone: string;
  };
}

export interface PaymentHistory {
  id: string;
  bill_id: string;
  billing_id: string;
  payment_date: string;
  payment_time: string;
  amount_paid: number;
  payment_method: string;
  transaction_reference?: string;
  bank_name?: string;
  card_last_four?: string;
  upi_id?: string;
  created_at: string;
}

export interface PaymentReceipt {
  id: string;
  receipt_number: string;
  bill_id: string;
  patient_id: string;
  receipt_date: string;
  receipt_time: string;
  total_amount: number;
  amount_paid: number;
  balance_amount: number;
  payment_status: 'partial' | 'full' | 'overdue';
  payment_methods: any[];
  received_by: string;
  created_at: string;
}

export interface FinanceStats {
  totalRevenue: number;
  outstandingAmount: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  overdueTransactions: number;
  cancelledTransactions: number;
  revenueGrowth: number;
  profitGrowth: number;
}

export interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface PaymentMethodStats {
  method: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
}

// Get comprehensive finance statistics
export async function getFinanceStats(dateRange?: { from: string; to: string }): Promise<FinanceStats> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const dateFilter = dateRange 
      ? `bill_date >= '${dateRange.from}' AND bill_date <= '${dateRange.to}'`
      : 'bill_date >= NOW() - INTERVAL \'30 days\'';

    // Get billing stats
    const { data: billingData, error: billingError } = await client
      .from('billing')
      .select('total_amount, payment_status, created_at')
      .or(dateFilter);

    if (billingError) throw billingError;

    // Calculate stats
    const totalRevenue = billingData?.reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0) || 0;
    const totalTransactions = billingData?.length || 0;
    
    const paidTransactions = billingData?.filter((bill: any) => bill.payment_status === 'paid').length || 0;
    const pendingTransactions = billingData?.filter((bill: any) => bill.payment_status === 'pending' || bill.payment_status === 'partial').length || 0;
    const overdueTransactions = billingData?.filter((bill: any) => bill.payment_status === 'overdue').length || 0;
    const cancelledTransactions = billingData?.filter((bill: any) => bill.payment_status === 'cancelled').length || 0;

    const outstandingAmount = billingData
      ?.filter((bill: any) => bill.payment_status === 'pending' || bill.payment_status === 'partial' || bill.payment_status === 'overdue')
      ?.reduce((sum: number, bill: any) => sum + (bill.total_amount || 0), 0) || 0;

    // Mock expenses data (you can create an expenses table later)
    const totalExpenses = totalRevenue * 0.35; // Mock: 35% of revenue as expenses
    const netProfit = totalRevenue - totalExpenses;

    // Mock growth data (compare with previous period)
    const revenueGrowth = 15.3; // Mock growth percentage
    const profitGrowth = 22.1; // Mock growth percentage

    return {
      totalRevenue,
      outstandingAmount,
      totalExpenses,
      netProfit,
      totalTransactions,
      paidTransactions,
      pendingTransactions,
      overdueTransactions,
      cancelledTransactions,
      revenueGrowth,
      profitGrowth
    };
  } catch (error) {
    console.error('Error fetching finance stats:', error);
    throw error;
  }
}

// Get billing records with patient information
export async function getBillingRecords(
  limit: number = 10,
  offset: number = 0,
  filters?: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<{ records: BillingRecord[]; total: number }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    let query = client
      .from('billing')
      .select(`
        *,
        patients:first_name, last_name, uhid, phone
      `, { count: 'exact' });

    // Apply filters
    if (filters?.search) {
      query = query.or(`bill_id.ilike.%${filters.search}%,patients.first_name.ilike.%${filters.search}%,patients.last_name.ilike.%${filters.search}%`);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('payment_status', filters.status);
    }

    if (filters?.dateFrom) {
      query = query.gte('bill_date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('bill_date', filters.dateTo);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      records: data as BillingRecord[] || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching billing records:', error);
    throw error;
  }
}

// Get payment history for a specific bill
export async function getPaymentHistory(billId: string): Promise<PaymentHistory[]> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const { data, error } = await client
      .from('payment_history')
      .select('*')
      .eq('bill_id', billId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PaymentHistory[] || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
}

// Get payment receipts
export async function getPaymentReceipts(
  limit: number = 10,
  offset: number = 0
): Promise<{ receipts: PaymentReceipt[]; total: number }> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const { data, error, count } = await client
      .from('payment_receipts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      receipts: data as PaymentReceipt[] || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching payment receipts:', error);
    throw error;
  }
}

// Get revenue breakdown by category
export async function getRevenueBreakdown(dateRange?: { from: string; to: string }): Promise<RevenueBreakdown[]> {
  try {
    // This is a mock implementation - you can create billing_items table with categories
    // For now, we'll return mock data based on typical hospital revenue distribution
    
    const mockBreakdown: RevenueBreakdown[] = [
      { category: 'Consultations', amount: 456000, percentage: 37, color: 'bg-blue-500' },
      { category: 'Surgery', amount: 325000, percentage: 26, color: 'bg-green-500' },
      { category: 'Room Charges', amount: 284000, percentage: 23, color: 'bg-orange-500' },
      { category: 'Lab Tests', amount: 180600, percentage: 14, color: 'bg-purple-500' },
      { category: 'Medication', amount: 125000, percentage: 10, color: 'bg-pink-500' },
      { category: 'Other Services', amount: 85000, percentage: 7, color: 'bg-gray-500' }
    ];

    return mockBreakdown;
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    throw error;
  }
}

// Get payment method statistics
export async function getPaymentMethodStats(dateRange?: { from: string; to: string }): Promise<PaymentMethodStats[]> {
  try {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const dateFilter = dateRange 
      ? `payment_date >= '${dateRange.from}' AND payment_date <= '${dateRange.to}'`
      : 'payment_date >= NOW() - INTERVAL \'30 days\'';

    // Get payment method distribution from payment_history
    const { data, error } = await client
      .from('payment_history')
      .select('payment_method, amount_paid')
      .or(dateFilter);

    if (error) throw error;

    // Aggregate by payment method
    const methodStats = data?.reduce((acc: Record<string, { amount: number; count: number }>, payment: any) => {
      const method = payment.payment_method;
      if (!acc[method]) {
        acc[method] = { amount: 0, count: 0 };
      }
      acc[method].amount += payment.amount_paid || 0;
      acc[method].count += 1;
      return acc;
    }, {}) || {};

    const totalAmount = Object.values(methodStats).reduce((sum: number, stat: any) => sum + stat.amount, 0);

    const paymentMethodConfig = {
      'cash': { icon: 'IndianRupee', color: 'text-orange-500' },
      'card': { icon: 'CreditCard', color: 'text-blue-500' },
      'upi': { icon: 'Smartphone', color: 'text-green-500' },
      'bank_transfer': { icon: 'Building', color: 'text-purple-500' },
      'insurance': { icon: 'Building', color: 'text-indigo-500' },
      'cheque': { icon: 'Receipt', color: 'text-gray-500' },
      'wallet': { icon: 'CreditCard', color: 'text-pink-500' }
    };

    return Object.entries(methodStats).map(([method, stats]: [string, any]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' '),
      amount: stats.amount,
      percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0,
      icon: paymentMethodConfig[method as keyof typeof paymentMethodConfig]?.icon || 'CreditCard',
      color: paymentMethodConfig[method as keyof typeof paymentMethodConfig]?.color || 'text-gray-500'
    }));
  } catch (error) {
    console.error('Error fetching payment method stats:', error);
    throw error;
  }
}

// Get monthly revenue trend
export async function getMonthlyRevenueTrend(months: number = 12): Promise<{
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}[]> {
  try {
    // Mock implementation - you can create a proper query with date functions
    const trendData = [];
    const currentDate = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Mock data with some variation
      const baseRevenue = 1000000 + Math.random() * 500000;
      const revenue = baseRevenue;
      const expenses = revenue * (0.3 + Math.random() * 0.1); // 30-40% expenses
      const profit = revenue - expenses;
      
      trendData.push({
        month: monthName,
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        profit: Math.round(profit)
      });
    }
    
    return trendData;
  } catch (error) {
    console.error('Error fetching monthly revenue trend:', error);
    throw error;
  }
}

// Export financial data to CSV
export async function exportFinancialData(type: 'billing' | 'payments' | 'receipts', filters?: any): Promise<any[]> {
  try {
    let data: any[] = [];
    
    switch (type) {
      case 'billing':
        const billingResult = await getBillingRecords(1000, 0, filters);
        data = billingResult.records;
        break;
      case 'payments':
        const paymentReceipts = await getPaymentReceipts(1000, 0);
        data = paymentReceipts.receipts;
        break;
      case 'receipts':
        const receipts = await getPaymentReceipts(1000, 0);
        data = receipts.receipts;
        break;
    }

    // Convert to CSV
    if (data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent.split('\n').map(line => line.split(','));
  } catch (error) {
    console.error('Error exporting financial data:', error);
    throw error;
  }
}
