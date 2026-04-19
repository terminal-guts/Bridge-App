# Migration Log

Last updated: 2026-04-17

Status key: `PRODUCTION` = deployed to live database | `LOCAL_ONLY` = tested locally, not yet in production | `PENDING` = planned, not yet written | `BACKFILL` = prod already has this state; migration added retroactively so `supabase db reset` reproduces prod locally

**To verify local ⇄ prod parity:** run `./scripts/dump-prod-schema.sh` and `./scripts/dump-local-schema.sh`, then `./scripts/diff-schemas.py snapshots/prod-schema-<date>.json snapshots/local-schema-<date>.json`. Zero drift is the goal.

## Migrations

| # | File | Date | Summary | Status | Type |
|---|------|------|---------|--------|------|
| 1 | 20260118_friend_codes.sql | 2026-01-18 | Create friends + friend_codes tables, friend code generation | PRODUCTION | ADDITIVE |
| 2 | 20260126_messages.sql | 2026-01-26 | Create messages table for chat between matched users | PRODUCTION | ADDITIVE |
| 3 | 20260214000000_updated_at_trigger.sql | 2026-02-14 | Reusable updated_at trigger function for auto-updating timestamps | PRODUCTION | ADDITIVE |
| 4 | 20260214000001_blocked_users.sql | 2026-02-14 | Create blocked_users table for user blocking relationships | PRODUCTION | ADDITIVE |
| 5 | 20260214000002_daily_surveys.sql | 2026-02-14 | Create daily_surveys table for grid voting assignments | PRODUCTION | ADDITIVE |
| 6 | 20260214000003_deep_question_answers.sql | 2026-02-14 | Create deep_question_answers table with JSONB answers map per user | PRODUCTION | ADDITIVE |
| 7 | 20260214000005_karma_scores.sql | 2026-02-14 | Create karma_scores table for user reputation tracking | PRODUCTION | ADDITIVE |
| 8 | 20260214000006_matches.sql | 2026-02-14 | Create matches + match_exits tables for active/pending/expired matches | PRODUCTION | ADDITIVE |
| 9 | 20260214000008_proposals.sql | 2026-02-14 | Create proposals table for community matching proposals | PRODUCTION | ADDITIVE |
| 10 | 20260214000010_endorsements.sql | 2026-02-14 | Create endorsements table for proposal support from network members | PRODUCTION | ADDITIVE |
| 11 | 20260214000011_proposal_votes.sql | 2026-02-14 | Create proposal_votes table for individual community votes | PRODUCTION | ADDITIVE |
| 12 | 20260214000013_user_photos.sql | 2026-02-14 | Create user_photos table for photo metadata linked to Storage | PRODUCTION | ADDITIVE |
| 13 | 20260214000014_user_preferences.sql | 2026-02-14 | Create user_preferences table for matching preferences | PRODUCTION | ADDITIVE |
| 14 | 20260214000015_user_profiles.sql | 2026-02-14 | Create user_profiles core profile table (6+ services query this) | PRODUCTION | ADDITIVE |
| 15 | 20260214000016_user_settings.sql | 2026-02-14 | Create user_settings table for per-user app settings | PRODUCTION | ADDITIVE |
| 16 | 20260226000001_production_fixes.sql | 2026-02-26 | Drop FK on user_profiles.user_id, make nullable, disable RLS on all tables for beta | PRODUCTION | DESTRUCTIVE |
| 17 | 20260226221311_add_candidate_match.sql | 2026-02-26 | Add candidate_match value to proposal_status enum (no-op if TEXT type) | PRODUCTION | ADDITIVE |
| 18 | 20260301000001_cron_scheduling.sql | 2026-03-01 | Set up pg_cron + pg_net for daily edge function scheduling (lifecycle, generate, check) | PRODUCTION | ADDITIVE |
| 19 | 20260301000002_drop_preferred_gender.sql | 2026-03-01 | Drop redundant preferred_gender column from user_preferences | PRODUCTION | DESTRUCTIVE |
| 20 | 20260301000003_friend_streaks.sql | 2026-03-01 | Add streak columns to friends table, create friend_grid_completions table | PRODUCTION | ADDITIVE |
| 21 | 20260301000004_pool_vote_assignments.sql | 2026-03-01 | Create pool_vote_assignments table for proposal voting distribution | PRODUCTION | ADDITIVE |
| 22 | 20260301000005_proposal_enforcement.sql | 2026-03-01 | Permanent pair uniqueness constraint on proposals (rejected/declined pairs never re-proposed) | PRODUCTION | FIX |
| 23 | 20260301000006_unique_proposal_pairs.sql | 2026-03-01 | Unique active proposal pair constraint (order-independent A,B == B,A) | PRODUCTION | ADDITIVE |
| 24 | 20260302000001_drop_dead_tables.sql | 2026-03-02 | Drop dead tables: friend_grid_completions, daily_surveys, endorsements, daily_pairings | PRODUCTION | DESTRUCTIVE |
| 25 | 20260302000002_friend_messages.sql | 2026-03-02 | Create friend_messages table for real-time chat between friends | PRODUCTION | ADDITIVE |
| 26 | 20260302000003_karma_streak_wiring.sql | 2026-03-02 | Add karma_points column, create increment/update functions for karma and streaks | PRODUCTION | ADDITIVE |
| 27 | 20260303_rate_limits.sql | 2026-03-03 | Create rate_limit_config + rate_limit_attempts tables, check/record RPC functions | PRODUCTION | ADDITIVE |
| 28 | 20260304_fix_streak_mutuality.sql | 2026-03-04 | Fix update_friend_streak to require mutual voting before incrementing | PRODUCTION | FIX |
| 29 | 20260305000001_friend_recommendations.sql | 2026-03-05 | Create friend_recommendations table for recommending people to friends | PRODUCTION | ADDITIVE |
| 30 | 20260305100001_block_guard_friend_code.sql | 2026-03-05 | Guard add_friend_by_code RPC to reject if either user is blocked | PRODUCTION | FIX |
| 31 | 20260305100002_chat_audio_storage.sql | 2026-03-05 | Create chat-audio storage bucket with RLS policies | PRODUCTION | ADDITIVE |
| 32 | 20260305100003_fix_friend_code_bidirectional.sql | 2026-03-05 | Fix add_friend_by_code: bidirectional already-friends check + ON CONFLICT DO NOTHING | PRODUCTION | FIX |
| 33 | 20260305100004_fix_friend_recommendations_unique.sql | 2026-03-05 | Fix friend_recommendations unique constraint from 2-column to 3-column | PRODUCTION | FIX |
| 34 | 20260305120000_tighten_proposals_rls.sql | 2026-03-05 | Restrict proposal UPDATE to participants only, add vote_weight column | PRODUCTION | FIX |
| 35 | 20260306000001_user_reports.sql | 2026-03-06 | Create user_reports table for safety/moderation reports | PRODUCTION | ADDITIVE |
| 36 | 20260306000002_delete_user_account_rpc.sql | 2026-03-06 | Create delete_user_account RPC (cascading delete across all tables + auth) | PRODUCTION | ADDITIVE |
| 37 | 20260306100001_tighten_audio_read_policy.sql | 2026-03-06 | Tighten chat-audio read policy to match participants only | PRODUCTION | FIX |
| 38 | 20260306100002_unique_match_per_proposal.sql | 2026-03-06 | Add proposal_id to matches, unique index to prevent duplicate matches per proposal | PRODUCTION | FIX |
| 39 | 20260307_proposals_replica_identity.sql | 2026-03-07 | Enable REPLICA IDENTITY FULL on proposals for Realtime status transition detection | PRODUCTION | ADDITIVE |
| 40 | 20260309000001_add_matchmaking_only.sql | 2026-03-09 | Add matchmaking_only boolean flag to user_profiles | PRODUCTION | ADDITIVE |
| 41 | 20260310100001_rls_tier1_sensitive.sql | 2026-03-10 | Re-enable RLS on Tier 1 tables: messages, matches, user_profiles, user_photos, user_settings | PRODUCTION | FIX |
| 42 | 20260310100002_rls_tier2_important.sql | 2026-03-10 | Re-enable RLS on Tier 2 tables: proposals, proposal_votes, friends, karma_scores, pool_vote_assignments | PRODUCTION | FIX |
| 43 | 20260310100003_rls_tier3_general.sql | 2026-03-10 | Re-enable RLS on Tier 3 tables: deep_question_answers, friend_codes, friend_recommendations, blocked_users, user_preferences, match_exits | PRODUCTION | FIX |
| 44 | 20260310100004_support_chat.sql | 2026-03-10 | Create support_conversations + support_messages tables for in-app support chat | PRODUCTION | ADDITIVE |
| 45 | 20260311100001_daily_rank_snapshots.sql | 2026-03-11 | Create karma_rank_snapshots table for daily leaderboard rank tracking | PRODUCTION | ADDITIVE |
| 46 | 20260311100002_stats_rpc_functions.sql | 2026-03-11 | Create get_current_week_start, get_user_stats, get_campus_stats RPC functions | PRODUCTION | ADDITIVE |
| 47 | 20260311100003_support_reply_context.sql | 2026-03-11 | Create support_reply_context single-row table for SMS reply routing | PRODUCTION | ADDITIVE |
| 48 | 20260312000003_ban_system.sql | 2026-03-12 | Add is_suspended/suspended_at/suspension_reason to user_profiles, auto-suspend trigger on 3+ reports | PRODUCTION | ADDITIVE |
| 49 | 20260312000004_friend_proposals.sql | 2026-03-12 | Add created_by + creation_type columns to proposals for friend vs algorithm tracking | PRODUCTION | ADDITIVE |
| 50 | 20260312000005_friend_suggestions.sql | 2026-03-12 | Create friend_suggestions table for queued friend-to-friend match recommendations | PRODUCTION | ADDITIVE |
| 51 | 20260312000010_notification_log.sql | 2026-03-12 | Create notification_log table for push notification tracking (caps, cooldowns, copy rotation) | PRODUCTION | ADDITIVE |
| 52 | 20260312000011_user_settings_notification_prefs.sql | 2026-03-12 | Add server-side notification preference columns to user_settings | PRODUCTION | ADDITIVE |
| 53 | 20260312000012_notification_cron_jobs.sql | 2026-03-12 | Add cron jobs for notification edge functions (streak-at-risk, vote-reminder, leaderboard, dormant) | PRODUCTION | ADDITIVE |
| 54 | 20260312000013_notification_triggers.sql | 2026-03-12 | Create DB triggers for transactional push notifications (new match, message, deciding) | PRODUCTION | ADDITIVE |
| 55 | 20260312000014_leaderboard_visibility.sql | 2026-03-12 | Add pref_leaderboard_visible boolean to user_settings (anonymous by default) | PRODUCTION | ADDITIVE |
| 56 | 20260312000017_swap_anticipation_for_ice_breaker.sql | 2026-03-12 | Remove anticipation cron, add ice-breaker notification cron (match conversation nudge) | PRODUCTION | DESTRUCTIVE |
| 57 | 20260312000018_fix_notification_triggers_vault.sql | 2026-03-12 | Fix notification triggers to use vault instead of current_setting (NULL in pooled connections) | PRODUCTION | FIX |
| 58 | 20260312100001_weekly_leaderboard.sql | 2026-03-12 | Create karma_weekly_snapshots table + snapshot-weekly-karma cron job | PRODUCTION | ADDITIVE |
| 59 | 20260313000001_friend_requests.sql | 2026-03-13 | Add status + requested_by columns to friends table for friend request flow | PRODUCTION | ADDITIVE |
| 60 | 20260313000002_friend_badges.sql | 2026-03-13 | Create friend_badges table for social validation badges between friends | PRODUCTION | ADDITIVE |
| 61 | 20260314000001_badge_message_limit_and_rls.sql | 2026-03-14 | Increase badge message limit from 30 to 50 chars, add public read policy for featured badges | PRODUCTION | FIX |
| 62 | 20260314000002_preferred_religions.sql | 2026-03-14 | Add preferred_religions TEXT[] column to user_preferences | PRODUCTION | ADDITIVE |
| 63 | 20260315000001_matchmaker_schema.sql | 2026-03-15 | Add role column to user_profiles, create ghost_profiles table for matchmaker feature | PRODUCTION | ADDITIVE |
| 64 | 20260318000001_crushes.sql | 2026-03-18 | Create crushes table for secret crush system with mutual detection | PRODUCTION | ADDITIVE |
| 65 | 20260323000001_increment_proposal_tallies_rpc.sql | 2026-03-23 | Create atomic increment_proposal_tallies RPC to avoid read-modify-write races | PRODUCTION | ADDITIVE |
| 66 | 20260323000002_chat_audio_rls.sql | 2026-03-23 | Tighten chat-audio SELECT policy to sender/receiver path-based check | PRODUCTION | FIX |
| 67 | 20260323000003_add_sent_to_users_at.sql | 2026-03-23 | Add sent_to_users_at column to proposals for tracking when confirmed proposals are surfaced | PRODUCTION | ADDITIVE |
| 68 | 20260323000004_chat_audio_storage_consolidated.sql | 2026-03-23 | Consolidated chat-audio bucket setup (idempotent, supersedes earlier audio migrations) | PRODUCTION | FIX |
| 69 | 20260403000001_fix_cron_jobs_use_vault.sql | 2026-04-03 | Fix notification cron jobs to read service_role_key from vault instead of current_setting | PRODUCTION | FIX |
| 70 | 20260403000002_fix_remaining_cron_jobs_use_vault.sql | 2026-04-03 | Fix remaining cron jobs (generate-proposals, lifecycle, weekly-karma) to use vault | PRODUCTION | FIX |
| 71 | 20260412000002_check_email_exists.sql | 2026-04-12 | Create check_email_exists RPC for signup flow (SECURITY DEFINER, boolean only) | PRODUCTION | ADDITIVE |
| 72 | 20260415000001_email_verification_codes.sql | 2026-04-15 | OTP code storage for email-signup edge function (matches prod shape: `code` + `code_hash` + `used`) | PRODUCTION | ADDITIVE |
| 73 | 20260415000002_get_user_by_email_rpc.sql | 2026-04-15 | Look up user + profile status by email (service_role only) | PRODUCTION | ADDITIVE |
| 74 | 20260415000003_email_unsubscribes.sql | 2026-04-15 | Track email unsubscribe preferences for deliverability | PRODUCTION | ADDITIVE |
| 75 | 20260417000001_add_missing_production_columns.sql | 2026-04-17 | Catch-up columns added to prod manually: user_profiles.profile_completed, user_profiles.email, user_preferences.interested_in_genders + partner_* + preferred_politics, proposals.vote_context | PRODUCTION | BACKFILL |
| 76 | 20260417000002_revoke_check_email_exists_anon.sql | 2026-04-17 | REVOKE EXECUTE on check_email_exists from anon (anti-enumeration, covered by new email-signup flow) | PRODUCTION | FIX |
| 77 | 20260417000003_backfill_prod_only_tables.sql | 2026-04-17 | Backfill 4 prod-only tables so `supabase db reset` mirrors prod: `profiles`, `onboarding_progress`, `waitlist_signups`, `allowed_email_domains` (with indexes, RLS, policies, seed rice.edu domain). `waitlist_signups.email` upgraded to citext by `scripts/setup-local.sh` post-reset. | PRODUCTION | BACKFILL |
| 78 | 20260417000004_align_local_with_prod.sql | 2026-04-17 | Align remaining structural drift: missing columns (user_profiles.email_verified_at, deep_question_answers legacy cols, user_photos.url, user_preferences.partner_lifestyle_preferences, user_profiles.role NOT NULL), 9 missing indexes, 5 missing policies, RLS on support_reply_context, triggers on profiles + onboarding_progress, handle_updated_at() + exec_sql() functions, drop local-only unique_active_proposal_pair index | PRODUCTION | BACKFILL |
| 79 | 20260417100001_remove_proposal_lifecycle_check_cron.sql | 2026-04-18 | Unschedule 4-hour `proposal-lifecycle-check` safety-net cron (gate-overhaul-v2 consolidates decisions into the single 7PM cron) | PRODUCTION | FIX |
| 80 | 20260417100002_local_align_profile_completed.sql | 2026-04-17 | Adds `user_profiles.profile_completed` column (already exists in prod via manual ALTER) | LOCAL_ONLY | BACKFILL |
| 81 | 20260417100003_karma_outcome_v2.sql | 2026-04-18 | Rewrite `apply_karma_on_outcome` RPC to +3/-1 model + `karma_applied` idempotency flag + REVOKE EXECUTE from PUBLIC/anon/authenticated (security hole closed) | PRODUCTION | FIX |
| 82 | 20260417100004_auto_expire_on_pause.sql | 2026-04-18 | Trigger on `user_profiles` to auto-expire pending/deciding proposals when subject pauses or is suspended | PRODUCTION | ADDITIVE |

## Gate-overhaul-v2 deploy (2026-04-18 23:52–23:54 UTC)

Entries 79, 81, 82 applied to prod; entry 80 is LOCAL_ONLY (prod already had the column).

Post-deploy verification snapshot:
```json
{
  "crons": ["generate-proposals", "proposal-lifecycle", "snapshot-weekly-karma"],
  "karma_applied_col": 1,
  "karma_rpc_has_v2_logic": true,
  "karma_rpc_grants": ["postgres", "service_role"],
  "pause_trigger_fn": 1,
  "pause_trigger": 1,
  "proposal_lifecycle_check_gone": true
}
```

All 6 companion edge functions redeployed (`process-vote`, `proposal-lifecycle`, `generate-proposals`, `get-proposals-for-voting`, `generate-proposal-for-user`, `assign-new-user-proposals`) — all `ACTIVE` with 2026-04-18 timestamps. First 7PM cron on new code (23:55 UTC lifecycle + 00:00 UTC generate) returned 200; 15 new proposals created; 1 deciding proposal auto-expired (2-cycle rule); 0 writes to `pool_vote_assignments` (new model confirmed in prod).

## Notes on drift and catch-up migrations

- Entries marked `BACKFILL` are local-only SQL that reproduces state already in prod. They were never "applied" to prod (prod already has it); they exist so `supabase db reset` produces a public schema that matches prod.
- Production `email_verification_codes` table predated migration #72. Prod has both `code` and `code_hash` columns (redundant, mid-rollout to hashed storage). Migration #72 was rewritten on 2026-04-17 to match prod's actual shape.
- The `profiles` table (36 cols) coexists with `user_profiles` (55 cols) in prod. It is effectively dormant in frontend code (0 references in `src/`). Kept for parity only.
- `onboarding_progress`, `waitlist_signups`, `allowed_email_domains` were created directly in prod without migration files. #77 makes them reproducible locally.
- **47 legacy functions exist in prod but NOT in local** (old grid system, retired RPCs, unwired triggers). See [LEGACY_CRUFT_IN_PROD.md](LEGACY_CRUFT_IN_PROD.md) for the full list and rationale. A DROP migration is staged at `supabase/migrations_pending/cleanup_legacy_functions_from_prod.sql` — promote to prod with user approval to achieve zero drift.

## Verification as of 2026-04-17

Running `./scripts/check-schema-parity.sh` after `./scripts/setup-local.sh` reports:
- **Tables 38/38, Columns 409/409, Indexes 145/145, RLS 38/38, Policies 85/85, Triggers 21/21 — all match.**
- **Functions: 88/88 match (88 active + 47 documented legacy cruft in prod, allowlisted in `scripts/schema-diff-ignore.json`).**
- Result: **no drift**.
