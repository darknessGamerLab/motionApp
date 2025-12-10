import { VerticalVideoPager, VerticalVideoPagerRef } from '@/components/VerticalVideoPager';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * HomeScreen - Ana video ekranı
 * 
 * Fullscreen video player
 * Vertical locked swipe → nextVideo(), prevVideo()
 * Player sabit durur, videolar değişir (TikTok logic)
 */

// Video ve kullanıcı verisi interface'i
interface VideoData {
  id: string;
  uri: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  description: string;
  category: string;
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
}

// Örnek video listesi - gerçek uygulamada API'den gelecek
const SAMPLE_VIDEOS: VideoData[] = [
  {
    id: '1',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    user: {
      id: 'user1',
      username: 'johndoe',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    description: 'Amazing sunset view from the mountains! 🌄 #nature #sunset',
    category: 'Nature',
    likes: 1250,
    isLiked: false,
    isSaved: false,
  },
  {
    id: '2',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    user: {
      id: 'user2',
      username: 'janedoe',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    description: 'Check out this incredible animation! 🎬 #animation #art',
    category: 'Art',
    likes: 3420,
    isLiked: true,
    isSaved: false,
  },
  {
    id: '3',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: {
      id: 'user3',
      username: 'techguru',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    description: 'Latest tech trends and innovations 💻 #tech #innovation',
    category: 'Technology',
    likes: 890,
    isLiked: false,
    isSaved: true,
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
}

// Video Overlay Bileşeni
function VideoOverlay({ 
  video, 
  onLike, 
  onShare, 
  onSave, 
  onCategory,
  onFollow 
}: { 
  video: VideoData;
  onLike: () => void;
  onShare: () => void;
  onSave: () => void;
  onCategory: () => void;
  onFollow: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [isLiked, setIsLiked] = useState(video.isLiked);
  const [isSaved, setIsSaved] = useState(video.isSaved);
  const [likeCount, setLikeCount] = useState(video.likes);

  // Video değiştiğinde state'leri güncelle
  useEffect(() => {
    setIsLiked(video.isLiked);
    setIsSaved(video.isSaved);
    setLikeCount(video.likes);
  }, [video.id]);

  const handleLike = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    onLike();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave();
  };

  return (
    <View style={styles.overlay}>
      {/* Sağ altta: Action Buttons - Sabit konum, navigation bar'ın üstünde */}
      <View style={[styles.rightActions, { bottom: insets.bottom + 80 }]}>
        {/* Like Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons 
            name={isLiked ? 'heart' : 'heart-outline'} 
            size={28} 
            color={isLiked ? '#ff3040' : '#fff'} 
          />
          <Text style={styles.actionText}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Ionicons name="paper-plane-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Ionicons 
            name={isSaved ? 'bookmark' : 'bookmark-outline'} 
            size={28} 
            color={isSaved ? '#ffd700' : '#fff'} 
          />
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>

        {/* Category Button */}
        <TouchableOpacity style={styles.actionButton} onPress={onCategory}>
          <Ionicons name="pricetag-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>{video.category}</Text>
        </TouchableOpacity>
      </View>

      {/* Alt tarafta: Avatar + Username + Follow + Description - Sabit konum, navigation bar'ın üstünde */}
      <View style={[styles.bottomInfo, { bottom: insets.bottom + 20 }]}>
        <View style={styles.userInfoRow}>
          <Image 
            source={{ uri: video.user.avatar || 'https://i.pravatar.cc/150' }} 
            style={styles.avatar}
          />
          <Text style={styles.username}>{video.user.username}</Text>
          <TouchableOpacity style={styles.followButton} onPress={onFollow}>
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>{video.description}</Text>
      </View>
    </View>
  );
}

// Sayı formatlama fonksiyonu
function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
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
}: HomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState(SAMPLE_VIDEOS);
  const videoPagerRef = useRef<VerticalVideoPagerRef>(null);

  // currentVideoIndex değişikliklerini takip et
  useAnimatedReaction(
    () => currentVideoIndex.value,
    (index) => {
      runOnJS(setCurrentIndex)(Math.round(index));
    }
  );

  const handleVideoChange = (index: number) => {
    setCurrentIndex(index);
    if (onVideoChange) {
      onVideoChange(index);
    }
  };

  const handleLike = () => {
    console.log('Like pressed for video:', videos[currentIndex].id);
  };

  const handleShare = () => {
    console.log('Share pressed for video:', videos[currentIndex].id);
  };

  const handleSave = () => {
    console.log('Save pressed for video:', videos[currentIndex].id);
  };

  const handleCategory = () => {
    console.log('Category pressed:', videos[currentIndex].category);
  };

  const handleFollow = () => {
    console.log('Follow pressed for user:', videos[currentIndex].user.username);
  };

  const handleTogglePlayPause = useCallback(() => {
    videoPagerRef.current?.togglePlayPause();
  }, []);

  // Single tap gesture for play/pause
  // Alt kısımdaki butonları ignore et (yaklaşık 200px'den aşağısı)
  // useMemo ile sarmalayarak stable reference sağla
  const singleTap = useMemo(() => {
    const bottomInfoStartY = videoHeight - 200; // Alt kısımdaki butonların başladığı Y koordinatı
    return Gesture.Tap()
      .numberOfTaps(1)
      .onEnd((event) => {
        // Alt kısımdaki butonlara tıklanmışsa ignore et
        if (event.y < bottomInfoStartY) {
          runOnJS(handleTogglePlayPause)();
        }
      });
  }, [videoHeight, handleTogglePlayPause]);

  const currentVideo = videos[currentIndex] || videos[0];

  if (!layoutReady || videoHeight <= 0 || pageWidth <= 0) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={singleTap}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <VerticalVideoPager
            ref={videoPagerRef}
            videos={SAMPLE_VIDEOS.map(v => ({ id: v.id, uri: v.uri }))}
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
          onLike={handleLike}
          onShare={handleShare}
          onSave={handleSave}
          onCategory={handleCategory}
          onFollow={handleFollow}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  followButton: {
    backgroundColor: '#0095f6',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 16,
    justifyContent: 'flex-start',
  },
  actionButton: {
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomInfo: {
    position: 'absolute',
    left: 12,
    right: 70,
  },
  description: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
});

