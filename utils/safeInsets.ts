import { Platform, StatusBar } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Modal / tam ekran katmanlarda Android’de useSafeAreaInsets().top bazen 0 döner;
 * StatusBar.currentHeight ile birleştirerek içeriğin çentik/ status altında kalmamasını sağlar.
 */
export function mergeTopInset(insets: EdgeInsets): number {
  const androidBar = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  return Math.max(insets.top, androidBar);
}
