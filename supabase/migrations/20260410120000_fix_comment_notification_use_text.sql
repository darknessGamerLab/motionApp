-- comments.message / NEW.content eski bir sürümde kalmış olabilir; tabloda sütun adı `text`.
-- Hata: record "new" has no field "content" (42703)

CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  video_owner_id UUID;
BEGIN
  SELECT user_id INTO video_owner_id FROM public.videos WHERE id = NEW.video_id;

  IF video_owner_id IS NOT NULL AND video_owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, from_user_id, video_id, message)
    VALUES (video_owner_id, 'comment', NEW.user_id, NEW.video_id, NEW.text);
  END IF;

  RETURN NEW;
END;
$$;
