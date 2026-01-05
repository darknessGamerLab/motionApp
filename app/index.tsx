import { useAuth } from '@/contexts/AuthContext';
import { TALENTS, getTalentById } from '@/constants/Talents';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import CreateScreen from './CreateScreen';
import HomeScreen from './HomeScreen';
import InspirationScreen from './InspirationScreen';
import MeScreen from './MeScreen';
import NotificationsScreen from './NotificationsScreen';
import UserProfileScreen from './UserProfileScreen';

const BG = '#000';
const NAVBAR_BG = '#0A0505';
const NAVBAR_H = 50;
const ACCENT = '#FF2D55';

// Android nav bar - bir kere çalıştır
if (Platform.OS === 'android') {
  NavigationBar.setBackgroundColorAsync(NAVBAR_BG).catch(() => {});
  NavigationBar.setButtonStyleAsync('light').catch(() => {});
}

// Tab Button - memoized
const TabBtn = memo(({ icon, active, onPress, isCreate }: {
  icon: string;
  active: boolean;
  onPress: () => void;
  isCreate?: boolean;
}) => (
  <TouchableOpacity style={styles.tabBtn} onPress={onPress} activeOpacity={0.7}>
    {isCreate ? (
      <View style={styles.createBtn}>
        <Ionicons name="add" size={22} color="#fff" />
      </View>
    ) : (
      <Ionicons name={icon as any} size={24} color={active ? '#fff' : '#777'} />
    )}
  </TouchableOpacity>
));

// Tab Screen Wrapper - keeps mounted, toggles visibility
const TabScreen = memo(({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
  <View style={[styles.screen, !visible && styles.hidden]}>
    {children}
  </View>
));

export default function MainLayout() {
  const { authState } = useAuth();
  const [tab, setTab] = useState(0);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // User profile - state ile yönet
  const initialProfile = useMemo(() => {
    const talentIds = authState.userData?.talents || [];
    const skills = talentIds.map((id: string) => {
      const talent = getTalentById(id);
      return talent?.name || '';
    }).filter(Boolean);
    
    return {
      id: 'current',
      username: authState.userData?.username || 'kullanici',
      fullName: authState.userData?.fullName || 'Kullanıcı',
      bio: 'Merhaba! 👋',
      avatarUri: 'https://i.pravatar.cc/300?img=1',
      avatars: [
        'https://i.pravatar.cc/300?img=1',
        'https://i.pravatar.cc/300?img=11',
        'https://i.pravatar.cc/300?img=12',
      ],
      skills: skills.length > 0 ? skills : [],
      talents: talentIds,
      following: 0,
      followers: 0,
      videos: 0,
    };
  }, [authState.userData]);

  const [profile, setProfile] = useState(initialProfile);

  // Videos - static data (stok videolar + gerçek kullanıcılar)
  const [videos, setVideos] = useState([
    {
      id: '1',
      uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4',
      user: { id: 'u1', username: 'ahmetyilmaz', avatar: 'https://i.pravatar.cc/100?img=1' },
      description: 'Son maçtan kareler! ⚽🔥',
      topic: '#futbol',
      likes: 12500, comments: 234, shares: 89,
      isLiked: false, isSaved: false,
    },
    {
      id: '2',
      uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4',
      user: { id: 'u2', username: 'ayseozturk', avatar: 'https://i.pravatar.cc/100?img=5' },
      description: 'Yeni şarkım çıktı! 🎵🎤',
      topic: '#müzik',
      likes: 34200, comments: 567, shares: 234,
      isLiked: true, isSaved: false,
    },
    {
      id: '3',
      uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4',
      user: { id: 'u3', username: 'mehmetkaya', avatar: 'https://i.pravatar.cc/100?img=12' },
      description: 'Bugünün antrenmanı 💪',
      topic: '#fitness',
      likes: 8900, comments: 145, shares: 67,
      isLiked: false, isSaved: true,
    },
    {
      id: '4',
      uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4',
      user: { id: 'u4', username: 'zeynepdemir', avatar: 'https://i.pravatar.cc/100?img=9' },
      description: 'İstanbul\'dan manzaralar 🏙️',
      topic: '#seyahat',
      likes: 15600, comments: 312, shares: 123,
      isLiked: false, isSaved: false,
    },
    {
      id: '5',
      uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4',
      user: { id: 'u5', username: 'emrecetin', avatar: 'https://i.pravatar.cc/100?img=15' },
      description: 'Komik anlar 😂',
      topic: '#komedi',
      likes: 27800, comments: 890, shares: 456,
      isLiked: true, isSaved: false,
    },
    {
      id: '6',
      uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4',
      user: { id: 'u6', username: 'elifaksoy', avatar: 'https://i.pravatar.cc/100?img=20' },
      description: 'Yeni koleksiyonumuz ✨',
      topic: '#moda',
      likes: 18900, comments: 423, shares: 189,
      isLiked: false, isSaved: true,
    },
    {
      id: '7',
      uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4',
      user: { id: 'u7', username: 'canarslan', avatar: 'https://i.pravatar.cc/100?img=25' },
      description: 'Son teknoloji ürünleri 🚀',
      topic: '#teknoloji',
      likes: 11200, comments: 278, shares: 98,
      isLiked: false, isSaved: false,
    },
    {
      id: '8',
      uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4',
      user: { id: 'u8', username: 'sedaaslan', avatar: 'https://i.pravatar.cc/100?img=30' },
      description: 'Yeni tarifim 🍰',
      topic: '#yemek',
      likes: 23400, comments: 567, shares: 234,
      isLiked: true, isSaved: false,
    },
    {
      id: '9',
      uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4',
      user: { id: 'u9', username: 'burakyildiz', avatar: 'https://i.pravatar.cc/100?img=35' },
      description: 'Dans performansı 💃',
      topic: '#dans',
      likes: 16700, comments: 389, shares: 156,
      isLiked: false, isSaved: true,
    },
    {
      id: '10',
      uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4',
      user: { id: 'u10', username: 'denizyilmaz', avatar: 'https://i.pravatar.cc/100?img=40' },
      description: 'Çizim sürecim 🎨',
      topic: '#sanat',
      likes: 9800, comments: 198, shares: 78,
      isLiked: false, isSaved: false,
    },
  ]);

  // Handlers
  const openProfile = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setUserProfileOpen(true);
  }, []);

  const closeProfile = useCallback(() => {
    setUserProfileOpen(false);
    setSelectedUserId(null);
  }, []);

  const onVideoPublished = useCallback((videoUri: string, description?: string, topic?: string) => {
    const newVideo = {
      id: `vid-${Date.now()}`,
      uri: videoUri,
      user: { id: 'current', username: profile.username, avatar: profile.avatarUri },
      description: description || 'Check this out! 🎬',
      topic: topic,
      likes: 0, comments: 0, shares: 0,
      isLiked: false, isSaved: false,
    };
    setVideos(prev => [newVideo, ...prev]);
    // Video sayısını artır
    setProfile(prev => ({ ...prev, videos: prev.videos + 1 }));
    setTab(0);
  }, [profile.username, profile.avatarUri]);

  const onVideoDelete = useCallback((videoId: string) => {
    setVideos(prev => {
      const deleted = prev.find(v => v.id === videoId);
      if (deleted && (deleted.user.id === 'current' || deleted.user.username === profile.username)) {
        setProfile(prev => ({ ...prev, videos: Math.max(0, prev.videos - 1) }));
      }
      return prev.filter(v => v.id !== videoId);
    });
  }, [profile.username]);

  const onVideoSaved = useCallback((videoId: string, isSaved: boolean) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isSaved } : v));
  }, []);

  const onVideoLiked = useCallback((videoId: string, isLiked: boolean, newLikeCount: number) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isLiked, likes: newLikeCount } : v));
  }, []);

  const onVideoCommented = useCallback((videoId: string, newCommentCount: number) => {
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, comments: newCommentCount } : v));
  }, []);

  const onProfileUpdate = useCallback((updatedProfile: any) => {
    setProfile(prev => ({
      ...prev,
      ...updatedProfile,
    }));
  }, []);

  const isFullscreen = tab === 2 || userProfileOpen;

  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor={NAVBAR_BG} translucent={false} />
      
      {/* All tabs stay mounted - just hidden */}
      <View style={styles.content}>
        {/* Home */}
        <TabScreen visible={tab === 0 && !isFullscreen}>
          <HomeScreen 
            isActive={tab === 0 && !isFullscreen} 
            videos={videos} 
            onUserPress={openProfile}
            onVideoSaved={onVideoSaved}
            onVideoLiked={onVideoLiked}
            onVideoCommented={onVideoCommented}
          />
        </TabScreen>

        {/* Explore */}
        <TabScreen visible={tab === 1 && !isFullscreen}>
          <InspirationScreen 
            isActive={tab === 1} 
            videos={videos}
            onVideoSaved={onVideoSaved}
            onVideoLiked={onVideoLiked}
            onVideoCommented={onVideoCommented}
          />
        </TabScreen>

        {/* Notifications */}
        <TabScreen visible={tab === 3 && !isFullscreen}>
          <NotificationsScreen isActive={tab === 3} onUserPress={openProfile} />
        </TabScreen>

        {/* Profile */}
        <TabScreen visible={tab === 4 && !isFullscreen}>
          <MeScreen 
            isActive={tab === 4} 
            userProfile={{
              ...profile,
              videos: videos.filter(v => v.user.id === 'current' || v.user.username === profile.username).length,
            }}
            allVideos={videos}
            onProfileUpdate={onProfileUpdate} 
            onVideoDelete={onVideoDelete}
            onVideoSaved={onVideoSaved}
            onVideoLiked={onVideoLiked}
            onVideoCommented={onVideoCommented}
          />
        </TabScreen>

        {/* Create - fullscreen overlay */}
        {tab === 2 && (
          <View style={styles.fullscreen}>
            <CreateScreen isActive onClose={() => setTab(0)} onVideoPublished={onVideoPublished} />
          </View>
        )}

        {/* User Profile - fullscreen overlay */}
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

      {/* Navbar */}
      {!isFullscreen && (
        <View style={styles.navbar}>
          <TabBtn icon={tab === 0 ? 'home' : 'home-outline'} active={tab === 0} onPress={() => setTab(0)} />
          <TabBtn icon={tab === 1 ? 'search' : 'search-outline'} active={tab === 1} onPress={() => setTab(1)} />
          <TabBtn icon="add" active={false} isCreate onPress={() => setTab(2)} />
          <TabBtn icon={tab === 3 ? 'heart' : 'heart-outline'} active={tab === 3} onPress={() => setTab(3)} />
          <TabBtn icon={tab === 4 ? 'person' : 'person-outline'} active={tab === 4} onPress={() => setTab(4)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
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
    height: NAVBAR_H,
    flexDirection: 'row',
    backgroundColor: NAVBAR_BG,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    width: 32,
    height: 26,
    borderRadius: 6,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
