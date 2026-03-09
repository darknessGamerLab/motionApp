/**
 * videoService — Video repository layer
 *
 * Centralises all Supabase queries for the `videos` table.
 * Hooks and screens should call these functions instead of
 * writing raw `supabase.from('videos')` calls.
 *
 * Benefits:
 *  - Single place to update when schema changes
 *  - Full TypeScript types (no `as any` needed)
 *  - Cursor-based pagination built-in for every list
 */

import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';
import { VideoItem } from '@/types/video';

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Shape returned by the videos table when joined with profiles */
type VideoRow = Tables<'videos'> & {
    profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'avatar_url'> | null;
};

/** Shape returned when joining via likes → videos */
type LikeRow = {
    video_id: string;
    videos: VideoRow | null;
};

/** Shape returned when joining via saves → videos */
type SaveRow = {
    video_id: string;
    videos: VideoRow | null;
};

// ─── Thumbnail Transform ─────────────────────────────────────────────────────
/**
 * Supabase Storage Transform API: resize thumbnail for grid display.
 *
 * Grid tile renders ~120x213px but raw thumbnail is 720x1280px → wasted bandwidth.
 * Applying ?width=360&quality=70 reduces payload by ~75% with no visible quality loss.
 *
 * NOT applied to full-screen video playback — only thumbnail preview images.
 * Only works with Supabase Storage URLs (contains /storage/v1/object/public/).
 */
const THUMB_TRANSFORM = '?width=360&quality=70&resize=cover';

function applyThumbTransform(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    // Only apply to Supabase Storage URLs — skip external CDN or mock URLs
    if (!url.includes('/storage/v1/object/public/')) return url;
    // Don't double-apply
    if (url.includes('?width=') || url.includes('&width=')) return url;
    return url + THUMB_TRANSFORM;
}

/** Convert a raw VideoRow to a normalised VideoItem */
function toItem(row: VideoRow): VideoItem {
    return {
        id: row.id,
        uri: row.video_url ?? '',
        thumbnail_url: applyThumbTransform(row.thumbnail_url),
        user: {
            id: row.user_id,
            username: row.profiles?.username ?? '',
            avatar: row.profiles?.avatar_url ?? undefined,
        },
        description: row.description ?? '',
        topic: row.topic ?? row.category ?? '',
        likes: row.likes_count ?? 0,
        comments: row.comments_count ?? 0,
        shares: row.shares_count ?? 0,
        isLiked: false,
        isSaved: false,
    };
}

// ─── Select string re-used by multiple queries ────────────────────────────────
const VIDEO_SELECT =
    'id, video_url, user_id, description, topic, category, likes_count, comments_count, shares_count, thumbnail_url, created_at, profiles(id, username, avatar_url)';

// ─── Explore / feed queries ───────────────────────────────────────────────────

export interface FetchExploreOptions {
    /** Cursor = `created_at` value of the last item (for next-page fetches) */
    cursor?: string;
    /** Filter key matching FILTERS chip in InspirationScreen ('all' = no filter) */
    topic?: string;
    /** User's talent IDs for personalised ranking boost */
    userTalents?: string[];
    limit?: number;
}

export interface ExploreResult {
    items: VideoItem[];
    nextCursor: string | null;
}

/**
 * Fetch explore feed with interaction-score-based ranking.
 *
 * Score = likes_count * 2 + comments_count + shares_count
 * We approximate this by ordering by likes_count DESC, then comments_count DESC.
 * A proper DB-computed column or view would be ideal but this is good enough
 * without a migration.
 */
export async function fetchExploreVideos(options: FetchExploreOptions = {}): Promise<ExploreResult> {
    const { cursor, topic, limit = PAGE_SIZE } = options;

    let query = supabase
        .from('videos')
        .select(VIDEO_SELECT)
        .order('likes_count', { ascending: false })
        .order('comments_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit + 1); // fetch one extra to detect hasMore

    if (topic && topic !== 'all') {
        query = query.ilike('topic', `%${topic}%`);
    }

    if (cursor) {
        // Cursor-based: skip items created after the cursor timestamp
        query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as VideoRow[];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(toItem);
    const nextCursor = hasMore ? (rows[limit - 1].created_at ?? null) : null;

    return { items, nextCursor };
}

// ─── User-profile video queries ───────────────────────────────────────────────

export interface FetchUserVideosOptions {
    userId: string;
    cursor?: string;
    limit?: number;
}

export interface VideoListResult {
    items: VideoItem[];
    nextCursor: string | null;
}

/** Fetch the videos uploaded by a specific user (paginated). */
export async function fetchUserVideos(options: FetchUserVideosOptions): Promise<VideoListResult> {
    const { userId, cursor, limit = PAGE_SIZE } = options;

    let query = supabase
        .from('videos')
        .select(VIDEO_SELECT)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as VideoRow[];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(toItem);
    const nextCursor = hasMore ? (rows[limit - 1].created_at ?? null) : null;

    return { items, nextCursor };
}

/** Fetch the videos liked by a specific user (paginated). */
export async function fetchUserLikedVideos(options: FetchUserVideosOptions): Promise<VideoListResult> {
    const { userId, cursor, limit = PAGE_SIZE } = options;

    let query = supabase
        .from('likes')
        .select(`video_id, created_at, videos(${VIDEO_SELECT})`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as (LikeRow & { created_at: string | null })[];
    const hasMore = rows.length > limit;
    const items = rows
        .slice(0, limit)
        .filter((r) => r.videos)
        .map((r) => toItem(r.videos as VideoRow));

    const lastRow = rows[limit - 1];
    const nextCursor = hasMore && lastRow ? (lastRow.created_at ?? null) : null;

    return { items, nextCursor };
}

/** Fetch the videos saved by a specific user (paginated). */
export async function fetchUserSavedVideos(options: FetchUserVideosOptions): Promise<VideoListResult> {
    const { userId, cursor, limit = PAGE_SIZE } = options;

    let query = supabase
        .from('saves')
        .select(`video_id, created_at, videos(${VIDEO_SELECT})`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as (SaveRow & { created_at: string | null })[];
    const hasMore = rows.length > limit;
    const items = rows
        .slice(0, limit)
        .filter((r) => r.videos)
        .map((r) => toItem(r.videos as VideoRow));

    const lastRow = rows[limit - 1];
    const nextCursor = hasMore && lastRow ? (lastRow.created_at ?? null) : null;

    return { items, nextCursor };
}

/** Delete a video owned by the current user. */
export async function deleteVideo(videoId: string): Promise<void> {
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (error) throw error;
}

/** Increment view count for a video. Fire-and-forget, never throws. */
export function incrementView(videoId: string): void {
    void supabase.rpc('increment_video_view', { p_video_id: videoId }).then(() => { }).catch(() => { });
}
