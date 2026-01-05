import { formatNumber } from '@/utils/format';
import { VideoCard } from './HomeScreen';
import CommentsModal from '@/components/CommentsModal';
import Colors from '@/constants/Colors';
import { TALENTS } from '@/constants/Talents';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
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
      activeOpacity={0.95}
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
      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={styles.videoGradient}
        pointerEvents="none"
      />
      {/* Stats */}
      <View style={styles.videoStats}>
        <Ionicons name="play" size={11} color="#fff" />
        <Text style={styles.videoStatsText}>{formatNumber(video.likes)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Section component with horizontal video scroll - Modern TikTok style
const ContentSection = React.memo(({ 
  title, 
  videos, 
  onVideoPress,
  onSeeAll,
}: { 
  title: string; 
  videos: VideoItem[];
  onVideoPress: (videos: VideoItem[], index: number) => void;
  onSeeAll: (title: string, videos: VideoItem[]) => void;
}) => {
  const displayVideos = useMemo(() => videos.slice(0, 10), [videos]);
  
  const handleSeeAll = useCallback(() => onSeeAll(title, videos), [onSeeAll, title, videos]);
  
  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <VideoThumbnailCard 
      video={item} 
      onPress={() => onVideoPress(videos, index)} 
    />
  ), [onVideoPress, videos]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={handleSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>Tümü</Text>
          <Ionicons name="chevron-forward" size={14} color="#888" />
        </TouchableOpacity>
      </View>
      <FlashList
        horizontal
        data={displayVideos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.videoCarousel}
        estimatedItemSize={130}
      />
    </View>
  );
}, (prev, next) => prev.title === next.title && prev.videos.length === next.videos.length);

// Full-screen video player modal with comment input
const COMMENT_INPUT_HEIGHT = 70;

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
  const videoHeight = H - COMMENT_INPUT_HEIGHT;

  const onViewChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems[0]?.index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const getLayout = useCallback((_: any, i: number) => ({ length: videoHeight, offset: videoHeight * i, index: i }), [videoHeight]);

  const currentVideo = videos[currentIndex];

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <View style={{ height: videoHeight }}>
      <VideoCard 
        data={item} 
        active={index === currentIndex} 
        height={videoHeight}
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
        overlayBottomPadding={16}
      />
    </View>
  ), [currentIndex, videoHeight, onVideoSaved, onVideoLiked, onVideoCommented]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.playerContainer}>
        {/* Close Button - Absolute */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Video List */}
        <View style={{ height: videoHeight }}>
          <FlatList
            ref={flatListRef}
            data={videos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={videoHeight}
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
        </View>

        {/* Comment Input */}
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

  // Pre-filtered groups for both tabs - NO dependency on activeTab
  const filteredTopicGroups = useMemo(() => {
    if (!searchQuery.trim()) return topicGroups;
    const query = searchQuery.toLowerCase();
    return topicGroups.filter(g => 
      g.title.toLowerCase().includes(query) ||
      g.videos.some(v => v.user.username.toLowerCase().includes(query) || v.description.toLowerCase().includes(query))
    );
  }, [topicGroups, searchQuery]);

  const filteredHashtagGroups = useMemo(() => {
    if (!searchQuery.trim()) return hashtagGroups;
    const query = searchQuery.toLowerCase();
    return hashtagGroups.filter(g => 
      g.title.toLowerCase().includes(query) ||
      g.videos.some(v => v.user.username.toLowerCase().includes(query) || v.description.toLowerCase().includes(query))
    );
  }, [hashtagGroups, searchQuery]);

  // Quick access for both tabs - pre-calculated
  const topicQuickItems = useMemo(() => topicGroups.slice(0, 8).map(g => ({ title: g.title, count: g.videos.length })), [topicGroups]);
  const hashtagQuickItems = useMemo(() => hashtagGroups.slice(0, 8).map(g => ({ title: g.title, count: g.videos.length })), [hashtagGroups]);

  const openVideoPlayer = useCallback((vids: VideoItem[], index: number) => {
    setPlayerVideos(vids);
    setPlayerStartIndex(index);
    setPlayerVisible(true);
  }, []);

  const handleSeeAll = useCallback((title: string, vids: VideoItem[]) => {
    openVideoPlayer(vids, 0);
  }, [openVideoPlayer]);

  const handleTopicQuickPress = useCallback((title: string) => {
    const group = topicGroups.find(g => g.title === title);
    if (group) openVideoPlayer(group.videos, 0);
  }, [topicGroups, openVideoPlayer]);

  const handleHashtagQuickPress = useCallback((title: string) => {
    const group = hashtagGroups.find(g => g.title === title);
    if (group) openVideoPlayer(group.videos, 0);
  }, [hashtagGroups, openVideoPlayer]);

  if (videos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#666" />
            <Text style={{ color: '#555', fontSize: 14 }}>Ara...</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="compass-outline" size={48} color="#333" />
          <Text style={styles.emptyTitle}>Henüz içerik yok</Text>
          <Text style={styles.emptySubtitle}>İlk videoyu yükleyen sen ol!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Modern Search Bar - No Header */}
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.8}>
          <Ionicons name="search" size={16} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara..."
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Minimal Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'topics' && styles.tabActive]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('topics');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'topics' && styles.tabTextActive]}>Konular</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tags' && styles.tabActive]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('tags');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'tags' && styles.tabTextActive]}>Etiketler</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content Container */}
      <View style={styles.tabContentContainer}>
        {/* Topics Tab Content - Always rendered, visibility toggled */}
      <ScrollView 
          style={[styles.scrollView, activeTab !== 'topics' && styles.hiddenTab]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        pointerEvents={activeTab === 'topics' ? 'auto' : 'none'}
      >
        {topicQuickItems.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.quickScroll}
            contentContainerStyle={styles.quickContainer}
          >
            {topicQuickItems.map((item, index) => (
              <TouchableOpacity 
                key={item.title} 
                style={[styles.quickPill, index === 0 && styles.quickPillFirst]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleTopicQuickPress(item.title);
                }}
              >
                <Text style={styles.quickText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {filteredTopicGroups.map((group) => (
          <ContentSection 
            key={group.title} 
            title={group.title}
            videos={group.videos}
            onVideoPress={openVideoPlayer}
            onSeeAll={handleSeeAll}
          />
        ))}
        {filteredTopicGroups.length === 0 && searchQuery && (
          <View style={styles.noResults}>
            <Ionicons name="search" size={48} color="#333" />
            <Text style={styles.noResultsText}>"{searchQuery}" için konu bulunamadı</Text>
          </View>
        )}
        {filteredTopicGroups.length === 0 && !searchQuery && (
          <View style={styles.noResults}>
            <Ionicons name="albums-outline" size={48} color="#333" />
            <Text style={styles.noResultsText}>Henüz konu yok</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Tags Tab Content - Always rendered, visibility toggled */}
      <ScrollView 
        style={[styles.scrollView, activeTab !== 'tags' && styles.hiddenTab]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        pointerEvents={activeTab === 'tags' ? 'auto' : 'none'}
      >
        {hashtagQuickItems.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.quickScroll}
            contentContainerStyle={styles.quickContainer}
          >
            {hashtagQuickItems.map((item, index) => (
              <TouchableOpacity 
                key={item.title} 
                style={[styles.quickPill, index === 0 && styles.quickPillFirst]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleHashtagQuickPress(item.title);
                }}
              >
                <Text style={styles.quickText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {filteredHashtagGroups.map((group) => (
          <ContentSection 
            key={group.title} 
            title={group.title}
            videos={group.videos}
            onVideoPress={openVideoPlayer}
            onSeeAll={handleSeeAll}
          />
        ))}
        {filteredHashtagGroups.length === 0 && searchQuery && (
          <View style={styles.noResults}>
            <Ionicons name="search" size={48} color="#333" />
            <Text style={styles.noResultsText}>"{searchQuery}" için etiket bulunamadı</Text>
          </View>
        )}
        {filteredHashtagGroups.length === 0 && !searchQuery && (
          <View style={styles.noResults}>
            <Ionicons name="pricetag-outline" size={48} color="#333" />
            <Text style={styles.noResultsText}>Henüz etiket yok</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      </View>

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
  // Modern Search Bar
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#000',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 0,
  },
  // Modern Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#222',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  // Content
  scrollView: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hiddenTab: {
    opacity: 0,
    zIndex: -1,
  },
  tabContentContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Empty State
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
  // Quick Access Pills - Horizontal Scroll
  quickScroll: {
    marginTop: 4,
    marginBottom: 8,
  },
  quickContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickPill: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickPillFirst: {
    marginLeft: 0,
  },
  quickText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  // Content Section
  section: {
    marginBottom: 16,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  videoCarousel: {
    paddingLeft: 12,
    gap: 8,
  },
  // Video Card - Larger, TikTok style
  videoCard: {
    width: 130,
    height: 180,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
  },
  videoStats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoStatsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
