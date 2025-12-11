import { MainPager } from '@/components/MainPager';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  Text
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateScreen from './CreateScreen';
import HomeScreen from './HomeScreen';
import MeScreen from './MeScreen';
import InspirationScreen from './InspirationScreen';
import NotificationsScreen from './NotificationsScreen';
import UserProfileScreen from './UserProfileScreen';

/**
 * MainLayout - TikTok benzeri layout
 * 
 * - Alt tarafta 5 sekmeli navbar: Home, Inspiration, Create, Notifications, Me
 * - Home ekranında dikey video geçişi
 * - Yatay geçişler kapalı, tab bar ile sayfa değişiyor
 */
export default function MainLayout() {
  const insets = useSafeAreaInsets();
  
  // Layout dimensions - onLayout ile alınacak
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const [insetsReady, setInsetsReady] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  
  // User profile overlay
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // MainPager shared values
  const mainTranslateX = useSharedValue(0);
  const mainCurrentPage = useSharedValue(0); // 0: Home, 1: Inspiration, 2: Create, 3: Notifications, 4: Me
  
  // VerticalVideoPager shared values (sadece HomeScreen için)
  const videoTranslateY = useSharedValue(0);
  const videoCurrentIndex = useSharedValue(0);
  
  // Video height: layout height - navbar height
  const videoHeight = layoutHeight > 0 && navbarHeight > 0 ? layoutHeight - navbarHeight : 0;
  
  // Page height: layout height - navbar height (for screens in MainPager)
  const pageHeight = layoutHeight > 0 && navbarHeight > 0 ? layoutHeight - navbarHeight : 0;

  // Her ekranın aktif durumu için state (mainCurrentPage'den türetiliyor)
  const [activePageIndex, setActivePageIndex] = useState(0);
  
  // Layout ölçümü
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayoutWidth(width);
      setLayoutHeight(height);
      setLayoutReady(true);
    }
  };
  
  // Navbar yüksekliğini ölç
  const handleNavbarLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setNavbarHeight(height);
    }
  };

  
  // Insets hazır mı kontrol et
  useEffect(() => {
    if (insets.bottom >= 0) {
      const timer = setTimeout(() => {
        setInsetsReady(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [insets.bottom]);
  
  // Shared value'ların initial değerlerini ayarla (sadece layoutReady + insetsReady olduktan sonra)
  useEffect(() => {
    if (layoutReady && insetsReady && layoutWidth > 0 && layoutHeight > 0) {
      mainTranslateX.value = -layoutWidth * 0;
      mainCurrentPage.value = 0;
      
      if (videoHeight > 0) {
        videoTranslateY.value = -videoHeight * 0;
        videoCurrentIndex.value = 0;
      }
    }
  }, [layoutReady, insetsReady, layoutWidth, layoutHeight, videoHeight]);

  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
  };

  const handleVideoChange = (index: number) => {
    console.log('Video changed to index:', index);
  };

  // Aktif sayfa index'ini takip et
  useAnimatedReaction(
    () => mainCurrentPage.value,
    (currentPage) => {
      runOnJS(setActivePageIndex)(currentPage);
    }
  );

  const isReady = layoutReady && insetsReady && layoutWidth > 0 && layoutHeight > 0 && navbarHeight > 0;

  const tabs = useMemo(() => ([
    { key: 'home', label: 'Home', icon: 'square', index: 0 },
    { key: 'inspiration', label: 'Inspiration', icon: 'compass', index: 1 },
    { key: 'create', label: 'Create', icon: 'add', index: 2 },
    { key: 'notifications', label: 'Notifications', icon: 'heart', index: 3 },
    { key: 'me', label: 'Me', icon: 'person', index: 4 },
  ]), []);

  const handleTabPress = (index: number) => {
    mainCurrentPage.value = index;
    mainTranslateX.value = withSpring(-layoutWidth * index, {
      damping: 20,
      stiffness: 90,
      mass: 0.8,
    });
  };

  const handleUserPress = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setShowUserProfile(true);
  };

  const handleCloseUserProfile = () => {
    setShowUserProfile(false);
    setSelectedUserId(null);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container} onLayout={handleLayout}>
        {isReady && (
          <>
            <MainPager
              initialPage={0}
              onPageChange={handlePageChange}
              translateX={mainTranslateX}
              currentPage={mainCurrentPage}
              pageWidth={layoutWidth}
              pageHeight={pageHeight}
            >
            <HomeScreen 
              translateY={videoTranslateY}
              currentVideoIndex={videoCurrentIndex}
              onVideoChange={handleVideoChange}
              isActive={activePageIndex === 0}
              videoHeight={videoHeight}
              layoutReady={isReady}
              pageWidth={layoutWidth}
              onUserPress={handleUserPress}
            />
              <InspirationScreen isActive={activePageIndex === 1} />
              <View style={{ width: layoutWidth, height: pageHeight, backgroundColor: '#000' }} />
              <NotificationsScreen isActive={activePageIndex === 3} />
              <View style={{ width: layoutWidth, height: pageHeight, backgroundColor: '#000' }} />
            </MainPager>
            {/* Create Screen - Full screen overlay */}
            {activePageIndex === 2 && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
                <CreateScreen isActive={true} onClose={() => handleTabPress(0)} />
              </View>
            )}
            {/* Me Screen - Full screen overlay */}
            {activePageIndex === 4 && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}>
                <MeScreen 
                  isActive={true} 
                  onBackPress={() => handleTabPress(0)}
                />
              </View>
            )}
            {/* User Profile Screen - Full screen overlay */}
            {showUserProfile && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 15 }}>
                <UserProfileScreen 
                  isActive={true} 
                  onBackPress={handleCloseUserProfile}
                  userId={selectedUserId || undefined}
                />
              </View>
            )}
          </>
        )}
        <StatusBar style="light" translucent={Platform.OS === 'android'} hidden={false} />
        {/* Bottom Tab Bar - Hidden on Create and Me screens */}
        {activePageIndex !== 2 && activePageIndex !== 4 && (
          <View style={[styles.tabBar, { height: 48 + (insets.bottom || 12) }]} onLayout={handleNavbarLayout}>
          {tabs.map((tab) => {
            const isActive = activePageIndex === tab.index;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.index)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={24}
                  color={isActive ? '#fff' : '#888'}
                />
                <Text style={[styles.tabLabel, { color: isActive ? '#fff' : '#888' }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          </View>
        )}
          </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '400',
  },
});

