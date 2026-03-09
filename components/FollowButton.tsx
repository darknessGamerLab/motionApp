/**
 * FollowButton — Uygulama genelinde paylaşılan takip butonu
 *
 * Sorun: HomeScreen VideoCard, UserProfileScreen ve NotificationsScreen'de
 * 3 farklı `handleFollow` implementasyonu var — her biri raw supabase çağrısı
 * veya kendi callback zincirine sahip. EventBus entegrasyonu da dağınık.
 *
 * Çözüm: Bu bileşen tüm follow mantığını içerir:
 *  - Optimistic update (anında UI günceller)
 *  - DB yazma (`interactionService.followUser` / `unfollowUser`)
 *  - Hata durumunda rollback
 *  - EventBus yayını (`follow:changed`) → tüm ekranlar güncellenir
 *  - Haptic feedback
 *  - Kurumsal kullanıcı stil farkı (Radara Al vs Takip Et)
 *
 * Kullanım:
 *   <FollowButton
 *     userId={video.user.id}
 *     initialFollowing={video.isFollowing}
 *     isCorporate={video.user.user_type === 'corporate'}
 *     onChanged={(isFollowing) => onUserFollowed(userId, isFollowing)}
 *   />
 *
 *   // Sadece ikonla compact kullanım (feed üzerinde):
 *   <FollowButton userId={uid} initialFollowing={f} compact />
 *
 *   // Profil ekranında tam boy buton:
 *   <FollowButton userId={uid} initialFollowing={f} fullWidth />
 */

import { eventBus } from '@/lib/eventBus';
import { followUser, unfollowUser } from '@/services/interactionService';
import { isValidUUID } from '@/utils/validate';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FollowButtonProps {
    userId: string;
    initialFollowing?: boolean;
    isCorporate?: boolean;
    /** Called after optimistic update (before DB response) */
    onChanged?: (isFollowing: boolean) => void;
    /** Compact mode: small pill button used in VideoCard overlay */
    compact?: boolean;
    /** Full-width mode: used in UserProfileScreen below the profile header */
    fullWidth?: boolean;
    /** Hide the button entirely (e.g. own profile) */
    hidden?: boolean;
}

export default function FollowButton({
    userId,
    initialFollowing = false,
    isCorporate = false,
    onChanged,
    compact = false,
    fullWidth = false,
    hidden = false,
}: FollowButtonProps) {
    const [following, setFollowing] = useState(initialFollowing);
    const [loading, setLoading] = useState(false);

    // Sync from external EventBus (e.g. another screen followed/unfollowed same user)
    useEffect(() => {
        const unsub = eventBus.on('follow:changed', ({ userId: uid, isFollowing: val }) => {
            if (uid === userId) setFollowing(val);
        });
        return unsub;
    }, [userId]);

    // Sync initial prop changes (e.g. parent re-fetched data)
    useEffect(() => {
        setFollowing(initialFollowing);
    }, [initialFollowing]);

    const handlePress = useCallback(async () => {
        if (!isValidUUID(userId)) return;
        const newFollowing = !following;

        // Optimistic
        setFollowing(newFollowing);
        onChanged?.(newFollowing);
        eventBus.emit('follow:changed', { userId, isFollowing: newFollowing });

        Haptics.impactAsync(
            isCorporate
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light,
        );

        setLoading(true);
        try {
            if (newFollowing) {
                await followUser(userId);
            } else {
                await unfollowUser(userId);
            }
        } catch {
            // Rollback
            setFollowing(!newFollowing);
            onChanged?.(!newFollowing);
            eventBus.emit('follow:changed', { userId, isFollowing: !newFollowing });
        } finally {
            setLoading(false);
        }
    }, [userId, following, isCorporate, onChanged]);

    if (hidden) return null;

    // ── Compact (feed overlay) ───────────────────────────────────────────
    if (compact) {
        return (
            <TouchableOpacity
                style={[cs.btn, following && cs.btnFollowing]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                ) : isCorporate ? (
                    <>
                        <Ionicons
                            name={following ? 'radio' : 'radio-outline'}
                            size={12}
                            color={following ? 'rgba(255,255,255,0.6)' : '#fff'}
                        />
                        <Text style={[cs.txt, following && cs.txtFollowing]}>
                            {following ? 'Radarda' : 'Radara Al'}
                        </Text>
                    </>
                ) : following ? (
                    <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.6)" />
                ) : (
                    <Text style={cs.txt}>Takip Et</Text>
                )}
            </TouchableOpacity>
        );
    }

    // ── Full-width (profile page) ────────────────────────────────────────
    const label = isCorporate
        ? (following ? 'Radarda' : 'Radara Al')
        : (following ? 'Takip Ediliyor' : 'Takip Et');

    return (
        <TouchableOpacity
            style={[fs.btn, following && fs.btnFollowing, fullWidth && fs.fullWidth]}
            onPress={handlePress}
            activeOpacity={0.85}
        >
            {loading ? (
                <ActivityIndicator size="small" color={following ? '#888' : '#fff'} />
            ) : (
                <View style={fs.inner}>
                    {isCorporate && (
                        <Ionicons
                            name={following ? 'radio' : 'radio-outline'}
                            size={14}
                            color={following ? '#888' : '#fff'}
                            style={{ marginRight: 4 }}
                        />
                    )}
                    <Text style={[fs.txt, following && fs.txtFollowing]}>{label}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ── Compact styles ────────────────────────────────────────────────────
const cs = StyleSheet.create({
    btn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.8)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minWidth: 32,
        justifyContent: 'center',
    },
    btnFollowing: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'transparent',
    },
    txt: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
    txtFollowing: { color: 'rgba(255,255,255,0.7)' },
});

// ── Full-width styles ─────────────────────────────────────────────────
const fs = StyleSheet.create({
    btn: {
        height: 38,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnFollowing: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#ddd',
    },
    fullWidth: {
        flex: 1,
    },
    inner: { flexDirection: 'row', alignItems: 'center' },
    txt: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    txtFollowing: { color: '#555', fontFamily: 'Poppins_500Medium' },
});
