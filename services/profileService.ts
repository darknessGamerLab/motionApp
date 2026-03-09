/**
 * profileService — Profile repository layer
 *
 * Centralises all Supabase queries for the `profiles` table.
 */

import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database';

export type ProfileRow = Tables<'profiles'>;

export interface ProfileDetails {
    id: string;
    username: string;
    full_name: string;
    bio: string;
    avatar_url: string | null;
    avatars: string[];
    user_type: 'individual' | 'corporate';
    talents: string[];
    followers_count: number;
    following_count: number;
    videos_count: number;
    is_banned: boolean;
}

function toProfileDetails(row: ProfileRow): ProfileDetails {
    return {
        id: row.id,
        username: row.username,
        full_name: row.full_name,
        bio: row.bio ?? '',
        avatar_url: row.avatar_url,
        avatars: Array.isArray(row.avatars) ? row.avatars : row.avatar_url ? [row.avatar_url] : [],
        user_type: row.user_type,
        talents: Array.isArray(row.talents) ? row.talents : [],
        followers_count: row.followers_count,
        following_count: row.following_count,
        videos_count: row.videos_count,
        is_banned: row.is_banned,
    };
}

/** Fetch a single profile by id. Throws if not found. */
export async function fetchProfile(userId: string): Promise<ProfileDetails> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return toProfileDetails(data);
}

/** Fetch the profile of the currently authenticated user. */
export async function fetchMyProfile(userId: string): Promise<ProfileDetails> {
    return fetchProfile(userId);
}

/**
 * Update editable fields of the authenticated user's profile.
 * Only pass fields you want to change.
 */
export async function updateProfile(
    userId: string,
    updates: Partial<Pick<ProfileRow, 'full_name' | 'bio' | 'avatar_url' | 'avatars' | 'talents' | 'username'>>
): Promise<ProfileDetails> {
    const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();

    if (error) throw error;
    return toProfileDetails(data);
}

/** Check if `followerId` is following `followingId`. */
export async function checkFollowStatus(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();

    return !!data;
}

/** Follow a user. */
export async function followUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });
    if (error && error.code !== '23505') throw error; // ignore duplicate key
}

/** Unfollow a user. */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
    if (error) throw error;
}

export interface FollowListItem {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    user_type: 'individual' | 'corporate';
}

/** Fetch paginated followers list for a user. */
export async function fetchFollowers(userId: string, page = 0, limit = 30): Promise<FollowListItem[]> {
    const { data, error } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, user_type)')
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

    if (error) throw error;
    return (data ?? []).map((row: any) => row.profiles).filter(Boolean) as FollowListItem[];
}

/** Fetch paginated following list for a user. */
export async function fetchFollowing(userId: string, page = 0, limit = 30): Promise<FollowListItem[]> {
    const { data, error } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(id, username, full_name, avatar_url, user_type)')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

    if (error) throw error;
    return (data ?? []).map((row: any) => row.profiles).filter(Boolean) as FollowListItem[];
}

/** Report a user. */
export async function reportUser(reporterId: string, targetId: string, reason: string): Promise<void> {
    const { error } = await supabase
        .from('reports')
        .insert({ reporter_id: reporterId, target_id: targetId, target_type: 'user', reason });
    if (error) throw error;
}
