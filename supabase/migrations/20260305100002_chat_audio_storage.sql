-- ============================================
-- Storage bucket for audio messages
-- Creates the chat-audio bucket and RLS policies
-- ============================================
-- Create storage bucket for chat audio files
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
        10485760,
        -- 10MB max file size
        ARRAY ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mpeg', 'audio/webm', 'audio/aac']
    ) ON CONFLICT (id) DO
UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
-- Policy: Authenticated users can upload audio files
DO $$ BEGIN
  CREATE POLICY "Users can upload chat audio" ON storage.objects FOR
  INSERT TO authenticated WITH CHECK (bucket_id = 'chat-audio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Policy: Authenticated users can read audio files
DO $$ BEGIN
  CREATE POLICY "Users can read chat audio" ON storage.objects FOR
  SELECT TO authenticated USING (bucket_id = 'chat-audio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Policy: Users can delete their own audio files
DO $$ BEGIN
  CREATE POLICY "Users can delete own chat audio" ON storage.objects FOR DELETE TO authenticated USING (
      bucket_id = 'chat-audio'
      AND (storage.foldername(name)) [2] = auth.uid()::text
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;