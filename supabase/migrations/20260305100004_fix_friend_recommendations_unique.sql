-- ============================================
-- Fix: friend_recommendations unique constraint
-- Mar 5 2026
-- ============================================
-- The existing unique constraint was only on (recommender_id, recommended_person_id),
-- but the submit-recommendation edge function upserts on all three columns:
-- (recommender_id, recommended_person_id, recommended_to_friend_id).
-- This mismatch caused the upsert to fail silently.
-- Fix: replace the 2-column constraint with the correct 3-column one.

ALTER TABLE friend_recommendations
  DROP CONSTRAINT friend_recommendations_recommender_id_recommended_person_id_key;

ALTER TABLE friend_recommendations
  ADD CONSTRAINT friend_recommendations_recommender_person_friend_key
  UNIQUE (recommender_id, recommended_person_id, recommended_to_friend_id);
