-- Rate Limiting Configuration & Tracking
-- Drop existing functions/types if they exist (to handle re-creation with different signatures)
DROP FUNCTION IF EXISTS check_rate_limit(TEXT, TEXT);
DROP FUNCTION IF EXISTS record_rate_limit_attempt(TEXT, TEXT, JSONB);
DROP TYPE IF EXISTS rate_limit_result;
CREATE TABLE IF NOT EXISTS rate_limit_config (
    action_type TEXT PRIMARY KEY,
    max_attempts INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    action_type TEXT NOT NULL REFERENCES rate_limit_config(action_type) ON DELETE CASCADE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_identifier_action ON rate_limit_attempts(identifier, action_type, attempted_at DESC);
-- Insert Default configuration (ignore conflicts if already seeded)
INSERT INTO rate_limit_config (action_type, max_attempts, window_seconds)
VALUES ('otp_send', 5, 3600),
    ('friend_code_attempt', 10, 3600),
    ('login_attempt', 5, 300),
    ('account_creation', 3, 86400),
    ('password_reset', 3, 3600),
    ('photo_upload', 20, 3600),
    ('message_send', 60, 60),
    ('profile_update', 10, 300) ON CONFLICT (action_type) DO NOTHING;
-- Enable RLS
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;
-- Allow read access to config (drop first to avoid duplicate policy error)
DROP POLICY IF EXISTS "Public read rate limit config" ON rate_limit_config;
CREATE POLICY "Public read rate limit config" ON rate_limit_config FOR
SELECT USING (true);
-- Type for the RPC return
CREATE TYPE rate_limit_result AS (
    allowed BOOLEAN,
    attempts_made INTEGER,
    max_attempts INTEGER,
    window_seconds INTEGER,
    retry_after_seconds INTEGER
);
-- RPC to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_identifier TEXT, p_action_type TEXT) RETURNS SETOF rate_limit_result SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE v_max_attempts INTEGER;
v_window_seconds INTEGER;
v_attempts_made INTEGER;
v_retry_after INTEGER := 0;
v_oldest_attempt TIMESTAMPTZ;
v_result rate_limit_result;
BEGIN -- Get configuration
SELECT max_attempts,
    window_seconds INTO v_max_attempts,
    v_window_seconds
FROM rate_limit_config
WHERE action_type = p_action_type;
IF NOT FOUND THEN -- If no config exists, default to allow
v_result := (TRUE, 0, 999999, 3600, 0);
RETURN NEXT v_result;
RETURN;
END IF;
-- Count attempts within the window
SELECT COUNT(*),
    MIN(attempted_at) INTO v_attempts_made,
    v_oldest_attempt
FROM rate_limit_attempts
WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND attempted_at > now() - (v_window_seconds || ' seconds')::INTERVAL;
IF v_attempts_made >= v_max_attempts THEN -- Calculate retry after
v_retry_after := EXTRACT(
    EPOCH
    FROM (
            (
                v_oldest_attempt + (v_window_seconds || ' seconds')::INTERVAL
            ) - now()
        )
)::INTEGER;
IF v_retry_after < 0 THEN v_retry_after := 0;
END IF;
v_result := (
    FALSE,
    v_attempts_made,
    v_max_attempts,
    v_window_seconds,
    v_retry_after
);
RETURN NEXT v_result;
ELSE v_result := (
    TRUE,
    v_attempts_made,
    v_max_attempts,
    v_window_seconds,
    0
);
RETURN NEXT v_result;
END IF;
END;
$$;
-- RPC to record attempt
CREATE OR REPLACE FUNCTION record_rate_limit_attempt(
        p_identifier TEXT,
        p_action_type TEXT,
        p_metadata JSONB DEFAULT '{}'::jsonb
    ) RETURNS BOOLEAN SECURITY DEFINER LANGUAGE plpgsql AS $$ BEGIN
INSERT INTO rate_limit_attempts (identifier, action_type, metadata)
VALUES (p_identifier, p_action_type, p_metadata);
-- Cleanup old attempts
DELETE FROM rate_limit_attempts
WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND attempted_at < now() - INTERVAL '24 hours';
RETURN TRUE;
EXCEPTION
WHEN OTHERS THEN RETURN FALSE;
END;
$$;