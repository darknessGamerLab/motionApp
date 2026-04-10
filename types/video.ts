/**
 * types/video.ts — Canonical VideoItem type
 *
 * Single source of truth for the VideoItem shape used across
 * HomeScreen, InspirationScreen, MeScreen, UserProfileScreen, and index.tsx.
 *
 * Previously defined in 3 different places with subtle differences.
 * All screens must import from here.
 */

export interface VideoItem {
    id: string;
    uri: string;
    user: {
        id: string;
        username: string;
        avatar?: string;
    };
    description: string;
    topic?: string;
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
    isSaved: boolean;
    isFollowing?: boolean;
    thumbnail_url?: string;
    created_at?: string;
}

/**
 * Adapter: Supabase row → VideoItem
 * Centralised here so all fetch locations use the same mapping.
 */
export const toVideoItem = (row: any): VideoItem => ({
    id: row.id,
    uri: row.video_url || row.uri || '',
    user: {
        id: row.author_id || row.user_id || row.profiles?.id || '',
        username: row.username || row.profiles?.username || 'Guest',
        avatar:
            row.author_avatar ||
            row.profiles?.avatar_url ||
            row.avatar_url ||
            null,
    },
    description: row.description || '',
    topic: row.topic || row.category || undefined,
    likes: row.likes_count ?? row.likes ?? 0,
    comments: row.comments_count ?? row.comments ?? 0,
    shares: row.shares_count ?? row.shares ?? 0,
    created_at: row.created_at ?? undefined,
    isLiked: row.is_liked ?? row.isLiked ?? false,
    isSaved: row.is_saved ?? row.isSaved ?? false,
    isFollowing: row.is_following ?? row.isFollowing ?? false,
    // SAFETY: Never use a video file URL as thumbnail — massive bandwidth waste
    // Also guard against empty string (treated as missing)
    thumbnail_url: (row.thumbnail_url && String(row.thumbnail_url).trim() !== '' && !String(row.thumbnail_url).includes('/storage/v1/object/public/videos/'))
        ? row.thumbnail_url
        : undefined,
});
