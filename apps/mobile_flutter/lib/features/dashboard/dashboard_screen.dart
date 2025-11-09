import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String? userName;
  String? userRole;
  bool isLoading = true;
  String todaysIncome = '₹0';
  String criticalPatients = '0';

  @override
  void initState() {
    super.initState();
    _fetchUserData();
    _fetchDashboardStats();
  }

  Future<void> _fetchUserData() async {
    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      
      if (user != null) {
        // Fetch user data from users table
        final userData = await supabase
            .from('users')
            .select('name, role')
            .eq('auth_id', user.id)
            .maybeSingle();
            
        if (mounted) {
          setState(() {
            if (userData != null) {
              userName = (userData['name'] as String?)?.trim();
              userRole = userData['role'] as String?;
            } else {
              // fallback if no row in users table
              userName = (user.userMetadata?['name'] as String?)?.trim()
                  ?? user.email?.split('@').first
                  ?? 'User';
            }
            isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            userName = 'User';
            isLoading = false;
          });
        }
      }
    } catch (_) {
      final user = Supabase.instance.client.auth.currentUser;
      if (mounted) {
        setState(() {
          userName = user != null
              ? ((user.userMetadata?['name'] as String?)?.trim()
                  ?? user.email?.split('@').first
                  ?? 'User')
              : 'User';
          isLoading = false;
        });
      }
    }
  }

  Future<void> _fetchDashboardStats() async {
    try {
      final supabase = Supabase.instance.client;

      // Fetch today's pharmacy billing total using RPC function (avoids FK validation issues)
      final incomeResult = await supabase.rpc('get_today_pharmacy_income');
      final totalIncome = (incomeResult as num?)?.toDouble() ?? 0.0;

      todaysIncome = '₹${totalIncome.toStringAsFixed(0)}';

      // Fetch critical patients count
      final criticalData = await supabase
          .from('patients')
          .select('id')
          .eq('is_critical', true)
          .eq('status', 'active');

      if (mounted) {
        setState(() {
          criticalPatients = criticalData.length.toString();
        });
      }
    } catch (e) {
      // Keep default values on error
      if (mounted) {
        setState(() {
          todaysIncome = '₹0';
          criticalPatients = '0';
        });
      }
    }
  }

  Future<void> _logout() async {
    try {
      await Supabase.instance.client.auth.signOut();
      if (mounted) {
        context.go('/login');
      }
    } catch (e) {
      // Show error if logout fails
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to logout. Please try again.'),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  Future<void> _refreshDashboardData() async {
    setState(() {
      todaysIncome = 'Loading...';
      criticalPatients = '...';
    });

    await _fetchDashboardStats();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Dashboard data refreshed'),
          duration: Duration(seconds: 2),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    }
  }

  String _formatUserName(String? name, String? role) {
    final safe = (name ?? '').trim();
    final display = safe.isEmpty ? 'User' : safe;
    
    // Add title prefix based on role
    String title = '';
    switch ((role ?? '').toLowerCase()) {
      case 'md':
      case 'chief_doctor':
        title = 'Dr. ';
        break;
      case 'doctor':
        title = 'Dr. ';
        break;
      case 'nurse':
        title = 'Nurse ';
        break;
      case 'pharmacist':
        title = 'Pharm. ';
        break;
      case 'admin':
        title = 'Admin ';
        break;
      default:
        title = '';
    }
    
    return '$title$display';
  }

  @override
  Widget build(BuildContext context) {
    final modules = [
      _ModuleCardData(
        title: 'Patients',
        subtitle: 'Manage patient records',
        emoji: '👥',
        color: const Color(0xFF6366F1),
        secondaryColor: const Color(0xFF8B5CF6),
        backgroundPattern: _CardPattern.dots,
        route: '/patients',
        stats: '234 Active',
        gradientAngle: 45.0,
      ),
      _ModuleCardData(
        title: 'Pharmacy',
        subtitle: 'Inventory & prescriptions',
        emoji: '💊',
        color: const Color(0xFF10B981),
        secondaryColor: const Color(0xFF059669),
        backgroundPattern: _CardPattern.waves,
        route: '/pharmacy',
        stats: '89 Items',
        gradientAngle: -45.0,
      ),
      _ModuleCardData(
        title: 'Appointments',
        subtitle: 'Schedule & manage visits',
        emoji: '📅',
        color: const Color(0xFFF59E0B),
        secondaryColor: const Color(0xFFD97706),
        backgroundPattern: _CardPattern.diagonal,
        route: '/appointments',
        stats: '12 Today',
        gradientAngle: 90.0,
      ),
      _ModuleCardData(
        title: 'Lab Reports',
        subtitle: 'Tests & diagnostics',
        emoji: '🔬',
        color: const Color(0xFF3B82F6), // Light blue
        secondaryColor: const Color(0xFF60A5FA), // Lighter blue
        backgroundPattern: _CardPattern.dots, // Match patient card pattern
        route: '/lab',
        stats: '45 Pending',
        gradientAngle: 135.0,
      ),
    ];

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFFF8FAFC),
              Color(0xFFF1F5F9),
              Color(0xFFFEFEFE),
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            stops: [0.0, 0.5, 1.0],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Background decorative elements
              Positioned(
                top: -80,
                right: -80,
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFFFF7A00).withValues(alpha: 0.04),
                        const Color(0xFFFF9500).withValues(alpha: 0.02),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: -60,
                left: -60,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF6366F1).withValues(alpha: 0.03),
                        const Color(0xFF8B5CF6).withValues(alpha: 0.02),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 300,
                left: -40,
                child: Transform.rotate(
                  angle: 0.5,
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      gradient: LinearGradient(
                        colors: [
                          const Color(0xFF10B981).withValues(alpha: 0.04),
                          const Color(0xFF059669).withValues(alpha: 0.02),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              // Main content
              SingleChildScrollView(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Custom App Bar
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Logo without background
                          Image.asset('assets/images/logo.png', height: 36),
                          Row(
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.06),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: IconButton(
                                  onPressed: _refreshDashboardData,
                                  icon: const Icon(Icons.refresh_rounded, color: Color(0xFF6B7280), size: 22),
                                  tooltip: 'Refresh Data',
                                ),
                              ),
                              const SizedBox(width: 16),
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.9),
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.06),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: IconButton(
                                  onPressed: _logout,
                                  icon: const Icon(Icons.logout_rounded, color: Color(0xFF6B7280), size: 22),
                                  tooltip: 'Logout',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 40),

                    // Welcome Section - Modern Orange Card
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF7A00), Color(0xFFFF9500)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFF7A00).withValues(alpha: 0.3),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // User Avatar
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(15),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.3),
                                  width: 2,
                                ),
                              ),
                              child: const Icon(
                                Icons.person_rounded,
                                color: Colors.white,
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 16),
                              // Welcome Text
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Welcome back,',
                                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                            color: Colors.white.withValues(alpha: 0.9),
                                            fontSize: 14,
                                            fontWeight: FontWeight.w500,
                                          ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      isLoading 
                                        ? 'Loading...' 
                                        : _formatUserName(userName, userRole),
                                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 18,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 40),

                    // Quick Stats
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Row(
                        children: [
                          Expanded(
                            child: _StatCard(
                              emoji: '💰',
                              title: 'Today\'s Income',
                              value: todaysIncome,
                              color: const Color(0xFF10B981), // Green
                            ),
                          ),
                          const SizedBox(width: 20),
                          Expanded(
                            child: _StatCard(
                              emoji: '🚨',
                              title: 'Critical Patients',
                              value: criticalPatients,
                              color: const Color(0xFFEF4444), // Red
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 48),

                    // Modules Section Header
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Quick Access',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1F2937),
                                  fontSize: 24,
                                ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE5E7EB),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              'Swipe →',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: const Color(0xFF6B7280),
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Swipeable Module Cards
                    SizedBox(
                      height: 220,
                      child: PageView.builder(
                        controller: PageController(viewportFraction: 0.85),
                        itemCount: modules.length,
                        itemBuilder: (context, index) {
                          final module = modules[index];
                          return Padding(
                            padding: EdgeInsets.only(
                              left: index == 0 ? 24 : 12,
                              right: index == modules.length - 1 ? 24 : 12,
                            ),
                            child: _ModuleCard(data: module),
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 48),

                    // Activity Section
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Recent Activity',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1F2937),
                                  fontSize: 24,
                                ),
                          ),
                          const SizedBox(height: 24),
                          _ActivityCard(
                            emoji: '👤',
                            title: 'New patient registered',
                            subtitle: 'John Doe - 5 mins ago',
                            color: const Color(0xFF10B981),
                            time: '5m',
                          ),
                          const SizedBox(height: 16),
                          _ActivityCard(
                            emoji: '💊',
                            title: 'Prescription completed',
                            subtitle: 'Patient ID: P-1234 - 15 mins ago',
                            color: const Color(0xFF3B82F6),
                            time: '15m',
                          ),
                          const SizedBox(height: 16),
                          _ActivityCard(
                            emoji: '📋',
                            title: 'Lab results available',
                            subtitle: 'Blood work completed - 1 hour ago',
                            color: const Color(0xFFF59E0B),
                            time: '1h',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _CardPattern { dots, waves, diagonal, grid }

class _ModuleCardData {
  final String title;
  final String subtitle;
  final String emoji;
  final Color color;
  final Color secondaryColor;
  final _CardPattern backgroundPattern;
  final String route;
  final String stats;
  final double gradientAngle;
  
  _ModuleCardData({
    required this.title,
    required this.subtitle,
    required this.emoji,
    required this.color,
    required this.secondaryColor,
    required this.backgroundPattern,
    required this.route,
    required this.stats,
    required this.gradientAngle,
  });
}

class _StatCard extends StatelessWidget {
  final String emoji;
  final String title;
  final String value;
  final Color color;
  
  const _StatCard({
    required this.emoji,
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 20)),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF6B7280),
                  fontWeight: FontWeight.w500,
                ),
          ),
        ],
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  final _ModuleCardData data;
  const _ModuleCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go(data.route),
      child: IntrinsicHeight(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            gradient: LinearGradient(
              colors: [data.color, data.secondaryColor],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              transform: GradientRotation(data.gradientAngle * 3.14159 / 180),
            ),
            boxShadow: [
              BoxShadow(
                color: data.color.withValues(alpha: 0.4),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
              BoxShadow(
                color: data.secondaryColor.withValues(alpha: 0.2),
                blurRadius: 40,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Background Pattern
              Positioned.fill(
                child: CustomPaint(
                  painter: _PatternPainter(data.backgroundPattern, data.color.withValues(alpha: 0.1)),
                ),
              ),
              
              // Decorative Elements
              Positioned(
                top: -40,
                right: -40,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
              ),
              Positioned(
                bottom: -30,
                left: -30,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                ),
              ),

              // Content - Full height column
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header with Emoji and Stats
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            data.emoji,
                            style: const TextStyle(fontSize: 24),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            data.stats,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Title and Subtitle at bottom
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          data.title,
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                fontSize: 18,
                                height: 1.1,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          data.subtitle,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Open',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Icon(
                                Icons.arrow_forward_rounded,
                                color: Colors.white,
                                size: 14,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PatternPainter extends CustomPainter {
  final _CardPattern pattern;
  final Color color;
  
  _PatternPainter(this.pattern, this.color);
  
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
      
    switch (pattern) {
      case _CardPattern.dots:
        _drawDots(canvas, size, paint);
        break;
      case _CardPattern.waves:
        _drawWaves(canvas, size, paint);
        break;
      case _CardPattern.diagonal:
        _drawDiagonal(canvas, size, paint);
        break;
      case _CardPattern.grid:
        _drawGrid(canvas, size, paint);
        break;
    }
  }
  
  void _drawDots(Canvas canvas, Size size, Paint paint) {
    final spacing = 20.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.5, paint);
      }
    }
  }
  
  void _drawWaves(Canvas canvas, Size size, Paint paint) {
    final path = Path();
    final waveHeight = 8.0;
    final waveWidth = 30.0;
    
    for (double y = 0; y < size.height; y += 20) {
      path.moveTo(0, y);
      for (double x = 0; x < size.width; x += waveWidth) {
        path.quadraticBezierTo(
          x + waveWidth / 2, y - waveHeight,
          x + waveWidth, y
        );
      }
      canvas.drawPath(path, paint);
      path.reset();
    }
  }
  
  void _drawDiagonal(Canvas canvas, Size size, Paint paint) {
    final spacing = 15.0;
    for (double i = -size.height; i < size.width; i += spacing) {
      canvas.drawLine(
        Offset(i, 0),
        Offset(i + size.height, size.height),
        paint
      );
    }
  }
  
  void _drawGrid(Canvas canvas, Size size, Paint paint) {
    final spacing = 25.0;
    
    // Horizontal lines
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
    
    // Vertical lines
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ActivityCard extends StatelessWidget {
  final String emoji;
  final String title;
  final String subtitle;
  final Color color;
  final String time;
  
  const _ActivityCard({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Text(
                emoji,
                style: const TextStyle(fontSize: 22),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF1F2937),
                              fontSize: 16,
                            ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F4F6),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        time,
                        style: TextStyle(
                          color: const Color(0xFF6B7280),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: const Color(0xFF6B7280),
                        fontSize: 14,
                      ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: const Color(0xFFD1D5DB),
            size: 24,
          ),
        ],
      ),
    );
  }
}
