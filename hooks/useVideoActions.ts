/**
 * useVideoActions — Merkezi video aksiyon hook'u
 * 
 * Like, save, follow, comment gibi tüm video etkileşimleri burada yönetilir.
 * Optimistic update → DB sync → rollback on error pattern'i uygular.
 * 
 * @usage
 *   const { toggleLike, toggleSave, followUser } = useVideoActions({ videoId, userId, ... });
 */

import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/utils/validate';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';


interface UseVideoActionsOptions {
    currentUserId?: string;
    isAuthenticated: boolean;
    onAuthRequired?: (action: 'like' | 'comment' | 'save' | 'follow' | 'general') => void;
}

export function useVideoActions({
    currentUserId,
    isAuthenticated,
    onAuthRequired,
}: UseVideoActionsOptions) {

    const authGuard = useCallback((
        action: 'like' | 'comment' | 'save' | 'follow',
        fn: () => void
    ) => {
        if (!isAuthenticated || !currentUserId) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onAuthRequired?.(action);
            return;
        }
        fn();
    }, [isAuthenticated, currentUserId, onAuthRequired]);

    const like = useCallback(async (videoId: string, isLiked: boolean): Promise<void> => {
        if (!currentUserId || !isValidUUID(videoId)) return;
        try {
            if (isLiked) {
                await (supabase as any).from('likes')
                    .upsert({ user_id: currentUserId, video_id: videoId }, { onConflict: 'user_id,video_id', ignoreDuplicates: true });
            } else {
                await (supabase as any).from('likes').delete()
                    .eq('user_id', currentUserId).eq('video_id', videoId);
            }
        } catch (e) {
            if (__DEV__) console.warn('[useVideoActions] like error:', e);
            throw e;
        }
    }, [currentUserId]);

    const save = useCallback(async (videoId: string, isSaved: boolean): Promise<void> => {
        if (!currentUserId || !isValidUUID(videoId)) return;
        try {
            if (isSaved) {
                await (supabase as any).from('saves')
                    .upsert({ user_id: currentUserId, video_id: videoId }, { onConflict: 'user_id,video_id', ignoreDuplicates: true });
            } else {
                await (supabase as any).from('saves').delete()
                    .eq('user_id', currentUserId).eq('video_id', videoId);
            }
        } catch (e) {
            if (__DEV__) console.warn('[useVideoActions] save error:', e);
            throw e;
        }
    }, [currentUserId]);

    const follow = useCallback(async (targetUserId: string, isFollowing: boolean): Promise<void> => {
        if (!currentUserId || !isValidUUID(targetUserId)) return;
        if (currentUserId === targetUserId) return; // Kendini takip edemez
        try {
            if (isFollowing) {
                await (supabase as any).from('follows')
                    .upsert(
                        { follower_id: currentUserId, following_id: targetUserId },
                        { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
                    );
            } else {
                await (supabase as any).from('follows').delete()
                    .eq('follower_id', currentUserId).eq('following_id', targetUserId);
            }
        } catch (e) {
            if (__DEV__) console.warn('[useVideoActions] follow error:', e);
            throw e;
        }
    }, [currentUserId]);

    // radar() = follow() — AYNI EYLEM, AYNI TABLO
    // Kurumsal kullanıcıların "Radara Al" butonu da follows tablosuna yazar.
    // follows.followers_count kurumsal+bireysel tüm takipçileri sayar.
    const radar = useCallback(async (individualId: string, hasRadar: boolean): Promise<void> => {
        if (!currentUserId || !isValidUUID(individualId)) return;
        if (currentUserId === individualId) return;
        // follows tablosuna yaz — radars tablosu artık bu eylem için kullanılmıyor
        await follow(individualId, hasRadar);
    }, [currentUserId, follow]);


    const report = useCallback(async (
        targetId: string,
        targetType: 'account' | 'content',
        reason: string
    ): Promise<void> => {
        if (!currentUserId || !isValidUUID(targetId)) {
            throw new Error('invalid_id');
        }
        const { error } = await (supabase as any).from('reports').insert({
            reporter_id: currentUserId,
            target_type: targetType,
            target_id: targetId,
            reason,
            status: 'pending',
        });
        if (error) throw error;
    }, [currentUserId]);

    return { authGuard, like, save, follow, radar, report };
}
