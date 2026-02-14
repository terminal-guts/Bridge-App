-- ============================================================
-- STORAGE POLICIES FOR profile-photos BUCKET
-- ============================================================
-- Run this AFTER creating the "profile-photos" bucket in Dashboard.
-- Dashboard > Storage > New Bucket > Name: "profile-photos" > Private
-- Then paste this SQL in SQL Editor.
-- ============================================================

CREATE POLICY "Users can upload own photos to storage"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Authenticated users can read profile photos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'profile-photos'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own photos from storage"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update own photos in storage"
    ON storage.objects FOR UPDATEgoog
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

