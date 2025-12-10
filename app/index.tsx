import { MainPager, MainPagerHelpers } from '@/components/MainPager';
import { VerticalVideoPagerHelpers } from '@/components/VerticalVideoPager';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
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
 * MainLayout - Ana uygulama layout'u
 * 
 * Navbar yok
 * Tek bir gesture handler ile tüm gesture'ları yönetir
 * Direction lock ile yatay/dikey hareketleri ayırır
 * - Page 0: Create
 * - Page 1: Home (ana ekran) - burada dikey video geçişi de var
 * - Page 2: Me
 */
export default function MainLayout() {
  const insets = useSafeAreaInsets();
  
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
          3, // video count (SAMPLE_VIDEOS.length)
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
          3,
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
              <CreateScreen isActive={isCreateActive} />
              <HomeScreen 
                translateY={videoTranslateY}
                currentVideoIndex={videoCurrentIndex}
                onVideoChange={handleVideoChange}
                isActive={isHomeActive}
                videoHeight={videoHeight}
                layoutReady={isReady}
                pageWidth={layoutWidth}
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

