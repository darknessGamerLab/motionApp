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
            // All fetches are independently cached and deduplicated.
            const [profileData, videosResult, likedResult, savedResult, followingResult] = await Promise.all([

                queryCache.get(
                    `profile:${userId}`,
                    () => fetchProfileData(userId),
                    PROFILE_TTL,
                    force
                ),

                queryCache.get(
                    `profile-videos:${userId}`,
                    () => fetchUserVideos({ userId }),
                    VIDEOS_TTL,
                    force
                ),

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

                meId
                    ? queryCache.get(
                        `follow-status:${meId}:${userId}`,
                        async () => {
                            const { data } = await (await import('@/lib/supabase')).supabase
                                .from('follows')
                                .select('id')
                                .eq('follower_id', meId)
                                .eq('following_id', userId)
                                .maybeSingle();
                            return !!data;
                        },
                        PROFILE_TTL,
                        force
                    )
                    : Promise.resolve(false),
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

            const annotatedVideos = await annotateInteractions(mapToVideoData(videosResult.items), meId);
            const annotatedLiked = await annotateInteractions(mapToVideoData(likedResult.items), meId);
            const annotatedSaved = await annotateInteractions(mapToVideoData(savedResult.items), meId);

            const profileRow = profileData as any;
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
            });
            setVideos(annotatedVideos as any);
            setLikedVideos(annotatedLiked as any);
            setSavedVideos(annotatedSaved as any);
            setVideosNextCursor(videosResult.nextCursor);
            setLikedNextCursor(likedResult.nextCursor);
            setSavedNextCursor(savedResult.nextCursor);
            setIsFollowing(followingResult);
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

    const invalidateCache = useCallback(() => {
        if (userId) {
            queryCache.invalidate(`profile:${userId}`);
            queryCache.invalidate(`profile-videos:${userId}`);
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
