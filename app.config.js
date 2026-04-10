/**
 * Expo, istemciye sızdırılacak env için EXPO_PUBLIC_* öneki ister.
 * Burada .env'deki standart isimleri (SUPABASE_URL vb.) okuyup `extra` ile
 * uygulamaya veriyoruz — böylece .env tarafında "Expo" takısı yok.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra && typeof config.extra === 'object' ? config.extra : {}),
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
});
