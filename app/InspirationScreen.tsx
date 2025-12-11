import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_SPACING = 16;

type Props = {
  isActive?: boolean;
};

// Sample data
const AD_BANNERS = [
  { id: '1', image: 'https://picsum.photos/800/300?random=1', title: 'Yaz İndirimleri' },
  { id: '2', image: 'https://picsum.photos/800/300?random=2', title: 'Yeni Koleksiyon' },
  { id: '3', image: 'https://picsum.photos/800/300?random=3', title: 'Özel Fırsatlar' },
];

const CATEGORIES = [
  { id: '1', name: 'Photography', icon: 'camera-outline', color: '#FF6B9D' },
  { id: '2', name: 'Travel', icon: 'airplane-outline', color: '#4ECDC4' },
  { id: '3', name: 'Food', icon: 'restaurant-outline', color: '#FFD93D' },
  { id: '4', name: 'Fashion', icon: 'shirt-outline', color: '#A8E6CF' },
  { id: '5', name: 'Fitness', icon: 'fitness-outline', color: '#FF8B94' },
  { id: '6', name: 'Music', icon: 'musical-notes-outline', color: '#C7CEEA' },
  { id: '7', name: 'Art', icon: 'color-palette-outline', color: '#FFDFD3' },
  { id: '8', name: 'Technology', icon: 'hardware-chip-outline', color: '#A0CED9' },
];

interface Video {
  id: string;
  thumbnail: string;
  views: number;
  duration: string;
}

const CATEGORY_VIDEOS: { [key: string]: Video[] } = {
  '1': Array.from({ length: 8 }, (_, i) => ({
    id: `photo-${i}`,
    thumbnail: `https://picsum.photos/300/400?random=${i + 10}`,
    views: Math.floor(Math.random() * 100000),
    duration: `${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
  })),
  '2': Array.from({ length: 8 }, (_, i) => ({
    id: `travel-${i}`,
    thumbnail: `https://picsum.photos/300/400?random=${i + 20}`,
    views: Math.floor(Math.random() * 80000),
    duration: `${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
  })),
  '3': Array.from({ length: 8 }, (_, i) => ({
    id: `food-${i}`,
    thumbnail: `https://picsum.photos/300/400?random=${i + 30}`,
    views: Math.floor(Math.random() * 60000),
    duration: `${Math.floor(Math.random() * 3)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
  })),
};

// Ad Banner Carousel
function AdBannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % AD_BANNERS.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (BANNER_WIDTH + BANNER_SPACING),
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);
  };

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (BANNER_WIDTH + BANNER_SPACING));
    if (index !== currentIndex && index >= 0 && index < AD_BANNERS.length) {
      setCurrentIndex(index);
    }
  };

  const handleScrollBeginDrag = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleScrollEndDrag = () => {
    startAutoScroll();
  };

  return (
    <View style={styles.bannerContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: BANNER_SPACING }}
      >
        {AD_BANNERS.map((banner, index) => (
          <TouchableOpacity 
            key={banner.id} 
            style={[styles.bannerItem, index < AD_BANNERS.length - 1 && { marginRight: BANNER_SPACING }]} 
            activeOpacity={0.9}
          >
            <Image source={{ uri: banner.image }} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Video Carousel Item
function VideoCarouselItem({ video }: { video: Video }) {
  return (
    <TouchableOpacity style={styles.videoCard} activeOpacity={0.9}>
      <Image source={{ uri: video.thumbnail }} style={styles.videoThumbnail} resizeMode="cover" />
      <View style={styles.videoDuration}>
        <Text style={styles.videoDurationText}>{video.duration}</Text>
      </View>
      <View style={styles.videoViews}>
        <Ionicons name="play" size={12} color="#fff" />
        <Text style={styles.videoViewsText}>{formatViews(video.views)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Category Section
function CategorySection({ category }: { category: typeof CATEGORIES[0] }) {
  const videos = CATEGORY_VIDEOS[category.id] || [];

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          <View style={[styles.categoryIconContainer, { backgroundColor: category.color }]}>
            <Ionicons name={category.icon as any} size={18} color="#fff" />
          </View>
          <Text style={styles.categoryTitle}>{category.name}</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={videos}
        renderItem={({ item }) => <VideoCarouselItem video={item} />}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.videoCarousel}
      />
    </View>
  );
}

function formatViews(views: number) {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

export default function InspirationScreen({ isActive = false }: Props) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#8e8e8e" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, users, sounds..."
            placeholderTextColor="#8e8e8e"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8e8e8e" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Ad Banner Carousel */}
        <AdBannerCarousel />

        {/* Categories with Video Carousels */}
        {CATEGORIES.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  bannerContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  bannerItem: {
    width: BANNER_WIDTH,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '500',
  },
  videoCarousel: {
    paddingLeft: 16,
    gap: 12,
  },
  videoCard: {
    width: 130,
    height: 185,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoDuration: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  videoViews: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoViewsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
