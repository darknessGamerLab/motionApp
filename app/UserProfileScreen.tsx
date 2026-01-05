import { formatNumber } from '@/utils/format';
import { VideoCard } from './HomeScreen';
import CommentsModal from '@/components/CommentsModal';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS;
const CHROME_COLOR = '#0A0505';

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
  const [activeTab, setActiveTab] = useState<'videos' | 'private'>('videos');
  const [activeProfileIndex, setActiveProfileIndex] = useState(1);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [videoPlayerVideos, setVideoPlayerVideos] = useState<VideoItem[]>([]);
  const [videoPlayerStartIndex, setVideoPlayerStartIndex] = useState(0);
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const contentPosition = useRef(new Animated.Value(0)).current;

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

  // Mock user data - gerçek uygulamada userId ile API'den çekilir
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

  // Bu kullanıcının videoları
  const userVideos = useMemo(() => {
    return allVideos.filter(v => v.user.id === user.id || v.user.username === user.username);
  }, [allVideos, user.id, user.username]);

  // Mock private videos (kilitli)
  const privateVideos = useMemo(() => [], []);

  const handleReport = () => {
    setShowReportMenu(false);
    Alert.alert('Bildirildi', 'Bu kullanıcı raporlandı.');
  };

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFollowing(!isFollowing);
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerUsername}>@{user.username}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowReportMenu(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={isActive}>
        <View style={styles.profileSection}>
          <View style={styles.avatarStack}>
            {user.avatars.map((avatar, index) => {
              const position = index === 0 ? 'left' : index === 2 ? 'right' : 'center';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarContainer,
                    position === 'left' && styles.leftFrame,
                    position === 'center' && styles.centerFrame,
                    position === 'right' && styles.rightFrame,
                  ]}
                  onPress={() => setActiveProfileIndex(index)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                </TouchableOpacity>
              );
            })}
          </View>

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
              style={[styles.actionButton, !isFollowing && styles.followButtonActive]}
              onPress={handleFollow}
            >
              <Text style={[styles.actionButtonText, !isFollowing && styles.followButtonTextActive]}>
                {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Profili Paylaş</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('videos')}>
            <Ionicons name="videocam" size={22} color={activeTab === 'videos' ? '#fff' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('private')}>
            <Ionicons name="lock-closed" size={20} color={activeTab === 'private' ? '#fff' : '#666'} />
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
                <Ionicons name="videocam-off-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>Henüz video yok</Text>
              </View>
            )}
          </View>
          <View style={styles.gridPage}>
            <View style={styles.emptyContainer}>
              <Ionicons name="lock-closed-outline" size={48} color="#333" />
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

      {/* Report Menu Modal */}
      <Modal visible={showReportMenu} transparent animationType="fade" onRequestClose={() => setShowReportMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReportMenu(false)}>
          <View style={styles.reportMenu}>
            <TouchableOpacity style={styles.reportItem} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color="#DC143C" />
              <Text style={styles.reportText}>Bildir</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Video Player Modal for User Profile
const COMMENT_INPUT_HEIGHT = 70;

function UserVideoPlayerModal({
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
  const [showComments, setShowComments] = useState(false);
  const videoHeight = SCREEN_HEIGHT - COMMENT_INPUT_HEIGHT;

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
        overlayBottomPadding={16}
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
            onScrollToIndexFailed={() => {}}
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInputContainer: {
    height: COMMENT_INPUT_HEIGHT,
    backgroundColor: '#000',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  commentInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  header: { 
    height: 50,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    backgroundColor: CHROME_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  headerButton: { 
    padding: 4 
  },
  headerUsername: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#fff' 
  },
  scrollView: { 
    flex: 1 
  },
  profileSection: { 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    alignItems: 'center' 
  },
  avatarStack: { 
    height: 90, 
    width: SCREEN_WIDTH, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8, 
    position: 'relative' 
  },
  avatarContainer: { 
    position: 'absolute', 
    width: 80, 
    height: 80 
  },
  leftFrame: { 
    left: '22%', 
    transform: [{ scale: 0.75 }], 
    opacity: 0.5, 
    zIndex: 0 
  },
  centerFrame: { 
    left: '50%', 
    marginLeft: -40, 
    zIndex: 2 
  },
  rightFrame: { 
    right: '22%', 
    transform: [{ scale: 0.75 }], 
    opacity: 0.5, 
    zIndex: 0 
  },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    borderWidth: 2.5, 
    borderColor: '#fff' 
  },
  fullName: { 
    fontSize: 17, 
    fontWeight: '600', 
    color: '#fff', 
    marginBottom: 4 
  },
  bio: { 
    fontSize: 13, 
    color: '#888', 
    textAlign: 'center', 
    marginBottom: 12, 
    maxWidth: '80%' 
  },
  skillsContainer: { 
    flexDirection: 'row', 
    gap: 24, 
    marginBottom: 16, 
    justifyContent: 'center' 
  },
  skillText: { 
    color: '#DC143C', 
    fontSize: 12, 
    fontWeight: '500' 
  },
  stats: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 16, 
    width: '100%' 
  },
  statItem: { 
    alignItems: 'center', 
    flex: 1 
  },
  statNumber: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#fff', 
    marginBottom: 2 
  },
  statLabel: { 
    fontSize: 11, 
    color: '#666' 
  },
  statDivider: { 
    width: 1, 
    height: 28, 
    backgroundColor: '#1a1a1a' 
  },
  actionButtons: { 
    flexDirection: 'row', 
    gap: 8, 
    width: '100%', 
    marginTop: 12 
  },
  actionButton: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 6, 
    backgroundColor: '#1a1a1a', 
    alignItems: 'center' 
  },
  actionButtonText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#fff' 
  },
  followButtonActive: { 
    backgroundColor: '#DC143C' 
  },
  followButtonTextActive: { 
    color: '#fff' 
  },
  tabs: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#1a1a1a', 
    marginTop: 8, 
    position: 'relative' 
  },
  tab: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12 
  },
  tabIndicator: { 
    position: 'absolute', 
    bottom: -1, 
    width: 40, 
    height: 2, 
    backgroundColor: '#DC143C', 
    borderRadius: 1 
  },
  gridContainer: { 
    flexDirection: 'row', 
    width: SCREEN_WIDTH * 2 
  },
  gridPage: { 
    width: SCREEN_WIDTH 
  },
  gridContent: { 
    paddingBottom: 24 
  },
  videoItem: { 
    width: GRID_ITEM_WIDTH, 
    height: GRID_ITEM_WIDTH * 1.3, 
    backgroundColor: '#1a1a1a' 
  },
  videoThumbnail: { 
    width: '100%', 
    height: '100%' 
  },
  viewsOverlay: { 
    position: 'absolute', 
    bottom: 4, 
    left: 4, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3 
  },
  viewsText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600' 
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#444',
    fontSize: 14,
    marginTop: 12,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'flex-end' 
  },
  reportMenu: { 
    backgroundColor: '#1a1a1a', 
    borderTopLeftRadius: 16, 
    borderTopRightRadius: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  reportItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingHorizontal: 20, 
    paddingVertical: 16 
  },
  reportText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#DC143C' 
  },
});
