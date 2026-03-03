-- ============================================
-- Deep Question Answers Schema for Bridge
-- ============================================
-- Single row per user with JSONB answers map.
-- Column names from: developmentDataService.ts:165-172, accountService.ts

CREATE TABLE IF NOT EXISTS deep_question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- JSONB map of questionId -> answer text
    answers JSONB DEFAULT '{}',

    -- Array of question IDs currently displayed on profile (max 3, one per tier)
    displayed_question_ids INTEGER[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_deep_questions UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_deep_question_answers_user_id ON deep_question_answers(user_id);

-- Auto-update updated_at
CREATE TRIGGER update_deep_question_answers_updated_at
    BEFORE UPDATE ON deep_question_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE deep_question_answers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all answers (needed for profile viewing)
CREATE POLICY "Authenticated users can read all deep question answers"
    ON deep_question_answers FOR SELECT
    USING (auth.role() = 'authenticated');

-- Users can create their own answers
CREATE POLICY "Users can create their own deep question answers"
    ON deep_question_answers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own answers
CREATE POLICY "Users can update their own deep question answers"
    ON deep_question_answers FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own answers
CREATE POLICY "Users can delete their own deep question answers"
    ON deep_question_answers FOR DELETE
    USING (auth.uid() = user_id);
