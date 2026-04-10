# 🏢 motionApp Tam Mimari ve Dosya Yapısı Raporu

motionApp, **React Native (Expo Managed Workflow)** üzerine kurgulanmış, modüler, ölçeklenebilir ve yüksek performanslı bir video paylaşım platformudur. Uygulama, dosya yapısından da anlaşılacağı üzere profesyonel bir **Layered Architecture (Katmanlı Mimari)** kullanmaktadır.

---

## 🗺️ 1. Yönlendirme ve Sayfalar (`app/`)
Bu klasör, **Expo Router v3 (File-based Routing)** kullanır. Sayfalar arası geçişler ve navigation yapısı buradaki dosya hiyerarşisine göre otomatik oluşur.

- `index.tsx`: Uygulamanın ana giriş noktası (genelde Auth kontrolü yapılır).
- `_layout.tsx`: Root Layout; tüm sayfaların üzerinde duran Header, Tab Bar ve Provider'ların (Toast, Alert vb.) tanımlandığı yer.
- **📱 Ana Ekranlar:**
  - `HomeScreen.tsx`: Video feed (akış) sayfası.
  - `CreateScreen.tsx`: Video çekme ve kayıt ekranı.
  - `InspirationScreen.tsx`: Keşfet/İlham al sayfası.
  - `NotificationsScreen.tsx`: Bildirimler listesi.
  - `MeScreen.tsx`: Kişisel profil ve istatistik sayfası.
  - `SettingsScreen.tsx`: Uygulama ayarları.
  - `UserProfileScreen.tsx`: Diğer kullanıcıların profil detayları.
  - `EditProfileScreen.tsx`: Profil düzenleme formu.
- **🔐 Kimlik Doğrulama (`app/auth/`):**
  - `login.tsx`, `signup.tsx`, `forgotPassword.tsx`, `verifyCode.tsx`, `selectTalent.tsx`.
- **📹 Video Detay (`app/video/`):**
  - `[id].tsx`: Dinamik video izleme ve detay sayfası.
- **⚖️ Yasal Metinler (`app/legal/`):**
  - `kvkk.tsx`, `privacy.tsx`, `terms.tsx`.

---

## 🎨 2. UI Bileşenleri (`components/`)
Sayfalarda kullanılan tekrar kullanılabilir (Reusable) atomik ve moleküler UI elemanları.

- **Etkileşim:** `ActionBtn.tsx`, `FollowButton.tsx`, `CommentsModal.tsx`.
- **Görsel:** `ProfilePhotoCarousel.tsx`, `ProfileTabGrid.tsx`, `SkeletonLoader.tsx`.
- **Yönetim:** `ErrorBoundary.tsx` (Hata yakalayıcı), `GlobalAlert.tsx`, `GuestAuthModal.tsx`.
- **Video UI:** `VideoPlayerModal.tsx`, `VideoProgressBar.tsx`, `CustomCropper.tsx`.

---

## 🧠 3. Mantık ve Veri Yönetimi
Bu katman, uygulamanın "beyni"dir; veri çekme, cache yönetimi ve iş kurallarını barındırır.

### **⚡ Servis Katmanı (`services/`)**
API çağrılarının ve iş mantığının (Business Logic) kapsüllendiği yer.
- `videoService.ts`, `profileService.ts`, `interactionService.ts`.

### **⚙️ Çekirdek Kütüphaneler (`lib/`)**
Dış kütüphanelerin konfigürasyonları.
- `supabase.ts`: Supabase istemci (client) kurulumu.
- `queryCache.ts`: Verilerin önbelleğe alınması ve el sıkışması.
- `eventBus.ts`: Bileşenler arası iletişim köprüsü.

### **🎣 Custom Hooks (`hooks/`)**
Karmaşık mantıkları sadeleştiren React kancaları.
- `useFeed.ts`: Video akışını yöneten devasa motor.
- `useVideoPlayer.ts`, `useVideoActions.ts`, `useProfile.ts`.
- `usePushNotifications.ts`, `useDebounce.ts`, `useDirectionLock.ts`.

### **🌐 Context Providers (`contexts/`)**
Uygulama genelinde paylaşılan durumlar (Global State).
- `AuthContext.tsx`: Kullanıcı oturum, login/logout ve Session yönetimi.
- `ThemeContext.tsx`: Dark/Light mode yönetimi.

---

## 🏗️ 4. Konfigürasyon ve Altyapı

- **`app.json`**: Uygulamanın adı, ikonu, native izinleri (Kamera, Mikrofon) ve Expo pluginlerinin kalbi.
- **`package.json`**: Kullanılan tüm kütüphaneler ve kontrol scriptleri.
- **`tsconfig.json`**: TypeScript kuralları ve dizin kısayolları (`@/*`).
- **`metro.config.js`**: React Native paketleme (bundler) ayarları.
- **`plugins/`**: Uygulamaya özel yazılmış native müdahaleler (Örn: `withNotifeeRepo.js`).
- **`types/`**: Veritabanı tabloları ve video objeleri için TypeScript interface tanımları.
- **`utils/`**: `format.ts`, `validate.ts`, `transitions.ts` gibi küçük ama kritik fonksiyonlar.
- **`constants/`**: `Colors.ts`, `FontConfig.ts`, `Talents.ts` gibi değişmez değerler.

---

## 🗄️ 5. Backend ve Dış Projeler

- **`supabase/`**: Veritabanı şeması (`schema.sql`), depolama politikaları (`storage.sql`) ve veritabanı fonksiyonlarını barındırır.
- **`ADMIN_PANEL/`**: (Web) Uygulamanın içeriklerini ve kullanıcılarını yönetmek için React + Vite ile yazılmış ayrı bir yönetim paneli.
- **`android/`**: (Generated) React Native'in ürettiği native Android projesi. (Burada artık Notifee repoları gibi özel ayarlarımız da bulunuyor).

---

### **📌 Mimari Özet**
motionApp, **React Native + Supabase + Expo Router** üçlüsü etrafında; UI ve Mantığı tamamen birbirinden ayıran, **Hook-driven** bir yapıdadır. Bu yapı sayesinde bir dosya sadece görüntüyü (component), başka bir dosya sadece veriyi (service) ve bir diğeri sadece durumu (context/hook) yönetir.
