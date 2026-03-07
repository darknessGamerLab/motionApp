/**
 * hooks/useFeed.ts — Merkezi video feed yönetimi
 *
 * TikTok mimarisine uygun güncellemeler (MVP):
 *
 * 1. CURSOR-BASED PAGINATION (was: offset/range)
 *    - Son görülen video'nun `created_at` değeri cursor olarak tutulur
 *    - `.lt('created_at', cursor)` ile devam edilir
 *    - Yeni video eklenince sayfa kaymaz, tekrar gösterilmez
 *
 * 2. FEED CACHE (was: no cache)
 *    - queryCache ile ilk sayfa 30 saniye cache'lenir
 *    - Sekme değiştirme / remount'ta DB isteği yaratmaz
 *    - Cache key: feed:anon | feed:<userId>
 *
 * 3. HASMORE DETECTION (was: hardcoded true)
 *    - data.length < PAGE_SIZE → daha fazla yok
 *
 * 4. NETWORK ERROR TRACKING (new)
 *    - fetchError state ile ağ hatası vs gerçek boş feed ayrışır
 *    - HomeScreen buna göre farklı mesaj gösterebilir
 */

import { CustomAlert } from '@/components/GlobalAlert';
import { queryCache } from '@/lib/queryCache';
import { supabase, THUMBNAILS_BUCKET, VIDEOS_BUCKET } from '@/lib/supabase';
import { toVideoItem, VideoItem } from '@/types/video';
import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 15;
const FEED_CACHE_TTL = 30_000; // 30 seconds — first page only

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
    /** true if last fetch failed (network error, not empty feed) */
    fetchError: boolean;
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
    /** Hard refresh — bypasses cache */
    refresh: () => Promise<void>;
}

export function useFeed({ userId, isAuth }: UseFeedOptions): UseFeedReturn {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    const isLoadingRef = useRef(false);
    const hasInitiallyLoaded = useRef(false);

    /**
     * Annotate rows with like/save/follow state for authenticated users.
     * All three queries run in parallel.
     */
    const annotateInteractions = useCallback(async (rows: VideoItem[]) => {
        if (!userId || rows.length === 0) return rows;

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

        return rows.map(v => ({
            ...v,
            isLiked: likedSet.has(v.id),
            isSaved: savedSet.has(v.id),
            isFollowing: followSet.has(v.user.id),
        }));
    }, [userId]);

    // ─── Video Fetch ──────────────────────────────────────────────────────
    /**
     * fetchVideos:
     *   - cursor=null → first page (cacheable)
     *   - cursor=<timestamp> → next page (never cached, append to list)
     *   - force=true → bypass cache even for first page
     */
    const fetchVideos = useCallback(async (cursor: string | null = null, append = false, force = false) => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        setLoading(true);
        setFetchError(false);

        try {
            const isFirstPage = cursor === null;
            const cacheKey = `feed:${userId ?? 'anon'}`;

            /**
             * TikTok pattern:
             * - First page: queryCache (30s TTL, skip on force/pull-to-refresh)
             *   → only one DB round-trip even if multiple components mount
             * - Subsequent pages: always fresh, cursor-based
             */
            let rows: VideoItem[];

            if (isFirstPage) {
                rows = await queryCache.get(
                    cacheKey,
                    async () => {
                        const { data, error } = await (supabase as any)
                            .from('videos')
                            .select(
                                'id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url)'
                            )
                            .order('created_at', { ascending: false })
                            .limit(PAGE_SIZE);

                        if (error) throw error;
                        return (data || []).map(toVideoItem);
                    },
                    FEED_CACHE_TTL,
                    force
                );
            } else {
                // Cursor-based next page: only get videos older than last seen
                const { data, error } = await (supabase as any)
                    .from('videos')
                    .select(
                        'id, video_url, user_id, description, topic, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url)'
                    )
                    .order('created_at', { ascending: false })
                    .lt('created_at', cursor)           // ← cursor magic: only older
                    .limit(PAGE_SIZE);

                if (error) throw error;
                rows = (data || []).map(toVideoItem);
            }

            // Annotate liked/saved/followed for auth users
            const annotated = await annotateInteractions(rows);

            // hasMore: if we got fewer than PAGE_SIZE items, we've hit the end
            const more = rows.length === PAGE_SIZE;
            setHasMore(more);

            // Track cursor for next loadMore call
            if (annotated.length > 0) {
                const lastItem = annotated[annotated.length - 1];
                // We need created_at from the raw row. Attach it as a temporary field.
                setLastTimestamp((lastItem as any).created_at ?? null);
            }

            setVideos(prev => (append ? [...prev, ...annotated] : annotated));
        } catch (e) {
            if (__DEV__) console.warn('[useFeed] fetch error:', e);
            setFetchError(true);  // ← network error, not empty feed
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
            setInitialLoaded(true);
        }
    }, [userId, annotateInteractions]);

    // ─── Initial load + re-fetch when userId changes ─────────────────────
    useEffect(() => {
        if (!hasInitiallyLoaded.current) {
            fetchVideos(null, false, false);
            hasInitiallyLoaded.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Re-fetch when user identity changes (update liked/saved states)
        if (hasInitiallyLoaded.current) {
            // Invalidate cache on auth change so new user sees correct interaction states
            queryCache.invalidate(`feed:${userId ?? 'anon'}`);
            fetchVideos(null, false, true);
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
                    // NOTE: payload.new lacks `profiles` join — we prepend a placeholder
                    // and invalidate cache so next refresh has the full data.
                    if (payload.new?.user_id && payload.new.user_id !== userId) {
                        queryCache.invalidate(`feed:${userId ?? 'anon'}`);
                        setVideos(prev => [toVideoItem(payload.new), ...prev]);
                    }
                }
            )
            .subscribe();

        return () => { (supabase as any).removeChannel(channel); };
    }, [userId]);

    // ─── Pagination — cursor-based loadMore ───────────────────────────────
    const loadMore = useCallback(() => {
        if (!hasMore || isLoadingRef.current) return;
        fetchVideos(lastTimestamp, true, false);
    }, [fetchVideos, lastTimestamp, hasMore]);

    // ─── Hard refresh (pull-to-refresh) ──────────────────────────────────
    const refresh = useCallback(async () => {
        setVideos([]);
        setLastTimestamp(null);
        setHasMore(true);
        setFetchError(false);
        queryCache.invalidate(`feed:${userId ?? 'anon'}`);
        await fetchVideos(null, false, true);
    }, [fetchVideos, userId]);

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
            // Fetch storage paths BEFORE deleting so we can clean up storage too
            const { data: videoRow } = await supabase
                .from('videos')
                .select('storage_path, thumbnail_path')
                .eq('id', videoId)
                .eq('user_id', userId)
                .single();

            const { error } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoId)
                .eq('user_id', userId);

            if (error) {
                if (deletedVideo) setVideos(prev => [deletedVideo!, ...prev]);
                CustomAlert.alert('Hata', 'Video silinemedi: ' + error.message);
                return;
            }

            // Storage cleanup using stable paths from DB (not fragile URL split)
            if (videoRow?.storage_path) {
                try { await supabase.storage.from(VIDEOS_BUCKET).remove([videoRow.storage_path]); } catch { }
            } else if (deletedVideo?.uri) {
                // Fallback: legacy URL split for videos without storage_path
                const p = deletedVideo.uri.split('/videos/')[1];
                if (p) try { await supabase.storage.from(VIDEOS_BUCKET).remove([p]); } catch { }
            }

            if (videoRow?.thumbnail_path) {
                try { await supabase.storage.from(THUMBNAILS_BUCKET).remove([videoRow.thumbnail_path]); } catch { }
            } else if (deletedVideo?.thumbnail_url) {
                // Fallback: legacy URL split
                const p = deletedVideo.thumbnail_url.split('/thumbnails/')[1];
                if (p) try { await supabase.storage.from(THUMBNAILS_BUCKET).remove([p]); } catch { }
            }

            queryCache.invalidate(`feed:${userId ?? 'anon'}`);
        } catch (e) {
            if (deletedVideo) setVideos(prev => [deletedVideo!, ...prev]);
            if (__DEV__) console.warn('[useFeed] deleteVideo exception:', e);
        }
    }, [userId]);

    const prependVideo = useCallback((item: VideoItem) => {
        setVideos(prev => [item, ...prev]);
        // Invalidate so next full refresh includes this video from DB
        queryCache.invalidate(`feed:${userId ?? 'anon'}`);
    }, [userId]);

    return {
        videos,
        loading,
        initialLoaded,
        lastTimestamp,
        hasMore,
        fetchError,
        fetchVideos: (pg?: number) => fetchVideos(null),  // legacy compat — ignored page arg
        loadMore,
        refresh,
        updateVideoLike,
        updateVideoSave,
        updateVideoComment,
        updateUserFollow,
        deleteVideo,
        prependVideo,
        setVideos,
    };
}
