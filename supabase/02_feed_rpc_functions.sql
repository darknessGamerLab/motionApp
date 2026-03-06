-- ============================================
-- MOTION APP - PERFORMANCE PATCH (RPCs)
-- ============================================

-- Drop existing if we need to modify signatures
DROP FUNCTION IF EXISTS get_video_feed(UUID, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS get_profile_videos(UUID, UUID, TIMESTAMPTZ, INT);
DROP FUNCTION IF EXISTS get_saved_videos(UUID, TIMESTAMPTZ, INT);

-- 1. Main Feed (Cursor Pagination + Single Query Hydration)
CREATE OR REPLACE FUNCTION get_video_feed(
  viewer_id UUID,
  last_ts TIMESTAMPTZ DEFAULT NOW(),
  page_size INT DEFAULT 15
) RETURNS TABLE (
  id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  topic TEXT,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  views_count INT,
  created_at TIMESTAMPTZ,
  author_id UUID,
  author_username TEXT,
  author_avatar TEXT,
  is_liked BOOLEAN,
  is_saved BOOLEAN,
  is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.video_url,
    v.thumbnail_url,
    v.description,
    v.topic,
    v.likes_count,
    v.comments_count,
    v.shares_count,
    v.views_count,
    v.created_at,
    p.id AS author_id,
    p.username AS author_username,
    p.avatar_url AS author_avatar,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = viewer_id) AS is_liked,
    EXISTS(SELECT 1 FROM saves s WHERE s.video_id = v.id AND s.user_id = viewer_id) AS is_saved,
    EXISTS(SELECT 1 FROM follows f WHERE f.following_id = p.id AND f.follower_id = viewer_id) AS is_following
  FROM videos v
  JOIN profiles p ON p.id = v.user_id
  WHERE v.created_at < last_ts
  ORDER BY v.created_at DESC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Profile Videos
CREATE OR REPLACE FUNCTION get_profile_videos(
  viewer_id UUID,
  target_user_id UUID,
  last_ts TIMESTAMPTZ DEFAULT NOW(),
  page_size INT DEFAULT 15
) RETURNS TABLE (
  id UUID, video_url TEXT, thumbnail_url TEXT, description TEXT, topic TEXT,
  likes_count INT, comments_count INT, shares_count INT, views_count INT, created_at TIMESTAMPTZ,
  author_id UUID, author_username TEXT, author_avatar TEXT,
  is_liked BOOLEAN, is_saved BOOLEAN, is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id, v.video_url, v.thumbnail_url, v.description, v.topic,
    v.likes_count, v.comments_count, v.shares_count, v.views_count, v.created_at,
    p.id AS author_id, p.username AS author_username, p.avatar_url AS author_avatar,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = viewer_id) AS is_liked,
    EXISTS(SELECT 1 FROM saves s WHERE s.video_id = v.id AND s.user_id = viewer_id) AS is_saved,
    EXISTS(SELECT 1 FROM follows f WHERE f.following_id = p.id AND f.follower_id = viewer_id) AS is_following
  FROM videos v
  JOIN profiles p ON p.id = v.user_id
  WHERE v.user_id = target_user_id AND v.created_at < last_ts
  ORDER BY v.created_at DESC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Saved Videos
CREATE OR REPLACE FUNCTION get_saved_videos(
  viewer_id UUID,
  last_ts TIMESTAMPTZ DEFAULT NOW(),
  page_size INT DEFAULT 15
) RETURNS TABLE (
  id UUID, video_url TEXT, thumbnail_url TEXT, description TEXT, topic TEXT,
  likes_count INT, comments_count INT, shares_count INT, views_count INT, created_at TIMESTAMPTZ,
  author_id UUID, author_username TEXT, author_avatar TEXT,
  is_liked BOOLEAN, is_saved BOOLEAN, is_following BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id, v.video_url, v.thumbnail_url, v.description, v.topic,
    v.likes_count, v.comments_count, v.shares_count, v.views_count, v.created_at,
    p.id AS author_id, p.username AS author_username, p.avatar_url AS author_avatar,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = viewer_id) AS is_liked,
    TRUE AS is_saved, -- It's definitely saved since it's in the saves table
    EXISTS(SELECT 1 FROM follows f WHERE f.following_id = p.id AND f.follower_id = viewer_id) AS is_following
  FROM saves s
  JOIN videos v ON v.id = s.video_id
  JOIN profiles p ON p.id = v.user_id
  WHERE s.user_id = viewer_id AND s.created_at < last_ts
  ORDER BY s.created_at DESC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
