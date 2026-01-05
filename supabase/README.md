# Supabase Kurulum Rehberi

## 📋 Adım 1: Database Schema

1. Supabase Dashboard'a git: https://supabase.com/dashboard
2. Projeyi seç: `mhgxrzejobmkuwylyelx`
3. Sol menüden **SQL Editor** seç
4. **New query** tıkla
5. `schema.sql` dosyasının içeriğini yapıştır
6. **Run** butonuna tıkla

## 📦 Adım 2: Storage Buckets

1. SQL Editor'de yeni query oluştur
2. `storage.sql` dosyasının içeriğini yapıştır
3. **Run** butonuna tıkla

## 🔐 Adım 3: Auth Ayarları

### Email/Password Authentication
1. Sol menüden **Authentication** > **Providers** seç
2. **Email** provider'ın açık olduğundan emin ol
3. Ayarlar:
   - ✅ Enable Email Signup
   - ✅ Enable Email Confirmations (opsiyonel, test için kapatabilirsin)

### Google Sign-In
1. **Authentication** > **Providers** > **Google**
2. **Enable Sign in with Google** aç
3. Google Cloud Console'dan:
   - OAuth 2.0 Client ID oluştur
   - Client ID ve Client Secret'ı buraya gir
4. Authorized redirect URI: `https://mhgxrzejobmkuwylyelx.supabase.co/auth/v1/callback`

### Apple Sign-In
1. **Authentication** > **Providers** > **Apple**
2. **Enable Sign in with Apple** aç
3. Apple Developer Console'dan:
   - Service ID oluştur
   - Private Key oluştur
4. Gerekli bilgileri gir

## ✅ Kontrol Listesi

- [ ] schema.sql çalıştırıldı
- [ ] storage.sql çalıştırıldı
- [ ] Email auth aktif
- [ ] Google auth aktif (opsiyonel)
- [ ] Apple auth aktif (opsiyonel)
- [ ] Storage bucket'ları oluşturuldu (avatars, videos)

## 🧪 Test

Dashboard'da şunları kontrol et:

1. **Table Editor** - 8 tablo görünmeli:
   - profiles
   - videos
   - likes
   - saves
   - comments
   - follows
   - notifications
   - radar

2. **Storage** - 2 bucket görünmeli:
   - avatars
   - videos

3. **Authentication** - Provider'lar aktif olmalı

## 🚨 Sorun Giderme

### "relation already exists" hatası
- Normal, tablo zaten varsa bu hatayı verir
- `DROP TABLE IF EXISTS table_name CASCADE;` ile önce sil

### RLS politikaları çalışmıyor
- Tablo'nun RLS'i açık mı kontrol et
- `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`

### Storage upload çalışmıyor
- Bucket public mi kontrol et
- Storage politikaları doğru mu kontrol et

