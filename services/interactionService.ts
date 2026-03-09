/**
 * interactionService — Like / Save / Comment repository layer
 *
 * Centralises all Supabase calls for user interactions.
 * Supports optimistic updates via the returned boolean — callers
 * can immediately update local state and roll back on error.
 */

import { supabase } from '@/lib/supabase';

// ─── Likes ────────────────────────────────────────────────────────────────────

/** Returns `true` if the video is now liked, `false` if unliked. */
export async function toggleLike(userId: string, videoId: string, currentlyLiked: boolean): Promise<boolean> {
    if (currentlyLiked) {
        const { error } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', userId)
            .eq('video_id', videoId);
        if (error) throw error;
        return false;
    } else {
        const { error } = await supabase
            .from('likes')
            .insert({ user_id: userId, video_id: videoId });
        if (error && error.code !== '23505') throw error;
        return true;
    }
}

/** Bulk-fetch like status for a list of video IDs for a given user. */
export async function fetchLikedVideoIds(userId: string, videoIds: string[]): Promise<Set<string>> {
    if (!videoIds.length) return new Set();
    const { data, error } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', userId)
        .in('video_id', videoIds);
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.video_id));
}

// ─── Saves ────────────────────────────────────────────────────────────────────

/** Returns `true` if the video is now saved, `false` if unsaved. */
export async function toggleSave(userId: string, videoId: string, currentlySaved: boolean): Promise<boolean> {
    if (currentlySaved) {
        const { error } = await supabase
            .from('saves')
            .delete()
            .eq('user_id', userId)
            .eq('video_id', videoId);
        if (error) throw error;
        return false;
    } else {
        const { error } = await supabase
            .from('saves')
            .insert({ user_id: userId, video_id: videoId });
        if (error && error.code !== '23505') throw error;
        return true;
    }
}

/** Bulk-fetch save status for a list of video IDs for a given user. */
export async function fetchSavedVideoIds(userId: string, videoIds: string[]): Promise<Set<string>> {
    if (!videoIds.length) return new Set();
    const { data, error } = await supabase
        .from('saves')
        .select('video_id')
        .eq('user_id', userId)
        .in('video_id', videoIds);
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.video_id));
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface CommentItem {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    text: string;
    created_at: string;
    likes_count: number;
    is_liked: boolean;
}

/** Fetch comments for a video using the existing DB function. */
export async function fetchComments(videoId: string, viewerId?: string): Promise<CommentItem[]> {
    const { data, error } = await (supabase as any).rpc('get_video_comments', {
        p_video_id: videoId,
        p_viewer_id: viewerId,
    });
    if (error) throw error;
    return (data ?? []).map((r: any): CommentItem => ({
        id: r.id,
        user_id: r.user_id,
        username: r.username,
        avatar_url: r.avatar_url,
        text: r.text ?? r.content ?? '',
        created_at: r.created_at,
        likes_count: r.likes_count ?? 0,
        is_liked: r.is_liked ?? false,
    }));
}

/** Post a new comment. Returns the inserted comment id. */
export async function postComment(userId: string, videoId: string, text: string): Promise<string> {
    const { data, error } = await supabase
        .from('comments')
        .insert({ user_id: userId, video_id: videoId, text })
        .select('id')
        .single();
    if (error) throw error;
    return data.id;
}

/** Delete a comment (must be owned by the user). */
export async function deleteComment(userId: string, commentId: string): Promise<void> {
    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);
    if (error) throw error;
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** Mark all unread notifications as read. */
export async function markNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    if (error) throw error;
}

/** Count unread notifications for a user. */
export async function countUnreadNotifications(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
}

// ─── Follows ─────────────────────────────────────────────────────────────────

/** Follow a user. Silently tolerates duplicate (23505). */
export async function followUser(followingId: string, followerId?: string): Promise<void> {
    // followerId is optional — caller can pass it, or we get it from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const fid = followerId ?? session?.user?.id;
    if (!fid) throw new Error('Not authenticated');
    const { error } = await supabase
        .from('follows')
        .insert({ follower_id: fid, following_id: followingId });
    if (error && error.code !== '23505') throw error;
}

/** Unfollow a user. */
export async function unfollowUser(followingId: string, followerId?: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const fid = followerId ?? session?.user?.id;
    if (!fid) throw new Error('Not authenticated');
    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', fid)
        .eq('following_id', followingId);
    if (error) throw error;
}

// ─── Video Interactions ───────────────────────────────────────────────────────

/** Like a video. Silently tolerates duplicate. */
export async function likeVideo(userId: string, videoId: string): Promise<void> {
    const { error } = await supabase
        .from('likes')
        .insert({ user_id: userId, video_id: videoId });
    if (error && error.code !== '23505') throw error;
}

/** Unlike a video. */
export async function unlikeVideo(userId: string, videoId: string): Promise<void> {
    const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId);
    if (error) throw error;
}

/** Save a video. Silently tolerates duplicate. */
export async function saveVideo(userId: string, videoId: string): Promise<void> {
    const { error } = await supabase
        .from('saves')
        .insert({ user_id: userId, video_id: videoId });
    if (error && error.code !== '23505') throw error;
}

/** Unsave a video. */
export async function unsaveVideo(userId: string, videoId: string): Promise<void> {
    const { error } = await supabase
        .from('saves')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId);
    if (error) throw error;
}

/** Increment shares_count for a video (fire-and-forget). */
export async function updateVideoShare(videoId: string, newCount: number): Promise<void> {
    const { error } = await supabase
        .from('videos')
        .update({ shares_count: newCount })
        .eq('id', videoId);
    if (error) throw error;
}

/** Report a user/video. */
export async function reportUser(
    reporterId: string,
    targetId: string,
    reason?: string,
    targetType: 'video' | 'user' | 'comment' = 'video',
): Promise<void> {
    const { error } = await supabase
        .from('reports')
        .insert({ reporter_id: reporterId, target_id: targetId, target_type: targetType, reason: reason ?? 'other' });
    if (error && error.code !== '23505') throw error;
}
