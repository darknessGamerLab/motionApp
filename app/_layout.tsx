import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { router, Slot, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

// StatusBar'ı en baştan ayarla (Android için kritik)
if (Platform.OS === 'android') {
  StatusBar.setBackgroundColor('#FAFAFA');
  StatusBar.setBarStyle('dark-content');
  StatusBar.setTranslucent(false);
}

function RootLayoutNav() {
  const { authState } = useAuth();
  const segments = useSegments();
  const isAuthRoute = segments[0] === 'auth';

  useEffect(() => {
    if (!authState.isLoading) {
      SplashScreen.hideAsync();
    }
  }, [authState.isLoading]);

  useEffect(() => {
    if (authState.isLoading) return;
    if (authState.isAuthenticated && isAuthRoute) {
      router.replace('/');
    }
  }, [authState.isAuthenticated, authState.isLoading, isAuthRoute]);

  if (authState.isLoading) {
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

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
