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
 *     onChanged={(isFollowing) => onUserFollowed(userId, isFollowing)}
 *   />
 *
 *   // Sadece ikonla compact kullanım (feed üzerinde):
 *   <FollowButton userId={uid} initialFollowing={f} compact />
 *
 *   // Profil ekranında tam boy buton:
 *   <FollowButton userId={uid} initialFollowing={f} fullWidth />
 */

import { useAuth } from '@/contexts/AuthContext';
import { eventBus } from '@/lib/eventBus';
import { supabase } from '@/lib/supabase';
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
    onChanged,
    compact = false,
    fullWidth = false,
    hidden = false,
}: FollowButtonProps) {
    const { authState } = useAuth();
    const [following, setFollowing] = useState(initialFollowing);
    const [loading, setLoading] = useState(false);

    // Mevcut kullanicının kurumsal olup olmadığını kontrol et
    const currentUserType = (authState.profile as any)?.user_type;
    const isCorporateViewer = currentUserType === 'corporate';
    const currentUserId = authState.user?.id;

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
        if (!currentUserId) return;
        const newFollowing = !following;

        // Optimistic
        setFollowing(newFollowing);
        onChanged?.(newFollowing);
        eventBus.emit('follow:changed', { userId, isFollowing: newFollowing });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setLoading(true);
        try {
            if (isCorporateViewer) {
                // Kurumsal kullanıcı → radars tablosuna yaz (radar bildirimi trigger'ı çalışır)
                if (newFollowing) {
                    const { error } = await (supabase as any).from('radars')
                        .upsert({ corporate_id: currentUserId, individual_id: userId }, { onConflict: 'corporate_id,individual_id', ignoreDuplicates: true });
                    if (error) throw error;
                } else {
                    const { error } = await (supabase as any).from('radars').delete()
                        .eq('corporate_id', currentUserId).eq('individual_id', userId);
                    if (error) throw error;
                }
            } else {
                // Bireysel kullanıcı → follows tablosuna yaz
                if (newFollowing) {
                    await followUser(userId);
                } else {
                    await unfollowUser(userId);
                }
            }
        } catch {
            // Rollback
            setFollowing(!newFollowing);
            onChanged?.(!newFollowing);
            eventBus.emit('follow:changed', { userId, isFollowing: !newFollowing });
        } finally {
            setLoading(false);
        }
    }, [userId, following, onChanged, isCorporateViewer, currentUserId]);

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
                ) : following ? (
                    <Ionicons name={isCorporateViewer ? 'radio' : 'checkmark'} size={14} color="rgba(255,255,255,0.6)" />
                ) : (
                    <Text style={cs.txt}>{isCorporateViewer ? 'Radara Al' : 'Takip Et'}</Text>
                )}
            </TouchableOpacity>
        );
    }

    // ── Full-width (profile page) ────────────────────────────────────────
    const label = following
        ? (isCorporateViewer ? 'Radarda 📡' : 'Takip Ediliyor')
        : (isCorporateViewer ? 'Radara Al' : 'Takip Et');

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
                    {isCorporateViewer && <Ionicons name={following ? 'radio' : 'radio-outline'} size={14} color={following ? '#888' : '#fff'} style={{ marginRight: 4 }} />}
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

const fs = StyleSheet.create({
    btn: {
        height: 34,
        paddingHorizontal: 20,
        borderRadius: 8,
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
    txt: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
    txtFollowing: { color: '#555', fontFamily: 'Poppins_500Medium' },
});
