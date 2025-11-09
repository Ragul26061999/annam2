import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../core/services/pharmacy_service.dart';

class BillDetailsScreen extends StatefulWidget {
  final String billId;

  const BillDetailsScreen({super.key, required this.billId});

  @override
  State<BillDetailsScreen> createState() => _BillDetailsScreenState();
}

class _BillDetailsScreenState extends State<BillDetailsScreen> {
  Map<String, dynamic>? billDetails;
  bool isLoading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _loadBillDetails();
  }

  Future<void> _loadBillDetails() async {
    setState(() => isLoading = true);
    try {
      // Get bill details from the billing table with items
      final result = await PharmacyService.getBillDetails(widget.billId);
      setState(() {
        billDetails = result;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        errorMessage = e.toString();
        isLoading = false;
      });
      debugPrint('Error loading bill details: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF10B981)),
            )
          : errorMessage != null
              ? _buildErrorView()
              : billDetails != null
                  ? _buildBillDetailsView()
                  : _buildEmptyView(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            'Failed to load bill details',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.red,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            errorMessage ?? 'Unknown error occurred',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadBillDetails,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.receipt_long, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'Bill not found',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'The requested bill could not be found',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillDetailsView() {
    final bill = billDetails!;
    final items = bill['items'] as List<dynamic>? ?? [];
    final DateTime createdAt = () {
      final v = bill['created_at'];
      if (v is String) return DateTime.tryParse(v) ?? DateTime.now();
      return DateTime.now();
    }();
    final DateTime billDate = () {
      final v = bill['bill_date'];
      if (v is String) return DateTime.tryParse(v) ?? createdAt;
      return createdAt;
    }();

    return CustomScrollView(
      slivers: [
        // App Bar
        SliverAppBar(
          pinned: true,
          floating: false,
          snap: false,
          elevation: 0,
          backgroundColor: Colors.white,
          centerTitle: true,
          toolbarHeight: 64,
          leading: IconButton(
            onPressed: () => context.go('/pharmacy/billing'),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF111827), size: 20),
          ),
          title: Text(
            'Bill #${bill['bill_number'] ?? 'N/A'}',
            style: const TextStyle(
              color: Color(0xFF111827),
              fontWeight: FontWeight.w800,
              fontSize: 20,
              letterSpacing: -0.2,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          actions: [
            IconButton(
              onPressed: () => _printBill(bill),
              icon: const Icon(Icons.print_rounded, color: Color(0xFF6B7280)),
              tooltip: 'Print Bill',
            ),
            IconButton(
              onPressed: () => _shareBill(bill),
              icon: const Icon(Icons.share_rounded, color: Color(0xFF6B7280)),
              tooltip: 'Share Bill',
            ),
            const SizedBox(width: 8),
          ],
        ),

        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Bill Header Card
              Padding(
                padding: const EdgeInsets.all(20),
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF10B981), Color(0xFF059669)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                              Text(
                                'Bill #${bill['bill_number'] ?? 'N/A'}',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                DateFormat('MMM dd, yyyy • hh:mm a').format(billDate),
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              ],
                            ),
                          ),
                          Flexible(
                            child: Align(
                              alignment: Alignment.topRight,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: _StatusBadge(status: bill['payment_status'] ?? 'pending'),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total Amount',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.white.withValues(alpha: 0.9),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '₹${(bill['total_amount'] as num?)?.toStringAsFixed(2) ?? '0.00'}',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.receipt_long_rounded,
                              color: Colors.white,
                              size: 32,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Customer Information
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.person_rounded,
                              color: Color(0xFF10B981),
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'Customer Information',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF111827),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _InfoRow(
                        icon: Icons.person_outline,
                        label: 'Name',
                        value: bill['patient_name'] ?? 'Walk-in Customer',
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(
                        icon: Icons.payment_rounded,
                        label: 'Payment Method',
                        value: (bill['payment_method'] ?? 'cash').toUpperCase(),
                      ),
                      const SizedBox(height: 12),
                      _InfoRow(
                        icon: Icons.access_time_rounded,
                        label: 'Bill Date',
                        value: DateFormat('EEEE, MMM dd, yyyy • hh:mm a').format(billDate),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Items Section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Items',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF111827),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE5E7EB),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${items.length} item${items.length == 1 ? '' : 's'}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ...items.map((item) => _buildItemCard(item)),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Bill Summary
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Column(
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.calculate_rounded, color: Color(0xFF10B981), size: 20),
                          SizedBox(width: 12),
                          Text(
                            'Bill Summary',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF111827),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _SummaryRow(
                        label: 'Subtotal',
                        value: _calculateSubtotal(items),
                      ),
                      if (((bill['tax'] as num?)?.toDouble() ?? 0) > 0) ...[
                        const SizedBox(height: 8),
                        _SummaryRow(
                          label: 'Tax (${bill['tax_percent'] ?? 0}%)',
                          value: (bill['tax'] as num?)?.toDouble() ?? 0,
                        ),
                      ],
                      if (((bill['discount'] as num?)?.toDouble() ?? 0) > 0) ...[
                        const SizedBox(height: 8),
                        _SummaryRow(
                          label: 'Discount',
                          value: -((bill['discount'] as num?)?.toDouble() ?? 0),
                        ),
                      ],
                      const Divider(height: 24),
                      _SummaryRow(
                        label: 'Total Amount',
                        value: (bill['total_amount'] as num?)?.toDouble() ?? 0,
                        isTotal: true,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildItemCard(Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.medication_rounded,
                  color: Color(0xFF10B981),
                  size: 16,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (item['medicine_name'] ?? 'Unknown Medicine').toString(),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF111827),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (() {
                      final code = item['medicine_code'];
                      return code != null && code.toString().isNotEmpty;
                    }())
                      Text(
                        'Code: ${item['medicine_code'].toString()}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${(() { final v = item['total_amount']; return v is num ? v.toStringAsFixed(2) : (v is String ? (double.tryParse(v)?.toStringAsFixed(2) ?? '0.00') : '0.00'); })()}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF10B981),
                    ),
                  ),
                  Text(
                    '${item['quantity']} × ₹${(() { final v = item['unit_price']; return v is num ? v.toStringAsFixed(2) : (v is String ? (double.tryParse(v)?.toStringAsFixed(2) ?? '0.00') : '0.00'); })()}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  double _calculateSubtotal(List<dynamic> items) {
    return items.fold(0.0, (sum, item) => sum + ((item['total_amount'] as num?)?.toDouble() ?? 0));
  }

  void _printBill(Map<String, dynamic> bill) async {
    try {
      // Generate PDF document
      final pdf = pw.Document();
      final items = bill['items'] as List<dynamic>? ?? [];
      final billDate = bill['bill_date'] != null ? DateTime.parse(bill['bill_date']) : DateTime.now();

      pdf.addPage(
        pw.Page(
          build: (pw.Context context) {
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                // Header
                pw.Center(
                  child: pw.Column(
                    children: [
                      pw.Text(
                        'ANNAM PHARMACY',
                        style: pw.TextStyle(
                          fontSize: 24,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Text(
                        '2/301, Raj Kanna Nagar, Veerapandian Patanam',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                      pw.Text(
                        'Tiruchendur - 628002 • Ph.No: 04639-252592',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                      pw.SizedBox(height: 10),
                      pw.Text(
                        'GST: 29ABCDE1234F1Z5',
                        style: const pw.TextStyle(fontSize: 10),
                      ),
                      pw.Divider(),
                    ],
                  ),
                ),

                // Bill Info
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'Bill #: ${bill['bill_number'] ?? 'N/A'}',
                          style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
                        ),
                        pw.Text(
                          'Date: ${DateFormat('dd/MM/yyyy hh:mm a').format(billDate)}',
                          style: const pw.TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          'Customer: ${bill['patient_name'] ?? 'Walk-in'}',
                          style: const pw.TextStyle(fontSize: 12),
                        ),
                        pw.Text(
                          'Payment: ${bill['payment_method'] ?? 'Cash'}',
                          style: const pw.TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),

                pw.SizedBox(height: 20),

                // Items Table
                pw.Text(
                  'Items:',
                  style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 10),

                // Table Header
                pw.Row(
                  children: [
                    pw.Expanded(
                      flex: 3,
                      child: pw.Text(
                        'Item',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
                      ),
                    ),
                    pw.Expanded(
                      flex: 1,
                      child: pw.Text(
                        'Qty',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
                        textAlign: pw.TextAlign.center,
                      ),
                    ),
                    pw.Expanded(
                      flex: 1,
                      child: pw.Text(
                        'Rate',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
                        textAlign: pw.TextAlign.right,
                      ),
                    ),
                    pw.Expanded(
                      flex: 1,
                      child: pw.Text(
                        'Amount',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
                        textAlign: pw.TextAlign.right,
                      ),
                    ),
                  ],
                ),

                pw.Divider(),

                // Items
                ...items.map((item) => pw.Row(
                  children: [
                    pw.Expanded(
                      flex: 3,
                      child: pw.Text(
                        item['medicine_name'] ?? 'Unknown',
                        style: const pw.TextStyle(fontSize: 11),
                      ),
                    ),
                    pw.Expanded(
                      flex: 1,
                      child: pw.Text(
                        '${item['quantity']}',
                        style: const pw.TextStyle(fontSize: 11),
                        textAlign: pw.TextAlign.center,
                      ),
                    ),
                    pw.Expanded(
                      flex: 1,
                      child: pw.Text(
                        '₹${(item['unit_price'] as num?)?.toStringAsFixed(2) ?? '0.00'}',
                        style: const pw.TextStyle(fontSize: 11),
                        textAlign: pw.TextAlign.right,
                      ),
                    ),
                    pw.Expanded(
                      flex: 1,
                      child: pw.Text(
                        '₹${(item['total_amount'] as num?)?.toStringAsFixed(2) ?? '0.00'}',
                        style: const pw.TextStyle(fontSize: 11),
                        textAlign: pw.TextAlign.right,
                      ),
                    ),
                  ],
                )),

                pw.Divider(),

                // Totals
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.end,
                  children: [
                    pw.Container(
                      width: 150,
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.end,
                        children: [
                          if ((((bill['tax'] as num?)?.toDouble() ?? 0)) > 0) ...[
                            pw.Text(
                              'Subtotal: ₹${_calculateSubtotal(items).toStringAsFixed(2)}',
                              style: const pw.TextStyle(fontSize: 12),
                            ),
                            pw.Text(
                              'Tax (${bill['tax_percent'] ?? 0}%): ₹${(bill['tax'] as num?)?.toStringAsFixed(2) ?? '0.00'}',
                              style: const pw.TextStyle(fontSize: 12),
                            ),
                            if ((((bill['discount'] as num?)?.toDouble() ?? 0)) > 0) ...[
                              pw.Text(
                                'Discount: -₹${(bill['discount'] as num?)?.toStringAsFixed(2) ?? '0.00'}',
                                style: const pw.TextStyle(fontSize: 12),
                              ),
                            ],
                            pw.Divider(),
                          ],
                          pw.Text(
                            'TOTAL: ₹${(bill['total_amount'] as num?)?.toStringAsFixed(2) ?? '0.00'}',
                            style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                pw.SizedBox(height: 20),

                // Footer
                pw.Center(
                  child: pw.Column(
                    children: [
                      pw.Text(
                        'Thank you for visiting Annam Pharmacy!',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                      pw.Text(
                        'Status: ${bill['payment_status']?.toString().toUpperCase() ?? 'PENDING'}',
                        style: pw.TextStyle(
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 10),
                      pw.Text(
                        'Generated on ${DateFormat('dd/MM/yyyy hh:mm a').format(DateTime.now())}',
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      );

      // Print the PDF
      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => pdf.save(),
        name: 'Bill_${bill['bill_number'] ?? 'N/A'}',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bill sent to printer successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error printing bill: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to print bill: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _shareBill(Map<String, dynamic> bill) async {
    try {
      final items = bill['items'] as List<dynamic>? ?? [];
      final billDate = bill['bill_date'] != null ? DateTime.parse(bill['bill_date']) : DateTime.now();

      // Format bill data for sharing
      final billText = '''
🏥 ANNAM PHARMACY BILL
📄 Bill #: ${bill['bill_number'] ?? 'N/A'}

👤 Customer: ${bill['patient_name'] ?? 'Walk-in Customer'}
📅 Date: ${DateFormat('MMM dd, yyyy • hh:mm a').format(billDate)}
💳 Payment: ${bill['payment_method'] ?? 'cash'} (${bill['payment_status'] ?? 'pending'})

📋 ITEMS:
${items.map((item) =>
  '• ${item['medicine_name'] ?? 'Unknown'}\n  ${item['quantity']} × ₹${(item['unit_price'] as num?)?.toStringAsFixed(2) ?? '0.00'} = ₹${(item['total_amount'] as num?)?.toStringAsFixed(2) ?? '0.00'}'
).join('\n\n')}

💰 TOTAL: ₹${(bill['total_amount'] as num?)?.toStringAsFixed(2) ?? '0.00'}

Thank you for visiting Annam Pharmacy! 💊
''';

      // Share the bill text
      await Share.share(
        billText.trim(),
        subject: 'Bill #${bill['bill_number'] ?? 'N/A'} from Annam Pharmacy',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bill shared successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error sharing bill: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share bill: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF6B7280)),
        const SizedBox(width: 8),
        Text(
          '$label:',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Color(0xFF6B7280),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF111827),
            ),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final double value;
  final bool isTotal;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isTotal = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w500,
            color: isTotal ? const Color(0xFF111827) : const Color(0xFF6B7280),
          ),
        ),
        Text(
          '${value < 0 ? '-' : ''}₹${value.abs().toStringAsFixed(2)}',
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w500,
            color: isTotal ? const Color(0xFF10B981) : (value < 0 ? Colors.red : const Color(0xFF111827)),
          ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    IconData icon;

    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        backgroundColor = const Color(0xFF10B981);
        textColor = Colors.white;
        icon = Icons.check_circle_rounded;
        break;
      case 'pending':
        backgroundColor = const Color(0xFFF59E0B);
        textColor = Colors.white;
        icon = Icons.schedule_rounded;
        break;
      case 'partial':
        backgroundColor = const Color(0xFF3B82F6);
        textColor = Colors.white;
        icon = Icons.timelapse_rounded;
        break;
      case 'refunded':
        backgroundColor = const Color(0xFFEF4444);
        textColor = Colors.white;
        icon = Icons.undo_rounded;
        break;
      default:
        backgroundColor = const Color(0xFF6B7280);
        textColor = Colors.white;
        icon = Icons.help_outline_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: backgroundColor.withAlpha(77),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: textColor, size: 16),
          const SizedBox(width: 6),
          Text(
            status.toUpperCase(),
            style: TextStyle(
              color: textColor,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
