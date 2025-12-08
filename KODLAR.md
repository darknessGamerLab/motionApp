# Motion App - Tüm Kodlar ve Sistem Mimarisi

## 📋 İçindekiler

1. [Sistem Mimarisi](#sistem-mimarisi)
2. [Versiyon Bilgisi](#versiyon-bilgisi)
3. [Ana Bileşenler](#ana-bileşenler)
4. [Kod Dosyaları](#kod-dosyaları)
5. [Teknik Detaylar](#teknik-detaylar)
6. [Bilinen Sorunlar](#bilinen-sorunlar)

---

## 🏗️ Sistem Mimarisi

### Genel Yapı

Motion App, TikTok/Instagram Reels benzeri bir video uygulamasıdır. Ana özellikleri:

- **3 Ana Sayfa**: Create (0), Home (1), Me (2)
- **Yatay Gesture**: Sayfalar arası geçiş (Create ↔ Home ↔ Me)
- **Dikey Gesture**: Home ekranında videolar arası geçiş
- **Direction Lock**: İlk 15px hareket sırasında yön belirlenir ve kilitlenir
- **Video Player**: Fullscreen, tek instance, pozisyon kaydı

### Mimari Akış

```
RootLayout (_layout.tsx)
├── GestureHandlerRootView
│   ├── GestureDetector (Pan Gesture)
│   │   ├── Direction Lock Logic
│   │   ├── MainPager (Yatay sayfa geçişleri)
│   │   │   ├── CreateScreen (Sayfa 0)
│   │   │   ├── HomeScreen (Sayfa 1)
│   │   │   │   ├── VerticalVideoPager (Dikey video geçişleri)
│   │   │   │   └── VideoOverlay (Sosyal medya elementleri)
│   │   │   └── MeScreen (Sayfa 2)
│   │   └── StatusBar
```

### Gesture Yönetimi

- **Root Seviyesinde**: Tek bir `Pan` gesture handler tüm gesture'ları yönetir
- **Direction Lock**: İlk 15px hareket sırasında yön belirlenir (horizontal/vertical)
- **Worklet Functions**: Gesture işlemleri Reanimated worklet'lerinde çalışır
- **Shared Values**: Tüm animasyon değerleri `useSharedValue` ile yönetilir

---

## 📦 Versiyon Bilgisi

**Mevcut Versiyon:** 1.0.1

**Bilinen Sorun:**
- İlk frame yanlış çiziliyor
- Element konumlandırma ve video yüksekliği ilk frame için hatalı hesaplanıyor
- Video container ve overlay elementleri ilk render'da yanlış konumda görünüyor

---

## 🧩 Ana Bileşenler

### 1. RootLayout (`app/_layout.tsx`)
- Ana layout component'i
- Gesture handler'ı yönetir
- Direction lock logic'i içerir
- MainPager ve HomeScreen'i koordine eder

### 2. MainPager (`components/MainPager.tsx`)
- Yatay sayfa geçişleri için pager
- 3 sayfa: Create (0), Home (1), Me (2)
- Spring animasyonları ile smooth geçişler

### 3. VerticalVideoPager (`components/VerticalVideoPager.tsx`)
- Dikey video geçişleri için pager
- Video pozisyonlarını kaydeder
- Aktif/pasif durum yönetimi

### 4. HomeScreen (`app/HomeScreen.tsx`)
- Ana video ekranı
- VideoOverlay bileşeni içerir
- Instagram benzeri UI tasarımı

### 5. VideoOverlay (`app/HomeScreen.tsx` içinde)
- Sosyal medya elementleri
- Action buttons (like, share, save, category)
- Kullanıcı bilgileri (avatar, username, follow, description)

---

## 💻 Kod Dosyaları

### 📄 app/_layout.tsx

```typescript
import { MainPager, MainPagerHelpers } from '@/components/MainPager';
import { VerticalVideoPagerHelpers } from '@/components/VerticalVideoPager';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Dimensions, Platform, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import {
    runOnJS,
    useAnimatedReaction,
    useSharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateScreen from './CreateScreen';
import HomeScreen from './HomeScreen';
import MeScreen from './MeScreen';

const SCREEN_HEIGHT = Dimensions.get('screen').height;

/**
 * RootLayout - Ana layout
 * 
 * Navbar yok
 * Tek bir gesture handler ile tüm gesture'ları yönetir
 * Direction lock ile yatay/dikey hareketleri ayırır
 * - Page 0: Create
 * - Page 1: Home (ana ekran) - burada dikey video geçişi de var
 * - Page 2: Me
 */
export default function RootLayout() {
  const insets = useSafeAreaInsets();
  
  // MainPager shared values
  const mainTranslateX = useSharedValue(0);
  const mainCurrentPage = useSharedValue(1);
  
  // VerticalVideoPager shared values (sadece HomeScreen için)
  const videoTranslateY = useSharedValue(0);
  const videoCurrentIndex = useSharedValue(0);
  
  // Video height: ekran yüksekliği - navigation bar yüksekliği
  const videoHeight = SCREEN_HEIGHT - insets.bottom;

  // HomeScreen aktif durumu için state
  const [isHomeActive, setIsHomeActive] = useState(true);

  // Direction lock
  const directionLock = useSharedValue<'none' | 'horizontal' | 'vertical'>('none');
  const LOCK_THRESHOLD = 15;
  const lastTranslationX = useSharedValue(0);
  const lastTranslationY = useSharedValue(0);

  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
  };

  const handleVideoChange = (index: number) => {
    console.log('Video changed to index:', index);
  };

  // HomeScreen aktif durumunu takip et
  useAnimatedReaction(
    () => mainCurrentPage.value,
    (currentPage) => {
      runOnJS(setIsHomeActive)(currentPage === 1);
    }
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      directionLock.value = 'none';
      lastTranslationX.value = 0;
      lastTranslationY.value = 0;
    })
    .onUpdate((event) => {
      const deltaX = Math.abs(event.translationX);
      const deltaY = Math.abs(event.translationY);

      // Yön henüz belirlenmediyse
      if (directionLock.value === 'none') {
        if (deltaX > LOCK_THRESHOLD || deltaY > LOCK_THRESHOLD) {
          directionLock.value = deltaX > deltaY ? 'horizontal' : 'vertical';
        }
      }

      // Yön belirlendikten sonra ilgili gesture'ı işle
      if (directionLock.value === 'horizontal') {
        const deltaTranslationX = event.translationX - lastTranslationX.value;
        MainPagerHelpers.handleHorizontalGesture(
          deltaTranslationX,
          event.velocityX,
          mainTranslateX,
          mainCurrentPage,
          3 // page count
        );
        lastTranslationX.value = event.translationX;
      } else if (directionLock.value === 'vertical' && mainCurrentPage.value === 1) {
        // Sadece HomeScreen'deyken dikey gesture'ı işle
        const deltaTranslationY = event.translationY - lastTranslationY.value;
        VerticalVideoPagerHelpers.handleVerticalGesture(
          deltaTranslationY,
          event.velocityY,
          videoTranslateY,
          videoCurrentIndex,
          3, // video count (SAMPLE_VIDEOS.length)
          videoHeight
        );
        lastTranslationY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (directionLock.value === 'horizontal') {
        MainPagerHelpers.handleHorizontalGestureEnd(
          event.velocityX,
          mainTranslateX,
          mainCurrentPage,
          3,
          handlePageChange
        );
      } else if (directionLock.value === 'vertical' && mainCurrentPage.value === 1) {
        VerticalVideoPagerHelpers.handleVerticalGestureEnd(
          event.velocityY,
          videoTranslateY,
          videoCurrentIndex,
          3,
          handleVideoChange,
          videoHeight
        );
      }
      directionLock.value = 'none';
      lastTranslationX.value = 0;
      lastTranslationY.value = 0;
    });

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <MainPager 
          initialPage={1}
          onPageChange={handlePageChange}
          translateX={mainTranslateX}
          currentPage={mainCurrentPage}
        >
          <CreateScreen />
          <HomeScreen 
            translateY={videoTranslateY}
            currentVideoIndex={videoCurrentIndex}
            onVideoChange={handleVideoChange}
            isActive={isHomeActive}
          />
          <MeScreen />
        </MainPager>
      </GestureDetector>
      <StatusBar style="light" translucent={Platform.OS === 'android'} hidden={false} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    marginTop: 0,
    paddingTop: 0,
  },
});
```

### 📄 app/HomeScreen.tsx

```typescript
import { VerticalVideoPager } from '@/components/VerticalVideoPager';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { runOnJS, SharedValue, useAnimatedReaction } from 'react-native-reanimated';
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
}

// Video Overlay Bileşeni
function VideoOverlay({ 
  video, 
  onLike, 
  onShare, 
  onSave, 
  onCategory,
  onFollow 
}: { 
  video: VideoData;
  onLike: () => void;
  onShare: () => void;
  onSave: () => void;
  onCategory: () => void;
  onFollow: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [isSaved, setIsSaved] = useState(video.isSaved);
  const [likeCount, setLikeCount] = useState(video.likes);

  // Video değiştiğinde state'leri güncelle
  useEffect(() => {
    setIsLiked(video.isLiked);
    setIsSaved(video.isSaved);
    setLikeCount(video.likes);
  }, [video.id]);

  const handleLike = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    onLike();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave();
  };

  return (
    <View style={styles.overlay}>
      {/* Sağ altta: Action Buttons - Sabit konum, navigation bar'ın üstünde */}
      <View style={[styles.rightActions, { bottom: insets.bottom + 80 }]}>
        {/* Like Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons 
            name={isLiked ? 'heart' : 'heart-outline'} 
            size={28} 
            color={isLiked ? '#ff3040' : '#fff'} 
          />
          <Text style={styles.actionText}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Ionicons name="paper-plane-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Ionicons 
            name={isSaved ? 'bookmark' : 'bookmark-outline'} 
            size={28} 
            color={isSaved ? '#ffd700' : '#fff'} 
          />
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>

        {/* Category Button */}
        <TouchableOpacity style={styles.actionButton} onPress={onCategory}>
          <Ionicons name="pricetag-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>{video.category}</Text>
        </TouchableOpacity>
      </View>

      {/* Alt tarafta: Avatar + Username + Follow + Description - Sabit konum, navigation bar'ın üstünde */}
      <View style={[styles.bottomInfo, { bottom: insets.bottom + 20 }]}>
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
}: HomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState(SAMPLE_VIDEOS);

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

  const currentVideo = videos[currentIndex] || videos[0];

  return (
    <View style={styles.container}>
      <VerticalVideoPager
        videos={SAMPLE_VIDEOS.map(v => ({ id: v.id, uri: v.uri }))}
        initialIndex={0}
        onVideoChange={handleVideoChange}
        translateY={translateY}
        currentIndex={currentVideoIndex}
        isActive={isActive}
      />
      <VideoOverlay
        video={currentVideo}
        onLike={handleLike}
        onShare={handleShare}
        onSave={handleSave}
        onCategory={handleCategory}
        onFollow={handleFollow}
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 14,
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
    gap: 8,
    marginBottom: 8,
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 16,
    justifyContent: 'flex-start',
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomInfo: {
    position: 'absolute',
    left: 12,
    right: 70,
  },
  description: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
});
```

### 📄 app/CreateScreen.tsx

```typescript
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

/**
 * CreateScreen - Oluşturma ekranı
 * 
 * Şimdilik boş layout
 * Soldan sağa gesture ile buraya gelinir
 */
export default function CreateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Screen</Text>
      <Text style={styles.subtext}>Bu sayfa henüz geliştirilmedi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
```

### 📄 app/MeScreen.tsx

```typescript
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

/**
 * MeScreen - Profil ekranı
 * 
 * Şimdilik boş layout
 * Sağa kaydırma ile buraya geçilir
 */
export default function MeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Me Screen</Text>
      <Text style={styles.subtext}>Bu sayfa henüz geliştirilmedi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
```

### 📄 components/MainPager.tsx

```typescript
import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';

const screenData = Dimensions.get('screen');
const SCREEN_WIDTH = screenData.width;
const SCREEN_HEIGHT = screenData.height;

interface MainPagerProps {
  children: React.ReactNode[];
  initialPage?: number;
  onPageChange?: (page: number) => void;
  translateX: SharedValue<number>;
  currentPage: SharedValue<number>;
}

/**
 * MainPager - Yatay sayfa geçişleri için pager
 * 
 * 3 sayfa: Create (0), Home (1), Me (2)
 * Her sayfa tam ekran, absolute positioning ile yan yana
 * Container translateX ile kaydırılır
 */
export function MainPager({ 
  children, 
  initialPage = 1, 
  onPageChange,
  translateX,
  currentPage,
}: MainPagerProps) {
  React.useEffect(() => {
    translateX.value = -SCREEN_WIDTH * initialPage;
    currentPage.value = initialPage;
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {children.map((child, index) => (
        <Animated.View 
          key={index} 
          style={[
            styles.page,
            { left: index * SCREEN_WIDTH }
          ]}
        >
          {child}
        </Animated.View>
      ))}
    </Animated.View>
  );
}

// Export helper functions for gesture handling
export const MainPagerHelpers = {
  handleHorizontalGesture: (
    deltaTranslationX: number,
    velocityX: number,
    translateX: SharedValue<number>,
    currentPage: SharedValue<number>,
    pageCount: number
  ) => {
    'worklet';
    const newTranslateX = translateX.value + deltaTranslationX;
    
    // Sınırları kontrol et
    const minTranslateX = -SCREEN_WIDTH * (pageCount - 1);
    const maxTranslateX = 0;
    
    if (newTranslateX >= minTranslateX && newTranslateX <= maxTranslateX) {
      translateX.value = newTranslateX;
    }
  },

  handleHorizontalGestureEnd: (
    velocityX: number,
    translateX: SharedValue<number>,
    currentPage: SharedValue<number>,
    pageCount: number,
    onPageChange?: (page: number) => void
  ) => {
    'worklet';
    const currentTranslateX = translateX.value;
    const pageIndex = Math.round(-currentTranslateX / SCREEN_WIDTH);
    
    // Velocity'e göre sayfa değiştir
    let targetPage = pageIndex;
    if (Math.abs(velocityX) > 500) {
      if (velocityX > 0 && pageIndex > 0) {
        targetPage = pageIndex - 1;
      } else if (velocityX < 0 && pageIndex < pageCount - 1) {
        targetPage = pageIndex + 1;
      }
    }

    // Sınırları kontrol et
    targetPage = Math.max(0, Math.min(pageCount - 1, targetPage));
    
    currentPage.value = targetPage;
    translateX.value = withSpring(-SCREEN_WIDTH * targetPage, {
      damping: 25,
      stiffness: 120,
      mass: 0.8,
    });
    
    if (onPageChange) {
      runOnJS(onPageChange)(targetPage);
    }
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: SCREEN_WIDTH * 3, // 3 sayfa için toplam genişlik
    position: 'relative',
    marginTop: 0,
    paddingTop: 0,
  },
  page: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    top: 0,
    left: 0,
    marginTop: 0,
    paddingTop: 0,
  },
});
```

### 📄 components/VerticalVideoPager.tsx

```typescript
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenData = Dimensions.get('screen');
const SCREEN_WIDTH = screenData.width;
const SCREEN_HEIGHT = screenData.height;

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
}: VerticalVideoPagerProps) {
  const insets = useSafeAreaInsets();
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const videoPositions = useRef<{ [key: string]: number }>({});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialIndex);
  
  // Video container yüksekliği: ekran yüksekliği - navigation bar yüksekliği
  const VIDEO_HEIGHT = SCREEN_HEIGHT - insets.bottom;

  React.useEffect(() => {
    translateY.value = -VIDEO_HEIGHT * initialIndex;
    currentIndex.value = initialIndex;
  }, []);

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

  if (videos.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          height: VIDEO_HEIGHT * videos.length,
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
              top: index * VIDEO_HEIGHT,
              height: VIDEO_HEIGHT,
            }
          ]}
        >
          <Video
            ref={(ref) => {
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
    onVideoChange?: (index: number) => void,
    videoHeight: number
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
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  videoContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    left: 0,
    backgroundColor: '#000',
  },
});
```

### 📄 hooks/useDirectionLock.ts

```typescript
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

/**
 * Gesture Direction Lock Hook
 * 
 * İlk 12-25px hareket sırasında yön belirlenir ve kilitlenir.
 * Y ekseninde daha büyük hareket → vertical lock
 * X ekseninde daha büyük hareket → horizontal lock
 */
export type Direction = 'none' | 'horizontal' | 'vertical';

export function useDirectionLock(
  onHorizontalGesture: (translationX: number, velocityX: number) => void,
  onVerticalGesture: (translationY: number, velocityY: number) => void,
  threshold: number = 15
) {
  const direction = useSharedValue<Direction>('none');
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      direction.value = 'none';
      startX.value = event.x;
      startY.value = event.y;
    })
    .onUpdate((event) => {
      const deltaX = Math.abs(event.translationX);
      const deltaY = Math.abs(event.translationY);

      // Yön henüz belirlenmediyse
      if (direction.value === 'none') {
        // Threshold'u geçtiyse yönü belirle
        if (deltaX > threshold || deltaY > threshold) {
          if (deltaX > deltaY) {
            direction.value = 'horizontal';
          } else {
            direction.value = 'vertical';
          }
        }
      }

      // Yön belirlendikten sonra sadece o yöndeki gesture'ı işle
      if (direction.value === 'horizontal') {
        runOnJS(onHorizontalGesture)(event.translationX, event.velocityX);
      } else if (direction.value === 'vertical') {
        runOnJS(onVerticalGesture)(event.translationY, event.velocityY);
      }
    })
    .onEnd((event) => {
      // Gesture bittiğinde yönü sıfırla
      direction.value = 'none';
    });

  return panGesture;
}
```

### 📄 package.json

```json
{
  "name": "motion-app",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint"
  },
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-navigation/bottom-tabs": "^7.4.0",
    "@react-navigation/elements": "^2.6.3",
    "@react-navigation/native": "^7.1.8",
    "expo": "~54.0.25",
    "expo-av": "~15.0.1",
    "expo-constants": "~18.0.10",
    "expo-font": "~14.0.9",
    "expo-haptics": "~15.0.7",
    "expo-image": "~3.0.10",
    "expo-linking": "~8.0.9",
    "expo-router": "~6.0.15",
    "expo-splash-screen": "~31.0.11",
    "expo-status-bar": "~3.0.8",
    "expo-symbols": "~1.0.7",
    "expo-system-ui": "~6.0.8",
    "expo-web-browser": "~15.0.9",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-worklets": "0.5.1",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-web": "~0.21.0"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2",
    "eslint": "^9.25.0",
    "eslint-config-expo": "~10.0.0"
  },
  "private": true
}
```

---

## 🔧 Teknik Detaylar

### Gesture Sistemi

**Direction Lock Mekanizması:**
- İlk 15px hareket sırasında yön belirlenir
- `deltaX > deltaY` → horizontal lock
- `deltaY > deltaX` → vertical lock
- Yön belirlendikten sonra sadece o yöndeki gesture işlenir

**Gesture Handler Hiyerarşisi:**
```
GestureHandlerRootView
└── GestureDetector (Pan Gesture)
    └── MainPager
        └── HomeScreen
            └── VerticalVideoPager
```

### Animasyon Sistemi

**Spring Parametreleri:**
- `damping: 25`
- `stiffness: 120`
- `mass: 0.8`

**Shared Values:**
- `mainTranslateX`: Yatay sayfa geçişleri için translate değeri
- `mainCurrentPage`: Mevcut sayfa index'i
- `videoTranslateY`: Dikey video geçişleri için translate değeri
- `videoCurrentIndex`: Mevcut video index'i

### Video Yönetimi

**Video Container Yüksekliği:**
```typescript
const VIDEO_HEIGHT = SCREEN_HEIGHT - insets.bottom;
```

**Video Pozisyon Kaydı:**
- Her video için pozisyon `videoPositions` ref'inde saklanır
- Sayfa inaktif olduğunda tüm videolar durdurulur ve pozisyonlar kaydedilir
- Sayfa aktif olduğunda video kaldığı yerden devam eder

**Video Instance Yönetimi:**
- Tek bir video player instance kullanılmaz
- Her video için ayrı Video component'i render edilir
- Sadece aktif video oynatılır (`shouldPlay={index === currentVideoIndex}`)

### UI Layout

**Instagram Benzeri Tasarım:**
- **Sağ Altta**: Action buttons (like, share, save, category) - dikey sıralı
- **Alt Tarafta**: Avatar + Username + Follow butonu + Description - yatay sıralı
- **Overlay**: Absolute positioned, `pointerEvents: 'box-none'` ile gesture'ları engellemez

**Konumlandırma:**
- Action buttons: `bottom: insets.bottom + 80`
- Bottom info: `bottom: insets.bottom + 20`
- Video container: `height: SCREEN_HEIGHT - insets.bottom`

---

## ⚠️ Bilinen Sorunlar

### Version 1.0.1 - İlk Frame Sorunu

**Sorun:**
- İlk frame yanlış çiziliyor
- Element konumlandırma ve video yüksekliği ilk frame için hatalı hesaplanıyor
- Video container ve overlay elementleri ilk render'da yanlış konumda görünüyor

**Neden:**
- `Dimensions.get('screen')` ilk render'da doğru değeri vermeyebilir
- Safe area insets ilk frame'de henüz hesaplanmamış olabilir
- Video container yüksekliği layout tamamlanmadan hesaplanıyor

**Olası Çözümler:**
1. `onLayout` event handler ile layout tamamlandıktan sonra render
2. `useWindowDimensions` hook'u kullan (dinamik güncelleme)
3. `useEffect` ile küçük bir delay ekle
4. Video container için minimum height kontrolü

---

## 📊 Veri Yapıları

### VideoData Interface

```typescript
interface VideoData {
  id: string;
  uri: string;
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
```

### VideoItem Interface

```typescript
interface VideoItem {
  id: string;
  uri: string;
}
```

---

## 🎯 Önemli Notlar

1. **Gesture Handling**: Tüm gesture'lar root seviyesinde (`_layout.tsx`) yönetilir
2. **Direction Lock**: İlk 15px hareket sırasında yön belirlenir ve kilitlenir
3. **Video Height**: Navigation bar yüksekliği hesaba katılarak hesaplanır
4. **Overlay Positioning**: Safe area insets kullanılarak navigation bar'ın üstünde konumlandırılır
5. **Video Position Memory**: Video pozisyonları ref'te saklanır, sayfa değiştiğinde kaybolmaz
6. **Spring Animations**: Tüm geçişler spring animasyonları ile yapılır
7. **Worklet Functions**: Gesture işlemleri Reanimated worklet'lerinde çalışır (UI thread'de)

---

## 🔄 Veri Akışı

```
User Gesture
    ↓
Pan Gesture Handler (_layout.tsx)
    ↓
Direction Lock Check (15px threshold)
    ↓
┌─────────────────┬─────────────────┐
│ Horizontal      │ Vertical         │
│ (Sayfa geçişi) │ (Video geçişi)   │
│                 │                  │
│ MainPager       │ VerticalVideo    │
│ Helpers         │ PagerHelpers     │
│                 │                  │
│ → translateX    │ → translateY     │
│ → currentPage   │ → currentIndex   │
└─────────────────┴─────────────────┘
    ↓
Animated Style Update
    ↓
UI Render
```

---

## 📱 Platform Özellikleri

- **Android**: Edge-to-edge desteği, translucent status bar
- **iOS**: Safe area desteği
- **Status Bar**: Light style, translucent (Android)

---

## 🚀 Çalıştırma

```bash
npm start
# veya
npm run android
# veya
npm run ios
```

---

**Son Güncelleme:** Version 1.0.1
**Tarih:** 2025-01-XX

