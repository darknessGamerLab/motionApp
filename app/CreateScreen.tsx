import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * CreateScreen - Snapchat benzeri kamera UI
 * 
 * Fullscreen kamera preview
 * Fotoğraf çekme ve video kaydetme
 * Kamera flip, flash toggle
 */
interface CreateScreenProps {
  isActive?: boolean;
}

export default function CreateScreen({ isActive = false }: CreateScreenProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // İzin kontrolü
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#fff" />
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionText}>
            Fotoğraf ve video çekmek için kameraya erişim izni verin.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'on' ? 'off' : 'on'));
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      console.log('Photo taken:', photo.uri);
      // Burada fotoğrafı kaydedebilir veya işleyebilirsiniz
      Alert.alert('Başarılı', 'Fotoğraf çekildi!');
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    } finally {
      setIsCapturing(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    
    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60, // 60 saniye maksimum
      });
      if (video) {
        console.log('Video recorded:', video.uri);
        // Burada videoyu kaydedebilir veya işleyebilirsiniz
        Alert.alert('Başarılı', 'Video kaydedildi!');
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Hata', 'Video kaydedilirken bir hata oluştu.');
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  return (
    <View style={styles.container}>
      {isActive ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
          mode="picture"
        >
        {/* Top Controls */}
        <View style={[styles.topControls, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => console.log('Close')}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.topRightControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleFlash}
            >
              <Ionicons 
                name={flash === 'on' ? 'flash' : 'flash-off'} 
                size={28} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
          {/* Gallery Button */}
          <TouchableOpacity 
            style={styles.galleryButton}
            onPress={() => console.log('Gallery')}
          >
            <View style={styles.galleryThumbnail}>
              <Ionicons name="images-outline" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Capture Button */}
          <View style={styles.captureContainer}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                isRecording && styles.captureButtonRecording
              ]}
              onPress={takePicture}
              onLongPress={startRecording}
              onPressOut={stopRecording}
              disabled={isCapturing || isRecording}
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Kaydediliyor...</Text>
              </View>
            )}
          </View>

          {/* Settings/More Button */}
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => console.log('Settings')}
          >
            <Ionicons name="ellipsis-horizontal" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </CameraView>
      ) : (
        <View style={styles.camera}>
          <View style={styles.inactiveOverlay}>
            <Ionicons name="camera-outline" size={64} color="#666" />
            <Text style={styles.inactiveText}>Kamera aktif değil</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  galleryButton: {
    width: 50,
    height: 50,
  },
  galleryThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureContainer: {
    alignItems: 'center',
    gap: 12,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonRecording: {
    backgroundColor: '#ff0000',
    borderColor: 'rgba(255, 0, 0, 0.5)',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
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
    fontWeight: '600',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  inactiveText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
