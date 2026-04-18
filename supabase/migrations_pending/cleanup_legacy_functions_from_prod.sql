-- ============================================
-- STAGED — NOT APPLIED TO ANYTHING
-- Prod cleanup: drop 47 legacy functions from retired features.
-- Move to supabase/migrations/ with a timestamp prefix when ready to apply.
-- Requires explicit user approval. See docs/migrations/LEGACY_CRUFT_IN_PROD.md.
-- ============================================

-- Old proposal / match RPCs (superseded by edge functions)
DROP FUNCTION IF EXISTS accept_proposal(p_user_id uuid, p_proposal_id uuid);
DROP FUNCTION IF EXISTS decline_proposal(p_user_id uuid, p_proposal_id uuid);
DROP FUNCTION IF EXISTS submit_proposal_vote(p_voter_user_id uuid, p_proposal_id uuid, p_vote boolean);
DROP FUNCTION IF EXISTS end_active_match(p_user_id uuid, p_match_id uuid, p_exit_reason text, p_exit_reason_detail text);
DROP FUNCTION IF EXISTS get_pending_proposals(p_user_id uuid, p_limit integer);
DROP FUNCTION IF EXISTS get_user_proposals(p_user_id uuid);
DROP FUNCTION IF EXISTS get_active_matches(p_user_id uuid);

-- Old email verification (superseded by email-signup edge function)
DROP FUNCTION IF EXISTS create_email_verification(p_user_id uuid, p_email text);
DROP FUNCTION IF EXISTS verify_email_code(p_user_id uuid, p_email text, p_code text);

-- Retired grid / daily-survey system (tables dropped in 20260302000001)
DROP FUNCTION IF EXISTS get_daily_grid(p_user_id uuid, p_grid_date date);
DROP FUNCTION IF EXISTS get_friend_grids(p_user_id uuid, p_grid_date date);
DROP FUNCTION IF EXISTS submit_grid_selection(p_anchor_user_id uuid, p_grid_id uuid, p_selected_candidate_id uuid, p_grid_date date);
DROP FUNCTION IF EXISTS assign_daily_survey_to_user(p_user_id uuid);
DROP FUNCTION IF EXISTS generate_mock_surveys();
DROP FUNCTION IF EXISTS regenerate_mock_surveys();
DROP FUNCTION IF EXISTS should_generate_mock_surveys();
DROP FUNCTION IF EXISTS ensure_mock_profiles(min_count integer);
DROP FUNCTION IF EXISTS get_todays_survey_count();
DROP FUNCTION IF EXISTS get_user_survey_status(p_user_id uuid);

-- Retired onboarding validation (moved to frontend Zod)
DROP FUNCTION IF EXISTS validate_age_range(p_age integer);
DROP FUNCTION IF EXISTS validate_height(p_height_inches integer);
DROP FUNCTION IF EXISTS validate_match_preferences(p_age_min integer, p_age_max integer, p_preferred_gender text);
DROP FUNCTION IF EXISTS validate_match_preferences(p_age_min integer, p_age_max integer, p_preferred_gender text, p_max_distance_miles integer);
DROP FUNCTION IF EXISTS validate_photos_requirements(p_user_id uuid);
DROP FUNCTION IF EXISTS validate_required_profile_fields(p_first_name text, p_last_name text, p_age integer, p_gender text[], p_location text, p_height_inches integer);
DROP FUNCTION IF EXISTS validate_complete_onboarding(p_user_id uuid);
DROP FUNCTION IF EXISTS validate_deep_question_tier_coverage(p_user_id uuid);
DROP FUNCTION IF EXISTS validate_email_domain();
DROP FUNCTION IF EXISTS create_onboarding_profile(p_user_id uuid, p_onboarding_data jsonb);
DROP FUNCTION IF EXISTS update_onboarding_profile(p_user_id uuid, p_onboarding_data jsonb);
DROP FUNCTION IF EXISTS get_onboarding_validation_errors(p_user_id uuid);

-- Retired dashboard / stats (superseded by 20260311100002_stats_rpc_functions)
DROP FUNCTION IF EXISTS get_dashboard_stats(p_user_id uuid);
DROP FUNCTION IF EXISTS get_dashboard_summary(p_user_id uuid);
DROP FUNCTION IF EXISTS get_task_progress(p_user_id uuid, p_task_date date);
DROP FUNCTION IF EXISTS get_match_pool_stats(p_user_id uuid);
DROP FUNCTION IF EXISTS get_todays_match_count();
DROP FUNCTION IF EXISTS get_user_karma(p_user_id uuid);
DROP FUNCTION IF EXISTS get_friend_stats(p_user_id uuid);

-- Retired karma / ban helpers (superseded)
DROP FUNCTION IF EXISTS get_active_strike_count(target_user_id uuid);
DROP FUNCTION IF EXISTS get_user_exit_score(target_user_id uuid, days integer);
DROP FUNCTION IF EXISTS should_ban_user(target_user_id uuid);
DROP FUNCTION IF EXISTS update_user_streak(p_user_id uuid);

-- Orphaned trigger functions (not wired to any trigger in current schema)
DROP FUNCTION IF EXISTS create_friend_code_for_new_user();
DROP FUNCTION IF EXISTS trigger_update_streak();
DROP FUNCTION IF EXISTS update_deep_question_answers_updated_at();
DROP FUNCTION IF EXISTS update_friend_codes_updated_at();
DROP FUNCTION IF EXISTS update_match_status();
DROP FUNCTION IF EXISTS sync_location_to_location_city();
