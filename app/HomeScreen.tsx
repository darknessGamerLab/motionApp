/**
 * HomeScreen — TikTok benzeri dikey video feed
 * FlashList ile yüksek performanslı, misafir korumalı
 */
import CommentsModal from '@/components/CommentsModal';
import GuestAuthModal from '@/components/GuestAuthModal';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatNumber } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActionSheetIOS, Alert, Animated,
  Dimensions, Platform, Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewToken
} from 'react-native';

const { width: W, height: FULL_H } = Dimensions.get('window');
const fmt = formatNumber;

// ─── Types ───────────────────────────────────────────────────────────
export interface VideoItem {
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

interface HomeScreenProps {
  isActive?: boolean;
  isAuthenticated?: boolean;
  videos?: VideoItem[];
  onUserPress?: (id: string) => void;
  onVideoSaved?: (id: string, isSaved: boolean) => void;
  onVideoLiked?: (id: string, isLiked: boolean, likes: number) => void;
  onVideoCommented?: (id: string, comments: number) => void;
  onRefresh?: () => void;
  onEndReached?: () => void;
  refreshKey?: number;
}

// ─── Action Button ────────────────────────────────────────────────────
const ActionBtn = memo(({
  icon, filledIcon, count, color, active, onPress,
}: {
  icon: string;
  filledIcon?: string;
  count?: number;
  color?: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity style={s.actionBtn} onPress={onPress} activeOpacity={0.75}>
    <Ionicons
      name={(active && filledIcon ? filledIcon : icon) as any}
      size={30}
      color={color || '#fff'}
    />
    {count !== undefined && (
      <Text style={s.actionCount}>{fmt(count)}</Text>
    )}
  </TouchableOpacity>
));

// ─── Video Card ───────────────────────────────────────────────────────
export const VideoCard = memo(({
  data,
  active,
  preload = false,
  height,
  isAuthenticated = false,
  onUserPress,
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  onAuthRequired,
}: {
  data: VideoItem;
  active: boolean;
  preload?: boolean;
  height: number;
  isAuthenticated?: boolean;
  onUserPress?: (id: string) => void;
  onVideoSaved?: (id: string, isSaved: boolean) => void;
  onVideoLiked?: (id: string, isLiked: boolean, likes: number) => void;
  onVideoCommented?: (id: string, comments: number) => void;
  onAuthRequired?: (action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general') => void;
}) => {
  const { authState } = useAuth();
  const vidRef = useRef<Video>(null);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(data.isLiked);
  const [saved, setSaved] = useState(data.isSaved);
  const [likes, setLikes] = useState(data.likes);
  const [following, setFollowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const lastTap = useRef(0);

  // Like animation
  const likeAnim = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;

  // Sync with prop changes (e.g. from Realtime or other parent updates)
  useEffect(() => {
    setLikes(data.likes);
    setLiked(data.isLiked);
  }, [data.id, data.likes, data.isLiked]);

  const triggerLikeAnim = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    likeAnim.setValue(0.3);
    likeOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(likeAnim, { toValue: 1, tension: 180, friction: 6, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.timing(likeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        likeAnim.setValue(0);
      });
    }, 900);
  }, [likeAnim, likeOpacity]);

  // Play/pause control
  useEffect(() => {
    if (!vidRef.current) return;
    if (active && !paused) {
      vidRef.current.playAsync().catch(() => { });
      vidRef.current.setIsMutedAsync(false).catch(() => { });
    } else {
      vidRef.current.pauseAsync().catch(() => { });
      vidRef.current.setIsMutedAsync(true).catch(() => { });
    }
  }, [active, paused]);

  // Auth guard
  const guard = useCallback((
    action: 'like' | 'comment' | 'save' | 'follow',
    fn: () => void
  ) => {
    if (!isAuthenticated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onAuthRequired?.(action);
      return;
    }
    fn();
  }, [isAuthenticated, onAuthRequired]);

  // Tap: single = pause, double = like
  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (!isAuthenticated) { onAuthRequired?.('like'); return; }
      if (!liked) {
        const n = likes + 1;
        setLiked(true);
        setLikes(n);
        onVideoLiked?.(data.id, true, n);
      }
      triggerLikeAnim();
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) setPaused(p => !p);
      }, 290);
    }
  }, [liked, likes, isAuthenticated, onAuthRequired, triggerLikeAnim, data.id, onVideoLiked]);

  const toggleLike = useCallback(() => {
    guard('like', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isNowLiked = !liked;
      const n = isNowLiked ? likes + 1 : likes - 1;

      // SALİSELİK update: UI state directly
      setLiked(isNowLiked);
      setLikes(n);

      // Let the parent update in background
      onVideoLiked?.(data.id, isNowLiked, n);
    });
  }, [liked, likes, data.id, guard, onVideoLiked]);

  const toggleSave = useCallback(() => {
    guard('save', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSaved(s => { onVideoSaved?.(data.id, !s); return !s; });
    });
  }, [data.id, guard, onVideoSaved]);

  const openComments = useCallback(() => {
    guard('comment', () => setShowComments(true));
  }, [guard]);

  const followUser = useCallback(() => {
    guard('follow', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setFollowing(f => !f);
    });
  }, [guard]);

  const reportVideo = async (reason: string) => {
    if (!authState.user) {
      onAuthRequired?.('general');
      return;
    }
    // UUID format check to prevent "invalid input syntax for type uuid"
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(data.id)) {
      Alert.alert('Bilgi', 'Bu örnek içerik şu an raporlanamaz.');
      return;
    }

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: authState.user.id,
        target_type: 'content' as 'content',
        target_id: data.id,
        reason: reason,
        status: 'pending' as 'pending'
      });
      if (error) throw error;
      Alert.alert('Bildirildi', 'Bu içerik şikayetiniz üzerine incelenmeye alınmıştır.');
    } catch (err) {
      console.error('Video report error:', err);
      Alert.alert('Hata', 'Rapor gönderilemedi.');
    }
  };

  const onReportPress = () => {
    const reasons = ['Spam', 'Uygunsuz İçerik', 'Telif Hakkı', 'Zorbalık', 'Diğer'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Vazgeç', ...reasons],
          cancelButtonIndex: 0,
          destructiveButtonIndex: reasons.indexOf('Uygunsuz İçerik') + 1,
          title: 'İçeriği Şikayet Et'
        },
        index => { if (index > 0) reportVideo(reasons[index - 1]); }
      );
    } else {
      Alert.alert('Şikayet Et', 'Neden şikayet ediyorsunuz?', [
        { text: 'Vazgeç', style: 'cancel' },
        ...reasons.map(r => ({ text: r, onPress: () => reportVideo(r) }))
      ]);
    }
  };

  const needsMore = data.description.length > 40;

  return (
    <View style={[s.card, { height }]}>
      {/* Video */}
      <TouchableWithoutFeedback onPress={onTap}>
        <View style={StyleSheet.absoluteFill}>
          <Video
            ref={vidRef}
            source={{ uri: data.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={active && !paused}
            isLooping
            isMuted={!active} // Kesin kontrol: Sadece aktifse sesi ver
            usePoster={true} // Her zaman poster kullan ki geç yüklemelerde siyah ekran kalmasın
            posterSource={{ uri: data.user.avatar || 'https://i.pravatar.cc/100' }} // Geçici poster

          />
          {/* Pause icon */}
          {paused && (
            <View style={s.pauseOverlay}>
              <View style={s.pauseCircle}>
                <Ionicons name="play" size={36} color="#fff" />
              </View>
            </View>
          )}
          {/* Heart animation */}
          <Animated.View
            style={[s.likeAnim, {
              transform: [{ scale: likeAnim }],
              opacity: likeOpacity,
            }]}
            pointerEvents="none"
          >
            <Ionicons name="heart" size={100} color="rgba(255,255,255,0.95)" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Gradient + overlay — ALWAYS rendered, pointer/opacity controlled by active */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
        style={s.gradient}
        pointerEvents="none"
      />
      <View style={[s.overlay, { opacity: active ? 1 : 0 }]} pointerEvents={active ? 'box-none' : 'none'}>
        {/* Left: user info + description */}
        <View style={s.left}>
          {/* User row */}
          <View style={s.userRow}>
            <TouchableOpacity onPress={() => onUserPress?.(data.user.id)} activeOpacity={0.8}>
              <Image
                source={{ uri: data.user.avatar || 'https://i.pravatar.cc/100' }}
                style={s.avatar}
                contentFit="cover"
                transition={150}
              />
            </TouchableOpacity>
            <View style={s.userMeta}>
              <TouchableOpacity onPress={() => onUserPress?.(data.user.id)}>
                <Text style={s.username} numberOfLines={1}>@{data.user.username}</Text>
              </TouchableOpacity>
              {data.topic && <Text style={s.topic}>{data.topic}</Text>}
            </View>
            <TouchableOpacity
              style={[s.followBtn, following && s.followBtnActive]}
              onPress={followUser}
            >
              <Text style={[s.followTxt, following && s.followTxtActive]}>
                {following ? 'Takip' : 'Takip Et'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={s.desc} numberOfLines={expanded ? 4 : 1}>
            {expanded ? data.description : data.description.slice(0, 40)}
            {!expanded && needsMore && '...'}
            {needsMore && (
              <Text style={s.more} onPress={() => setExpanded(e => !e)}>
                {' '}{expanded ? 'kapat' : 'daha fazla'}
              </Text>
            )}
          </Text>
        </View>

        {/* Right: action buttons */}
        <View style={s.actions}>
          <ActionBtn
            icon="heart-outline"
            filledIcon="heart"
            count={likes}
            color={liked ? '#FF3B5C' : '#fff'}
            active={liked}
            onPress={toggleLike}
          />
          <ActionBtn
            icon="chatbubble-ellipses-outline"
            count={data.comments}
            onPress={openComments}
          />
          <ActionBtn
            icon="bookmark-outline"
            filledIcon="bookmark"
            color={saved ? Colors.save : '#fff'}
            active={saved}
            onPress={toggleSave}
          />
          <ActionBtn
            icon="arrow-redo-outline"
            count={data.shares}
            onPress={async () => {
              try {
                await Share.share({ message: `${data.user.username}'in videosuna göz at! 🎬\n${data.description}` });
              } catch { }
            }}
          />
          <ActionBtn
            icon="flag-outline"
            color="rgba(255,255,255,0.6)"
            onPress={onReportPress}
          />
        </View>
      </View>

      {/* Comments */}
      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        videoId={data.id}
        commentCount={data.comments}
        onCommentAdded={count => onVideoCommented?.(data.id, count)}
      />
    </View>
  );
}, (prev, next) =>
  prev.data.id === next.data.id &&
  prev.active === next.active &&
  prev.preload === next.preload &&
  prev.height === next.height &&
  prev.isAuthenticated === next.isAuthenticated &&
  prev.data.isLiked === next.data.isLiked &&
  prev.data.isSaved === next.data.isSaved &&
  prev.data.likes === next.data.likes &&
  prev.data.comments === next.data.comments
);

// ─── HomeScreen ───────────────────────────────────────────────────────
export default function HomeScreen({
  isActive = false,
  isAuthenticated = false,
  videos = [],
  onUserPress,
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  onRefresh,
  onEndReached,
  refreshKey = 0
}: HomeScreenProps) {
  const [flatListRef, setFlatListRef] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [h, setH] = useState(FULL_H);
  const [refreshing, setRefreshing] = useState(false);
  const [guestModal, setGuestModal] = useState<{
    visible: boolean;
    action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general';
  }>({ visible: false, action: 'general' });

  // Scroll to top when refreshKey changes (Home tab basıldığında)
  useEffect(() => {
    if (flatListRef && refreshKey > 0) {
      flatListRef.scrollToIndex({ index: 0, animated: true });
    }
  }, [refreshKey, flatListRef]);

  const onRefreshFeed = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRefresh?.(); // parent'ta videos'u shuffle eder
    setTimeout(() => {
      setIdx(0);
      flatListRef?.scrollToOffset({ offset: 0, animated: false });
      setRefreshing(false);
    }, 800);
  }, [onRefresh, flatListRef]);

  const onViewChange = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
      setIdx(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ itemVisiblePercentThreshold: 70 }).current; // Daha geç tetiklesin ki ses hemen girmesin

  const showGuestModal = useCallback((action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general') => {
    setGuestModal({ visible: true, action });
  }, []);

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <VideoCard
      data={item}
      active={isActive && index === idx}
      preload={isActive && Math.abs(index - idx) <= 1} // Hem üst hem alt video preload edilsin
      height={h}
      isAuthenticated={isAuthenticated}
      onUserPress={onUserPress}
      onVideoSaved={onVideoSaved}
      onVideoLiked={onVideoLiked}
      onVideoCommented={onVideoCommented}
      onAuthRequired={showGuestModal}
    />
  ), [isActive, idx, h, isAuthenticated, onUserPress, onVideoSaved, onVideoLiked, onVideoCommented, showGuestModal]);

  if (!videos.length) {
    return (
      <View style={[s.container, s.empty]}>
        <Ionicons name="film-outline" size={48} color={Colors.textDim} />
        <Text style={s.emptyText}>Henüz video yok</Text>
      </View>
    );
  }

  return (
    <View
      style={s.container}
      onLayout={e => setH(e.nativeEvent.layout.height)}
    >
      <FlashList
        ref={setFlatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        snapToInterval={h}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewChange}
        viewabilityConfig={viewConfig}
        removeClippedSubviews={false} // Android'deki ani kararmaları engeller
        drawDistance={h * 2} // Preload tamponunu büyüttük (takılmaları önler)
        bounces={true}
        refreshing={refreshing}
        onRefresh={onRefreshFeed}
        overScrollMode="always"
      />
      <GuestAuthModal
        visible={guestModal.visible}
        action={guestModal.action}
        onClose={() => setGuestModal(p => ({ ...p, visible: false }))}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14, marginTop: 10 },

  // Card
  card: { width: W, backgroundColor: '#000', overflow: 'hidden' },

  // Pause
  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pauseCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingLeft: 4,
  },

  // Like anim
  likeAnim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },

  // Gradient
  gradient: { ...StyleSheet.absoluteFillObject },

  // Overlay layout
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 24,
    paddingHorizontal: 14,
  },

  // Left side
  left: { flex: 1, marginRight: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)',
  },
  userMeta: { flex: 1, minWidth: 0 },
  username: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  topic: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  followBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)',
  },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'transparent' },
  followTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  followTxtActive: { color: 'rgba(255,255,255,0.7)' },
  desc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18 },
  more: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  // Right side
  actions: { alignItems: 'center', gap: 18 },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '600' },
  save: { color: Colors.save },
});

