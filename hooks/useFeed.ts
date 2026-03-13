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
import { eventBus } from '@/lib/eventBus';
import { queryCache } from '@/lib/queryCache';
import { supabase, THUMBNAILS_BUCKET, VIDEOS_BUCKET } from '@/lib/supabase';
import { toVideoItem, VideoItem } from '@/types/video';
import { annotateInteractions } from '@/utils/videoInteractions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE_SIZE = 15;
const FEED_CACHE_TTL = 30_000; // 30 seconds — first page only

interface UseFeedOptions {
    userId?: string;
    isAuth: boolean;
    /** Auth context hala initialize ediliyor mu? True iken fetch'i geciktir */
    authLoading?: boolean;
    userType?: 'individual' | 'corporate'; // Kurumsal kullanıcı radars tablosuna yazar
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
    /** Share count — also writes to DB and broadcasts via EventBus */
    updateVideoShare: (videoId: string, shares: number) => void;
    deleteVideo: (videoId: string) => Promise<void>;
    prependVideo: (item: VideoItem) => void;
    setVideos: React.Dispatch<React.SetStateAction<VideoItem[]>>;
    /** Hard refresh — bypasses cache */
    refresh: () => Promise<void>;
}

export function useFeed({ userId, isAuth, userType, authLoading }: UseFeedOptions): UseFeedReturn {
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    const isLoadingRef = useRef(false);
    const hasInitiallyLoaded = useRef(false);

    // Removed local annotateInteractions — now using shared util

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

            // Annotate liked/saved/followed for auth users using shared util
            const annotated = await annotateInteractions(rows, userId);

            // hasMore: if we got fewer than PAGE_SIZE items, we've hit the end
            const more = rows.length === PAGE_SIZE;
            setHasMore(more);

            if (annotated.length > 0) {
                const lastItem = annotated[annotated.length - 1];
                // We need created_at from the raw row. Attach it as a temporary field.
                setLastTimestamp((lastItem as any).created_at ?? null);
            }

            setVideos(prev => {
                const newVideos = append ? [...prev, ...annotated] : annotated;
                if (!append) {
                    // Save the first page to offline cache
                    AsyncStorage.setItem(`offline_feed_${userId || 'anon'}`, JSON.stringify(newVideos)).catch(e => console.log('Offline cache save error:', e));
                }
                return newVideos;
            });

            // ── Thumbnail prefetch: preload next 12 thumbnails after first page ───
            // expo-image will cache these in memory so they appear instantly on scroll
            if (!append) {
                const thumbUrls = annotated
                    .slice(0, 12)
                    .map((v: any) => v.thumbnail_url)
                    .filter(Boolean) as string[];
                if (thumbUrls.length > 0) {
                    import('expo-image').then(({ Image }) => {
                        Image.prefetch(thumbUrls).catch(() => { });
                    });
                }
            }
        } catch (e) {
            if (__DEV__) console.warn('[useFeed] fetch error:', e);
            setFetchError(true);  // ← network error, not empty feed
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
            setInitialLoaded(true);
        }
    }, [userId]);

    // ─── Initial load + re-fetch when userId changes ─────────────────────
    useEffect(() => {
        // Auth henüz yükleniyorsa bekle
        if (authLoading) return;
        if (!hasInitiallyLoaded.current) {
            // Pre-baked data (Offline Cache) phase:
            AsyncStorage.getItem(`offline_feed_${userId || 'anon'}`).then(cachedRaw => {
                if (cachedRaw) {
                    try {
                        const cachedVideos = JSON.parse(cachedRaw);
                        if (cachedVideos && cachedVideos.length > 0) {
                            setVideos(cachedVideos);
                            setInitialLoaded(true); // Ekrana anında basılsın
                        }
                    } catch (e) {
                        console.log('Failed to parse offline feed cache', e);
                    }
                }
                // Ardından internetten tazesini çekmeye başlat (arka planda sessizce yeniler)
                fetchVideos(null, false, false);
            }).catch(() => {
                fetchVideos(null, false, false);
            });
            hasInitiallyLoaded.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, userId]);

    useEffect(() => {
        // Re-fetch when user identity changes (update liked/saved states)
        // authLoading'den FALSE'a dönüş hasInitiallyLoaded beklediğimiz için de yakalanmaz,
        // yukarıdaki effect bunu halleder.
        if (authLoading) return;
        if (hasInitiallyLoaded.current) {
            // Invalidate cache on auth change so new user sees correct interaction states
            queryCache.invalidate(`feed:${userId ?? 'anon'}`);
            fetchVideos(null, false, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ─── Realtime Subscription ────────────────────────────────────────────
    // NOTE: 'videos' table is NOT in supabase_realtime publication.
    // Subscribing to it wastes connection overhead with silent reconnect loops.
    // Video freshness is handled via:
    //   - queryCache invalidation on mutations
    //   - pull-to-refresh
    //   - EventBus for local optimistic updates
    // If realtime is needed in the future, add 'videos' to supabase_realtime publication first.

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
        eventBus.emit('video:liked', { videoId: id, isLiked, likes });
        queryCache.invalidate(`feed:${userId ?? 'anon'}`);
        if (!isAuth || !userId) return;
        // UUID kontrolü: geçici ID'ler (vid-timestamp) için DB'ye yazma
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(id)) return;
        // RPC kullan: PostgREST FK embedding hatasını atlatmak için
        (supabase as any).rpc('toggle_like', {
            p_user_id: userId,
            p_video_id: id,
            p_liked: isLiked,
        }).then(({ error }: any) => {
            if (error && __DEV__) console.warn('[useFeed] like sync error:', error);
        });
    }, [isAuth, userId]);

    const updateVideoSave = useCallback((id: string, isSaved: boolean) => {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, isSaved } : v));
        eventBus.emit('video:saved', { videoId: id, isSaved });
        queryCache.invalidate(`feed:${userId ?? 'anon'}`);
        if (!isAuth || !userId) return;
        // UUID kontrolü
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(id)) return;
        // RPC kullan
        (supabase as any).rpc('toggle_save', {
            p_user_id: userId,
            p_video_id: id,
            p_saved: isSaved,
        }).then(({ error }: any) => {
            if (error && __DEV__) console.warn('[useFeed] save sync error:', error);
        });
    }, [isAuth, userId]);

    const updateVideoComment = useCallback((id: string, comments: number) => {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, comments } : v));
    }, []);

    const updateUserFollow = useCallback((authorId: string, isFollowing: boolean) => {
        setVideos(prev => prev.map(v => v.user.id === authorId ? { ...v, isFollowing } : v));
        // Broadcast — useProfile, NotificationsScreen dinleyecek
        eventBus.emit('follow:changed', { userId: authorId, isFollowing });
        if (!isAuth || !userId) return;
        (async () => {
            try {
                const isCorporate = userType === 'corporate';
                if (isFollowing) {
                    if (isCorporate) {
                        // Kurumsal → bireysel: radars tablosuna yaz (radar bildirimi trigger’ı çalışır)
                        await (supabase as any).from('radars')
                            .upsert({ corporate_id: userId, individual_id: authorId }, { onConflict: 'corporate_id,individual_id', ignoreDuplicates: true });
                    } else {
                        // Bireysel → bireysel/kurumsal: follows tablosuna yaz
                        await (supabase as any).from('follows')
                            .upsert({ follower_id: userId, following_id: authorId }, { onConflict: 'follower_id,following_id', ignoreDuplicates: true });
                    }
                } else {
                    if (isCorporate) {
                        await (supabase as any).from('radars').delete()
                            .eq('corporate_id', userId).eq('individual_id', authorId);
                    } else {
                        await (supabase as any).from('follows').delete()
                            .eq('follower_id', userId).eq('following_id', authorId);
                    }
                }
            } catch (e) { if (__DEV__) console.warn('[useFeed] follow sync error:', e); }
        })();
    }, [isAuth, userId, userType]);

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
            // Broadcast to all screens
            eventBus.emit('video:deleted', { videoId });
        } catch (e) {
            if (deletedVideo) setVideos(prev => [deletedVideo!, ...prev]);
            if (__DEV__) console.warn('[useFeed] deleteVideo exception:', e);
        }
    }, [userId]);

    /** Share count — DB'ye yaz ve EventBus ile yayınla */
    const updateVideoShare = useCallback((id: string, shares: number) => {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, shares } : v));
        eventBus.emit('video:shared', { videoId: id, shares });
        // DB'ye yaz (fire-and-forget) — önceden sadece UI güncelliyordu!
        if (userId) {
            (supabase as any).from('videos')
                .update({ shares_count: shares })
                .eq('id', id)
                .then(() => { })
                .catch((e: any) => { if (__DEV__) console.warn('[useFeed] share sync error:', e); });
        }
    }, [userId]);

    const prependVideo = useCallback((item: VideoItem) => {
        setVideos(prev => [item, ...prev]);
        // Invalidate so next full refresh includes this video from DB
        queryCache.invalidate(`feed:${userId ?? 'anon'}`);
    }, [userId]);

    // ─── Global Event Listeners (Sync across screens & Realtime) ──────────
    useEffect(() => {
        const unsubs = [
            eventBus.on('video:liked', ({ videoId, isLiked, likes }) => {
                setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isLiked, likes } : v));
            }),
            eventBus.on('video:saved', ({ videoId, isSaved }) => {
                setVideos(prev => prev.map(v => v.id === videoId ? { ...v, isSaved } : v));
            }),
            eventBus.on('video:commented', ({ videoId, comments }) => {
                setVideos(prev => prev.map(v => v.id === videoId ? { ...v, comments } : v));
            }),
            eventBus.on('video:shared', ({ videoId, shares }) => {
                setVideos(prev => prev.map(v => v.id === videoId ? { ...v, shares } : v));
            }),
            eventBus.on('video:deleted', ({ videoId }) => {
                setVideos(prev => prev.filter(v => v.id !== videoId));
            }),
            eventBus.on('video:like_count_changed', ({ videoId, delta }) => {
                setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: Math.max(0, v.likes + delta) } : v));
            }),
            eventBus.on('video:comment_count_changed', ({ videoId, delta }) => {
                setVideos(prev => prev.map(v => v.id === videoId ? { ...v, comments: Math.max(0, v.comments + delta) } : v));
            }),
            eventBus.on('follow:changed', ({ userId: authorId, isFollowing }) => {
                setVideos(prev => prev.map(v => v.user.id === authorId ? { ...v, isFollowing } : v));
            })
        ];
        return () => unsubs.forEach(unsub => unsub());
    }, []);

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
        updateVideoShare,
        deleteVideo,
        prependVideo,
        setVideos,
    };
}
