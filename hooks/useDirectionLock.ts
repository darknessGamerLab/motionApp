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

