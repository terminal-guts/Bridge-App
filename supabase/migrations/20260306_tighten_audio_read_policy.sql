-- ============================================
-- Tighten chat-audio read policy
-- Only match participants can read audio files
-- Mar 6 2026
-- ============================================

-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "Users can read chat audio" ON storage.objects;

-- New policy: only users who are part of the match (folder name) can read
CREATE POLICY "Match participants can read chat audio" ON storage.objects FOR
SELECT TO authenticated USING (
    bucket_id = 'chat-audio'
    AND EXISTS (
        SELECT 1 FROM matches
        WHERE matches.id::text = (storage.foldername(name))[1]
          AND (matches.user_id_1 = auth.uid() OR matches.user_id_2 = auth.uid())
    )
);
