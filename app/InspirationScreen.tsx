import VideoPlayerModal from '@/components/VideoPlayerModal';
import Colors from '@/constants/Colors';
import { useVideoPlayer as usePlayerModal } from '@/hooks/useVideoPlayer';
import { supabase } from '@/lib/supabase';
import { fetchExploreVideos } from '@/services/videoService';
import { useDebounce } from '@/hooks/useDebounce';
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
  isBackgrounded?: boolean;
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







// ─── Main ───────────────────────────────────────────────────
export default function InspirationScreen({
  isActive = false,
  videos = [],
  videosLoading = false,
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  onUserPress,
  onRefresh,
  refreshing = false,
  isBackgrounded = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  // ── Video player modal — useVideoPlayer hook (replaces 3 manual states)
  const player = usePlayerModal();
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

  const debouncedSearch = useDebounce(search, 300);

  const loadExplore = useCallback(async (topic: string, sq?: string, reset = false) => {
    setExploreLoading(true);
    try {
      const result = await fetchExploreVideos({
        topic,
        searchQuery: sq,
        cursor: reset ? undefined : exploreNextCursor ?? undefined,
        limit: 18, // 6 rows of 3 — reduced from 30 to save bandwidth
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

  // Reload when filter or debouncedSearch changes
  useEffect(() => {
    loadExplore(filter, debouncedSearch, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedSearch]);

  const allVideos = useMemo(() => {
    // Prefer explore videos from DB; fall back to parent-passed videos if explore is empty
    return exploreVideos.length > 0 ? exploreVideos : videos;
  }, [exploreVideos, videos]);

  const openPlayer = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    player.open(allVideos, idx);
  }, [allVideos, player]);

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
        visible={player.visible}
        videos={player.videos}
        startIndex={player.startIndex}
        onClose={player.close}
        mode="explore"
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
        onUserPress={onUserPress}
        isBackgrounded={isBackgrounded}
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
