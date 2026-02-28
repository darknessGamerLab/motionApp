import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AddVideoDetailsScreen from './AddVideoDetailsScreen';

interface CreateScreenProps {
  isActive?: boolean;
  onClose?: () => void;
  onVideoPublished?: (videoUri: string, description?: string, topic?: string) => void;
}

export default function CreateScreen({
  isActive = false,
  onClose,
  onVideoPublished,
}: CreateScreenProps) {
  // ALL HOOKS AT TOP
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeRef = useRef(0);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingPromiseRef = useRef<Promise<{ uri: string }> | null>(null);

  const MAX_RECORDING_TIME = 60;
  const MIN_RECORDING_TIME = 1000;

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    setIsRecording(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recordingPromiseRef.current = null;
  }, []);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    const duration = Date.now() - recordingStartTimeRef.current;

    if (duration < MIN_RECORDING_TIME) {
      Alert.alert('Kayıt çok kısa', 'En az 1 saniye kayıt yapmalısınız');
      try {
        cameraRef.current.stopRecording();
      } catch { }
      cleanup();
      return;
    }

    try {
      cameraRef.current.stopRecording();
    } catch (error) {
      cleanup();
    }
  }, [isRecording, cleanup]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    // Mikrofon izni kontrolü
    if (!microphonePermission?.granted) {
      const micResult = await requestMicrophonePermission();
      if (!micResult.granted) {
        Alert.alert('Mikrofon İzni', 'Video kaydetmek için mikrofon iznine ihtiyacımız var');
        return;
      }
    }

    try {
      recordingTimeRef.current = 0;
      recordingStartTimeRef.current = Date.now();
      setRecordingTime(0);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
        recordingTimeRef.current = elapsed;
        setRecordingTime(elapsed);

        if (elapsed >= MAX_RECORDING_TIME) {
          stopRecording();
        }
      }, 100);

      // recordAsync'i başlat ve promise'i sakla
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_TIME,
      }) as Promise<{ uri: string }>;

      const currentPromise = recordingPromiseRef.current;
      if (currentPromise) {
        currentPromise.then((result) => {
          cleanup();
          if (result?.uri) {
            setRecordedVideoUri(result.uri);
          }
        }).catch((error: any) => {
          cleanup();
          if (error?.message?.includes('stopped') || error?.message?.includes('Recording') || error?.code === 'E_RECORDING_STOPPED') {
            return;
          }
          console.log('Recording error:', error);
          Alert.alert('Kayıt Hatası', 'Video kaydedilemedi. Tekrar deneyin.');
        });
      }
    } catch (error: any) {
      cleanup();
      console.log('Start recording error:', error);
      Alert.alert('Hata', 'Kayıt başlatılamadı. Tekrar deneyin.');
    }
  }, [isRecording, cleanup, stopRecording, microphonePermission, requestMicrophonePermission]);

  const handleCapturePress = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handlePickVideo = useCallback(async () => {
    if (isRecording) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setRecordedVideoUri(result.assets[0].uri);
    }
  }, [isRecording]);

  const toggleCamera = useCallback(() => {
    if (isRecording) return;
    setFacing(f => f === 'back' ? 'front' : 'back');
  }, [isRecording]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleVideoPublish = useCallback((description: string, tags: string[]) => {
    // tags artık talent ID'leri içeriyor, ilkini topic olarak kullan
    const { getTalentById } = require('@/constants/Talents');
    const topicTalent = tags.length > 0 ? getTalentById(tags[0]) : null;
    const topic = topicTalent ? `#${topicTalent.name.toLowerCase()}` : undefined;
    const fullDescription = description;
    if (onVideoPublished && recordedVideoUri) {
      onVideoPublished(recordedVideoUri, fullDescription, topic);
    }
    setRecordedVideoUri(null);
  }, [onVideoPublished, recordedVideoUri]);

  const handleBackFromDetails = useCallback(() => {
    setRecordedVideoUri(null);
  }, []);

  // Conditional returns AFTER all hooks
  if (recordedVideoUri) {
    return (
      <AddVideoDetailsScreen
        videoUri={recordedVideoUri}
        onBack={handleBackFromDetails}
        onPublish={handleVideoPublish}
      />
    );
  }

  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={64} color="#DC143C" />
          </View>
          <Text style={styles.permissionTitle}>Kamera İzni</Text>
          <Text style={styles.permissionText}>
            Video oluşturmak için kamera erişimine ihtiyacımız var
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closePermissionButton} onPress={onClose}>
            <Text style={styles.closePermissionButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isActive ? (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="video">
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.topButton} onPress={onClose}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <View style={styles.topCenter}>
              {isRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>REC</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.topButton} onPress={toggleCamera} disabled={isRecording}>
              <Ionicons name="camera-reverse-outline" size={28} color={isRecording ? '#666' : '#fff'} />
            </TouchableOpacity>
          </View>

          {/* Recording Timer */}
          {isRecording && (
            <View style={styles.timerContainer}>
              <View style={styles.timerBackground}>
                <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(recordingTime / MAX_RECORDING_TIME) * 100}%` }]} />
                </View>
              </View>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.sideButton} onPress={handlePickVideo} disabled={isRecording}>
              <Ionicons name="images-outline" size={28} color={isRecording ? '#666' : '#fff'} />
              <Text style={[styles.sideButtonText, isRecording && { color: '#666' }]}>Galeri</Text>
            </TouchableOpacity>

            <View style={styles.captureContainer}>
              <TouchableOpacity
                style={[styles.captureButton, isRecording && styles.captureButtonRecording]}
                onPress={handleCapturePress}
                activeOpacity={0.9}
              >
                {isRecording ? (
                  <View style={styles.stopIcon} />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sideButton} onPress={toggleCamera} disabled={isRecording}>
              <Ionicons name="sync-outline" size={28} color={isRecording ? '#666' : '#fff'} />
              <Text style={[styles.sideButtonText, isRecording && { color: '#666' }]}>Çevir</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.inactiveView}>
          <Ionicons name="camera-outline" size={80} color="#666" />
          <Text style={styles.inactiveText}>Kamera inaktif</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(220, 20, 60, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closePermissionButton: {
    paddingVertical: 12,
  },
  closePermissionButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 48, 64, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recordingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  timerContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  timerBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 100,
  },
  timerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  progressBar: {
    width: 80,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC143C',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  sideButton: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  sideButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#fff',
  },
  captureButtonRecording: {
    borderColor: '#FF3040',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3040',
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FF3040',
  },
  inactiveView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  inactiveText: {
    color: '#666',
    fontSize: 16,
  },
});
