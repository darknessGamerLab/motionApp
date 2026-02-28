import CommentsModal from '@/components/CommentsModal';
import Colors from '@/constants/Colors';
import { formatNumber } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  useCallback,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { VideoCard, VideoItem } from './HomeScreen';

const { width: W, height: H } = Dimensions.get('window');

// ─── Horizontal Video Card Dimensions ────────────────────────
const CARD_W = 100;
const CARD_H = 178;
const GAP = 4;

type TabKey = 'kesfet' | 'dans' | 'muzik' | 'spor' | 'komedi' | 'yemek' | 'sanat';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'kesfet', label: 'Keşfet' },
  { key: 'dans', label: 'Dans' },
  { key: 'muzik', label: 'Müzik' },
  { key: 'spor', label: 'Spor' },
  { key: 'komedi', label: 'Komedi' },
  { key: 'yemek', label: 'Yemek' },
  { key: 'sanat', label: 'Sanat' },
];

type Props = {
  isActive?: boolean;
  videos?: VideoItem[];
  onVideoSaved?: (id: string, isSaved: boolean) => void;
  onVideoLiked?: (id: string, isLiked: boolean, count: number) => void;
  onVideoCommented?: (id: string, count: number) => void;
};

// ─── Küçük Dikey Video Kartı (Yatay Scroll İçin) ─────────────────────
const VThumb = React.memo(({ item, onPress, isFirst, isLast }: {
  item: VideoItem; onPress: () => void; isFirst: boolean; isLast: boolean;
}) => (
  <TouchableOpacity
    style={{
      width: CARD_W,
      height: CARD_H,
      backgroundColor: Colors.surfaceAlt,
      borderRadius: 6,
      overflow: 'hidden',
      marginLeft: 0,
      marginRight: isLast ? 16 : GAP,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors.border,
    }}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Video
      source={{ uri: item.uri }}
      style={StyleSheet.absoluteFill}
      resizeMode={ResizeMode.COVER}
      shouldPlay={false}
      isMuted
      pointerEvents="none"
      posterSource={{ uri: item.user.avatar || 'https://i.pravatar.cc/100' }}
      usePoster
    />
    <LinearGradient
      colors={['transparent', 'transparent', 'rgba(0,0,0,0.7)']}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
    <View style={tc.overlayInfo}>
      <View style={tc.statsRow}>
        <Ionicons name="play-outline" size={10} color="rgba(255,255,255,0.9)" />
        <Text style={tc.statsText}>{formatNumber(item.likes * 12)}</Text>
      </View>
      <View style={tc.userRow}>
        <Image source={{ uri: item.user.avatar || 'https://i.pravatar.cc/100' }} style={tc.avatar} />
        <Text style={tc.usernameText} numberOfLines={1}>{item.user.username}</Text>
      </View>
    </View>
  </TouchableOpacity>
));

const tc = StyleSheet.create({
  overlayInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 6, gap: 4,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statsText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '500' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avatar: { width: 14, height: 14, borderRadius: 7, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)' },
  usernameText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '400', flex: 1 },
});

// ─── Tam Ekran Kaydırmalı Oynatıcı ────────────────────────────────────
const COMMENT_H = 66;
function FullscreenPlayer({ visible, videos, startIndex, onClose, onVideoSaved, onVideoLiked, onVideoCommented }: {
  visible: boolean; videos: VideoItem[]; startIndex: number; onClose: () => void;
  onVideoSaved?: Props['onVideoSaved'];
  onVideoLiked?: Props['onVideoLiked'];
  onVideoCommented?: Props['onVideoCommented'];
}) {
  const listRef = useRef<FlatList>(null);
  const [idx, setIdx] = useState(startIndex);
  const [showComments, setShowComments] = useState(false);
  const videoH = H - COMMENT_H;

  const onViewChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems[0]?.index != null) setIdx(viewableItems[0].index);
  }, []);
  const viewCfg = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const getLayout = useCallback((_: any, i: number) => ({ length: videoH, offset: videoH * i, index: i }), [videoH]);

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <View style={{ height: videoH }}>
      <VideoCard
        data={item} active={index === idx} height={videoH} preload={Math.abs(index - idx) <= 1}
        onVideoSaved={onVideoSaved} onVideoLiked={onVideoLiked} onVideoCommented={onVideoCommented} isAuthenticated={true}
      />
    </View>
  ), [idx, videoH, onVideoSaved, onVideoLiked, onVideoCommented]);

  const current = videos[idx];
  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <TouchableOpacity style={fp.closeBtn} onPress={onClose}>
          <View style={fp.closeBg}><Ionicons name="arrow-back" size={22} color="#fff" /></View>
        </TouchableOpacity>
        <View style={{ height: videoH }}>
          <FlatList
            ref={listRef}
            data={videos}
            renderItem={renderItem}
            keyExtractor={i => i.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={videoH}
            decelerationRate="fast"
            disableIntervalMomentum
            onViewableItemsChanged={onViewChange}
            viewabilityConfig={viewCfg}
            getItemLayout={getLayout}
            initialScrollIndex={startIndex}
            removeClippedSubviews={false}
            bounces={false}
            overScrollMode="never"
            onScrollToIndexFailed={() => { }}
          />
        </View>
        <TouchableOpacity style={fp.commentBar} onPress={() => setShowComments(true)}>
          <View style={fp.commentInner}>
            <TextInput
              style={fp.commentInput}
              placeholder="Yorum yap..."
              placeholderTextColor={Colors.textMuted}
              editable={false}
              pointerEvents="none"
            />
            <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>
        {current && (
          <CommentsModal
            visible={showComments}
            onClose={() => setShowComments(false)}
            videoId={current.id}
            commentCount={current.comments}
            onCommentAdded={c => onVideoCommented?.(current.id, c)}
          />
        )}
      </View>
    </Modal>
  );
}

const fp = StyleSheet.create({
  closeBtn: { position: 'absolute', top: 52, left: 14, zIndex: 100 },
  closeBg: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  commentBar: {
    height: COMMENT_H, backgroundColor: Colors.surface,
    paddingHorizontal: 14, justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  commentInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  commentInput: { flex: 1, fontSize: 14, color: Colors.text },
});


// ─── Zengin Mock Veri (UI Testi İçin) ──────────────────────────────────
const MOCK_EXPLORE_VIDEOS: VideoItem[] = [
  // #komedi
  { id: 'm1', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u1', username: 'hasan_gul', avatar: 'https://i.pravatar.cc/100?img=1' }, description: 'Arkadaşlarla hafta sonu 😂', topic: '#komedi', likes: 14500, comments: 230, shares: 12, isLiked: false, isSaved: false },
  { id: 'm2', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u2', username: 'komedi_dunyasi', avatar: 'https://i.pravatar.cc/100?img=2' }, description: 'Kopeğimin tepkisi efsane', topic: '#komedi', likes: 8900, comments: 140, shares: 45, isLiked: false, isSaved: false },
  { id: 'm3', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u3', username: 'mizah_adam', avatar: 'https://i.pravatar.cc/100?img=3' }, description: 'Sınavdan sonra ben', topic: '#komedi', likes: 3200, comments: 50, shares: 8, isLiked: false, isSaved: false },
  { id: 'm4', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u4', username: 'ayse_komik', avatar: 'https://i.pravatar.cc/100?img=4' }, description: 'Ev hali', topic: '#komedi', likes: 4500, comments: 80, shares: 15, isLiked: false, isSaved: false },

  // #spor
  { id: 's1', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u5', username: 'fit_boy', avatar: 'https://i.pravatar.cc/100?img=5' }, description: 'Bacak günü! Yok böyle acı 🦵🔥', topic: '#spor', likes: 21000, comments: 400, shares: 200, isLiked: false, isSaved: false },
  { id: 's2', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u6', username: 'basket_tr', avatar: 'https://i.pravatar.cc/100?img=6' }, description: 'Son saniye basketi', topic: '#spor', likes: 18000, comments: 300, shares: 150, isLiked: false, isSaved: false },
  { id: 's3', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u7', username: 'gym_girl', avatar: 'https://i.pravatar.cc/100?img=7' }, description: 'Sabah koşusu', topic: '#spor', likes: 5600, comments: 120, shares: 30, isLiked: false, isSaved: false },

  // #dans
  { id: 'd1', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u8', username: 'dance_machine', avatar: 'https://i.pravatar.cc/100?img=8' }, description: 'Yeni trend dansı denedik 🕺💃', topic: '#dans', likes: 45000, comments: 1000, shares: 500, isLiked: false, isSaved: false },
  { id: 'd2', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u9', username: 'hiphop_crew', avatar: 'https://i.pravatar.cc/100?img=9' }, description: 'Sokak stili', topic: '#dans', likes: 12000, comments: 200, shares: 80, isLiked: false, isSaved: false },

  // #teknoloji
  { id: 't1', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u10', username: 'tech_guru', avatar: 'https://i.pravatar.cc/100?img=10' }, description: 'Yeni telefonu inceledik! 📱', topic: '#teknoloji', likes: 8900, comments: 450, shares: 100, isLiked: false, isSaved: false },
  { id: 't2', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u11', username: 'kodlama_101', avatar: 'https://i.pravatar.cc/100?img=11' }, description: '5 dakikada app yapımı', topic: '#teknoloji', likes: 11000, comments: 300, shares: 250, isLiked: false, isSaved: false },
  { id: 't3', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u12', username: 'ai_gelecek', avatar: 'https://i.pravatar.cc/100?img=12' }, description: 'Yapay zeka devrimi', topic: '#teknoloji', likes: 15600, comments: 800, shares: 600, isLiked: false, isSaved: false },

  // #seyahat
  { id: 'se1', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u13', username: 'gezgin_kiz', avatar: 'https://i.pravatar.cc/100?img=13' }, description: 'Bali günlüklerim 🌴', topic: '#seyahat', likes: 32000, comments: 800, shares: 400, isLiked: false, isSaved: false },
  { id: 'se2', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u14', username: 'doga_sever', avatar: 'https://i.pravatar.cc/100?img=14' }, description: 'Karadeniz kampı', topic: '#seyahat', likes: 24000, comments: 600, shares: 300, isLiked: false, isSaved: false },
];

export default function InspirationScreen({
  isActive = false, videos = [], onVideoSaved, onVideoLiked, onVideoCommented,
}: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('kesfet');
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerVideos, setPlayerVideos] = useState<VideoItem[]>([]);
  const [playerStart, setPlayerStart] = useState(0);

  // Group videos by topic/tag
  const groupedVideos = useMemo(() => {
    // Props olarak gelen video listesi boşsa veya çok azsa MOCK_EXPLORE_VIDEOS kullan.
    let list = videos.length > 3 ? [...videos, ...MOCK_EXPLORE_VIDEOS] : [...MOCK_EXPLORE_VIDEOS];

    // Shuffle the mock items slightly so it looks dynamic
    list = list.sort((a, b) => a.id.localeCompare(b.id));

    if (activeTab !== 'kesfet') {
      list = list.filter(v =>
      (v.topic?.toLowerCase().includes(activeTab) ||
        v.description?.toLowerCase().includes(activeTab))
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.description?.toLowerCase().includes(q) ||
        v.user.username?.toLowerCase().includes(q) ||
        v.topic?.toLowerCase().includes(q)
      );
    }

    const map = new Map<string, VideoItem[]>();
    list.forEach(v => {
      // '#' işaretini düzelt
      let topic = v.topic || '#Genel';
      if (!topic.startsWith('#')) topic = '#' + topic;

      if (!map.has(topic)) map.set(topic, []);
      map.get(topic)!.push(v);
    });

    return Array.from(map.entries()).map(([topic, data]) => ({
      topic,
      count: data.length,
      data
    })).sort((a, b) => b.count - a.count); // Büyük gruplar üstte
  }, [videos, search]);

  const openPlayer = useCallback((groupVideos: VideoItem[], idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayerVideos(groupVideos);
    setPlayerStart(idx);
    setPlayerVisible(true);
  }, []);

  return (
    <View style={s.container}>
      {/* Search Header */}
      <View style={s.searchContainer}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Etiket veya içerik ara..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories (Tabs) */}
      <View style={s.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tabChip, active && s.tabChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
              >
                <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Horizontal Carousel List */}
      {groupedVideos.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="film-outline" size={48} color={Colors.textDim} />
          <Text style={s.emptyTitle}>
            {search ? `"${search}" bulunamadı` : 'Henüz içerik yok'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {groupedVideos.map((group, groupIndex) => (
            <View key={groupIndex} style={s.section}>

              {/* Section Header: Tag, Count, See All */}
              <View style={s.sectionHeader}>
                <View style={s.sectionTitleRow}>
                  <Text style={s.sectionTitle}>#{group.topic.toLowerCase()}</Text>
                  <Text style={s.sectionCount}>{group.count} video</Text>
                </View>
                <TouchableOpacity style={s.seeAllBtn}>
                  <Text style={s.seeAllText}>Tümünü Gör</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Horizontal Scroll (Carousel) */}
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={group.data}
                keyExtractor={item => item.id}
                renderItem={({ item, index }) => (
                  <VThumb
                    item={item}
                    isFirst={index === 0}
                    isLast={index === group.data.length - 1}
                    onPress={() => openPlayer(group.data, index)}
                  />
                )}
                // Snapping for smooth modern scroll
                snapToInterval={CARD_W + GAP}
                decelerationRate="fast"
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Play Video Fullscreen */}
      {playerVisible && (
        <FullscreenPlayer
          visible={playerVisible}
          videos={playerVideos}
          startIndex={playerStart}
          onClose={() => setPlayerVisible(false)}
          onVideoSaved={onVideoSaved}
          onVideoLiked={onVideoLiked}
          onVideoCommented={onVideoCommented}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Search
  searchContainer: {
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 0,
    backgroundColor: Colors.surface,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8, paddingHorizontal: 12, height: 36,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text, paddingVertical: 0 },

  // Tabs
  tabsWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    paddingBottom: 2,
    marginTop: 8,
  },
  tabsContent: { paddingHorizontal: 16, gap: 16, flexDirection: 'row' },
  tabChip: { paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabChipActive: { borderBottomColor: Colors.text },
  tabLabel: { fontSize: 12, fontWeight: '400', color: Colors.textSecondary },
  tabLabelActive: { color: Colors.text, fontWeight: '600' },

  // Sections
  section: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
  },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingBottom: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
});
