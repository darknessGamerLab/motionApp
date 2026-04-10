/**
 * Expo, istemciye sızdırılacak env için EXPO_PUBLIC_* öneki ister.
 * Burada .env'deki standart isimleri (SUPABASE_URL vb.) okuyup `extra` ile
 * uygulamaya veriyoruz — böylece .env tarafında "Expo" takısı yok.
 */
// Tek kaynak: kök package.json (app.json ile aynı tut; mağaza versionCode ayrı katman)
const pkg = require('./package.json');

module.exports = ({ config }) => ({
  ...config,
  version: pkg.version,
  extra: {
    ...(config.extra && typeof config.extra === 'object' ? config.extra : {}),
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
});
