import FollowButton from '@/components/FollowButton';
import { CustomAlert as Alert } from '@/components/GlobalAlert';
import ProfilePhotoCarousel from '@/components/ProfilePhotoCarousel';
import ProfileTabGrid from '@/components/ProfileTabGrid';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import Colors from '@/constants/Colors';
import { getTalentById, getTalentByName } from '@/constants/Talents';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useVideoActions } from '@/hooks/useVideoActions';
import { useVideoPlayer as usePlayerModal } from '@/hooks/useVideoPlayer';
import { VideoItem } from '@/types/video';
import { formatNumber } from '@/utils/format';
import { isValidUUID } from '@/utils/validate';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS;


interface UserProfileScreenProps {
  isActive?: boolean;
  onBackPress?: () => void;
  userId?: string;
  allVideos?: VideoItem[];
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
  onUserFollowed?: (userId: string, isFollowing: boolean) => void;
  onUserPress?: (userId: string) => void;
  isBackgrounded?: boolean;
}

export default function UserProfileScreen({
  isActive = false,
  onBackPress,
  userId,
  allVideos = [],
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  onUserFollowed,
  onUserPress,
  isBackgrounded = false,
}: UserProfileScreenProps) {
  const { authState } = useAuth();
  const [showReportMenu, setShowReportMenu] = useState(false);
  // ── Video player modal — useVideoPlayer hook
  const player = usePlayerModal();

  // ─── useProfile hook — cache'li, tek noktadan veri ──────────────────────────
  const {
    profile: profileData,
    videos: userDbVideos,
    likedVideos: userLikedVideos,
    savedVideos: userSavedVideos,
    loading,
    isFollowing,
    setIsFollowing,
  } = useProfile(userId);

  // ─── useVideoActions hook — merkezi aksiyonlar ────────────────────
  const { follow, report } = useVideoActions({
    currentUserId: authState.user?.id,
    isAuthenticated: !!authState.user,
  });

  // Fade in animasyonu — ekran açılınca
  const screenOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!loading) {
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  // Kullanıcı bilgilerini türet
  const user = useMemo(() => ({
    id: profileData?.id || userId || '',
    username: profileData?.username || '...',
    fullName: profileData?.full_name || '',
    bio: profileData?.bio || '',
    avatars: (
      Array.isArray(profileData?.avatars) && profileData.avatars.length > 0
        ? profileData.avatars
        : profileData?.avatar_url
          ? [profileData.avatar_url]
          : ['https://ui-avatars.com/api/?name=User&background=random']
    ),
    skills: Array.isArray(profileData?.talents) ? profileData.talents : [],
    following: profileData?.following_count ?? 0,
    followers: profileData?.followers_count ?? 0,
    videos: profileData?.videos_count ?? 0,
    user_type: profileData?.user_type || 'individual',
  }), [profileData, userId]);

  // Videolar — önce DB'den gelen, fallback olarak parent feed
  const displayVideos = useMemo(() => {
    if (userDbVideos.length > 0) return userDbVideos as VideoItem[];
    return allVideos.filter(v => v.user.id === user.id);
  }, [userDbVideos, allVideos, user.id]);

  // Şikayet
  const handleReport = async (reason: string) => {
    if (!authState.user) {
      Alert.alert('Hata', 'Rapor bildirmek için giriş yapmalısınız.');
      return;
    }
    const cleanTargetId = userId && isValidUUID(userId) ? userId : null;
    if (!cleanTargetId) {
      Alert.alert('Bilgi', 'Bu örnek kullanıcı şu an raporlanamaz.');
      return;
    }
    try {
      await report(cleanTargetId, 'account', reason);
      Alert.alert('Bildirildi', 'Şikayetiniz incelenmek üzere ekibimize iletildi.');
    } catch {
      Alert.alert('Hata', 'Rapor gönderilemedi.');
    }
  };

  const onReportPress = () => {
    setShowReportMenu(false);
    const reasons = ['Spam', 'Uygunsuz İçerik', 'Nefret Söylemi', 'Sahte Hesap', 'Diğer'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Vazgeç', ...reasons],
          cancelButtonIndex: 0,
          destructiveButtonIndex: reasons.indexOf('Uygunsuz İçerik') + 1,
          title: 'Şikayet Et',
          message: 'Bu hesabı neden şikayet ediyorsunuz?'
        },
        (buttonIndex) => { if (buttonIndex > 0) handleReport(reasons[buttonIndex - 1]); }
      );
    } else {
      Alert.alert(
        'Şikayet Et',
        'Bu hesabı neden şikayet ediyorsunuz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          ...reasons.map(r => ({ text: r, onPress: () => handleReport(r) })),
        ]
      );
    }
  };

  // ─── handleFollowOrRadar — hem bireysel Takip Et hem kurumsal Radara Al
  // ÖNEMLİ: Radar = Takip, aynı follows tablosu, sadece UI labelı farklı
  const handleFollowOrRadar = useCallback(async () => {
    if (!authState.user || !userId) return;
    if (!isValidUUID(userId)) {
      Alert.alert('Bilgi', 'Bu kullanıcıya bu işlem uygulanamaz.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newState = !isFollowing;
    setIsFollowing(newState);
    onUserFollowed?.(userId, newState);

    try {
      // follows tablosuna yaz - corporate veya individual fark etmez
      await follow(userId, newState);
    } catch {
      setIsFollowing(!newState); // rollback
    }
  }, [authState.user, userId, isFollowing, follow, setIsFollowing, onUserFollowed]);

  const openVideoPlayer = useCallback((videos: VideoItem[], startIndex: number) => {
    player.open(videos, startIndex);
  }, [player]);

  // ─── Loading state: skeleton göster ─────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerButton} onPress={onBackPress}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <SkeletonLoader width={120} height={16} borderRadius={8} />
          </View>
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <SkeletonLoader.ProfileHeader />
          <View style={{ padding: 20, gap: 4 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: 3 }).map((_, j) => (
                  <SkeletonLoader.GridTile key={j} size={GRID_ITEM_WIDTH} />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerUsername}>@{user.username}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowReportMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={isActive}>
        <View style={styles.profileSection}>

          {/* 3'lü profil fotoğraf carousel — basılı tutunca büyür */}
          <ProfilePhotoCarousel
            avatars={user.avatars}
            size={90}
            isEditable={false}
          />

          {/* İsim + Bio — carousel'in altına ortalı */}
          <Text style={styles.fullName}>{user.fullName}</Text>
          <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>

          {user.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              {user.skills.map((skill: string, index: number) => {
                const talent = getTalentById(skill) || getTalentByName(skill);
                const label = talent ? talent.name : skill;
                return (
                  <Text key={index} style={styles.skillText}>#{label.toLowerCase()}</Text>
                );
              })}
            </View>
          )}

          <View style={styles.stats}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followers}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.following}</Text>
              <Text style={styles.statLabel}>Takip</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(displayVideos.length)}</Text>
              <Text style={styles.statLabel}>Video</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            {authState.user?.id !== userId && (
              <>
                <FollowButton
                  userId={userId || ''}
                  initialFollowing={isFollowing}
                  onChanged={setIsFollowing}
                  fullWidth
                />

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    Share.share({
                      title: `@${user.username} - motionApp`,
                      message: `motionApp'te @${user.username} profilini incele!`,
                    }).catch(() => { });
                  }}
                >
                  <Ionicons name="share-social-outline" size={15} color={Colors.text} />
                  <Text style={styles.actionButtonText}>Paylaş</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ✅ ProfileTabGrid — replaces ~90 lines of duplicate tab+FlatList code */}
        <ProfileTabGrid
          videos={displayVideos}
          likedVideos={userLikedVideos as VideoItem[]}
          savedVideos={userSavedVideos as VideoItem[]}
          loading={loading}
          hideLikes={userId !== authState.user?.id && profileData?.hide_likes}
          hideSaves={userId !== authState.user?.id && profileData?.hide_saves}
          onVideoPress={(list, idx) => player.open(list, idx)}
        />
      </ScrollView>

      {/* Shared Video Player Modal */}
      <VideoPlayerModal
        visible={player.visible}
        videos={player.videos}
        startIndex={player.startIndex}
        onClose={player.close}
        mode="profile"
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
        onUserPress={onUserPress}
        isBackgrounded={isBackgrounded}
      />

      {/* Şikayet Menüsü */}
      <Modal visible={showReportMenu} transparent animationType="fade" onRequestClose={() => setShowReportMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReportMenu(false)}>
          <View style={styles.reportMenu}>
            <TouchableOpacity style={styles.reportItem} onPress={onReportPress}>
              <Ionicons name="flag-outline" size={20} color={Colors.error} />
              <Text style={styles.reportText}>Bildir</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 50, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerButton: { padding: 4 },
  headerUsername: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.text },
  scrollView: { flex: 1 },
  profileSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, alignItems: 'center' },

  fullName: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, textAlign: 'center', marginBottom: 2 },
  bio: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.textMuted, lineHeight: 18, textAlign: 'center', marginBottom: 8, paddingHorizontal: 8 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, justifyContent: 'center' },
  skillText: { color: Colors.primary, fontSize: 12, fontFamily: 'Poppins_500Medium' },
  stats: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-evenly', marginBottom: 12, width: '100%',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontFamily: 'Poppins_500Medium' },
  statDivider: { width: 1, height: 24, backgroundColor: Colors.border },
  actionButtons: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 4 },
  actionButton: {
    flex: 1, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 5,
    borderWidth: 1, borderColor: Colors.border,
    minHeight: 34,
  },
  actionButtonText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.text },
  followButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  followButtonInactive: { borderColor: Colors.primary, backgroundColor: 'transparent' },
  followButtonTextActive: { color: '#fff' },
  primaryActionButton: {
    flex: 1.2,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 34,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    marginTop: 12, position: 'relative',
    backgroundColor: Colors.surface,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  tabIndicator: {
    position: 'absolute', bottom: -1, width: 40, height: 2,
    backgroundColor: Colors.primary, borderRadius: 1,
  },
  gridContainer: { flexDirection: 'row', width: SCREEN_WIDTH * 3 },
  gridPage: { width: SCREEN_WIDTH },
  gridContent: { paddingBottom: 24 },
  videoItem: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH * 1.3, backgroundColor: Colors.surfaceAlt },
  videoThumbnail: { width: '100%', height: '100%' },
  viewsOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Poppins_400Regular', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  reportMenu: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingVertical: 20, paddingBottom: 40,
    borderWidth: 1, borderColor: Colors.border,
  },
  reportItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  reportText: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: Colors.error },
});
