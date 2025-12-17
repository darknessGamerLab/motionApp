import { VerticalVideoPager, VerticalVideoPagerRef, VerticalVideoPagerHelpers } from '@/components/VerticalVideoPager';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, Animated as RNAnimated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * HomeScreen - Modern Video Feed
 */

interface VideoData {
  id: string;
  uri: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  description: string;
  soundName: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
}

const SAMPLE_VIDEOS: VideoData[] = [
  {
    id: '1',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    user: { id: 'user1', username: 'johndoe', avatar: 'https://i.pravatar.cc/150?img=1' },
    description: 'Amazing sunset view from the mountains! 🌄',
    soundName: 'Original Sound - johndoe',
    likes: 1250,
    comments: 45,
    shares: 23,
    isLiked: false,
    isSaved: false,
  },
  {
    id: '2',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    user: { id: 'user2', username: 'janedoe', avatar: 'https://i.pravatar.cc/150?img=2' },
    description: 'Check out this incredible animation! 🎬',
    soundName: 'Trending Sound #1',
    likes: 3420,
    comments: 89,
    shares: 56,
    isLiked: true,
    isSaved: false,
  },
  {
    id: '3',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: { id: 'user3', username: 'techguru', avatar: 'https://i.pravatar.cc/150?img=3' },
    description: 'Latest tech trends and innovations 💻',
    soundName: 'Electronic Vibes',
    likes: 890,
    comments: 23,
    shares: 12,
    isLiked: false,
    isSaved: true,
  },
  {
    id: '4',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    user: { id: 'user4', username: 'traveler', avatar: 'https://i.pravatar.cc/150?img=4' },
    description: 'Beautiful travel destinations around the world ✈️',
    soundName: 'Chill Beats',
    likes: 2150,
    comments: 67,
    shares: 34,
    isLiked: false,
    isSaved: false,
  },
  {
    id: '5',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    user: { id: 'user5', username: 'funnyguy', avatar: 'https://i.pravatar.cc/150?img=5' },
    description: 'Funny moments that will make you laugh! 😂',
    soundName: 'Comedy Gold Sound Pack',
    likes: 5670,
    comments: 234,
    shares: 89,
    isLiked: true,
    isSaved: false,
  },
];

interface HomeScreenProps {
  translateY: SharedValue<number>;
  currentVideoIndex: SharedValue<number>;
  onVideoChange?: (index: number) => void;
  isActive?: boolean;
  videoHeight: number;
  layoutReady: boolean;
  pageWidth: number;
  onUserPress?: (userId: string, username: string) => void;
  videos?: VideoData[]; // dışarıdan feed verebilmek için
}

// Like Animation
function LikeAnimation({ onComplete, x, y }: { onComplete?: () => void; x: number; y: number }) {
  const scale = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(scale, { toValue: 1.5, friction: 4, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start(() => onComplete?.());
  }, []);

  return (
    <RNAnimated.View
      style={[styles.likeAnimation, { left: x - 40, top: y - 40, transform: [{ scale }], opacity }]}
      pointerEvents="none"
    >
      <Ionicons name="heart" size={80} color="#FF3040" />
    </RNAnimated.View>
  );
}

// Video Overlay
function VideoOverlay({
  video,
  onShare,
  onSave,
  onComment,
  onFollow,
  onLikeRef,
  onUserPress,
}: {
  video: VideoData;
  onShare: () => void;
  onSave: () => void;
  onComment: () => void;
  onFollow: () => void;
  onLikeRef?: (fn: (x?: number, y?: number, isDoubleTap?: boolean) => void) => void;
  onUserPress?: (userId: string, username: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [isSaved, setIsSaved] = useState(video.isSaved);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [likeAnimations, setLikeAnimations] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const likeIdCounter = useRef(0);

  useEffect(() => {
    setIsLiked(video.isLiked);
    setIsSaved(video.isSaved);
    setLikeCount(video.likes);
    setLikeAnimations([]);
    setIsFollowing(false); // Yeni videoya geçince follow durumunu sıfırla
  }, [video.id]);

  const handleLike = useCallback((x?: number, y?: number, forceAdd?: boolean) => {
    // forceAdd true ise sadece beğeni yap (toggle yapma)
    if (forceAdd) {
      if (!isLiked) {
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
      // Her çift tıkta animasyon göster
      if (x !== undefined && y !== undefined) {
        const newId = likeIdCounter.current++;
        setLikeAnimations(prev => [...prev, { id: newId, x, y }]);
      }
    } else {
      // Normal buton tıklaması - toggle yap
      const newLiked = !isLiked;
      setIsLiked(newLiked);
      setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
      
      if (newLiked && x !== undefined && y !== undefined) {
        const newId = likeIdCounter.current++;
        setLikeAnimations(prev => [...prev, { id: newId, x, y }]);
      }
    }
  }, [isLiked]);

  const removeLikeAnimation = (id: number) => {
    setLikeAnimations(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    if (onLikeRef) {
      // Double-tap için özel fonksiyon - sadece beğeni yapar
      onLikeRef((x?: number, y?: number) => handleLike(x, y, true));
    }
  }, [onLikeRef, handleLike]);

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave();
  };

  return (
    <View style={styles.overlay}>
      {likeAnimations.map(anim => (
        <LikeAnimation key={anim.id} x={anim.x} y={anim.y} onComplete={() => removeLikeAnimation(anim.id)} />
      ))}

      {/* Right Actions */}
      <View style={[styles.rightActions, { bottom: insets.bottom + 5 }]}>
        {/* Like */}
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike()}>
            <Ionicons name={isLiked ? 'heart' : 'heart-sharp'} size={34} color={isLiked ? '#FF3040' : '#fff'} />
          </TouchableOpacity>
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </View>

        {/* Comment */}
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.actionButton} onPress={onComment}>
            <Ionicons name="chatbubble" size={30} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.actionCount}>{formatCount(video.comments)}</Text>
        </View>

        {/* Save */}
        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Ionicons name="bookmark" size={30} color={isSaved ? '#FFD700' : '#fff'} />
        </TouchableOpacity>

        {/* Share */}
        <View style={styles.actionGroup}>
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Ionicons name="arrow-redo" size={30} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.actionCount}>{formatCount(video.shares)}</Text>
        </View>
      </View>

      {/* Bottom Info */}
      <View style={[styles.bottomInfo, { bottom: insets.bottom + 5 }]}>
        {/* User Row - Avatar + Username + Follow button */}
        <View style={styles.userRow}>
          <TouchableOpacity onPress={() => onUserPress?.(video.user.id, video.user.username)} activeOpacity={0.7}>
            <Image source={{ uri: video.user.avatar }} style={styles.avatar} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onUserPress?.(video.user.id, video.user.username)} activeOpacity={0.7}>
            <Text style={styles.username}>@{video.user.username}</Text>
          </TouchableOpacity>
          {!isFollowing && (
            <TouchableOpacity 
              style={styles.followButton} 
              onPress={() => {
                setIsFollowing(true);
                onFollow();
              }}
            >
              <Text style={styles.followButtonText}>Takip Et</Text>
            </TouchableOpacity>
          )}
          {isFollowing && (
            <TouchableOpacity 
              style={styles.followedButton}
              onPress={() => {
                setIsFollowing(false);
              }}
            >
              <Text style={styles.followedButtonText}>Takip ediliyor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description with "more/close" link */}
        <View style={styles.descriptionRow}>
          <Text style={styles.description} numberOfLines={showFullDescription ? undefined : 1}>
            {video.description}
          </Text>
          {!showFullDescription && video.description.length > 40 && (
            <TouchableOpacity onPress={() => setShowFullDescription(true)}>
              <Text style={styles.moreLink}>dahası</Text>
            </TouchableOpacity>
          )}
          {showFullDescription && (
            <TouchableOpacity onPress={() => setShowFullDescription(false)}>
              <Text style={styles.closeLink}>kapat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function HomeScreen({
  translateY,
  currentVideoIndex,
  onVideoChange,
  isActive = true,
  videoHeight,
  layoutReady,
  pageWidth,
  onUserPress,
  videos,
}: HomeScreenProps) {
  // Dışarıdan video listesi geldiyse onu kullan, yoksa default SAMPLE_VIDEOS
  const displayVideos = useMemo(
    () => (videos && videos.length > 0 ? videos : SAMPLE_VIDEOS),
    [videos]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoPagerRef = useRef<VerticalVideoPagerRef>(null);
  const videoOverlayLikeRef = useRef<((x?: number, y?: number) => void) | null>(null);

  useAnimatedReaction(
    () => currentVideoIndex.value,
    (index) => {
      runOnJS(setCurrentIndex)(Math.round(index));
    }
  );

  const handleVideoChange = (index: number) => {
    setCurrentIndex(index);
    if (onVideoChange) onVideoChange(index);
  };

  const handleShare = () => console.log('Share');
  const handleSave = () => console.log('Save');
  const handleComment = () => console.log('Comment');
  const handleFollow = () => console.log('Follow');

  const handleTogglePlayPause = useCallback(() => {
    videoPagerRef.current?.togglePlayPause();
  }, []);

  const handleDoubleTapLike = useCallback((x: number, y: number) => {
    if (videoOverlayLikeRef.current) {
      videoOverlayLikeRef.current(x, y);
    }
  }, []);

  // Pan gesture for vertical scrolling
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((event) => {
        'worklet';
        VerticalVideoPagerHelpers.handleVerticalGesture(
          event.translationY - (event.translationY - event.changeY),
          event.velocityY,
          translateY,
          currentVideoIndex,
          displayVideos.length,
          videoHeight
        );
      })
      .onEnd((event) => {
        'worklet';
        VerticalVideoPagerHelpers.handleVerticalGestureEnd(
          event.velocityY,
          translateY,
          currentVideoIndex,
          displayVideos.length,
          videoHeight,
          onVideoChange
        );
      });
  }, [videoHeight, translateY, currentVideoIndex, onVideoChange, displayVideos.length]);

  const doubleTap = useMemo(() => {
    return Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((event) => {
        runOnJS(handleDoubleTapLike)(event.x, event.y);
      });
  }, [handleDoubleTapLike]);

  const singleTap = useMemo(() => {
    return Gesture.Tap()
      .numberOfTaps(1)
      .onEnd(() => {
        runOnJS(handleTogglePlayPause)();
      });
  }, [handleTogglePlayPause]);

  // Combine gestures: Pan for scrolling, Exclusive tap for play/pause and like
  const combinedGesture = useMemo(() => 
    Gesture.Simultaneous(
      panGesture,
      Gesture.Exclusive(doubleTap, singleTap)
    ),
    [panGesture, doubleTap, singleTap]
  );

  const currentVideo = displayVideos[currentIndex] || displayVideos[0];

  if (!layoutReady || videoHeight <= 0 || pageWidth <= 0) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <VerticalVideoPager
            ref={videoPagerRef}
            videos={displayVideos.map(v => ({ id: v.id, uri: v.uri }))}
            initialIndex={0}
            onVideoChange={handleVideoChange}
            translateY={translateY}
            currentIndex={currentVideoIndex}
            isActive={isActive}
            videoHeight={videoHeight}
            pageWidth={pageWidth}
          />
        </View>
      </GestureDetector>
      {layoutReady && (
        <VideoOverlay
          video={currentVideo}
          onShare={handleShare}
          onSave={handleSave}
          onComment={handleComment}
          onFollow={handleFollow}
          onLikeRef={useCallback((fn: (x?: number, y?: number) => void) => {
            videoOverlayLikeRef.current = fn;
          }, [])}
          onUserPress={onUserPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  rightActions: {
    position: 'absolute',
    right: 10,
    gap: 20,
  },
  actionGroup: {
    alignItems: 'center',
    gap: 2,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  actionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfo: {
    position: 'absolute',
    left: 12,
    right: 90,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  followButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  followedButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Beyaz %10 şeffaf
  },
  followedButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  moreLink: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  closeLink: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
  },
  likeAnimation: {
    position: 'absolute',
    zIndex: 1000,
  },
});
