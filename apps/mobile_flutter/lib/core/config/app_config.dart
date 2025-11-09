import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppConfig {
  final String supabaseUrl;
  final String supabaseAnonKey;

  const AppConfig({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
  });

  static Future<AppConfig> load() async {
    // Load .env (defaults to .env.dev if present). You can swap file per flavor later.
    try {
      await dotenv.load(fileName: '.env.dev');
    } catch (_) {
      // fallback to default .env if .env.dev doesn't exist
      try {
        await dotenv.load(fileName: '.env');
      } catch (_) {}
    }
    String url = '';
    String key = '';
    if (dotenv.isInitialized) {
      url = dotenv.maybeGet('SUPABASE_URL') ?? '';
      key = dotenv.maybeGet('SUPABASE_ANON_KEY') ?? '';
    }
    return AppConfig(supabaseUrl: url, supabaseAnonKey: key);
  }

  bool get isValid => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}

Future<void> initSupabase(AppConfig config) async {
  await Supabase.initialize(
    url: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
  );
}
