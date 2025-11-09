import 'package:flutter/material.dart';
import 'core/config/app_config.dart';
import 'app.dart';

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  final config = await AppConfig.load();
  assert(config.isValid, 'Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.dev');

  await initSupabase(config);

  runApp(const AnnamHmsApp());
}
