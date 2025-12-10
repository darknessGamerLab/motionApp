# Motion App - Tüm Kodlar ve Sistem Mimarisi

## 📋 İçindekiler

1. [Sistem Mimarisi](#sistem-mimarisi)
2. [Ana Dosyalar](#ana-dosyalar)
3. [Kod Dosyaları](#kod-dosyaları)

---

## 🏗️ Sistem Mimarisi

### Genel Yapı

Motion App, TikTok/Instagram Reels benzeri bir video uygulamasıdır. Ana özellikleri:

- **3 Ana Sayfa**: Create (0), Home (1), Me (2)
- **Yatay Gesture**: Sayfalar arası geçiş (Create ↔ Home ↔ Me)
- **Dikey Gesture**: Home ekranında videolar arası geçiş
- **Direction Lock**: İlk 15px hareket sırasında yön belirlenir ve kilitlenir
- **Video Player**: Fullscreen, tek instance, pozisyon kaydı
- **TikTok Benzeri Video Çekme**: Basılı tutarak video kaydetme
- **Video Düzenleme**: Ses kontrolü, kırpma, müzik ekleme
- **Single/Double Tap**: Tek tıklama play/pause, çift tıklama beğeni (sadece beğeni yapar, geri almaz)
- **Video Container Click**: Video container'ın tamamı (boşluklar dahil) tıklanabilir
- **Gesture Isolation**: Avatar, username, follow button, description ve action buttons alanlarında gesture'lar çalışmaz
- **Like Animation**: Beğeni animasyonu tıklama pozisyonunda ortaya çıkar

### Mimari Akış

```
RootLayout (_layout.tsx)
├── GestureHandlerRootView
│   ├── View (onLayout ile boyut ölçümü)
│   │   ├── GestureDetector (Pan Gesture)
│   │   │   ├── Direction Lock Logic
│   │   │   ├── MainPager (Yatay sayfa geçişleri)
│   │   │   │   ├── CreateScreen (Sayfa 0)
│   │   │   │   │   ├── CameraView (Video kayıt)
│   │   │   │   │   └── VideoDetailsScreen (Modal - Video düzenleme)
│   │   │   │   ├── HomeScreen (Sayfa 1)
│   │   │   │   │   ├── VerticalVideoPager (Dikey video geçişleri)
│   │   │   │   │   │   ├── Video (Her video için ayrı instance)
│   │   │   │   │   │   └── VideoOverlay (Sosyal medya elementleri)
│   │   │   │   │   └── GestureDetector (Tap Gesture - Single/Double tap)
│   │   │   │   └── MeScreen (Sayfa 2)
│   │   │   │       ├── ScrollView (Profil içeriği)
│   │   │   │       └── EditProfileScreen (Modal - Profil düzenleme)
│   │   │   └── StatusBar
```

### Gesture Yönetimi

- **Root Seviyesinde**: Tek bir `Pan` gesture handler tüm gesture'ları yönetir
- **Direction Lock**: İlk 15px hareket sırasında yön belirlenir (horizontal/vertical)
- **Worklet Functions**: Gesture işlemleri Reanimated worklet'lerinde çalışır
- **Shared Values**: Tüm animasyon değerleri `useSharedValue` ile yönetilir
- **Layout Ölçümü**: `onLayout` event handler ile dinamik boyut hesaplama
- **Tap Gesture**: HomeScreen'de `Gesture.Tap` ile single/double tap algılama

---

## 📁 Ana Dosyalar

### package.json

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
    "@react-native-community/slider": "5.0.1",
    "@react-navigation/bottom-tabs": "^7.4.0",
    "@react-navigation/elements": "^2.6.3",
    "@react-navigation/native": "^7.1.8",
    "expo": "~54.0.27",
    "expo-av": "~16.0.8",
    "expo-camera": "~17.0.10",
    "expo-constants": "~18.0.11",
    "expo-document-picker": "~14.0.8",
    "expo-font": "~14.0.10",
    "expo-haptics": "~15.0.8",
    "expo-image": "~3.0.11",
    "expo-image-picker": "~17.0.9",
    "expo-linear-gradient": "~15.0.8",
    "expo-linking": "~8.0.10",
    "expo-navigation-bar": "~5.0.10",
    "expo-router": "~6.0.17",
    "expo-splash-screen": "~31.0.12",
    "expo-status-bar": "~3.0.9",
    "expo-symbols": "~1.0.8",
    "expo-system-ui": "~6.0.9",
    "expo-web-browser": "~15.0.10",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-svg": "15.12.1",
    "react-native-web": "~0.21.0",
    "react-native-worklets": "0.5.1"
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

### app.json

```json
{
  "expo": {
    "name": "motion-app",
    "slug": "motion-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "motionapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Uygulamanın fotoğraf ve video çekmek için kameraya erişmesine izin verin.",
        "NSMicrophoneUsageDescription": "Uygulamanın video kaydetmek için mikrofona erişmesine izin verin.",
        "NSPhotoLibraryUsageDescription": "Uygulamanın profil fotoğrafı seçmek için fotoğraf kütüphanesine erişmesine izin verin."
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "READ_MEDIA_IMAGES",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Uygulamanın fotoğraf ve video çekmek için kameraya erişmesine izin verin.",
          "microphonePermission": "Uygulamanın video kaydetmek için mikrofona erişmesine izin verin.",
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-navigation-bar",
        {
          "backgroundColor": "#FFFFFF",
          "barStyle": "dark-content"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-native",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "target": "esnext",
    "module": "esnext",
    "lib": [
      "esnext"
    ],
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "customConditions": []
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules"
  ],
  "extends": "expo/tsconfig.base"
}
```

---

## 💻 Kod Dosyaları

### app/_layout.tsx

Ana layout component'i. Tüm gesture'ları yönetir, sayfa geçişlerini koordine eder.

```typescript
import { MainPager, MainPagerHelpers } from '@/components/MainPager';
import { VerticalVideoPagerHelpers } from '@/components/VerticalVideoPager';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
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
  
  // Android navigation bar ayarları - sürekli kontrol et
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const setNavigationBar = async () => {
      try {
        await NavigationBar.setVisibilityAsync('visible');
        await NavigationBar.setBackgroundColorAsync('#FFFFFF');
        await NavigationBar.setButtonStyleAsync('dark');
        await NavigationBar.setBorderColorAsync('#FFFFFF');
      } catch (error) {
        console.error('Error setting navigation bar:', error);
      }
    };

    // İlk yüklemede
    setNavigationBar();

    // App state değişikliklerinde
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Delay ile tekrar ayarla
        setTimeout(() => {
          setNavigationBar();
        }, 100);
      }
    });

    // Her 1 saniyede bir kontrol et (Android'in ayarları sıfırlamasını önlemek için)
    const interval = setInterval(() => {
      setNavigationBar();
    }, 1000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
  
  // Layout dimensions - onLayout ile alınacak
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const [insetsReady, setInsetsReady] = useState(false);
  
  // MainPager shared values
  const mainTranslateX = useSharedValue(0);
  const mainCurrentPage = useSharedValue(1);
  
  // VerticalVideoPager shared values (sadece HomeScreen için)
  const videoTranslateY = useSharedValue(0);
  const videoCurrentIndex = useSharedValue(0);
  
  // Video height: layout height - navigation bar yüksekliği
  const videoHeight = layoutHeight > 0 ? layoutHeight - insets.bottom : 0;

  // Her ekranın aktif durumu için state
  const [isHomeActive, setIsHomeActive] = useState(true);
  const [isCreateActive, setIsCreateActive] = useState(false);
  const [isMeActive, setIsMeActive] = useState(false);
  
  // Video yayınlama için ref'ler
  const homeScreenPublishRef = useRef<((videoData: any) => void) | null>(null);
  const videoCountRef = useRef<number>(3); // Dinamik video count için ref
  
  const handleNewVideoPublished = (videoData: any) => {
    if (homeScreenPublishRef.current) {
      homeScreenPublishRef.current(videoData);
    }
    // CreateScreen'den HomeScreen'e geç
    mainCurrentPage.value = 1;
    mainTranslateX.value = -layoutWidth * 1;
  };
  
  // Layout ölçümü
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayoutWidth(width);
      setLayoutHeight(height);
      setLayoutReady(true);
    }
  };
  
  // Insets hazır mı kontrol et
  useEffect(() => {
    // Insets genellikle hemen hazır olur, ama emin olmak için küçük bir delay
    if (insets.bottom >= 0) {
      const timer = setTimeout(() => {
        setInsetsReady(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [insets.bottom]);
  
  // Shared value'ların initial değerlerini ayarla (sadece layoutReady + insetsReady olduktan sonra)
  useEffect(() => {
    if (layoutReady && insetsReady && layoutWidth > 0 && layoutHeight > 0) {
      // MainPager initial değerleri
      mainTranslateX.value = -layoutWidth * 1; // initialPage = 1
      mainCurrentPage.value = 1;
      
      // VerticalVideoPager initial değerleri
      if (videoHeight > 0) {
        videoTranslateY.value = -videoHeight * 0; // initialIndex = 0
        videoCurrentIndex.value = 0;
      }
    }
  }, [layoutReady, insetsReady, layoutWidth, layoutHeight, videoHeight]);

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

  // Her ekranın aktif durumunu takip et
  useAnimatedReaction(
    () => mainCurrentPage.value,
    (currentPage) => {
      runOnJS(setIsCreateActive)(currentPage === 0);
      runOnJS(setIsHomeActive)(currentPage === 1);
      runOnJS(setIsMeActive)(currentPage === 2);
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
          3, // page count
          layoutWidth
        );
        lastTranslationX.value = event.translationX;
      } else if (directionLock.value === 'vertical' && mainCurrentPage.value === 1) {
        // Sadece HomeScreen'deyken dikey gesture'ı işle
        // MeScreen'de (page 2) ScrollView kendi gesture'ını yönetir
        const deltaTranslationY = event.translationY - lastTranslationY.value;
        VerticalVideoPagerHelpers.handleVerticalGesture(
          deltaTranslationY,
          event.velocityY,
          videoTranslateY,
          videoCurrentIndex,
          videoCountRef.current, // Dinamik video count
          videoHeight
        );
        lastTranslationY.value = event.translationY;
      }
      // MeScreen'de (page 2) dikey gesture'ları ignore et - ScrollView kendi gesture'ını yönetir
    })
    .onEnd((event) => {
      if (directionLock.value === 'horizontal') {
        MainPagerHelpers.handleHorizontalGestureEnd(
          event.velocityX,
          mainTranslateX,
          mainCurrentPage,
          3,
          layoutWidth,
          handlePageChange
        );
      } else if (directionLock.value === 'vertical' && mainCurrentPage.value === 1) {
        VerticalVideoPagerHelpers.handleVerticalGestureEnd(
          event.velocityY,
          videoTranslateY,
          videoCurrentIndex,
          videoCountRef.current, // Dinamik video count
          videoHeight,
          handleVideoChange
        );
      }
      directionLock.value = 'none';
      lastTranslationX.value = 0;
      lastTranslationY.value = 0;
    });

  const isReady = layoutReady && insetsReady && layoutWidth > 0 && layoutHeight > 0;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container} onLayout={handleLayout}>
        {isReady && (
          <GestureDetector gesture={panGesture}>
            <MainPager 
              initialPage={1}
              onPageChange={handlePageChange}
              translateX={mainTranslateX}
              currentPage={mainCurrentPage}
              pageWidth={layoutWidth}
              pageHeight={layoutHeight}
            >
              <CreateScreen 
                isActive={isCreateActive}
                onVideoPublished={handleNewVideoPublished}
                onClose={() => {
                  // HomeScreen'e geç (page 1)
                  mainCurrentPage.value = 1;
                  mainTranslateX.value = -layoutWidth * 1;
                }}
              />
              <HomeScreen 
                translateY={videoTranslateY}
                currentVideoIndex={videoCurrentIndex}
                onVideoChange={handleVideoChange}
                isActive={isHomeActive}
                videoHeight={videoHeight}
                layoutReady={isReady}
                pageWidth={layoutWidth}
                onNewVideoPublishedRef={homeScreenPublishRef}
                onVideoCountChange={(count) => {
                  videoCountRef.current = count;
                }}
              />
              <MeScreen isActive={isMeActive} />
            </MainPager>
          </GestureDetector>
        )}
        <StatusBar style="light" translucent={Platform.OS === 'android'} hidden={false} />
      </View>
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

### app/HomeScreen.tsx

Ana video ekranı. Video listesi ve overlay elementleri.

```typescript
import { VerticalVideoPager } from '@/components/VerticalVideoPager';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  onVideoCountChange?: (count: number) => void;
}

// Floating Heart Animation Component
function FloatingHeart({ 
  onComplete, 
  x, 
  y 
}: { 
  onComplete?: () => void;
  x: number;
  y: number;
}) {
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
          top: y - 50, // Kalp yüksekliğinin yarısı (100/2)
          left: x - 50, // Kalp genişliğinin yarısı (100/2)
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
  onLikeRef?: React.MutableRefObject<((x?: number, y?: number) => void) | null>;
  videoHeight: number;
}) {
  const insets = useSafeAreaInsets();
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [isSaved, setIsSaved] = useState(video.isSaved);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);
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

  // Buton için handleLike (event almayan)
  const handleLikeButton = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    onLike();
  };

  // Gesture için handleLike (x, y koordinatları ile)
  const handleLike = (x?: number, y?: number) => {
    // Sadece beğenilmemişse beğen (double tap sadece beğeni yapar, geri almaz)
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      
      // Beğeni animasyonu ekle (tıklama pozisyonunda)
      if (x !== undefined && y !== undefined) {
        const newHeartId = heartIdCounter.current++;
        setHearts(prev => [...prev, { id: newHeartId, x, y }]);
      }
      
      onLike();
    }
  };

  const removeHeart = (heartGroupId: number) => {
    setHearts(prev => prev.filter(h => h.id !== heartGroupId));
  };

  // Expose handleLike via ref - sadece handleLike değiştiğinde güncelle
  const handleLikeRef = useRef(handleLike);
  handleLikeRef.current = handleLike;
  
  useEffect(() => {
    if (onLikeRef) {
      onLikeRef.current = (x?: number, y?: number) => handleLikeRef.current(x, y);
    }
  }, [onLikeRef]);

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
          x={heartGroup.x}
          y={heartGroup.y}
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
            onPress={handleLikeButton}
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
  onVideoCountChange,
}: HomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState(SAMPLE_VIDEOS);
  const videoControlRef = useRef<{
    togglePlayPause: () => void;
    getCurrentVideoId: () => string | null;
  } | null>(null);
  const videoOverlayLikeRef = useRef<((x?: number, y?: number) => void) | null>(null);
  
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

  // Video sayısı değiştiğinde parent'a bildir
  React.useEffect(() => {
    if (onVideoCountChange) {
      onVideoCountChange(videos.length);
    }
  }, [videos.length, onVideoCountChange]);

  // currentVideoIndex değişikliklerini takip et
  useAnimatedReaction(
    () => currentVideoIndex.value,
    (index) => {
      runOnJS(setCurrentIndex)(Math.round(index));
    }
  );

  const handleVideoChange = useCallback((index: number) => {
    setCurrentIndex(index);
    if (onVideoChange) {
      onVideoChange(index);
    }
  }, [onVideoChange]);

  const handleLike = useCallback(() => {
    console.log('Like pressed for video:', videos[currentIndex]?.id);
  }, [videos, currentIndex]);

  const handleShare = useCallback(() => {
    console.log('Share pressed for video:', videos[currentIndex]?.id);
  }, [videos, currentIndex]);

  const handleSave = useCallback(() => {
    console.log('Save pressed for video:', videos[currentIndex]?.id);
  }, [videos, currentIndex]);

  const handleCategory = useCallback(() => {
    console.log('Category pressed:', videos[currentIndex]?.category);
  }, [videos, currentIndex]);

  const handleFollow = useCallback(() => {
    console.log('Follow pressed for user:', videos[currentIndex]?.user.username);
  }, [videos, currentIndex]);

  const handleScreenPress = useCallback(() => {
    // Single tap - toggle play/pause
    if (videoControlRef.current) {
      videoControlRef.current.togglePlayPause();
    }
  }, []);

  const handleDoubleTap = useCallback((x: number, y: number) => {
    // Double tap - like (sadece beğeni yap, geri alma)
    if (videoOverlayLikeRef.current) {
      videoOverlayLikeRef.current(x, y);
    }
  }, []);

  // Single tap gesture - memoize edilmiş
  const singleTap = useMemo(() => Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .shouldCancelWhenOutside(true)
    .onEnd((event) => {
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
    }), [handleScreenPress]);

  // Double tap gesture - memoize edilmiş
  const doubleTap = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .shouldCancelWhenOutside(true)
    .onEnd((event) => {
      // Clear single tap timeout
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      // Tıklama pozisyonunu geçir
      runOnJS(handleDoubleTap)(event.x, event.y);
    }), [handleDoubleTap]);

  // Combine gestures - memoize edilmiş
  const tapGesture = useMemo(() => Gesture.Race(doubleTap, singleTap), [doubleTap, singleTap]);

  // Video listesini memoize et - sadece videos değiştiğinde yeniden hesapla
  const videoItems = useMemo(() => 
    videos.map(v => ({ id: v.id, uri: v.uri, musicUri: v.musicUri })),
    [videos]
  );

  // Video data map'i oluştur - find() yerine O(1) lookup
  const videoDataMap = useMemo(() => {
    const map = new Map<string, VideoData>();
    videos.forEach(v => map.set(v.id, v));
    return map;
  }, [videos]);

  // Render overlay callback'ini memoize et
  const renderOverlay = useCallback((videoItem: { id: string; uri: string; musicUri?: string }, index: number) => {
    // VideoItem'dan VideoData'ya dönüştür - O(1) lookup
    const videoData = videoDataMap.get(videoItem.id);
    if (!videoData) return null;
    
    return layoutReady ? (
      <VideoOverlay
        key={`overlay-${videoItem.id}`}
        video={videoData}
        onLike={handleLike}
        onShare={handleShare}
        onSave={handleSave}
        onCategory={handleCategory}
        onFollow={handleFollow}
        onLikeRef={index === currentIndex ? videoOverlayLikeRef : undefined}
        videoHeight={videoHeight}
      />
    ) : null;
  }, [videoDataMap, layoutReady, currentIndex, videoHeight, handleLike, handleShare, handleSave, handleCategory, handleFollow]);

  if (!layoutReady || videoHeight <= 0 || pageWidth <= 0) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <VerticalVideoPager
        videos={videoItems}
        initialIndex={0}
        onVideoChange={handleVideoChange}
        translateY={translateY}
        currentIndex={currentVideoIndex}
        isActive={isActive}
        videoHeight={videoHeight}
        pageWidth={pageWidth}
        onVideoControlRef={videoControlRef}
        tapGesture={tapGesture}
        renderOverlay={renderOverlay}
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

### app/CreateScreen.tsx

TikTok benzeri video çekme ekranı.

```typescript
import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import VideoDetailsScreen from './VideoDetailsScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Progress Circle Component
function ProgressCircle({ progressAnim }: { progressAnim: Animated.Value }) {
  const [dashOffset, setDashOffset] = React.useState(2 * Math.PI * 50);
  const circumference = 2 * Math.PI * 50;

  React.useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setDashOffset(circumference * (1 - value));
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim, circumference]);

  return (
    <Circle
      cx={55}
      cy={55}
      r={50}
      stroke="#fff"
      strokeWidth={5}
      fill="none"
      strokeDasharray={circumference}
      strokeDashoffset={dashOffset}
      strokeLinecap="round"
    />
  );
}

interface CreateScreenProps {
  isActive?: boolean;
  onVideoPublished?: (videoData: any) => void;
  userSkills?: string[];
  userInfo?: {
    id: string;
    username: string;
    avatar?: string;
  };
  onClose?: () => void;
}

export default function CreateScreen({ 
  isActive = false,
  onVideoPublished,
  userSkills = ['Photography', 'Travel', 'Adventure'],
  userInfo = {
    id: 'user1',
    username: 'johndoe',
    avatar: 'https://i.pravatar.cc/150?img=1',
  },
  onClose,
}: CreateScreenProps) {
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [showVideoDetails, setShowVideoDetails] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const MAX_RECORDING_TIME = 60; // 60 saniye

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // İzinleri kontrol et
  if (!cameraPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Kamera izni gerekli</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Mikrofon izni kontrolü
  if (!microphonePermission?.granted) {
    requestMicrophonePermission();
  }

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashEnabled(current => !current);
  };

  const handleAddMusic = () => {
    Alert.alert('Bilgi', 'Henüz geliştirme aşamasında');
  };

  const handleEffects = () => {
    Alert.alert('Bilgi', 'Henüz geliştirme aşamasında');
  };

  const pickVideoFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setRecordedVideoUri(result.assets[0].uri);
        setShowVideoDetails(true);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Hata', 'Video seçilirken bir hata oluştu.');
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    
    try {
      setIsRecording(true);
      setRecordingTime(0);
      progressAnim.setValue(0);
      
      // Progress animasyonunu başlat
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: MAX_RECORDING_TIME * 1000,
        useNativeDriver: false,
      }).start();
      
      // Timer başlat
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= MAX_RECORDING_TIME) {
            stopRecording();
            return MAX_RECORDING_TIME;
          }
          return newTime;
        });
      }, 100);
      
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_TIME,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      Alert.alert('Hata', 'Video kaydı başlatılamadı.');
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording && recordingPromiseRef.current) {
      try {
        // Timer'ı durdur
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        // Animasyonu durdur
        progressAnim.stopAnimation();
        
        cameraRef.current.stopRecording();
        const video = await recordingPromiseRef.current;
        
        if (video && video.uri) {
          setRecordedVideoUri(video.uri);
          setShowVideoDetails(true);
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        Alert.alert('Hata', 'Video kaydedilirken bir hata oluştu.');
      } finally {
        setIsRecording(false);
        setRecordingTime(0);
        progressAnim.setValue(0);
        recordingPromiseRef.current = null;
      }
    }
  };

  if (!isActive) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {!showVideoDetails ? (
        <>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            mode="video"
            flash={flashEnabled ? 'on' : 'off'}
          />

          {/* Top Controls */}
          <View style={[styles.topControls, { paddingTop: insets.top + 10 }]}>
            {/* Left: Close Button */}
            <TouchableOpacity style={styles.topButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            
            {/* Center: Add Music Button */}
            <TouchableOpacity style={styles.musicButton} onPress={handleAddMusic}>
              <Ionicons name="musical-notes-outline" size={20} color="#fff" />
              <Text style={styles.musicButtonText}>Add Music</Text>
            </TouchableOpacity>

            {/* Right: Flash and Flip Buttons */}
            <View style={styles.rightButtons}>
              <TouchableOpacity 
                style={[styles.topButton, flashEnabled && styles.topButtonActive]} 
                onPress={toggleFlash}
              >
                <Ionicons 
                  name={flashEnabled ? "flash" : "flash-outline"} 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topButton} onPress={toggleCameraFacing}>
                <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.bottomControlsRow}>
              {/* Left: Gallery Button */}
              <TouchableOpacity style={styles.sideButton} onPress={pickVideoFromGallery}>
                <Ionicons name="images-outline" size={32} color="#fff" />
              </TouchableOpacity>
              
              {/* Center: Record Button with Progress Ring */}
              <View style={styles.recordButtonContainer}>
                <Svg width={110} height={110} style={styles.progressSvg}>
                  <Circle
                    cx={55}
                    cy={55}
                    r={50}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth={5}
                    fill="none"
                  />
                  {isRecording && <ProgressCircle progressAnim={progressAnim} />}
                </Svg>
                <TouchableOpacity
                  style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                  activeOpacity={1}
                >
                  <View style={styles.recordButtonInner} />
                </TouchableOpacity>
              </View>
              
              {/* Right: Effects Button */}
              <TouchableOpacity style={styles.sideButton} onPress={handleEffects}>
                <Ionicons name="sparkles-outline" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : null}

      {/* Video Details Modal */}
      {recordedVideoUri && (
        <VideoDetailsScreen
          visible={showVideoDetails}
          videoUri={recordedVideoUri}
          musicUri={undefined}
          userSkills={userSkills}
          userInfo={userInfo}
          onClose={() => {
            setShowVideoDetails(false);
            setRecordedVideoUri(null);
          }}
          onPublish={async (data) => {
            const newVideo = {
              id: `video-${Date.now()}`,
              uri: data.videoUri,
              musicUri: data.musicUri,
              user: {
                id: userInfo.id,
                username: userInfo.username,
                avatar: userInfo.avatar,
              },
              description: data.description,
              category: data.category,
              likes: 0,
              isLiked: false,
              isSaved: false,
            };
            
            if (onVideoPublished) {
              onVideoPublished(newVideo);
            }
            
            setShowVideoDetails(false);
            setRecordedVideoUri(null);
            
            return newVideo.id;
          }}
        />
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
  permissionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  musicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
  },
  musicButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonContainer: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    borderWidth: 5,
    width: 85,
    height: 85,
    borderRadius: 42.5,
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF0000',
  },
});
```

---

### app/VideoDetailsScreen.tsx

Video düzenleme ve yayınlama ekranı.

```typescript
import { Ionicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PRIVACY_OPTIONS = [
  { id: 'public', label: 'Public', icon: 'globe-outline' },
  { id: 'friends', label: 'Friends', icon: 'people-outline' },
  { id: 'private', label: 'Private', icon: 'lock-closed-outline' },
];

interface VideoDetailsScreenProps {
  visible: boolean;
  videoUri: string;
  musicUri?: string;
  userSkills: string[];
  userInfo?: {
    id: string;
    username: string;
    avatar?: string;
  };
  onClose: () => void;
  onPublish: (data: {
    videoUri: string;
    musicUri?: string;
    description: string;
    privacy: string;
    category: string;
    tags: string[];
    isMuted: boolean;
    volume: number;
    trimStart?: number;
    trimEnd?: number;
  }) => Promise<string | void>; // Return video ID for navigation
}

export default function VideoDetailsScreen({
  visible,
  videoUri,
  musicUri,
  userSkills,
  userInfo,
  onClose,
  onPublish,
}: VideoDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [category, setCategory] = useState(userSkills[0] || '');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [activeEditMode, setActiveEditMode] = useState<'text' | 'sticker' | 'filter' | 'trim' | 'privacy' | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [trimStartSeconds, setTrimStartSeconds] = useState(0);
  const [trimEndSeconds, setTrimEndSeconds] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoPosition, setVideoPosition] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  
  const videoRef = useRef<Video>(null);
  const musicSoundRef = useRef<Audio.Sound | null>(null);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const positionUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Trim handle positions
  const trimHandleStartX = useRef(0);
  const trimHandleEndX = useRef(SCREEN_WIDTH - 40);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const timelineContainerRef = useRef<View>(null);
  const [timelineLayout, setTimelineLayout] = useState({ x: 20, width: SCREEN_WIDTH - 80 });
  const trimUpdateThrottleRef = useRef<number>(0);
  const [currentMusicUri, setCurrentMusicUri] = useState<string | undefined>(musicUri);

  // Video ve müzik yükleme
  useEffect(() => {
    if (visible) {
      loadVideoDuration();
      if (currentMusicUri) {
        loadMusic();
      }
    } else {
      // Cleanup
      stopPositionTracking();
      pauseVideoWithMusic();
      if (musicSoundRef.current) {
        musicSoundRef.current.unloadAsync();
        musicSoundRef.current = null;
      }
    }
    
    return () => {
      stopPositionTracking();
    };
  }, [visible, currentMusicUri]);

  // Trim değerleri değiştiğinde saniye cinsinden hesapla
  useEffect(() => {
    if (videoDurationSeconds > 0) {
      setTrimStartSeconds((trimStart / 100) * videoDurationSeconds);
      setTrimEndSeconds((trimEnd / 100) * videoDurationSeconds);
    }
  }, [trimStart, trimEnd, videoDurationSeconds]);

  // Volume değiştiğinde videoya uygula
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setVolumeAsync(isMuted ? 0 : volume);
    }
    if (musicSoundRef.current) {
      musicSoundRef.current.setVolumeAsync(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  // Video oynatıldığında müziği de başlat
  useEffect(() => {
    if (isPlaying && musicSoundRef.current && !isMuted) {
      musicSoundRef.current.playAsync().catch((error) => {
        console.error('Error playing music:', error);
      });
    } else if (!isPlaying && musicSoundRef.current) {
      musicSoundRef.current.pauseAsync().catch((error) => {
        console.error('Error pausing music:', error);
      });
    }
  }, [isPlaying, isMuted]);

  // Video durumu değişikliklerini takip et
  useEffect(() => {
    if (!visible) {
      setIsPlaying(false);
      stopPositionTracking();
      if (musicSoundRef.current) {
        musicSoundRef.current.pauseAsync();
      }
    }
  }, [visible]);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadVideoDuration = async () => {
    if (videoRef.current) {
      try {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          const duration = status.durationMillis || 0;
          setVideoDuration(duration);
          setVideoDurationSeconds(duration / 1000);
          setTrimEnd(100);
          setTrimEndSeconds(duration / 1000);
          // Initialize trim handles
          trimHandleStartX.current = 20;
          trimHandleEndX.current = SCREEN_WIDTH - 60;
        }
      } catch (error) {
        console.error('Error loading video duration:', error);
      }
    }
  };

  const loadMusic = async () => {
    if (!currentMusicUri) return;
    
    try {
      // Önceki müziği temizle
      if (musicSoundRef.current) {
        await musicSoundRef.current.unloadAsync();
        musicSoundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: currentMusicUri },
        { shouldPlay: false, isLooping: true }
      );
      musicSoundRef.current = sound;
      await sound.setVolumeAsync(isMuted ? 0 : volume);
      console.log('Music loaded successfully:', currentMusicUri);
    } catch (error) {
      console.error('Error loading music:', error);
      Alert.alert('Hata', 'Müzik yüklenirken bir hata oluştu.');
    }
  };

  const handleAddMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedMusic = result.assets[0];
        setCurrentMusicUri(selectedMusic.uri);
        Alert.alert('Başarılı', 'Müzik eklendi!');
      }
    } catch (error) {
      console.error('Error picking music:', error);
      Alert.alert('Hata', 'Müzik seçilirken bir hata oluştu.');
    }
  };

  const playVideoWithMusic = async () => {
    try {
      // Önce videoyu başlat
      if (videoRef.current) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          // Trim başlangıcına göre pozisyon ayarla
          if (trimStart > 0 && videoDurationSeconds > 0) {
            const startPosition = (trimStart / 100) * videoDurationSeconds * 1000;
            await videoRef.current.setPositionAsync(startPosition);
          }
          await videoRef.current.playAsync();
          setIsPlaying(true);
          startPositionTracking();
        }
      }
      
      // Sonra müziği başlat (video ile senkronize)
      if (musicSoundRef.current && !isMuted) {
        try {
          const musicStatus = await musicSoundRef.current.getStatusAsync();
          if (musicStatus.isLoaded) {
            await musicSoundRef.current.playAsync();
            console.log('Music started playing');
          }
        } catch (error) {
          console.error('Error playing music:', error);
        }
      }
    } catch (error) {
      console.error('Error playing video:', error);
    }
  };

  const pauseVideoWithMusic = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
        stopPositionTracking();
      }
      if (musicSoundRef.current) {
        await musicSoundRef.current.pauseAsync();
      }
    } catch (error) {
      console.error('Error pausing:', error);
    }
  };

  const startPositionTracking = () => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
    }
    
    positionUpdateInterval.current = setInterval(async () => {
      if (videoRef.current && isPlaying) {
        try {
          const status = await videoRef.current.getStatusAsync();
          if (status.isLoaded && status.positionMillis !== undefined) {
            setVideoPosition(status.positionMillis);
            
            // Trim end kontrolü - video trim bitişine ulaştığında durdur
            if (trimEnd < 100 && videoDurationSeconds > 0) {
              const trimEndMillis = (trimEnd / 100) * videoDurationSeconds * 1000;
              if (status.positionMillis >= trimEndMillis) {
                await videoRef.current.pauseAsync();
                await videoRef.current.setPositionAsync((trimStart / 100) * videoDurationSeconds * 1000);
                setIsPlaying(false);
                stopPositionTracking();
                if (musicSoundRef.current) {
                  await musicSoundRef.current.pauseAsync();
                }
                return;
              }
            }
            
            // Müzik senkronizasyonu (video sıfırlandığında müzik de sıfırlanır)
            if (musicSoundRef.current && status.positionMillis < 100) {
              const musicStatus = await musicSoundRef.current.getStatusAsync();
              if (musicStatus.isLoaded && musicStatus.positionMillis > 1000) {
                await musicSoundRef.current.setPositionAsync(0);
              }
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }
    }, 100);
  };

  const stopPositionTracking = () => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
      positionUpdateInterval.current = null;
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handlePublish = async () => {
    if (!category) {
      Alert.alert('Hata', 'Lütfen bir kategori seçin');
      return;
    }

    setIsProcessing(true);

    try {
      let finalVideoUri = videoUri;
      
      if (currentMusicUri && !isMuted) {
        console.log('Music will be added to video:', currentMusicUri);
      }

      const videoId = await onPublish({
        videoUri: finalVideoUri,
        musicUri: currentMusicUri && !isMuted ? currentMusicUri : undefined,
        description,
        privacy,
        category,
        tags,
        isMuted,
        volume,
        trimStart: trimStart > 0 ? trimStartSeconds : undefined,
        trimEnd: trimEnd < 100 ? trimEndSeconds : undefined,
      });
      
      // Alert gösterme, direkt kapat
      onClose();
    } catch (error) {
      console.error('Error publishing video:', error);
      Alert.alert('Hata', 'Video yayınlanırken bir hata oluştu.');
      setIsProcessing(false);
    }
  };

  // Trim handle drag handlers
  const trimStartPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsDraggingStart(true);
      pauseVideoWithMusic();
    },
    onPanResponderMove: async (evt, gestureState) => {
      // Timeline container'ın pozisyonunu kullan
      const timelineStart = timelineLayout.x;
      const timelineWidth = timelineLayout.width;
      const pageX = evt.nativeEvent.pageX;
      
      // Timeline içindeki pozisyonu hesapla
      const relativeX = pageX - timelineStart;
      const newX = Math.max(timelineStart, Math.min(trimHandleEndX.current - 40, pageX));
      trimHandleStartX.current = newX;
      const percentage = Math.max(0, Math.min(100, (relativeX / timelineWidth) * 100));
      const newTrimStart = Math.max(0, Math.min(trimEnd - 1, percentage));
      setTrimStart(newTrimStart);
      
      // Video pozisyonunu güncelle - gerçek zamanlı sarma (throttle ile)
      if (videoRef.current && videoDurationSeconds > 0) {
        const newPosition = (newTrimStart / 100) * videoDurationSeconds * 1000;
        const now = Date.now();
        try {
          // Throttle: Her 50ms'de bir güncelle
          if (now - trimUpdateThrottleRef.current > 50) {
            await videoRef.current.setPositionAsync(newPosition);
            trimUpdateThrottleRef.current = now;
          }
        } catch (error) {
          // Ignore errors
        }
      }
    },
    onPanResponderRelease: () => {
      setIsDraggingStart(false);
    },
  });

  const trimEndPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsDraggingEnd(true);
      pauseVideoWithMusic();
    },
    onPanResponderMove: async (evt, gestureState) => {
      // Timeline container'ın pozisyonunu kullan
      const timelineStart = timelineLayout.x;
      const timelineWidth = timelineLayout.width;
      const pageX = evt.nativeEvent.pageX;
      
      // Timeline içindeki pozisyonu hesapla
      const relativeX = pageX - timelineStart;
      const newX = Math.max(trimHandleStartX.current + 40, Math.min(SCREEN_WIDTH - 60, pageX));
      trimHandleEndX.current = newX;
      const percentage = Math.max(0, Math.min(100, (relativeX / timelineWidth) * 100));
      const newTrimEnd = Math.min(100, Math.max(trimStart + 1, percentage));
      setTrimEnd(newTrimEnd);
      
      // Video pozisyonunu güncelle - gerçek zamanlı sarma (throttle ile)
      if (videoRef.current && videoDurationSeconds > 0) {
        const newPosition = (newTrimEnd / 100) * videoDurationSeconds * 1000;
        const now = Date.now();
        try {
          // Throttle: Her 50ms'de bir güncelle
          if (now - trimUpdateThrottleRef.current > 50) {
            await videoRef.current.setPositionAsync(newPosition);
            trimUpdateThrottleRef.current = now;
          }
        } catch (error) {
          // Ignore errors
        }
      }
    },
    onPanResponderRelease: () => {
      setIsDraggingEnd(false);
    },
  });

  // Update trim handle positions when trim values change
  useEffect(() => {
    if (videoDurationSeconds > 0 && !isDraggingStart && !isDraggingEnd) {
      const timelineWidth = SCREEN_WIDTH - 80;
      trimHandleStartX.current = 20 + (trimStart / 100) * timelineWidth;
      trimHandleEndX.current = 20 + (trimEnd / 100) * timelineWidth;
    }
  }, [trimStart, trimEnd, videoDurationSeconds]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Video</Text>
            <TouchableOpacity 
              onPress={handlePublish} 
              style={styles.headerButton}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Text style={styles.publishButtonDisabled}>Processing...</Text>
              ) : (
                <Text style={styles.publishButton}>Next</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Full Screen Video */}
          <View style={styles.fullScreenVideo}>
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted={isMuted}
              volume={isMuted ? 0 : volume}
              shouldPlay={isPlaying}
              useNativeControls={false}
              onLoad={loadVideoDuration}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded) {
                  if (status.didJustFinish) {
                    setIsPlaying(false);
                    stopPositionTracking();
                    if (musicSoundRef.current) {
                      musicSoundRef.current.pauseAsync();
                    }
                  }
                }
              }}
            />
            
            {/* Play/Pause Overlay */}
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={isPlaying ? pauseVideoWithMusic : playVideoWithMusic}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={48} color="#fff" />
            </TouchableOpacity>

            {/* Trim Timeline (only visible in trim mode) */}
            {activeEditMode === 'trim' && videoDurationSeconds > 0 && (
              <View style={styles.trimTimeline}>
                <View 
                  ref={timelineContainerRef}
                  style={styles.trimTrack}
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout;
                    setTimelineLayout({ x, width });
                  }}
                >
                  {/* Trim Start Handle */}
                  <View
                    {...trimStartPanResponder.panHandlers}
                    style={[styles.trimHandle, { left: trimHandleStartX.current }]}
                  >
                    <View style={styles.trimHandleBar} />
                    <View style={styles.trimHandleIndicator} />
                  </View>
                  
                  {/* Trim End Handle */}
                  <View
                    {...trimEndPanResponder.panHandlers}
                    style={[styles.trimHandle, { left: trimHandleEndX.current }]}
                  >
                    <View style={styles.trimHandleBar} />
                    <View style={styles.trimHandleIndicator} />
                  </View>
                  
                  {/* Trim Selection Area */}
                  <View
                    style={[
                      styles.trimSelection,
                      {
                        left: trimHandleStartX.current,
                        width: trimHandleEndX.current - trimHandleStartX.current,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.trimDurationText}>
                  {trimStartSeconds.toFixed(1)}s - {trimEndSeconds.toFixed(1)}s
                </Text>
              </View>
            )}
          </View>

          {/* Bottom Edit Buttons */}
          <View style={styles.bottomEditBar}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.editButtonsContainer}
            >
              <TouchableOpacity
                style={[styles.editButton, activeEditMode === 'text' && styles.editButtonActive]}
                onPress={() => setActiveEditMode(activeEditMode === 'text' ? null : 'text')}
              >
                <Ionicons 
                  name="text-outline" 
                  size={24} 
                  color={activeEditMode === 'text' ? '#FF6B35' : '#fff'} 
                />
                <Text style={[styles.editButtonText, activeEditMode === 'text' && styles.editButtonTextActive]}>
                  Metin Ekle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, activeEditMode === 'sticker' && styles.editButtonActive]}
                onPress={() => setActiveEditMode(activeEditMode === 'sticker' ? null : 'sticker')}
              >
                <Ionicons 
                  name="happy-outline" 
                  size={24} 
                  color={activeEditMode === 'sticker' ? '#FF6B35' : '#fff'} 
                />
                <Text style={[styles.editButtonText, activeEditMode === 'sticker' && styles.editButtonTextActive]}>
                  Çıkartma
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, activeEditMode === 'filter' && styles.editButtonActive]}
                onPress={() => setActiveEditMode(activeEditMode === 'filter' ? null : 'filter')}
              >
                <Ionicons 
                  name="sparkles-outline" 
                  size={24} 
                  color={activeEditMode === 'filter' ? '#FF6B35' : '#fff'} 
                />
                <Text style={[styles.editButtonText, activeEditMode === 'filter' && styles.editButtonTextActive]}>
                  Filtreler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, activeEditMode === 'trim' && styles.editButtonActive]}
                onPress={() => setActiveEditMode(activeEditMode === 'trim' ? null : 'trim')}
              >
                <Ionicons 
                  name="cut-outline" 
                  size={24} 
                  color={activeEditMode === 'trim' ? '#FF6B35' : '#fff'} 
                />
                <Text style={[styles.editButtonText, activeEditMode === 'trim' && styles.editButtonTextActive]}>
                  Kırpma
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, currentMusicUri && styles.editButtonActive]}
                onPress={handleAddMusic}
              >
                <Ionicons 
                  name="musical-notes-outline" 
                  size={24} 
                  color={currentMusicUri ? '#FF6B35' : '#fff'} 
                />
                <Text style={[styles.editButtonText, currentMusicUri && styles.editButtonTextActive]}>
                  Müzik Ekle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, activeEditMode === 'privacy' && styles.editButtonActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveEditMode(activeEditMode === 'privacy' ? null : 'privacy');
                }}
              >
                <Ionicons 
                  name="lock-closed-outline" 
                  size={24} 
                  color={activeEditMode === 'privacy' ? '#FF6B35' : '#fff'} 
                />
                <Text style={[styles.editButtonText, activeEditMode === 'privacy' && styles.editButtonTextActive]}>
                  Gizlilik
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Edit Mode Content */}
          {activeEditMode && (
            <View style={styles.editModeContent}>
              {activeEditMode === 'text' && (
                <View style={styles.editModePanel}>
                  <Text style={styles.editModeTitle}>Add Text</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter text..."
                    placeholderTextColor="#999"
                    value={description}
                    onChangeText={setDescription}
                    maxLength={500}
                    multiline
                    onFocus={() => {
                      // Keyboard açıldığında modal'ın kapanmasını engelle
                    }}
                    blurOnSubmit={false}
                  />
                  <View style={styles.textOptions}>
                    <TouchableOpacity style={styles.textOptionButton}>
                      <Ionicons name="color-palette-outline" size={20} color="#666" />
                      <Text style={styles.textOptionText}>Color</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.textOptionButton}>
                      <Ionicons name="text-outline" size={20} color="#666" />
                      <Text style={styles.textOptionText}>Font</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.textOptionButton}>
                      <Ionicons name="move-outline" size={20} color="#666" />
                      <Text style={styles.textOptionText}>Position</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {activeEditMode === 'sticker' && (
                <View style={styles.editModePanel}>
                  <Text style={styles.editModeTitle}>Add Sticker</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stickerScroll}>
                    {['😀', '😍', '🔥', '💯', '👍', '❤️', '🎉', '⭐'].map((sticker, index) => (
                      <TouchableOpacity key={index} style={styles.stickerItem}>
                        <Text style={styles.stickerEmoji}>{sticker}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {activeEditMode === 'filter' && (
                <View style={styles.editModePanel}>
                  <Text style={styles.editModeTitle}>Filters</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {['None', 'Vintage', 'B&W', 'Warm', 'Cool', 'Dramatic', 'Cinematic', 'Vivid'].map((filter) => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.filterItem, selectedFilter === filter && styles.filterItemActive]}
                        onPress={() => setSelectedFilter(selectedFilter === filter ? null : filter)}
                      >
                        <View style={[styles.filterPreview, selectedFilter === filter && styles.filterPreviewActive]} />
                        <Text style={[styles.filterName, selectedFilter === filter && styles.filterNameActive]}>
                          {filter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {activeEditMode === 'trim' && (
                <View style={styles.editModePanel}>
                  <Text style={styles.editModeTitle}>Trim Video</Text>
                  <Text style={styles.trimInfoText}>
                    Drag the handles to trim your video
                  </Text>
                  <View style={styles.trimStats}>
                    <View style={styles.trimStatItem}>
                      <Text style={styles.trimStatLabel}>Start</Text>
                      <Text style={styles.trimStatValue}>{trimStartSeconds.toFixed(1)}s</Text>
                    </View>
                    <View style={styles.trimStatItem}>
                      <Text style={styles.trimStatLabel}>End</Text>
                      <Text style={styles.trimStatValue}>{trimEndSeconds.toFixed(1)}s</Text>
                    </View>
                    <View style={styles.trimStatItem}>
                      <Text style={styles.trimStatLabel}>Duration</Text>
                      <Text style={styles.trimStatValue}>{(trimEndSeconds - trimStartSeconds).toFixed(1)}s</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeEditMode === 'privacy' && (
                <View style={styles.editModePanel}>
                  <Text style={styles.editModeTitle}>Privacy Settings</Text>
                  <View style={styles.privacyOptions}>
                    {PRIVACY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.privacyOption,
                          privacy === option.id && styles.privacyOptionActive,
                        ]}
                        onPress={() => setPrivacy(option.id)}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={24}
                          color={privacy === option.id ? '#fff' : '#666'}
                        />
                        <Text
                          style={[
                            styles.privacyOptionText,
                            privacy === option.id && styles.privacyOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Category */}
                  <View style={styles.categorySection}>
                    <Text style={styles.categoryLabel}>Category *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {userSkills.map((skill) => (
                        <TouchableOpacity
                          key={skill}
                          style={[
                            styles.categoryChip,
                            category === skill && styles.categoryChipActive,
                          ]}
                          onPress={() => setCategory(skill)}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              category === skill && styles.categoryChipTextActive,
                            ]}
                          >
                            {skill}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Tags */}
                  <View style={styles.tagsSection}>
                    <Text style={styles.tagsLabel}>Tags (max 5)</Text>
                    <View style={styles.tagInputRow}>
                      <TextInput
                        style={styles.tagInput}
                        value={tagInput}
                        onChangeText={setTagInput}
                        placeholder="Add a tag..."
                        placeholderTextColor="#999"
                        onSubmitEditing={addTag}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={[styles.addTagBtn, tags.length >= 5 && styles.addTagBtnDisabled]}
                        onPress={addTag}
                        disabled={tags.length >= 5}
                      >
                        <Ionicons name="add" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.tagsList}>
                      {tags.map((tag, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.tagChip}
                          onPress={() => removeTag(tag)}
                        >
                          <Text style={styles.tagChipText}>#{tag}</Text>
                          <Ionicons name="close-circle" size={16} color="#666" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#000',
    width: SCREEN_WIDTH,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  publishButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    textAlign: 'right',
  },
  publishButtonDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    textAlign: 'right',
  },
  fullScreenVideo: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimTimeline: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 5,
  },
  trimTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 8,
  },
  trimHandle: {
    position: 'absolute',
    top: -12,
    width: 40,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimHandleBar: {
    width: 3,
    height: 28,
    backgroundColor: '#FF6B35',
    borderRadius: 1.5,
  },
  trimHandleIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
    borderWidth: 2,
    borderColor: '#fff',
  },
  trimSelection: {
    position: 'absolute',
    top: 0,
    height: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  trimDurationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomEditBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  editButtonsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
    minWidth: 80,
  },
  editButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  editButtonTextActive: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  editModeContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: 250,
  },
  editModePanel: {
    padding: 16,
  },
  editModeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  textOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  textOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  textOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  stickerScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  stickerItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stickerEmoji: {
    fontSize: 32,
  },
  filterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 16,
    gap: 8,
  },
  filterItemActive: {
    opacity: 1,
  },
  filterPreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterPreviewActive: {
    borderColor: '#FF6B35',
    borderWidth: 3,
  },
  filterName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  filterNameActive: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  trimInfoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.7,
  },
  trimStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  trimStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  trimStatLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  trimStatValue: {
    fontSize: 18,
    color: '#FF6B35',
    fontWeight: '700',
  },
  privacyOptions: {
    gap: 12,
    marginBottom: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  privacyOptionActive: {
    backgroundColor: '#FF6B35',
  },
  privacyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  privacyOptionTextActive: {
    color: '#fff',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  categoryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagBtnDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
});
```

---

### app/MeScreen.tsx

Profil sayfası. Kullanıcı bilgileri, video grid, tab sistemi.

```typescript
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditProfileScreen from './EditProfileScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 1; // 1px gap between items
const GRID_ITEM_SIZE = (SCREEN_WIDTH - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

/**
 * MeScreen - Modern profil sayfası
 * 
 * Dribbble "Look at Me" tasarımına uygun
 * Modern, temiz ve minimal tasarım
 */
interface MeScreenProps {
  isActive?: boolean;
}

export default function MeScreen({ isActive = false }: MeScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'videos' | 'saved'>('videos');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Örnek kullanıcı verisi - state olarak
  const [user, setUser] = useState({
    id: 'user1',
    username: 'johndoe',
    fullName: 'John Doe',
    mainAvatar: 'https://i.pravatar.cc/300?img=1',
    leftAvatar: 'https://i.pravatar.cc/300?img=2',
    rightAvatar: 'https://i.pravatar.cc/300?img=3',
    skills: ['Photography', 'Travel', 'Adventure'],
    posts: 42,
    followers: 1250,
    following: 340,
  });

  const handleSaveProfile = (data: {
    username: string;
    fullName: string;
    mainAvatar: string;
    leftAvatar: string;
    rightAvatar: string;
    skills: string[];
  }) => {
    setUser({
      ...user,
      username: data.username,
      fullName: data.fullName,
      mainAvatar: data.mainAvatar,
      leftAvatar: data.leftAvatar,
      rightAvatar: data.rightAvatar,
      skills: data.skills,
    });
  };

  // Örnek içerik verileri (ızgara için)
  const videos = Array.from({ length: 12 }, (_, i) => ({
    id: `video-${i + 1}`,
    thumbnail: `https://picsum.photos/400/600?random=${i + 1}`,
    isVideo: true,
  }));

  const savedVideos = Array.from({ length: 9 }, (_, i) => ({
    id: `saved-${i + 1}`,
    thumbnail: `https://picsum.photos/400/600?random=${i + 20}`,
    isVideo: true,
  }));

  const posts = activeTab === 'videos' ? videos : savedVideos;

  // Tab indicator ve content animasyonu
  useEffect(() => {
    // İçerik kaydırma animasyonu
    Animated.spring(contentAnim, {
      toValue: activeTab === 'videos' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Indicator animasyonu
    Animated.spring(indicatorAnim, {
      toValue: activeTab === 'videos' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [activeTab]);

  const renderPostItem = ({ item, index }: { item: typeof posts[0]; index: number }) => {
    const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
    const rowNumber = Math.floor(index / GRID_COLUMNS);
    const totalRows = Math.ceil(posts.length / GRID_COLUMNS);
    const isLastRow = rowNumber === totalRows - 1;
    return (
      <View style={[
        styles.postItem, 
        { 
          marginRight: isLastInRow ? 0 : GRID_GAP,
          marginBottom: isLastRow ? 0 : GRID_GAP
        }
      ]}>
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.postThumbnail}
          resizeMode="cover"
        />
        {/* Tüm videolar için play ikonu göster */}
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={16} color="#fff" />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => console.log('Back')}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerUsername}>@{user.username}</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => console.log('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isActive}
      >
        {/* Profile Photos - Ana fotoğraf ve yan fotoğraflar */}
        <View style={styles.profilePhotoContainer}>
          {/* Left Photo */}
          <View style={[styles.secondaryPhotoContainer, styles.leftSecondaryPhoto]}>
            <Image 
              source={{ uri: user.leftAvatar }} 
              style={styles.secondaryPhoto}
            />
          </View>

          {/* Main Photo */}
          <View style={[styles.mainPhotoWrapper, styles.mainPhotoMargin]}>
            <Image 
              source={{ uri: user.mainAvatar }} 
              style={styles.profilePhoto}
            />
          </View>

          {/* Right Photo */}
          <View style={[styles.secondaryPhotoContainer, styles.rightSecondaryPhoto]}>
            <Image 
              source={{ uri: user.rightAvatar }} 
              style={styles.secondaryPhoto}
            />
          </View>
        </View>

        {/* Ad Soyad */}
        <View style={styles.userInfo}>
          <Text style={styles.fullName}>{user.fullName}</Text>
        </View>

        {/* Yetenek Alanları - 3 adet */}
        <View style={styles.skillsContainer}>
          {user.skills.map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>#{skill}</Text>
            </View>
          ))}
        </View>

        {/* Stats - Videos, Followers, Following */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.posts}</Text>
            <Text style={styles.statLabel}>Videos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setShowEditProfile(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.inviteButton}
            onPress={() => console.log('Invite')}
          >
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('videos')}
          >
            <Ionicons 
              name="videocam" 
              size={24} 
              color={activeTab === 'videos' ? '#FF6B35' : '#999'} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons 
              name="bookmark" 
              size={24} 
              color={activeTab === 'saved' ? '#FF6B35' : '#999'} 
            />
          </TouchableOpacity>
          {/* Animated Indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [
                  {
                    translateX: indicatorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, SCREEN_WIDTH / 2], // İkinci tab'ın ortasına kaydır
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        {/* Posts Grid Container - Slide Animation */}
        <View style={styles.postsContainer}>
          {/* Videos Tab Content */}
          <Animated.View
            style={[
              styles.postsSection,
              {
                transform: [
                  {
                    translateX: contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -SCREEN_WIDTH],
                    }),
                  },
                ],
                opacity: contentAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.3, 0],
                }),
              },
            ]}
          >
            <FlatList
              data={videos}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id}
              numColumns={GRID_COLUMNS}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
            />
          </Animated.View>

          {/* Saved Videos Tab Content */}
          <Animated.View
            style={[
              styles.postsSection,
              styles.postsSectionAbsolute,
              {
                transform: [
                  {
                    translateX: contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_WIDTH, 0],
                    }),
                  },
                ],
                opacity: contentAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.3, 1],
                }),
              },
            ]}
          >
            <FlatList
              data={savedVideos}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id}
              numColumns={GRID_COLUMNS}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
            />
          </Animated.View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileScreen
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
        user={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerUsername: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profilePhotoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  mainPhotoWrapper: {
    zIndex: 3, // En üstte
  },
  mainPhotoMargin: {
    marginHorizontal: -40, // Fotoğrafları daha yaklaştırmak için negatif margin
  },
  profilePhoto: {
    width: 115, // %15 büyütüldü (100 * 1.15)
    height: 129, // %15 büyütüldü (112 * 1.15)
    borderRadius: 10,
    overflow: 'hidden',
  },
  secondaryPhotoContainer: {
    zIndex: 1, // Ana fotoğrafın altında
  },
  leftSecondaryPhoto: {
    transform: [{ rotate: '-10deg' }],
  },
  rightSecondaryPhoto: {
    transform: [{ rotate: '10deg' }],
  },
  secondaryPhoto: {
    width: 90, // %10 küçük (100 * 0.9)
    height: 101, // %10 küçük (112 * 0.9)
    borderRadius: 9,
    opacity: 0.5, // Hafif soluk
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    alignItems: 'center',
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 4,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillText: {
    fontSize: 13,
    color: '#FF6B35', // Tok turuncu
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inviteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  inviteButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 0,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH / 4, // Kısaltılmış çizgi
    height: 2,
    backgroundColor: '#FF6B35', // Tok turuncu
    left: SCREEN_WIDTH / 8, // İlk tab'ın ortası (SCREEN_WIDTH/4 - SCREEN_WIDTH/8)
  },
  postsContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  postsSection: {
    paddingHorizontal: 0,
  },
  postsSectionAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  postItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE * 1.3, // Dikey format (video gibi) - height azaltıldı
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  postThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
```

---

### app/EditProfileScreen.tsx

Profil düzenleme modal'ı.

```typescript
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mevcut skill seçenekleri
const AVAILABLE_SKILLS = [
  'Photography',
  'Travel',
  'Adventure',
  'Fitness',
  'Food',
  'Music',
  'Art',
  'Technology',
  'Fashion',
  'Sports',
  'Gaming',
  'Nature',
];

interface EditProfileScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    username: string;
    fullName: string;
    mainAvatar: string;
    leftAvatar: string;
    rightAvatar: string;
    skills: string[];
  }) => void;
  user: {
    username: string;
    fullName: string;
    mainAvatar: string;
    leftAvatar: string;
    rightAvatar: string;
    skills: string[];
  };
}

export default function EditProfileScreen({ visible, onClose, onSave, user }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState(user.username);
  const [fullName, setFullName] = useState(user.fullName);
  const [mainAvatar, setMainAvatar] = useState(user.mainAvatar);
  const [leftAvatar, setLeftAvatar] = useState(user.leftAvatar);
  const [rightAvatar, setRightAvatar] = useState(user.rightAvatar);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(user.skills);

  const slideAnim = React.useRef(new Animated.Value(SCREEN_WIDTH)).current;

  React.useEffect(() => {
    if (visible) {
      // Modal açıldığında state'leri güncelle
      setUsername(user.username);
      setFullName(user.fullName);
      setMainAvatar(user.mainAvatar);
      setLeftAvatar(user.leftAvatar);
      setRightAvatar(user.rightAvatar);
      setSelectedSkills(user.skills);
      
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const pickImage = async (type: 'main' | 'left' | 'right') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [100, 112],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'main') {
        setMainAvatar(uri);
      } else if (type === 'left') {
        setLeftAvatar(uri);
      } else {
        setRightAvatar(uri);
      }
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      if (selectedSkills.length < 3) {
        setSelectedSkills([...selectedSkills, skill]);
      }
    }
  };

  const handleSave = () => {
    onSave({
      username,
      fullName,
      mainAvatar,
      leftAvatar,
      rightAvatar,
      skills: selectedSkills,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Full Name */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            </View>

            {/* Username */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.usernameContainer}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Profile Photos */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Profile Photos</Text>
              <View style={styles.profilePhotosContainer}>
                <TouchableOpacity
                  style={styles.profilePhotoItem}
                  onPress={() => pickImage('left')}
                >
                  <Image source={{ uri: leftAvatar }} style={styles.profilePhotoSmall} />
                  <Text style={styles.profilePhotoLabel}>Left</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profilePhotoItem}
                  onPress={() => pickImage('main')}
                >
                  <Image source={{ uri: mainAvatar }} style={styles.profilePhotoSmall} />
                  <Text style={styles.profilePhotoLabel}>Main</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profilePhotoItem}
                  onPress={() => pickImage('right')}
                >
                  <Image source={{ uri: rightAvatar }} style={styles.profilePhotoSmall} />
                  <Text style={styles.profilePhotoLabel}>Right</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Skills Selection */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Skills (Select up to 3)</Text>
              <View style={styles.skillsContainer}>
                {AVAILABLE_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[
                        styles.skillButton,
                        isSelected && styles.skillButtonSelected,
                      ]}
                      onPress={() => toggleSkill(skill)}
                    >
                      <Text
                        style={[
                          styles.skillButtonText,
                          isSelected && styles.skillButtonTextSelected,
                        ]}
                      >
                        #{skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  profilePhotosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  profilePhotoItem: {
    alignItems: 'center',
  },
  profilePhotoSmall: {
    width: 80,
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  profilePhotoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  inputSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  usernamePrefix: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skillButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  skillButtonSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  skillButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  skillButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
```

---

### components/MainPager.tsx

Yatay sayfa geçişleri için pager component'i.

```typescript
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface MainPagerProps {
  children: React.ReactNode[];
  initialPage?: number;
  onPageChange?: (page: number) => void;
  translateX: SharedValue<number>;
  currentPage: SharedValue<number>;
  pageWidth: number;
  pageHeight: number;
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
  pageWidth,
  pageHeight,
}: MainPagerProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { width: pageWidth * 3 }, animatedStyle]}>
      {children.map((child, index) => (
        <Animated.View 
          key={index} 
          style={[
            styles.page,
            { 
              left: index * pageWidth,
              width: pageWidth,
              height: pageHeight,
            }
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
    pageCount: number,
    pageWidth: number
  ) => {
    'worklet';
    const newTranslateX = translateX.value + deltaTranslationX;
    
    // Sınırları kontrol et
    const minTranslateX = -pageWidth * (pageCount - 1);
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
    pageWidth: number,
    onPageChange?: (page: number) => void
  ) => {
    'worklet';
    const currentTranslateX = translateX.value;
    const pageIndex = Math.round(-currentTranslateX / pageWidth);
    
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
    translateX.value = withSpring(-pageWidth * targetPage, {
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
    position: 'relative',
    marginTop: 0,
    paddingTop: 0,
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
    marginTop: 0,
    paddingTop: 0,
  },
});
```

---

### components/VerticalVideoPager.tsx

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
  // onPlaybackStatusUpdate throttle için
  const playbackStatusThrottle = useRef<{ [key: string]: number }>({});

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

    // Sayfa aktif olduğunda - sadece müzik yönetimi için
    // Video oynatma shouldPlay prop'u ile otomatik yönetiliyor, manuel müdahale yok
    if (currentVideoIndex >= 0 && currentVideoIndex < videos.length) {
      const currentVideoId = videos[currentVideoIndex]?.id;
      const currentVideoData = videos[currentVideoIndex];
      
      if (currentVideoId && currentVideoData && currentVideoData.musicUri) {
        // Müzik varsa başlat
        playMusicForVideo(currentVideoId, currentVideoData.musicUri);
      }
      
      // Diğer videoların müziklerini durdur (paralel, non-blocking)
      videos.forEach((video, index) => {
        if (index !== currentVideoIndex) {
          const musicSound = musicSoundRefs.current[video.id];
          if (musicSound) {
            musicSound.pauseAsync().catch(() => {});
          }
        }
      });
    }
  }, [isActive, currentVideoIndex]); // videos.length bağımlılığından kaldırıldı - performans için
  
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
    const roundedIndex = Math.round(index);
    setCurrentVideoIndex(roundedIndex);
    if (onVideoChange) {
      onVideoChange(roundedIndex);
    }
  };
  
  // currentIndex shared value değişikliklerini takip et ve state'i güncelle - optimize edilmiş
  const lastIndexRef = useRef<number>(initialIndex);
  useAnimatedReaction(
    () => Math.round(currentIndex.value),
    (roundedIndex, previous) => {
      // Sadece gerçekten değiştiğinde güncelle (threshold ile)
      if (previous === null || previous !== roundedIndex) {
        // Sadece index gerçekten değiştiğinde state'i güncelle
        if (roundedIndex !== lastIndexRef.current) {
          lastIndexRef.current = roundedIndex;
          runOnJS(setCurrentVideoIndex)(roundedIndex);
        }
      }
    }
  );

  // Video kontrol fonksiyonlarını expose et - currentVideoIndex state'ine bağlı
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
      {videos.map((video, index) => {
        const realIndex = index; // Windowed rendering için gerçek index
        return (
          <GestureDetector key={video.id} gesture={tapGesture}>
            <Animated.View 
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
                shouldPlay={isActive && realIndex === currentVideoIndex}
            isLooping
            isMuted={false}
            useNativeControls={false}
            pointerEvents="box-none"
            onLoad={async () => {
              // Video yüklendiğinde, eğer bu aktif video ise ve kaydedilmiş pozisyon varsa, oraya git
              if (isActive && realIndex === currentVideoIndex) {
                const savedPosition = videoPositions.current[video.id];
                if (savedPosition !== undefined && savedPosition > 0) {
                  const videoRef = videoRefs.current[video.id];
                  if (videoRef) {
                    try {
                      await videoRef.setPositionAsync(savedPosition);
                    } catch (error) {
                      // Ignore errors
                    }
                  }
                }
              }
            }}
            onPlaybackStatusUpdate={(status) => {
              // Sadece aktif video oynatılmalı - diğerleri durdurulmalı
              // Throttle: Her 500ms'de bir kontrol et (performans için)
              if (status.isLoaded && status.isPlaying) {
                const now = Date.now();
                const lastCheck = playbackStatusThrottle.current[video.id] || 0;
                
                if (now - lastCheck > 500) {
                  playbackStatusThrottle.current[video.id] = now;
                  const shouldBePlaying = isActive && realIndex === currentVideoIndex;
                  if (!shouldBePlaying) {
                    // Bu video oynatılmamalı ama oynatılıyor - durdur
                    const videoRef = videoRefs.current[video.id];
                    if (videoRef) {
                      videoRef.pauseAsync().catch(() => {});
                    }
                  }
                }
              }
            }}
          />
          {/* Her video için overlay render et */}
          {renderOverlay && renderOverlay(video, index)}
        </Animated.View>
        </GestureDetector>
      );
      })}
    </Animated.View>
  );

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
    if (videoCount === 0) return;
    
    // Küçük hareketleri ignore et (performans için)
    if (Math.abs(deltaTranslationY) < 0.1) return;
    
    const newTranslateY = translateY.value + deltaTranslationY;
    
    // Sınırları kontrol et - TikTok feed gibi (sonsuz scroll, ama döngü yok)
    const maxTranslateY = 0; // En üst video
    const minTranslateY = -videoHeight * (videoCount - 1); // En alt video
    
    if (newTranslateY >= minTranslateY && newTranslateY <= maxTranslateY) {
      translateY.value = newTranslateY;
    } else if (newTranslateY > maxTranslateY) {
      translateY.value = maxTranslateY;
    } else if (newTranslateY < minTranslateY) {
      translateY.value = minTranslateY;
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

    // Sınırları kontrol et - TikTok feed gibi (sonsuz scroll, ama döngü yok)
    targetIndex = Math.max(0, Math.min(videoCount - 1, targetIndex));
    
    currentIndex.value = targetIndex;
    translateY.value = withSpring(-videoHeight * targetIndex, {
      damping: 18,
      stiffness: 180,
      mass: 0.6,
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

Bu dosya, Motion App'in tüm kodlarını ve sistem mimarisini içermektedir. Dosyalar başlıklar halinde düzenlenmiş ve ChatGPT'nin kolayca okuyabileceği formatta hazırlanmıştır.

**Toplam Kod Satırı:** ~5000+ satır
**Ana Bileşenler:** 8 dosya
**Versiyon:** 1.0.2+

## 🔄 Son Güncellemeler

### HomeScreen.tsx - Gesture ve Beğeni İyileştirmeleri

1. **FloatingHeart Component Güncellemesi**:
   - `x` ve `y` prop'ları eklendi
   - Kalp animasyonu tıklama pozisyonunda (`top: y - 50, left: x - 50`) gösteriliyor

2. **Beğeni Fonksiyonları**:
   - `handleLikeButton`: Buton için toggle özelliği (beğeni/beğenmeme)
   - `handleLike`: Gesture için sadece beğeni yapma (geri alma yok)
   - Double tap sadece beğenilmemişse beğeniyor

3. **Gesture İzolasyonu**:
   - `bottomInfo` ve `actionButtonsRow` View'lerine `onStartShouldSetResponder` ve `onMoveShouldSetResponder` eklendi
   - Avatar, username, follow button, description ve action buttons alanlarında video durdurma/oynatma ve beğeni gesture'ları çalışmıyor

4. **Double Tap İyileştirmesi**:
   - `handleDoubleTap` fonksiyonu `x` ve `y` parametreleri alıyor
   - `doubleTap` gesture'ından `event.x` ve `event.y` alınıp `handleDoubleTap`'e geçiriliyor
   - Beğeni animasyonu tıklama pozisyonunda ortaya çıkıyor

5. **State Yapısı**:
   - `hearts` state'i `{ id, x, y }` formatına güncellendi (önceden `{ id, count }` idi)
   - `onLikeRef` tipi güncellendi: `((x?: number, y?: number) => void) | null`

6. **Performans Optimizasyonları**:
   - `useMemo` ile `videoItems`, `videoDataMap`, `singleTap`, `doubleTap`, `tapGesture` memoize edildi
   - `useCallback` ile `handleVideoChange`, `handleLike`, `handleShare`, `handleSave`, `handleCategory`, `handleFollow`, `handleScreenPress`, `handleDoubleTap`, `renderOverlay` memoize edildi
   - Video data lookup O(1) complexity ile `Map` kullanılarak optimize edildi

### VerticalVideoPager.tsx - Swipe Performans Optimizasyonları

1. **Spring Animasyon Parametreleri Optimize Edildi**:
   - `damping`: 20 → 18 (daha hızlı animasyon)
   - `stiffness`: 150 → 180 (daha responsive)
   - `mass`: 0.7 → 0.6 (daha hafif, daha akıcı)
   - Sonuç: Swipe işlemi daha akıcı ve hızlı

2. **Gesture Handler Optimizasyonu**:
   - Küçük hareketler ignore ediliyor: `if (Math.abs(deltaTranslationY) < 0.1) return;`
   - Gereksiz hesaplamalar önlendi, performans artırıldı

3. **useAnimatedReaction Optimizasyonu**:
   - `lastIndexRef` ile gereksiz state güncellemeleri önlendi
   - Sadece index gerçekten değiştiğinde state güncelleniyor
   - `Math.round(currentIndex.value)` ile threshold kontrolü

4. **onPlaybackStatusUpdate Throttle**:
   - `playbackStatusThrottle` ref eklendi
   - Her 500ms'de bir kontrol ediliyor (her frame yerine)
   - Gereksiz `pauseAsync()` çağrıları azaltıldı
   - Video ID bazlı throttle mekanizması

5. **useEffect Bağımlılıkları Optimize Edildi**:
   - `videos.length` bağımlılığı kaldırıldı
   - Sadece `isActive` ve `currentVideoIndex` değiştiğinde çalışıyor
   - Gereksiz re-render'lar önlendi

6. **Video Count Dinamik Yönetimi**:
   - `_layout.tsx`'de `videoCountRef` kullanılıyor
   - `HomeScreen`'den gelen video sayısı dinamik olarak `VerticalVideoPagerHelpers`'a geçiriliyor
   - Sonsuz scroll desteği (TikTok feed gibi, döngü yok)

