import { VideoCard } from './HomeScreen';
import SettingsScreen from './SettingsScreen';
import EditProfileScreen from './EditProfileScreen';
import CommentsModal from '@/components/CommentsModal';
import { formatNumber } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <View style={styles.avatarStack}>
            {user.avatars.map((avatar, index) => {
              const isActive = index === activeProfileIndex;
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
                  onPress={() => changeProfile(index)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                </TouchableOpacity>
              );
            })}
          </View>


          {/* Full Name */}
          <Text style={styles.fullName}>{user.fullName}</Text>

          {/* Bio */}
          <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>

          {/* Skills - 3 Skills Mandatory */}
          <View style={styles.skillsContainer}>
            {user.skills.map((skill, index) => (
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
          userProfile={user}
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
  const h = Dimensions.get('window').height;
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    setIdx(startIndex);
  }, [startIndex]);

  const onViewChange = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIdx(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const getLayout = useCallback((_: any, i: number) => ({ length: h - 70, offset: (h - 70) * i, index: i }), [h]);
  const keyExt = useCallback((item: VideoItem) => item.id, []);

  const currentVideo = videos[idx];

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <View style={{ height: h - 70 }}>
      <VideoCard 
        data={item} 
        active={index === idx} 
        height={h - 70}
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
        overlayBottomPadding={20}
      />
    </View>
  ), [idx, h, onVideoSaved, onVideoLiked, onVideoCommented]);

  if (!visible || !videos.length) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={playerStyles.container}>
        <View style={playerStyles.header}>
          <TouchableOpacity style={playerStyles.backBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={videos}
          renderItem={renderItem}
          keyExtractor={keyExt}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={h - 70}
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
        {/* Comment Input - Tıklanınca modal aç */}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingBottom: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    zIndex: 100,
  },
  commentInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    maxHeight: 100,
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
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerButton: { padding: 4 },
  headerUsername: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scrollView: { flex: 1 },
  profileSection: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 0, alignItems: 'center' },
  avatarStack: { height: 100, width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', marginBottom: 2, position: 'relative' },
  avatarContainer: { position: 'absolute', width: 90, height: 90 },
  leftFrame: { left: '24%', transform: [{ scale: 0.8 }], opacity: 0.6, zIndex: 0 },
  centerFrame: { left: '50%', marginLeft: -45, zIndex: 2 },
  rightFrame: { right: '24%', transform: [{ scale: 0.8 }], opacity: 0.6, zIndex: 0 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, borderColor: '#fff' },
  fullName: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 4, letterSpacing: 0.3 },
  bio: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 18, marginBottom: 12, maxWidth: '80%', fontWeight: '400' },
  skillsContainer: { flexDirection: 'row', gap: 32, marginBottom: 16, justifyContent: 'center', paddingHorizontal: 20 },
  skillText: { color: '#DC143C', fontSize: 13, fontWeight: '400' },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 0, paddingHorizontal: 20, width: '100%' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 3 },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: '#1a1a1a' },
  actionButtons: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 10 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', marginTop: 2, position: 'relative' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 12, paddingBottom: 5 },
  tabIndicator: { 
    position: 'absolute', 
    bottom: -1, 
    width: 40, 
    height: 3, 
    backgroundColor: '#DC143C', 
    borderRadius: 1.5,
  },
  gridContainer: { flexDirection: 'row', width: SCREEN_WIDTH * 2 },
  gridPage: { width: SCREEN_WIDTH },
  gridContent: { paddingBottom: 4 },
  videoItem: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH * 1.3, backgroundColor: '#1a1a1a' },
  videoThumbnail: { width: '100%', height: '100%' },
  viewsOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  // Edit Profile Modal
  editModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  editModalContent: { width: '85%', backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24, alignItems: 'center' },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  editModalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  editModalPlaceholder: { color: '#888', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  editModalButton: { backgroundColor: '#DC143C', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  editModalButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
