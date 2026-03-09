import VideoPlayerModal from '@/components/VideoPlayerModal';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { fetchExploreVideos } from '@/services/videoService';
import { VideoItem } from '@/types/video';
import { formatNumber } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


const { width: W, height: H } = Dimensions.get('window');

// ─── Grid Layout ─────────────────────────────────────────────
const GRID_GAP = 1.5;
const COLS = 3;
const TILE_W = (W - GRID_GAP * (COLS - 1)) / COLS;
const TILE_H = TILE_W * 1.4;
const SPONSOR_ROW = 2; // Insert sponsor slider after this many grid rows (0-indexed)

// ─── Sponsored Banner Seed ─────────────────────────────────────
// Banner data now fetched from sponsor_banners table (see useEffect inside InspirationScreen)


// ─── YouTube-style filter chips ──────────────────────────────
const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'trend', label: 'Trendler' },
  { key: 'muzik', label: 'Müzik' },
  { key: 'spor', label: 'Spor' },
  { key: 'komedi', label: 'Komedi' },
  { key: 'dans', label: 'Dans' },
  { key: 'teknoloji', label: 'Teknoloji' },
  { key: 'yemek', label: 'Yemek' },
  { key: 'sanat', label: 'Sanat' },
  { key: 'seyahat', label: 'Seyahat' },
];

type Props = {
  isActive?: boolean;
  videos?: VideoItem[];
  onVideoSaved?: (id: string, isSaved: boolean) => void;
  onVideoLiked?: (id: string, isLiked: boolean, count: number) => void;
  onVideoCommented?: (id: string, count: number) => void;
  onUserPress?: (userId: string) => void;
  videosLoading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

// ─── Grid Tile ──────────────────────────────────────────────
const GridTile = React.memo(({ item, onPress }: {
  item: VideoItem; onPress: () => void;
}) => (
  <TouchableOpacity style={tc.tile} onPress={onPress} activeOpacity={0.9}>
    {/* FIX: expo-image instead of expo-av Video — eliminates native video decoder per tile */}
    {/* Each Video decoder = 5–15MB; 30 tiles = 150–450MB. expo-image uses shared cached memory */}
    <Image
      // ✅ FIXED: Never use user avatar as video thumbnail fallback.
      // thumbnail_url is the correct field; if absent show a neutral placeholder.
      source={{ uri: item.thumbnail_url ?? '' }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
    // Gray placeholder rendered by expo-image when url is empty string
    />
    {/* Play indicator overlay */}
    <View style={tc.playOverlay} pointerEvents="none">
      <Ionicons name="play" size={16} color="rgba(255,255,255,0.85)" />
    </View>
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.5)']}
      style={tc.gradient}
      pointerEvents="none"
    />
    <View style={tc.viewCount}>
      <Ionicons name="heart" size={9} color="#fff" />
      <Text style={tc.viewText}>{formatNumber(item.likes)}</Text>
    </View>
  </TouchableOpacity>
));

const tc = StyleSheet.create({
  tile: {
    width: TILE_W,
    height: TILE_H,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
  },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  viewCount: {
    position: 'absolute', bottom: 4, left: 5,
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  viewText: {
    color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold',
  },
});

// ─── Banner Slider ───────────────────────────────────────
function BannerSlider({ data }: { data: any[] }) {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const updateSync = () => {
      if (!data || data.length === 0) return;
      const now = Date.now();
      const currentWindow = Math.floor(now / 5000);
      const index = currentWindow % data.length;

      listRef.current?.scrollToOffset({
        offset: index * W,
        animated: true
      });
    };

    updateSync();
    const timer = setInterval(updateSync, 1000);
    return () => clearInterval(timer);
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <View style={sp.wrap}>
      <FlatList
        ref={listRef}
        data={data}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 0 }}
        style={{ width: W }}
        initialScrollIndex={Math.floor(Date.now() / 5000) % data.length}
        onScrollToIndexFailed={() => { }}
        getItemLayout={(_, index) => ({
          length: W,
          offset: W * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={sp.slide}>
            {/* FIX: expo-image instead of expo-av Video in banner slider — image is sufficient */}
            <Image
              source={item.image}
              style={[StyleSheet.absoluteFill, { width: W }]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={sp.gradient}
            />
            <View style={sp.badge}>
              <Text style={sp.badgeText}>SPONSORLU</Text>
            </View>
            <View style={sp.textOverlay}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={sp.brand}>{item.brand}</Text>
                <Text style={sp.title} numberOfLines={1}>{item.title}</Text>
              </View>
              <TouchableOpacity style={sp.ctaBtn} activeOpacity={0.8}>
                <Text style={sp.ctaText}>İncele</Text>
                <Ionicons name="open-outline" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const sp = StyleSheet.create({
  wrap: {
    height: TILE_H,
    marginBottom: GRID_GAP,
    width: W,
  },
  slide: {
    width: W,
    height: TILE_H,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  badge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff', fontSize: 8, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5,
  },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
  },
  textOverlay: {
    position: 'absolute', bottom: 8, left: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  brand: {
    color: 'rgba(255,255,255,0.9)', fontSize: 10, fontFamily: 'Poppins_500Medium',
    marginBottom: 2,
  },
  title: {
    color: '#fff', fontSize: 13, fontFamily: 'Poppins_700Bold',
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.4)',
  },
  ctaText: {
    color: '#fff', fontSize: 11, fontFamily: 'Poppins_600SemiBold',
  },
});




// ─── Mock Data ──────────────────────────────────────────────
const MOCK_BASE: VideoItem[] = [
  { id: 'm1', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u1', username: 'hasan_gul', avatar: 'https://i.pravatar.cc/100?img=1' }, description: 'Arkadaşlarla hafta sonu 😂', topic: '#komedi', likes: 14500, comments: 230, shares: 12, isLiked: false, isSaved: false },
  { id: 'm2', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u2', username: 'komedi_dunyasi', avatar: 'https://i.pravatar.cc/100?img=2' }, description: 'Köpeğimin tepkisi efsane', topic: '#komedi', likes: 8900, comments: 140, shares: 45, isLiked: false, isSaved: false },
  { id: 'm3', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u3', username: 'mizah_adam', avatar: 'https://i.pravatar.cc/100?img=3' }, description: 'Sınavdan sonra ben', topic: '#komedi', likes: 3200, comments: 50, shares: 8, isLiked: false, isSaved: false },
  { id: 'm4', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u4', username: 'ayse_komik', avatar: 'https://i.pravatar.cc/100?img=4' }, description: 'Ev hali', topic: '#komedi', likes: 4500, comments: 80, shares: 15, isLiked: false, isSaved: false },
  { id: 's1', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u5', username: 'fit_boy', avatar: 'https://i.pravatar.cc/100?img=5' }, description: 'Bacak günü! 🦵🔥', topic: '#spor', likes: 21000, comments: 400, shares: 200, isLiked: false, isSaved: false },
  { id: 's2', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u6', username: 'basket_tr', avatar: 'https://i.pravatar.cc/100?img=6' }, description: 'Son saniye basketi', topic: '#spor', likes: 18000, comments: 300, shares: 150, isLiked: false, isSaved: false },
  { id: 's3', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u7', username: 'gym_girl', avatar: 'https://i.pravatar.cc/100?img=7' }, description: 'Sabah koşusu', topic: '#spor', likes: 5600, comments: 120, shares: 30, isLiked: false, isSaved: false },
  { id: 'd1', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u8', username: 'dance_machine', avatar: 'https://i.pravatar.cc/100?img=8' }, description: 'Yeni trend dans 🕺💃', topic: '#dans', likes: 45000, comments: 1000, shares: 500, isLiked: false, isSaved: false },
  { id: 'd2', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u9', username: 'hiphop_crew', avatar: 'https://i.pravatar.cc/100?img=9' }, description: 'Sokak stili', topic: '#dans', likes: 12000, comments: 200, shares: 80, isLiked: false, isSaved: false },
  { id: 't1', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u10', username: 'tech_guru', avatar: 'https://i.pravatar.cc/100?img=10' }, description: 'Yeni telefon inceleme 📱', topic: '#teknoloji', likes: 8900, comments: 450, shares: 100, isLiked: false, isSaved: false },
  { id: 't2', uri: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4', user: { id: 'u11', username: 'kodlama_101', avatar: 'https://i.pravatar.cc/100?img=11' }, description: '5 dakikada app yapımı', topic: '#teknoloji', likes: 11000, comments: 300, shares: 250, isLiked: false, isSaved: false },
  { id: 't3', uri: 'https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4', user: { id: 'u12', username: 'ai_gelecek', avatar: 'https://i.pravatar.cc/100?img=12' }, description: 'Yapay zeka devrimi', topic: '#teknoloji', likes: 15600, comments: 800, shares: 600, isLiked: false, isSaved: false },
  { id: 'se1', uri: 'https://videos.pexels.com/video-files/2495382/2495382-uhd_2560_1440_25fps.mp4', user: { id: 'u13', username: 'gezgin_kiz', avatar: 'https://i.pravatar.cc/100?img=13' }, description: 'Bali günlüklerim 🌴', topic: '#seyahat', likes: 32000, comments: 800, shares: 400, isLiked: false, isSaved: false },
  { id: 'se2', uri: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_25fps.mp4', user: { id: 'u14', username: 'doga_sever', avatar: 'https://i.pravatar.cc/100?img=14' }, description: 'Karadeniz kampı', topic: '#seyahat', likes: 24000, comments: 600, shares: 300, isLiked: false, isSaved: false },
];

// Satırları doldurabilmek için mock veriyi çokladık (en az 50 öğe olmalı ki 13 satır dolabilsin)
const MOCK: VideoItem[] = Array.from({ length: 90 }, (_, i) => {
  const base = MOCK_BASE[i % MOCK_BASE.length];
  return { ...base, id: `${base.id}-${i}` };
});


// ─── Main ───────────────────────────────────────────────────
export default function InspirationScreen({
  isActive = false, videos = [], videosLoading = false, onVideoSaved, onVideoLiked, onVideoCommented, onUserPress, onRefresh, refreshing = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerVideos, setPlayerVideos] = useState<VideoItem[]>([]);
  const [playerStart, setPlayerStart] = useState(0);
  // Real sponsor banners from DB
  const [dbBanners, setDbBanners] = useState<any[]>([]);

  // Fetch sponsor banners from DB on mount
  useEffect(() => {
    (supabase as any).from('sponsor_banners')
      .select('id, title, subtitle, image_url, brand, cta_text, target_url, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          setDbBanners(data.map((b: any) => ({
            id: b.id,
            image: b.image_url,
            title: b.title,
            brand: b.brand || b.subtitle || '',
          })));
        }
      });
  }, []);

  const secondaryBanners = useMemo(() => dbBanners.slice(0, 10), [dbBanners]);
  const thirdBanners = useMemo(() => dbBanners.slice(10), [dbBanners]);

  // ─── Client-side explore data management ───────────────────────────────────
  const [exploreVideos, setExploreVideos] = useState<VideoItem[]>([]);
  const [exploreNextCursor, setExploreNextCursor] = useState<string | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);

  const loadExplore = useCallback(async (topic: string, reset = false) => {
    setExploreLoading(true);
    try {
      const result = await fetchExploreVideos({
        topic,
        cursor: reset ? undefined : exploreNextCursor ?? undefined,
        limit: 30,
      });
      if (reset) {
        setExploreVideos(result.items);
      } else {
        setExploreVideos((prev) => [
          ...prev,
          ...result.items.filter((v) => !prev.find((p) => p.id === v.id)),
        ]);
      }
      setExploreNextCursor(result.nextCursor);
    } catch (e) {
      if (__DEV__) console.warn('[InspirationScreen] explore fetch error:', e);
    } finally {
      setExploreLoading(false);
    }
  }, [exploreNextCursor]);

  // Reload when filter changes
  useEffect(() => {
    loadExplore(filter, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const allVideos = useMemo(() => {
    // Prefer explore videos from DB; fall back to parent-passed videos if explore is empty
    const base = exploreVideos.length > 0 ? exploreVideos : videos;

    let list = [...base];

    // Apply search filter on top of already topic-filtered results from DB
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.description?.toLowerCase().includes(q) ||
        v.user.username?.toLowerCase().includes(q) ||
        v.topic?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [exploreVideos, videos, search]);

  const openPlayer = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlayerVideos(allVideos);
    setPlayerStart(idx);
    setPlayerVisible(true);
  }, [allVideos]);

  // Build grid rows of 3
  const rows = useMemo(() => {
    const result: VideoItem[][] = [];
    for (let i = 0; i < allVideos.length; i += COLS) {
      result.push(allVideos.slice(i, i + COLS));
    }
    return result;
  }, [allVideos]);

  return (
    <View style={s.container}>
      {/* ─── Search ─── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Ara..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── YouTube-style filter chips ─── */}
      <View style={s.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsInner}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter(f.key);
                }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Instagram-style 3-col Grid ─── */}
      {allVideos.length === 0 ? (
        videosLoading ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 0 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
              {Array.from({ length: 15 }).map((_, i) => (
                <View key={i} style={{ width: TILE_W, height: TILE_H }}>
                  {/* We use SkeletonLoader internally if available, otherwise just grey box */}
                  <View style={{ flex: 1, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 3 }} />
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.textDim} />
            <Text style={s.emptyTitle}>
              {search ? `"${search}" bulunamadı` : 'Henüz içerik yok'}
            </Text>
          </View>
        )
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
          contentContainerStyle={{ padding: 0 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
        >
          {rows.map((row, ri) => (
            <React.Fragment key={`frag-${ri}`}>
              <View style={s.gridRow}>
                {row.map((item, ci) => (
                  <GridTile
                    key={item.id}
                    item={item}
                    onPress={() => openPlayer(ri * COLS + ci)}
                  />
                ))}
                {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                  <View key={`empty-${i}`} style={{ width: TILE_W, height: TILE_H }} />
                ))}
              </View>
              {ri === SPONSOR_ROW && <BannerSlider data={dbBanners.slice(0, 7)} />}
              {ri === SPONSOR_ROW + 5 && <BannerSlider data={secondaryBanners} />}
              {ri === SPONSOR_ROW + 13 && <BannerSlider data={thirdBanners} />}
            </React.Fragment>
          ))}
        </ScrollView>
      )}

      {/* ─── Shared Video Player Modal ─── */}
      <VideoPlayerModal
        visible={playerVisible}
        videos={playerVideos}
        startIndex={playerStart}
        onClose={() => setPlayerVisible(false)}
        mode="explore"
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
        onUserPress={onUserPress}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Search
  searchWrap: {
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6,
    backgroundColor: Colors.surface,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8, paddingHorizontal: 12, height: 36,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text, paddingVertical: 0, fontFamily: 'Poppins_400Regular' },

  // YouTube-style chips
  chipsWrap: {
    backgroundColor: Colors.surface,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  chipsInner: {
    paddingHorizontal: 14, gap: 6, flexDirection: 'row', alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  chipText: {
    fontSize: 13, fontFamily: 'Poppins_500Medium', color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff', fontFamily: 'Poppins_600SemiBold',
  },

  // Grid
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // Empty
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingBottom: 60,
  },
  emptyTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: Colors.textMuted },
});
