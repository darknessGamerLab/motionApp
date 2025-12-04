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
