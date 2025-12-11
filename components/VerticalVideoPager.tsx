import { ResizeMode, Video } from 'expo-av';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
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

export interface VerticalVideoPagerRef {
  togglePlayPause: () => void;
}

/**
 * VerticalVideoPager - Dikey video geçişleri için pager
 * 
 * Her video full screen olur
 * Gesture handling root seviyesinde yapılır
 */
export const VerticalVideoPager = forwardRef<VerticalVideoPagerRef, VerticalVideoPagerProps>(({
  videos,
  initialIndex = 0,
  onVideoChange,
  translateY,
  currentIndex,
  isActive = true,
  videoHeight,
  pageWidth,
}, ref) => {
  const insets = useSafeAreaInsets();
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const videoPositions = useRef<{ [key: string]: number }>({});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);

  // Expose togglePlayPause function to parent
  useImperativeHandle(ref, () => ({
    togglePlayPause: () => {
      const currentVideo = videoRefs.current[videos[currentVideoIndex]?.id];
      if (currentVideo) {
        currentVideo.getStatusAsync().then((status) => {
          if (status.isLoaded) {
            if (status.isPlaying) {
              currentVideo.pauseAsync();
              setIsPlaying(false);
            } else {
              currentVideo.playAsync();
              setIsPlaying(true);
            }
          }
        }).catch(() => {
          // Ignore errors
        });
      }
    },
  }));

  // Video pozisyonlarını kaydet ve shouldPlay prop'una göre oynatma/durdurma yap
  useEffect(() => {
    if (!isActive) {
      // Sayfa inaktif olduğunda tüm videoları durdur ve pozisyonlarını kaydet
      for (const video of videos) {
        const videoRef = videoRefs.current[video.id];
        if (videoRef) {
          videoRef.pauseAsync().then(() => {
            videoRef.getStatusAsync().then((status) => {
              if (status.isLoaded && status.positionMillis !== undefined) {
                videoPositions.current[video.id] = status.positionMillis;
              }
            }).catch(() => {});
          }).catch(() => {});
        }
      }
      return;
    }

    // Sayfa aktif olduğunda - aktif olmayan videoların pozisyonlarını kaydet
    // Oynatma/durdurma shouldPlay prop'u ile yönetiliyor
    for (let i = 0; i < videos.length; i++) {
      if (i !== currentVideoIndex) {
        const videoRef = videoRefs.current[videos[i].id];
        if (videoRef) {
          videoRef.pauseAsync().then(() => {
            videoRef.getStatusAsync().then((status) => {
              if (status.isLoaded && status.positionMillis !== undefined) {
                videoPositions.current[videos[i].id] = status.positionMillis;
              }
            }).catch(() => {});
          }).catch(() => {});
        }
      }
    }
  }, [isActive, currentVideoIndex, videos]);

  // currentIndex shared value'dan currentVideoIndex state'ini senkronize et
  const lastIndexRef = useRef<number | null>(null);
  
  useAnimatedReaction(
    () => Math.round(currentIndex.value),
    (roundedIndex) => {
      // Sadece değiştiğinde güncelle (sonsuz döngüyü önlemek için)
      if (lastIndexRef.current !== roundedIndex) {
        lastIndexRef.current = roundedIndex;
        runOnJS(setCurrentVideoIndex)(roundedIndex);
        runOnJS(setIsPlaying)(true); // Yeni video oynatılmaya başladığında playing state'ini true yap
        // onVideoChange çağrısı kaldırıldı: shared value zaten üst komponentten güncelleniyor,
        // burada tekrar çağırmak gereksiz döngüye yol açabiliyor.
      }
    }
  );

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
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={index === currentVideoIndex && isPlaying && isActive}
            isLooping
            isMuted={false}
            useNativeControls={false}
            onLoad={() => {
              // Video yüklendiğinde, eğer bu aktif video ise ve kaydedilmiş pozisyon varsa oradan başlat
              const currentIndexValue = Math.round(currentIndex.value);
              if (currentIndexValue === index && isActive) {
                const savedPosition = videoPositions.current[video.id];
                const videoRef = videoRefs.current[video.id];
                if (videoRef && savedPosition !== undefined && savedPosition > 0) {
                  videoRef.setPositionAsync(savedPosition).catch(() => {});
                }
              }
            }}
          />
        </Animated.View>
      )      )}
    </Animated.View>
  );
});

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

