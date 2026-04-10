import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GlobalAlert } from '@/components/GlobalAlert';
import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold, useFonts } from '@expo-google-fonts/poppins';
import messaging from '@react-native-firebase/messaging';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

if (Platform.OS !== 'web') {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Arka Planda Bildirim İşlendi:', remoteMessage);
  });
}

SplashScreen.preventAutoHideAsync();

// StatusBar'ı en baştan ayarla (Android için kritik)
// Dark video app → beyaz ikonlar (light-content), koyu arka plan
if (Platform.OS === 'android') {
  StatusBar.setBackgroundColor(Colors.surface);
  StatusBar.setBarStyle('light-content');
  StatusBar.setTranslucent(false);
}

function RootLayoutNav() {
  const { authState } = useAuth();
  const { Colors: themeColors, isDark } = useTheme();
  const segments = useSegments();
  const isAuthRoute = segments[0] === 'auth';

  // Bildirim sistemini başlat
  usePushNotifications();

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (!authState.isLoading && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [authState.isLoading, fontsLoaded]);

  useEffect(() => {
    if (authState.isLoading || !fontsLoaded) return;
    if (authState.isAuthenticated && isAuthRoute) {
      router.replace('/');
    }
  }, [authState.isAuthenticated, authState.isLoading, isAuthRoute, fontsLoaded]);

  if (authState.isLoading || !fontsLoaded) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      {/* Declarative StatusBar — tüm sayfalarda tutarlı */}
      <StatusBar
        backgroundColor={themeColors.surface}
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
            <GlobalAlert />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
