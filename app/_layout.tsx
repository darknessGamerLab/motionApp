import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { useState } from 'react';
import 'react-native-reanimated';
import { MainPager, MainPagerHelpers } from '@/components/MainPager';
import { VerticalVideoPagerHelpers } from '@/components/VerticalVideoPager';
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
