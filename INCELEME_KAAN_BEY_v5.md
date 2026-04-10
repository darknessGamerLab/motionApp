# Spotlights / motionApp — Kıdemli İnceleme Özeti (v5.0.1)

Bu belge, **Kaan Bey** ve ekip için uygulamanın amacı, mimarisi, teknoloji yığını, klasör yapısı, admin paneli, geliştirme akışı, bilinen riskler ve kodda dikkat çeken blokların anlamını özetler.  
**Repoda gizli anahtar bulunmamalıdır:** `service_role`, kişisel erişim token’ları, `.env.local`, `google-services.json` ve `ADMIN_PANEL/api/.env` `.gitignore` ile dışarıda bırakılmıştır; inceleme öncesi `git status` ve gerekiyorsa `git secrets` / manuel arama önerilir.

---

## 1. Ürünün amacı

- **Kısa tanım:** Dikey video (kısa video) paylaşım ve keşif uygulaması; kullanıcılar video yükler, beğenir, yorumlar, takip eder; kurumsal hesaplar için **radar / B2B** tarzı bağlantılar ve sponsor alanları hedeflenmiştir.
- **Hedef kullanıcı:** İçerik üreten bireyler; marka / kurum (kurumsal başvuru akışı, admin panelinde onay).
- **Platform:** Android ve iOS (Expo / React Native); backend **Supabase** (Postgres, Auth, Storage, RLS).

---

## 2. Çalışma biçimi (uçtan uca)

1. **Kimlik:** Supabase Auth; oturum `AuthContext` + `AsyncStorage` ile kalıcı.
2. **Feed:** `useFeed` hook’u videoları çeker; FlashList ile performanslı liste; optimistic güncellemeler (beğeni, kaydetme vb.).
3. **Video üretimi:** `CreateScreen` — Vision Camera ile kayıt; `AddVideoDetailsScreen` — açıklama, konu (talent), sıkıştırma, Storage’a yükleme, `videos` tablosuna insert.
4. **Etkileşim:** `likes`, `comments`, `follows`, `saves`, `notifications` tabloları; tetikleyiciler bildirim üretir (ör. yorum için `create_comment_notification` — mesaj sütunu `comments.text`).
5. **Profil:** `MeScreen` (kendi profil), `UserProfileScreen` (modal ile başka kullanıcı); `useProfile` ile önbellekli veri.
6. **Push:** Firebase Messaging + Notifee (Android yapılandırması).
7. **Admin:** Ayrı **Vite + React** web arayüzü ve **Express** API; API `service_role` ile Supabase’e yazar/okur, `X-Admin-Key` ile korunur.

---

## 3. Mimari görünüm

| Katman | Konum | Rol |
|--------|--------|-----|
| Sayfalar / routing | `app/` (Expo Router) | Dosya tabanlı rotalar, tab + tam ekran modal (ör. profil, oluştur) |
| UI bileşenleri | `components/` | Modal, feed hücreleri, cropper, skeleton |
| Durum | `contexts/` | `AuthContext`, `ThemeContext` (palette + Android system chrome) |
| Veri / yan etkiler | `hooks/` | `useFeed`, `useProfile`, `useVideoActions`, push vb. |
| İstemci servisleri | `services/`, `lib/` | Supabase client, event bus, önbellek |
| Tipler | `types/` | `database.ts` (Supabase şemasına yakın) |
| Sabitler | `constants/` | Renkler, yetenek listesi |
| Backend tanımı | `supabase/` | `schema.sql`, migration dosyaları, RPC örnekleri |
| Yönetim | `ADMIN_PANEL/` | `web/` (UI), `api/` (Express) |

**Desen:** “Hook-driven” UI: ekranlar ince kalır; veri ve yan etkiler hook + context’te toplanır.

---

## 4. Teknoloji yığını (özet)

| Alan | Seçim |
|------|--------|
| Mobil | Expo SDK ~54, React 19, expo-router |
| Liste | @shopify/flash-list |
| Kamera | react-native-vision-camera |
| Video | expo-video, sıkıştırma: react-native-compressor |
| Backend | Supabase (PostgREST, Auth, Storage) |
| Admin UI | React 19, Vite 7, React Router 7, Tailwind, Recharts, Axios |
| Admin API | Node, Express, @supabase/supabase-js, CORS kısıtlı |
| Bildirim | @react-native-firebase/messaging, @notifee/react-native |

---

## 5. Önemli dosyalar ve kod bloklarının amacı

- **`app/index.tsx`:** Ana tab kabuğu; Create ve başka kullanıcı profili **Modal** ile tam ekran; `useFeed`; Android `syncAndroidSystemChrome`.
- **`app/_layout.tsx`:** Fontlar, `SafeAreaProvider`, `ThemeProvider`, `AuthProvider`, Stack.
- **`lib/supabase.ts`:** `expo-constants` `extra` üzerinden `SUPABASE_URL` / `SUPABASE_ANON_KEY` — **yalnızca anon**; production’da sızdırılmaması gerekmez ama yine de repo genelinde service key olmamalı.
- **`hooks/useFeed.ts`:** Feed yaşam döngüsü, yenileme, optimistic like/save/comment count.
- **`components/CommentsModal.tsx`:** Yorum listesi + gönderim; Android için Modal içi `SafeAreaProvider` ve alt padding; insert `{ video_id, user_id, text }`.
- **`components/VideoPlayerModal.tsx` / `useVideoPlayer`:** Profil ve feed’den açılan oynatıcı.
- **`contexts/ThemeContext.tsx`:** `Colors` singleton’ını palette ile mutate eder; Android status/navigation bar senkronu.
- **`utils/safeInsets.ts`:** `mergeTopInset` — Android’de `insets.top` 0 iken status bar yüksekliği ile birleştirme.
- **`ADMIN_PANEL/web/src/lib/api.ts`:** `axios.create({ baseURL })` + `X-Admin-Key` interceptor (giriş sonrası `localStorage.adminToken`).
- **`ADMIN_PANEL/api/src/index.ts`:** Tüm `/api/*` uçları; `SUPABASE_SERVICE_KEY` ve `ADMIN_API_KEY` `.env` içinde zorunlu.

---

## 6. Admin panel — sekmeler ve API eşlemesi

Çalıştırma (yerel):

1. `ADMIN_PANEL/api`: `.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_API_KEY`) — örnek: `ADMIN_PANEL/api/.env.example`
2. `npm install && npm run` (veya `node` ile derlenmiş çıktı) — varsayılan port **5000**
3. `ADMIN_PANEL/web`: `VITE_API_URL=http://localhost:5000` (isteğe bağlı), `npm install && npm run dev` — **5173**

| Sidebar | Route | Özet |
|---------|--------|------|
| Dashboard | `/` | `/api/dashboard/summary` |
| Analytics | `/analytics` | retention, feed, growth, content, top-videos, top-users |
| Users | `/users` | `/api/users` CRUD, ban, tip |
| Corporate | `/corporate` | Kurumsal başvurular, onay/red |
| Videos | `/videos` | Liste, silme, güncelleme |
| Comments | `/comments` | Liste, silme |
| Reports | `/reports` | Şikayetler, durum |
| Sponsorships | `/banners` | `sponsor_banners` CRUD |
| Radar / B2B | `/radar` | `radars` listesi |
| Talents | `/talents` | `talents` tablosu |
| Categories | `/categories` | `categories` tablosu |
| Settings | `/settings` | `system_config` |

**v5.0.x:** `web/src/lib/api.ts` içinde `axios.create({ baseURL })` ile ortak istemci; admin girişi `X-Admin-Key` = API’deki `ADMIN_API_KEY` ile aynı olmalı.

---

## 7. Geliştirme süreci ve komutlar

- Mobil: `npm run android` / `npm run ios` / `npx expo start`
- Ortam: kök `.env.local` — `SUPABASE_URL`, `SUPABASE_ANON_KEY` (`app.config.js` → `extra`)
- Lint: `npm run lint` (Expo)
- Admin web build: `cd ADMIN_PANEL/web && npm run build` (tsc + vite)
- Admin API: `npx tsc --noEmit` (`ADMIN_PANEL/api`)

---

## 8. Muhtemel hatalar ve teknik borç

1. **Admin güvenlik:** `ADMIN_API_KEY` repoda yok; üretimde güçlü değer seçilmeli ve yalnızca güvenli kanalla paylaşılmalı. Panel şifresi bu anahtar ile aynı.
2. **Bildirim tipi `system`:** Repo `schema.sql` içinde `notification_type` enum’unda `'system'` yok; uygulama ve admin bazı yerlerde `system` kullanıyor. Canlı DB’de enum genişletilmiş olabilir — tutarsızlık riski.
3. **Demo JWT:** Bazı ekranlarda storage upload için yerel demo anon JWT fallback’i geçmişte kullanılmış olabilir — production’da kaldırılmalı; yalnızca oturum token’ı kullanılmalı.
4. **Edge-to-edge / NavigationBar:** Android’de `expo-navigation-bar` uyarıları; tema senkronu kısmen `StatusBar` ile yapılıyor.
5. **iOS video:** `VideoPlayer.replace` senkron uyarıları — `replaceAsync`’e geçiş önerilir.
6. **Supabase şema ile kod:** RPC/view isimleri (`daily_active_users` vb.) yoksa admin analytics boş veya boş dizi döner; hata vermemesi için fallback var.

---

## 9. Repoya dahil edilmemesi gerekenler (kontrol listesi)

- [ ] `.env.local`, `ADMIN_PANEL/api/.env`
- [ ] `google-services.json` (Firebase Android)
- [ ] `node_modules/`, `ADMIN_PANEL/**/dist/`
- [ ] Kişisel MCP token veya service role içeren herhangi bir dosya

---

## 10. Yazılımcıya repodan **ayrı** iletmen gerekenler (gizli / ortam)

Repoda bilerek yoktur; incelemenin tıkanmaması için güvenli kanal (1Password, şifreli zip, kurumsal vault vb.) ile paylaş:

| Ne | Nerede kullanılır | Not |
|----|-------------------|-----|
| **Supabase `SUPABASE_URL` + anon key** | Mobil `.env.local` → `app.config.js` → `extra` | Sadece **publishable/anon**; `service_role` mobilde kullanılmaz. |
| **Supabase `service_role`** | `ADMIN_PANEL/api/.env` | Yüksek yetki; asla istemciye ve repoya koyma. |
| **`ADMIN_API_KEY`** | `ADMIN_PANEL/api/.env` + panel giriş şifresi | API `X-Admin-Key` ile doğrular; web’de girişte yazılan değerle aynı olmalı. |
| **`google-services.json`** | Android Firebase / FCM | Repoda `.gitignore`; derleme ve push testi için dosyayı ayrı ver. |
| **`VITE_API_URL`** (isteğe bağlı) | Admin web | Boşsa varsayılan `http://localhost:5000`. Uzak API’ye bağlanacaksa tam taban URL. |
| **Test hesabı** | Uygulama + (isteğe bağlı) admin akışları | Örn. demo kullanıcı e-posta/şifre veya “kayıt serbest” beklentisi. |
| **Supabase proje erişimi** | Şema, SQL Editor, Logs | İnceleyen kişi migration / RLS / trigger kontrolü yapacaksa davet veya read erişimi. |
| **Firebase / Apple** | Push, iOS imza | Sadece ilgili inceleme kapsamı varsa (ör. production push). |

**Özet:** Repo + bu belge yeterli değil; **en azından** mobil `.env.local` içeriği (anon ile), admin API `.env` (service_role + admin key) ve Android `google-services.json` ayrıca gider.

---

## 11. Ek referans

- Daha kısa klasör haritası: `ARCHITECTURE_REPORT.md`
- Veritabanı: `supabase/schema.sql`, `supabase/migrations/`

---

*Sürüm: **5.0.1** — İnceleme / el değiştirme için güncel uygulama sürümü (`package.json`, `app.json`) ile uyumludur.*
