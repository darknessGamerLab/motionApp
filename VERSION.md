# Motion App - Versiyon Geçmişi

## Version 1.0.0 - İlk Stabil Versiyon

**Tarih:** 2025-12-04

### Özellikler

✅ **3 Ana Sayfa**
- Create Screen (Sayfa 0)
- Home Screen (Sayfa 1) - Video player
- Me Screen (Sayfa 2)

✅ **Gesture Sistemi**
- Yatay kaydırma: Sayfalar arası geçiş (Create ↔ Home ↔ Me)
- Dikey kaydırma: Home ekranında videolar arası geçiş
- Direction Lock: İlk 15px hareket sırasında yön belirlenir ve kilitlenir
- Flick gesture: Hızlı kaydırmada otomatik sayfa/video değişimi

✅ **Video Player**
- Fullscreen video player
- Tek video player instance, sadece kaynak değişir
- Sayfa inaktif olduğunda video durur
- Sayfa aktif olduğunda video kaldığı yerden devam eder
- Video pozisyonları kaydedilir

✅ **Animasyonlar**
- Spring animasyonları (damping: 25, stiffness: 120, mass: 0.8)
- Smooth sayfa geçişleri
- Smooth video geçişleri

✅ **Layout**
- Her sayfa tam ekran
- Sayfalar birbirinden bağımsız
- Android edge-to-edge desteği
- Status bar translucent

### Teknik Detaylar

**Ana Bileşenler:**
- `MainPager.tsx` - Yatay sayfa geçişleri
- `VerticalVideoPager.tsx` - Dikey video geçişleri
- `HomeScreen.tsx` - Ana video ekranı
- `CreateScreen.tsx` - Oluşturma ekranı
- `MeScreen.tsx` - Profil ekranı
- `useDirectionLock.ts` - Gesture direction lock hook

**Kullanılan Teknolojiler:**
- Expo ~54.0.25
- React Native 0.81.5
- react-native-reanimated ~4.1.1
- react-native-gesture-handler ~2.28.0
- expo-av ~15.0.1

**Önemli Notlar:**
- Root layout'ta tek bir gesture handler tüm gesture'ları yönetir
- Direction lock root seviyesinde uygulanır
- Video pozisyonları `videoPositions` ref'inde saklanır
- Sayfa aktif/pasif durumu `useAnimatedReaction` ile takip edilir

---

## Versiyon 1'e Geri Dönme

Bu versiyona geri dönmek için:
1. Bu dosyayı referans al
2. Ana dosyaları kontrol et:
   - `app/_layout.tsx`
   - `components/MainPager.tsx`
   - `components/VerticalVideoPager.tsx`
   - `app/HomeScreen.tsx`
   - `app/CreateScreen.tsx`
   - `app/MeScreen.tsx`
   - `hooks/useDirectionLock.ts`

