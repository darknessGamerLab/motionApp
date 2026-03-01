import CommentsModal from '@/components/CommentsModal';
import ProfilePhotoCarousel from '@/components/ProfilePhotoCarousel';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { VideoCard } from './HomeScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

interface VideoItem {
  id: string;
  uri: string;
  user: { id: string; username: string; avatar?: string };
  description: string;
  topic?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
}

interface UserProfileScreenProps {
  isActive?: boolean;
  onBackPress?: () => void;
  userId?: string;
  allVideos?: VideoItem[];
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
}

export default function UserProfileScreen({
  isActive = false,
  onBackPress,
  userId,
  allVideos = [],
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
}: UserProfileScreenProps) {
  const { authState } = useAuth();
  const [activeTab, setActiveTab] = useState<'videos' | 'private'>('videos');
  const [activeProfileIndex, setActiveProfileIndex] = useState(1);
  const [hasRadar, setHasRadar] = useState(false);
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const contentPosition = useRef(new Animated.Value(0)).current;

  // Real data fetching if userId is UUID
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId || userId.length < 30) return; // Skip mock IDs
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setProfileData(data);

      if (authState.user && authState.profile?.user_type === 'corporate') {
        const { data: r } = await supabase.from('radars').select('*').eq('corporate_id', authState.user.id).eq('individual_id', userId).single();
        setHasRadar(!!r);
      }
    };
    fetchProfile();
  }, [userId, authState.user, authState.profile]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(tabIndicatorPosition, {
        toValue: activeTab === 'videos' ? 0 : 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(contentPosition, {
        toValue: activeTab === 'videos' ? 0 : -SCREEN_WIDTH,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [activeTab]);

  const user = useMemo(() => ({
    id: userId || 'u2',
    username: 'ayseozturk',
    fullName: 'Ayşe Öztürk',
    bio: 'Müzik tutkunu 🎵 Şarkıcı 🎤',
    avatars: [
      'https://i.pravatar.cc/300?img=5',
      'https://i.pravatar.cc/300?img=15',
      'https://i.pravatar.cc/300?img=25',
    ],
    skills: ['Müzik', 'Dans', 'Sanat'],
    following: 520,
    followers: 2840,
  }), [userId]);

  const userVideos = useMemo(() => {
    return allVideos.filter(v => v.user.id === user.id || v.user.username === user.username);
  }, [allVideos, user.id, user.username]);

  const handleReport = async (reason: string) => {
    if (!authState.user) {
      Alert.alert('Hata', 'Rapor bildirmek için giriş yapmalısınız.');
      return;
    }

    // UUID format check to prevent "invalid input syntax for type uuid"
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cleanTargetId = userId && uuidRegex.test(userId) ? userId : null;

    if (!cleanTargetId) {
      // If it's a mock ID (like 'u2'), we can't report it to the real DB
      Alert.alert('Bilgi', 'Bu örnek kullanıcı şu an raporlanamaz.');
      return;
    }

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: authState.user.id,
        target_type: 'account' as 'account',
        target_id: cleanTargetId,
        reason: reason,
        status: 'pending' as 'pending'
      });

      if (error) throw error;
      Alert.alert('Bildirildi', 'Şikayetiniz incelenmek üzere ekibimize iletildi.');
    } catch (err) {
      console.error('Report error:', err);
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
        (buttonIndex) => {
          if (buttonIndex > 0) handleReport(reasons[buttonIndex - 1]);
        }
      );
    } else {
      Alert.alert(
        'Şikayet Et',
        'Bu hesabı neden şikayet ediyorsunuz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          ...reasons.map(r => ({ text: r, onPress: () => handleReport(r) }))
        ]
      );
    }
  };

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFollowing(!isFollowing);
  };

  const toggleRadar = async () => {
    if (!authState.user || authState.profile?.user_type !== 'corporate') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (hasRadar) {
        await supabase.from('radars').delete().eq('corporate_id', authState.user.id).eq('individual_id', userId);
        setHasRadar(false);
      } else {
        await supabase.from('radars').insert({ corporate_id: authState.user.id, individual_id: userId });
        setHasRadar(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openVideoPlayer = useCallback((videos: VideoItem[], startIndex: number) => {
    setVideoPlayerVideos(videos);
    setVideoPlayerStartIndex(startIndex);
    setVideoPlayerVisible(true);
  }, []);

  const renderVideoItem = useCallback((totalLength: number) => ({ item, index }: { item: VideoItem; index: number }) => {
    const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
    const rowNumber = Math.floor(index / GRID_COLUMNS);
    const totalRows = Math.ceil(totalLength / GRID_COLUMNS);
    const isLastRow = rowNumber === totalRows - 1;

    return (
      <TouchableOpacity
        style={[styles.videoItem, { marginRight: isLastInRow ? 0 : GRID_GAP, marginBottom: isLastRow ? 0 : GRID_GAP }]}
        activeOpacity={0.8}
        onPress={() => openVideoPlayer(userVideos, index)}
      >
        <Video
          source={{ uri: item.uri }}
          style={styles.videoThumbnail}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isMuted
          pointerEvents="none"
        />
        <View style={styles.viewsOverlay}>
          <Ionicons name="play" size={10} color="#fff" />
          <Text style={styles.viewsText}>{formatNumber(item.likes)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [userVideos, openVideoPlayer]);

  return (
    <View style={styles.container}>
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
          {/* Avatar stack */}
          {/* 3 Photos Carousel */}
          <ProfilePhotoCarousel
            avatars={user.avatars}
            size={90}
            isEditable={false} // Başkasının profili düzenlenmez
          />

          <Text style={styles.fullName}>{user.fullName}</Text>
          <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>

          <View style={styles.skillsContainer}>
            {user.skills.map((skill, index) => (
              <Text key={index} style={styles.skillText}>#{skill.toLowerCase()}</Text>
            ))}
          </View>

          <View style={styles.stats}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.following}</Text>
              <Text style={styles.statLabel}>Takip Edilen</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followers}</Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatNumber(userVideos.length)}</Text>
              <Text style={styles.statLabel}>Video</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, isFollowing && styles.followButtonActive]}
              onPress={handleFollow}
            >
              <Text style={[styles.actionButtonText, isFollowing && styles.followButtonTextActive]}>
                {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
              </Text>
            </TouchableOpacity>

            {authState.profile?.user_type === 'corporate' && (
              <TouchableOpacity
                style={[styles.radarButton, hasRadar && styles.radarButtonActive]}
                onPress={toggleRadar}
              >
                <Ionicons name="radio" size={18} color={hasRadar ? '#fff' : Colors.primary} />
                <Text style={[styles.radarButtonText, hasRadar && styles.radarButtonTextActive]}>
                  {hasRadar ? 'Radarda' : 'Radara Al'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Paylaş</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('videos')}>
            <Ionicons name="videocam" size={22} color={activeTab === 'videos' ? Colors.primary : Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('private')}>
            <Ionicons name="lock-closed" size={20} color={activeTab === 'private' ? Colors.primary : Colors.textMuted} />
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [{
                  translateX: tabIndicatorPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SCREEN_WIDTH * 0.25 - 20, SCREEN_WIDTH * 0.75 - 20],
                  }),
                }],
              },
            ]}
          />
        </View>

        <Animated.View style={[styles.gridContainer, { transform: [{ translateX: contentPosition }] }]}>
          <View style={styles.gridPage}>
            {userVideos.length > 0 ? (
              <FlatList
                data={userVideos}
                renderItem={renderVideoItem(userVideos.length)}
                keyExtractor={(item) => item.id}
                numColumns={GRID_COLUMNS}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContent}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="videocam-off-outline" size={44} color={Colors.textDim} />
                <Text style={styles.emptyText}>Henüz video yok</Text>
              </View>
            )}
          </View>
          <View style={styles.gridPage}>
            <View style={styles.emptyContainer}>
              <Ionicons name="lock-closed-outline" size={44} color={Colors.textDim} />
              <Text style={styles.emptyText}>Gizli videolar</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Video Player Modal */}
      <UserVideoPlayerModal
        visible={videoPlayerVisible}
        videos={videoPlayerVideos}
        startIndex={videoPlayerStartIndex}
        onClose={() => setVideoPlayerVisible(false)}
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
      />

      {/* Report Menu */}
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
    </View>
  );
}

// ─── Video Player Modal ────────────────────────────────────────────────
const COMMENT_INPUT_HEIGHT = 70;

function UserVideoPlayerModal({
  visible, videos, startIndex, onClose, onVideoSaved, onVideoLiked, onVideoCommented,
}: {
  visible: boolean; videos: VideoItem[]; startIndex: number; onClose: () => void;
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [showComments, setShowComments] = useState(false);
  const videoHeight = SCREEN_HEIGHT - COMMENT_INPUT_HEIGHT;

  useEffect(() => { setIdx(startIndex); }, [startIndex]);

  const onViewChange = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIdx(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const getLayout = useCallback((_: any, i: number) => ({ length: videoHeight, offset: videoHeight * i, index: i }), [videoHeight]);
  const keyExt = useCallback((item: VideoItem) => item.id, []);

  const currentVideo = videos[idx];

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <View style={{ height: videoHeight }}>
      <VideoCard
        data={item}
        active={index === idx}
        height={videoHeight}
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
      />
    </View>
  ), [idx, videoHeight, onVideoSaved, onVideoLiked, onVideoCommented]);

  if (!visible || !videos.length) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={playerStyles.container}>
        <TouchableOpacity style={playerStyles.backBtn} onPress={onClose}>
          <View style={playerStyles.backBg}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={{ height: videoHeight }}>
          <FlatList
            data={videos}
            renderItem={renderItem}
            keyExtractor={keyExt}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={videoHeight}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onViewableItemsChanged={onViewChange}
            viewabilityConfig={viewConfig}
            getItemLayout={getLayout}
            removeClippedSubviews
            initialScrollIndex={startIndex}
            onScrollToIndexFailed={() => { }}
            bounces={false}
            overScrollMode="never"
          />
        </View>

        <TouchableOpacity
          style={playerStyles.commentContainer}
          activeOpacity={0.9}
          onPress={() => setShowComments(true)}
        >
          <View style={playerStyles.commentWrap}>
            <TextInput
              style={playerStyles.commentInput}
              placeholder="Yorum yaz..."
              placeholderTextColor={Colors.textMuted}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>

        {currentVideo && (
          <CommentsModal
            visible={showComments}
            onClose={() => setShowComments(false)}
            videoId={currentVideo.id}
            commentCount={currentVideo.comments}
            onCommentAdded={(newCount) => onVideoCommented?.(currentVideo.id, newCount)}
          />
        )}
      </View>
    </Modal>
  );
}

const playerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backBtn: { position: 'absolute', top: 52, left: 14, zIndex: 100 },
  backBg: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  commentContainer: {
    height: COMMENT_INPUT_HEIGHT,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14, justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  commentWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  commentInput: { flex: 1, fontSize: 14, color: Colors.text },
});

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
  headerUsername: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scrollView: { flex: 1 },
  profileSection: { paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' },
  fullName: { fontSize: 17, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  bio: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 10, maxWidth: '80%' },
  skillsContainer: { flexDirection: 'row', gap: 16, marginBottom: 16, justifyContent: 'center' },
  skillText: { color: Colors.primary, fontSize: 12, fontWeight: '500' },
  stats: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 16, width: '100%',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  actionButtons: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 12 },
  actionButton: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  followButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  followButtonTextActive: { color: '#fff' },
  radarButton: {
    flex: 1.2, paddingVertical: 10, borderRadius: 8,
    backgroundColor: 'rgba(255, 60, 0, 0.08)',
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  radarButtonActive: {
    backgroundColor: Colors.primary,
  },
  radarButtonText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  radarButtonTextActive: { color: '#fff' },
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
  gridContainer: { flexDirection: 'row', width: SCREEN_WIDTH * 2 },
  gridPage: { width: SCREEN_WIDTH },
  gridContent: { paddingBottom: 24 },
  videoItem: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH * 1.3, backgroundColor: Colors.surfaceAlt },
  videoThumbnail: { width: '100%', height: '100%' },
  viewsOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewsText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 14, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  reportMenu: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingVertical: 20, paddingBottom: 40,
    borderWidth: 1, borderColor: Colors.border,
  },
  reportItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  reportText: { fontSize: 16, fontWeight: '600', color: Colors.error },
});
