import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
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
import AddVideoDetailsScreen from './AddVideoDetailsScreen';

const { width: W } = Dimensions.get('window');
const STATUS_BAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

interface CreateScreenProps {
  isActive?: boolean;
  onClose?: () => void;
  onVideoPublished?: (videoUri: string, description?: string, topic?: string) => void;
}

const MAX_RECORDING_TIME = 60;
const MIN_RECORDING_TIME = 1;

export default function CreateScreen({
  isActive = false,
  onClose,
  onVideoPublished,
}: CreateScreenProps) {
  // ─── Permissions ──────────────────────────────────────────────────────
  const { hasPermission: hasCameraPermission, requestPermission: requestCamera } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMic } = useMicrophonePermission();

  // ─── State ────────────────────────────────────────────────────────────
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [permissionsReady, setPermissionsReady] = useState(false);

  // ─── Refs ──────────────────────────────────────────────────────────────
  const cameraRef = useRef<Camera>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);

  // ─── Animations ────────────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const recordBtnScale = useRef(new Animated.Value(1)).current;
  const recDotOpacity = useRef(new Animated.Value(0)).current;
  const recDotAnim = useRef<Animated.CompositeAnimation | null>(null);

  // ─── Camera device ─────────────────────────────────────────────────────
  const device = useCameraDevice(facing, {
    physicalDevices: ['wide-angle-camera', 'ultra-wide-angle-camera', 'telephoto-camera'],
  });

  // ─── Permission request on mount ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!hasCameraPermission) await requestCamera();
      if (!hasMicPermission) await requestMic();
      setPermissionsReady(true);
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recDotAnim.current?.stop();
    };
  }, []);

  // ─── Pulsing REC dot ───────────────────────────────────────────────────
  const startRecDot = useCallback(() => {
    recDotOpacity.setValue(1);
    recDotAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(recDotOpacity, { toValue: 0.15, duration: 600, useNativeDriver: true }),
        Animated.timing(recDotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    recDotAnim.current.start();
  }, [recDotOpacity]);

  const stopRecDot = useCallback(() => {
    recDotAnim.current?.stop();
    recDotOpacity.setValue(0);
  }, [recDotOpacity]);

  // ─── Progress bar animation ─────────────────────────────────────────────
  const startProgressAnim = useCallback(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: MAX_RECORDING_TIME * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const stopProgressAnim = useCallback(() => {
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
  }, [progressAnim]);

  const animateRecordBtn = useCallback((recording: boolean) => {
    Animated.spring(recordBtnScale, {
      toValue: recording ? 0.86 : 1,
      tension: 220,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [recordBtnScale]);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingTime(0);
    stopProgressAnim();
    stopRecDot();
    animateRecordBtn(false);
  }, [stopProgressAnim, stopRecDot, animateRecordBtn]);

  // ─── Recording logic ───────────────────────────────────────────────────
  const stopRecordingImperative = useCallback(async () => {
    if (!cameraRef.current || !isRecordingRef.current) return;
    const duration = (Date.now() - startTimeRef.current) / 1000;
    if (duration < MIN_RECORDING_TIME) {
      Alert.alert('Kayıt çok kısa', 'En az 1 saniye kayıt yapmalısınız.');
      try { await cameraRef.current.stopRecording(); } catch { }
      cleanup();
      return;
    }
    try { await cameraRef.current.stopRecording(); } catch { }
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecordingRef.current) return;
    if (!hasMicPermission) {
      const r = await requestMic();
      if (!r) { Alert.alert('Mikrofon İzni', 'Video kaydetmek için mikrofon iznine ihtiyacımız var.'); return; }
    }
    try {
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);
      startTimeRef.current = Date.now();
      startProgressAnim();
      startRecDot();
      animateRecordBtn(true);

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingTime(elapsed);
        if (elapsed >= MAX_RECORDING_TIME) stopRecordingImperative();
      }, 100);

      cameraRef.current.startRecording({
        onRecordingFinished: (video) => {
          cleanup();
          // Give the native system a moment to release handles before unmounting Camera
          setTimeout(() => {
            if (video?.path) {
              const uri = Platform.OS === 'android' ? `file://${video.path}` : video.path;
              setRecordedVideoUri(uri);
            }
          }, 400);
        },
        onRecordingError: (error) => {
          cleanup();
          const code = (error as any)?.code ?? '';
          if (code === 'capture/recording-stopped') return;
          console.warn('Recording error:', error);
          Alert.alert('Kayıt Hatası', 'Video kaydedilemedi.');
        },
      });
    } catch (err) {
      cleanup();
      console.error('Start recording err:', err);
      Alert.alert('Hata', 'Kayıt başlatılamadı.');
    }
  }, [hasMicPermission, requestMic, startProgressAnim, startRecDot, animateRecordBtn, cleanup, stopRecordingImperative]);

  const handleCapturePress = useCallback(() => {
    isRecording ? stopRecordingImperative() : startRecording();
  }, [isRecording, startRecording, stopRecordingImperative]);

  const handlePickVideo = useCallback(async () => {
    if (isRecording) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) setRecordedVideoUri(result.assets[0].uri);
  }, [isRecording]);

  const toggleCamera = useCallback(() => {
    if (!isRecording) setFacing(f => f === 'back' ? 'front' : 'back');
  }, [isRecording]);

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    return `${m}:${Math.floor(secs % 60).toString().padStart(2, '0')}`;
  }, []);

  const handleVideoPublish = useCallback((videoUrl: string, description: string, tags: string[]) => {
    const { getTalentById } = require('@/constants/Talents');
    const topicTalent = tags.length > 0 ? getTalentById(tags[0]) : null;
    const topic = topicTalent ? `#${topicTalent.name.toLowerCase()}` : undefined;
    if (onVideoPublished && videoUrl) onVideoPublished(videoUrl, description, topic);
    setRecordedVideoUri(null);
  }, [onVideoPublished]);

  // ─── Conditional renders (after ALL hooks) ────────────────────────────
  if (recordedVideoUri) {
    return (
      <View style={s.container}>
        <AddVideoDetailsScreen
          videoUri={recordedVideoUri}
          onBack={() => setRecordedVideoUri(null)}
          onPublish={handleVideoPublish}
        />
      </View>
    );
  }

  if (!permissionsReady) return <View style={s.container} />;

  if (!hasCameraPermission) {
    return (
      <View style={s.container}>
        <View style={s.permBox}>
          <View style={s.permIconWrap}>
            <Ionicons name="camera-outline" size={60} color="#FF3040" />
          </View>
          <Text style={s.permTitle}>Kamera İzni Gerekli</Text>
          <Text style={s.permDesc}>Video oluşturmak için kamera erişimine ihtiyacımız var.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestCamera}>
            <Text style={s.permBtnTxt}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={s.permCancelBtn}>
            <Text style={s.permCancelTxt}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="camera-outline" size={48} color="#555" />
        <Text style={{ color: '#555', marginTop: 12 }}>Kamera Bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {isActive ? (
        <>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            video={true}
            audio={hasMicPermission}
            videoHdr={false}
            enableZoomGesture
            zoom={device.neutralZoom}
          />

          {/* ─── Top edge progress bar ─────────────────────────── */}
          {isRecording && (
            <View style={s.progressBarWrap}>
              <View style={s.progressBg} />
              <Animated.View
                style={[
                  s.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}

          {/* ─── Top bar ──────────────────────────────────────────── */}
          <View style={s.topBar}>
            <TouchableOpacity style={s.glassBtn} onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={s.topCenter}>
              {isRecording ? (
                <View style={s.recBadge}>
                  <Animated.View style={[s.recDot, { opacity: recDotOpacity }]} />
                  <Text style={s.recText}>{formatTime(recordingTime)}</Text>
                </View>
              ) : (
                <Text style={s.topTitle}>Video Oluştur</Text>
              )}
            </View>

            <TouchableOpacity
              style={[s.glassBtn, isRecording && s.glassBtnDisabled]}
              onPress={toggleCamera}
              disabled={isRecording}
              activeOpacity={0.75}
            >
              <Ionicons name="camera-reverse-outline" size={22} color={isRecording ? '#555' : '#fff'} />
            </TouchableOpacity>
          </View>

          {/* ─── Right side quick actions (only when idle) ─────────── */}
          {!isRecording && (
            <View style={s.sidePanel}>
              <TouchableOpacity style={s.sidePanelBtn} onPress={handlePickVideo} activeOpacity={0.75}>
                <View style={s.sidePanelIcon}>
                  <Ionicons name="images-outline" size={24} color="#fff" />
                </View>
                <Text style={s.sidePanelLabel}>Galeri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.sidePanelBtn} onPress={toggleCamera} activeOpacity={0.75}>
                <View style={s.sidePanelIcon}>
                  <Ionicons name="sync-outline" size={24} color="#fff" />
                </View>
                <Text style={s.sidePanelLabel}>Çevir</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Bottom capture bar ───────────────────────────────── */}
          <View style={s.bottomBar}>
            {/* Gallery (left) */}
            <TouchableOpacity
              style={s.bottomSideBtn}
              onPress={handlePickVideo}
              disabled={isRecording}
              activeOpacity={0.7}
            >
              <View style={[s.glassBtn, s.glassBtnLg, isRecording && s.glassBtnDisabled]}>
                <Ionicons name="images-outline" size={26} color={isRecording ? '#444' : '#fff'} />
              </View>
              <Text style={[s.bottomSideTxt, isRecording && { opacity: 0.25 }]}>Galeri</Text>
            </TouchableOpacity>

            {/* Capture button (center) */}
            <View style={s.captureWrap}>
              {/* Outer ring — white when idle, red when recording */}
              <View style={[s.captureRingOuter, isRecording && s.captureRingRecording]} />
              <Animated.View style={{ transform: [{ scale: recordBtnScale }] }}>
                <TouchableOpacity
                  style={[s.captureBtn, isRecording && s.captureBtnRecording]}
                  onPress={handleCapturePress}
                  activeOpacity={0.88}
                >
                  {isRecording
                    ? <View style={s.stopShape} />
                    : <View style={s.recordShape} />
                  }
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Flip (right) */}
            <TouchableOpacity
              style={s.bottomSideBtn}
              onPress={toggleCamera}
              disabled={isRecording}
              activeOpacity={0.7}
            >
              <View style={[s.glassBtn, s.glassBtnLg, isRecording && s.glassBtnDisabled]}>
                <Ionicons name="sync-outline" size={26} color={isRecording ? '#444' : '#fff'} />
              </View>
              <Text style={[s.bottomSideTxt, isRecording && { opacity: 0.25 }]}>Çevir</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Bottom hint ──────────────────────────────────────── */}
          {!isRecording && (
            <View style={s.hintRow}>
              <Text style={s.hintText}>Maks. {MAX_RECORDING_TIME} sn  ·  Kayıt için dokun</Text>
            </View>
          )}
        </>
      ) : (
        <View style={s.inactiveView}>
          <Ionicons name="camera-outline" size={72} color="#333" />
          <Text style={s.inactiveTxt}>Kamera Kapalı</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // permission
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  permIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,48,64,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  permTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 10 },
  permDesc: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  permBtn: {
    backgroundColor: '#FF3040', paddingHorizontal: 48, paddingVertical: 14,
    borderRadius: 14, marginBottom: 12,
  },
  permBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  permCancelBtn: { paddingVertical: 10 },
  permCancelTxt: { color: '#666', fontSize: 14 },

  // top bar
  topBar: {
    position: 'absolute',
    top: STATUS_BAR_H + 6,
    left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  topCenter: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  topTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600', letterSpacing: 0.4 },
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,48,64,0.90)',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  recText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  // glassmorphism button
  glassBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  glassBtnLg: { width: 52, height: 52, borderRadius: 26 },
  glassBtnDisabled: { opacity: 0.4 },

  // right side panel
  sidePanel: {
    position: 'absolute', top: 120, right: 12,
    gap: 16, zIndex: 20,
    alignItems: 'center',
  },
  sidePanelBtn: { alignItems: 'center', gap: 4 },
  sidePanelIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sidePanelLabel: { color: '#fff', fontSize: 11, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 2 },

  // progress bar (top edge)
  progressBarWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4, zIndex: 30,
  },
  progressBg: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: '100%', backgroundColor: Colors.primary,
  },

  // bottom bar
  bottomBar: {
    position: 'absolute', bottom: 64, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 20, zIndex: 20,
  },
  bottomSideBtn: { alignItems: 'center', gap: 6 },
  bottomSideTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // capture button anatomy
  captureWrap: {
    width: 84, height: 84, alignItems: 'center', justifyContent: 'center',
  },
  captureRingOuter: {
    position: 'absolute',
    width: 82, height: 82, borderRadius: 41,
    borderWidth: 4, borderColor: '#fff',
  },
  captureRingRecording: {
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 6,
  },
  captureBtn: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnRecording: {
    backgroundColor: Colors.primary,
    width: 38, height: 38, borderRadius: 6,
  },
  recordShape: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#eee',
  },
  stopShape: {
    width: 4, height: 4, // placeholder as it turns into square via captureBtnRecording
  },

  // hint
  hintRow: {
    position: 'absolute', bottom: 32, left: 0, right: 0,
    alignItems: 'center', zIndex: 20,
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },

  // inactive
  inactiveView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  inactiveTxt: { color: '#444', fontSize: 15 },
});
