import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  isActive?: boolean;
  onUserPress?: (userId: string) => void;
}

type NotifType = 'like' | 'comment' | 'follow' | 'radar' | 'system';
type TabType = 'all' | 'likes' | 'follows' | 'radar' | 'system';

interface Notif {
  id: string;
  type: NotifType;
  user: { id: string; username: string; avatar: string; isCompany?: boolean };
  content: string;
  time: string;
  isRead: boolean;
  thumbnail?: string;
}

const timeAgo = (date: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds} sn`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün`;
  return `${Math.floor(days / 7)} hf`;
};

const MOCK: Notif[] = [
  { id: '1', type: 'like', user: { id: 'u1', username: 'ahmet_y', avatar: 'https://i.pravatar.cc/100?img=1' }, content: 'videonu beğendi', time: '2 sn', isRead: false, thumbnail: 'https://picsum.photos/60/80?random=1' },
  { id: '2', type: 'follow', user: { id: 'u2', username: 'ayse_o', avatar: 'https://i.pravatar.cc/100?img=2' }, content: 'seni takip etti', time: '5 dk', isRead: false },
  { id: '3', type: 'radar', user: { id: 'u10', username: 'TechCorp', avatar: 'https://i.pravatar.cc/100?img=10', isCompany: true }, content: 'seni radara aldı', time: '1 sa', isRead: true },
  { id: '4', type: 'comment', user: { id: 'u3', username: 'mehmet_k', avatar: 'https://i.pravatar.cc/100?img=3' }, content: 'yorum yaptı: "Harika! 🔥"', time: '3 sa', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=2' },
  { id: '5', type: 'like', user: { id: 'u4', username: 'zeynep_d', avatar: 'https://i.pravatar.cc/100?img=4' }, content: 'videonu beğendi', time: '1 gün', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=3' },
  { id: '6', type: 'radar', user: { id: 'u11', username: 'BrandX', avatar: 'https://i.pravatar.cc/100?img=11', isCompany: true }, content: 'seni radara aldı', time: '2 gün', isRead: true },
  { id: '7', type: 'follow', user: { id: 'u5', username: 'emre_c', avatar: 'https://i.pravatar.cc/100?img=15' }, content: 'seni takip etti', time: '3 gün', isRead: true },
  { id: '8', type: 'like', user: { id: 'u6', username: 'deniz_y', avatar: 'https://i.pravatar.cc/100?img=20' }, content: 'videonu beğendi', time: '5 gün', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=4' },
  { id: '9', type: 'comment', user: { id: 'u7', username: 'selin_t', avatar: 'https://i.pravatar.cc/100?img=7' }, content: 'yorum yaptı: "Devam et lütfen 💯"', time: '1 hf', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=5' },
];

const NOTIF_COLORS: Record<NotifType, string> = {
  like: '#FF3B62',
  comment: '#FF9F0A',
  follow: '#34C759',
  radar: '#5856D6',
  system: '#007AFF',
};
const NOTIF_ICONS: Record<NotifType, any> = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
  radar: 'scan-circle',
  system: 'notifications',
};

function NotifRow({
  item, onUserPress, onMarkRead,
}: {
  item: Notif;
  onUserPress?: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const [following, setFollowing] = useState(false);
  const scale = new Animated.Value(1);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
    onMarkRead(item.id);
    onUserPress?.(item.user.id);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[s.row, !item.isRead && s.unread]}
        activeOpacity={0.85}
        onPress={handlePress}
      >
        {/* Unread indicator */}
        {!item.isRead && <View style={s.unreadLine} />}

        {/* Avatar + badge */}
        <View style={s.avatarWrap}>
          {item.type === 'system' ? (
            <View style={[s.avatar, s.systemAvatar]}>
              <Ionicons name="notifications" size={24} color={Colors.primary} />
            </View>
          ) : (
            <Image source={{ uri: item.user.avatar }} style={s.avatar} contentFit="cover" transition={150} />
          )}
          <View style={[s.badge, { backgroundColor: NOTIF_COLORS[item.type] }]}>
            <Ionicons name={NOTIF_ICONS[item.type]} size={9} color="#fff" />
          </View>
        </View>

        {/* Text */}
        <View style={s.textCol}>
          <Text style={s.rowText} numberOfLines={3}>
            {item.type !== 'system' && <Text style={s.boldText}>{item.user.username} </Text>}
            <Text style={item.type === 'system' ? s.systemText : null}>{item.content}</Text>
          </Text>
          <Text style={s.timeText}>{item.time} önce</Text>
        </View>

        {/* Thumbnail or Follow btn */}
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={s.thumb} contentFit="cover" />
        ) : (item.type === 'follow' || item.type === 'radar') && (
          <TouchableOpacity
            style={[s.followBtn, following && s.followBtnOut]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFollowing(f => !f);
            }}
          >
            <Text style={[s.followTxt, following && s.followTxtOut]}>
              {following ? 'Takip Ediliyor' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const TABS: { key: TabType; label: string; icon: any }[] = [
  { key: 'all', label: 'Tümü', icon: 'apps-outline' },
  { key: 'likes', label: 'Beğeniler', icon: 'heart-outline' },
  { key: 'follows', label: 'Takipler', icon: 'person-add-outline' },
  { key: 'radar', label: 'Radar', icon: 'scan-outline' },
];

export default function NotificationsScreen({ isActive = true, onUserPress }: Props) {
  const insets = useSafeAreaInsets();
  const { authState, refreshProfile } = useAuth();
  const [tab, setTab] = useState<TabType>('all');
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifs = async () => {
    if (!authState.user) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id, type, message, created_at, is_read, from_user_id, video_id,
          profiles!notifications_from_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('user_id', authState.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Notif[] = (data as any[] || []).map(d => ({
        id: d.id,
        type: d.type as NotifType,
        user: {
          id: d.from_user_id,
          username: d.profiles?.username || 'Sistem',
          avatar: d.profiles?.avatar_url || 'https://i.pravatar.cc/100',
        },
        content: d.message || '',
        time: timeAgo(d.created_at),
        isRead: d.is_read,
        thumbnail: d.video_id ? 'https://picsum.photos/60/80' : undefined,
      }));

      console.log('Fetched notifs count:', formatted.length);
      setNotifs(formatted);
    } catch (err) {
      console.error('Fetch notifs error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifs();

    // Realtime Notifications
    if (!authState.user) return;
    const channel = supabase.channel(`notifs-${authState.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${authState.user.id}`
      }, (payload) => {
        console.log('New notification received!', payload.new);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Refetch to get joined profile data
        fetchNotifs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authState.user]);

  // Sayfa açıldığında hem bildirimleri hem de profili tazele
  // Bu sayede kurumsal onay gelince statü anında güncellenir
  useFocusEffect(
    useCallback(() => {
      fetchNotifs();
      refreshProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifs();
    refreshProfile();
  };

  const filtered = notifs.filter(n =>
    tab === 'all' ? true :
      tab === 'likes' ? n.type === 'like' || n.type === 'comment' :
        tab === 'follows' ? n.type === 'follow' :
          tab === 'radar' ? n.type === 'radar' :
            false
  );

  const unread = notifs.filter(n => !n.isRead).length;

  const markRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await supabase.from('notifications').update({ is_read: true } as any).eq('id', id);
  }, []);

  const markAll = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const unreadIds = notifs.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    await supabase.from('notifications').update({ is_read: true } as any).in('id', unreadIds);
  }, [notifs]);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Bildirimler</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAll} style={s.markAllBtn}>
            <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
            <Text style={s.markAllText}>Tümünü oku</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unread badge */}
      {unread > 0 && (
        <View style={s.unreadBanner}>
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unread}</Text>
          </View>
          <Text style={s.unreadBannerText}>yeni bildirim</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tabItem, active && s.tabItemActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTab(t.key);
              }}
            >
              <Ionicons
                name={active ? (t.icon.replace('-outline', '')) : t.icon}
                size={16}
                color={active ? Colors.primary : Colors.textMuted}
              />
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading && notifs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={({ item }: { item: Notif }) => (
            <NotifRow item={item} onUserPress={onUserPress} onMarkRead={markRead} />
          )}
          keyExtractor={(i: Notif) => i.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={52} color={Colors.textDim} />
              <Text style={s.emptyTitle}>Bildirim yok</Text>
              <Text style={s.emptySubtext}>Yeni bir etkileşim olduğunda buraya gelecek</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, letterSpacing: -0.4 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  markAllText: { color: Colors.primary, fontSize: 13, fontWeight: '500' },

  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: Colors.primary + '0D',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.primary + '22',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  unreadBannerText: { color: Colors.primary, fontSize: 13, fontWeight: '500' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 10, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: Colors.surface,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight,
  },
  unread: { backgroundColor: Colors.primary + '06' },
  unreadLine: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: Colors.primary,
    borderTopRightRadius: 2, borderBottomRightRadius: 2,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.surfaceAlt },
  badge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  textCol: { flex: 1 },
  rowText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  boldText: { color: Colors.text, fontWeight: '600' },
  timeText: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },

  thumb: { width: 42, height: 56, borderRadius: 6, backgroundColor: Colors.surfaceAlt },

  followBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  followBtnOut: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  followTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  followTxtOut: { color: Colors.textSecondary },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },

  systemAvatar: {
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  systemText: {
    color: Colors.text,
    fontWeight: '500',
  },
});
