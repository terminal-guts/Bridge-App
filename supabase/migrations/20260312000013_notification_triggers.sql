-- ============================================
-- Database Triggers for Transactional Push Notifications
-- ============================================
-- Uses pg_net to call the notify-transactional edge function when:
--   1. A new match is created (matches INSERT)
--   2. A new message is sent (messages INSERT)
--   3. A proposal moves to 'deciding' (proposals UPDATE)
--
-- These triggers provide server-side push delivery so notifications
-- reach users even when the app is backgrounded/killed.

-- ============================================
-- 1. New Match → Push Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-transactional',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'match',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_match ON matches;
CREATE TRIGGER trg_notify_new_match
  AFTER INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_match();

-- ============================================
-- 2. New Message → Push Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger AS $$
BEGIN
  -- Only notify for messages TO someone else (not self-messages)
  IF NEW.sender_id != NEW.receiver_id THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-transactional',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'message',
        'record', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- ============================================
-- 3. Proposal → Deciding Push Notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_proposal_deciding()
RETURNS trigger AS $$
BEGIN
  -- Only fire when status changes TO 'deciding' (not on other updates)
  IF NEW.status = 'deciding' AND (OLD.status IS NULL OR OLD.status != 'deciding') THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-transactional',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'deciding',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_proposal_deciding ON proposals;
CREATE TRIGGER trg_notify_proposal_deciding
  AFTER UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_proposal_deciding();

-- ============================================
-- Set the Supabase URL in app settings (needed by triggers)
-- ============================================
-- The service_role_key is already set. We also need the URL.
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET app.settings.supabase_url = %L',
    current_database(),
    'https://ikyiwnydgedwbmcdzgbe.supabase.co'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not set app.settings.supabase_url: %', SQLERRM;
END;
$$;
