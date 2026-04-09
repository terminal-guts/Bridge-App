-- ============================================
-- Fix: Notification triggers use vault instead of current_setting
-- ============================================
-- The original triggers used current_setting('app.settings.*') which returns
-- NULL in PostgREST/Supavisor pooled connections (edge function context).
-- This caused net.http_post() to throw, rolling back the parent UPDATE/INSERT.
--
-- Fix:
-- 1. Read URL and key from vault.decrypted_secrets (always available)
-- 2. Wrap net.http_post in BEGIN...EXCEPTION so trigger never blocks the parent op

-- ============================================
-- 1. New Match → Push Notification (fixed)
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_match()
RETURNS trigger AS $$
DECLARE
  _url TEXT;
  _key TEXT;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  IF _url IS NOT NULL AND _key IS NOT NULL THEN
    BEGIN
      PERFORM net.http_post(
        url := _url || '/functions/v1/notify-transactional',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _key
        ),
        body := jsonb_build_object(
          'type', 'match',
          'record', row_to_json(NEW)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_new_match trigger failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. New Message → Push Notification (fixed)
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger AS $$
DECLARE
  _url TEXT;
  _key TEXT;
BEGIN
  IF NEW.sender_id != NEW.receiver_id THEN
    SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
    SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF _url IS NOT NULL AND _key IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := _url || '/functions/v1/notify-transactional',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || _key
          ),
          body := jsonb_build_object(
            'type', 'message',
            'record', row_to_json(NEW)
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_new_message trigger failed: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Proposal → Deciding Push Notification (fixed)
-- ============================================
CREATE OR REPLACE FUNCTION notify_proposal_deciding()
RETURNS trigger AS $$
DECLARE
  _url TEXT;
  _key TEXT;
BEGIN
  IF NEW.status = 'deciding' AND (OLD.status IS NULL OR OLD.status != 'deciding') THEN
    SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'supabase_url';
    SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF _url IS NOT NULL AND _key IS NOT NULL THEN
      BEGIN
        PERFORM net.http_post(
          url := _url || '/functions/v1/notify-transactional',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || _key
          ),
          body := jsonb_build_object(
            'type', 'deciding',
            'record', row_to_json(NEW),
            'old_record', row_to_json(OLD)
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_proposal_deciding trigger failed: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
