import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VideoItem {
  id: string;
  uri: string;
}

interface VerticalVideoPagerProps {
  videos: VideoItem[];
  initialIndex?: number;
  onVideoChange?: (index: number) => void;
  translateY: SharedValue<number>;
  currentIndex: SharedValue<number>;
  isActive?: boolean;
  videoHeight: number;
  pageWidth: number;
}

/**
 * VerticalVideoPager - Dikey video geçişleri için pager
 * 
 * Her video full screen olur
 * Gesture handling root seviyesinde yapılır
 */
export function VerticalVideoPager({
  videos,
  initialIndex = 0,
  onVideoChange,
  translateY,
  currentIndex,
  isActive = true,
  videoHeight,
  pageWidth,
}: VerticalVideoPagerProps) {
  const insets = useSafeAreaInsets();
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const videoPositions = useRef<{ [key: string]: number }>({});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialIndex);

  // Aktif/pasif durumuna göre videoları yönet
  useEffect(() => {
    if (!isActive) {
      // Sayfa inaktif olduğunda tüm videoları durdur ve pozisyonlarını kaydet
      const saveAllPositions = async () => {
        for (const video of videos) {
          const videoRef = videoRefs.current[video.id];
          if (videoRef) {
            try {
              await videoRef.pauseAsync();
              const status = await videoRef.getStatusAsync();
              if (status.isLoaded && status.positionMillis !== undefined) {
                videoPositions.current[video.id] = status.positionMillis;
              }
            } catch (error) {
              console.log('Error saving video position:', error);
            }
          }
        }
      };
      saveAllPositions();
      return;
    }

    // Sayfa aktif olduğunda
    // Önceki videoyu durdur ve pozisyonunu kaydet
    const prevIndex = currentVideoIndex - 1;
    const nextIndex = currentVideoIndex + 1;
    
    const saveVideoPosition = async (videoId: string) => {
      const video = videoRefs.current[videoId];
      if (video) {
        try {
          const status = await video.getStatusAsync();
          if (status.isLoaded && status.positionMillis !== undefined) {
            videoPositions.current[videoId] = status.positionMillis;
          }
        } catch (error) {
          // Ignore errors
        }
      }
    };
    
    if (prevIndex >= 0 && videoRefs.current[videos[prevIndex]?.id]) {
      const prevVideo = videoRefs.current[videos[prevIndex].id];
      prevVideo?.pauseAsync();
      saveVideoPosition(videos[prevIndex].id);
    }
    if (nextIndex < videos.length && videoRefs.current[videos[nextIndex]?.id]) {
      const nextVideo = videoRefs.current[videos[nextIndex].id];
      nextVideo?.pauseAsync();
      saveVideoPosition(videos[nextIndex].id);
    }
    
    // Mevcut videoyu oynat (kaldığı yerden)
    const currentVideo = videoRefs.current[videos[currentVideoIndex]?.id];
    if (currentVideo) {
      const savedPosition = videoPositions.current[videos[currentVideoIndex].id];
      if (savedPosition !== undefined && savedPosition > 0) {
        // Kaldığı yerden devam et
        currentVideo.setPositionAsync(savedPosition).then(() => {
          currentVideo.playAsync();
        }).catch(() => {
          // Hata olursa baştan başlat
          currentVideo.playAsync();
        });
      } else {
        // İlk kez oynatılıyorsa baştan başlat
        currentVideo.playAsync();
      }
    }
  }, [isActive, currentVideoIndex, videos]);

  const handleVideoChange = (index: number) => {
    setCurrentVideoIndex(index);
    if (onVideoChange) {
      onVideoChange(index);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (videos.length === 0 || videoHeight <= 0 || pageWidth <= 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          width: pageWidth,
          height: videoHeight * videos.length,
          paddingBottom: insets.bottom,
        },
        animatedStyle
      ]}
    >
      {videos.map((video, index) => (
        <Animated.View 
          key={video.id} 
          style={[
            styles.videoContainer,
            { 
              width: pageWidth,
              top: index * videoHeight,
              height: videoHeight,
            }
          ]}
        >
          <Video
            ref={(ref: Video | null) => {
              videoRefs.current[video.id] = ref;
            }}
            style={StyleSheet.absoluteFill}
            source={{ uri: video.uri }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={index === currentVideoIndex}
            isLooping
            isMuted={false}
            useNativeControls={false}
          />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

// Export helper functions for gesture handling
export const VerticalVideoPagerHelpers = {
  handleVerticalGesture: (
    deltaTranslationY: number,
    velocityY: number,
    translateY: SharedValue<number>,
    currentIndex: SharedValue<number>,
    videoCount: number,
    videoHeight: number
  ) => {
    'worklet';
    const newTranslateY = translateY.value + deltaTranslationY;
    
    // Sınırları kontrol et
    const minTranslateY = -videoHeight * (videoCount - 1);
    const maxTranslateY = 0;
    
    if (newTranslateY >= minTranslateY && newTranslateY <= maxTranslateY) {
      translateY.value = newTranslateY;
    }
  },

  handleVerticalGestureEnd: (
    velocityY: number,
    translateY: SharedValue<number>,
    currentIndex: SharedValue<number>,
    videoCount: number,
    videoHeight: number,
    onVideoChange?: (index: number) => void
  ) => {
    'worklet';
    const currentTranslateY = translateY.value;
    const videoIndex = Math.round(-currentTranslateY / videoHeight);
    
    // Velocity'e göre video değiştir (flick gesture)
    let targetIndex = videoIndex;
    if (Math.abs(velocityY) > 800) {
      if (velocityY > 0 && videoIndex > 0) {
        targetIndex = videoIndex - 1;
      } else if (velocityY < 0 && videoIndex < videoCount - 1) {
        targetIndex = videoIndex + 1;
      }
    }

    // Sınırları kontrol et
    targetIndex = Math.max(0, Math.min(videoCount - 1, targetIndex));
    
    currentIndex.value = targetIndex;
    translateY.value = withSpring(-videoHeight * targetIndex, {
      damping: 25,
      stiffness: 120,
      mass: 0.8,
    });
    
    if (onVideoChange) {
      runOnJS(onVideoChange)(targetIndex);
    }
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  videoContainer: {
    position: 'absolute',
    left: 0,
    backgroundColor: '#000',
  },
});

