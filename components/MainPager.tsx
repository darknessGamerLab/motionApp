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
    <Animated.View style={[styles.container, { width: pageWidth * children.length }, animatedStyle]}>
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
  },
  page: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});


