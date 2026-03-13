/**
 * useProfile — Profil verisi yönetimi hook'u
 *
 * Başka bir kullanıcının profil verisini DB'den çeker.
 * queryCache tabanlı, loading/error state'li ve follow durumunu içerir.
 *
 * ÖNEMLİ: "Radara Al" = "Takip Et" aynı eylemdir.
 * İkisi de `follows` tablosuna yazar. Sadece UI label'ı farklıdır.
 *
 * PERFORMANCE: Module-level queryCache ensures:
 * - Same user opened from Feed + Profile + Explore → ONE network request
 * - Navigating back and revisiting profile → cache served (no refetch within TTL)
 * - In-flight deduplication: simultaneous requests return the same promise
 */

import { useAuth } from '@/contexts/AuthContext';
import { eventBus } from '@/lib/eventBus';
import { queryCache } from '@/lib/queryCache';
import { fetchProfile as fetchProfileData } from '@/services/profileService';
import { fetchUserLikedVideos, fetchUserSavedVideos, fetchUserVideos } from '@/services/videoService';
import { annotateInteractions } from '@/utils/videoInteractions';
import { useCallback, useEffect, useRef, useState } from 'react';

const PROFILE_TTL = 60_000;  // 60 seconds
const VIDEOS_TTL = 30_000;  // 30 seconds (fresher)

export interface ProfileData {
    id: string;
    username: string;
    full_name: string;
    bio: string;
    avatar_url: string;
    avatars: string[];
    user_type: 'individual' | 'corporate';
    talents: string[];
    followers_count: number;
    following_count: number;
    videos_count: number;
    hide_likes: boolean;
    hide_saves: boolean;
}

export interface VideoData {
    id: string;
    uri: string;
    thumbnail_url?: string;
    user: { id: string; username: string; avatar?: string };
    description: string;
    topic: string;
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    isSaved: boolean;
}

export function useProfile(userId?: string) {
    const { authState } = useAuth();
    const meId = authState.user?.id;

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [likedVideos, setLikedVideos] = useState<VideoData[]>([]);
    const [savedVideos, setSavedVideos] = useState<VideoData[]>([]);
    const [videosNextCursor, setVideosNextCursor] = useState<string | null>(null);
    const [likedNextCursor, setLikedNextCursor] = useState<string | null>(null);
    const [savedNextCursor, setSavedNextCursor] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(!!userId);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    const fetchProfile = useCallback(async (force = false) => {
        if (!userId) return;

        setLoading(true);
        try {
            // 1. Fetch BFF Data (Profile, Follow status, First 15 Videos) in exactly ONE request
            const bffData = await queryCache.get(
                `profile-bff:${userId}:${meId || 'anon'}`,
                async () => {
                    const { supabase: sb } = await import('@/lib/supabase');
                    const { data, error } = await (sb as any).rpc('get_profile_bff', {
                        p_user_id: userId,
                        p_viewer_id: meId || null
                    });
                    if (error) throw error;
                    return data as { profile: any; is_following: boolean; videos: any[] };
                },
                PROFILE_TTL,
                force
            ) as { profile: any; is_following: boolean; videos: any[] };

            // 2. Map and Annotate
            const bffVideos = bffData.videos.map((v: any) => ({
                id: v.id,
                uri: v.video_url ?? '',
                thumbnail_url: v.thumbnail_url,
                user: v.user,
                description: v.description ?? '',
                topic: v.topic ?? '',
                likes: v.likes ?? 0,
                comments: v.comments ?? 0,
                shares: v.shares ?? 0,
                isLiked: false,
                isSaved: false,
            }));

            // 3. Launch Liked/Saved fetches in background / parallel (less critical for first paint)
            const [likedResult, savedResult] = await Promise.all([
                queryCache.get(
                    `profile-liked-videos:${userId}`,
                    () => fetchUserLikedVideos({ userId }),
                    VIDEOS_TTL,
                    force
                ),
                queryCache.get(
                    `profile-saved-videos:${userId}`,
                    () => fetchUserSavedVideos({ userId }),
                    VIDEOS_TTL,
                    force
                ),
            ]);

            if (!mounted.current) return;

            // Map service results to hook VideoData shape for the UI
            const mapToVideoData = (items: any[]): VideoData[] => items.map((v: any) => ({
                id: v.id,
                uri: v.uri ?? v.video_url ?? '',
                thumbnail_url: v.thumbnail_url,
                user: v.user ?? { id: v.user_id, username: '', avatar: undefined },
                description: v.description ?? '',
                topic: v.topic ?? '',
                likes: v.likes ?? v.likes_count ?? 0,
                comments: v.comments ?? v.comments_count ?? 0,
                shares: v.shares ?? v.shares_count ?? 0,
                isLiked: false,
                isSaved: false,
            }));

            const annotatedVideos = await annotateInteractions(bffVideos, meId);
            const annotatedLiked = await annotateInteractions(mapToVideoData(likedResult.items), meId);
            const annotatedSaved = await annotateInteractions(mapToVideoData(savedResult.items), meId);

            const profileRow = bffData.profile;
            setProfile({
                id: profileRow.id,
                username: profileRow.username,
                full_name: profileRow.full_name,
                bio: profileRow.bio ?? '',
                avatar_url: profileRow.avatar_url ?? '',
                avatars: profileRow.avatars ?? [],
                user_type: profileRow.user_type,
                talents: profileRow.talents ?? [],
                followers_count: profileRow.followers_count ?? 0,
                following_count: profileRow.following_count ?? 0,
                videos_count: profileRow.videos_count ?? 0,
                hide_likes: profileRow.hide_likes ?? false,
                hide_saves: profileRow.hide_saves ?? false,
            });
            setVideos(annotatedVideos as any);
            setLikedVideos(annotatedLiked as any);
            setSavedVideos(annotatedSaved as any);
            setVideosNextCursor(null); // BFF returns exactly 15, next cursor can be handled if needed
            setLikedNextCursor(likedResult.nextCursor);
            setSavedNextCursor(savedResult.nextCursor);
            setIsFollowing(bffData.is_following);
        } catch (e) {
            if (__DEV__) console.warn('[useProfile] error:', e);
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [userId, meId]);  // stable: only changes when userId or meId changes

    // Fetch on mount / userId change — NOT on every render
    useEffect(() => {
        if (userId) fetchProfile();
    }, [fetchProfile]);

    // ─── EventBus: follow:changed listener ───────────────────────────────────
    // Feed'de takip edilince UserProfileScreen'i de günceller (veri tutarsızlığı giderme)
    useEffect(() => {
        if (!userId) return;
        const unsubFollow = eventBus.on('follow:changed', ({ userId: changedUserId, isFollowing: newVal }) => {
            if (changedUserId === userId) {
                setIsFollowing(newVal);
                // Cache'i de geçersiz kıl so that next open reads fresh
                if (meId) queryCache.invalidate(`follow-status:${meId}:${userId}`);
            }
        });

        // Kendi profilimizdeyken bir video kaydedilirse/beğenilirse anında güncelle
        const unsubSave = eventBus.on('video:saved', ({ videoId, isSaved }) => {
            if (meId === userId) {
                queryCache.invalidate(`profile-saved-videos:${userId}`);
                fetchProfile(true); // reload to get new saved videos
            }
        });

        const unsubLike = eventBus.on('video:liked', ({ videoId, isLiked }) => {
            if (meId === userId) {
                queryCache.invalidate(`profile-liked-videos:${userId}`);
                fetchProfile(true); // reload to get new liked videos
            }
        });

        return () => {
            unsubFollow();
            unsubSave();
            unsubLike();
        };
    }, [userId, meId, fetchProfile]);

    const invalidateCache = useCallback(() => {
        if (userId) {
            queryCache.invalidate(`profile-bff:${userId}:${meId || 'anon'}`);
            queryCache.invalidate(`profile-liked-videos:${userId}`);
            queryCache.invalidate(`profile-saved-videos:${userId}`);
            if (meId) queryCache.invalidate(`follow-status:${meId}:${userId}`);
        }
    }, [userId, meId]);

    // When the user follows/unfollows, also update the cache so other
    // components reading the same key see the correct value immediately.
    const setIsFollowingWithCache = useCallback((value: boolean) => {
        setIsFollowing(value);
        if (meId && userId) {
            // Optimistically update the cache so a subsequent refetch
            // (e.g. from another component) still returns the right value.
            queryCache.invalidate(`follow-status:${meId}:${userId}`);
        }
    }, [meId, userId]);

    return {
        profile,
        videos,
        likedVideos,
        savedVideos,
        videosNextCursor,
        likedNextCursor,
        savedNextCursor,
        loading,
        isFollowing,
        hasRadar: isFollowing,
        setIsFollowing: setIsFollowingWithCache,
        setHasRadar: setIsFollowingWithCache,
        refetch: () => fetchProfile(true),
        invalidateCache,
    };
}
