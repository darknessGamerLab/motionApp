/**
 * ThemeContext — Runtime dark/light mode switcher
 *
 * Strateji: Colors modülü (constants/Colors.ts) her ekranın doğrudan
 * import ettiği bir singleton objedir. Bu singleton'ı ThemeContext içinde
 * Object.assign ile mutate ederek tüm 26+ dosyayı değiştirmeden runtime
 * tema geçişi sağlarız. Re-render için global forceUpdate mekanizması kullanılır.
 *
 * Kullanım:
 *   const { theme, toggleTheme, Colors: C } = useTheme();
 *   // veya direkt Colors import'unu koruyarak (mevcut pattern):
 *   import Colors from '@/constants/Colors'; // hala çalışır
 */

import Colors, { DarkPalette, LightPalette, ThemeMode } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { Appearance, Platform, StatusBar } from 'react-native';

const THEME_STORAGE_KEY = 'app_theme_mode';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  Colors: typeof Colors;
  isDark: boolean;
  /** Modal / klavye sonrası Android status + nav bar’ı tekrar tab bar rengine çeker */
  syncAndroidSystemChrome: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  Colors,
  isDark: true,
  syncAndroidSystemChrome: () => {},
});

function applyAndroidSystemChrome(mode: ThemeMode) {
  if (Platform.OS !== 'android') return;
  const palette = mode === 'dark' ? DarkPalette : LightPalette;
  StatusBar.setBackgroundColor(palette.surface);
  StatusBar.setTranslucent(false);
  StatusBar.setBarStyle(mode === 'dark' ? 'light-content' : 'dark-content');
  NavigationBar.setButtonStyleAsync(mode === 'dark' ? 'light' : 'dark').catch(() => {});
  NavigationBar.setBackgroundColorAsync(palette.surface).catch(() => {});
  NavigationBar.setBorderColorAsync(palette.border).catch(() => {});
  SystemUI.setBackgroundColorAsync(palette.surface).catch(() => {});
}

/** Forces all useTheme() consumers to re-render */
function useForceUpdate(): () => void {
  const [, setState] = React.useState(0);
  return React.useCallback(() => setState(n => n + 1), []);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Determine initial theme: saved preference > system > dark (video app default)
  const systemScheme = Appearance.getColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('dark'); // default while loading
  const [loaded, setLoaded] = useState(false);
  const forceUpdate = useForceUpdate();

  // Apply palette to the mutable Colors object and trigger re-render
  const applyPalette = useCallback((mode: ThemeMode) => {
    const palette = mode === 'dark' ? DarkPalette : LightPalette;
    Object.assign(Colors, palette);
    
    applyAndroidSystemChrome(mode);
    if (Platform.OS !== 'android') {
      StatusBar.setBarStyle(mode === 'dark' ? 'light-content' : 'dark-content');
    }
    
    forceUpdate(); // trigger re-render in all useTheme consumers
  }, [forceUpdate]);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      const mode: ThemeMode = (saved === 'light' || saved === 'dark')
        ? saved
        : (systemScheme === 'light' ? 'light' : 'dark');
      setThemeState(mode);
      applyPalette(mode);
      setLoaded(true);
    }).catch(() => {
      applyPalette('dark');
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    applyPalette(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  }, [applyPalette]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyPalette(next);
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, [applyPalette]);

  const syncAndroidSystemChrome = useCallback(() => {
    applyAndroidSystemChrome(theme);
  }, [theme]);

  // Render immediately with dark default — no blocking null render
  // (theme will update via Object.assign once AsyncStorage resolves)

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        Colors,
        isDark: theme === 'dark',
        syncAndroidSystemChrome,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook for accessing the current theme and toggling it */
export function useTheme() {
  return useContext(ThemeContext);
}
