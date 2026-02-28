import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import {
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
}

const MOCK: Notif[] = [
  { id: '1', type: 'like', user: { id: 'u1', username: 'ahmet_y', avatar: 'https://i.pravatar.cc/100?img=1' }, content: 'videonu beğendi', time: '2s', isRead: false, thumbnail: 'https://picsum.photos/60/80?random=1' },
  { id: '2', type: 'follow', user: { id: 'u2', username: 'ayse_o', avatar: 'https://i.pravatar.cc/100?img=2' }, content: 'seni takip etti', time: '5d', isRead: false },
  { id: '3', type: 'radar', user: { id: 'u10', username: 'TechCorp', avatar: 'https://i.pravatar.cc/100?img=10', isCompany: true }, content: 'seni radara aldı', time: '1s', isRead: true },
  { id: '4', type: 'comment', user: { id: 'u3', username: 'mehmet_k', avatar: 'https://i.pravatar.cc/100?img=3' }, content: 'yorum yaptı: Harika! 🔥', time: '3s', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=2' },
  { id: '5', type: 'like', user: { id: 'u4', username: 'zeynep_d', avatar: 'https://i.pravatar.cc/100?img=4' }, content: 'videonu beğendi', time: '1h', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=3' },
  { id: '6', type: 'radar', user: { id: 'u11', username: 'BrandX', avatar: 'https://i.pravatar.cc/100?img=11', isCompany: true }, content: 'seni radara aldı', time: '2h', isRead: true },
  { id: '7', type: 'follow', user: { id: 'u5', username: 'emre_c', avatar: 'https://i.pravatar.cc/100?img=15' }, content: 'seni takip etti', time: '3h', isRead: true },
  { id: '8', type: 'like', user: { id: 'u6', username: 'deniz_y', avatar: 'https://i.pravatar.cc/100?img=20' }, content: 'videonu beğendi', time: '5h', isRead: true, thumbnail: 'https://picsum.photos/60/80?random=4' },
];

const NOTIF_COLORS: Record<NotifType, string> = {
  like: Colors.like,
  comment: Colors.comment,
  follow: Colors.follow,
  radar: Colors.radar,
};
const NOTIF_ICONS: Record<NotifType, string> = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
  radar: 'scan-circle',
};

function NotifRow({
  item, onUserPress, onMarkRead,
}: {
  item: Notif;
  onUserPress?: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const [following, setFollowing] = useState(false);

  return (
    <TouchableOpacity
      style={[s.row, !item.isRead && s.unread]}
      activeOpacity={0.7}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onMarkRead(item.id);
        onUserPress?.(item.user.id);
      }}
    >
      {/* Unread dot */}
      {!item.isRead && <View style={s.unreadDot} />}

      {/* Avatar + badge */}
      <View style={s.avatarWrap}>
        <Image source={{ uri: item.user.avatar }} style={s.avatar} contentFit="cover" transition={150} />
        <View style={[s.badge, { backgroundColor: NOTIF_COLORS[item.type] }]}>
          <Ionicons name={NOTIF_ICONS[item.type] as any} size={10} color="#fff" />
        </View>
      </View>

      {/* Text */}
      <View style={s.textCol}>
        <Text style={s.rowText} numberOfLines={2}>
          <Text style={s.boldText}>{item.user.username}</Text>
          {' '}{item.content}
        </Text>
        <Text style={s.timeText}>{item.time} önce</Text>
      </View>

      {/* Thumbnail */}
      {item.thumbnail && (
        <Image source={{ uri: item.thumbnail }} style={s.thumb} contentFit="cover" />
      )}

      {/* Follow button */}
      {(item.type === 'follow' || item.type === 'radar') && (
        <TouchableOpacity
          style={[s.followBtn, following && s.followBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFollowing(f => !f);
          }}
        >
          <Text style={[s.followTxt, following && s.followTxtActive]}>
            {following ? 'Takip' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ isActive = true, onUserPress }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabType>('all');
  const [notifs, setNotifs] = useState(MOCK);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'Hepsi' },
    { key: 'likes', label: 'Beğeniler' },
    { key: 'follows', label: 'Takipler' },
    { key: 'radar', label: 'Radar' },
  ];

  const filtered = notifs.filter(n =>
    tab === 'all' ? true :
      tab === 'likes' ? n.type === 'like' :
        tab === 'follows' ? n.type === 'follow' :
          n.type === 'radar'
  );

  const unread = notifs.filter(n => !n.isRead).length;

  const markRead = useCallback((id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAll = useCallback(() => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Bildirimler</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAll} style={s.markAllBtn}>
            <Text style={s.markAllText}>Tümünü oku</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && s.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlashList
        data={filtered}
        renderItem={({ item }) => (
          <NotifRow item={item} onUserPress={onUserPress} onMarkRead={markRead} />
        )}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={Colors.textDim} />
            <Text style={s.emptyText}>Bildirim yok</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  markAllBtn: {},
  markAllText: { color: Colors.primary, fontSize: 13, fontWeight: '500' },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    paddingHorizontal: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  unread: { backgroundColor: Colors.primary + '07' },
  unreadDot: {
    position: 'absolute', left: 5, top: '50%',
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primary, marginTop: -3,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceAlt },
  badge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.background,
  },
  textCol: { flex: 1 },
  rowText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  boldText: { color: Colors.text, fontWeight: '600' },
  timeText: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },

  thumb: { width: 40, height: 54, borderRadius: 6, backgroundColor: Colors.surfaceAlt },

  followBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  followBtnActive: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  followTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  followTxtActive: { color: Colors.textSecondary },

  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderLight },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
