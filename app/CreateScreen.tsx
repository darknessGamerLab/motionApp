/**
 * CreateScreen — Video oluşturma
 *
 * CRASH ÇÖZÜMÜ:
 * Kayıt bitince onRecordingDone(uri) çağrılır ve
 * CreateScreen tamamen unmount olur (index.tsx'teki parent state değişir).
 * Bu sayede Camera codec'i tamamen serbest kalır, sonra
 * AddVideoDetailsScreen ayrı mount olduğunda codec çakışması olmaz.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  InteractionManager,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
// AddVideoDetailsScreen artık index.tsx'te render ediliyor (Camera unmount sonrası)

const SAFE_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 28) : 48;
const MAX_SEC = 60;
const MIN_SEC = 1;
const PRIMARY = '#DC143C';

// ─── Efektler ──────────────────────────────────────────────────────────────
const EFFECTS = [
  { id: 'none', label: 'Normal', color: 'transparent' },
  { id: 'warm', label: 'Sıcak', color: 'rgba(255,140,50,0.13)' },
  { id: 'cool', label: 'Soğuk', color: 'rgba(60,130,255,0.13)' },
  { id: 'vintage', label: 'Vintage', color: 'rgba(180,140,80,0.18)' },
  { id: 'rose', label: 'Gül', color: 'rgba(255,80,120,0.12)' },
  { id: 'neon', label: 'Neon', color: 'rgba(160,0,255,0.11)' },
  { id: 'golden', label: 'Altın', color: 'rgba(255,200,50,0.14)' },
  { id: 'forest', label: 'Orman', color: 'rgba(30,180,80,0.12)' },
  { id: 'night', label: 'Gece', color: 'rgba(20,20,60,0.22)' },
] as const;
type FxId = typeof EFFECTS[number]['id'];

// ─── Ekran durumları ───────────────────────────────────────────────────────
// 'rec'       → Kamera aktif, kayıt yapılabilir/yapılıyor
// 'loading'   → Kayıt bitti, kısa bekleme (Camera isActive=false)
// 'unmounting'→ Donanım kaynağını ayırmak için Camera unmount ediliyor
type Screen = 'rec' | 'loading' | 'unmounting';

interface Props {
  isActive?: boolean;
  onClose?: () => void;
  /** Kayıt veya galeri seçimi bitince video URI ile çağrılır. Parent bu component'i unmount eder. */
  onRecordingDone?: (uri: string) => void;
}

export default function CreateScreen({ isActive = false, onClose, onRecordingDone }: Props) {
  // ─── İzinler ─────────────────────────────────────────────
  const { hasPermission: hasCam, requestPermission: reqCam } = useCameraPermission();
  const { hasPermission: hasMic, requestPermission: reqMic } = useMicrophonePermission();

  // ─── State ───────────────────────────────────────────────
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flashOn, setFlashOn] = useState(false);
  const [isRec, setIsRec] = useState(false);
  const [sec, setSec] = useState(0);
  const [permsOk, setPermsOk] = useState(false);
  const [fx, setFx] = useState<FxId>('none');
  const [screen, setScreen] = useState<Screen>('rec');
  const [vidUri, setVidUri] = useState<string | null>(null);

  // ─── Refs ────────────────────────────────────────────────
  const camRef = useRef<Camera>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0Ref = useRef(0);
  const recFlag = useRef(false);

  // ─── Anim ────────────────────────────────────────────────
  const progAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const dotOp = useRef(new Animated.Value(0)).current;
  const dotLoop = useRef<Animated.CompositeAnimation | null>(null);

  const device = useCameraDevice(facing);

  // ─── İzin al ─────────────────────────────────────────────
  useEffect(() => {
    console.log('[CreateScreen] Mounted');
    (async () => {
      try {
        console.log('[CreateScreen] Requesting permissions...');
        if (!hasCam) await reqCam();
        if (!hasMic) await reqMic();
        console.log('[CreateScreen] Permissions handled:', { hasCam, hasMic });
        setPermsOk(true);
      } catch (err) {
        console.error('[CreateScreen] Permission request error:', err);
      }
    })();
  }, []);

  // ─── Cleanup ─────────────────────────────────────────────
  useEffect(() => () => {
    console.log('[CreateScreen] Unmounting component cleanup');
    if (timerRef.current) clearInterval(timerRef.current);
    dotLoop.current?.stop();
  }, []);

  // ─── Tab kapandığında reset ──────────────────────────────
  useEffect(() => {
    console.log('[CreateScreen] isActive changed:', isActive);
    if (!isActive) {
      console.log('[CreateScreen] Resetting state (isActive=false)');
      setScreen('rec');
      setVidUri(null);
      setIsRec(false);
      recFlag.current = false;
      setSec(0);
      setFx('none');
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      dotLoop.current?.stop();
      progAnim.setValue(0);
      btnScale.setValue(1);
      dotOp.setValue(0);
    }
  }, [isActive]);

  // ─── Android geri tuşu ──────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.();
      return true;
    });
    return () => sub.remove();
  }, [isActive, screen, onClose]);

  // ═══════════════════════════════════════════════════════════
  // ANİMASYONLAR
  // ═══════════════════════════════════════════════════════════

  const startDot = useCallback(() => {
    dotOp.setValue(1);
    dotLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(dotOp, { toValue: 0.2, duration: 550, useNativeDriver: true }),
      Animated.timing(dotOp, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]));
    dotLoop.current.start();
  }, [dotOp]);

  const stopDot = useCallback(() => { dotLoop.current?.stop(); dotOp.setValue(0); }, [dotOp]);

  const clean = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRec(false);
    recFlag.current = false;
    setSec(0);
    progAnim.stopAnimation();
    progAnim.setValue(0);
    stopDot();
    Animated.spring(btnScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  }, [progAnim, btnScale, stopDot]);

  // ═══════════════════════════════════════════════════════════
  // KAYIT
  // ═══════════════════════════════════════════════════════════

  const doStop = useCallback(async () => {
    console.log('[CreateScreen] Requesting stopRecording...');
    if (!camRef.current || !recFlag.current) {
        console.log('[CreateScreen] stopRecording skipped (no cam or not recording)');
        return;
    }
    const dur = (Date.now() - t0Ref.current) / 1000;
    if (dur < MIN_SEC) {
      console.log('[CreateScreen] Duration too short, stopping and cleaning');
      try { await camRef.current.stopRecording(); } catch (e) { console.error('[CreateScreen] stopRecording error (short dur):', e); }
      clean();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    try { 
        await camRef.current.stopRecording(); 
        console.log('[CreateScreen] stopRecording called successfully');
    } catch (e) { 
        console.error('[CreateScreen] stopRecording error:', e); 
    }
    // NOT: State değişikliği onRecordingFinished içinde yapılacak
  }, [clean]);

  const doStart = useCallback(async () => {
    console.log('[CreateScreen] Requesting startRecording...');
    if (!camRef.current || recFlag.current) {
        console.log('[CreateScreen] startRecording skipped (no cam or already recording)');
        return;
    }
    if (!hasMic) { 
        console.log('[CreateScreen] Mic permission missing during start, requesting...');
        const ok = await reqMic(); 
        if (!ok) return; 
    }

    try {
      recFlag.current = true;
      setIsRec(true);
      setSec(0);
      t0Ref.current = Date.now();

      // Anim
      progAnim.setValue(0);
      Animated.timing(progAnim, { toValue: 1, duration: MAX_SEC * 1000, easing: Easing.linear, useNativeDriver: false }).start();
      startDot();
      Animated.spring(btnScale, { toValue: 0.82, tension: 200, friction: 8, useNativeDriver: true }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      timerRef.current = setInterval(() => {
        const e = (Date.now() - t0Ref.current) / 1000;
        setSec(e);
        if (e >= MAX_SEC) {
            console.log('[CreateScreen] MAX_SEC reached, auto-stopping');
            doStop();
        }
      }, 200);

      console.log('[CreateScreen] Calling camera startRecording...');
      camRef.current.startRecording({
        flash: flashOn ? 'on' : 'off',
        videoCodec: 'h264',

        onRecordingFinished: (video) => {
          console.log('[CreateScreen] onRecordingFinished callback triggered', { path: video?.path });
          // ⚠️ NATIVE THREAD CALLBACK
          // Burada hemen unmount ETME (crash yapar).
          // Önce state'i 'loading' yapıp 800ms bekleyeceğiz.
          clean();

          if (!video?.path) {
              console.log('[CreateScreen] Video path missing in callback');
              return;
          }
          const uri = Platform.OS === 'android'
            ? (video.path.startsWith('file://') ? video.path : `file://${video.path}`)
            : video.path;

          // InteractionManager: native callback'in stack'ten tamamen dönmesini bekle
          InteractionManager.runAfterInteractions(() => {
            console.log('[CreateScreen] Running unmount sequence after interactions');
            setVidUri(uri);
            setScreen('loading'); // isActive=false
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // 1. Aşama: 400ms bekle, Camera pause olsun (isActive=false).
            setTimeout(() => {
              console.log('[CreateScreen] Stage 2: unmounting camera');
              setScreen('unmounting'); // 2. Aşama: Camera unmount olsun.

              // 3. Aşama: 800ms bekle, sonra parent'a URI gönder.
              // Parent CreateScreen'i unmount edecek → Camera codec tamamen serbest.
              // Sonra AddVideoDetailsScreen ayrı olarak mount olacak.
              setTimeout(() => {
                console.log('[CreateScreen] Stage 3: onRecordingDone signal to parent', { uri });
                onRecordingDone?.(uri);
              }, 800);
            }, 400);
          });
        },

        onRecordingError: (err) => {
          console.error('[CreateScreen] onRecordingError callback triggered', err);
          clean();
          const code = (err as any)?.code ?? '';
          if (code === 'capture/recording-stopped') return;
          if (__DEV__) console.warn('[Cam] rec error:', err);
        },
      });
    } catch (e) {
      console.error('[CreateScreen] startRecording catch block:', e);
      clean();
      if (__DEV__) console.warn('[Cam] start error:', e);
    }
  }, [hasMic, reqMic, flashOn, progAnim, btnScale, startDot, clean, doStop]);

  // ═══════════════════════════════════════════════════════════
  // EYLEMLER
  // ═══════════════════════════════════════════════════════════

  const onCapture = useCallback(() => { isRec ? doStop() : doStart(); }, [isRec, doStop, doStart]);
  const onFlip = useCallback(() => { if (!isRec) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFacing(f => f === 'back' ? 'front' : 'back'); } }, [isRec]);
  const onFlash = useCallback(() => { if (!isRec) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFlashOn(f => !f); } }, [isRec]);

  const onGallery = useCallback(async () => {
    if (isRec) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] as any, allowsEditing: true, quality: 1 });
    if (!r.canceled && r.assets?.[0]?.uri) {
      // Galeriden seçilen videoda Camera zaten aktif değil,
      // ama yine parent'a gönderip CreateScreen'i unmount ettiriyoruz.
      onRecordingDone?.(r.assets[0].uri);
    }
  }, [isRec, onRecordingDone]);

  // ═══════════════════════════════════════════════════════════
  // helpers
  // ═══════════════════════════════════════════════════════════
  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const overlay = EFFECTS.find(e => e.id === fx)?.color ?? 'transparent';

  // Camera aktif mi? Sadece 'rec' ekranında ve isActive=true iken
  const camActive = isActive && screen === 'rec';

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // İzin bekleniyor
  if (!permsOk) return <View style={s.root} />;

  // Kamera izni yok
  if (!hasCam) {
    return (
      <View style={[s.root, s.center]}>
        <View style={s.permIco}><Ionicons name="camera-outline" size={52} color={PRIMARY} /></View>
        <Text style={s.permT}>Kamera İzni Gerekli</Text>
        <Text style={s.permD}>Video oluşturmak için kamera erişimine ihtiyacımız var.</Text>
        <TouchableOpacity style={s.permBtn} onPress={reqCam}><Text style={s.permBtnT}>İzin Ver</Text></TouchableOpacity>
        <TouchableOpacity style={{ padding: 10 }} onPress={onClose}><Text style={{ color: '#666', fontSize: 14 }}>Vazgeç</Text></TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[s.root, s.center]}>
        <Ionicons name="videocam-outline" size={56} color="#444" />
        <Text style={{ color: '#555', marginTop: 12 }}>Kamera bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>

      {/* ─── Camera: Kademeli olarak tamamen GPU'dan düşür ─── */}
      {(screen === 'rec' || screen === 'loading') && (
        <Camera
          ref={camRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={camActive}
          video={true}
          audio={hasMic}
          videoHdr={false}
          enableZoomGesture
          zoom={device.neutralZoom}
          torch={flashOn ? 'on' : 'off'}
          onError={(error) => {
            console.error("📸 CAMERA FATAL ERROR:", error);
            console.log('[CreateScreen] Camera onError details:', {
                code: (error as any)?.code,
                message: error.message,
                stack: error.stack
            });
            if (__DEV__) {
              console.error("Camera Error Details:", JSON.stringify(error, null, 2));
              Alert.alert("Kamera Hatası", error.message || "Bilinmeyen bir kamera hatası oluştu.");
            }
          }}
        />
      )}

      {/* Efekt overlay */}
      {fx !== 'none' && screen === 'rec' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} pointerEvents="none" />
      )}

      {/* ─── LOADING & UNMOUNTING ekranı (kayıt bitti, kaynaklar temizleniyor) ─── */}
      {(screen === 'loading' || screen === 'unmounting') && (
        <View style={[StyleSheet.absoluteFill, s.loadingOverlay]}>
          <View style={s.loadingIcon}>
            <Ionicons name="videocam" size={40} color={PRIMARY} />
          </View>
          <Text style={s.loadingTxt}>Hazırlanıyor…</Text>
        </View>
      )}


      {/* ─── KAMERA UI (sadece rec ekranında) ─── */}
      {screen === 'rec' && isActive && (
        <>
          {/* Progress bar */}
          {isRec && (
            <View style={s.progWrap}>
              <View style={s.progBg} />
              <Animated.View style={[s.progFill, {
                width: progAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
          )}

          {/* Üst bar */}
          <View style={s.top}>
            <TouchableOpacity style={s.pill} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {isRec ? (
                <View style={s.recBadge}>
                  <Animated.View style={[s.recDot, { opacity: dotOp }]} />
                  <Text style={s.recTxt}>{fmt(sec)}</Text>
                </View>
              ) : (
                <Text style={s.topTitle}>Oluştur</Text>
              )}
            </View>
            <TouchableOpacity style={s.pill} onPress={onFlash} disabled={isRec} activeOpacity={0.7}>
              <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={20} color={flashOn ? '#FFD700' : '#fff'} />
            </TouchableOpacity>
          </View>

          {/* Sağ panel */}
          {!isRec && (
            <View style={s.side}>
              <SideBtn icon="camera-reverse-outline" label="Çevir" onPress={onFlip} />
              <SideBtn icon="images-outline" label="Galeri" onPress={onGallery} />
            </View>
          )}

          {/* Efekt carousel — yatay kaydırılabilir */}
          {!isRec && (
            <View style={s.fxWrap}>
              <FlatList
                data={EFFECTS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={i => i.id}
                contentContainerStyle={s.fxList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.fxItem, fx === item.id && s.fxItemActive]}
                    onPress={() => { Haptics.selectionAsync(); setFx(item.id); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.fxName, fx === item.id && s.fxNameActive]}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Alt bar */}
          <View style={s.bottom}>
            <TouchableOpacity style={s.btmSide} onPress={onGallery} disabled={isRec} activeOpacity={0.7}>
              <View style={[s.pillLg, isRec && s.dim]}>
                <Ionicons name="images-outline" size={24} color={isRec ? '#555' : '#fff'} />
              </View>
              <Text style={[s.btmLbl, isRec && { opacity: 0.3 }]}>Galeri</Text>
            </TouchableOpacity>

            <View style={s.capOuter}>
              <View style={[s.capRing, isRec && s.capRingRec]} />
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity style={[s.capBtn, isRec && s.capBtnRec]} onPress={onCapture} activeOpacity={0.85}>
                  {isRec ? <View style={s.stopIco} /> : <View style={s.recIco} />}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <TouchableOpacity style={s.btmSide} onPress={onFlip} disabled={isRec} activeOpacity={0.7}>
              <View style={[s.pillLg, isRec && s.dim]}>
                <Ionicons name="camera-reverse-outline" size={24} color={isRec ? '#555' : '#fff'} />
              </View>
              <Text style={[s.btmLbl, isRec && { opacity: 0.3 }]}>Çevir</Text>
            </TouchableOpacity>
          </View>

          {!isRec && (
            <View style={s.hintRow}>
              <Text style={s.hintTxt}>Maks. {MAX_SEC}sn  •  Kayıt için dokun</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
function SideBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.sideItem} onPress={onPress} activeOpacity={0.7}>
      <View style={s.sideIco}><Ionicons name={icon as any} size={22} color="#fff" /></View>
      <Text style={s.sideLbl}>{label}</Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },

  // loading
  loadingOverlay: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  loadingIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(220,20,60,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loadingTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: 'Poppins_500Medium' },

  // perm
  permIco: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(220,20,60,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  permT: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#fff', marginBottom: 8 },
  permD: { fontSize: 13, color: '#888', textAlign: 'center', paddingHorizontal: 40, marginBottom: 28, lineHeight: 20 },
  permBtn: { backgroundColor: PRIMARY, paddingHorizontal: 42, paddingVertical: 14, borderRadius: 14, marginBottom: 10 },
  permBtnT: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },

  // top
  top: { position: 'absolute', top: SAFE_TOP + 4, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', zIndex: 30 },
  topTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(220,20,60,0.9)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  recTxt: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold', letterSpacing: 1 },

  // pill
  pill: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pillLg: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dim: { opacity: 0.35 },

  // side
  side: { position: 'absolute', top: SAFE_TOP + 72, right: 12, gap: 18, zIndex: 25, alignItems: 'center' },
  sideItem: { alignItems: 'center', gap: 4 },
  sideIco: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sideLbl: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold', textShadowColor: '#000', textShadowRadius: 3 },

  // fx carousel
  fxWrap: { position: 'absolute', bottom: 168, left: 0, right: 0, zIndex: 25 },
  fxList: { paddingHorizontal: 16, gap: 8 },
  fxItem: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  fxItemActive: { borderColor: PRIMARY, backgroundColor: 'rgba(220,20,60,0.2)' },
  fxName: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Poppins_500Medium' },
  fxNameActive: { color: '#fff', fontFamily: 'Poppins_700Bold' },

  // progress
  progWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, zIndex: 40 },
  progBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.15)' },
  progFill: { height: '100%', backgroundColor: PRIMARY },

  // bottom
  bottom: { position: 'absolute', bottom: 56, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 16, zIndex: 25 },
  btmSide: { alignItems: 'center', gap: 5 },
  btmLbl: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },

  // capture
  capOuter: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  capRing: { position: 'absolute', width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)' },
  capRingRec: { borderColor: 'rgba(255,255,255,0.25)', borderWidth: 5 },
  capBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  capBtnRec: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#fff' },
  recIco: { width: 54, height: 54, borderRadius: 27, backgroundColor: PRIMARY },
  stopIco: { width: 20, height: 20, borderRadius: 4, backgroundColor: PRIMARY },

  // hint
  hintRow: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center', zIndex: 25 },
  hintTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Poppins_500Medium', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
});
