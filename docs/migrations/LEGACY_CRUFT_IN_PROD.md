# Legacy cruft in prod

**Last audit:** 2026-04-17 via `scripts/diff-schemas.py`.

After migrations `20260417000003_backfill_prod_only_tables.sql` and `20260417000004_align_local_with_prod.sql` are applied + `scripts/setup-local.sh` runs, local matches prod **100% on structural surfaces** (tables, columns, indexes, RLS, policies, triggers).

The only remaining drift is **47 legacy `public.*` functions that exist in prod but not in local**. None is wired to a trigger, none is called by current app code (`src/*.ts(x)` or `supabase/functions/*`), and most reference tables that were dropped long ago (`daily_surveys`, `friend_grid_completions`, `endorsements`, `daily_pairings`).

They are safely inert in prod — calling any of them would error. They persist because no `DROP FUNCTION` was ever issued when the corresponding features were retired.

## Status

| Category | Count | Example(s) | Why safe to drop |
|---|---:|---|---|
| Retired grid / daily-survey system | 9 | `get_daily_grid`, `submit_grid_selection`, `assign_daily_survey_to_user`, `generate_mock_surveys` | Tables `daily_surveys`, `friend_grid_completions` dropped in migration `20260302000001`. Functions reference non-existent tables. |
| Retired onboarding validation | 13 | `validate_age_range`, `validate_complete_onboarding`, `validate_required_profile_fields`, `create_onboarding_profile`, `update_onboarding_profile`, `get_onboarding_validation_errors` | Onboarding validation moved to frontend Zod schemas in `src/utils/validation/`. These RPCs are no longer called. |
| Retired dashboard / stats | 9 | `get_dashboard_stats`, `get_dashboard_summary`, `get_task_progress`, `get_match_pool_stats`, `get_todays_match_count`, `get_user_survey_status` | Replaced by `get_user_stats`, `get_campus_stats` (migration `20260311100002_stats_rpc_functions.sql`). |
| Retired proposal / match RPCs | 6 | `accept_proposal`, `decline_proposal`, `submit_proposal_vote`, `end_active_match`, `get_pending_proposals`, `get_user_proposals` | Replaced by edge functions: `process-decision`, `process-vote`, `exit-match`, `reject-match`, `get-proposals-for-voting`. |
| Retired mock-data helpers | 3 | `ensure_mock_profiles`, `regenerate_mock_surveys`, `should_generate_mock_surveys` | Early dev-only seeding; app now uses `scripts/seed-local.sh` + snapshot imports. |
| Retired triggers (orphaned) | 6 | `create_friend_code_for_new_user`, `trigger_update_streak`, `update_deep_question_answers_updated_at`, `update_friend_codes_updated_at`, `update_match_status`, `validate_email_domain`, `sync_location_to_location_city` | Older versions of triggers; the current triggers use `update_updated_at_column()` / `handle_updated_at()` / their dedicated replacements. |
| Retired karma / ban helpers | 4 | `get_active_strike_count`, `get_user_exit_score`, `should_ban_user`, `update_user_streak` | Superseded by `apply_karma_on_outcome`, `auto_suspend_on_reports`, and the in-function streak logic. |
| Retired email verification (old) | 2 | `create_email_verification`, `verify_email_code` | Replaced by the `email-signup` edge function (migration `20260415000001` + RPC `get_user_by_email`). |
| Misc retired getters | 2 | `get_user_karma`, `get_friend_stats`, `get_active_matches` | Replaced by the get-stats edge function or direct table reads with RLS. |

## Full list (47)

```
accept_proposal(p_user_id uuid, p_proposal_id uuid)
assign_daily_survey_to_user(p_user_id uuid)
create_email_verification(p_user_id uuid, p_email text)
create_friend_code_for_new_user()
create_onboarding_profile(p_user_id uuid, p_onboarding_data jsonb)
decline_proposal(p_user_id uuid, p_proposal_id uuid)
end_active_match(p_user_id uuid, p_match_id uuid, p_exit_reason text, p_exit_reason_detail text)
ensure_mock_profiles(min_count integer)
generate_mock_surveys()
get_active_matches(p_user_id uuid)
get_active_strike_count(target_user_id uuid)
get_daily_grid(p_user_id uuid, p_grid_date date)
get_dashboard_stats(p_user_id uuid)
get_dashboard_summary(p_user_id uuid)
get_friend_grids(p_user_id uuid, p_grid_date date)
get_friend_stats(p_user_id uuid)
get_match_pool_stats(p_user_id uuid)
get_onboarding_validation_errors(p_user_id uuid)
get_pending_proposals(p_user_id uuid, p_limit integer)
get_task_progress(p_user_id uuid, p_task_date date)
get_todays_match_count()
get_todays_survey_count()
get_user_exit_score(target_user_id uuid, days integer)
get_user_karma(p_user_id uuid)
get_user_proposals(p_user_id uuid)
get_user_survey_status(p_user_id uuid)
regenerate_mock_surveys()
should_ban_user(target_user_id uuid)
should_generate_mock_surveys()
submit_grid_selection(p_anchor_user_id uuid, p_grid_id uuid, p_selected_candidate_id uuid, p_grid_date date)
submit_proposal_vote(p_voter_user_id uuid, p_proposal_id uuid, p_vote boolean)
sync_location_to_location_city()
trigger_update_streak()
update_deep_question_answers_updated_at()
update_friend_codes_updated_at()
update_match_status()
update_onboarding_profile(p_user_id uuid, p_onboarding_data jsonb)
update_user_streak(p_user_id uuid)
validate_age_range(p_age integer)
validate_complete_onboarding(p_user_id uuid)
validate_deep_question_tier_coverage(p_user_id uuid)
validate_email_domain()
validate_height(p_height_inches integer)
validate_match_preferences(p_age_min integer, p_age_max integer, p_preferred_gender text)
validate_match_preferences(p_age_min integer, p_age_max integer, p_preferred_gender text, p_max_distance_miles integer)
validate_photos_requirements(p_user_id uuid)
validate_required_profile_fields(p_first_name text, p_last_name text, p_age integer, p_gender text[], p_location text, p_height_inches integer)
verify_email_code(p_user_id uuid, p_email text, p_code text)
```

## How to close the drift (optional, requires user approval)

A cleanup migration that DROPs all 47 functions is staged at `supabase/migrations_pending/cleanup_legacy_functions_from_prod.sql` (NOT in the main `migrations/` folder — prevents accidental local-first application).

When ready to clean prod:

1. Move the file into `supabase/migrations/` with a current timestamp.
2. Get explicit user approval (prod change).
3. Apply via `./scripts/supabase-exec.sh "$(cat supabase/migrations/<file>.sql)"`.
4. Update `MIGRATION_LOG.md` entry to status `PRODUCTION`.
5. Re-run `./scripts/check-schema-parity.sh` — should report zero drift.

## Why these are ignored, not recreated

We could recreate the 47 functions locally for strict parity. We choose not to because:

- They reference dropped tables (`daily_surveys`, `endorsements`, etc.) — creating them on local would require recreating the dropped tables first, cascading the cruft.
- They have zero live callers — both `src/` and `supabase/functions/` are clean per code-usage scan (2026-04-17).
- Our schema-diff tool now catches any *new* drift — adding these functions wouldn't make the tool more useful.
- Documenting them here + providing a prod DROP script is the smaller, cleaner change.
