import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Redirect, Slot, useSegments } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, TextProps } from 'react-native';
import { ENABLE_CUSTOM_FONTS, Fonts, TextShadow } from '@/constants/FontConfig';

// Splash screen'i görünür tut
SplashScreen.preventAutoHideAsync();

// Global Text component'ini override et - Space Grotesk + Text Shadow
if (ENABLE_CUSTOM_FONTS) {
  const originalTextRender = Text.render;
  if (originalTextRender) {
    Text.render = function (props: TextProps, ref) {
      const { style, ...otherProps } = props;
      
      // Font weight'e göre font seç
      let fontFamily = Fonts.regular;
      
      if (style) {
        const styleArray = Array.isArray(style) ? style : [style];
        
        // Bold kontrolü
        const fontWeight = styleArray.find((s: any) => s?.fontWeight)?.fontWeight;
        if (fontWeight === 'bold' || fontWeight === '700') {
          fontFamily = Fonts.bold;
        } else if (fontWeight === '600') {
          fontFamily = Fonts.semibold;
        } else if (fontWeight === '500') {
          fontFamily = Fonts.medium;
        }
      }
      
      // Font + Text Shadow uygula
      const newStyle = Array.isArray(style)
        ? [{ fontFamily, ...TextShadow }, ...style]
        : { fontFamily, ...TextShadow, ...style };
      
      return originalTextRender.call(this, { ...otherProps, style: newStyle }, ref);
    };
  }
}

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
  // Inter font yükleme - Sade ve minimal
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!ENABLE_CUSTOM_FONTS) {
      // Font sistemi kapalıysa splash screen'i hemen gizle
      SplashScreen.hideAsync();
    } else if (fontsLoaded || fontError) {
      // Font sistemi açıksa, fontlar yüklendikten sonra gizle
      SplashScreen.hideAsync();
      if (fontError) {
        console.error('❌ Font yükleme hatası:', fontError);
      }
    }
  }, [fontsLoaded, fontError]);

  // Font sistemi kapalıysa veya fontlar yüklendiyse render et
  if (ENABLE_CUSTOM_FONTS && !fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider key="auth-provider">
      <RootLayoutNav />
    </AuthProvider>
  );
}
