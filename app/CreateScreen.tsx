import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CreateScreenProps {
  isActive?: boolean;
  onClose?: () => void;
  onVideoRecorded?: (uri: string) => void;
}

// Progress Circle for Recording
function ProgressCircle({ progress }: { progress: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={94} height={94} style={styles.progressSvg}>
      <Circle
        cx={47}
        cy={47}
        r={radius}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={4}
        fill="none"
      />
      <Circle
        cx={47}
        cy={47}
        r={radius}
        stroke="#FFFC00"
        strokeWidth={4}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 47 47)`}
      />
    </Svg>
  );
}

export default function CreateScreen({ isActive = false, onClose, onVideoRecorded }: CreateScreenProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recentPhoto, setRecentPhoto] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string }> | null>(null);
  const recordingStartedRef = useRef<boolean>(false);
  const stoppedManuallyRef = useRef<boolean>(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const MAX_RECORDING_TIME = 60;

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadRecentPhoto();
  }, []);

  const loadRecentPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') {
      // Placeholder recent photo
      setRecentPhoto('https://picsum.photos/200/200');
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFC00" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#FFFC00" />
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>We need access to your camera to create amazing content</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleRecording = async () => {
    if (!cameraRef.current) return;

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    setRecordingTime(0);
    recordingStartedRef.current = false;
    stoppedManuallyRef.current = false;

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= MAX_RECORDING_TIME) {
          stopRecording();
          return MAX_RECORDING_TIME;
        }
        return prev + 0.1;
      });
    }, 100);

    try {
      // Start recording and store the promise (don't await it yet)
      // NOT: maxDuration göndermiyoruz, sadece manuel durdurma ile bitecek
      recordingPromiseRef.current = cameraRef.current.recordAsync();
      
      // Mark that recording has started after a short delay
      setTimeout(() => {
        recordingStartedRef.current = true;
      }, 200);

      // Handle the recording promise in the background (auto-stop case)
      recordingPromiseRef.current
        .then((result) => {
          if (result && result.uri && recordingStartedRef.current) {
            console.log('Video recorded (auto):', result.uri);
            // Sadece otomatik bittiğinde (manuel stop değilse) details ekranına git
            if (!stoppedManuallyRef.current && onVideoRecorded) {
              onVideoRecorded(result.uri);
            }
          }
        })
        .catch((error: any) => {
          // Only log/show error if recording actually started and wasn't manually stopped
          if (recordingStartedRef.current && isRecording) {
            // Ignore "stopped before data" errors - these are expected when stopping early
            if (!error?.message?.includes('stopped before')) {
              console.error('Recording error:', error);
            }
          }
        })
        .finally(() => {
          // Clean up only if this wasn't a manual stop
          if (!isRecording) {
            setIsRecording(false);
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            setRecordingTime(0);
            recordingPromiseRef.current = null;
            recordingStartedRef.current = false;
          }
        });
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
      recordingPromiseRef.current = null;
      recordingStartedRef.current = false;
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    // Bu çağrı manuel durdurma
    stoppedManuallyRef.current = true;

    // Wait a bit if recording hasn't started yet
    if (!recordingStartedRef.current) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    try {
      // Stop the recording
      cameraRef.current.stopRecording();
      
      // Wait for the recording promise to resolve (it will reject with "stopped before" if too early)
      if (recordingPromiseRef.current) {
        try {
          const result = await recordingPromiseRef.current;
          if (result && result.uri) {
            console.log('Video recorded (manual):', result.uri);
            if (onVideoRecorded) {
              onVideoRecorded(result.uri);
            }
          }
        } catch (error: any) {
          // Silently ignore "stopped before data" errors - these are expected for very short recordings
          if (!error?.message?.includes('stopped before')) {
            console.error('Recording error:', error);
          }
        }
      }
    } catch (error: any) {
      // Ignore stop errors - they're usually harmless
      console.log('Stop recording:', error?.message || 'Recording stopped');
    } finally {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingTime(0);
      recordingPromiseRef.current = null;
      recordingStartedRef.current = false;
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!result.canceled) {
      console.log('Selected:', result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      {isActive ? (
        <View style={styles.cameraWrapper}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            flash={flash}
            mode="video"
          />

          {/* Top Bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.topButton} onPress={onClose}>
              <Ionicons name="close-outline" size={32} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.topButton, flash === 'on' && styles.topButtonActive]}
              onPress={() => setFlash(f => f === 'on' ? 'off' : 'on')}
            >
              <Ionicons name={flash === 'on' ? 'flash' : 'flash-off-outline'} size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Side Features - Vertical */}
          <View style={[styles.sideFeatures, { top: insets.top + 80 }]}>
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="musical-notes-outline" size={24} color="#fff" />
              <Text style={styles.featureText}>Music</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="sparkles-outline" size={24} color="#fff" />
              <Text style={styles.featureText}>Effects</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="color-filter-outline" size={24} color="#fff" />
              <Text style={styles.featureText}>Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.featureButton}>
              <Ionicons name="timer-outline" size={24} color="#fff" />
              <Text style={styles.featureText}>Timer</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            {/* Gallery */}
            <TouchableOpacity style={styles.galleryButton} onPress={openGallery}>
              {recentPhoto ? (
                <Image source={{ uri: recentPhoto }} style={styles.galleryThumb} />
              ) : (
                <Ionicons name="images-outline" size={28} color="#fff" />
              )}
            </TouchableOpacity>

            {/* Capture Button with Progress */}
            <View style={styles.captureContainer}>
              {isRecording && <ProgressCircle progress={recordingTime / MAX_RECORDING_TIME} />}
              <Animated.View style={[styles.captureOuter, { transform: [{ scale: scaleAnim }] }]}>
                <TouchableOpacity
                  style={[styles.captureButton, isRecording && styles.captureButtonRecording]}
                  onPress={toggleRecording}
                  activeOpacity={0.9}
                >
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </Animated.View>
              {!isRecording && <Text style={styles.captureHint}>Tap to Record</Text>}
              {isRecording && <Text style={styles.captureHint}>Tap to Stop</Text>}
            </View>

            {/* Flip Camera */}
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse-outline" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.inactiveView}>
          <Ionicons name="camera-outline" size={80} color="#666" />
          <Text style={styles.inactiveText}>Camera inactive</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraWrapper: { flex: 1 },
  camera: { ...StyleSheet.absoluteFillObject },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionTitle: { fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 24, marginBottom: 12 },
  permissionText: { fontSize: 16, color: '#ccc', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  permissionButton: { backgroundColor: '#FFFC00', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30 },
  permissionButtonText: { color: '#000', fontSize: 16, fontWeight: '700' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 10 },
  topButton: { padding: 8 },
  topButtonActive: { backgroundColor: 'rgba(255, 252, 0, 0.2)', borderRadius: 24 },
  sideFeatures: { position: 'absolute', right: 12, gap: 24, alignItems: 'center', zIndex: 10 },
  featureButton: { alignItems: 'center', gap: 4 },
  featureText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 40 },
  galleryButton: { width: 52, height: 52, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  galleryThumb: { width: 48, height: 48, borderRadius: 6 },
  captureContainer: { alignItems: 'center', position: 'relative' },
  progressSvg: { position: 'absolute', top: -3, left: -3 },
  captureOuter: { width: 88, height: 88, borderRadius: 44, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureButtonRecording: { backgroundColor: '#FF3040', borderRadius: 12, width: 50, height: 50 },
  captureInner: { width: '100%', height: '100%', borderRadius: 35 },
  captureHint: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 8 },
  flipButton: { padding: 8 },
  inactiveView: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  inactiveText: { color: '#666', fontSize: 16 },
});
