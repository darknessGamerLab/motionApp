/**
 * app/index.tsx — Ana layout ve tab navigasyonu
 *
 * Sadece şunları yönetir:
 *   • Tab navigasyonu (5 tab)
 *   • Profil state (authState'ten türetme)
 *   • Video feed → useFeed hook'una delege edildi
 *   • Fullscreen ekran geçişleri (CreateScreen, UserProfileScreen)
 *   • Upload progress banner
 *
 * Daha önce ~660 satırdı; video fetch, realtime, optimistic updates
 * hooks/useFeed.ts'e taşınarak bu dosya ~280 satıra indi.
 */

import GuestAuthModal from '@/components/GuestAuthModal';
import Colors from '@/constants/Colors';
import { getTalentById } from '@/constants/Talents';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/hooks/useFeed';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { getOptimizedImageUrl } from '@/utils/format';
import React, { Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadVideoSilently } from '@/utils/BackgroundUploader';
import {
  Animated,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AddVideoDetailsScreen = lazy(() => import('./AddVideoDetailsScreen'));
const CreateScreen = lazy(() => import('./CreateScreen'));
const HomeScreen = lazy(() => import('./HomeScreen'));
const InspirationScreen = lazy(() => import('./InspirationScreen'));
const MeScreen = lazy(() => import('./MeScreen'));
const NotificationsScreen = lazy(() => import('./NotificationsScreen'));
const UserProfileScreen = lazy(() => import('./UserProfileScreen'));

const ACCENT = Colors.primary;
const NAV_H = 52;

// ─── Tab Button ──────────────────────────────────────────────────────
const TabBtn = memo(({ icon, active, onPress, isCreate, badge, avatar }: {
  icon: string;
  active: boolean;
  onPress: () => void;
  isCreate?: boolean;
  badge?: number;
  avatar?: string | null;
}) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress} activeOpacity={0.7}>
    {isCreate ? (
      <View style={styles.createBtn}>
        <Ionicons name="add" size={20} color="#fff" />
      </View>
    ) : avatar ? (
      <View style={[styles.tabIconWrap, active && styles.tabAvatarActive]}>
        <Image source={{ uri: getOptimizedImageUrl(avatar, 80, 85) ?? avatar }} style={styles.tabAvatar} contentFit="cover" cachePolicy="memory-disk" />
        {!!badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>}
      </View>
    ) : (
      <View style={styles.tabIconWrap}>
        <Ionicons name={icon as any} size={24} color={active ? ACCENT : Colors.textMuted} />
        {!!badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View>}
      </View>
    )}
  </TouchableOpacity>
));

// ─── Lazy Tab Screen ─────────────────────────────────────────────────
// Renders nothing until first visited, then keeps alive hidden
const LazyTabScreen = memo(({ visible, children }: { visible: boolean; children: React.ReactNode }) => {
  const hasBeenVisible = useRef(false);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  if (visible) hasBeenVisible.current = true;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!hasBeenVisible.current) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0], // Hafif bir aşağıdan gelme hissi
  });

  return (
    <Animated.View
      style={[
        styles.screen,
        { opacity: anim, transform: [{ translateY }] }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
});

// ─── Profile builder helper ───────────────────────────────────────────
function buildProfile(authState: any) {
  const p = authState.profile as any;
  const talentIds = authState.userData?.talents || [];
  const skills = talentIds.map((id: string) => getTalentById(id)?.name || '').filter(Boolean);
  const avatarFallback = p?.username
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(p.username)}&background=random&size=300`
    : 'https://ui-avatars.com/api/?name=U&background=888&color=fff&size=300';
  return {
    id: p?.id || 'current',
    username: p?.username || authState.userData?.username || 'kullanici',
    fullName: p?.full_name || authState.userData?.fullName || 'Kullanıcı',
    bio: p?.bio || 'Merhaba! 👋',
    avatarUri: p?.avatar_url || avatarFallback,
    avatars: p?.avatars?.length > 0 ? p.avatars : p?.avatar_url ? [p.avatar_url] : [avatarFallback],
    avatar: p?.avatar_url || avatarFallback,
    skills: skills.length > 0 ? skills : [],
    talents: talentIds,
    following: p?.following_count ?? 0,
    followers: p?.followers_count ?? 0,
    videos: p?.videos_count ?? 0,
    radarsCount: p?.radars_count ?? 0,
    user_type: p?.user_type,
    tax_office: p?.tax_office,
    tax_number: p?.tax_number,
  };
}

// ─── Main Layout ─────────────────────────────────────────────────────
export default function MainLayout() {
  const { authState } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [guestModal, setGuestModal] = useState<{
    visible: boolean;
    action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general';
  }>({ visible: false, action: 'general' });

  const isAuth = authState.isAuthenticated;
  const userId = authState.user?.id;
  const navbarHeight = NAV_H + insets.bottom;

  const isFocused = useIsFocused();
  const isFeedActive = tab === 0 && isFocused && !guestModal.visible && !userProfileOpen;

  // ─── Feed state — delegated to useFeed hook ──────────────────────────
  const userType = (authState.profile as any)?.user_type as 'individual' | 'corporate' | undefined;
  const feed = useFeed({ userId, isAuth, userType, authLoading: authState.isLoading });


  // ─── Profile state ───────────────────────────────────────────────────
  const initialProfile = useMemo(() => buildProfile(authState), [authState.userData, authState.profile]);
  const [profile, setProfile] = useState(initialProfile);

  useEffect(() => {
    if (authState.profile) setProfile(buildProfile(authState));
  }, [authState.profile]);

  // ─── Status bar ──────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(Colors.surface);
      StatusBar.setBarStyle('dark-content');
    }
  }, []);

  // ─── Navigation helpers ──────────────────────────────────────────────
  const openProfile = useCallback((uid: string) => {
    if (uid === authState.user?.id || uid === profile.id) { setTab(4); return; }
    setSelectedUserId(uid);
    setUserProfileOpen(true);
  }, [authState.user?.id, profile.id]);

  const closeProfile = useCallback(() => {
    setUserProfileOpen(false);
    setSelectedUserId(null);
  }, []);

  const handleHomePress = useCallback(() => {
    if (tab === 0 && !userProfileOpen) {
      feed.refresh();
      setHomeRefreshKey(k => k + 1);
    } else {
      setTab(0);
    }
  }, [tab, userProfileOpen, feed.refresh]);

  const requireAuthTab = useCallback((
    action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general',
    onAuth: () => void
  ) => {
    if (!isAuth) { setGuestModal({ visible: true, action }); return; }
    onAuth();
  }, [isAuth]);

  // ─── Recording done: Camera unmount → details ekranı ───────────────
  const [pendingVideoUri, setPendingVideoUri] = useState<string | null>(null);

  const onRecordingDone = useCallback((uri: string) => {
    console.log('[MainLayout] onRecordingDone triggered', { uri });
    // 1. CreateScreen'i unmount et (Camera codec serbest kalsın)
    setTab(-1 as any); // -1 = hiçbir tab aktif değil, CreateScreen unmount olur
    console.log('[MainLayout] tab set to -1 (unmounting Create)');

    // 2. Kısa gecikme: Camera'nın native kaynakları tam serbest kalsın
    setTimeout(() => {
      console.log('[MainLayout] Setting pendingVideoUri');
      setPendingVideoUri(uri); // 3. AddVideoDetailsScreen göster
    }, 300);
  }, []);

  const onDetailsBack = useCallback(() => {
    setPendingVideoUri(null);
    setTab(2); // Kameraya geri dön
  }, []);

  const onDetailsPublish = useCallback(async (videoUri: string, description: string, topicLabel?: string, category?: string) => {
    // 1. Arayüzü hemen boşalt ve Feed'e dön
    setPendingVideoUri(null);
    setTab(0);
    setUploadProgress(0);

    // 2. Optimistic (Sahte) Video Ekle
    const optimisticId = `optimistic-${Date.now()}`;
    feed.prependVideo({
      id: optimisticId,
      uri: videoUri, // Lokal adres, video hemen oynar!
      user: { id: profile.id, username: profile.username, avatar: profile.avatarUri },
      description: description || '',
      topic: topicLabel,
      category: category,
      likes: 0, comments: 0, shares: 0,
      isLiked: false, isSaved: false, isFollowing: false,
    } as any);
    setProfile(prev => ({ ...prev, videos: prev.videos + 1 }));

    // 3. Arka Planda Yükle
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token || !userId) {
      setUploadProgress(null);
      return;
    }

    uploadVideoSilently({
      videoUri,
      userId,
      accessToken: token,
      description,
      topic: topicLabel,
      category,
      onProgress: (p) => setUploadProgress(p),
      onSuccess: (publicUrl) => {
        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(null);
          feed.refresh(); // Gerçek veriyi çek
          setHomeRefreshKey(k => k + 1);
        }, 3000);
      },
      onError: (err) => {
        setUploadProgress(null);
        feed.deleteVideo(optimisticId); // Hata varsa sahteyi kaldır
        setProfile(prev => ({ ...prev, videos: Math.max(0, prev.videos - 1) }));
      }
    });

  }, [profile, feed, userId]);

  const onVideoDelete = useCallback(async (videoId: string) => {
    await feed.deleteVideo(videoId);
    setProfile(prev => ({ ...prev, videos: Math.max(0, prev.videos - 1) }));
  }, [feed.deleteVideo]);

  const onProfileUpdate = useCallback((data: any) => {
    if (data?._navigateTo === 'create') {
      requireAuthTab('create', () => setTab(2));
      return;
    }
    setProfile(prev => ({ ...prev, ...data }));
  }, [requireAuthTab]);

  const onGuestModalClose = useCallback(() =>
    setGuestModal(p => ({ ...p, visible: false })), []);

  const isFullscreen = tab === 2 || userProfileOpen;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Suspense fallback={<View style={{ flex: 1, backgroundColor: Colors.background }} />}>
        {/* Feed */}
        <LazyTabScreen visible={tab === 0 && !isFullscreen}>
          <HomeScreen
            isActive={tab === 0 && isFocused && !isFullscreen && !guestModal.visible}
            isBackgrounded={tab !== 0 || !!pendingVideoUri} // CRITICAL: Free RAM completely when not on Home
            isAuthenticated={isAuth}
            videos={feed.videos}
            videosLoading={!feed.initialLoaded}
            fetchError={feed.fetchError}
            onUserPress={openProfile}
            onVideoSaved={feed.updateVideoSave}
            onVideoLiked={feed.updateVideoLike}
            onVideoCommented={feed.updateVideoComment}
            onVideoShared={feed.updateVideoShare}
            onUserFollowed={feed.updateUserFollow}
            onRefresh={feed.refresh}
            onEndReached={feed.loadMore}
            refreshKey={homeRefreshKey}
            onAuthRequired={action => setGuestModal({ visible: true, action })}
          />
        </LazyTabScreen>

        {/* Explore */}
        <LazyTabScreen visible={tab === 1 && !isFullscreen}>
          <InspirationScreen
            isActive={tab === 1 && isFocused && !isFullscreen && !guestModal.visible}
            videos={feed.videos}
            videosLoading={!feed.initialLoaded}
            refreshing={feed.loading}
            onRefresh={feed.refresh}
            onVideoSaved={feed.updateVideoSave}
            onVideoLiked={feed.updateVideoLike}
            onVideoCommented={feed.updateVideoComment}
            onUserPress={openProfile}
            isBackgrounded={tab !== 1 || !!pendingVideoUri}
          />
        </LazyTabScreen>

        {/* Notifications */}
        <LazyTabScreen visible={tab === 3 && !isFullscreen}>
          <NotificationsScreen
            isActive={tab === 3}
            onUserPress={openProfile}
            onLoginRequired={() => setGuestModal({ visible: true, action: 'general' })}
          />
        </LazyTabScreen>

        {/* Profile */}
        <LazyTabScreen visible={tab === 4 && !isFullscreen}>
          <MeScreen
            isActive={tab === 4}
            userProfile={profile}
            allVideos={feed.videos}
            onProfileUpdate={onProfileUpdate}
            onVideoDelete={onVideoDelete}
            onVideoSaved={feed.updateVideoSave}
            onVideoLiked={feed.updateVideoLike}
            onVideoCommented={feed.updateVideoComment}
            onUserPress={openProfile}
            isBackgrounded={tab !== 4 || !!pendingVideoUri}
          />
        </LazyTabScreen>

        {/* Create — fullscreen overlay (Modal KULLANMA: Android'de native Dialog + VisionCamera crash) */}
        {tab === 2 && (
          <View style={[styles.fullscreen, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }]}>
            <CreateScreen isActive={tab === 2} onClose={() => setTab(0)} onRecordingDone={onRecordingDone} />
          </View>
        )}

        {/* AddVideoDetailsScreen — CreateScreen unmount olduktan SONRA ayrı render */}
        {pendingVideoUri && (
          <View style={[styles.fullscreen, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: '#000' }]}>
            <AddVideoDetailsScreen
              videoUri={pendingVideoUri}
              onBack={onDetailsBack}
              onPublish={onDetailsPublish}
            />
          </View>
        )}

        {/* User Profile — fullscreen overlay */}
        <Modal visible={userProfileOpen} animationType="slide" transparent={true} onRequestClose={closeProfile}>
          <View style={styles.fullscreen}>
            <UserProfileScreen
              isActive={userProfileOpen}
              onBackPress={closeProfile}
              userId={selectedUserId || undefined}
              allVideos={feed.videos}
              onVideoSaved={feed.updateVideoSave}
              onVideoLiked={feed.updateVideoLike}
              onVideoCommented={feed.updateVideoComment}
              onUserFollowed={feed.updateUserFollow}
              onUserPress={openProfile}
              isBackgrounded={tab === 2}
            />
          </View>
        </Modal>
        </Suspense>
      </View>

      {/* Bottom tab bar */}
      {!isFullscreen && (
        <View style={[styles.navbar, { height: navbarHeight, paddingBottom: insets.bottom }]}>
          <TabBtn icon={tab === 0 ? 'home' : 'home-outline'} active={tab === 0} onPress={handleHomePress} />
          <TabBtn icon={tab === 1 ? 'compass' : 'compass-outline'} active={tab === 1} onPress={() => setTab(1)} />
          <TabBtn icon="add" active={false} isCreate onPress={() => requireAuthTab('create', () => setTab(2))} />
          <TabBtn icon={tab === 3 ? 'notifications' : 'notifications-outline'} active={tab === 3} onPress={() => requireAuthTab('general', () => setTab(3))} />
          <TabBtn
            icon={tab === 4 ? 'person' : 'person-outline'}
            active={tab === 4}
            avatar={profile?.avatarUri || null}
            onPress={() => requireAuthTab('general', () => setTab(4))}
          />
        </View>
      )}

      <GuestAuthModal visible={guestModal.visible} action={guestModal.action} onClose={onGuestModalClose} />

      {uploadProgress !== null && (
        <View style={styles.uploadBar}>
          <View style={styles.uploadBg}>
            <View style={[styles.uploadFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.uploadText}>
            {uploadProgress < 100 ? `Yükleniyor %${Math.round(uploadProgress)}` : '✓ Yayınlandı!'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  screen: { ...StyleSheet.absoluteFillObject },
  hidden: { opacity: 0, pointerEvents: 'none' },
  fullscreen: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  navbar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  tabIconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  tabAvatar: { width: 26, height: 26, borderRadius: 13 },
  tabAvatarActive: { borderWidth: 2, borderRadius: 15, borderColor: Colors.primary },
  createBtn: {
    width: 44, height: 30, borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: 'Poppins_700Bold' },
  uploadBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20, paddingVertical: 10, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 10,
  },
  uploadBg: { height: 4, borderRadius: 2, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
  uploadFill: { height: 4, borderRadius: 2, backgroundColor: Colors.primary },
  uploadText: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'Poppins_500Medium' },
});


