-- ============================================================
-- chat-audio storage bucket — consolidated setup
-- Ensures bucket exists and RLS policies are correct.
-- Safe to apply on top of earlier audio migrations:
--   20260305_chat_audio_storage.sql
--   20260306_tighten_audio_read_policy.sql
--   20260323000002_chat_audio_rls.sql
-- ============================================================

-- Create (or update) the storage bucket
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'chat-audio',
    'chat-audio',
    true,
    10485760, -- 10 MB max
    ARRAY['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mpeg', 'audio/webm', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE
    SET file_size_limit  = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Upload policy ────────────────────────────────────────────────────────────
-- Authenticated users may upload into their own subfolder:
--   {matchId}/{userId}/<filename>
DO $$ BEGIN
  CREATE POLICY "Users can upload chat audio"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'chat-audio'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Read policy ──────────────────────────────────────────────────────────────
-- Only match participants (folder[1] == matchId) may read audio files.
-- Drop any older, more permissive read policies first.
DROP POLICY IF EXISTS "Users can read chat audio"             ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own chat audio"   ON storage.objects;
DROP POLICY IF EXISTS "Match participants can read chat audio" ON storage.objects;

CREATE POLICY "Match participants can read chat audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-audio'
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id::text = (storage.foldername(name))[1]
        AND (matches.user_id_1 = auth.uid() OR matches.user_id_2 = auth.uid())
    )
  );

-- ── Delete policy ────────────────────────────────────────────────────────────
-- Users may only delete files they uploaded (folder[2] == their userId).
DO $$ BEGIN
  CREATE POLICY "Users can delete own chat audio"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'chat-audio'
      AND (storage.foldername(name))[2] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
