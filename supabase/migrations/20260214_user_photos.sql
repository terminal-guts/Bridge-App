-- ============================================
-- User Photos Schema for Bridge
-- ============================================
-- Photo metadata records linked to Supabase Storage.
-- Column names from: onboardingMapping.ts, photoService.ts

CREATE TABLE IF NOT EXISTS user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_main ON user_photos(user_id, is_main) WHERE is_main = TRUE;

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read photos (needed for viewing profiles)
CREATE POLICY "Authenticated users can read all photos"
    ON user_photos FOR SELECT
    USING (auth.role() = 'authenticated');

-- Users can upload their own photos
CREATE POLICY "Users can insert their own photos"
    ON user_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos (reorder, set main)
CREATE POLICY "Users can update their own photos"
    ON user_photos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
    ON user_photos FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- Storage Bucket Policies for profile-photos
-- ============================================
-- Note: The bucket must be created via Dashboard or API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', false);

-- Users can upload photos to their own folder
CREATE POLICY "Users can upload own photos to storage"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Authenticated users can read any profile photo (via signed URLs)
CREATE POLICY "Authenticated users can read profile photos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'profile-photos'
        AND auth.role() = 'authenticated'
    );

-- Users can delete their own photos from storage
CREATE POLICY "Users can delete own photos from storage"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can update their own photos in storage
CREATE POLICY "Users can update own photos in storage"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'profile-photos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
