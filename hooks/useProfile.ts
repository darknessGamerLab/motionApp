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
import { supabase } from '@/lib/supabase';
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
            // All three fetches are independently cached and deduplicated.
            // If two components mount at the same time asking for the same userId,
            // queryCache.get() returns the same in-flight promise — ONE request only.
            const [profileData, videoList, followingResult] = await Promise.all([

                queryCache.get(
                    `profile:${userId}`,
                    async () => {
                        const { data, error } = await (supabase as any)
                            .from('profiles')
                            .select('id, username, full_name, bio, avatar_url, avatars, user_type, talents, followers_count, following_count, videos_count')
                            .eq('id', userId)
                            .single();
                        if (error) throw error;
                        return data;
                    },
                    PROFILE_TTL,
                    force
                ),

                queryCache.get(
                    `profile-videos:${userId}`,
                    async () => {
                        const { data, error } = await (supabase as any)
                            .from('videos')
                            .select('id, video_url, user_id, description, topic, category, likes_count, comments_count, shares_count, thumbnail_url, profiles(id, username, avatar_url)')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false });
                        if (error) throw error;
                        return (data || []).map((row: any): VideoData => ({
                            id: row.id,
                            uri: row.video_url || '',
                            thumbnail_url: row.thumbnail_url,
                            user: { id: row.user_id, username: row.profiles?.username || '', avatar: row.profiles?.avatar_url },
                            description: row.description || '',
                            topic: row.topic || row.category || '',
                            likes: row.likes_count || 0,
                            comments: row.comments_count || 0,
                            shares: row.shares_count || 0,
                            isLiked: false,
                            isSaved: false,
                        }));
                    },
                    VIDEOS_TTL,
                    force
                ),

                meId
                    ? queryCache.get(
                        `follow-status:${meId}:${userId}`,
                        async () => {
                            const { data } = await (supabase as any)
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

            setProfile(profileData);
            setVideos(videoList);
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
        loading,
        isFollowing,
        hasRadar: isFollowing,
        setIsFollowing: setIsFollowingWithCache,
        setHasRadar: setIsFollowingWithCache,
        refetch: () => fetchProfile(true),
        invalidateCache,
    };
}
