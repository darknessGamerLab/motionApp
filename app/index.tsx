import GuestAuthModal from '@/components/GuestAuthModal';
import Colors from '@/constants/Colors';
import { getTalentById } from '@/constants/Talents';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CreateScreen from './CreateScreen';
import HomeScreen from './HomeScreen';
import InspirationScreen from './InspirationScreen';
import MeScreen from './MeScreen';
import NotificationsScreen from './NotificationsScreen';
import UserProfileScreen from './UserProfileScreen';

const ACCENT = Colors.primary;
const NAV_H = 52; // Navbar içeriği

// ─── Tab Button ────────────────────────────────────────────────────
const TabBtn = memo(({ icon, active, onPress, isCreate, badge }: {
  icon: string;
  active: boolean;
  onPress: () => void;
  isCreate?: boolean;
  badge?: number;
}) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress} activeOpacity={0.7}>
    {isCreate ? (
      <View style={styles.createBtn}>
        <Ionicons name="add" size={20} color="#fff" />
      </View>
    ) : (
      <View style={styles.tabIconWrap}>
        <Ionicons
          name={icon as any}
          size={24}
          color={active ? ACCENT : Colors.textMuted}
        />
        {!!badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
    )}
  </TouchableOpacity>
));

// ─── Tab Screen ─────────────────────────────────────────────────────
const TabScreen = memo(({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
  <View style={[styles.screen, !visible && styles.hidden]}>
    {children}
  </View>
));

// ─── Video data ─────────────────────────────────────────────────────
const INITIAL_VIDEOS = [
  { id: '1', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u1', username: 'ahmetyilmaz', avatar: 'https://i.pravatar.cc/100?img=1' }, description: 'Son maçtan kareler! ⚽🔥', topic: '#futbol', likes: 12500, comments: 234, shares: 89, isLiked: false, isSaved: false },
  { id: '2', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u2', username: 'ayseozturk', avatar: 'https://i.pravatar.cc/100?img=5' }, description: 'Yeni şarkım çıktı! 🎵🎤', topic: '#müzik', likes: 34200, comments: 567, shares: 234, isLiked: true, isSaved: false },
  { id: '3', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u3', username: 'mehmetkaya', avatar: 'https://i.pravatar.cc/100?img=12' }, description: 'Bugünün antrenmanı 💪', topic: '#fitness', likes: 8900, comments: 145, shares: 67, isLiked: false, isSaved: true },
  { id: '4', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u4', username: 'zeynepdemir', avatar: 'https://i.pravatar.cc/100?img=9' }, description: 'İstanbul\'dan manzaralar 🏙️', topic: '#seyahat', likes: 15600, comments: 312, shares: 123, isLiked: false, isSaved: false },
  { id: '5', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u5', username: 'emrecetin', avatar: 'https://i.pravatar.cc/100?img=15' }, description: 'Komik anlar 😂', topic: '#komedi', likes: 27800, comments: 890, shares: 456, isLiked: true, isSaved: false },
  { id: '6', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u6', username: 'elifaksoy', avatar: 'https://i.pravatar.cc/100?img=20' }, description: 'Yeni koleksiyonumuz ✨', topic: '#moda', likes: 18900, comments: 423, shares: 189, isLiked: false, isSaved: true },
  { id: '7', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u7', username: 'canarslan', avatar: 'https://i.pravatar.cc/100?img=25' }, description: 'Son teknoloji ürünleri 🚀', topic: '#teknoloji', likes: 11200, comments: 278, shares: 98, isLiked: false, isSaved: false },
  { id: '8', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u8', username: 'sedaaslan', avatar: 'https://i.pravatar.cc/100?img=30' }, description: 'Yeni tarifim 🍰', topic: '#yemek', likes: 23400, comments: 567, shares: 234, isLiked: true, isSaved: false },
  { id: '9', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u9', username: 'burakyildiz', avatar: 'https://i.pravatar.cc/100?img=35' }, description: 'Dans performansı 💃', topic: '#dans', likes: 16700, comments: 389, shares: 156, isLiked: false, isSaved: true },
  { id: '10', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u10', username: 'denizyilmaz', avatar: 'https://i.pravatar.cc/100?img=40' }, description: 'Çizim sürecim 🎨', topic: '#sanat', likes: 9800, comments: 198, shares: 78, isLiked: false, isSaved: false },
];

// ─── Main Layout ─────────────────────────────────────────────────────
export default function MainLayout() {
  const { authState } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(0);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [videos, setVideos] = useState(INITIAL_VIDEOS);
  const [guestModal, setGuestModal] = useState<{
    visible: boolean;
    action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general';
  }>({ visible: false, action: 'general' });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // null = hidden

  const isAuth = authState.isAuthenticated;

  // Navbar yüksekliği = içerik + bottom safe area
  const navbarHeight = NAV_H + insets.bottom;

  // StatusBar her render'da doğru renkte kalsın
  if (Platform.OS === 'android') {
    StatusBar.setBackgroundColor(Colors.surface);
    StatusBar.setBarStyle('dark-content');
  }

  const requireAuthTab = useCallback((
    action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general',
    onAuth: () => void
  ) => {
    if (!isAuth) { setGuestModal({ visible: true, action }); return; }
    onAuth();
  }, [isAuth]);

  const handleHomePress = useCallback(() => {
    if (tab === 0 && !userProfileOpen) {
      setVideos(prev => [...prev].sort(() => Math.random() - 0.5));
      setHomeRefreshKey(k => k + 1);
    } else {
      setTab(0);
    }
  }, [tab, userProfileOpen]);

  const initialProfile = useMemo(() => {
    const talentIds = authState.userData?.talents || [];
    const skills = talentIds.map((id: string) => getTalentById(id)?.name || '').filter(Boolean);
    return {
      id: 'current',
      username: authState.userData?.username || 'kullanici',
      fullName: authState.userData?.fullName || 'Kullanıcı',
      bio: 'Merhaba! 👋',
      avatarUri: 'https://i.pravatar.cc/300?img=1',
      avatars: ['https://i.pravatar.cc/300?img=1', 'https://i.pravatar.cc/300?img=11'],
      skills: skills.length > 0 ? skills : [],
      talents: talentIds,
      following: 0, followers: 0, videos: 0,
    };
  }, [authState.userData]);

  const [profile, setProfile] = useState(initialProfile);

  const openProfile = useCallback((userId: string) => { setSelectedUserId(userId); setUserProfileOpen(true); }, []);
  const closeProfile = useCallback(() => { setUserProfileOpen(false); setSelectedUserId(null); }, []);

  const onVideoPublished = useCallback((videoUri: string, description?: string, topic?: string) => {
    // Simulate an upload animation
    setUploadProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setVideos(prev => [{
          id: `vid-${Date.now()}`, uri: videoUri,
          user: { id: 'current', username: profile.username, avatar: profile.avatarUri },
          description: description || '🎬', topic: topic ?? '',
          likes: 0, comments: 0, shares: 0, isLiked: false, isSaved: false,
        }, ...prev]);
        setProfile(prev => ({ ...prev, videos: prev.videos + 1 }));
        setHomeRefreshKey(k => k + 1); // scroll to top (kendi videosu)
        setTab(0);
        setTimeout(() => setUploadProgress(null), 800);
      }
      setUploadProgress(Math.min(p, 100));
    }, 200);
  }, [profile.username, profile.avatarUri]);

  const onVideoDelete = useCallback((videoId: string) => {
    setVideos(prev => {
      const del = prev.find(v => v.id === videoId);
      if (del && (del.user.id === 'current' || del.user.username === profile.username))
        setProfile(p => ({ ...p, videos: Math.max(0, p.videos - 1) }));
      return prev.filter(v => v.id !== videoId);
    });
  }, [profile.username]);

  const onVideoSaved = useCallback((id: string, isSaved: boolean) =>
    setVideos(prev => prev.map(v => v.id === id ? { ...v, isSaved } : v)), []);

  const onVideoLiked = useCallback((id: string, isLiked: boolean, likes: number) =>
    setVideos(prev => prev.map(v => v.id === id ? { ...v, isLiked, likes } : v)), []);

  const onVideoCommented = useCallback((id: string, comments: number) =>
    setVideos(prev => prev.map(v => v.id === id ? { ...v, comments } : v)), []);

  const onProfileUpdate = useCallback((data: any) =>
    setProfile(prev => ({ ...prev, ...data })), []);

  const isFullscreen = tab === 2 || userProfileOpen;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Content area — fills everything above navbar */}
      <View style={styles.content}>
        <TabScreen visible={tab === 0 && !isFullscreen}>
          <HomeScreen
            isActive={tab === 0 && !isFullscreen}
            isAuthenticated={isAuth}
            videos={videos}
            onUserPress={openProfile}
            onVideoSaved={onVideoSaved}
            onVideoLiked={onVideoLiked}
            onVideoCommented={onVideoCommented}
            onRefresh={() => setVideos(prev => [...prev].sort(() => Math.random() - 0.5))}
            refreshKey={homeRefreshKey}
          />
        </TabScreen>

        <TabScreen visible={tab === 1 && !isFullscreen}>
          <InspirationScreen
            isActive={tab === 1}
            videos={videos}
            onVideoSaved={onVideoSaved}
            onVideoLiked={onVideoLiked}
            onVideoCommented={onVideoCommented}
          />
        </TabScreen>

        <TabScreen visible={tab === 3 && !isFullscreen}>
          <NotificationsScreen isActive={tab === 3} onUserPress={openProfile} />
        </TabScreen>

        <TabScreen visible={tab === 4 && !isFullscreen}>
          <MeScreen
            isActive={tab === 4}
            userProfile={{ ...profile, videos: videos.filter(v => v.user.id === 'current' || v.user.username === profile.username).length }}
            allVideos={videos}
            onProfileUpdate={onProfileUpdate}
            onVideoDelete={onVideoDelete}
            onVideoSaved={onVideoSaved}
            onVideoLiked={onVideoLiked}
            onVideoCommented={onVideoCommented}
          />
        </TabScreen>

        {tab === 2 && (
          <View style={styles.fullscreen}>
            <CreateScreen isActive onClose={() => setTab(0)} onVideoPublished={onVideoPublished} />
          </View>
        )}

        {userProfileOpen && (
          <View style={styles.fullscreen}>
            <UserProfileScreen
              isActive
              onBackPress={closeProfile}
              userId={selectedUserId || undefined}
              allVideos={videos}
              onVideoSaved={onVideoSaved}
              onVideoLiked={onVideoLiked}
              onVideoCommented={onVideoCommented}
            />
          </View>
        )}
      </View>

      {/* Bottom Navbar — safe area'yı içerir */}
      {!isFullscreen && (
        <View style={[styles.navbar, { height: navbarHeight, paddingBottom: insets.bottom }]}>
          <TabBtn icon={tab === 0 ? 'home' : 'home-outline'} active={tab === 0} onPress={handleHomePress} />
          <TabBtn icon={tab === 1 ? 'compass' : 'compass-outline'} active={tab === 1} onPress={() => setTab(1)} />
          <TabBtn icon="add" active={false} isCreate onPress={() => requireAuthTab('create', () => setTab(2))} />
          <TabBtn icon={tab === 3 ? 'notifications' : 'notifications-outline'} active={tab === 3} onPress={() => requireAuthTab('general', () => setTab(3))} />
          <TabBtn icon={tab === 4 ? 'person' : 'person-outline'} active={tab === 4} onPress={() => requireAuthTab('general', () => setTab(4))} />
        </View>
      )}

      <GuestAuthModal
        visible={guestModal.visible}
        action={guestModal.action}
        onClose={() => setGuestModal(p => ({ ...p, visible: false }))}
      />

      {/* Upload Progress Bar */}
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
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
  hidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    // Elevation (Android)
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    width: 44,
    height: 30,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // Upload Progress
  uploadBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 999,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  uploadBg: {
    height: 4, borderRadius: 2,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  uploadFill: {
    height: 4, borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  uploadText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
