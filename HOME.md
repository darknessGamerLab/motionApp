# HomeScreen - Ana Sayfa Kodları

## 📋 İçindekiler

1. [HomeScreen Mimarisi](#homescreen-mimarisi)
2. [app/HomeScreen.tsx](#apphomescreentsx)
3. [components/VerticalVideoPager.tsx](#componentsverticalvideopagertsx)

---

## 🏗️ HomeScreen Mimarisi

### Genel Yapı

HomeScreen, TikTok/Instagram Reels benzeri ana video ekranıdır. Ana özellikleri:

- **Fullscreen Video Player**: Her video tam ekran gösterilir
- **Dikey Video Geçişi**: Yukarı/aşağı swipe ile videolar arası geçiş
- **Single/Double Tap**: Tek tıklama play/pause, çift tıklama beğeni
- **Video Container Click**: Video container'ın tamamı (boşluklar dahil) tıklanabilir
- **Video Overlay**: Avatar, username, follow button, description, action buttons (like, share, save, category)
- **Floating Heart Animation**: Beğeni animasyonu
- **Müzik Desteği**: Her video için ayrı müzik çalma desteği
- **Video Pozisyon Kaydı**: Video kaldığı yerden devam eder

### Mimari Akış

```
HomeScreen
├── VerticalVideoPager (Dikey video geçişleri)
│   ├── Video (Her video için ayrı instance)
│   │   ├── Video Component (expo-av)
│   │   └── Invisible View (Tap gesture için)
│   └── VideoOverlay (Sosyal medya elementleri)
│       ├── FloatingHeart (Beğeni animasyonu)
│       ├── User Info (Avatar, Username, Follow)
│       ├── Description
│       └── Action Buttons (Like, Share, Save, Category)
└── GestureDetector (Tap Gesture - Single/Double tap)
```

### Gesture Yönetimi

- **Dikey Swipe**: Root seviyesinde `Pan` gesture ile yönetilir (sadece HomeScreen aktifken)
- **Single Tap**: Video play/pause toggle
- **Double Tap**: Beğeni işlemi (like button'a tıklama ile aynı)
- **Action Button Area**: Ekranın alt %30'unda tap gesture'ları ignore edilir

---

## app/HomeScreen.tsx

Ana video ekranı. Video listesi ve overlay elementleri.

```typescript
import { VerticalVideoPager } from '@/components/VerticalVideoPager';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * HomeScreen - Ana video ekranı
 * 
 * Fullscreen video player
 * Vertical locked swipe → nextVideo(), prevVideo()
 * Player sabit durur, videolar değişir (TikTok logic)
 */

// Video ve kullanıcı verisi interface'i
interface VideoData {
  id: string;
  uri: string;
  musicUri?: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  description: string;
  category: string;
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
}

// Örnek video listesi - gerçek uygulamada API'den gelecek
const SAMPLE_VIDEOS: VideoData[] = [
  {
    id: '1',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    user: {
      id: 'user1',
      username: 'johndoe',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    description: 'Amazing sunset view from the mountains! 🌄 #nature #sunset',
    category: 'Nature',
    likes: 1250,
    isLiked: false,
    isSaved: false,
  },
  {
    id: '2',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    user: {
      id: 'user2',
      username: 'janedoe',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    description: 'Check out this incredible animation! 🎬 #animation #art',
    category: 'Art',
    likes: 3420,
    isLiked: true,
    isSaved: false,
  },
  {
    id: '3',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: {
      id: 'user3',
      username: 'techguru',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    description: 'Latest tech trends and innovations 💻 #tech #innovation',
    category: 'Technology',
    likes: 890,
    isLiked: false,
    isSaved: true,
  },
];

interface HomeScreenProps {
  translateY: SharedValue<number>;
  currentVideoIndex: SharedValue<number>;
  onVideoChange?: (index: number) => void;
  isActive?: boolean;
  videoHeight: number;
  layoutReady: boolean;
  pageWidth: number;
  onNewVideoPublishedRef?: React.MutableRefObject<((videoData: any) => void) | null>;
}

// Floating Heart Animation Component
function FloatingHeart({ onComplete }: { onComplete?: () => void }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Animasyonu başlat - daha belirgin animasyon
    scale.value = withSpring(1.2, { damping: 6, stiffness: 150 }); // Daha büyük scale ve daha hızlı spring
    translateY.value = withTiming(-120, { duration: 1200 }); // Daha yukarı ve daha uzun süre
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }), // Hızlı görünme
      withTiming(1, { duration: 800 }), // Uzun süre görünür kalma
      withTiming(0, { duration: 300 }) // Hızlı kaybolma
    );
    
    // Animasyon bitince callback çağır
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 1200);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const colors = ['#FF3040', '#FF6B9D', '#FF8C94', '#FFB3BA', '#FFD1DC', '#FF1493', '#FF69B4'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        styles.floatingHeart,
        {
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -50, // Kalp genişliğinin yarısı (100/2)
          marginTop: -50, // Kalp yüksekliğinin yarısı (100/2)
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Ionicons name="heart" size={100} color={randomColor} />
    </Animated.View>
  );
}

// Video Overlay Bileşeni
function VideoOverlay({ 
  video, 
  onLike, 
  onShare, 
  onSave, 
  onCategory,
  onFollow,
  onLikeRef,
  videoHeight
}: { 
  video: VideoData;
  onLike: () => void;
  onShare: () => void;
  onSave: () => void;
  onCategory: () => void;
  onFollow: () => void;
  onLikeRef?: React.MutableRefObject<(() => void) | null>;
  videoHeight: number;
}) {
  const insets = useSafeAreaInsets();
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [isSaved, setIsSaved] = useState(video.isSaved);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [hearts, setHearts] = useState<Array<{ id: number; count: number }>>([]);
  const heartIdCounter = useRef(0);
  const categoryTextRef = useRef<Text>(null);
  const [categoryTextWidth, setCategoryTextWidth] = useState(0);
  const [categoryContainerWidth, setCategoryContainerWidth] = useState(0);

  // Video değiştiğinde state'leri güncelle
  useEffect(() => {
    setIsLiked(video.isLiked);
    setIsSaved(video.isSaved);
    setLikeCount(video.likes);
    setHearts([]); // Video değişince kalpleri temizle
  }, [video.id]);

  const handleLike = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    
    // Beğeni animasyonu ekle (sadece beğenildiğinde)
    if (newLiked) {
      const newHeartId = heartIdCounter.current++;
      setHearts(prev => [...prev, { id: newHeartId, count: 1 }]);
    }
    
    onLike();
  };

  const removeHeart = (heartGroupId: number) => {
    setHearts(prev => prev.filter(h => h.id !== heartGroupId));
  };

  // Expose handleLike via ref
  useEffect(() => {
    if (onLikeRef) {
      onLikeRef.current = handleLike;
    }
  }, [onLikeRef, isLiked, likeCount]);

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave();
  };

  // Overlay zaten video container içinde, video container zaten translateY ile kayıyor
  // Bu yüzden overlay'e ayrıca translateY animasyonu eklemeye gerek yok
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Beğeni animasyonu kalpleri */}
      {hearts.map((heartGroup) => (
        <FloatingHeart 
          key={heartGroup.id} 
          onComplete={() => removeHeart(heartGroup.id)}
        />
      ))}
      {/* Alt tarafta: Avatar + Username + Follow + Description + Action Buttons - Sabit konum, navigation bar'ın üstünde */}
      <View 
        style={[styles.bottomInfo, { bottom: 20 }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
      >
        <View style={styles.userInfoRow}>
          <Image 
            source={{ uri: video.user.avatar || 'https://i.pravatar.cc/150' }} 
            style={styles.avatar}
          />
          <Text style={styles.username}>{video.user.username}</Text>
          <TouchableOpacity style={styles.followButton} onPress={onFollow}>
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>{video.description}</Text>
        
        {/* Action Buttons - Description altında, yan yana */}
        <View 
          style={styles.actionButtonsRow}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
        >
          {/* Like Button */}
          <TouchableOpacity 
            style={[styles.actionButton, isLiked && styles.actionButtonLiked]} 
            onPress={handleLike}
          >
            <Ionicons 
              name={isLiked ? 'heart' : 'heart-outline'} 
              size={18} 
              color={isLiked ? '#FF3040' : '#fff'} 
            />
            <Text style={styles.actionButtonText}>
              {formatCount(likeCount)}
            </Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Ionicons name="paper-plane-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.actionButton, isSaved && styles.actionButtonSaved]} 
            onPress={handleSave}
          >
            <Ionicons 
              name={isSaved ? 'bookmark' : 'bookmark-outline'} 
              size={18} 
              color={isSaved ? '#FFD700' : '#fff'} 
            />
            <Text style={[styles.actionButtonText, isSaved && styles.actionButtonTextSaved]}>
              Save
            </Text>
          </TouchableOpacity>

          {/* Category Button */}
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={onCategory}
            activeOpacity={0.7}
          >
            <Text style={styles.hashtagIcon}>#</Text>
            <View 
              style={styles.categoryTextContainer}
              onLayout={(e) => setCategoryContainerWidth(e.nativeEvent.layout.width)}
            >
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContent}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                scrollEnabled={categoryTextWidth > categoryContainerWidth && categoryContainerWidth > 0}
              >
                <Text 
                  ref={categoryTextRef}
                  style={styles.actionButtonText} 
                  numberOfLines={1}
                  onLayout={(e) => setCategoryTextWidth(e.nativeEvent.layout.width)}
                >
                  {video.category}
                </Text>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Sayı formatlama fonksiyonu
function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

export default function HomeScreen({ 
  translateY, 
  currentVideoIndex,
  onVideoChange,
  isActive = true,
  videoHeight,
  layoutReady,
  pageWidth,
  onNewVideoPublishedRef,
}: HomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState(SAMPLE_VIDEOS);
  const videoControlRef = useRef<{
    togglePlayPause: () => void;
    getCurrentVideoId: () => string | null;
  } | null>(null);
  const videoOverlayLikeRef = useRef<(() => void) | null>(null);
  
  // Double tap detection
  const lastTapRef = useRef<number>(0);
  const doubleTapDelay = 300; // ms
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Video yayınlama callback'ini expose et
  React.useEffect(() => {
    if (onNewVideoPublishedRef) {
      onNewVideoPublishedRef.current = (videoData: any) => {
        setVideos(prevVideos => [videoData, ...prevVideos]);
        // Yeni video başa eklendiği için index 0'a git
        currentVideoIndex.value = 0;
        setCurrentIndex(0);
      };
    }
  }, [onNewVideoPublishedRef, currentVideoIndex]);

  // currentVideoIndex değişikliklerini takip et
  useAnimatedReaction(
    () => currentVideoIndex.value,
    (index) => {
      runOnJS(setCurrentIndex)(Math.round(index));
    }
  );

  const handleVideoChange = (index: number) => {
    setCurrentIndex(index);
    if (onVideoChange) {
      onVideoChange(index);
    }
  };

  const handleLike = () => {
    console.log('Like pressed for video:', videos[currentIndex].id);
  };

  const handleShare = () => {
    console.log('Share pressed for video:', videos[currentIndex].id);
  };

  const handleSave = () => {
    console.log('Save pressed for video:', videos[currentIndex].id);
  };

  const handleCategory = () => {
    console.log('Category pressed:', videos[currentIndex].category);
  };

  const handleFollow = () => {
    console.log('Follow pressed for user:', videos[currentIndex].user.username);
  };

  const handleScreenPress = () => {
    // Single tap - toggle play/pause
    if (videoControlRef.current) {
      videoControlRef.current.togglePlayPause();
    }
  };

  const handleDoubleTap = () => {
    // Double tap - like (same as clicking the like button)
    if (videoOverlayLikeRef.current) {
      videoOverlayLikeRef.current();
    }
  };

  // Single tap gesture
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .shouldCancelWhenOutside(true)
    .onEnd((event) => {
      // Action button alanında tıklama yapıldıysa gesture'ı ignore et
      // bottomInfo genellikle ekranın alt %30'unda olur
      const screenHeight = videoHeight;
      const tapY = event.y;
      const bottomInfoStart = screenHeight * 0.7; // Ekranın alt %30'u
      
      if (tapY > bottomInfoStart) {
        // Action button alanında, gesture'ı ignore et
        return;
      }
      
      const now = Date.now();
      if (lastTapRef.current && (now - lastTapRef.current) < doubleTapDelay) {
        // This is a double tap, ignore single tap
        return;
      }
      lastTapRef.current = now;
      // Clear any existing timeout
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      // Wait to see if there's a second tap
      singleTapTimeoutRef.current = setTimeout(() => {
        if (lastTapRef.current === now) {
          runOnJS(handleScreenPress)();
        }
      }, doubleTapDelay);
    });

  // Double tap gesture
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .shouldCancelWhenOutside(true)
    .onEnd((event) => {
      // Action button alanında tıklama yapıldıysa gesture'ı ignore et
      const screenHeight = videoHeight;
      const tapY = event.y;
      const bottomInfoStart = screenHeight * 0.7; // Ekranın alt %30'u
      
      if (tapY > bottomInfoStart) {
        // Action button alanında, gesture'ı ignore et
        return;
      }
      
      // Clear single tap timeout
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      runOnJS(handleDoubleTap)();
    });

  // Combine gestures
  const tapGesture = Gesture.Race(doubleTap, singleTap);

  const currentVideo = videos[currentIndex] || videos[0];

  if (!layoutReady || videoHeight <= 0 || pageWidth <= 0) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <VerticalVideoPager
        videos={videos.map(v => ({ id: v.id, uri: v.uri, musicUri: v.musicUri }))}
        initialIndex={0}
        onVideoChange={handleVideoChange}
        translateY={translateY}
        currentIndex={currentVideoIndex}
        isActive={isActive}
        videoHeight={videoHeight}
        pageWidth={pageWidth}
        onVideoControlRef={videoControlRef}
        tapGesture={tapGesture}
        renderOverlay={(videoItem, index) => {
          // VideoItem'dan VideoData'ya dönüştür
          const videoData = videos.find(v => v.id === videoItem.id);
          if (!videoData) return null;
          
          return layoutReady ? (
            <VideoOverlay
              key={`overlay-${videoItem.id}`}
              video={videoData}
              onLike={() => handleLike()}
              onShare={() => handleShare()}
              onSave={() => handleSave()}
              onCategory={() => handleCategory()}
              onFollow={() => handleFollow()}
              onLikeRef={index === currentIndex ? videoOverlayLikeRef : undefined}
              videoHeight={videoHeight}
            />
          ) : null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  followButton: {
    backgroundColor: '#0095f6',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  bottomInfo: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  description: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 0, // Allow flex to shrink
    overflow: 'hidden', // Clip content
  },
  categoryTextContainer: {
    flex: 1,
    minWidth: 0, // Allow shrinking
    maxWidth: '100%',
  },
  categoryScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonTextSaved: {
    color: '#FFD700',
  },
  actionButtonLiked: {
    // Optional: subtle background tint when liked
  },
  actionButtonSaved: {
    // Optional: subtle background tint when saved
  },
  floatingHeart: {
    zIndex: 1000,
  },
  hashtagIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
```

---

## components/VerticalVideoPager.tsx

Dikey video geçişleri için pager component'i.

```typescript
import { Audio, ResizeMode, Video } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
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
  musicUri?: string;
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
  onVideoControlRef?: React.MutableRefObject<{
    togglePlayPause: () => void;
    getCurrentVideoId: () => string | null;
  } | null>;
  renderOverlay?: (video: VideoItem, index: number) => React.ReactNode;
  tapGesture?: any; // Gesture object
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
  onVideoControlRef,
  renderOverlay,
  tapGesture,
}: VerticalVideoPagerProps) {
  const insets = useSafeAreaInsets();
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const videoPositions = useRef<{ [key: string]: number }>({});
  const musicSoundRefs = useRef<{ [key: string]: Audio.Sound | null }>({});
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
          // Müzikleri durdur
          const musicSound = musicSoundRefs.current[video.id];
          if (musicSound) {
            try {
              await musicSound.pauseAsync();
            } catch (error) {
              // Ignore errors
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
    
    const stopMusic = async (videoId: string) => {
      const musicSound = musicSoundRefs.current[videoId];
      if (musicSound) {
        try {
          await musicSound.pauseAsync();
        } catch (error) {
          // Ignore errors
        }
      }
    };
    
    if (prevIndex >= 0 && videoRefs.current[videos[prevIndex]?.id]) {
      const prevVideo = videoRefs.current[videos[prevIndex].id];
      prevVideo?.pauseAsync();
      saveVideoPosition(videos[prevIndex].id);
      stopMusic(videos[prevIndex].id);
    }
    if (nextIndex < videos.length && videoRefs.current[videos[nextIndex]?.id]) {
      const nextVideo = videoRefs.current[videos[nextIndex].id];
      nextVideo?.pauseAsync();
      saveVideoPosition(videos[nextIndex].id);
      stopMusic(videos[nextIndex].id);
    }
    
    // Mevcut videoyu oynat (kaldığı yerden)
    const currentVideo = videoRefs.current[videos[currentVideoIndex]?.id];
    const currentVideoData = videos[currentVideoIndex];
    
    if (currentVideo) {
      const savedPosition = videoPositions.current[videos[currentVideoIndex].id];
      if (savedPosition !== undefined && savedPosition > 0) {
        // Kaldığı yerden devam et
        currentVideo.setPositionAsync(savedPosition).then(() => {
          currentVideo.playAsync();
          // Müzik varsa başlat
          if (currentVideoData.musicUri) {
            playMusicForVideo(currentVideoData.id, currentVideoData.musicUri);
          }
        }).catch(() => {
          // Hata olursa baştan başlat
          currentVideo.playAsync();
          if (currentVideoData.musicUri) {
            playMusicForVideo(currentVideoData.id, currentVideoData.musicUri);
          }
        });
      } else {
        // İlk kez oynatılıyorsa baştan başlat
        currentVideo.playAsync();
        // Müzik varsa başlat
        if (currentVideoData.musicUri) {
          playMusicForVideo(currentVideoData.id, currentVideoData.musicUri);
        }
      }
    }
  }, [isActive, currentVideoIndex, videos]);
  
  // Müzik çalma fonksiyonu
  const playMusicForVideo = async (videoId: string, musicUri: string) => {
    try {
      // Önceki müziği temizle
      const existingMusic = musicSoundRefs.current[videoId];
      if (existingMusic) {
        await existingMusic.unloadAsync();
        musicSoundRefs.current[videoId] = null;
      }
      
      // Yeni müziği yükle ve çal
      const { sound } = await Audio.Sound.createAsync(
        { uri: musicUri },
        { shouldPlay: true, isLooping: true }
      );
      musicSoundRefs.current[videoId] = sound;
    } catch (error) {
      console.error('Error loading music for video:', error);
    }
  };
  
  // Cleanup: Component unmount olduğunda tüm müzikleri temizle
  useEffect(() => {
    return () => {
      Object.values(musicSoundRefs.current).forEach(async (musicSound) => {
        if (musicSound) {
          try {
            await musicSound.unloadAsync();
          } catch (error) {
            // Ignore errors
          }
        }
      });
      musicSoundRefs.current = {};
    };
  }, []);

  const handleVideoChange = (index: number) => {
    setCurrentVideoIndex(index);
    if (onVideoChange) {
      onVideoChange(index);
    }
  };

  // Video kontrol fonksiyonlarını expose et
  const togglePlayPause = async () => {
    const currentVideoId = videos[currentVideoIndex]?.id;
    if (!currentVideoId) return;
    
    const videoRef = videoRefs.current[currentVideoId];
    if (videoRef) {
      try {
        const status = await videoRef.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await videoRef.pauseAsync();
            // Müziği de durdur
            const musicSound = musicSoundRefs.current[currentVideoId];
            if (musicSound) {
              await musicSound.pauseAsync();
            }
          } else {
            await videoRef.playAsync();
            // Müziği de başlat
            const currentVideoData = videos[currentVideoIndex];
            if (currentVideoData.musicUri) {
              playMusicForVideo(currentVideoId, currentVideoData.musicUri);
            }
          }
        }
      } catch (error) {
        console.error('Error toggling play/pause:', error);
      }
    }
  };

  const getCurrentVideoId = (): string | null => {
    return videos[currentVideoIndex]?.id || null;
  };

  // Ref'i expose et
  useEffect(() => {
    if (onVideoControlRef) {
      onVideoControlRef.current = {
        togglePlayPause,
        getCurrentVideoId,
      };
    }
  }, [onVideoControlRef, currentVideoIndex, videos]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (videos.length === 0 || videoHeight <= 0 || pageWidth <= 0) {
    return null;
  }

  const content = (
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
          collapsable={false}
        >
          {/* Video container'ın tamamını tıklanabilir yapmak için invisible View - gesture'ı alır */}
          <View style={StyleSheet.absoluteFill} />
          <Video
            ref={(ref: Video | null) => {
              videoRefs.current[video.id] = ref;
            }}
            style={StyleSheet.absoluteFill}
            source={{ uri: video.uri }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={index === currentVideoIndex}
            isLooping
            isMuted={false}
            useNativeControls={false}
            pointerEvents="none"
          />
          {/* Her video için overlay render et */}
          {renderOverlay && renderOverlay(video, index)}
        </Animated.View>
      ))}
    </Animated.View>
  );

  // Eğer tapGesture varsa GestureDetector ile sarmala
  if (tapGesture) {
    return <GestureDetector gesture={tapGesture}>{content}</GestureDetector>;
  }

  return content;
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
```

---

## 📝 Özet

Bu dosya, HomeScreen (Ana Sayfa) ile ilgili tüm kodları içermektedir.

**İçerik:**
- HomeScreen mimarisi ve genel yapı
- `app/HomeScreen.tsx` - Ana video ekranı (633 satır)
- `components/VerticalVideoPager.tsx` - Dikey video geçişleri (393 satır)

**Toplam Kod Satırı:** ~1026 satır
**Ana Bileşenler:** 2 dosya
**Versiyon:** 1.0.2+



