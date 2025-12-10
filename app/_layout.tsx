import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Redirect, Slot, useSegments } from 'expo-router';

function RootLayoutNav() {
  const { authState } = useAuth();
  const segments = useSegments();

  // İlk segment'i kontrol et (auth veya index)
  const isAuthRoute = segments[0] === 'auth';

  // Authenticated değilse
  if (!authState.isAuthenticated) {
    // Auth route'unda değilse login'e yönlendir
    if (!isAuthRoute) {
      return <Redirect href="/auth/login" />;
    }
    // Auth route'undaysa auth sayfalarını göster
    return <Slot />;
  }

  // Authenticated ise ve auth route'undaysa ana sayfaya yönlendir
  if (isAuthRoute) {
    return <Redirect href="/" />;
  }

  // Authenticated ise ana uygulamayı göster
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider key="auth-provider">
      <RootLayoutNav />
    </AuthProvider>
  );
}
