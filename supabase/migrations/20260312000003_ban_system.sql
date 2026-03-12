-- Ban system: auto-suspend users with 3+ reports
ALTER TABLE user_profiles
  ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN suspended_at TIMESTAMPTZ,
  ADD COLUMN suspension_reason TEXT;

CREATE INDEX idx_user_profiles_suspended ON user_profiles(user_id) WHERE is_suspended = true;

-- Auto-suspend trigger: fires after each new report
CREATE OR REPLACE FUNCTION auto_suspend_on_reports() RETURNS TRIGGER AS $$
DECLARE report_count INT;
BEGIN
  SELECT COUNT(*) INTO report_count FROM user_reports
  WHERE reported_user_id = NEW.reported_user_id AND status IN ('pending', 'reviewed');

  IF report_count >= 3 THEN
    UPDATE user_profiles SET is_suspended = true, suspended_at = now(),
      suspension_reason = 'Auto-flagged: ' || report_count || ' reports'
    WHERE user_id = NEW.reported_user_id AND is_suspended = false;
  END IF;

  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_suspend_on_report
  AFTER INSERT ON user_reports FOR EACH ROW EXECUTE FUNCTION auto_suspend_on_reports();
