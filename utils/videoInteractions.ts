import { supabase } from '@/lib/supabase';
import { VideoItem } from '@/types/video';

/**
 * Annotate rows with like/save/follow state for a given user.
 * Phase 7: BFF & Batch Request optimization.
 * Uses a single RPC call to fetch likes, saves, and follows simultaneously,
 * significantly reducing client-side network overhead.
 */
export async function annotateInteractions(
    rows: VideoItem[],
    userId?: string
): Promise<VideoItem[]> {
    if (!userId || rows.length === 0) return rows;

    const ids = rows.map((v) => v.id).filter((id) => id && id.length > 5);
    const userIds = Array.from(new Set(rows.map((v) => v.user.id))).filter(
        (id) => id && id.length > 5
    );

    if (ids.length === 0 && userIds.length === 0) return rows;

    // Single server roundtrip
    const { data, error } = await (supabase as any).rpc('get_user_interactions', {
        p_user_id: userId,
        p_video_ids: ids,
        p_author_ids: userIds
    });

    if (error || !data) {
        if (__DEV__) console.warn('[annotateInteractions] RPC failed:', error);
        return rows;
    }

    const interactions = data as { liked: string[], saved: string[], followed: string[] };

    const likedSet = new Set(interactions.liked || []);
    const savedSet = new Set(interactions.saved || []);
    const followSet = new Set(interactions.followed || []);

    return rows.map((v) => ({
        ...v,
        isLiked: likedSet.has(v.id),
        isSaved: savedSet.has(v.id),
        isFollowing: followSet.has(v.user.id),
    }));
}
