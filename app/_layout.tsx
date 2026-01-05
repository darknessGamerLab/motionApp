import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { router, Slot, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Splash screen'i görünür tut
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { authState } = useAuth();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  
  const isAuthRoute = segments[0] === 'auth';

  useEffect(() => {
    // Hemen hazır ol
    setIsReady(true);
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!authState.isAuthenticated && !isAuthRoute) {
      router.replace('/auth/login');
    }
  }, [authState.isAuthenticated, isAuthRoute, isReady]);

  if (!authState.isAuthenticated && !isAuthRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
