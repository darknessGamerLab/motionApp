/**
 * FollowListScreen — TikTok tarzı takipçi / takip edilen listesi
 * 
 * Kullanım:
 *   <FollowListScreen
 *     userId={userId}
 *     initialTab="followers" | "following"
 *     onClose={() => {}}
 *     onUserPress={(userId) => {}}
 *   />
 */

import { SkeletonLoader } from '@/components/SkeletonLoader';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');

type Tab = 'following' | 'followers';

interface UserRow {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    user_type: 'individual' | 'corporate';
    isFollowedByMe?: boolean;
}

interface Props {
    visible: boolean;
    userId: string;
    initialTab?: Tab;
    onClose: () => void;
    onUserPress?: (userId: string) => void;
}

const TABS: { key: Tab; label: string }[] = [
    { key: 'following', label: 'Takip Edilen' },
    { key: 'followers', label: 'Takipçiler' },
];

export default function FollowListScreen({
    visible, userId, initialTab = 'followers', onClose, onUserPress,
}: Props) {
    const insets = useSafeAreaInsets();
    const { authState } = useAuth();
    const [tab, setTab] = useState<Tab>(initialTab);
    const [following, setFollowing] = useState<UserRow[]>([]);
    const [followers, setFollowers] = useState<UserRow[]>([]);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [loadingFollowers, setLoadingFollowers] = useState(false);
    const [myFollowingSet, setMyFollowingSet] = useState<Set<string>>(new Set());

    // Tab indicator animasyonu
    const indicatorX = useRef(new Animated.Value(initialTab === 'following' ? 0 : 1)).current;

    useEffect(() => {
        if (!visible || !userId) return;
        fetchBoth();
    }, [visible, userId]);

    const fetchBoth = async () => {
        setLoadingFollowing(true);
        setLoadingFollowers(true);

        try {
            // Kimin takipçisi / takip ettiklerini çek
            const [{ data: followingData }, { data: followersData }, { data: myFollowsData }] = await Promise.all([
                (supabase as any).from('follows')
                    .select('following_id, profiles!follows_following_id_fkey(id, username, full_name, avatar_url, user_type)')
                    .eq('follower_id', userId),
                (supabase as any).from('follows')
                    .select('follower_id, profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, user_type)')
                    .eq('following_id', userId),
                // Benim takip ettiklerim (buton durumu için)
                authState.user
                    ? (supabase as any).from('follows').select('following_id').eq('follower_id', authState.user.id)
                    : Promise.resolve({ data: [] }),
            ]);

            const mySet = new Set<string>((myFollowsData || []).map((r: any) => r.following_id));
            setMyFollowingSet(mySet);

            setFollowing(
                (followingData || []).map((r: any): UserRow => ({
                    id: r.profiles?.id || r.following_id,
                    username: r.profiles?.username || '',
                    full_name: r.profiles?.full_name || '',
                    avatar_url: r.profiles?.avatar_url || '',
                    user_type: r.profiles?.user_type || 'individual',
                    isFollowedByMe: mySet.has(r.profiles?.id || r.following_id),
                }))
            );

            setFollowers(
                (followersData || []).map((r: any): UserRow => ({
                    id: r.profiles?.id || r.follower_id,
                    username: r.profiles?.username || '',
                    full_name: r.profiles?.full_name || '',
                    avatar_url: r.profiles?.avatar_url || '',
                    user_type: r.profiles?.user_type || 'individual',
                    isFollowedByMe: mySet.has(r.profiles?.id || r.follower_id),
                }))
            );
        } catch (e) {
            if (__DEV__) console.warn('[FollowList] fetch error:', e);
        } finally {
            setLoadingFollowing(false);
            setLoadingFollowers(false);
        }
    };

    const switchTab = (t: Tab) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTab(t);
        Animated.spring(indicatorX, {
            toValue: t === 'following' ? 0 : 1,
            tension: 120,
            friction: 12,
            useNativeDriver: true,
        }).start();
    };

    const toggleFollow = useCallback(async (targetId: string, isCurrentlyFollowing: boolean) => {
        if (!authState.user) return;
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_RE.test(targetId)) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Optimistic update
        const update = (list: UserRow[]) =>
            list.map(u => u.id === targetId ? { ...u, isFollowedByMe: !isCurrentlyFollowing } : u);
        setFollowing(update);
        setFollowers(update);
        setMyFollowingSet(prev => {
            const next = new Set(prev);
            isCurrentlyFollowing ? next.delete(targetId) : next.add(targetId);
            return next;
        });

        try {
            if (!isCurrentlyFollowing) {
                await (supabase as any).from('follows')
                    .upsert({ follower_id: authState.user.id, following_id: targetId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });
            } else {
                await (supabase as any).from('follows').delete()
                    .eq('follower_id', authState.user.id).eq('following_id', targetId);
            }
        } catch {
            // Rollback
            const revert = (list: UserRow[]) =>
                list.map(u => u.id === targetId ? { ...u, isFollowedByMe: isCurrentlyFollowing } : u);
            setFollowing(revert);
            setFollowers(revert);
        }
    }, [authState.user]);

    const data = tab === 'following' ? following : followers;
    const loading = tab === 'following' ? loadingFollowing : loadingFollowers;
    const isOwnProfile = authState.user?.id === userId;

    const renderItem = useCallback(({ item }: { item: UserRow }) => {
        const isMe = authState.user?.id === item.id;
        return (
            <TouchableOpacity
                style={s.row}
                activeOpacity={0.8}
                onPress={() => {
                    if (!isMe) onUserPress?.(item.id);
                }}
            >
                <Image
                    source={{ uri: item.avatar_url || 'https://ui-avatars.com/api/?background=333&color=fff' }}
                    style={s.avatar}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                />
                <View style={s.info}>
                    <View style={s.nameRow}>
                        <Text style={s.username}>@{item.username}</Text>
                        {item.user_type === 'corporate' && (
                            <View style={s.badge}>
                                <Text style={s.badgeText}>Kurumsal</Text>
                            </View>
                        )}
                    </View>
                    <Text style={s.fullName} numberOfLines={1}>{item.full_name}</Text>
                </View>

                {/* Takip butonu — kendi profili ve kendisi hariç */}
                {!isMe && (
                    <TouchableOpacity
                        style={[s.followBtn, item.isFollowedByMe && s.followBtnActive]}
                        onPress={() => toggleFollow(item.id, !!item.isFollowedByMe)}
                    >
                        <Text style={[s.followBtnText, item.isFollowedByMe && s.followBtnTextActive]}>
                            {item.isFollowedByMe ? 'Takipte' : 'Takip Et'}
                        </Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    }, [authState.user, onUserPress, toggleFollow]);

    const indicatorTranslate = indicatorX.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SW / 2],
    });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[s.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={22} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={s.title}>Takip</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Tab Bar */}
                <View style={s.tabBar}>
                    {TABS.map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={s.tabItem}
                            onPress={() => switchTab(t.key)}
                            activeOpacity={0.8}
                        >
                            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {/* Animated indicator */}
                    <Animated.View
                        style={[s.tabIndicator, { transform: [{ translateX: indicatorTranslate }] }]}
                    />
                </View>

                {/* List */}
                {loading ? (
                    <View style={{ paddingTop: 8 }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <View key={i} style={s.skeletonRow}>
                                <SkeletonLoader.Avatar size={46} />
                                <View style={{ flex: 1, gap: 8 }}>
                                    <SkeletonLoader width="55%" height={13} />
                                    <SkeletonLoader width="40%" height={11} />
                                </View>
                                <SkeletonLoader width={70} height={32} borderRadius={8} />
                            </View>
                        ))}
                    </View>
                ) : (
                    <FlatList
                        data={data}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={data.length === 0 ? s.emptyContainer : undefined}
                        ListEmptyComponent={
                            <View style={s.empty}>
                                <Ionicons name="people-outline" size={52} color={Colors.textDim} />
                                <Text style={s.emptyText}>
                                    {tab === 'following' ? 'Henüz kimseyi takip etmiyor' : 'Henüz takipçi yok'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    header: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    closeBtn: {
        width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 20,
    },
    title: { fontSize: 17, fontWeight: '700', color: Colors.text },

    tabBar: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        position: 'relative',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.textMuted,
    },
    tabTextActive: {
        color: Colors.text,
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: SW / 2,
        height: 2.5,
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    avatar: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: Colors.surfaceAlt,
    },
    info: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    username: { fontSize: 14, fontWeight: '600', color: Colors.text },
    fullName: { fontSize: 12, color: Colors.textMuted },
    badge: {
        backgroundColor: Colors.primary + '18',
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    badgeText: { fontSize: 10, fontWeight: '600', color: Colors.primary },

    followBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: Colors.primary,
        minWidth: 80,
        alignItems: 'center',
    },
    followBtnActive: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    followBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
    followBtnTextActive: { color: Colors.textMuted },

    emptyContainer: { flex: 1 },
    empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center' },

    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
});
