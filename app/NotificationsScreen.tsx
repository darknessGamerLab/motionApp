import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const CHROME_COLOR = '#0A0505';

interface Props {
  isActive?: boolean;
  onUserPress?: (userId: string) => void;
}

type NotifType = 'like' | 'comment' | 'follow' | 'radar';
type TabType = 'all' | 'likes' | 'follows' | 'radar';

interface Notif {
  id: string;
  type: NotifType;
  user: { id: string; username: string; avatar: string; isCompany?: boolean };
  content: string;
  time: string;
  isRead: boolean;
  thumbnail?: string;
  videoId?: string;
}

const MOCK: Notif[] = [
  { id: '1', type: 'like', user: { id: 'u1', username: 'ahmet', avatar: 'https://i.pravatar.cc/100?img=1' }, content: 'videonu beğendi', time: '2s', isRead: false, thumbnail: 'https://picsum.photos/60/80?random=1', videoId: 'v1' },
  { id: '2', type: 'follow', user: { id: 'u2', username: 'ayşe', avatar: 'https://i.pravatar.cc/100?img=2' }, content: 'seni takip etti', time: '5d', isRead: false },
  { id: '3', type: 'radar', user: { id: 'u10', username: 'TechCorp', avatar: 'https://i.pravatar.cc/100?img=10', isCompany: true }, content: 'seni radara aldı', time: '1s', isRead: true },
  { id: '4', type: 'comment', user: { id: 'u3', username: 'mehmet', avatar: 'https://i.pravatar.cc/100?img=3' }, content: 'yorum yaptı: Harika! 🔥', time: '3s', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=2', videoId: 'v2' },
  { id: '5', type: 'like', user: { id: 'u4', username: 'zeynep', avatar: 'https://i.pravatar.cc/100?img=4' }, content: 'videonu beğendi', time: '1h', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=3', videoId: 'v3' },
  { id: '6', type: 'radar', user: { id: 'u11', username: 'BrandX', avatar: 'https://i.pravatar.cc/100?img=11', isCompany: true }, content: 'seni radara aldı', time: '2h', isRead: true },
  { id: '7', type: 'follow', user: { id: 'u5', username: 'emre', avatar: 'https://i.pravatar.cc/100?img=15' }, content: 'seni takip etti', time: '3h', isRead: true },
  { id: '8', type: 'like', user: { id: 'u6', username: 'deniz', avatar: 'https://i.pravatar.cc/100?img=20' }, content: 'videonu beğendi', time: '5h', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=4', videoId: 'v4' },
];

function NotifIcon({ type }: { type: NotifType }) {
  const config = {
    like: { name: 'heart', color: Colors.primary },
    comment: { name: 'chatbubble', color: Colors.blue },
    follow: { name: 'person-add', color: Colors.green },
    radar: { name: 'scan-circle', color: Colors.purple },
  };
  const { name, color } = config[type];
  return (
    <View style={[styles.iconBadge, { backgroundColor: '#fff' }]}>
      <Ionicons name={name as any} size={12} color={color} />
    </View>
  );
}

function NotifRow({ 
  item, 
  onUserPress,
  onMarkRead,
}: { 
  item: Notif; 
  onUserPress?: (userId: string) => void;
  onMarkRead?: (id: string) => void;
}) {
  const [following, setFollowing] = useState(false);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Mark as read
    onMarkRead?.(item.id);
    // Navigate to user profile
    onUserPress?.(item.user.id);
  }, [item.id, item.user.id, onUserPress, onMarkRead]);

  const handleFollow = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowing(prev => !prev);
  }, []);

  return (
    <TouchableOpacity 
      style={[styles.row, !item.isRead && styles.unreadRow]} 
      activeOpacity={0.7} 
      onPress={handlePress}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: item.user.avatar }} style={styles.avatar} contentFit="cover" transition={150} />
        <NotifIcon type={item.type} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={2}>
          <Text style={styles.username}>{item.user.username}</Text> {item.content}
        </Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      
      {item.thumbnail && (
        <Image source={{ uri: item.thumbnail }} style={styles.thumb} contentFit="cover" transition={150} />
      )}
      
      {(item.type === 'follow' || (item.type === 'radar' && item.user.isCompany)) && (
        <TouchableOpacity 
          style={[styles.followBtn, following && styles.followBtnActive]} 
          onPress={handleFollow}
        >
          <Text style={[styles.followText, following && styles.followTextActive]}>
            {following ? 'Takip' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ isActive = true, onUserPress }: Props) {
  const [tab, setTab] = useState<TabType>('all');
  const [notifications, setNotifications] = useState(MOCK);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'Hepsi' },
    { key: 'likes', label: 'Beğeniler' },
    { key: 'follows', label: 'Takipler' },
    { key: 'radar', label: 'Radar' },
  ];

  const filtered = notifications.filter(n => {
    if (tab === 'all') return true;
    if (tab === 'likes') return n.type === 'like';
    if (tab === 'follows') return n.type === 'follow';
    if (tab === 'radar') return n.type === 'radar';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={styles.tabBtn} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            {tab === t.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlashList
        data={filtered}
        renderItem={({ item }) => (
          <NotifRow 
            item={item} 
            onUserPress={onUserPress}
            onMarkRead={handleMarkRead}
          />
        )}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={60}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>Bildirim yok</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    height: 50, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: CHROME_COLOR, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1a1a1a' 
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  markAllBtn: { paddingVertical: 4 },
  markAllText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: CHROME_COLOR, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { color: '#666', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2, width: '60%', backgroundColor: Colors.primary, borderRadius: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  unreadRow: { backgroundColor: 'rgba(255, 45, 85, 0.06)' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  iconBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  content: { flex: 1 },
  text: { color: '#ccc', fontSize: 13, lineHeight: 18 },
  username: { color: '#fff', fontWeight: '600' },
  time: { color: '#666', fontSize: 11, marginTop: 2 },
  thumb: { width: 40, height: 54, borderRadius: 4, backgroundColor: '#1a1a1a' },
  followBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: Colors.primary },
  followBtnActive: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  followText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  followTextActive: { color: '#888' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { color: '#444', fontSize: 14, marginTop: 12 },
});
