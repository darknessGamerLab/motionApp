/**
 * hooks/useFeed.ts — Merkezi video feed yönetimi
 *
 * index.tsx'ten çıkarıldı. Tüm feed mantığı (fetch, pagination,
 * realtime subscriptions, optimistic updates) burada yaşar.
 *
 * Kullanım:
 *   const feed = useFeed({ userId, isAuth });
 *   // feed.videos, feed.loading, feed.fetchVideos, feed.loadMore, ...
 */

import { supabase } from '@/lib/supabase';
import { VideoItem, toVideoItem } from '@/types/video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const PAGE_SIZE = 15;

interface UseFeedOptions {
    userId?: string;
    isAuth: boolean;
}

export interface FeedState {
    videos: VideoItem[];
    loading: boolean;
    initialLoaded: boolean;
    lastTimestamp: string | null;
    hasMore: boolean;
}

export interface UseFeedReturn extends FeedState {
    fetchVideos: (page?: number) => Promise<void>;
    loadMore: () => void;
    /** Optimistic state updaters — called from UI without a full refetch */
    updateVideoLike: (id: string, isLiked: boolean, likes: number) => void;
    updateVideoSave: (id: string, isSaved: boolean) => void;
    updateVideoComment: (id: string, comments: number) => void;
    updateUserFollow: (authorId: string, isFollowing: boolean) => void;
    deleteVideo: (videoId: string) => Promise<void>;
    prependVideo: (item: VideoItem) => void;
    setVideos: React.Dispatch<React.SetStateAction<VideoItem[]>>;
}

export function useFeed({ userId, isAuth }: UseFeedOptions): UseFeedReturn {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [page, setPage] = useState(0);

    const isLoadingRef = useRef(false);
    const hasInitiallyLoaded = useRef(false);

    // ─── Video Fetch ──────────────────────────────────────────────────────
    const fetchVideos = useCallback(async (pg = 0, append = false) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('videos')
                .select(
                    'id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url)'
                )
                .order('created_at', { ascending: false })
                .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1);

            if (error) {
                if (__DEV__) console.warn('[useFeed] fetch error:', error.message);
                return;
            }

            const rows: VideoItem[] = (data || []).map(toVideoItem);

            // Mark liked/saved/followed for authenticated users
            if (userId && rows.length > 0) {
                const ids = rows.map(v => v.id).filter(id => id && id.length > 5);
                const userIds = Array.from(new Set(rows.map(v => v.user.id))).filter(id => id && id.length > 5);

                const [{ data: likedData }, { data: savedData }, { data: followsData }] =
                    await Promise.all([
                        ids.length > 0
                            ? (supabase as any).from('likes').select('video_id').eq('user_id', userId).in('video_id', ids)
                            : Promise.resolve({ data: [] }),
                        ids.length > 0
                            ? (supabase as any).from('saves').select('video_id').eq('user_id', userId).in('video_id', ids)
                            : Promise.resolve({ data: [] }),
                        userIds.length > 0
                            ? (supabase as any).from('follows').select('following_id').eq('follower_id', userId).in('following_id', userIds)
                            : Promise.resolve({ data: [] }),
                    ]);

                const likedSet = new Set((likedData || []).map((r: any) => r.video_id));
                const savedSet = new Set((savedData || []).map((r: any) => r.video_id));
                const followSet = new Set((followsData || []).map((r: any) => r.following_id));

                rows.forEach(v => {
                    v.isLiked = likedSet.has(v.id);
                    v.isSaved = savedSet.has(v.id);
                    v.isFollowing = followSet.has(v.user.id);
                });
            }

            setVideos(prev => (append ? [...prev, ...rows] : rows));
            setPage(pg);
        } catch (e) {
            if (__DEV__) console.warn('[useFeed] fetch exception:', e);
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
            setInitialLoaded(true); // Always set to true regardless of success to hide loaders
        }
    }, [userId]);

    // ─── Initial load + re-fetch when userId changes ─────────────────────
    useEffect(() => {
        if (!hasInitiallyLoaded.current) {
            fetchVideos(0);
            hasInitiallyLoaded.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Re-fetch when user identity changes (to update liked/saved states)
        if (hasInitiallyLoaded.current) {
            fetchVideos(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ─── Realtime Subscription ────────────────────────────────────────────
    useEffect(() => {
        const channel = (supabase as any)
            .channel('feed-video-events')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' },
                (payload: any) => {
                    setVideos(prev =>
                        prev.map(v =>
                            v.id === payload.new.id
                                ? {
                                    ...v,
                                    likes: payload.new.likes_count ?? v.likes,
                                    comments: payload.new.comments_count ?? v.comments,
                                }
                                : v
                        )
                    );
                }
            )
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'videos' },
                (payload: any) => {
                    setVideos(prev => prev.filter(v => v.id !== payload.old?.id));
                }
            )
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' },
                (payload: any) => {
                    // Only prepend videos from OTHER users (own video prepended optimistically)
                    if (payload.new?.user_id && payload.new.user_id !== userId) {
                        setVideos(prev => [toVideoItem(payload.new), ...prev]);
                    }
                }
            )
            .subscribe();

        return () => { (supabase as any).removeChannel(channel); };
    }, [userId]);

    // ─── Pagination ───────────────────────────────────────────────────────
    const loadMore = useCallback(() => {
        fetchVideos(page + 1, true);
    }, [fetchVideos, page]);

    // ─── Optimistic State Updaters ────────────────────────────────────────

    const updateVideoLike = useCallback((id: string, isLiked: boolean, likes: number) => {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, isLiked, likes } : v));
        if (!isAuth || !userId) return;
        (async () => {
            try {
                if (isLiked) {
                    await (supabase as any).from('likes')
                        .upsert({ user_id: userId, video_id: id }, { onConflict: 'user_id,video_id', ignoreDuplicates: true });
                } else {
                    await (supabase as any).from('likes').delete().eq('user_id', userId).eq('video_id', id);
                }
            } catch (e) { if (__DEV__) console.warn('[useFeed] like sync error:', e); }
        })();
    }, [isAuth, userId]);

    const updateVideoSave = useCallback((id: string, isSaved: boolean) => {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, isSaved } : v));
        if (!isAuth || !userId) return;
        (async () => {
            try {
                if (isSaved) {
                    await (supabase as any).from('saves')
                        .upsert({ user_id: userId, video_id: id }, { onConflict: 'user_id,video_id', ignoreDuplicates: true });
                } else {
                    await (supabase as any).from('saves').delete().eq('user_id', userId).eq('video_id', id);
                }
            } catch (e) { if (__DEV__) console.warn('[useFeed] save sync error:', e); }
        })();
    }, [isAuth, userId]);

    const updateVideoComment = useCallback((id: string, comments: number) => {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, comments } : v));
    }, []);

    const updateUserFollow = useCallback((authorId: string, isFollowing: boolean) => {
        setVideos(prev => prev.map(v => v.user.id === authorId ? { ...v, isFollowing } : v));
        if (!isAuth || !userId) return;
        (async () => {
            try {
                if (isFollowing) {
                    await (supabase as any).from('follows')
                        .upsert({ follower_id: userId, following_id: authorId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });
                } else {
                    await (supabase as any).from('follows').delete()
                        .eq('follower_id', userId).eq('following_id', authorId);
                }
            } catch (e) { if (__DEV__) console.warn('[useFeed] follow sync error:', e); }
        })();
    }, [isAuth, userId]);

    const deleteVideo = useCallback(async (videoId: string) => {
        if (!userId) return;

        // Optimistic remove
        let deletedVideo: VideoItem | undefined;
        setVideos(prev => {
            deletedVideo = prev.find(v => v.id === videoId && v.user.id === userId);
            return prev.filter(v => v.id !== videoId);
        });

        try {
            const { error } = await (supabase as any)
                .from('videos')
                .delete()
                .eq('id', videoId)
                .eq('user_id', userId);

            if (error) {
                if (deletedVideo) setVideos(prev => [deletedVideo!, ...prev]);
                Alert.alert('Hata', 'Video silinemedi: ' + error.message);
                return;
            }

            // Storage cleanup (best effort)
            if (deletedVideo?.uri) {
                const videoPath = deletedVideo.uri.split('/videos/')[1];
                if (videoPath) {
                    try { await (supabase as any).storage.from('videos').remove([videoPath]); } catch { }
                }
            }
            if (deletedVideo?.thumbnail_url) {
                const thumbPath = deletedVideo.thumbnail_url.split('/thumbnails/')[1];
                if (thumbPath) {
                    try { await (supabase as any).storage.from('thumbnails').remove([thumbPath]); } catch { }
                }
            }
        } catch (e) {
            if (deletedVideo) setVideos(prev => [deletedVideo!, ...prev]);
            if (__DEV__) console.warn('[useFeed] deleteVideo exception:', e);
        }
    }, [userId]);

    const prependVideo = useCallback((item: VideoItem) => {
        setVideos(prev => [item, ...prev]);
    }, []);

    return {
        videos,
        loading,
        initialLoaded,
        lastTimestamp: null,
        hasMore: true,
        fetchVideos: (pg?: number) => fetchVideos(pg),
        loadMore,
        updateVideoLike,
        updateVideoSave,
        updateVideoComment,
        updateUserFollow,
        deleteVideo,
        prependVideo,
        setVideos,
    };
}
