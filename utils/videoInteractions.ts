import { supabase } from '@/lib/supabase';
import { VideoItem } from '@/types/video';

/**
 * Annotate rows with like/save/follow state for a given user.
 * All three queries run in parallel.
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

    const [
        { data: likedData },
        { data: savedData },
        { data: followsData }
    ] = await Promise.all([
        ids.length > 0
            ? (supabase as any)
                .from('likes')
                .select('video_id')
                .eq('user_id', userId)
                .in('video_id', ids)
            : Promise.resolve({ data: [] }),
        ids.length > 0
            ? (supabase as any)
                .from('saves')
                .select('video_id')
                .eq('user_id', userId)
                .in('video_id', ids)
            : Promise.resolve({ data: [] }),
        userIds.length > 0
            ? (supabase as any)
                .from('follows')
                .select('following_id')
                .eq('follower_id', userId)
                .in('following_id', userIds)
            : Promise.resolve({ data: [] }),
    ]);

    const likedSet = new Set((likedData || []).map((r: any) => r.video_id));
    const savedSet = new Set((savedData || []).map((r: any) => r.video_id));
    const followSet = new Set((followsData || []).map((r: any) => r.following_id));

    return rows.map((v) => ({
        ...v,
        isLiked: likedSet.has(v.id),
        isSaved: savedSet.has(v.id),
        isFollowing: followSet.has(v.user.id),
    }));
}
