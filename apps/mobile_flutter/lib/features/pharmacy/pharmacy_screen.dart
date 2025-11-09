import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/services/pharmacy_service.dart';

class PharmacyScreen extends StatefulWidget {
  const PharmacyScreen({super.key});

  @override
  State<PharmacyScreen> createState() => _PharmacyScreenState();
}

class _PharmacyScreenState extends State<PharmacyScreen> {
  Map<String, dynamic> stats = {};
  List<Map<String, dynamic>> medications = [];
  List<Map<String, dynamic>> recentBills = [];
  List<Map<String, dynamic>> filteredBills = [];
  bool isLoading = true;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => isLoading = true);
    try {
      final [statsData, medsData, billsData] = await Future.wait([
        PharmacyService.getDashboardStats(),
        PharmacyService.getMedications(),
        PharmacyService.getRecentBills(limit: 5),
      ]);
      setState(() {
        stats = statsData as Map<String, dynamic>;
        medications = (medsData as List).cast<Map<String, dynamic>>().take(6).toList();
        recentBills = (billsData as List).cast<Map<String, dynamic>>();
        filteredBills = recentBills;
      });
    } catch (e) {
      debugPrint('Error loading pharmacy data: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }

  void _onSearchChanged() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        filteredBills = recentBills;
      } else {
        filteredBills = recentBills.where((bill) {
          final billNumber = (bill['bill_number'] ?? '').toString().toLowerCase();
          final patientName = (bill['patient_name'] ?? bill['customer_name'] ?? '').toString().toLowerCase();
          return billNumber.contains(query) || patientName.contains(query);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  pinned: true,
                  floating: false,
                  snap: false,
                  elevation: 0,
                  backgroundColor: Colors.white,
                  centerTitle: true,
                  toolbarHeight: 64,
                  leading: IconButton(
                    onPressed: () => context.go('/'),
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF111827), size: 20),
                  ),
                  title: const Text(
                    'Pharmacy',
                    style: TextStyle(
                      color: Color(0xFF111827),
                      fontWeight: FontWeight.w800,
                      fontSize: 26,
                      letterSpacing: -0.2,
                    ),
                  ),
                  actions: [
                    IconButton(
                      onPressed: _loadData,
                      icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280)),
                      tooltip: 'Refresh',
                    ),
                    const SizedBox(width: 8),
                  ],
                ),
                SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 8),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Row(
                          children: [
                            Expanded(
                              child: _ModernStatCard(
                                title: 'Total Medicines',
                                value: '${stats['totalMedications'] ?? 0}',
                                icon: Icons.medication_rounded,
                                gradient: const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: _ModernStatCard(
                                title: 'Low Stock',
                                value: '${stats['lowStockCount'] ?? 0}',
                                icon: Icons.warning_amber_rounded,
                                gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFF97316)]),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Quick Actions', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(child: _ModernActionCard(title: 'Add Medicine', icon: Icons.add_circle_outline_rounded, color: const Color(0xFF10B981), onTap: () => context.go('/pharmacy/add-medicine'))),
                                const SizedBox(width: 12),
                                Expanded(child: _ModernActionCard(title: 'Inventory', icon: Icons.inventory_2_outlined, color: const Color(0xFF6366F1), onTap: () => context.go('/pharmacy/inventory'))),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Recent Billing', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                            TextButton.icon(
                              onPressed: () => context.go('/pharmacy/billing'),
                              icon: const Text('View All', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w600, fontSize: 14)),
                              label: const Icon(Icons.arrow_forward_ios_rounded, color: Color(0xFF10B981), size: 14),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                          ),
                          child: TextField(
                            controller: _searchController,
                            decoration: const InputDecoration(
                              hintText: 'Search bills...',
                              prefixIcon: Icon(Icons.search_rounded, color: Color(0xFF6B7280)),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (filteredBills.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(40),
                          child: Center(
                            child: Column(
                              children: [
                                Icon(Icons.receipt_long_rounded, size: 64, color: Colors.grey[300]),
                                const SizedBox(height: 16),
                                Text('No recent bills', style: TextStyle(color: Colors.grey[600], fontSize: 16, fontWeight: FontWeight.w500)),
                              ],
                            ),
                          ),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          itemCount: filteredBills.length,
                          itemBuilder: (context, index) => _RecentBillCard(bill: filteredBills[index]),
                        ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _RecentBillCard extends StatelessWidget {
  final Map<String, dynamic> bill;
  const _RecentBillCard({required this.bill});

  @override
  Widget build(BuildContext context) {
    final dynamic amountRaw = bill['total_amount'] ?? bill['grand_total'] ?? bill['amount'] ?? bill['subtotal'];
    final double amount = amountRaw is num
        ? amountRaw.toDouble()
        : (amountRaw is String ? double.tryParse(amountRaw) ?? 0 : 0);

    final DateTime createdAt = () {
      final v = bill['created_at'];
      if (v is String) {
        return DateTime.tryParse(v) ?? DateTime.now();
      }
      return DateTime.now();
    }();
    final formatter = DateFormat('MMM dd, hh:mm a');
    final billNumber = bill['bill_number'] ?? 'N/A';
    final paymentStatus = bill['payment_status'] ?? 'pending';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
      ),
      child: InkWell(
        onTap: () => context.go('/pharmacy/bill/${bill['id']}'),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
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
                          billNumber,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          (bill['patient_name'] ?? bill['customer_name'] ?? 'Walk-in Customer').toString(),
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '₹${amount.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF10B981),
                        ),
                      ),
                      const SizedBox(height: 4),
                      _StatusBadge(status: paymentStatus),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded, size: 14, color: Color(0xFF6B7280)),
                      const SizedBox(width: 4),
                      Text(
                        formatter.format(createdAt),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.payment_rounded, size: 14, color: Color(0xFF6B7280)),
                      const SizedBox(width: 4),
                      Text(
                        ((bill['payment_method'] ?? 'cash').toString()).toUpperCase(),
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
        ),
      ),
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

    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        backgroundColor = const Color(0xFF10B981);
        textColor = Colors.white;
        break;
      case 'pending':
        backgroundColor = const Color(0xFFF59E0B);
        textColor = Colors.white;
        break;
      case 'partial':
        backgroundColor = const Color(0xFF3B82F6);
        textColor = Colors.white;
        break;
      case 'refunded':
        backgroundColor = const Color(0xFFEF4444);
        textColor = Colors.white;
        break;
      default:
        backgroundColor = const Color(0xFF6B7280);
        textColor = Colors.white;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: textColor,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _ModernStatCard extends StatelessWidget {
  final String title, value;
  final IconData icon;
  final Gradient gradient;
  const _ModernStatCard({required this.title, required this.value, required this.icon, required this.gradient});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: gradient.colors.first.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 6))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: Colors.white, size: 24)),
          const SizedBox(height: 16),
          Text(value, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, height: 1)),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.9), fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _ModernActionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ModernActionCard({required this.title, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withValues(alpha: 0.2), width: 1.5), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))]),
          child: Column(
            children: [
              Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)), child: Icon(icon, color: color, size: 28)),
              const SizedBox(height: 12),
              Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
            ],
          ),
        ),
      ),
    );
  }
}

