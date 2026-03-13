-- ============================================
-- Sync notification preferences to user_settings
-- ============================================
-- Previously stored only in client-side AsyncStorage.
-- Server-side edge functions need these to respect user preferences.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS pref_matches_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_messages_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_nudges_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_show_name_if_winner BOOLEAN DEFAULT TRUE;
