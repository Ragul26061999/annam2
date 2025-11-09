import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PharmacyService {
  static final supabase = Supabase.instance.client;

  // Dashboard Stats - Medicine focused
  static Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      // Get total medications count
      final medsResult = await supabase
          .from('medications')
          .select('id')
          .eq('status', 'active');

      // Get low stock count - simplified version
      final medsWithStockResult = await supabase
          .from('medications')
          .select('total_stock, minimum_stock_level')
          .eq('status', 'active');

      int lowStockCount = 0;
      for (var med in medsWithStockResult) {
        final minStock = med['minimum_stock_level'] ?? 10;
        final currentStock = med['total_stock'] ?? 0;
        if (currentStock <= minStock) {
          lowStockCount++;
        }
      }

      return {
        'totalMedications': medsResult.length,
        'lowStockCount': lowStockCount,
      };
    } catch (e) {
      debugPrint('Error fetching dashboard stats: $e');
      return {
        'totalMedications': 0,
        'lowStockCount': 0,
      };
    }
  }

  // Get medications
  static Future<List<Map<String, dynamic>>> getMedications() async {
    try {
      final result = await supabase
          .from('medications')
          .select('*')
          .eq('status', 'active')
          .order('name');

      return result.map((med) => {
        'id': med['id'],
        'medicine_code': med['medicine_code'],
        'name': med['name'],
        'category': med['category'],
        'available_stock': med['total_stock'] ?? 0,
        'unit_price': med['selling_price'] ?? 0,
        'manufacturer': med['manufacturer'],
        'minimum_stock_level': med['minimum_stock_level'] ?? 10,
      }).toList();
    } catch (e) {
      debugPrint('Error fetching medications: $e');
      return [];
    }
  }

  // Recent pharmacy bills (for dashboard list) — align with web app 'billing' table name
  static Future<List<Map<String, dynamic>>> getRecentBills({int limit = 5}) async {
    try {
      final result = await supabase
          .from('billing')
          .select('''
            id,
            bill_number,
            customer_name,
            total,
            payment_method,
            payment_status,
            issued_at,
            created_at,
            billing_item (
              id,
              qty,
              unit_amount,
              total_amount,
              description,
              medicine_id
            )
          ''')
          .order('created_at', ascending: false)
          .limit(limit);

      // Map minimally, preserving raw values when present with broad fallbacks
      final mapped = result.map((row) => {
        'id': row['id'],
        'bill_number': row['bill_number'] ?? 'N/A',
        'patient_name': row['customer_name'] ?? 'Walk-in Customer',
        'total_amount': row['total'] ?? 0,
        'payment_method': row['payment_method'] ?? 'cash',
        'payment_status': row['payment_status'] ?? 'pending',
        'bill_date': row['issued_at'],
        'created_at': row['created_at'],
        'items': (row['billing_item'] as List<dynamic>? ?? []).map((item) => {
          'id': item['id'],
          'quantity': item['qty'],
          'unit_price': item['unit_amount'],
          'total_amount': item['total_amount'],
          'medicine_name': item['description'] ?? 'Unknown Medicine',
          'medicine_code': '',
        }).toList(),
        'item_count': (row['billing_item'] as List<dynamic>? ?? []).length,
      }).toList();

      // Debug: show first row keys if any
      if (mapped.isNotEmpty) {
        debugPrint('Recent Bills - First row keys: ${mapped.first.keys.join(", ")}');
        debugPrint('Recent Bills - First row values: ${mapped.first}');
      }

      return mapped;
    } catch (e) {
      debugPrint('Error fetching recent bills: $e');
      return [];
    }
  }

  // Get all pharmacy bills with pagination and filtering
  static Future<Map<String, dynamic>> getAllBills({
    int page = 1,
    int limit = 20,
    String? searchQuery,
    String? paymentStatus,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      dynamic query = supabase
          .from('billing')
          .select('''
            id,
            bill_number,
            customer_name,
            total,
            payment_method,
            payment_status,
            issued_at,
            created_at,
            billing_item (
              id,
              qty,
              unit_amount,
              total_amount,
              description,
              medicine_id
            )
          ''');

      // Apply filters
      if (searchQuery != null && searchQuery.isNotEmpty) {
        query = query.or('bill_number.ilike.%$searchQuery%,customer_name.ilike.%$searchQuery%');
      }

      if (paymentStatus != null && paymentStatus != 'all') {
        query = query.eq('payment_status', paymentStatus);
      }

      if (startDate != null) {
        query = query.gte('created_at', startDate.toIso8601String());
      }

      if (endDate != null) {
        query = query.lte('created_at', endDate.toIso8601String());
      }

      // Apply order and pagination
      query = query.order('created_at', ascending: false);

      // Get total count for pagination
      dynamic countQuery = supabase
          .from('billing')
          .select('id');

      if (searchQuery != null && searchQuery.isNotEmpty) {
        countQuery = countQuery.or('bill_number.ilike.%$searchQuery%,customer_name.ilike.%$searchQuery%');
      }

      if (paymentStatus != null && paymentStatus != 'all') {
        countQuery = countQuery.eq('payment_status', paymentStatus);
      }

      if (startDate != null) {
        countQuery = countQuery.gte('created_at', startDate.toIso8601String());
      }

      if (endDate != null) {
        countQuery = countQuery.lte('created_at', endDate.toIso8601String());
      }

      final countResult = await countQuery;
      final totalCount = countResult.length;

      // Apply pagination
      final offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      final result = await query;

      final mapped = result.map((row) => {
        'id': row['id'],
        'bill_number': row['bill_number'] ?? 'N/A',
        'patient_name': row['customer_name'] ?? 'Walk-in Customer',
        'total_amount': row['total'] ?? 0,
        'payment_method': row['payment_method'] ?? 'cash',
        'payment_status': row['payment_status'] ?? 'pending',
        'bill_date': row['issued_at'],
        'created_at': row['created_at'],
        'items': (row['billing_item'] as List<dynamic>? ?? []).map((item) => {
          'id': item['id'],
          'quantity': item['qty'],
          'unit_price': item['unit_amount'],
          'total_amount': item['total_amount'],
          'medicine_name': item['description'] ?? 'Unknown Medicine',
          'medicine_code': '',
        }).toList(),
        'item_count': (row['billing_item'] as List<dynamic>? ?? []).length,
      }).toList();

      return {
        'bills': mapped,
        'total_count': totalCount,
        'current_page': page,
        'total_pages': (totalCount / limit).ceil(),
        'has_more': page * limit < totalCount,
      };
    } catch (e) {
      debugPrint('Error fetching all bills: $e');
      return {
        'bills': [],
        'total_count': 0,
        'current_page': page,
        'total_pages': 0,
        'has_more': false,
      };
    }
  }

  // Get detailed bill information by ID
  static Future<Map<String, dynamic>> getBillDetails(String billId) async {
    try {
      // Note: Do not try to join medications here since the DB has no FK relationship
      // between billing_item.medicine_id and medications.id (per schema cache error).
      // Instead, fetch billing with nested billing_item only (FK on billing_id exists),
      // and rely on the stored description field for display.
      final result = await supabase
          .from('billing')
          .select('''
            *,
            billing_item (
              id,
              qty,
              unit_amount,
              total_amount,
              description,
              medicine_id,
              batch_number,
              expiry_date
            )
          ''')
          .eq('id', billId)
          .single();

      // Transform the data to match our expected format
      final items = (result['billing_item'] as List<dynamic>? ?? []).map((item) => {
        'id': item['id'],
        'quantity': item['qty'],
        'unit_price': item['unit_amount'],
        'total_amount': item['total_amount'],
        // Use description as the primary display name when no FK join is available
        'medicine_name': item['description'] ?? 'Unknown Medicine',
        'medicine_code': '',
        'category': '',
        'manufacturer': '',
        'batch_number': item['batch_number'] ?? '',
        'expiry_date': item['expiry_date'],
      }).toList();

      return {
        'id': result['id'],
        'bill_number': result['bill_number'] ?? result['bill_no'] ?? 'N/A',
        'patient_name': result['customer_name'] ?? 'Walk-in Customer',
        'customer_phone': result['customer_phone'],
        'customer_type': result['customer_type'],
        'total_amount': result['total'] ?? 0,
        'subtotal': result['subtotal'] ?? 0,
        'tax': result['tax'] ?? 0,
        'tax_percent': result['tax_percent'] ?? 0,
        'discount': result['discount'] ?? 0,
        'discount_type': result['discount_type'],
        'discount_value': result['discount_value'],
        'payment_method': result['payment_method'] ?? 'cash',
        'payment_status': result['payment_status'] ?? 'pending',
        'bill_date': result['issued_at'] ?? result['created_at'],
        'created_at': result['created_at'],
        'updated_at': result['updated_at'],
        'items': items,
        'item_count': items.length,
      };
    } catch (e) {
      debugPrint('Error fetching bill details: $e');
      throw Exception('Failed to load bill details: $e');
    }
  }
}
