# Motion App - Tüm Kodlar

Bu dosya uygulamanın tüm kaynak kodlarını içermektedir. ChatGPT'ye sormak için kullanabilirsiniz.

**Not:** ElementsScreen.tsx ve VideoOverlay.tsx bu dosyaya dahil edilmemiştir.

---

## 📦 package.json

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

## 📁 app/_layout.tsx

```typescript
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import 'react-native-reanimated';
import { MainPager, MainPagerHelpers } from '../components/MainPager';
import { VerticalVideoPagerHelpers } from '../components/VerticalVideoPager';
import CreateScreen from './CreateScreen';
import HomeScreen from './HomeScreen';
import MeScreen from './MeScreen';
import ElementsScreen from './ElementsScreen';

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
  // MainPager shared values
  const mainTranslateX = useSharedValue(0);
  const mainCurrentPage = useSharedValue(1);
  
  // VerticalVideoPager shared values (sadece HomeScreen için)
  const videoTranslateY = useSharedValue(0);
  const videoCurrentIndex = useSharedValue(0);

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
          3 // video count (SAMPLE_VIDEOS.length)
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
          handleVideoChange
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

---

## 📁 app/HomeScreen.tsx

```typescript
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { VerticalVideoPager } from '../components/VerticalVideoPager';

/**
 * HomeScreen - Ana video ekranı
 * 
 * Fullscreen video player
 * Vertical locked swipe → nextVideo(), prevVideo()
 * Player sabit durur, videolar değişir (TikTok logic)
 */

// Örnek video listesi - gerçek uygulamada API'den gelecek
const SAMPLE_VIDEOS = [
  {
    id: '1',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: '2',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: '3',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
];

interface HomeScreenProps {
  translateY: SharedValue<number>;
  currentVideoIndex: SharedValue<number>;
  onVideoChange?: (index: number) => void;
  isActive?: boolean;
}

export default function HomeScreen({ 
  translateY, 
  currentVideoIndex,
  onVideoChange,
  isActive = true,
}: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <VerticalVideoPager
        videos={SAMPLE_VIDEOS}
        initialIndex={0}
        onVideoChange={onVideoChange}
        translateY={translateY}
        currentIndex={currentVideoIndex}
        isActive={isActive}
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
});
```

---

## 📁 app/CreateScreen.tsx

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
      <Text style={styles.text}>Bu sayfa geliştirme aşamasında</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
  },
});
```

---

## 📁 app/MeScreen.tsx

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

---

## 📁 components/MainPager.tsx

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

---

## 📁 components/VerticalVideoPager.tsx

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
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const videoPositions = useRef<{ [key: string]: number }>({});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialIndex);

  React.useEffect(() => {
    translateY.value = -SCREEN_HEIGHT * initialIndex;
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
        { height: SCREEN_HEIGHT * videos.length },
        animatedStyle
      ]}
    >
      {videos.map((video, index) => (
        <Animated.View 
          key={video.id} 
          style={[
            styles.videoContainer,
            { 
              top: index * SCREEN_HEIGHT,
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
    videoCount: number
  ) => {
    'worklet';
    const newTranslateY = translateY.value + deltaTranslationY;
    
    // Sınırları kontrol et
    const minTranslateY = -SCREEN_HEIGHT * (videoCount - 1);
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
    onVideoChange?: (index: number) => void
  ) => {
    'worklet';
    const currentTranslateY = translateY.value;
    const videoIndex = Math.round(-currentTranslateY / SCREEN_HEIGHT);
    
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
    translateY.value = withSpring(-SCREEN_HEIGHT * targetIndex, {
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
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  videoContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    left: 0,
    backgroundColor: '#000',
  },
});
```

---

## 📋 Özet

Bu uygulama:
- **Expo + React Native** ile geliştirilmiştir
- **3 sayfa**: Create, Home (video), Me
- **Yatay swipe**: Sayfalar arası geçiş (MainPager)
- **Dikey swipe**: Video geçişi (VerticalVideoPager)
- **Gesture direction lock**: Yatay ve dikey hareketler birbirine karışmaz
- **Video player**: expo-av kullanılıyor
- **Animasyonlar**: react-native-reanimated ile
- **Video playback management**: Sayfa inaktif olduğunda videolar durur, aktif olduğunda kaldığı yerden devam eder

---

**Not**: Bu kodları ChatGPT'ye sorarken tüm dosyaları birlikte paylaşabilirsiniz.
