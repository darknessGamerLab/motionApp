import CommentsModal from '@/components/CommentsModal';
import ProfilePhotoCarousel from '@/components/ProfilePhotoCarousel';
import Colors from '@/constants/Colors';
import { formatNumber } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditProfileScreen from './EditProfileScreen';
import { VideoCard } from './HomeScreen';
import SettingsScreen from './SettingsScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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

interface MeScreenProps {
  isActive?: boolean;
  userProfile?: any;
  allVideos?: VideoItem[];
  onVideoDelete?: (videoId: string) => void;
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
  onProfileUpdate?: (updatedProfile: any) => void;
}

export default function MeScreen({ isActive = false, userProfile, allVideos = [], onVideoSaved, onVideoLiked, onVideoCommented, onVideoDelete, onProfileUpdate }: MeScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'videos' | 'saved'>('videos');
  const [activeProfileIndex, setActiveProfileIndex] = useState(1);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [videoPlayerVideos, setVideoPlayerVideos] = useState<VideoItem[]>([]);
  const [videoPlayerStartIndex, setVideoPlayerStartIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const contentPosition = useRef(new Animated.Value(0)).current;

  // userProfile'dan user bilgilerini al
  const user = useMemo(() => ({
    username: userProfile?.username || 'kullanici',
    fullName: userProfile?.fullName || 'Kullanıcı',
    bio: userProfile?.bio || 'Merhaba! 👋',
    avatars: userProfile?.avatars || [
      'https://i.pravatar.cc/300?img=1',
      'https://i.pravatar.cc/300?img=11',
      'https://i.pravatar.cc/300?img=12',
    ],
    skills: userProfile?.skills || [],
    following: userProfile?.following || 0,
    followers: userProfile?.followers || 0,
    videos: userProfile?.videos || 0,
  }), [userProfile]);

  // Kullanıcının videoları ve kaydedilenler
  const userVideos = useMemo(() => allVideos.filter(v =>
    v.user.id === 'current' || v.user.username === user.username
  ), [allVideos, user.username]);
  const savedVideosList = useMemo(() => allVideos.filter(v => v.isSaved), [allVideos]);

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

  // Video player aç
  const openVideoPlayer = useCallback((videosList: VideoItem[], startIndex: number) => {
    setVideoPlayerVideos(videosList);
    setVideoPlayerStartIndex(startIndex);
    setVideoPlayerVisible(true);
  }, []);

  // Grid için kullanılacak videolar
  const displayVideos = activeTab === 'videos' ? userVideos : savedVideosList;

  const changeProfile = (index: number) => {
    setActiveProfileIndex(index);
  };

  // Video silme
  const handleDeleteVideo = useCallback((videoId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Videoyu Sil',
      'Bu videoyu silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            onVideoDelete?.(videoId);
          }
        },
      ]
    );
  }, [onVideoDelete]);

  const renderVideoItem = useCallback((totalLength: number, isUserVideos: boolean) => ({ item, index }: { item: VideoItem; index: number }) => {
    const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
    const rowNumber = Math.floor(index / GRID_COLUMNS);
    const totalRows = Math.ceil(totalLength / GRID_COLUMNS);
    const isLastRow = rowNumber === totalRows - 1;
    const videosList = isUserVideos ? userVideos : savedVideosList;

    return (
      <TouchableOpacity
        style={[styles.videoItem, { marginRight: isLastInRow ? 0 : GRID_GAP, marginBottom: isLastRow ? 0 : GRID_GAP }]}
        activeOpacity={0.8}
        onPress={() => openVideoPlayer(videosList, index)}
        onLongPress={() => {
          // Sadece kullanıcının kendi videoları silinebilir
          if (isUserVideos) {
            handleDeleteVideo(item.id);
          }
        }}
        delayLongPress={500}
      >
        <Image source={{ uri: item.uri }} style={styles.videoThumbnail} resizeMode="cover" />
        <View style={styles.viewsOverlay}>
          <Ionicons name="play" size={12} color="#fff" />
        </View>
      </TouchableOpacity>
    );
  }, [userVideos, savedVideosList, openVideoPlayer, handleDeleteVideo]);

  const formatViews = formatNumber;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerUsername}>@{user.username}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={isActive}>
        {/* Profile Photos - 3 Photos */}
        <View style={styles.profileSection}>
          {/* 3 Photos Carousel */}
          <ProfilePhotoCarousel
            avatars={user.avatars}
            size={90}
            isEditable={true}
            onEditPress={() => setShowEditProfile(true)}
          />


          {/* Full Name */}
          <Text style={styles.fullName}>{user.fullName}</Text>

          {/* Bio */}
          <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>

          {/* Skills - 3 Skills Mandatory */}
          <View style={styles.skillsContainer}>
            {user.skills.map((skill: string, index: number) => (
              <Text key={index} style={styles.skillText}>
                #{skill.toLowerCase()}
              </Text>
            ))}
          </View>

          {/* Stats */}
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
              <Text style={styles.statNumber}>{userProfile?.radarsCount || 0}</Text>
              <Text style={styles.statLabel}>Radar</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatViews(user.videos)}</Text>
              <Text style={styles.statLabel}>Video</Text>
            </TouchableOpacity>
          </View>



          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowEditProfile(true)}>
              <Text style={styles.actionButtonText}>Profili Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Paylaş</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('videos')}
          >
            <Ionicons name="videocam" size={24} color={activeTab === 'videos' ? '#fff' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons name="bookmark" size={22} color={activeTab === 'saved' ? '#fff' : '#666'} />
          </TouchableOpacity>
          {/* Animated indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [
                  {
                    translateX: tabIndicatorPosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_WIDTH * 0.25 - 20, SCREEN_WIDTH * 0.75 - 20],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        {/* Video Grid - Animated */}
        <Animated.View
          style={[
            styles.gridContainer,
            {
              transform: [{ translateX: contentPosition }],
            },
          ]}
        >
          <View style={styles.gridPage}>
            <FlatList
              data={userVideos}
              renderItem={renderVideoItem(userVideos.length, true)}
              keyExtractor={(item) => item.id}
              numColumns={GRID_COLUMNS}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>
          <View style={styles.gridPage}>
            <FlatList
              data={savedVideosList}
              renderItem={renderVideoItem(savedVideosList.length, false)}
              keyExtractor={(item) => item.id}
              numColumns={GRID_COLUMNS}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Profile Video Player Modal */}
      <ProfileVideoPlayer
        visible={videoPlayerVisible}
        videos={videoPlayerVideos}
        startIndex={videoPlayerStartIndex}
        onClose={() => setVideoPlayerVisible(false)}
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
      />

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <SettingsScreen
          onBackPress={() => setShowSettings(false)}
          onEditProfile={() => {
            setShowSettings(false);
            setShowEditProfile(true);
          }}
        />
      </Modal>

      {/* Edit Profile Screen */}
      <Modal visible={showEditProfile} animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <EditProfileScreen
          onClose={() => setShowEditProfile(false)}
          userProfile={{ ...user, avatarUri: user.avatars?.[0] || '', talents: (userProfile as any).talents || [] }}
          onSave={(updatedProfile) => {
            onProfileUpdate?.(updatedProfile);
            setShowEditProfile(false);
          }}
        />
      </Modal>
    </View>
  );
}

// Basit Profile Video Player - HomeScreen gibi
const COMMENT_INPUT_HEIGHT = 70;

function ProfileVideoPlayer({
  visible,
  videos,
  startIndex,
  onClose,
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
}: {
  visible: boolean;
  videos: VideoItem[];
  startIndex: number;
  onClose: () => void;
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const screenHeight = Dimensions.get('window').height;
  const videoHeight = screenHeight - COMMENT_INPUT_HEIGHT;
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    setIdx(startIndex);
  }, [startIndex]);

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
        {/* Header - Absolute */}
        <View style={playerStyles.header}>
          <TouchableOpacity style={playerStyles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Video List */}
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
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            initialScrollIndex={startIndex}
            onScrollToIndexFailed={() => { }}
            bounces={false}
            overScrollMode="never"
          />
        </View>

        {/* Comment Input */}
        <TouchableOpacity
          style={playerStyles.commentInputContainer}
          activeOpacity={0.9}
          onPress={() => setShowComments(true)}
        >
          <View style={playerStyles.commentInputWrap}>
            <TextInput
              style={playerStyles.commentInput}
              placeholder="Yorum yaz..."
              placeholderTextColor="#666"
              editable={false}
              pointerEvents="none"
            />
            <View style={playerStyles.commentSendBtn}>
              <Ionicons name="chatbubble-outline" size={18} color="#888" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Comments Modal */}
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
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 15,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  commentInputContainer: {
    height: COMMENT_INPUT_HEIGHT,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12, justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  commentInputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentInput: {
    flex: 1, backgroundColor: Colors.surfaceAlt,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    color: Colors.text, maxHeight: 100,
    borderWidth: 1, borderColor: Colors.border,
  },
  commentSendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerButton: { padding: 4 },
  headerUsername: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scrollView: { flex: 1 },
  profileSection: { paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' },
  fullName: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 4, letterSpacing: 0.3 },
  bio: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 12, maxWidth: '80%' },
  skillsContainer: { flexDirection: 'row', gap: 32, marginBottom: 16, justifyContent: 'center', paddingHorizontal: 20 },
  skillText: { color: Colors.primary, fontSize: 13, fontWeight: '500' },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 0, paddingHorizontal: 20, width: '100%' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  statLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  taxInfoBar: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 6,
    marginTop: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  taxLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },
  actionButtons: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 10 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, marginTop: 2, position: 'relative' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 12, paddingBottom: 5 },
  tabIndicator: {
    position: 'absolute', bottom: -1, width: 40, height: 3,
    backgroundColor: Colors.primary, borderRadius: 1.5,
  },
  gridContainer: { flexDirection: 'row', width: SCREEN_WIDTH * 2 },
  gridPage: { width: SCREEN_WIDTH },
  gridContent: { paddingBottom: 4 },
  videoItem: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH * 1.3, backgroundColor: Colors.surfaceAlt },
  videoThumbnail: { width: '100%', height: '100%' },
  viewsOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  editModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editModalContent: { width: '85%', backgroundColor: Colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  editModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  editModalPlaceholder: { color: Colors.textMuted, fontSize: 14, marginBottom: 20, textAlign: 'center' },
  editModalButton: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  editModalButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
