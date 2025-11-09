import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/services/pharmacy_service.dart';

class BillingHistoryScreen extends StatefulWidget {
  const BillingHistoryScreen({super.key});

  @override
  State<BillingHistoryScreen> createState() => _BillingHistoryScreenState();
}

class _BillingHistoryScreenState extends State<BillingHistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<Map<String, dynamic>> bills = [];
  bool isLoading = true;
  bool isLoadingMore = false;
  String? selectedStatus = 'all';
  DateTime? startDate;
  DateTime? endDate;

  int currentPage = 1;
  int totalPages = 0;
  bool hasMore = false;
  String searchQuery = '';

  final List<String> statusOptions = ['all', 'pending', 'paid', 'completed', 'partial', 'refunded'];

  @override
  void initState() {
    super.initState();
    _loadBills();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadBills({bool loadMore = false}) async {
    if (loadMore && !hasMore) return;

    setState(() {
      if (loadMore) {
        isLoadingMore = true;
      } else {
        isLoading = true;
        currentPage = 1;
      }
    });

    try {
      final pageToLoad = loadMore ? currentPage + 1 : 1;
      final result = await PharmacyService.getAllBills(
        page: pageToLoad,
        limit: 20,
        searchQuery: searchQuery.isEmpty ? null : searchQuery,
        paymentStatus: selectedStatus == 'all' ? null : selectedStatus,
        startDate: startDate,
        endDate: endDate,
      );

      final newBills = result['bills'] as List<Map<String, dynamic>>;

      setState(() {
        if (loadMore) {
          bills.addAll(newBills);
          currentPage = pageToLoad;
        } else {
          bills = newBills;
        }
        totalPages = result['total_pages'] as int;
        hasMore = result['has_more'] as bool;
      });
    } catch (e) {
      debugPrint('Error loading bills: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to load bills. Please try again.'),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      setState(() {
        isLoading = false;
        isLoadingMore = false;
      });
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels == _scrollController.position.maxScrollExtent) {
      _loadBills(loadMore: true);
    }
  }

  void _onSearchChanged(String value) {
    searchQuery = value;
    _debounceSearch();
  }

  void _debounceSearch() {
    // Simple debounce implementation
    Future.delayed(const Duration(milliseconds: 500), () {
      if (searchQuery == _searchController.text) {
        _loadBills();
      }
    });
  }

  void _showFilters() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: const EdgeInsets.all(20),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.8,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Filters',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Payment Status
              const Text(
                'Payment Status',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                children: statusOptions.map((status) {
                  final isSelected = selectedStatus == status;
                  return FilterChip(
                    label: Text(_getStatusDisplayName(status)),
                    selected: isSelected,
                    onSelected: (selected) {
                      setModalState(() {
                        selectedStatus = selected ? status : 'all';
                      });
                    },
                    backgroundColor: isSelected ? const Color(0xFF10B981) : Colors.grey[100],
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : Colors.black87,
                      fontWeight: FontWeight.w500,
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 20),

              // Date Range
              const Text(
                'Date Range',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: _DatePickerButton(
                      label: 'From',
                      date: startDate,
                      onDateSelected: (date) {
                        setModalState(() => startDate = date);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DatePickerButton(
                      label: 'To',
                      date: endDate,
                      onDateSelected: (date) {
                        setModalState(() => endDate = date);
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setModalState(() {
                          selectedStatus = 'all';
                          startDate = null;
                          endDate = null;
                        });
                        setState(() {
                          selectedStatus = 'all';
                          startDate = null;
                          endDate = null;
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF6B7280)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Clear All'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                        _loadBills();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Apply'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getStatusDisplayName(String status) {
    switch (status) {
      case 'all':
        return 'All';
      case 'pending':
        return 'Pending';
      case 'paid':
        return 'Paid';
      case 'completed':
        return 'Completed';
      case 'partial':
        return 'Partial';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        controller: _scrollController,
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
              onPressed: () => context.go('/pharmacy'),
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF111827), size: 20),
            ),
            title: const Text(
              'Billing History',
              style: TextStyle(
                color: Color(0xFF111827),
                fontWeight: FontWeight.w800,
                fontSize: 24,
                letterSpacing: -0.2,
              ),
            ),
            actions: [
              IconButton(
                onPressed: _showFilters,
                icon: const Icon(Icons.filter_list_rounded, color: Color(0xFF6B7280)),
                tooltip: 'Filters',
              ),
              IconButton(
                onPressed: () => _loadBills(),
                icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280)),
                tooltip: 'Refresh',
              ),
              const SizedBox(width: 8),
            ],
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      decoration: const InputDecoration(
                        hintText: 'Search by bill number or customer name',
                        prefixIcon: Icon(Icons.search_rounded, color: Color(0xFF6B7280)),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Results Count
                  if (!isLoading)
                    Text(
                      '${bills.length} ${bills.length == 1 ? 'bill' : 'bills'} found',
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.w500,
                      ),
                    ),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // Bills List
          if (isLoading)
            const SliverFillRemaining(
              child: Center(
                child: CircularProgressIndicator(color: Color(0xFF10B981)),
              ),
            )
          else if (bills.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long_rounded, size: 64, color: Colors.grey[300]),
                    const SizedBox(height: 16),
                    Text(
                      searchQuery.isEmpty ? 'No bills found' : 'No bills match your search',
                      style: const TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  if (index == bills.length) {
                    return isLoadingMore
                        ? const Padding(
                            padding: EdgeInsets.all(16),
                            child: Center(
                              child: CircularProgressIndicator(color: Color(0xFF10B981)),
                            ),
                          )
                        : const SizedBox.shrink();
                  }

                  final bill = bills[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                    child: _BillCard(bill: bill),
                  );
                },
                childCount: bills.length + (hasMore ? 1 : 0),
              ),
            ),
        ],
      ),
    );
  }
}

class _BillCard extends StatelessWidget {
  final Map<String, dynamic> bill;

  const _BillCard({required this.bill});

  @override
  Widget build(BuildContext context) {
    final createdAt = DateTime.parse(bill['created_at']);
    final formatter = DateFormat('MMM dd, yyyy • hh:mm a');
    final amount = (bill['total_amount'] as num?)?.toDouble() ?? 0.0;
    final itemCount = bill['item_count'] as int? ?? 0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
      ),
      child: InkWell(
        onTap: () => context.go('/pharmacy/bill/${bill['id']}'),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(16),
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
                          bill['bill_number'] ?? 'N/A',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          bill['patient_name'] ?? 'Walk-in Customer',
                          style: const TextStyle(
                            fontSize: 14,
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
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF10B981),
                        ),
                      ),
                      const SizedBox(height: 4),
                      _StatusBadge(status: bill['payment_status'] ?? 'pending'),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 12),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded, size: 16, color: Color(0xFF6B7280)),
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
                      const Icon(Icons.shopping_cart_rounded, size: 16, color: Color(0xFF6B7280)),
                      const SizedBox(width: 4),
                      Text(
                        '$itemCount ${itemCount == 1 ? 'item' : 'items'}',
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

class _DatePickerButton extends StatelessWidget {
  final String label;
  final DateTime? date;
  final Function(DateTime?) onDateSelected;

  const _DatePickerButton({
    required this.label,
    required this.date,
    required this.onDateSelected,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () async {
        final pickedDate = await showDatePicker(
          context: context,
          initialDate: date ?? DateTime.now(),
          firstDate: DateTime(2020),
          lastDate: DateTime.now(),
        );
        onDateSelected(pickedDate);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE5E7EB)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                date != null ? DateFormat('MMM dd, yyyy').format(date!) : label,
                style: TextStyle(
                  color: date != null ? const Color(0xFF111827) : const Color(0xFF6B7280),
                  fontSize: 14,
                ),
              ),
            ),
            const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF6B7280)),
          ],
        ),
      ),
    );
  }
}
