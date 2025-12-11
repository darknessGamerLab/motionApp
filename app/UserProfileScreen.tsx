import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

interface UserProfileScreenProps {
  isActive?: boolean;
  onBackPress?: () => void;
  userId?: string; // For fetching user data
}

export default function UserProfileScreen({ isActive = false, onBackPress, userId }: UserProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'videos' | 'private'>('videos');
  const [activeProfileIndex, setActiveProfileIndex] = useState(1);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;
  const contentPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(tabIndicatorPosition, {
        toValue: activeTab === 'videos' ? 0 : 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(contentPosition, {
        toValue: activeTab === 'videos' ? 0 : -SCREEN_WIDTH,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, [activeTab]);

  const user = {
    username: 'janedoe',
    fullName: 'Jane Doe',
    bio: 'Travel enthusiast 🌍 Photographer 📷',
    avatars: [
      'https://i.pravatar.cc/300?img=5',
      'https://i.pravatar.cc/300?img=15',
      'https://i.pravatar.cc/300?img=25',
    ],
    skills: ['Travel', 'Photography', 'Food'],
    following: 520,
    followers: 2840,
    videos: 12300,
  };

  const videos = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: `video-${i + 1}`,
    thumbnail: `https://picsum.photos/400/600?random=${i + 50}`,
    views: Math.floor(Math.random() * 100000) + 1000,
  })), []);

  const privateVideos = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: `private-${i + 1}`,
    thumbnail: `https://picsum.photos/400/600?random=${i + 70}`,
    views: Math.floor(Math.random() * 50000) + 500,
  })), []);

  const changeProfile = (index: number) => {
    setActiveProfileIndex(index);
  };

  const handleReport = () => {
    setShowReportMenu(false);
    Alert.alert('Report', 'This user has been reported.');
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share this profile');
  };

  const renderVideoItem = (totalLength: number) => ({ item, index }: { item: typeof videos[0]; index: number }) => {
    const isLastInRow = (index + 1) % GRID_COLUMNS === 0;
    const rowNumber = Math.floor(index / GRID_COLUMNS);
    const totalRows = Math.ceil(totalLength / GRID_COLUMNS);
    const isLastRow = rowNumber === totalRows - 1;

    return (
      <TouchableOpacity
        style={[styles.videoItem, { marginRight: isLastInRow ? 0 : GRID_GAP, marginBottom: isLastRow ? 0 : GRID_GAP }]}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} resizeMode="cover" />
        <View style={styles.viewsOverlay}>
          <Ionicons name="play" size={12} color="#fff" />
          <Text style={styles.viewsText}>{formatViews(item.views)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerUsername}>@{user.username}</Text>
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowReportMenu(true)}>
          <Ionicons name="menu-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={isActive}>
        {/* Profile Photos - 3 Photos */}
        <View style={styles.profileSection}>
          <View style={styles.avatarStack}>
            {user.avatars.map((avatar, index) => {
              const isActive = index === activeProfileIndex;
              const position = index === 0 ? 'left' : index === 2 ? 'right' : 'center';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.avatarContainer,
                    position === 'left' && styles.leftFrame,
                    position === 'center' && styles.centerFrame,
                    position === 'right' && styles.rightFrame,
                  ]}
                  onPress={() => changeProfile(index)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Full Name */}
          <Text style={styles.fullName}>{user.fullName}</Text>

          {/* Bio */}
          <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>

          {/* Skills - 3 Skills Mandatory */}
          <View style={styles.skillsContainer}>
            {user.skills.map((skill, index) => (
              <Text key={index} style={styles.skillText}>
                #{skill.toLowerCase()}
              </Text>
            ))}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{formatViews(user.videos)}</Text>
              <Text style={styles.statLabel}>Videos</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, !isFollowing && styles.followButtonActive]}
              onPress={() => setIsFollowing(!isFollowing)}
            >
              <Text style={[styles.actionButtonText, !isFollowing && styles.followButtonTextActive]}>
                {isFollowing ? 'Followed' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('videos')}
          >
            <Ionicons name="videocam" size={24} color={activeTab === 'videos' ? '#fff' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab('private')}
          >
            <Ionicons name="lock-closed" size={22} color={activeTab === 'private' ? '#fff' : '#666'} />
          </TouchableOpacity>
          {/* Animated indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [
                  {
                    translateX: tabIndicatorPosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_WIDTH * 0.25 - 20, SCREEN_WIDTH * 0.75 - 20],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>

        {/* Video Grid - Animated */}
        <Animated.View
          style={[
            styles.gridContainer,
            {
              transform: [{ translateX: contentPosition }],
            },
          ]}
        >
          <View style={styles.gridPage}>
            <FlatList
              data={videos}
              renderItem={renderVideoItem(videos.length)}
              keyExtractor={(item) => item.id}
              numColumns={GRID_COLUMNS}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>
          <View style={styles.gridPage}>
            <FlatList
              data={privateVideos}
              renderItem={renderVideoItem(privateVideos.length)}
              keyExtractor={(item) => item.id}
              numColumns={GRID_COLUMNS}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Report Menu Modal */}
      <Modal
        visible={showReportMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowReportMenu(false)}
        >
          <View style={styles.reportMenu}>
            <TouchableOpacity style={styles.reportItem} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color="#ff6b6b" />
              <Text style={styles.reportText}>Bildir</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerButton: { padding: 4 },
  headerUsername: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scrollView: { flex: 1 },
  profileSection: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 0, alignItems: 'center' },
  avatarStack: { height: 100, width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', marginBottom: 2, position: 'relative' },
  avatarContainer: { position: 'absolute', width: 90, height: 90 },
  leftFrame: { left: '24%', transform: [{ scale: 0.8 }], opacity: 0.6, zIndex: 0 },
  centerFrame: { left: '50%', marginLeft: -45, zIndex: 2 },
  rightFrame: { right: '24%', transform: [{ scale: 0.8 }], opacity: 0.6, zIndex: 0 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, borderColor: '#fff' },
  fullName: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 4, letterSpacing: 0.3 },
  bio: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 18, marginBottom: 12, maxWidth: '80%', fontWeight: '400' },
  skillsContainer: { flexDirection: 'row', gap: 32, marginBottom: 16, justifyContent: 'center', paddingHorizontal: 20 },
  skillText: { color: '#ff6b6b', fontSize: 13, fontWeight: '400' },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 0, paddingHorizontal: 20, width: '100%' },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 3 },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: '#1a1a1a' },
  actionButtons: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 10 },
  actionButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  followButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  followButtonTextActive: { color: '#fff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', marginTop: 2, position: 'relative' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 12, paddingBottom: 5 },
  tabIndicator: { 
    position: 'absolute', 
    bottom: -1, 
    width: 40, 
    height: 3, 
    backgroundColor: '#ff6b6b', 
    borderRadius: 1.5,
  },
  gridContainer: { flexDirection: 'row', width: SCREEN_WIDTH * 2 },
  gridPage: { width: SCREEN_WIDTH },
  gridContent: { paddingBottom: 4 },
  videoItem: { width: GRID_ITEM_WIDTH, height: GRID_ITEM_WIDTH * 1.3, backgroundColor: '#1a1a1a' },
  videoThumbnail: { width: '100%', height: '100%' },
  viewsOverlay: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewsText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  reportMenu: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 20 },
  reportItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  reportText: { fontSize: 16, fontWeight: '600', color: '#ff6b6b' },
});

