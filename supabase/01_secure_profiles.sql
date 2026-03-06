-- ============================================
-- MOTION APP - SECURITY PATCH
-- ============================================

-- 1. Create the function that reverts sensitive profile fields
CREATE OR REPLACE FUNCTION prevent_sensitive_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- If the request comes from an authenticated client (not a backend service key)
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'authenticated' THEN
    -- Force these fields to remain unchanged during an UPDATE
    NEW.user_type = OLD.user_type;
    NEW.is_banned = OLD.is_banned;
    NEW.followers_count = OLD.followers_count;
    NEW.following_count = OLD.following_count;
    NEW.videos_count = OLD.videos_count;
    NEW.radars_count = OLD.radars_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS enforce_profile_security ON profiles;

-- 3. Attach the trigger to the profiles table
CREATE TRIGGER enforce_profile_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sensitive_profile_updates();

-- Record the security patch timestamp
COMMENT ON TRIGGER enforce_profile_security ON profiles IS 'Prevents clients from modifying their own roles and system counters.';
