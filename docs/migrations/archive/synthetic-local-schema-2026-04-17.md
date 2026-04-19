# Synthetic Local Schema — 2026-04-17

This document describes the schema that `supabase db reset` would produce from the migration files in `supabase/migrations/` as of 2026-04-17, applied in filename-sorted order. It is the reference state to diff against the live production schema.

- **Migration files on disk:** 76
- **Files tracked in `MIGRATION_LOG.md`:** 74 (files 1–71 as PRODUCTION + 72–74 in a "Local-Only" subsection that is already marked PRODUCTION)
- **Flagged as NOT in MIGRATION_LOG.md:** `20260417000001_add_missing_production_columns.sql`, `20260417000002_revoke_check_email_exists_anon.sql`

---

## 1. Migration Chain Summary

| # | File | Brief description | In MIGRATION_LOG? |
|---|------|-------------------|-------------------|
| 1 | `20260118_friend_codes.sql` | CREATE TABLE `friend_codes`, `friends`; fn `generate_friend_code`, `handle_new_user_friend_code`, RPC `add_friend_by_code`; trigger on `auth.users`; enable RLS + policies | Yes |
| 2 | `20260126_messages.sql` | CREATE TABLE `messages`; fns `mark_messages_as_read`, `get_unread_count`; enable RLS + policies; add to `supabase_realtime` publication | Yes |
| 3 | `20260214000000_updated_at_trigger.sql` | CREATE FUNCTION `update_updated_at_column()` | Yes |
| 4 | `20260214000001_blocked_users.sql` | CREATE TABLE `blocked_users`; enable RLS + policies | Yes |
| 5 | `20260214000002_daily_surveys.sql` | CREATE TABLE `daily_surveys`; enable RLS + policies | Yes |
| 6 | `20260214000003_deep_question_answers.sql` | CREATE TABLE `deep_question_answers`; `updated_at` trigger; enable RLS + policies | Yes |
| 7 | `20260214000005_karma_scores.sql` | CREATE TABLE `karma_scores`; `updated_at` trigger; enable RLS + policies | Yes |
| 8 | `20260214000006_matches.sql` | CREATE TABLE `matches`, `match_exits`; FK `messages.match_id` → matches; `updated_at` triggers; enable RLS + policies; add matches to realtime publication | Yes |
| 9 | `20260214000008_proposals.sql` | CREATE TABLE `proposals`; `updated_at` trigger; enable RLS + policies; add to realtime publication | Yes |
| 10 | `20260214000010_endorsements.sql` | CREATE TABLE `endorsements`; enable RLS + policies | Yes |
| 11 | `20260214000011_proposal_votes.sql` | CREATE TABLE `proposal_votes`; enable RLS + policies | Yes |
| 12 | `20260214000013_user_photos.sql` | CREATE TABLE `user_photos`; enable RLS + policies; storage.objects policies for `profile-photos` bucket | Yes |
| 13 | `20260214000014_user_preferences.sql` | CREATE TABLE `user_preferences`; `updated_at` trigger; enable RLS + policies | Yes |
| 14 | `20260214000015_user_profiles.sql` | CREATE TABLE `user_profiles`; `updated_at` trigger; enable RLS + policies | Yes |
| 15 | `20260214000016_user_settings.sql` | CREATE TABLE `user_settings`; `updated_at` trigger; enable RLS + policies | Yes |
| 16 | `20260226000001_production_fixes.sql` | DROP FK `user_profiles.user_id`; make nullable; DISABLE RLS on 15 tables | Yes |
| 17 | `20260226221311_add_candidate_match.sql` | Conditionally ADD VALUE to `proposal_status` enum (no-op: type never created) | Yes |
| 18 | `20260301000001_cron_scheduling.sql` | CREATE EXTENSION `pg_cron`, `pg_net`; schedule jobs: `proposal-lifecycle`, `generate-proposals`, `proposal-lifecycle-check`, `snapshot-weekly-karma` (uses `current_setting`) | Yes |
| 19 | `20260301000002_drop_preferred_gender.sql` | DROP COLUMN `user_preferences.preferred_gender` | Yes |
| 20 | `20260301000003_friend_streaks.sql` | ADD COLUMN `friends.streak_days`, `last_mutual_date`; DISABLE RLS on friends; CREATE TABLE `friend_grid_completions`; RPC `record_grid_completion` | Yes |
| 21 | `20260301000004_pool_vote_assignments.sql` | CREATE TABLE `pool_vote_assignments`; enable RLS + policies | Yes |
| 22 | `20260301000005_proposal_enforcement.sql` | DROP INDEX `unique_active_proposal_pair`; CREATE UNIQUE INDEX `unique_proposal_pair_permanent`, `one_active_proposal_per_user_a`, `one_active_proposal_per_user_b` | Yes |
| 23 | `20260301000006_unique_proposal_pairs.sql` | CREATE UNIQUE INDEX `unique_active_proposal_pair` (recreated after being dropped by previous file) | Yes |
| 24 | `20260302000001_drop_dead_tables.sql` | DROP TABLE `friend_grid_completions`, `daily_surveys`, `endorsements`, `daily_pairings`; DROP FUNCTION `record_grid_completion`; unschedule cron `generate-daily-pairings` | Yes |
| 25 | `20260302000002_friend_messages.sql` | CREATE TABLE `friend_messages`; enable RLS + policies; fns `mark_friend_messages_as_read`, `get_friend_unread_count`; add to realtime publication | Yes |
| 26 | `20260302000003_karma_streak_wiring.sql` | ADD COLUMN `karma_scores.karma_points`, `total_inaccurate_votes`; ADD COLUMN `proposals.weighted_yes`, `weighted_no`; ADD COLUMN `friends.streak_frozen`; fns `increment_total_proposals`, `increment_karma_for_vote` (service_role only), `compute_karma_tier`, `apply_karma_on_outcome`, `freeze_inactive_streaks`, `kill_dead_streaks`, `update_friend_streak`; trigger `trg_compute_karma_tier` | Yes |
| 27 | `20260303_rate_limits.sql` | DROP fn `check_rate_limit`, `record_rate_limit_attempt`; DROP TYPE `rate_limit_result`; CREATE TABLE `rate_limit_config`, `rate_limit_attempts`; seed config rows; enable RLS; CREATE TYPE `rate_limit_result`; fns `check_rate_limit`, `record_rate_limit_attempt` | Yes |
| 28 | `20260304_fix_streak_mutuality.sql` | REPLACE fns `update_friend_streak` (mutuality check), `kill_dead_streaks`, `freeze_inactive_streaks`; DROP fn `record_grid_completion`; DROP TABLE `friend_grid_completions` (already dropped) | Yes |
| 29 | `20260305000001_friend_recommendations.sql` | CREATE TABLE `friend_recommendations` with 2-column UNIQUE `(recommender_id, recommended_person_id)`; index; enable RLS (no policies yet) | Yes |
| 30 | `20260305100001_block_guard_friend_code.sql` | REPLACE fn `add_friend_by_code` with block check + ON CONFLICT DO NOTHING | Yes |
| 31 | `20260305100002_chat_audio_storage.sql` | INSERT storage bucket `chat-audio`; policies `Users can upload chat audio`, `Users can read chat audio`, `Users can delete own chat audio` | Yes |
| 32 | `20260305100003_fix_friend_code_bidirectional.sql` | REPLACE fn `add_friend_by_code` — **REGRESSION: block-guard removed**, bidirectional already-friends check added | Yes |
| 33 | `20260305100004_fix_friend_recommendations_unique.sql` | DROP 2-col unique constraint; ADD 3-col unique constraint on `friend_recommendations` | Yes |
| 34 | `20260305120000_tighten_proposals_rls.sql` | DROP POLICY "Authenticated users can update proposals"; CREATE POLICY "Proposal participants can update proposals"; ADD COLUMN `proposal_votes.vote_weight`; ADD COLUMN `user_profiles.deleted_at`, `deletion_scheduled_for` | Yes |
| 35 | `20260306000001_user_reports.sql` | CREATE TABLE `user_reports`; indexes; enable RLS + policies | Yes |
| 36 | `20260306000002_delete_user_account_rpc.sql` | CREATE FUNCTION `delete_user_account(uuid)` SECURITY DEFINER | Yes |
| 37 | `20260306100001_tighten_audio_read_policy.sql` | DROP + CREATE POLICY "Match participants can read chat audio" on storage.objects | Yes |
| 38 | `20260306100002_unique_match_per_proposal.sql` | ADD COLUMN `matches.proposal_id`; CREATE UNIQUE INDEX `unique_match_per_proposal` | Yes |
| 39 | `20260307_proposals_replica_identity.sql` | ALTER TABLE `proposals` REPLICA IDENTITY FULL | Yes |
| 40 | `20260309000001_add_matchmaking_only.sql` | ADD COLUMN `user_profiles.matchmaking_only` | Yes |
| 41 | `20260310100001_rls_tier1_sensitive.sql` | ENABLE RLS on `messages`, `matches`, `user_profiles`, `user_photos`, `user_settings`; DROP POLICY "Authenticated users can create matches" | Yes |
| 42 | `20260310100002_rls_tier2_important.sql` | ENABLE RLS on `proposals`, `proposal_votes`, `friends`, `karma_scores`; DROP + REPLACE friends SELECT/DELETE policies; DROP several permissive policies on proposals, karma_scores, pool_vote_assignments | Yes |
| 43 | `20260310100003_rls_tier3_general.sql` | ENABLE RLS on `deep_question_answers`, `friend_codes`, `blocked_users`, `user_preferences`, `match_exits`; ADD SELECT policy on `friend_recommendations`; REPLACE blocked_users SELECT policy (widened) | Yes |
| 44 | `20260310100004_support_chat.sql` | CREATE TABLE `support_conversations`, `support_messages`; indexes; RLS + policies; add `support_messages` to realtime publication; ADD COLUMN `user_settings.push_token` | Yes |
| 45 | `20260311100001_daily_rank_snapshots.sql` | CREATE TABLE `karma_rank_snapshots`; index; RLS + policy; fn `snapshot_daily_ranks`; DROP + REPLACE `get_leaderboard_data` | Yes |
| 46 | `20260311100002_stats_rpc_functions.sql` | CREATE FUNCTIONS `get_current_week_start`, `get_user_stats`, `get_campus_stats` | Yes |
| 47 | `20260311100003_support_reply_context.sql` | CREATE TABLE `support_reply_context` (single-row, id=1); seed row | Yes |
| 48 | `20260312000003_ban_system.sql` | ADD COLUMN `user_profiles.is_suspended`, `suspended_at`, `suspension_reason`; index; fn `auto_suspend_on_reports`; trigger `trg_auto_suspend_on_report` on user_reports | Yes |
| 49 | `20260312000004_friend_proposals.sql` | ADD COLUMN `proposals.created_by`, `creation_type`; partial index on `created_by` | Yes |
| 50 | `20260312000005_friend_suggestions.sql` | CREATE TABLE `friend_suggestions`; 3 indexes; enable RLS + policies | Yes |
| 51 | `20260312000010_notification_log.sql` | CREATE TABLE `notification_log`; 3 indexes; enable RLS (no user policies) | Yes |
| 52 | `20260312000011_user_settings_notification_prefs.sql` | ADD COLUMN `user_settings.pref_matches_enabled`, `pref_messages_enabled`, `pref_nudges_enabled`, `pref_show_name_if_winner` | Yes |
| 53 | `20260312000012_notification_cron_jobs.sql` | Schedule 6 cron jobs: `notify-streak-at-risk`, `notify-anticipation`, `notify-vote-reminder`, `notify-morning-leaderboard`, `notify-dormant-users`, `notify-match-expiring` (using `current_setting`) | Yes |
| 54 | `20260312000013_notification_triggers.sql` | CREATE FUNCTIONS `notify_new_match`, `notify_new_message`, `notify_proposal_deciding`; 3 triggers; ALTER DATABASE SET `app.settings.supabase_url` | Yes |
| 55 | `20260312000014_leaderboard_visibility.sql` | ADD COLUMN `user_settings.pref_leaderboard_visible` | Yes |
| 56 | `20260312000017_swap_anticipation_for_ice_breaker.sql` | Unschedule `notify-anticipation`; schedule `notify-ice-breaker` | Yes |
| 57 | `20260312000018_fix_notification_triggers_vault.sql` | REPLACE fns `notify_new_match`, `notify_new_message`, `notify_proposal_deciding` to read secrets from vault | Yes |
| 58 | `20260312100001_weekly_leaderboard.sql` | CREATE TABLE `karma_weekly_snapshots`; index; enable RLS + 2 policies; fn `snapshot_weekly_karma_rpc` | Yes |
| 59 | `20260313000001_friend_requests.sql` | ADD COLUMN `friends.status`, `requested_by`; UNIQUE constraint `friends_user_id_friend_id_key`; 2 indexes; fns `send_friend_request`, `accept_friend_request`, `decline_friend_request`, `cancel_friend_request`; SELECT policy for pending requests | Yes |
| 60 | `20260313000002_friend_badges.sql` | CREATE TABLE `friend_badges`; 3 indexes; fns `update_friend_badges_updated_at`, `enforce_max_featured_badges`; 2 triggers; enable RLS + 4 policies | Yes |
| 61 | `20260314000001_badge_message_limit_and_rls.sql` | ALTER check constraint message length 30 → 50; ADD POLICY "Anyone can view featured badges" | Yes |
| 62 | `20260314000002_preferred_religions.sql` | ADD COLUMN `user_preferences.preferred_religions` | Yes |
| 63 | `20260315000001_matchmaker_schema.sql` | ADD COLUMN `user_profiles.role`; CREATE TABLE `ghost_profiles`, `roster`, `introductions`; triggers; RLS + policies | Yes |
| 64 | `20260318000001_crushes.sql` | CREATE TABLE `crushes`; 3 indexes; enable RLS + 3 policies; fns `check_mutual_crush`, `get_crushes_on_me` | Yes |
| 65 | `20260323000001_increment_proposal_tallies_rpc.sql` | CREATE FUNCTION `increment_proposal_tallies` (service_role only) | Yes |
| 66 | `20260323000002_chat_audio_rls.sql` | DROP + CREATE POLICY "Users can read their own chat audio" on storage.objects | Yes |
| 67 | `20260323000003_add_sent_to_users_at.sql` | ADD COLUMN `proposals.sent_to_users_at` | Yes |
| 68 | `20260323000004_chat_audio_storage_consolidated.sql` | Upsert bucket `chat-audio`; drop 3 old read policies; create `Users can upload chat audio`, `Match participants can read chat audio`, `Users can delete own chat audio` | Yes |
| 69 | `20260403000001_fix_cron_jobs_use_vault.sql` | Unschedule + re-schedule 7 notification cron jobs using vault | Yes |
| 70 | `20260403000002_fix_remaining_cron_jobs_use_vault.sql` | Unschedule + re-schedule 4 proposal/karma cron jobs using vault | Yes |
| 71 | `20260412000002_check_email_exists.sql` | CREATE FUNCTION `check_email_exists(text)` (SECURITY DEFINER); GRANT to anon | Yes |
| 72 | `20260415000001_email_verification_codes.sql` | CREATE TABLE `email_verification_codes`; 2 indexes; enable RLS (no policies) | Yes |
| 73 | `20260415000002_get_user_by_email_rpc.sql` | CREATE FUNCTION `get_user_by_email(text)` (SECURITY DEFINER); REVOKE from PUBLIC/anon/authenticated | Yes |
| 74 | `20260415000003_email_unsubscribes.sql` | CREATE TABLE `email_unsubscribes`; index; enable RLS (no policies) | Yes |
| 75 | `20260417000001_add_missing_production_columns.sql` | ADD COLUMN `user_profiles.profile_completed`, `user_profiles.email`; ADD COLUMN `user_preferences.interested_in_genders`, `preferred_politics`, `partner_*` (5 cols); ADD COLUMN `proposals.vote_context`; 2 COMMENTs | **NO — not in MIGRATION_LOG** |
| 76 | `20260417000002_revoke_check_email_exists_anon.sql` | REVOKE EXECUTE on `check_email_exists` FROM anon | **NO — not in MIGRATION_LOG** |

---

## 2. Final Synthetic State — Tables

Tables that exist after all 76 migrations have run (tables dropped along the way are excluded).

### Dropped / never-existed tables
- `friend_grid_completions` — created in #20, dropped in #24 (and again in #28).
- `daily_surveys` — created in #5, dropped in #24.
- `endorsements` — created in #10, dropped in #24.
- `daily_pairings` — DROPped in #24 but never created in this chain. The DROP is a no-op because `IF EXISTS`.

### Existing tables

#### `blocked_users` (source #4)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | NO (FK auth.users, CASCADE) |
| blocked_user_id | UUID | — | NO (FK auth.users, CASCADE) |
| created_at | TIMESTAMPTZ | NOW() | — |

Constraints: `unique_block UNIQUE(user_id, blocked_user_id)`, `no_self_block CHECK(user_id<>blocked_user_id)`.
Indexes: `idx_blocked_users_user_id`, `idx_blocked_users_blocked`.
RLS: ENABLED (final state, re-enabled in #43). Policies: "Users can view blocks involving them" (SELECT, `user_id=auth.uid() OR blocked_user_id=auth.uid()`), "Users can block other users" (INSERT, `user_id=auth.uid()`), "Users can unblock other users" (DELETE, `user_id=auth.uid()`).

#### `crushes` (source #64)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | NO (FK auth.users, CASCADE) |
| crush_id | UUID | — | NO (FK auth.users, CASCADE) |
| created_at | TIMESTAMPTZ | now() | NO |

Constraints: `crushes_no_self`, `crushes_unique UNIQUE(user_id, crush_id)`.
Indexes: `idx_crushes_user_id`, `idx_crushes_crush_id`, `idx_crushes_pair(crush_id, user_id)`.
RLS: ENABLED. Policies: `crushes_select_own` (SELECT, `user_id=auth.uid()`), `crushes_insert_own` (INSERT, `user_id=auth.uid()`), `crushes_delete_own` (DELETE, `user_id=auth.uid()`).

#### `deep_question_answers` (source #6)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | NO (FK auth.users, CASCADE) |
| answers | JSONB | `'{}'` | — |
| displayed_question_ids | INTEGER[] | `'{}'` | — |
| created_at | TIMESTAMPTZ | NOW() | — |
| updated_at | TIMESTAMPTZ | NOW() | — |

Constraints: `unique_user_deep_questions UNIQUE(user_id)`.
Indexes: `idx_deep_question_answers_user_id`.
Triggers: `update_deep_question_answers_updated_at`.
RLS: ENABLED (re-enabled in #43). Original SELECT/INSERT/UPDATE/DELETE policies (all `user_id = auth.uid()` or `auth.role() = 'authenticated'` for SELECT).

#### `email_unsubscribes` (source #74)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| email | TEXT | — | NO, UNIQUE |
| created_at | TIMESTAMPTZ | NOW() | NO |

Indexes: `idx_unsub_email`.
RLS: ENABLED, **no policies** (service_role only).

#### `email_verification_codes` (source #72)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | YES |
| email | TEXT | — | NO |
| code | TEXT | `''::text` | — |
| attempts | INTEGER | 0 | — |
| max_attempts | INTEGER | 5 | — |
| expires_at | TIMESTAMPTZ | — | NO |
| verified_at | TIMESTAMPTZ | — | YES |
| created_at | TIMESTAMPTZ | NOW() | — |
| code_hash | TEXT | — | YES |
| used | BOOLEAN | FALSE | NO |

Indexes: `idx_evc_email_expires`, `idx_evc_email_created`.
RLS: ENABLED, **no policies** (service_role only).

#### `friend_badges` (source #60)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| giver_id | UUID | — | NO (FK auth.users, CASCADE + FK user_profiles(user_id)) |
| receiver_id | UUID | — | NO (FK auth.users, CASCADE + FK user_profiles(user_id)) |
| icon_name | TEXT | — | NO |
| message | TEXT | — | NO, CHECK (length ≤ 50) (tightened in #61) |
| is_featured | BOOLEAN | false | NO |
| is_hidden | BOOLEAN | false | NO |
| created_at | TIMESTAMPTZ | now() | NO |
| updated_at | TIMESTAMPTZ | now() | NO |

Constraints: `unique_giver_receiver UNIQUE(giver_id, receiver_id)`, `no_self_badge`.
Indexes: `idx_friend_badges_receiver`, `idx_friend_badges_giver`, `idx_friend_badges_featured (partial)`.
Triggers: `trigger_friend_badges_updated_at`, `trigger_max_featured_badges`.
RLS: ENABLED. Policies: "Users can view own badges" (SELECT), "Users can award badges to friends" (INSERT), "Giver can update badge content" (UPDATE), "Giver can delete badge" (DELETE), "Anyone can view featured badges" (SELECT, added #61).

#### `friend_codes` (source #1)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | NO (FK auth.users, CASCADE) |
| code | TEXT | — | NO, UNIQUE |
| created_at | TIMESTAMPTZ | NOW() | — |
| updated_at | TIMESTAMPTZ | NOW() | — |

Constraints: `unique_user_friend_code UNIQUE(user_id)`.
Indexes: `idx_friend_codes_code`.
RLS: ENABLED (re-enabled in #43). Policies: "Users can view their own friend code", "Users can view friend codes by code" (TRUE).

#### `friend_messages` (source #25)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| friendship_id | UUID | — | NO (FK friends, CASCADE) |
| sender_id | UUID | — | NO (FK auth.users, CASCADE) |
| receiver_id | UUID | — | NO (FK auth.users, CASCADE) |
| type | TEXT | 'text' | NO, CHECK in ('text','audio','image') |
| content | TEXT | — | YES |
| duration | INTEGER | — | YES |
| sent_at | TIMESTAMPTZ | NOW() | NO |
| read_at | TIMESTAMPTZ | — | YES |
| created_at | TIMESTAMPTZ | NOW() | NO |

Indexes: `idx_friend_messages_friendship_id`, `idx_friend_messages_sender_id`, `idx_friend_messages_receiver_id`, `idx_friend_messages_sent_at (friendship_id, sent_at)`.
RLS: ENABLED. Policies: "Users can view their friend messages" (SELECT), "Users can send friend messages" (INSERT w/ friendship check), "Users can mark friend messages as read" (UPDATE).
Realtime: YES.

#### `friend_recommendations` (source #29)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| recommender_id | UUID | — | NO (FK auth.users, CASCADE) |
| recommended_person_id | UUID | — | NO (FK auth.users, CASCADE) |
| recommended_to_friend_id | UUID | — | NO (FK auth.users, CASCADE) |
| source_proposal_id | UUID | — | YES (FK proposals, SET NULL) |
| created_at | TIMESTAMPTZ | now() | NO |

Constraints: `friend_recommendations_recommender_person_friend_key UNIQUE(recommender_id, recommended_person_id, recommended_to_friend_id)` (added in #33 after 2-col dropped).
Indexes: `idx_friend_recommendations_pair`.
RLS: ENABLED. Policies: "Users can view their own recommendations" (SELECT, `recommender_id=auth.uid()`) — added in #43.

#### `friend_suggestions` (source #50)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| suggested_by | UUID | — | NO (FK auth.users) |
| user_a_id | UUID | — | NO (FK auth.users) |
| user_b_id | UUID | — | NO (FK auth.users) |
| status | TEXT | 'queued' | NO, CHECK in ('queued','stashed','converted','expired','discarded') |
| stashed_at | TIMESTAMPTZ | — | YES |
| expires_at | TIMESTAMPTZ | — | NO |
| converted_proposal_id | UUID | — | YES (FK proposals, no cascade) |
| created_at | TIMESTAMPTZ | now() | NO |
| updated_at | TIMESTAMPTZ | now() | NO |

Constraints: CHECK `user_a_id < user_b_id`.
Indexes: `idx_friend_suggestions_user_a_active` (partial unique), `idx_friend_suggestions_user_b_active` (partial unique), `idx_friend_suggestions_status` (partial).
RLS: ENABLED. Policies: `users_can_insert_suggestions`, `users_can_read_own_suggestions`.

#### `friends` (source #1)
| Column | Type | Default | Nullable | Added in |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #1 |
| user_id | UUID | — | NO (FK auth.users, CASCADE) | #1 |
| friend_id | UUID | — | NO (FK auth.users, CASCADE) | #1 |
| added_at | TIMESTAMPTZ | NOW() | — | #1 |
| streak_days | INT | 0 | — | #20 |
| last_mutual_date | DATE | — | YES | #20 |
| streak_frozen | BOOLEAN | FALSE | — | #26 |
| status | TEXT | 'accepted' | NO | #59 |
| requested_by | UUID | — | YES (FK auth.users) | #59 |

Constraints: `unique_friendship UNIQUE(user_id, friend_id)` (#1) + `friends_user_id_friend_id_key UNIQUE(user_id, friend_id)` (#59, duplicate of #1's — see correctness issues); `no_self_friendship CHECK(user_id<>friend_id)`.
Indexes: `idx_friends_user_id`, `idx_friends_friend_id`, `idx_friends_status`, `idx_friends_pending_recipient` (partial).
RLS: ENABLED (re-enabled #42 after being disabled in #20). Policies: "Users can view their friendships", "Users can delete their friendships", "Users can see pending friend requests targeting them".

#### `ghost_profiles` (source #63)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| created_by | UUID | — | NO (FK auth.users, CASCADE) |
| name | TEXT | — | NO |
| age | INTEGER | — | NO |
| photos | JSONB | `'[]'` | — |
| bio | TEXT | — | YES |
| preferences | JSONB | `'{}'` | — |
| invite_token | TEXT | — | NO, UNIQUE |
| claimed_by | UUID | — | YES (FK auth.users, SET NULL) |
| claimed_at | TIMESTAMPTZ | — | YES |
| created_at | TIMESTAMPTZ | NOW() | — |
| updated_at | TIMESTAMPTZ | NOW() | — |

Triggers: `update_ghost_profiles_updated_at`.
RLS: ENABLED. Policies: "Users can create ghost profiles", "Matchmakers can read their own ghost profiles", "Friends can read their own ghost profile by token" (USING TRUE — effectively public).

#### `introductions` (source #63)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| matchmaker_id | UUID | — | NO (FK auth.users, CASCADE) |
| person_a_id | UUID | — | NO (FK auth.users, CASCADE) |
| person_b_id | UUID | — | NO (FK auth.users, CASCADE) |
| note | TEXT | — | YES |
| status | TEXT | 'suggested' | NO, CHECK |
| person_a_response | TEXT | — | YES, CHECK |
| person_b_response | TEXT | — | YES, CHECK |
| created_at | TIMESTAMPTZ | NOW() | — |
| resolved_at | TIMESTAMPTZ | — | YES |

Constraints: `different_persons CHECK(person_a_id != person_b_id)`.
RLS: ENABLED. Policies: "Matchmakers can read/create their introductions" (ALL), "Users can read introductions they are part of" (SELECT), "Users can respond to their introductions" (UPDATE).

#### `karma_rank_snapshots` (source #45)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | uuid | gen_random_uuid() | NO |
| user_id | uuid | — | NO (FK auth.users, CASCADE) |
| snapshot_date | date | — | NO |
| rank | integer | — | NO |
| created_at | timestamptz | now() | NO |

Constraints: UNIQUE(user_id, snapshot_date).
Indexes: `idx_karma_rank_snap_date_user`.
RLS: ENABLED. Policy: "Users can view rank snapshots" (SELECT, USING true, authenticated).

#### `karma_scores` (source #7)
| Column | Type | Default | Nullable | Added in |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #7 |
| user_id | UUID | — | NO (FK auth.users, CASCADE) | #7 |
| total_assists | INTEGER | 0 | — | #7 |
| total_proposals | INTEGER | 0 | — | #7 |
| total_votes | INTEGER | 0 | — | #7 |
| accurate_votes | INTEGER | 0 | — | #7 |
| badge_tier | TEXT | 'new' | — | #7 |
| proposal_success_rate | NUMERIC(5,2) | 0 | — | #7 |
| voting_accuracy_rate | NUMERIC(5,2) | 0 | — | #7 |
| slow_mode_active | BOOLEAN | FALSE | — | #7 |
| updated_at | TIMESTAMPTZ | NOW() | — | #7 |
| karma_points | INTEGER | 0 | — | #26 |
| total_inaccurate_votes | INTEGER | 0 | — | #26 |

Constraints: `unique_user_karma UNIQUE(user_id)`; CHECK on badge_tier.
Indexes: `idx_karma_scores_user_id`, `idx_karma_scores_tier`.
Triggers: `update_karma_scores_updated_at`, `trg_compute_karma_tier`.
RLS: ENABLED (re-enabled in #42). Policy: "Authenticated users can read karma scores" (SELECT only; INSERT/UPDATE policies DROPPED in #42 — writes only via SECURITY DEFINER fns or service role).

#### `karma_weekly_snapshots` (source #58)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | uuid | gen_random_uuid() | NO |
| user_id | uuid | — | NO (FK auth.users, CASCADE) |
| week_start | timestamptz | — | NO |
| karma_at_start | integer | 0 | NO |
| created_at | timestamptz | now() | NO |

Constraints: UNIQUE(user_id, week_start).
Indexes: `idx_karma_weekly_user_week`.
RLS: ENABLED. Policies: "Users can view their own snapshots" (SELECT), "Users can view current week snapshots" (SELECT, `week_start = get_current_week_start()`).

#### `match_exits` (source #8)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| match_id | UUID | — | NO (FK matches, CASCADE) |
| exiting_user_id | UUID | — | NO (FK auth.users, CASCADE) |
| exit_reason | TEXT | — | YES |
| exit_details | TEXT | — | YES |
| messages_exchanged | INTEGER | — | YES |
| days_since_match | INTEGER | — | YES |
| created_at | TIMESTAMPTZ | NOW() | — |
| updated_at | TIMESTAMPTZ | NOW() | — |

Indexes: `idx_match_exits_match_id`, `idx_match_exits_user`.
Triggers: `update_match_exits_updated_at`.
RLS: ENABLED (re-enabled in #43). Policies: "Users can view match exits for their matches" (subquery), "Users can create match exits" (INSERT, `exiting_user_id=auth.uid()`).

#### `matches` (source #8)
| Column | Type | Default | Nullable | Added in |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #8 |
| user_id_1 | UUID | — | NO (FK auth.users, CASCADE, named `matches_user_id_1_fkey`) | #8 |
| user_id_2 | UUID | — | NO (FK auth.users, CASCADE, named `matches_user_id_2_fkey`) | #8 |
| status | TEXT | 'pending' | NO, CHECK | #8 |
| community_score | NUMERIC(5,2) | — | YES | #8 |
| algorithm_score | NUMERIC(5,2) | — | YES | #8 |
| user_1_decision | TEXT | 'pending' | — | #8 |
| user_2_decision | TEXT | 'pending' | — | #8 |
| proposed_at | TIMESTAMPTZ | — | YES | #8 |
| matched_at | TIMESTAMPTZ | — | YES | #8 |
| expires_at | TIMESTAMPTZ | — | YES | #8 |
| created_at | TIMESTAMPTZ | NOW() | — | #8 |
| updated_at | TIMESTAMPTZ | NOW() | — | #8 |
| proposal_id | UUID | — | YES (FK proposals, SET NULL) | #38 |

Constraints: `different_match_users`.
Indexes: `idx_matches_user_id_1`, `idx_matches_user_id_2`, `idx_matches_status`, `idx_matches_created_at`, `unique_match_per_proposal`.
Triggers: `update_matches_updated_at`, `trg_notify_new_match` (#54).
RLS: ENABLED (re-enabled #41). Policies: "Users can view their own matches" (SELECT), "Users can update their own matches" (UPDATE), "Users can delete their own matches" (DELETE). INSERT policy DROPPED — service role only.
Realtime: YES.

#### `messages` (source #2)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| match_id | UUID | — | NO (FK matches, CASCADE, added in #8) |
| sender_id | UUID | — | NO (FK auth.users, CASCADE) |
| receiver_id | UUID | — | NO (FK auth.users, CASCADE) |
| type | TEXT | 'text' | NO, CHECK |
| content | TEXT | — | NO |
| duration | INTEGER | — | YES |
| sent_at | TIMESTAMPTZ | NOW() | — |
| read_at | TIMESTAMPTZ | — | YES |
| created_at | TIMESTAMPTZ | NOW() | — |

Constraints: `different_users`.
Indexes: `idx_messages_match_id`, `idx_messages_sender_id`, `idx_messages_receiver_id`, `idx_messages_sent_at`, `idx_messages_match_sent`.
Triggers: `trg_notify_new_message`.
RLS: ENABLED. Policies: "Users can view their own messages", "Users can send messages", "Users can mark received messages as read".
Realtime: YES.

#### `notification_log` (source #51)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | NO (FK auth.users, CASCADE) |
| notification_type | TEXT | — | NO |
| category | TEXT | — | NO |
| copy_variant | INT | 0 | — |
| sent_at | TIMESTAMPTZ | now() | — |
| opened | BOOLEAN | FALSE | — |
| opened_at | TIMESTAMPTZ | — | YES |
| metadata | JSONB | `'{}'::jsonb` | — |

Indexes: `idx_notif_log_user_date_cat`, `idx_notif_log_user_type_sent`, `idx_notif_log_sent_at`.
RLS: ENABLED, no user-facing policies.

#### `pool_vote_assignments` (source #21)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| proposal_id | UUID | — | NO (FK proposals, CASCADE) |
| voter_id | UUID | — | NO (FK auth.users, CASCADE) |
| assignment_date | DATE | CURRENT_DATE | — |
| has_voted | BOOLEAN | FALSE | — |
| created_at | TIMESTAMPTZ | NOW() | — |

Constraints: `unique_pool_assignment UNIQUE(proposal_id, voter_id)`.
Indexes: `idx_pool_assignments_voter_date`, `idx_pool_assignments_proposal`.
RLS: ENABLED. Policies: "Users can view own pool assignments" (SELECT), "Users can update own pool assignments" (UPDATE). INSERT policy DROPPED in #42.

#### `proposal_votes` (source #11)
| Column | Type | Default | Nullable | Added in |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #11 |
| proposal_id | UUID | — | NO (FK proposals, CASCADE) | #11 |
| voter_user_id | UUID | — | NO (FK auth.users, CASCADE) | #11 |
| vote_type | TEXT | — | NO, CHECK in ('YES','NO','UNSURE','RECOMMEND') | #11 |
| is_friend_vote | BOOLEAN | FALSE | — | #11 |
| friend_of | UUID | — | YES (FK auth.users, no cascade) | #11 |
| recommend_to_id | UUID | — | YES (FK auth.users, no cascade) | #11 |
| created_at | TIMESTAMPTZ | NOW() | — | #11 |
| vote_weight | NUMERIC | 1.0 | — | #34 |

Constraints: `unique_vote_per_proposal UNIQUE(proposal_id, voter_user_id)`.
Indexes: `idx_proposal_votes_proposal`, `idx_proposal_votes_voter`.
RLS: ENABLED (re-enabled #42). Policies: "Authenticated users can read votes", "Users can cast their own votes".

#### `proposals` (source #9)
| Column | Type | Default | Nullable | Added in |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #9 |
| user_a_id | UUID | — | NO (FK auth.users, CASCADE) | #9 |
| user_b_id | UUID | — | NO (FK auth.users, CASCADE) | #9 |
| status | TEXT | 'pending' | NO, CHECK | #9 |
| compatibility_score | NUMERIC(5,2) | — | YES | #9 |
| category_scores | JSONB | `'{}'` | — | #9 |
| pool_yes_votes | INTEGER | 0 | — | #9 |
| pool_no_votes | INTEGER | 0 | — | #9 |
| friend_yes_votes | INTEGER | 0 | — | #9 |
| friend_no_votes | INTEGER | 0 | — | #9 |
| pool_eligible | BOOLEAN | TRUE | — | #9 |
| user_a_decision | TEXT | 'pending' | — | #9 |
| user_b_decision | TEXT | 'pending' | — | #9 |
| user_a_decided_at | TIMESTAMPTZ | — | YES | #9 |
| user_b_decided_at | TIMESTAMPTZ | — | YES | #9 |
| voting_started_at | TIMESTAMPTZ | NOW() | — | #9 |
| voting_expires_at | TIMESTAMPTZ | — | YES | #9 |
| community_decided_at | TIMESTAMPTZ | — | YES | #9 |
| passed_to_users_at | TIMESTAMPTZ | — | YES | #9 |
| decision_deadline_at | TIMESTAMPTZ | — | YES | #9 |
| confirmed_at | TIMESTAMPTZ | — | YES | #9 |
| rejected_at | TIMESTAMPTZ | — | YES | #9 |
| declined_at | TIMESTAMPTZ | — | YES | #9 |
| expired_at | TIMESTAMPTZ | — | YES | #9 |
| created_at | TIMESTAMPTZ | NOW() | — | #9 |
| updated_at | TIMESTAMPTZ | NOW() | — | #9 |
| weighted_yes | NUMERIC | 0 | — | #26 |
| weighted_no | NUMERIC | 0 | — | #26 |
| created_by | UUID | — | YES (FK auth.users) | #49 |
| creation_type | TEXT | 'algorithm' | NO, CHECK | #49 |
| sent_to_users_at | TIMESTAMPTZ | — | YES | #67 |
| vote_context | TEXT | — | YES | #75 |

Constraints: `different_proposal_users`.
Indexes: `idx_proposals_user_a`, `idx_proposals_user_b`, `idx_proposals_status`, `idx_proposals_voting_expires`, `unique_proposal_pair_permanent` (partial), `one_active_proposal_per_user_a` (partial), `one_active_proposal_per_user_b` (partial), `unique_active_proposal_pair` (partial, recreated in #23), `idx_proposals_created_by` (partial).
Triggers: `update_proposals_updated_at`, `trg_notify_proposal_deciding`.
REPLICA IDENTITY: FULL (#39).
RLS: ENABLED (re-enabled #42). Policies: "Authenticated users can read proposals" (SELECT), "Proposal participants can update proposals" (UPDATE). INSERT policy DROPPED — service role only.
Realtime: YES.

#### `rate_limit_attempts` (source #27)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| identifier | TEXT | — | NO |
| action_type | TEXT | — | NO (FK rate_limit_config, CASCADE) |
| attempted_at | TIMESTAMPTZ | now() | NO |
| metadata | JSONB | `'{}'::jsonb` | — |

Indexes: `idx_rate_limit_attempts_identifier_action`.
RLS: ENABLED (no user policies defined — service role only).

#### `rate_limit_config` (source #27)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| action_type | TEXT | — | NO, PK |
| max_attempts | INTEGER | — | NO |
| window_seconds | INTEGER | — | NO |

RLS: ENABLED. Policy: "Public read rate limit config" (SELECT, TRUE).
Seeded rows: otp_send, friend_code_attempt, login_attempt, account_creation, password_reset, photo_upload, message_send, profile_update.

#### `roster` (source #63)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| matchmaker_id | UUID | — | NO (FK auth.users, CASCADE) |
| user_id | UUID | — | YES (FK auth.users, CASCADE) |
| ghost_profile_id | UUID | — | YES (FK ghost_profiles, CASCADE) |
| status | TEXT | 'active' | NO, CHECK |
| created_at | TIMESTAMPTZ | NOW() | — |
| updated_at | TIMESTAMPTZ | NOW() | — |

Constraints: `roster_one_target` (exactly one of user_id/ghost_profile_id), `unique_matchmaker_target UNIQUE(matchmaker_id, user_id, ghost_profile_id)`.
Triggers: `update_roster_updated_at`.
RLS: ENABLED. Policies: "Matchmakers can manage their roster" (ALL), "Users can see who is matchmaking them" (SELECT).

#### `support_conversations` (source #44)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| user_id | UUID | — | NO, PK (FK auth.users, CASCADE) |
| last_message_at | TIMESTAMPTZ | NOW() | — |
| has_unread_admin | BOOLEAN | FALSE | — |
| has_unread_user | BOOLEAN | FALSE | — |
| raffle_tickets | INTEGER | 0 | — |
| created_at | TIMESTAMPTZ | NOW() | — |

Indexes: `idx_support_conversations_last`.
RLS: ENABLED. Policy: "Users own their conversation" (FOR ALL).

#### `support_messages` (source #44)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | NO (FK auth.users, CASCADE) |
| content | TEXT | — | NO, CHECK length ≤ 1000 |
| sender | TEXT | — | NO, CHECK in ('user','admin') |
| is_auto_reply | BOOLEAN | FALSE | — |
| created_at | TIMESTAMPTZ | NOW() | — |

Indexes: `idx_support_messages_user`.
RLS: ENABLED. Policies: "Users read own messages" (SELECT), "Users send messages" (INSERT, user only).
Realtime: YES.

#### `support_reply_context` (source #47)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | INTEGER | 1 | NO, PK, CHECK id=1 |
| current_user_id | UUID | — | YES (FK auth.users, SET NULL) |
| updated_at | TIMESTAMPTZ | NOW() | — |

RLS: DISABLED (intentional — service role only).
Seeded with (1, NULL).

#### `user_photos` (source #12)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| user_id | UUID | — | NO (FK auth.users, CASCADE) |
| storage_path | TEXT | — | NO |
| is_main | BOOLEAN | FALSE | — |
| display_order | INTEGER | 0 | — |
| created_at | TIMESTAMPTZ | NOW() | — |

Indexes: `idx_user_photos_user_id`, `idx_user_photos_main` (partial).
RLS: ENABLED (re-enabled #41). Policies: "Authenticated users can read all photos", "Users can insert their own photos", "Users can update their own photos", "Users can delete their own photos".

#### `user_preferences` (source #13)
| Column | Type | Default | Nullable | Added in / Dropped |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #13 |
| user_id | UUID | — | NO (FK auth.users, CASCADE) | #13 |
| age_min | INTEGER | — | YES | #13 |
| age_max | INTEGER | — | YES | #13 |
| looking_for | TEXT | 'relationship' | — | #13 |
| preferred_height_min_inches | INTEGER | — | YES | #13 |
| preferred_height_max_inches | INTEGER | — | YES | #13 |
| max_distance | INTEGER | — | YES | #13 |
| preferred_ethnicities | TEXT[] | `'{}'` | — | #13 |
| preferred_politics | TEXT[] | `'{}'` | — | #13 (re-added #75) |
| partner_drinking | TEXT[] | `'{}'` | — | #13 (re-added #75) |
| partner_cannabis | TEXT[] | `'{}'` | — | #13 (re-added #75) |
| partner_tobacco | TEXT[] | `'{}'` | — | #13 (re-added #75) |
| partner_other_drugs | TEXT[] | `'{}'` | — | #13 (re-added #75) |
| created_at | TIMESTAMPTZ | NOW() | — | #13 |
| updated_at | TIMESTAMPTZ | NOW() | — | #13 |
| preferred_religions | TEXT[] | `'{}'` | — | #62 |
| interested_in_genders | TEXT[] | `'{}'` | — | #75 |
| `preferred_gender` | — | — | — | DROPPED in #19 |

Constraints: `unique_user_preferences UNIQUE(user_id)`.
Indexes: `idx_user_preferences_user_id`.
Triggers: `update_user_preferences_updated_at`.
RLS: ENABLED (re-enabled #43). Policies: SELECT all (authenticated), INSERT/UPDATE/DELETE `user_id=auth.uid()`.

#### `user_profiles` (source #14)
| Column | Type | Default | Nullable | Added in |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #14 |
| user_id | UUID | — | YES (was NO; nullable after #16; FK dropped #16) | #14 |
| first_name | TEXT | '' | NO | #14 |
| last_name | TEXT | '' | NO | #14 |
| age | INTEGER | — | YES | #14 |
| gender | TEXT[] | `'{}'` | — | #14 |
| pronouns | TEXT | — | YES | #14 |
| pronouns_list | TEXT[] | `'{}'` | — | #14 |
| custom_gender | TEXT | — | YES | #14 |
| interested_in_genders | TEXT[] | `'{}'` | — | #14 |
| custom_interested_in | TEXT | — | YES | #14 |
| height_inches | INTEGER | — | YES | #14 |
| ethnicity | TEXT | — | YES | #14 |
| location | TEXT | — | YES | #14 |
| latitude | DOUBLE PRECISION | — | YES | #14 |
| longitude | DOUBLE PRECISION | — | YES | #14 |
| hometown | TEXT | — | YES | #14 |
| current_job | TEXT | — | YES | #14 |
| company_position | TEXT | — | YES | #14 |
| education_level | TEXT | — | YES | #14 |
| custom_education_level | TEXT | — | YES | #14 |
| school | TEXT | — | YES | #14 |
| religion | TEXT | — | YES | #14 |
| political_leaning | TEXT | — | YES | #14 |
| custom_political_leaning | TEXT | — | YES | #14 |
| has_children | TEXT | — | YES | #14 |
| family_plans | TEXT | — | YES | #14 |
| drinking_frequency | TEXT | — | YES | #14 |
| cannabis_frequency | TEXT | — | YES | #14 |
| tobacco_frequency | TEXT | — | YES | #14 |
| other_drugs_frequency | TEXT | — | YES | #14 |
| interests | TEXT[] | `'{}'` | — | #14 |
| "values" | TEXT[] | `'{}'` | — | #14 |
| bio | TEXT | '' | — | #14 |
| photos | JSONB | `'[]'` | — | #14 |
| profile_photo_path | TEXT | — | YES | #14 |
| phone_number | TEXT | — | YES | #14 |
| non_negotiables | JSONB | `'[]'` | — | #14 |
| is_verified | BOOLEAN | FALSE | — | #14 |
| is_paused | BOOLEAN | FALSE | — | #14 |
| section_visibility | JSONB | `'{}'` | — | #14 |
| preference_visibility | JSONB | `'{}'` | — | #14 |
| guide_completions | JSONB | `'{}'` | — | #14 |
| created_at | TIMESTAMPTZ | NOW() | — | #14 |
| updated_at | TIMESTAMPTZ | NOW() | — | #14 |
| deleted_at | TIMESTAMPTZ | NULL | YES | #34 |
| deletion_scheduled_for | TIMESTAMPTZ | NULL | YES | #34 |
| matchmaking_only | BOOLEAN | FALSE | — | #40 |
| is_suspended | BOOLEAN | false | NO | #48 |
| suspended_at | TIMESTAMPTZ | — | YES | #48 |
| suspension_reason | TEXT | — | YES | #48 |
| role | TEXT | 'dater' | — | #63 |
| profile_completed | BOOLEAN | false | — | #75 |
| email | TEXT | — | YES | #75 |

Constraints: `unique_user_profile UNIQUE(user_id)`.
Indexes: `idx_user_profiles_user_id`, `idx_user_profiles_location`, `idx_user_profiles_age`, `idx_user_profiles_suspended` (partial).
Triggers: `update_user_profiles_updated_at`.
RLS: ENABLED (re-enabled #41). Policies: authenticated read-all; INSERT/UPDATE/DELETE `user_id = auth.uid()`.

#### `user_reports` (source #35)
| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | UUID | gen_random_uuid() | NO |
| reporter_id | UUID | — | NO (FK auth.users, CASCADE) |
| reported_user_id | UUID | — | NO (FK auth.users, CASCADE) |
| reason | TEXT | 'inappropriate_behavior' | NO |
| details | TEXT | '' | — |
| status | TEXT | 'pending' | NO, CHECK |
| created_at | TIMESTAMPTZ | NOW() | — |
| reviewed_at | TIMESTAMPTZ | — | YES |

Constraints: `no_self_report CHECK(reporter_id != reported_user_id)`.
Indexes: `idx_user_reports_reporter`, `idx_user_reports_reported`, `idx_user_reports_status`.
Triggers: `trg_auto_suspend_on_report`.
RLS: ENABLED. Policies: "Users can create reports" (INSERT), "Users can view their own reports" (SELECT).

#### `user_settings` (source #15)
| Column | Type | Default | Nullable | Added in |
|--------|------|---------|----------|----------|
| id | UUID | gen_random_uuid() | NO | #15 |
| user_id | UUID | — | NO (FK auth.users, CASCADE) | #15 |
| notifications_enabled | BOOLEAN | TRUE | — | #15 |
| email_notifications | BOOLEAN | TRUE | — | #15 |
| push_notifications | BOOLEAN | TRUE | — | #15 |
| created_at | TIMESTAMPTZ | NOW() | — | #15 |
| updated_at | TIMESTAMPTZ | NOW() | — | #15 |
| push_token | TEXT | — | YES | #44 |
| pref_matches_enabled | BOOLEAN | TRUE | — | #52 |
| pref_messages_enabled | BOOLEAN | TRUE | — | #52 |
| pref_nudges_enabled | BOOLEAN | TRUE | — | #52 |
| pref_show_name_if_winner | BOOLEAN | TRUE | — | #52 |
| pref_leaderboard_visible | BOOLEAN | false | NO | #55 |

Constraints: `unique_user_settings UNIQUE(user_id)`.
Indexes: `idx_user_settings_user_id`.
Triggers: `update_user_settings_updated_at`.
RLS: ENABLED (re-enabled #41). Policies: "Users can read their own settings" (SELECT), "Users can create their own settings" (INSERT), "Users can update their own settings" (UPDATE).

---

## 3. Final Synthetic State — Functions

Canonical version = the final CREATE OR REPLACE of each function after the chain runs.

| Function | Arguments | Returns | SECURITY | Source (last write) |
|----------|-----------|---------|----------|---------------------|
| `update_updated_at_column` | () | TRIGGER | INVOKER | #3 |
| `generate_friend_code` | () | TEXT | INVOKER | #1 |
| `handle_new_user_friend_code` | () | TRIGGER | **DEFINER** | #1 |
| `add_friend_by_code` | (friend_code TEXT) | TABLE(success, message, friend_user_id) | **DEFINER** | #32 (regressed — no block check) |
| `mark_messages_as_read` | (p_match_id UUID, p_user_id UUID) | INTEGER | **DEFINER** | #2 |
| `get_unread_count` | (p_match_id UUID, p_user_id UUID) | INTEGER | **DEFINER** | #2 |
| `record_grid_completion` | (p_user_id UUID, p_friend_id UUID) | — | — | DROPPED (#24, #28) |
| `increment_total_proposals` | (p_user_id UUID) | VOID | **DEFINER** | #26 |
| `increment_karma_for_vote` | (p_user_id UUID) | VOID | **DEFINER** (service_role only) | #26 |
| `compute_karma_tier` | () | TRIGGER | INVOKER | #26 |
| `apply_karma_on_outcome` | (p_proposal_id UUID, p_outcome TEXT) | VOID | **DEFINER** | #26 (references `proposals.proposed_by` which is never created — **WILL FAIL AT RUNTIME**) |
| `freeze_inactive_streaks` | () | VOID | **DEFINER** | #28 |
| `kill_dead_streaks` | () | VOID | **DEFINER** | #28 |
| `update_friend_streak` | (p_user_id UUID, p_friend_id UUID) | VOID | **DEFINER** | #28 |
| `mark_friend_messages_as_read` | (p_friendship_id UUID, p_user_id UUID) | VOID | **DEFINER** | #25 |
| `get_friend_unread_count` | (p_friendship_id UUID, p_user_id UUID) | INTEGER | **DEFINER** | #25 |
| `check_rate_limit` | (p_identifier TEXT, p_action_type TEXT) | SETOF rate_limit_result | **DEFINER** | #27 |
| `record_rate_limit_attempt` | (p_identifier TEXT, p_action_type TEXT, p_metadata JSONB) | BOOLEAN | **DEFINER** | #27 |
| `delete_user_account` | (target_user_id UUID) | VOID | **DEFINER** | #36 (references `onboarding_progress` — table never created, **WILL FAIL**) |
| `snapshot_daily_ranks` | () | json | **DEFINER** | #45 |
| `get_leaderboard_data` | (p_current_user_id UUID, p_limit INT) | TABLE(...) w/ rank_change | **DEFINER** (STABLE) | #45 |
| `get_current_week_start` | () | timestamp with time zone | INVOKER (STABLE) | #46 |
| `get_user_stats` | (p_user_id UUID) | json | **DEFINER** (STABLE) | #46 |
| `get_campus_stats` | (p_university TEXT, p_requesting_user_id UUID) | json | **DEFINER** (STABLE) | #46 |
| `auto_suspend_on_reports` | () | TRIGGER | **DEFINER** | #48 |
| `notify_new_match` | () | TRIGGER | **DEFINER** | #57 (uses vault) |
| `notify_new_message` | () | TRIGGER | **DEFINER** | #57 (uses vault) |
| `notify_proposal_deciding` | () | TRIGGER | **DEFINER** | #57 (uses vault) |
| `snapshot_weekly_karma_rpc` | () | json | **DEFINER** | #58 |
| `send_friend_request` | (friend_code TEXT) | TABLE(success, message, friend_user_id, request_id, was_auto_accepted) | **DEFINER** | #59 |
| `accept_friend_request` | (request_id UUID) | TABLE(success, message, friend_user_id) | **DEFINER** | #59 |
| `decline_friend_request` | (request_id UUID) | TABLE(success, message) | **DEFINER** | #59 |
| `cancel_friend_request` | (request_id UUID) | TABLE(success, message) | **DEFINER** | #59 |
| `update_friend_badges_updated_at` | () | TRIGGER | INVOKER | #60 |
| `enforce_max_featured_badges` | () | TRIGGER | INVOKER | #60 |
| `check_mutual_crush` | (p_crush_id UUID) | BOOLEAN | **DEFINER** | #64 |
| `get_crushes_on_me` | () | TABLE(user_id UUID) | **DEFINER** | #64 |
| `increment_proposal_tallies` | (p_proposal_id UUID, p_pool_yes INT, p_pool_no INT, p_friend_yes INT, p_friend_no INT, p_weighted_yes NUMERIC, p_weighted_no NUMERIC) | VOID | **DEFINER** (service_role only) | #65 |
| `check_email_exists` | (p_email TEXT) | BOOLEAN | **DEFINER** (STABLE) | #71 (anon grant REVOKED by #76) |
| `get_user_by_email` | (p_email TEXT) | TABLE(id, email, profile_completed) | **DEFINER** (STABLE) | #73 (service_role only) |

---

## 4. Final Synthetic State — Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_auth_user_created_friend_code` | `auth.users` | AFTER INSERT | `handle_new_user_friend_code` |
| `update_deep_question_answers_updated_at` | `deep_question_answers` | BEFORE UPDATE | `update_updated_at_column` |
| `update_karma_scores_updated_at` | `karma_scores` | BEFORE UPDATE | `update_updated_at_column` |
| `trg_compute_karma_tier` | `karma_scores` | BEFORE INSERT OR UPDATE OF karma_points | `compute_karma_tier` |
| `update_matches_updated_at` | `matches` | BEFORE UPDATE | `update_updated_at_column` |
| `trg_notify_new_match` | `matches` | AFTER INSERT | `notify_new_match` |
| `update_match_exits_updated_at` | `match_exits` | BEFORE UPDATE | `update_updated_at_column` |
| `trg_notify_new_message` | `messages` | AFTER INSERT | `notify_new_message` |
| `update_proposals_updated_at` | `proposals` | BEFORE UPDATE | `update_updated_at_column` |
| `trg_notify_proposal_deciding` | `proposals` | AFTER UPDATE | `notify_proposal_deciding` |
| `update_user_preferences_updated_at` | `user_preferences` | BEFORE UPDATE | `update_updated_at_column` |
| `update_user_profiles_updated_at` | `user_profiles` | BEFORE UPDATE | `update_updated_at_column` |
| `update_user_settings_updated_at` | `user_settings` | BEFORE UPDATE | `update_updated_at_column` |
| `trg_auto_suspend_on_report` | `user_reports` | AFTER INSERT | `auto_suspend_on_reports` |
| `update_ghost_profiles_updated_at` | `ghost_profiles` | BEFORE UPDATE | `update_updated_at_column` |
| `update_roster_updated_at` | `roster` | BEFORE UPDATE | `update_updated_at_column` |
| `trigger_friend_badges_updated_at` | `friend_badges` | BEFORE UPDATE | `update_friend_badges_updated_at` |
| `trigger_max_featured_badges` | `friend_badges` | BEFORE INSERT OR UPDATE | `enforce_max_featured_badges` |

Note: Cron jobs (`proposal-lifecycle`, `generate-proposals`, `proposal-lifecycle-check`, `snapshot-weekly-karma`, `notify-streak-at-risk`, `notify-vote-reminder`, `notify-morning-leaderboard`, `notify-dormant-users`, `notify-match-expiring`, `notify-ice-breaker`) are scheduled in `cron.job` but are not table triggers. They are enumerated here for completeness:

| Cron job | Schedule | Source (final) |
|----------|----------|----------------|
| proposal-lifecycle | `55 23 * * *` | #70 (vault) |
| generate-proposals | `0 0 * * *` | #70 (vault) |
| proposal-lifecycle-check | `0 */4 * * *` | #70 (vault) |
| snapshot-weekly-karma | `0 0 * * 1` | #70 (vault) |
| notify-streak-at-risk | `0 23 * * *` | #69 (vault) |
| notify-anticipation | — | unscheduled in #56; re-scheduled #69 at `55 23 * * *` then active. **Note: #56 unschedules and #69 re-schedules — final state HAS `notify-anticipation`.** |
| notify-vote-reminder | `0 1 * * *` | #69 (vault) |
| notify-morning-leaderboard | `30 13 * * *` | #69 (vault) |
| notify-dormant-users | `0 17 * * *` | #69 (vault) |
| notify-match-expiring | `30 */4 * * *` | #69 (vault) |
| notify-ice-breaker | `0 */4 * * *` | #69 (vault) |

---

## 5. Ordering / Correctness Issues

### Will almost certainly fail on a fresh `supabase db reset`

1. **Vault-based cron jobs (#57, #69, #70)** — They query `vault.decrypted_secrets` for secrets `supabase_url` and `service_role_key`. Local Supabase has the `vault` extension but **no seeded secrets**. The `cron.schedule()` calls themselves succeed (they store SQL strings), but when the job fires it will get NULL URL/key. The `CREATE OR REPLACE FUNCTION` calls in #57 don't fail — they compile OK. **The DDL won't fail at apply time, but cron firings will.**

2. **Notification triggers (#54)** — Issue the statement `ALTER DATABASE %I SET app.settings.supabase_url = 'https://ikyiwnydgedwbmcdzgbe.supabase.co'` wrapped in `BEGIN...EXCEPTION WHEN OTHERS`. So this survives even without privileges.

3. **`apply_karma_on_outcome` (#26)** — plpgsql body references `proposals.proposed_by`. That column is **never added** anywhere in the chain (the chain uses `created_by`, added in #49). Function creation does NOT fail (plpgsql doesn't validate column refs at definition time), but **any call will ERROR**.

4. **`delete_user_account` (#36)** — References `DELETE FROM onboarding_progress WHERE user_id = target_user_id` without an exception wrapper. The `onboarding_progress` table is **never created** in this migration chain. Function creation succeeds; **call will ERROR** unless prod had this table created out-of-band (likely).

5. **`record_grid_completion` (#20)** — DROPped by #24 and #28 (defensive), and its table `friend_grid_completions` is also dropped. Fine.

### Logical regression (not a runtime failure, but wrong behavior)

6. **`add_friend_by_code` block-guard regression** — #30 added a blocked-users check, but #32 REPLACEd the function without that check. After `db reset`, **the RPC does not refuse friend requests between blocked pairs**. Production may or may not have this bug; to be compared.

### Duplicate / unnecessary operations

7. **`friends` unique constraint** — #1 defines `unique_friendship UNIQUE(user_id, friend_id)` in the CREATE TABLE. #59 then adds `friends_user_id_friend_id_key UNIQUE(user_id, friend_id)` via `DO $$ ... CONSTRAINT NOT EXISTS` block. These are logically the same; the second is guarded by pg_constraint lookup on the constraint name only, so it will succeed and the table ends up with **two identical unique constraints with different names**.

8. **`unique_active_proposal_pair` index** — #22 DROPs it then creates a different permanent index. #23 recreates the original `unique_active_proposal_pair` partial unique index, leaving **both `unique_active_proposal_pair` and `unique_proposal_pair_permanent`** in the final state, which is redundant but not an error. (On prod the state may differ — these were manual patches.)

9. **`notify-anticipation` cron** — scheduled in #53, unscheduled in #56, **re-scheduled in #69**. Likely unintended: the swap in #56 was supposed to remove it permanently in favor of `notify-ice-breaker`, but #69 includes it in the vault migration. Final state: BOTH are scheduled.

10. **`add_candidate_match` (#17)** — No-op in the local chain because `proposal_status` is a TEXT check constraint, not an enum type. Safe but dead.

11. **`daily_pairings` DROP (#24)** — The table was never created in this chain. DROP IF EXISTS makes it a no-op.

### Extension / environment dependencies

12. **`pg_cron`, `pg_net`** — required by #18, #24, #53, #56, #69, #70. Both are installed by default on Supabase-hosted Postgres; local `supabase db reset` will enable them via `CREATE EXTENSION IF NOT EXISTS`.

13. **`vault` extension / seeded secrets** — required to run cron jobs (#57, #69, #70) and notification triggers. Local `supabase start` enables the extension but does not seed `supabase_url` or `service_role_key`. Firings will fail silently.

14. **Storage buckets (`profile-photos`, `chat-audio`)** — #12 creates policies referencing the `profile-photos` bucket but does **not** create the bucket (only a comment about creating it manually). #31 + #68 create the `chat-audio` bucket. `#75` restates that `profile-photos` must be created manually.

15. **Realtime publication (`supabase_realtime`)** — #2, #8, #9, #25, #44 each `ALTER PUBLICATION supabase_realtime ADD TABLE`. The publication is created by Supabase's base image; local Supabase has it. DDL is idempotent via `DO $$ ... EXCEPTION WHEN duplicate_object`. Safe.

### Dangling references to dropped tables

16. **endorsements** — dropped in #24 with CASCADE. Any FKs referencing it would cascade-drop. The policy in #10 goes with it.

17. **daily_surveys** — dropped in #24. Safe.

### References to columns that don't exist yet at the time (plpgsql-deferred)

18. **`apply_karma_on_outcome` references `proposed_by`** — never created. Already flagged.
19. **`delete_user_account` references `onboarding_progress`, `friend_streaks`, `karma_weekly_snapshots`, `karma_rank_snapshots`, `friend_badges`, `email_verification_codes`** — most are wrapped in `BEGIN...EXCEPTION WHEN undefined_table`, but `onboarding_progress` is NOT. Same call failure described above.

---

## 6. Gaps Flagged for Comparison With Prod

Things to specifically check the prod diff for, based on what this synthetic state expects:

### Schema elements this chain produces that prod might be missing
- `user_profiles.profile_completed` (added in unlogged #75)
- `user_profiles.email` (added in unlogged #75)
- `user_preferences.interested_in_genders` (added in unlogged #75) — note: this column also exists on `user_profiles` from #14; the `#75` addition to `user_preferences` is a new location
- `proposals.vote_context` (added in unlogged #75)
- `user_preferences.preferred_politics`, `partner_drinking`, `partner_cannabis`, `partner_tobacco`, `partner_other_drugs` — these were in the original #13 CREATE TABLE. #75 re-adds them with `ADD COLUMN IF NOT EXISTS`. If prod had a different state they may be missing or renamed.
- Anonymous REVOKE on `check_email_exists` from anon (#76) — silent DDL that won't show in column diffs but changes runtime auth.

### Schema elements prod may have that this chain does not produce
- `onboarding_progress` table — referenced by `delete_user_account` but never created here.
- `proposals.proposed_by` column — referenced by `apply_karma_on_outcome` but never created here.
- `friend_streaks` table — referenced by `delete_user_account` but never created here.
- Any column or RPC created by ad-hoc `exec_sql` on production that never got a corresponding migration file.

### State differences that are expected-but-worth-confirming
- `email_verification_codes.code_hash`, `.used`, and `.code DEFAULT ''` — the MIGRATION_LOG note says prod previously had a different schema that was ALTERed in place. The local CREATE TABLE includes all three fields from scratch. Column presence should match, but defaults / NULLability may not.
- Cron vault secrets — prod has them seeded, local does not.
- Seeded `rate_limit_config` rows — these are data, not schema. Both should have them after the migration runs.
- `support_reply_context` seeded row — same.

### Known "not a migration" differences
- Supabase dashboard-managed objects (auth settings, SMTP config, email templates, API gateway rules, storage bucket rules beyond RLS) — none of these are in migration files.
- pg_cron job rows (prod and local diverge depending on when each was last reset).

### Migrations tracked in log but flagged in prior notes as not-really-in-prod
- `20260415000001_email_verification_codes.sql` (#72) — MIGRATION_LOG says "Production `email_verification_codes` table predated our migration (different schema). Columns `code_hash`, `used` were added via ALTER; `code` column made nullable." So local CREATE creates clean schema; prod has a migrated-in-place table. **Columns should match but nullability/defaults on `code` and possibly other fields will differ.**

---

## Summary Counts

- Tables in final synthetic state: **34** (blocked_users, crushes, deep_question_answers, email_unsubscribes, email_verification_codes, friend_badges, friend_codes, friend_messages, friend_recommendations, friend_suggestions, friends, ghost_profiles, introductions, karma_rank_snapshots, karma_scores, karma_weekly_snapshots, match_exits, matches, messages, notification_log, pool_vote_assignments, proposal_votes, proposals, rate_limit_attempts, rate_limit_config, roster, support_conversations, support_messages, support_reply_context, user_photos, user_preferences, user_profiles, user_reports, user_settings)
- Functions in final synthetic state: **38** (not counting the dropped `record_grid_completion`)
- Triggers in final synthetic state: **18** table triggers + **1** trigger on `auth.users`
- Cron jobs in final synthetic state: **11**
- Policies in final synthetic state: ~60 across tables + 4 on storage.objects.
- Indexes in final synthetic state: ~65 (including partial unique indexes).
