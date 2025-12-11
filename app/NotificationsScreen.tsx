import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  isActive?: boolean;
};

type NotificationType = 'like' | 'follow';

interface Notification {
  id: string;
  type: NotificationType;
  user: {
    username: string;
    avatar: string;
  };
  postThumbnail?: string;
  timestamp: string;
  isRead: boolean;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'like',
    user: { username: 'johndoe', avatar: 'https://i.pravatar.cc/150?img=1' },
    postThumbnail: 'https://picsum.photos/400/600?random=1',
    timestamp: '2m ago',
    isRead: false,
  },
  {
    id: '2',
    type: 'follow',
    user: { username: 'janedoe', avatar: 'https://i.pravatar.cc/150?img=2' },
    timestamp: '15m ago',
    isRead: false,
  },
  {
    id: '3',
    type: 'like',
    user: { username: 'techguru', avatar: 'https://i.pravatar.cc/150?img=3' },
    postThumbnail: 'https://picsum.photos/400/600?random=2',
    timestamp: '1h ago',
    isRead: false,
  },
  {
    id: '4',
    type: 'follow',
    user: { username: 'traveler', avatar: 'https://i.pravatar.cc/150?img=4' },
    timestamp: '2h ago',
    isRead: true,
  },
  {
    id: '5',
    type: 'like',
    user: { username: 'photographer', avatar: 'https://i.pravatar.cc/150?img=5' },
    postThumbnail: 'https://picsum.photos/400/600?random=3',
    timestamp: '3h ago',
    isRead: true,
  },
];

function NotificationItem({ notification }: { notification: Notification }) {
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.notificationItem, !notification.isRead && styles.notificationItemUnread]}
      activeOpacity={0.7}
    >
      {/* Avatar with notification badge */}
      <View style={styles.avatarContainer}>
        <Image source={{ uri: notification.user.avatar }} style={styles.avatar} />
        <View style={[styles.notificationBadge, notification.type === 'like' ? styles.likeBadge : styles.followBadge]}>
          <Ionicons
            name={notification.type === 'like' ? 'heart' : 'person-add'}
            size={12}
            color="#fff"
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.notificationText} numberOfLines={2}>
          <Text style={styles.username}>{notification.user.username}</Text>
          {' '}
          <Text style={styles.action}>
            {notification.type === 'like' ? 'liked your video' : 'started following you'}
          </Text>
        </Text>
        <Text style={styles.timestamp}>{notification.timestamp}</Text>
      </View>

      {/* Right Side */}
      {notification.type === 'follow' ? (
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={() => setIsFollowing(!isFollowing)}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      ) : notification.postThumbnail ? (
        <Image source={{ uri: notification.postThumbnail }} style={styles.postThumbnail} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ isActive = false }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'likes' | 'follows'>('all');

  const filteredNotifications = 
    activeTab === 'all' ? SAMPLE_NOTIFICATIONS :
    activeTab === 'likes' ? SAMPLE_NOTIFICATIONS.filter(n => n.type === 'like') :
    SAMPLE_NOTIFICATIONS.filter(n => n.type === 'follow');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['all', 'likes', 'follows'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredNotifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}

        {filteredNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#555" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              When people interact with your content, you'll see it here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingHorizontal: 16 },
  tab: { paddingVertical: 14, marginRight: 24 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 8, paddingBottom: 4 },
  notificationItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  notificationItemUnread: { backgroundColor: '#0a0a0a' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  notificationBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  likeBadge: { backgroundColor: '#FF3040' },
  followBadge: { backgroundColor: '#0095f6' },
  content: { flex: 1, gap: 4 },
  notificationText: { fontSize: 14, color: '#fff', lineHeight: 18 },
  username: { fontWeight: '700' },
  action: { color: '#aaa' },
  timestamp: { fontSize: 12, color: '#666' },
  followButton: { minWidth: 85, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  followingButton: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  followButtonText: { fontSize: 13, fontWeight: '400', color: '#000', letterSpacing: 0.3 },
  followingButtonText: { color: '#fff' },
  postThumbnail: { width: 48, height: 48, borderRadius: 6 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});
