-- Tighten chat-audio bucket SELECT policy.
-- Audio paths follow {sender_id}/{receiver_id}/{message_id}.
-- Restrict reads to participants only (sender or receiver).
DROP POLICY IF EXISTS "Users can read chat audio" ON storage.objects;
CREATE POLICY "Users can read their own chat audio" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-audio'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );
