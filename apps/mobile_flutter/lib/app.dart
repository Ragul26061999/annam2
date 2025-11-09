import 'package:flutter/material.dart';
import 'core/routing/app_router.dart';

class AnnamHmsApp extends StatelessWidget {
  const AnnamHmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    final router = AppRouter.instance.router;

    final colorScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFFF7A00), // Orange accent to match web theme
      brightness: Brightness.light,
    );

    final theme = ThemeData(
      colorScheme: colorScheme,
      useMaterial3: true,
      scaffoldBackgroundColor: Colors.white,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: colorScheme.primary,
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );

    return MaterialApp.router(
      title: 'Annam HMS',
      theme: theme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
