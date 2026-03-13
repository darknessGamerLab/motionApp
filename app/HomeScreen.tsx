/**
 * HomeScreen — Production-Grade TikTok/Shorts style vertical feed
 *
 * ARCHITECTURE (matches TikTok / YouTube Shorts patterns)
 * ─────────────────────────────────────────────────────────────────────
 * • Playback is driven from the LIST level, not per-card.
 *   activeIdx + feedActive + paused are the single source of truth.
 *
 * • Per-card VideoPlayer (expo-video):
 *   - Every card always has a player initialized with its REAL URI.
 *   - This lets ExoPlayer's MediaSource pre-buffer the next item while
 *     the current one is playing (same as YouTube's approach).
 *   - URI-change (FlashList cell recycling) triggers replaceAsync.
 *   - active/paused changes NEVER call replaceAsync — only play/pause.
 *
 * • Thumbnail crossfade:
 *   - Thumbnail is rendered ABOVE VideoView.
 *   - Fades to 0 once replaceAsync resolves (first frame decoded).
 *   - Prevents black frames during load.
 *
 * • FlashList tuning:
 *   - drawDistance = screenHeight so prev+next cells are mounted.
 *   - removeClippedSubviews = false (VideoView must stay alive off-screen).
 *   - itemVisiblePercentThreshold = 70 for reliable active index detection.
 *   - pagingEnabled + snapToInterval for full-screen paging.
 *
 * • Zero overlay pop-in:
 *   Overlay is a plain View (not Animated.View), always visible.
 *   It travels with the card during scroll, no sudden appearance.
 */

import CommentsModal from '@/components/CommentsModal';
import EmptyState from '@/components/EmptyState';
import GuestAuthModal from '@/components/GuestAuthModal';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { VideoItem } from '@/types/video';
import { formatNumber, getOptimizedImageUrl } from '@/utils/format';
import { isValidUUID } from '@/utils/validate';

import ActionBtn from '@/components/ActionBtn';
import { CustomAlert as Alert } from '@/components/GlobalAlert';
import VideoProgressBar from '@/components/VideoProgressBar';
import { reportUser } from '@/services/interactionService';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActionSheetIOS,
  Animated,
  Dimensions,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewToken
} from 'react-native';

const { width: W, height: FULL_H } = Dimensions.get('window');
const fmt = formatNumber;

// ─── HomeScreen Props ─────────────────────────────────────────────────
interface HomeScreenProps {
  isActive?: boolean;
  isAuthenticated?: boolean;
  videos?: VideoItem[];
  videosLoading?: boolean;
  /** true when last fetch failed (network error) — show retry instead of empty */
  fetchError?: boolean;
  onUserPress?: (id: string) => void;
  onUserFollowed?: (id: string, isFollowing: boolean) => void;
  onVideoSaved?: (id: string, isSaved: boolean) => void;
  onVideoLiked?: (id: string, isLiked: boolean, likes: number) => void;
  onVideoCommented?: (id: string, comments: number) => void;
  onVideoShared?: (id: string, shares: number) => void;
  onRefresh?: () => void;
  onEndReached?: () => void;
  refreshKey?: number;
  onAuthRequired?: (action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general') => void;
  startIndex?: number;
  /** When true, the report (flag) button is hidden for all cards — used in own-profile mode */
  hideReport?: boolean;
  /** Called whenever the visible video index changes — used by VideoPlayerModal to open correct CommentsModal */
  onActiveIndexChange?: (index: number) => void;
  /** When true (app minimized or screen off), pause all videos */
  isBackgrounded?: boolean;
}


// ─── VideoCard ────────────────────────────────────────────────────────
/**
 * VideoCard owns a single VideoPlayer (expo-video).
 *
 * Playback contract:
 *   active=true  → play (unmuted)
 *   active=false → pause (muted), thumbnail resets for re-entry
 *   paused=true  → pause WITHOUT touching source (no restart)
 *   uri change   → replaceAsync only (handles FlashList recycling)
 */
export const VideoCard = memo(({
  data,
  active,
  paused,
  height,
  isAuthenticated = false,
  hideReport = false,
  onUserPress,
  onUserFollowed,
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  onVideoShared,
  onAuthRequired,
  onTogglePause,
}: {
  data: VideoItem;
  active: boolean;
  paused: boolean;
  height: number;
  isAuthenticated?: boolean;
  hideReport?: boolean;
  onUserPress?: (id: string) => void;
  onUserFollowed?: (userId: string, isFollowing: boolean) => void;
  onVideoSaved?: (id: string, isSaved: boolean) => void;
  onVideoLiked?: (id: string, isLiked: boolean, likes: number) => void;
  onVideoCommented?: (id: string, comments: number) => void;
  onVideoShared?: (id: string, shares: number) => void;
  onAuthRequired?: (action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general') => void;
  onTogglePause?: () => void;
}) => {
  const { authState } = useAuth();
  const [liked, setLiked] = useState(data.isLiked);
  const [saved, setSaved] = useState(data.isSaved);
  const [likes, setLikes] = useState(data.likes);
  const [shares, setShares] = useState(data.shares);
  const [following, setFollowing] = useState(!!data.isFollowing);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const isCorporateViewer = authState.profile?.user_type === 'corporate';

  // ─── Sync Local State to Props for Realtime Updates ─────────────────
  useEffect(() => { setLiked(data.isLiked); setLikes(data.likes); }, [data.isLiked, data.likes]);
  useEffect(() => { setSaved(data.isSaved); }, [data.isSaved]);
  useEffect(() => { setShares(data.shares); }, [data.shares]);
  useEffect(() => { setFollowing(!!data.isFollowing); }, [data.isFollowing]);

  // Thumbnail sits on top of VideoView, fades to 0 when first frame is ready
  const thumbnailOpacity = useRef(new Animated.Value(1)).current;
  const likeAnim = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous URI so we only replace when URI actually changes
  // (FlashList can recycle this cell for a different video)
  const prevUriRef = useRef(data.uri);

  // ─── expo-video player ──────────────────────────────────────────────
  // HACK: FlashList recycles components. If we pass `data.uri` directly,
  // useVideoPlayer destroys the player and re-allocates a new one, causing
  // "Cannot set prop player on view: already released" Android native crashes.
  // Instead, we pass an unchanging `initialUri` and manually call `.replace(uri)`!
  const [initialUri] = useState(data.uri);
  const player = useVideoPlayer(initialUri, p => {
    p.loop = true;
    p.muted = true;   // unmuted only when active
    // Don't play on init — Effect 1 controls playback
  });

  // Crossfade helper
  const fadeOutThumbnail = useCallback(() => {
    Animated.timing(thumbnailOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [thumbnailOpacity]);

  // ─── Effect: URI change via recycling ───────────────────────────────
  useEffect(() => {
    if (prevUriRef.current === data.uri) return;
    prevUriRef.current = data.uri;
    thumbnailOpacity.setValue(1);
    try {
      player.replace(data.uri);
      if (active && !paused) {
        player.play();
        fadeOutThumbnail();
      }
    } catch (e) {
      // safe fallback if replacement race condition occurs
    }
  }, [data.uri, player, active, paused, fadeOutThumbnail]);

  // ─── Video progress bar ─────────────────────────────────────────────
  const [progress, setProgress] = useState(0); // 0–1
  useEffect(() => {
    if (!active) { setProgress(0); return; }
    // Poll via player status — expo-video fires timeUpdate events
    const sub = player.addListener('timeUpdate', (e: any) => {
      const dur = player.duration;
      if (dur && dur > 0) setProgress(e.currentTime / dur);
    });
    return () => sub?.remove?.();
  }, [active, player]);

  // ─── Effect: active state (visibility) ─────────────────────────────
  // Controls whether this card plays or pauses.
  // Does NOT touch the source — only play/pause + mute + thumbnail.
  useEffect(() => {
    if (active) {
      player.muted = false;
      if (!paused) {
        player.play();
        fadeOutThumbnail();
      }
    } else {
      player.pause();
      player.muted = true;
      thumbnailOpacity.setValue(1); // reset for next visit
      setExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]); // paused excluded — handled by Effect 3

  // ─── Effect: paused prop (tap to pause) ────────────────────────────
  // Only play/pause. NEVER replaceAsync. This is the fix for restart-on-pause.
  useEffect(() => {
    if (!active) return;
    if (paused) {
      player.pause();
    } else {
      player.play();
      fadeOutThumbnail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]); // active excluded intentionally

  // ─── Cleanup tap timer on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (tapTimer.current !== null) { clearTimeout(tapTimer.current); tapTimer.current = null; }
    };
  }, []);

  // ─── Sync parent data updates (like/follow realtime) ───────────────
  useEffect(() => {
    setLikes(data.likes);
    setLiked(data.isLiked);
    setShares(data.shares);
    setFollowing(!!data.isFollowing);
  }, [data.id, data.likes, data.isLiked, data.shares, data.isFollowing]);

  // ─── Auth guard ─────────────────────────────────────────────────────
  const guard = useCallback((action: 'like' | 'comment' | 'save' | 'follow', fn: () => void) => {
    if (!isAuthenticated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onAuthRequired?.(action);
      return;
    }
    fn();
  }, [isAuthenticated, onAuthRequired]);

  // ─── Like animation ─────────────────────────────────────────────────
  const triggerLikeAnim = useCallback(() => {
    likeAnim.setValue(0.3);
    likeOpacity.setValue(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(likeAnim, { toValue: 1, tension: 180, friction: 6, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(likeOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
        .start(() => likeAnim.setValue(0));
    }, 900);
  }, [likeAnim, likeOpacity]);

  // ─── Tap handler (single = pause, double = like) ────────────────────
  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (tapTimer.current !== null) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      if (!isAuthenticated) { onAuthRequired?.('like'); return; }
      if (!liked) {
        const n = likes + 1;
        setLiked(true); setLikes(n);
        onVideoLiked?.(data.id, true, n);
      }
      triggerLikeAnim();
    } else {
      lastTap.current = now;
      if (tapTimer.current !== null) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        if (lastTap.current === now) onTogglePause?.();
      }, 290);
    }
  }, [liked, likes, isAuthenticated, onAuthRequired, triggerLikeAnim, data.id, onVideoLiked, onTogglePause]);

  const toggleLike = useCallback(() => {
    guard('like', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isNowLiked = !liked;
      const n = isNowLiked ? likes + 1 : likes - 1;
      setLiked(isNowLiked); setLikes(n);
      onVideoLiked?.(data.id, isNowLiked, n);
    });
  }, [liked, likes, data.id, guard, onVideoLiked]);

  const toggleSave = useCallback(() => {
    guard('save', () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSaved(sv => { onVideoSaved?.(data.id, !sv); return !sv; });
    });
  }, [data.id, guard, onVideoSaved]);

  const handleShare = useCallback(async () => {
    try {
      const res = await Share.share({ message: `${data.user.username}'in videosuna göz at! 🎬\n${data.description}` });
      if (res.action === Share.sharedAction) {
        setShares(s => {
          const newS = s + 1;
          onVideoShared?.(data.id, newS);
          return newS;
        });
      }
    } catch { }
  }, [data.id, data.user.username, data.description, onVideoShared]);

  const openComments = useCallback(() => guard('comment', () => setShowComments(true)), [guard]);

  const isOwnVideo = authState.user?.id && authState.user.id === data.user.id;

  const followUser = useCallback(() => {
    if (isOwnVideo) return;
    if (!isValidUUID(data.user.id)) { Alert.alert('Bilgi', 'Örnek bir kullanıcı takip edilemez.'); return; }
    guard('follow', () => {
      isCorporateViewer
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const isNowFollowing = !following;
      setFollowing(isNowFollowing);
      onUserFollowed?.(data.user.id, isNowFollowing);
    });
  }, [guard, following, isCorporateViewer, data.user.id, onUserFollowed, isOwnVideo]);

  const reportVideo = async (reason: string) => {
    if (!authState.user) { onAuthRequired?.('general'); return; }
    if (!isValidUUID(data.id)) { Alert.alert('Bilgi', 'Bu örnek içerik şu an raporlanamaz.'); return; }
    try {
      await reportUser(authState.user.id, data.id, reason);
      Alert.alert('Bildirildi', 'Bu içerik şikayetiniz üzerine incelenmeye alınmıştır.');
    } catch { Alert.alert('Hata', 'Rapor gönderilemedi.'); }
  };

  const onReportPress = () => {
    const reasons = ['Spam', 'Uygunsuz İçerik', 'Telif Hakkı', 'Zorbalık', 'Diğer'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Vazgeç', ...reasons], cancelButtonIndex: 0, destructiveButtonIndex: 2, title: 'İçeriği Şikayet Et' },
        i => { if (i > 0) reportVideo(reasons[i - 1]); }
      );
    } else {
      Alert.alert('Şikayet Et', 'Neden şikayet ediyorsunuz?', [
        { text: 'Vazgeç', style: 'cancel' },
        ...reasons.map(r => ({ text: r, onPress: () => reportVideo(r) }))
      ]);
    }
  };

  const needsMore = data.description.length > 40;

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <View style={[s.card, { height }]}>
      <View style={StyleSheet.absoluteFill}>
        {/* VideoView: always rendered, ExoPlayer stays alive for buffering */}
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Thumbnail: renders on top, crossfades out when video ready */}
        {data.thumbnail_url ? (
          <Animated.Image
            source={{ uri: data.thumbnail_url }}
            style={[StyleSheet.absoluteFill, { opacity: thumbnailOpacity }]}
            resizeMode="cover"
          />
        ) : null}

        {/* Transparent Overlay for Touch Events (Android VideoView bug fix) */}
        <TouchableWithoutFeedback onPress={onTap}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Pause indicator */}
        {paused && active && (
          <View style={s.pauseOverlay} pointerEvents="none">
            <View style={s.pauseCircle}>
              <Ionicons name="play" size={36} color="#fff" />
            </View>
          </View>
        )}

        {/* Double-tap like heart */}
        <Animated.View
          style={[s.likeAnim, { transform: [{ scale: likeAnim }], opacity: likeOpacity }]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={100} color="rgba(255,255,255,0.95)" />
        </Animated.View>
      </View>

      {/* Gradient scrim */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.72)']}
        style={s.gradient}
        pointerEvents="none"
      />

      {/* Overlay — plain View, always visible, no pop-in animation */}
      <View style={s.overlay} pointerEvents={active ? 'box-none' : 'none'}>
        {/* Left: user info + description */}
        <View style={s.left}>
          <View style={s.userRow}>
            <TouchableOpacity onPress={() => onUserPress?.(data.user.id)} activeOpacity={0.8}>
              <Image
                source={{ uri: getOptimizedImageUrl(data.user.avatar, 100, 85) ?? data.user.avatar ?? 'https://i.pravatar.cc/100' }}
                style={s.avatar}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
            <View style={s.userMeta}>
              <TouchableOpacity onPress={() => onUserPress?.(data.user.id)}>
                <Text style={s.username} numberOfLines={1}>@{data.user.username}</Text>
              </TouchableOpacity>
              {data.topic && <Text style={s.topic}>{data.topic}</Text>}
            </View>
            {!isOwnVideo && (
              <TouchableOpacity style={[s.followBtn, following && s.followBtnActive]} onPress={followUser}>
                {isCorporateViewer ? (
                  <>
                    <Ionicons name={following ? 'radio' : 'radio-outline'} size={12} color={following ? 'rgba(255,255,255,0.6)' : '#fff'} />
                    <Text style={[s.followTxt, following && s.followTxtActive]}>{following ? 'Radarda' : 'Radara Al'}</Text>
                  </>
                ) : (
                  following
                    ? <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.6)" />
                    : <Text style={s.followTxt}>Takip Et</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {!!data.description && (
            <Text style={s.desc} numberOfLines={expanded ? 4 : 1}>
              {expanded ? data.description : data.description.slice(0, 40)}
              {!expanded && needsMore && '...'}
              {needsMore && (
                <Text style={s.more} onPress={() => setExpanded(e => !e)}>
                  {' '}{expanded ? 'kapat' : 'daha fazla'}
                </Text>
              )}
            </Text>
          )}
        </View>

        {/* Right: action buttons */}
        <View style={s.actions}>
          <ActionBtn icon="heart-outline" filledIcon="heart" count={likes} color={liked ? '#FF3B5C' : '#fff'} active={liked} onPress={toggleLike} />
          <ActionBtn icon="chatbubble-ellipses-outline" count={data.comments} onPress={openComments} />
          <ActionBtn icon="bookmark-outline" filledIcon="bookmark" color={saved ? Colors.save : '#fff'} active={saved} onPress={toggleSave} />
          <ActionBtn
            icon="arrow-redo-outline"
            count={shares}
            onPress={handleShare}
          />
          {!isOwnVideo && !hideReport && (
            <ActionBtn icon="flag-outline" color="rgba(255,255,255,0.6)" onPress={onReportPress} />
          )}
        </View>
      </View>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        videoId={data.id}
        commentCount={data.comments}
        onCommentAdded={count => onVideoCommented?.(data.id, count)}
      />

      {/* Video progress bar — using extracted VideoProgressBar component */}
      {active && <VideoProgressBar progress={progress} />}
    </View>
  );
}, (prev, next) =>
  prev.data.id === next.data.id &&
  prev.data.uri === next.data.uri &&
  prev.active === next.active &&
  prev.paused === next.paused &&
  prev.height === next.height &&
  prev.isAuthenticated === next.isAuthenticated &&
  prev.data.isLiked === next.data.isLiked &&
  prev.data.isSaved === next.data.isSaved &&
  prev.data.likes === next.data.likes &&
  prev.data.comments === next.data.comments &&
  prev.data.isFollowing === next.data.isFollowing
);

// ─── HomeScreen ──────────────────────────────────────────────────────
export default function HomeScreen({
  isActive = false,
  isAuthenticated = false,
  videos = [],
  videosLoading = false,
  fetchError = false,
  onUserPress,
  onUserFollowed,
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  onVideoShared,
  onRefresh,
  onEndReached,
  refreshKey = 0,
  onAuthRequired,
  startIndex = 0,
  hideReport = false,
  onActiveIndexChange,
  isBackgrounded = false,
}: HomeScreenProps) {
  // Stable ref so onViewChange (which is itself a ref) always calls the latest callback
  const onActiveIndexChangeRef = useRef(onActiveIndexChange);
  useEffect(() => { onActiveIndexChangeRef.current = onActiveIndexChange; }, [onActiveIndexChange]);
  const listRef = useRef<any>(null);
  const [h, setH] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Active index (source of truth for which video plays) ────────────
  // Using a ref + state: ref for immediate read inside callbacks,
  // state for triggering re-renders when the active card changes.
  const activeIdxRef = useRef(startIndex);
  const [activeIdx, setActiveIdx] = useState(startIndex);

  // ─── Paused state (tap to pause/resume) ─────────────────────────────
  const [paused, setPaused] = useState(false);

  const [guestModal, setGuestModal] = useState<{
    visible: boolean;
    action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general';
  }>({ visible: false, action: 'general' });

  // ─── Scroll to top on refreshKey change ─────────────────────────────
  useEffect(() => {
    if (listRef.current && refreshKey > 0) {
      listRef.current.scrollToIndex({ index: 0, animated: true });
    }
  }, [refreshKey]);

  // ─── Pull-to-refresh ────────────────────────────────────────────────
  const onRefreshFeed = useCallback(() => {
    setRefreshing(true);
    setPaused(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRefresh?.();
    setTimeout(() => {
      activeIdxRef.current = 0;
      setActiveIdx(0);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setRefreshing(false);
    }, 800);
  }, [onRefresh]);

  // ─── Viewability config ─────────────────────────────────────────────
  // 70% threshold: card must be 70% visible to be considered active.
  // Lower than 80% to handle fast scrollers who land between cards.
  const viewConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const onViewChange = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find(t => t.isViewable && t.index != null);
    if (!first || first.index == null) return;
    const newIdx = first.index;
    if (newIdx === activeIdxRef.current) return; // no op — same card
    activeIdxRef.current = newIdx;
    setActiveIdx(newIdx);
    setPaused(false); // always resume when a new video scrolls in
    onActiveIndexChangeRef.current?.(newIdx); // notify VideoPlayerModal
  }).current;

  // ─── Modals ──────────────────────────────────────────────────────────
  const showGuestModal = useCallback((action: 'like' | 'comment' | 'save' | 'follow' | 'create' | 'general') => {
    setGuestModal({ visible: true, action });
  }, []);

  const closeGuestModal = useCallback(() => {
    setGuestModal(p => ({ ...p, visible: false }));
  }, []);

  const togglePause = useCallback(() => setPaused(p => !p), []);

  // ─── renderItem ──────────────────────────────────────────────────────
  // key: isActive prop controls whether ANY video plays (tab visibility).
  // active: this specific card is the current one AND the tab is visible.
  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => (
    <VideoCard
      data={item}
      active={isActive && index === activeIdx && !isBackgrounded}
      paused={paused && index === activeIdx}
      height={h}
      isAuthenticated={isAuthenticated}
      hideReport={hideReport}
      onUserPress={onUserPress}
      onUserFollowed={onUserFollowed}
      onVideoSaved={onVideoSaved}
      onVideoLiked={onVideoLiked}
      onVideoCommented={onVideoCommented}
      onVideoShared={onVideoShared}
      onAuthRequired={showGuestModal}
      onTogglePause={togglePause}
    />
  ), [isActive, activeIdx, h, isAuthenticated, paused, hideReport, onUserPress, onUserFollowed, onVideoSaved, onVideoLiked, onVideoCommented, onVideoShared, showGuestModal, togglePause]);

  // ─── Loading / Empty states / Layout Buffer ────────────────────────
  if (h === 0 || (videosLoading && !videos.length)) {
    return (
      <View style={s.container} onLayout={e => setH(e.nativeEvent.layout.height)}>
        <SkeletonLoader.VideoCard height={h || FULL_H} />
      </View>
    );
  }

  if (fetchError && !videos.length) {
    // Network / server error — show retry action
    return (
      <View style={[s.container, s.empty]} onLayout={e => setH(e.nativeEvent.layout.height)}>
        <EmptyState
          icon="cloud-offline-outline"
          title="İçerikler yüklenemedi"
          subtitle="İnternet bağlantını kontrol et ve tekrar dene"
          ctaLabel="Yeniden Dene"
          onCtaPress={onRefresh}
        />
      </View>
    );
  }

  if (!videos.length) {
    // Genuinely empty feed (no error, no content yet)
    return (
      <View style={[s.container, s.empty]} onLayout={e => setH(e.nativeEvent.layout.height)}>
        <EmptyState
          icon="film-outline"
          title="Henüz video yok"
          subtitle="Topluluk büyüyor — yakında içerikler burada olacak"
        />
      </View>
    );
  }

  return (
    <View style={s.container} onLayout={e => setH(e.nativeEvent.layout.height)}>
      <FlashList
        ref={listRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={item => item.id}

        // ── Full-screen paging (TikTok style) ───────────────────────
        pagingEnabled
        snapToInterval={h}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        initialScrollIndex={startIndex}

        // ── Viewability ─────────────────────────────────────────────
        onViewableItemsChanged={onViewChange}
        viewabilityConfig={viewConfig}

        // ── Performance ─────────────────────────────────────────────
        // removeClippedSubviews=false: VideoView must stay mounted off-screen
        // so ExoPlayer keeps its buffer alive for instant next-card playback.
        removeClippedSubviews={false}
        // drawDistance={h * 2}: keep more items mounted for smoother scrolling
        drawDistance={h * 2}

        // estimatedItemSize: critical for FlashList calculation
        // @ts-ignore
        estimatedItemSize={h}

        // ── UX ──────────────────────────────────────────────────────
        showsVerticalScrollIndicator={false}
        bounces
        refreshing={refreshing}
        onRefresh={onRefreshFeed}
        overScrollMode="always"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}

        // Performance optimizations
        extraData={[activeIdx, paused, isActive]}
      />

      <GuestAuthModal
        visible={guestModal.visible}
        action={guestModal.action}
        onClose={closeGuestModal}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Poppins_400Regular', marginTop: 10 },

  card: { width: W, backgroundColor: '#000', overflow: 'hidden' },

  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pauseCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', paddingLeft: 4,
  },

  likeAnim: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  gradient: { ...StyleSheet.absoluteFillObject },
  progressTrack: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#fff',
  },

  // Overlay: plain View, not Animated — syncs with FlashList scroll naturally
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 30,
    paddingHorizontal: 14,
  },

  left: { flex: 1, marginRight: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.65)' },
  userMeta: { flex: 1, minWidth: 0 },
  username: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold', letterSpacing: -0.2 },
  topic: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 1 },
  followBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    minWidth: 32, justifyContent: 'center',
  },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'transparent' },
  followTxt: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  followTxtActive: { color: 'rgba(255,255,255,0.7)' },
  desc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, fontFamily: 'Poppins_400Regular' },
  more: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins_600SemiBold' },
  actions: { alignItems: 'center', gap: 18 },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionCount: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  save: { color: Colors.save },
});
