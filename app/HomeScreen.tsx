import CommentsModal from '@/components/CommentsModal';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewToken,
} from 'react-native';

import { formatNumber } from '@/utils/format';

const { width: W } = Dimensions.get('window');
const NAVBAR_H = 50;

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

interface Props {
  isActive?: boolean;
  onUserPress?: (id: string) => void;
  videos?: VideoItem[];
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
  refreshKey?: number;
}

// Format numbers - use utility
const fmt = formatNumber;

// Action button
const ActionBtn = memo(({ name, count, color, onPress }: { name: string; count?: number; color?: string; onPress?: () => void }) => (
  <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={name as any} size={28} color={color || '#fff'} />
    {count !== undefined && <Text style={styles.actionTxt}>{fmt(count)}</Text>}
  </TouchableOpacity>
));

// Single video card with preloading support
export const VideoCard = memo(({ 
  data, 
  active, 
  preload = false, // Preload next/prev videos for instant playback
  height,
  onUserPress,
  onVideoSaved,
  onVideoLiked,
  onVideoCommented,
  overlayBottomPadding = 20,
  showCommentInput = false,
  onCommentInputPress,
}: { 
  data: VideoItem; 
  active: boolean; 
  preload?: boolean;
  height: number;
  onUserPress?: (id: string) => void;
  onVideoSaved?: (videoId: string, isSaved: boolean) => void;
  onVideoLiked?: (videoId: string, isLiked: boolean, newLikeCount: number) => void;
  onVideoCommented?: (videoId: string, newCommentCount: number) => void;
  overlayBottomPadding?: number;
  showCommentInput?: boolean;
  onCommentInputPress?: () => void;
}) => {
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [liked, setLiked] = useState(data.isLiked);
  const [saved, setSaved] = useState(data.isSaved);
  const [likes, setLikes] = useState(data.likes);
  const [expanded, setExpanded] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const lastTap = useRef(0);
  const likeScale = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(1)).current;

  // Like animation - hızlı gel, 1sn bekle, hemen git
  const triggerLikeAnim = useCallback(() => {
    // Haptic feedback - premium UX
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setShowLikeAnim(true);
    likeScale.setValue(0);
    likeOpacity.setValue(1);
    
    // Hızlı gel
    Animated.spring(likeScale, {
      toValue: 1,
      tension: 200,
      friction: 6,
      useNativeDriver: true,
    }).start();
    
    // 1 saniye bekle, sonra hemen git
    setTimeout(() => {
      Animated.timing(likeOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setShowLikeAnim(false);
        likeScale.setValue(0);
        likeOpacity.setValue(1);
      });
    }, 1000);
  }, [likeScale, likeOpacity]);

  // Video play/pause control - aktif videoda otomatik oynat
  useEffect(() => {
    if (!videoRef.current) return;
    if (active && !isPaused) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [active, isPaused]);

  // Tap handler
  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap = like + animation
      if (!liked) {
        const newLikes = likes + 1;
        setLiked(true);
        setLikes(newLikes);
        onVideoLiked?.(data.id, true, newLikes);
      }
      triggerLikeAnim();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          setIsPaused(p => !p);
        }
      }, 300);
    }
  }, [liked, triggerLikeAnim]);

  const toggleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLiked = !liked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    setLiked(newLiked);
    setLikes(newLikes);
    // Global state güncelle
    onVideoLiked?.(data.id, newLiked, newLikes);
  }, [liked, likes, data.id, onVideoLiked]);

  const needsMore = data.description.length > 35;

  return (
    <View style={[styles.card, { height }]}>
      {/* Video */}
      <TouchableWithoutFeedback onPress={onTap}>
        <View style={styles.videoWrap}>
          <Video
            ref={videoRef}
            source={{ uri: data.uri }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay={active && !isPaused}
            isLooping
            isMuted={false}
            // Preload: video loads but doesn't play until active
            usePoster={preload && !active}
            posterStyle={styles.video}
          />
          
          {/* Play icon when paused */}
          {isPaused && (
            <View style={styles.playWrap}>
              <View style={styles.playBtn}>
                <Ionicons name="play" size={40} color="#fff" />
              </View>
            </View>
          )}

          {/* Like animation */}
          {showLikeAnim && (
            <Animated.View style={[styles.likeAnim, { transform: [{ scale: likeScale }], opacity: likeOpacity }]}>
              <Ionicons name="heart" size={120} color="#fff" />
            </Animated.View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Overlay - only on active */}
      {active && (
        <View style={[styles.overlay, { paddingBottom: overlayBottomPadding }]}>
          {/* Gradient for text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
            pointerEvents="none"
          />

          {/* Info - solda */}
          <View style={styles.info}>
            <View style={styles.userRow}>
              <TouchableOpacity onPress={() => onUserPress?.(data.user.id)} activeOpacity={0.8}>
                <Image source={{ uri: data.user.avatar }} style={styles.avatar} contentFit="cover" transition={200} />
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <TouchableOpacity onPress={() => onUserPress?.(data.user.id)} activeOpacity={0.8} style={styles.usernameContainer}>
                    <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">@{data.user.username}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.followBtn} 
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setFollowing(!following);
                    }}
                  >
                    <Text style={styles.followTxt}>{following ? 'Takip Ediliyor' : 'Takip Et'}</Text>
                  </TouchableOpacity>
                </View>
                {data.topic && <Text style={styles.topic}>{data.topic}</Text>}
              </View>
            </View>
            <Text style={styles.desc} numberOfLines={expanded ? 4 : 1}>
              {expanded ? data.description : data.description.slice(0, 35)}{!expanded && needsMore && '...'}
              {needsMore && (
                <Text style={styles.more} onPress={() => setExpanded(e => !e)}>
                  {' '}{expanded ? 'kapat' : 'dahası'}
                </Text>
              )}
            </Text>
          </View>

          {/* Actions - sağda */}
          <View style={styles.actions}>
            <ActionBtn name={liked ? 'heart' : 'heart-outline'} count={likes} color={liked ? '#FF2D55' : '#fff'} onPress={toggleLike} />
            <ActionBtn name="chatbubble" count={data.comments} onPress={() => setShowComments(true)} />
            <ActionBtn 
              name="bookmark" 
              color={saved ? '#FFD60A' : '#fff'} 
              onPress={() => {
                const newSaved = !saved;
                setSaved(newSaved);
                if (onVideoSaved) {
                  onVideoSaved(data.id, newSaved);
                }
              }} 
            />
            <ActionBtn 
              name="arrow-redo" 
              count={data.shares} 
              onPress={async () => {
                try {
                  await Share.share({
                    message: `${data.user.username}'in videosuna göz at! 🎬\n${data.description}`,
                    title: 'Video Paylaş',
                  });
                } catch (error) {
                  // Kullanıcı iptal etti
                }
              }}
            />
          </View>
        </View>
      )}

      {/* Comments Modal */}
      <CommentsModal 
        visible={showComments} 
        onClose={() => setShowComments(false)} 
        videoId={data.id} 
        commentCount={data.comments}
        onCommentAdded={(newCount) => onVideoCommented?.(data.id, newCount)}
      />
    </View>
  );
}, (prev, next) => 
  prev.data.id === next.data.id && 
  prev.active === next.active && 
  prev.preload === next.preload &&
  prev.height === next.height &&
  prev.overlayBottomPadding === next.overlayBottomPadding &&
  prev.showCommentInput === next.showCommentInput &&
  prev.data.isLiked === next.data.isLiked &&
  prev.data.isSaved === next.data.isSaved &&
  prev.data.likes === next.data.likes &&
  prev.data.comments === next.data.comments
);

export default function HomeScreen({ isActive = true, videos = [], onUserPress, onVideoSaved, onVideoLiked, onVideoCommented, refreshKey }: Props) {
  const [idx, setIdx] = useState(0);
  const [h, setH] = useState(Dimensions.get('window').height - NAVBAR_H);
  const flatListRef = useRef<FlatList>(null);

  // Home butonuna tıklanınca en üste scroll
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      setIdx(0);
    }
  }, [refreshKey]);

  const onViewChange = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIdx(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const getLayout = useCallback((_: any, i: number) => ({ length: h, offset: h * i, index: i }), [h]);
  const keyExt = useCallback((item: VideoItem) => item.id, []);

  const renderItem = useCallback(({ item, index }: { item: VideoItem; index: number }) => {
    const isActiveItem = isActive && index === idx;
    // Preload adjacent videos (prev and next)
    const shouldPreload = isActive && (index === idx - 1 || index === idx + 1);
    
    return (
      <VideoCard 
        data={item} 
        active={isActiveItem} 
        preload={shouldPreload}
        height={h} 
        onUserPress={onUserPress}
        onVideoSaved={onVideoSaved}
        onVideoLiked={onVideoLiked}
        onVideoCommented={onVideoCommented}
      />
    );
  }, [isActive, idx, h, onUserPress, onVideoSaved, onVideoLiked, onVideoCommented]);

  if (!videos.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="videocam-off-outline" size={48} color="#333" />
        <Text style={styles.emptyTxt}>Henüz video yok</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={keyExt}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={h}
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
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: '#444', fontSize: 14, marginTop: 8 },
  card: { width: W, backgroundColor: '#000' },
  videoWrap: { flex: 1 },
  video: { flex: 1 },
  playWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 20, paddingHorizontal: 12 },
  gradient: { ...StyleSheet.absoluteFillObject },
  info: { flex: 1, marginRight: 14, zIndex: 1 },
  actions: { alignItems: 'center', gap: 20, zIndex: 1 },
  action: { alignItems: 'center', gap: 4 },
  actionTxt: { color: '#fff', fontSize: 12, fontWeight: '600', fontFamily: 'GlacialIndifference-Regular' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#fff' },
  userInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  usernameContainer: { flexShrink: 1, minWidth: 0 },
  username: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'GlacialIndifference-Regular' },
  followBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, backgroundColor: 'rgba(255, 255, 255, 0.2)', flexShrink: 0, marginLeft: 5 },
  followTxt: { color: '#fff', fontSize: 12, fontWeight: '600', fontFamily: 'GlacialIndifference-Regular' },
  topic: { color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: 'GlacialIndifference-Regular' },
  desc: { color: '#fff', fontSize: 13, lineHeight: 18, fontFamily: 'GlacialIndifference-Regular' },
  more: { color: '#888', fontSize: 13, fontWeight: '600', fontFamily: 'GlacialIndifference-Regular' },
  likeAnim: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 10 },
});
