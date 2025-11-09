import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';

import '../../features/auth/login_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/patients/patients_screen.dart';
import '../../features/pharmacy/pharmacy_screen.dart';
import '../../features/pharmacy/billing_history_screen.dart';
import '../../features/pharmacy/bill_details_screen.dart';

class _AuthRefresh extends ChangeNotifier {
  late final StreamSubscription _sub;

  _AuthRefresh() {
    _sub = Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}

class AppRouter {
  AppRouter._();
  static final AppRouter instance = AppRouter._();

  final _authRefresh = _AuthRefresh();

  late final GoRouter router = GoRouter(
    initialLocation: '/login',
    refreshListenable: _authRefresh,
    redirect: (context, state) {
      final session = Supabase.instance.client.auth.currentSession;
      final loggingIn = state.uri.toString().startsWith('/login');
      if (session == null && !loggingIn) return '/login';
      if (session != null && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const DashboardScreen(),
        routes: [
          GoRoute(
            path: 'patients',
            builder: (context, state) => const PatientsScreen(),
          ),
          GoRoute(
            path: 'pharmacy',
            builder: (context, state) => const PharmacyScreen(),
            routes: [
              GoRoute(
                path: 'billing',
                builder: (context, state) => const BillingHistoryScreen(),
              ),
              GoRoute(
                path: 'bill/:billId',
                builder: (context, state) => BillDetailsScreen(
                  billId: state.pathParameters['billId']!,
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
    ],
  );
}
