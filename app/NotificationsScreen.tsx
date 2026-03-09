import EmptyState from '@/components/EmptyState';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/utils/validate';

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  isActive?: boolean;
  onUserPress?: (userId: string) => void;
  /** If provided, called when guest presses "Giriş Yap" */
  onLoginRequired?: () => void;
}

type NotifType = 'like' | 'comment' | 'follow' | 'radar' | 'system';
type TabType = 'all' | 'likes' | 'comments' | 'follows' | 'radar' | 'system';

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

// MOCK data removed — notifications are now 100% real from Supabase notifications table
// Trigger `enrich_notification_thumbnail_trigger` auto-populates thumbnail_url on insert


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

// ─── NotifRow — memoized, receives follow state from parent (no per-row DB call) ───
const NotifRow = memo(function NotifRow({
  item, onUserPress, onMarkRead, initialFollowing, onFollowChange,
}: {
  item: Notif;
  onUserPress?: (id: string) => void;
  onMarkRead: (id: string) => void;
  initialFollowing?: boolean;
  // Called after DB follow/unfollow so parent can sync ALL rows for this user
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}) {
  const { authState } = useAuth();
  const [following, setFollowing] = useState(initialFollowing ?? false);
  const scale = useRef(new Animated.Value(1)).current;

  // Sync when prop changes (parent batch-loaded follow states)
  useEffect(() => {
    if (initialFollowing !== undefined) setFollowing(initialFollowing);
  }, [initialFollowing]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
    onMarkRead(item.id);
    if (item.videoId && (item.type === 'like' || item.type === 'comment')) {
      router.push(`/video/${item.videoId}`);
    } else {
      onUserPress?.(item.user.id);
    }
  };

  const handleFollow = async () => {
    if (!authState.user || !item.user.id) return;
    if (!isValidUUID(item.user.id)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFollowing = !following;
    setFollowing(newFollowing);
    // Propagate to parent immediately so all rows from same user sync
    onFollowChange?.(item.user.id, newFollowing);
    try {
      if (newFollowing) {
        await (supabase as any).from('follows').insert({ follower_id: authState.user.id, following_id: item.user.id });
      } else {
        await (supabase as any).from('follows').delete().eq('follower_id', authState.user.id).eq('following_id', item.user.id);
      }
    } catch (e) {
      // Rollback both local and parent state
      setFollowing(f => !f);
      onFollowChange?.(item.user.id, !newFollowing);
    }
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
            onPress={handleFollow}
          >
            <Text style={[s.followTxt, following && s.followTxtOut]}>
              {following ? 'Takip Ediliyor' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.isRead === next.item.isRead &&
  prev.initialFollowing === next.initialFollowing
);

const TABS: { key: TabType; label: string; icon: any }[] = [
  { key: 'all', label: 'Tümü', icon: 'apps-outline' },
  { key: 'likes', label: 'Beğeniler', icon: 'heart-outline' },
  { key: 'comments', label: 'Yorumlar', icon: 'chatbubble-ellipses-outline' },
  { key: 'follows', label: 'Takipler', icon: 'person-add-outline' },
  { key: 'radar', label: 'Radar', icon: 'scan-outline' },
];

export default function NotificationsScreen({ isActive = true, onUserPress, onLoginRequired }: Props) {
  const insets = useSafeAreaInsets();
  const { authState, refreshProfile } = useAuth();
  const [tab, setTab] = useState<TabType>('all');
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // follow states batch-fetched once instead of N per-row queries
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  // Throttle: track when we last fetched so useFocusEffect doesn't spam DB
  const lastFetchTime = useRef(0);
  const FETCH_THROTTLE_MS = 60_000; // only refetch if >60s stale

  // When not authenticated, show empty state
  useEffect(() => {
    if (!authState.user) {
      setLoading(false);
      setNotifs([]);
    }
  }, [authState.user]);

  const fetchNotifs = useCallback(async (force = false) => {
    if (!authState.user) return;
    // Throttle: skip if result is fresh and not forced
    if (!force && Date.now() - lastFetchTime.current < FETCH_THROTTLE_MS) return;

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
      lastFetchTime.current = Date.now();

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
        thumbnail: d.thumbnail_url || undefined,
        videoId: d.video_id || undefined,
      }));

      setNotifs(formatted);

      // Batch-fetch follow statuses for follow/radar notifications in ONE query
      // instead of N individual queries per NotifRow
      const followNotifs = formatted.filter(
        n => (n.type === 'follow' || n.type === 'radar') && n.user.id
      );
      if (followNotifs.length > 0 && authState.user) {
        const targetIds = followNotifs.map(n => n.user.id);
        const { data: followData } = await (supabase as any)
          .from('follows')
          .select('following_id')
          .eq('follower_id', authState.user.id)
          .in('following_id', targetIds);
        const map: Record<string, boolean> = {};
        (followData || []).forEach((r: any) => { map[r.following_id] = true; });
        setFollowMap(map);
      }
    } catch (err) {
      console.error('Fetch notifs error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authState.user]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchNotifs(true); // force=true on mount (first visit)

    if (!authState.user) return;

    const channel = supabase.channel(`notifs-${authState.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${authState.user.id}`
      }, async (payload: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Immediately fetch just this notification row (with profile join)
        // so the user sees it instantly without a full list reload.
        // Full re-fetch is still triggered after 800ms as a safety net.
        try {
          const { data } = await (supabase as any)
            .from('notifications')
            .select(`
              id, type, message, created_at, is_read, from_user_id, video_id,
              profiles!notifications_from_user_id_fkey ( username, avatar_url )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const notif: Notif = {
              id: data.id,
              type: data.type as NotifType,
              user: {
                id: data.from_user_id,
                username: data.profiles?.username || 'Kullanıcı',
                avatar: data.profiles?.avatar_url || 'https://i.pravatar.cc/100',
              },
              content: data.message || '',
              time: 'şimdi',
              isRead: false,
              thumbnail: undefined,
              videoId: data.video_id || undefined,
            };
            // Prepend — deduplicate by id to prevent double-add
            setNotifs(prev =>
              prev.some(n => n.id === notif.id) ? prev : [notif, ...prev]
            );
          }
        } catch {
          // Fallback: full re-fetch if single-row fetch fails
          fetchNotifs(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authState.user, fetchNotifs]);

  // Focus: only refetch if data is stale (>60s) — prevents every tab-open triggering a request
  useFocusEffect(
    useCallback(() => {
      // Non-forced: respects the 60s throttle
      fetchNotifs(false);
      refreshProfile(); // refreshProfile already has its own 30s throttle inside AuthContext
    }, [fetchNotifs, refreshProfile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifs(true); // force=true on manual pull-to-refresh
    refreshProfile();
  };

  // useMemo: re-filter only when tab or notifs change, not on every render
  const filtered = useMemo(() => notifs.filter(n =>
    tab === 'all' ? true :
      tab === 'likes' ? n.type === 'like' :
        tab === 'comments' ? n.type === 'comment' :
          tab === 'follows' ? n.type === 'follow' :
            tab === 'radar' ? n.type === 'radar' :
              false
  ), [tab, notifs]);

  const unread = notifs.filter(n => !n.isRead).length;

  const markRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await (supabase as any).from('notifications').update({ is_read: true }).eq('id', id);
  }, []);

  const markAll = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const unreadIds = notifs.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    await (supabase as any).from('notifications').update({ is_read: true }).in('id', unreadIds);
  }, [notifs]);

  // NOTE: This MUST be declared here (top-level), NOT inside the JSX renderItem prop.
  // Putting useCallback inside JSX causes it to run conditionally (inside a ternary),
  // which violates the Rules of Hooks → "Rendered more hooks than during previous render".
  const handleFollowChange = useCallback((userId: string, isFollowing: boolean) => {
    setFollowMap(prev => ({ ...prev, [userId]: isFollowing }));
  }, []);

  const renderNotifRow = useCallback(({ item }: { item: Notif }) => (
    <NotifRow
      item={item}
      onUserPress={onUserPress}
      onMarkRead={markRead}
      initialFollowing={followMap[item.user.id]}
      onFollowChange={handleFollowChange}
    />
  ), [onUserPress, markRead, followMap, handleFollowChange]);

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
        // Skeleton while loading
        <View style={{ paddingTop: 8 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonLoader.NotifRow key={i} />
          ))}
        </View>
      ) : !authState.user ? (
        // Guest user — dedicated CTA
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="notifications-off-outline"
            title="Bildirimlerini görmek için giriş yap"
            subtitle="Takipçilerinden ve yeni eğleşimlerinden anında haberdar ol"
            ctaLabel="Giriş Yap"
            onCtaPress={onLoginRequired}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderNotifRow}
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
  headerTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text, letterSpacing: -0.4 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  markAllText: { color: Colors.primary, fontSize: 13, fontFamily: 'Poppins_500Medium' },

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
  unreadBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins_700Bold' },
  unreadBannerText: { color: Colors.primary, fontSize: 13, fontFamily: 'Poppins_500Medium' },

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
  tabText: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Poppins_500Medium' },
  tabTextActive: { color: Colors.primary, fontFamily: 'Poppins_700Bold' },

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
  rowText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, fontFamily: 'Poppins_400Regular' },
  boldText: { color: Colors.text, fontFamily: 'Poppins_600SemiBold' },
  timeText: { color: Colors.textMuted, fontSize: 11, marginTop: 3, fontFamily: 'Poppins_400Regular' },

  thumb: { width: 42, height: 56, borderRadius: 6, backgroundColor: Colors.surfaceAlt },

  followBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  followBtnOut: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  followTxt: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  followTxtOut: { color: Colors.textSecondary },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.text },
  emptySubtext: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19, fontFamily: 'Poppins_400Regular' },

  systemAvatar: {
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  systemText: {
    color: Colors.text,
    fontFamily: 'Poppins_500Medium',
  },
});
