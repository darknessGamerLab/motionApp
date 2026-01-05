import { formatNumber } from '@/utils/format';
import { VideoCard } from './HomeScreen';
import CommentsModal from '@/components/CommentsModal';
import Colors from '@/constants/Colors';
import { TALENTS } from '@/constants/Talents';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
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
} from 'react-native';

const CHROME_COLOR = '#0A0505';
const { width: W, height: H } = Dimensions.get('window');

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

type Props = {
  isActive?: boolean;
  contentHeight?: number;
  videos?: VideoItem[];
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
};

// Thumbnail video card component
function VideoThumbnailCard({ 
  video, 
  onPress 
}: { 
  video: VideoItem; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={styles.videoCard} 
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Video
        source={{ uri: video.uri }}
        style={styles.videoThumbnail}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isMuted
        pointerEvents="none"
      />
      <View style={styles.videoOverlay}>
        <View style={styles.videoViews}>
          <Ionicons name="play" size={10} color="#fff" />
          <Text style={styles.videoViewsText}>{formatNumber(video.likes)}</Text>
        </View>
      </View>
      <View style={styles.userBadge}>
        <Text style={styles.userBadgeText}>@{video.user.username.slice(0, 8)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Section component with horizontal video scroll
function ContentSection({ 
  title, 
  videos, 
  onVideoPress,
  onSeeAll,
}: { 
  title: string; 
  videos: VideoItem[];
  onVideoPress: (videos: VideoItem[], index: number) => void;
  onSeeAll: (title: string, videos: VideoItem[]) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleText}>{title}</Text>
          <Text style={styles.videoCount}>{videos.length} video</Text>
        </View>
        <TouchableOpacity onPress={() => onSeeAll(title, videos)}>
          <Text style={styles.seeAllText}>Tümünü Gör</Text>
        </TouchableOpacity>
      </View>
      <FlashList
        horizontal
        data={videos.slice(0, 10)}
        renderItem={({ item, index }) => (
          <VideoThumbnailCard 
            video={item} 
            onPress={() => onVideoPress(videos, index)} 
          />
        )}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.videoCarousel}
        estimatedItemSize={110}
      />
    </View>
  );
}

// Full-screen video player modal with comment input
function VideoPlayerModal({
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
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showComments, setShowComments] = useState(false);
  const height = H;

  const onViewChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems[0]?.index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const getLayout = useCallback((_: any, i: number) => ({ length: height - 70, offset: (height - 70) * i, index: i }), [height]);

  const currentVideo = videos[currentIndex];

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <VideoCard 
      data={item} 
      active={index === currentIndex} 
      height={height - 70}
      onVideoSaved={onVideoSaved}
      onVideoLiked={onVideoLiked}
      onVideoCommented={onVideoCommented}
      overlayBottomPadding={20}
    />
  ), [currentIndex, height, onVideoSaved, onVideoLiked, onVideoCommented]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.playerContainer}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          data={videos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height - 70}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          onViewableItemsChanged={onViewChange}
          viewabilityConfig={viewConfig}
          getItemLayout={getLayout}
          initialScrollIndex={startIndex}
          removeClippedSubviews
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          bounces={false}
          overScrollMode="never"
          onScrollToIndexFailed={() => {}}
        />

        <TouchableOpacity 
          style={styles.commentInputContainer}
          activeOpacity={0.9}
          onPress={() => setShowComments(true)}
        >
          <View style={styles.commentInputWrap}>
            <TextInput
              style={styles.commentInput}
              placeholder="Yorum yaz..."
              placeholderTextColor="#666"
              editable={false}
              pointerEvents="none"
            />
            <View style={styles.commentSendBtn}>
              <Ionicons name="chatbubble-outline" size={18} color="#888" />
            </View>
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

export default function InspirationScreen({ 
  isActive = false, 
  contentHeight, 
  videos = [],
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
}: Props) {
  const [activeTab, setActiveTab] = useState<'topics' | 'tags'>('topics');
  const [searchQuery, setSearchQuery] = useState('');
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerVideos, setPlayerVideos] = useState<VideoItem[]>([]);
  const [playerStartIndex, setPlayerStartIndex] = useState(0);
  const tabIndicator = useRef(new Animated.Value(0)).current;

  // Tab animation
  React.useEffect(() => {
    Animated.spring(tabIndicator, {
      toValue: activeTab === 'topics' ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [activeTab]);

  // Group videos by topic (sistem tarafından belirlenen konular)
  const topicGroups = useMemo(() => {
    const groups: { [key: string]: VideoItem[] } = {};
    
    videos.forEach(video => {
      if (video.topic) {
        if (!groups[video.topic]) {
          groups[video.topic] = [];
        }
        groups[video.topic].push(video);
      }
    });

    return Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([topic, vids]) => ({ title: topic, videos: vids }));
  }, [videos]);

  // Extract hashtags from video descriptions (kullanıcıların koyduğu etiketler)
  const hashtagGroups = useMemo(() => {
    const tags: { [key: string]: VideoItem[] } = {};
    
    videos.forEach(video => {
      const matches = video.description.match(/#[a-zA-ZğüşıöçĞÜŞİÖÇ0-9_]+/g);
      if (matches) {
        matches.forEach(tag => {
          const normalizedTag = tag.toLowerCase();
          if (!tags[normalizedTag]) {
            tags[normalizedTag] = [];
          }
          if (!tags[normalizedTag].find(v => v.id === video.id)) {
            tags[normalizedTag].push(video);
          }
        });
      }
    });

    return Object.entries(tags)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([tag, vids]) => ({ title: tag, videos: vids }));
  }, [videos]);

  // Current groups based on active tab
  const currentGroups = activeTab === 'topics' ? topicGroups : hashtagGroups;

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return currentGroups;
    
    const query = searchQuery.toLowerCase();
    return currentGroups.filter(g => 
      g.title.toLowerCase().includes(query) ||
      g.videos.some(v => 
        v.user.username.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query)
      )
    );
  }, [currentGroups, searchQuery]);

  // All items for quick access
  const quickAccessItems = useMemo(() => {
    return currentGroups.slice(0, 8).map(g => ({
      title: g.title,
      count: g.videos.length,
    }));
  }, [currentGroups]);

  const openVideoPlayer = useCallback((vids: VideoItem[], index: number) => {
    setPlayerVideos(vids);
    setPlayerStartIndex(index);
    setPlayerVisible(true);
  }, []);

  const handleSeeAll = useCallback((title: string, vids: VideoItem[]) => {
    openVideoPlayer(vids, 0);
  }, [openVideoPlayer]);

  const handleQuickPress = useCallback((title: string) => {
    const group = currentGroups.find(g => g.title === title);
    if (group) {
      openVideoPlayer(group.videos, 0);
    }
  }, [currentGroups, openVideoPlayer]);

  if (videos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Keşfet</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="compass-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Henüz içerik yok</Text>
          <Text style={styles.emptySubtitle}>İlk videoyu yükleyen sen ol!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Keşfet</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'topics' ? 'Konu ara...' : 'Etiket ara...'}
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('topics');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'topics' && styles.tabTextActive]}>Konular</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('tags');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'tags' && styles.tabTextActive]}>Etiketler</Text>
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              transform: [{
                translateX: tabIndicator.interpolate({
                  inputRange: [0, 1],
                  outputRange: [W * 0.25 - 30, W * 0.75 - 30],
                }),
              }],
            },
          ]}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Access */}
        {quickAccessItems.length > 0 && (
          <View style={styles.quickSection}>
            <Text style={styles.quickTitle}>
              {activeTab === 'topics' ? 'Popüler Konular' : 'Trend Etiketler'}
            </Text>
            <View style={styles.quickContainer}>
              {quickAccessItems.map((item) => (
                <TouchableOpacity 
                  key={item.title} 
                  style={styles.quickButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleQuickPress(item.title);
                  }}
                >
                  <Text style={styles.quickText}>{item.title}</Text>
                  <Text style={styles.quickCount}>{item.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Content Sections */}
        {filteredGroups.map((group) => (
          <ContentSection 
            key={group.title} 
            title={group.title}
            videos={group.videos}
            onVideoPress={openVideoPlayer}
            onSeeAll={handleSeeAll}
          />
        ))}

        {filteredGroups.length === 0 && searchQuery && (
          <View style={styles.noResults}>
            <Ionicons name="search" size={48} color="#333" />
            <Text style={styles.noResultsText}>"{searchQuery}" için sonuç bulunamadı</Text>
          </View>
        )}

        {filteredGroups.length === 0 && !searchQuery && (
          <View style={styles.noResults}>
            <Ionicons name={activeTab === 'topics' ? 'albums-outline' : 'pricetag-outline'} size={48} color="#333" />
            <Text style={styles.noResultsText}>
              {activeTab === 'topics' ? 'Henüz konu yok' : 'Henüz etiket yok'}
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={playerVisible}
        videos={playerVideos}
        startIndex={playerStartIndex}
        onClose={() => setPlayerVisible(false)}
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: CHROME_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CHROME_COLOR,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    position: 'relative',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    width: 60,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  quickSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  quickContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  quickText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  quickCount: {
    color: '#666',
    fontSize: 11,
  },
  section: {
    marginBottom: 20,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  videoCount: {
    color: '#666',
    fontSize: 12,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  videoCarousel: {
    paddingLeft: 16,
    gap: 10,
  },
  videoCard: {
    width: 110,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoViews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  videoViewsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  userBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '500',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
