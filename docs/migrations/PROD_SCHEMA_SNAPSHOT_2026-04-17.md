# PROD_SCHEMA_SNAPSHOT_2026-04-17

**Source:** `snapshots/prod-schema-2026-04-17.json` (production public schema dump)
**Dump date:** 2026-04-17
**Environment:** production

This is the authoritative forensic snapshot of what is actually in the LIVE production Supabase `public` schema as of 2026-04-17. Use it as ground truth when comparing to local migrations.

## 1. Summary

### Totals

| Object | Count |
|---|---|
| Tables | 38 |
| Columns | 409 |
| Indexes | 145 |
| RLS policies | 85 |
| Functions / RPCs | 136 |
| Triggers | 21 |

### RLS enablement

**All 38 tables have RLS ENABLED.** No tables have RLS disabled.

<details><summary>RLS-enabled tables (all 38)</summary>

- `allowed_email_domains`
- `blocked_users`
- `crushes`
- `deep_question_answers`
- `email_unsubscribes`
- `email_verification_codes`
- `friend_badges`
- `friend_codes`
- `friend_messages`
- `friend_recommendations`
- `friend_suggestions`
- `friends`
- `ghost_profiles`
- `introductions`
- `karma_rank_snapshots`
- `karma_scores`
- `karma_weekly_snapshots`
- `match_exits`
- `matches`
- `messages`
- `notification_log`
- `onboarding_progress`
- `pool_vote_assignments`
- `profiles`
- `proposal_votes`
- `proposals`
- `rate_limit_attempts`
- `rate_limit_config`
- `roster`
- `support_conversations`
- `support_messages`
- `support_reply_context`
- `user_photos`
- `user_preferences`
- `user_profiles`
- `user_reports`
- `user_settings`
- `waitlist_signups`

</details>

### Migration-chain reconciliation

Comparing production tables against the known migration chain documented in `supabase/migrations/`:

**Tables in prod but NOT in the known migration chain (6):**

- `allowed_email_domains`
- `introductions`
- `onboarding_progress`
- `profiles`
- `roster`
- `waitlist_signups`

**Tables in known migration chain but NOT in prod (4):**

- `daily_pairings` (expected dropped / renamed)
- `daily_surveys` (expected dropped / renamed)
- `endorsements` (expected dropped / renamed)
- `friend_proposals` (expected dropped / renamed)

## 2. Per-table breakdown

### `allowed_email_domains`

**Columns: 5  |  Indexes: 2  |  RLS: ENABLED  |  Policies: 1**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `domain` | text | `text` | NO |  |
| 3 | `description` | text | `text` | YES |  |
| 4 | `is_active` | boolean | `bool` | YES | `true` |
| 5 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `allowed_email_domains_domain_key` | UNIQUE | `CREATE UNIQUE INDEX allowed_email_domains_domain_key ON public.allowed_email_domains USING btree (domain)` |
| `allowed_email_domains_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX allowed_email_domains_pkey ON public.allowed_email_domains USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Anyone can read allowed domains` | SELECT | public | `true` |  |

### `blocked_users`

**Columns: 4  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `blocked_user_id` | uuid | `uuid` | NO |  |
| 4 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `blocked_users_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX blocked_users_pkey ON public.blocked_users USING btree (id)` |
| `idx_blocked_users_blocked` | INDEX | `CREATE INDEX idx_blocked_users_blocked ON public.blocked_users USING btree (blocked_user_id)` |
| `idx_blocked_users_user_id` | INDEX | `CREATE INDEX idx_blocked_users_user_id ON public.blocked_users USING btree (user_id)` |
| `unique_block` | UNIQUE | `CREATE UNIQUE INDEX unique_block ON public.blocked_users USING btree (user_id, blocked_user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can block other users` | INSERT | public |  | `(auth.uid() = user_id)` |
| `Users can unblock other users` | DELETE | public | `(auth.uid() = user_id)` |  |
| `Users can view blocks involving them` | SELECT | public | `((auth.uid() = user_id) OR (auth.uid() = blocked_user_id))` |  |

### `crushes`

**Columns: 4  |  Indexes: 5  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `crush_id` | uuid | `uuid` | NO |  |
| 4 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `crushes_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX crushes_pkey ON public.crushes USING btree (id)` |
| `crushes_unique` | UNIQUE | `CREATE UNIQUE INDEX crushes_unique ON public.crushes USING btree (user_id, crush_id)` |
| `idx_crushes_crush_id` | INDEX | `CREATE INDEX idx_crushes_crush_id ON public.crushes USING btree (crush_id)` |
| `idx_crushes_pair` | INDEX | `CREATE INDEX idx_crushes_pair ON public.crushes USING btree (crush_id, user_id)` |
| `idx_crushes_user_id` | INDEX | `CREATE INDEX idx_crushes_user_id ON public.crushes USING btree (user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `crushes_delete_own` | DELETE | public | `(auth.uid() = user_id)` |  |
| `crushes_insert_own` | INSERT | public |  | `(auth.uid() = user_id)` |
| `crushes_select_own` | SELECT | public | `(auth.uid() = user_id)` |  |

### `deep_question_answers`

**Columns: 11  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 4**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `answers` | jsonb | `jsonb` | YES | `'{}'::jsonb` |
| 4 | `displayed_question_ids` | ARRAY | `_int4` | YES | `'{}'::integer[]` |
| 5 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 6 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 7 | `question_id` | integer | `int4` | YES |  |
| 8 | `question_text` | text | `text` | YES |  |
| 9 | `answer_text` | text | `text` | YES |  |
| 10 | `tier` | integer | `int4` | YES |  |
| 11 | `is_displayed` | boolean | `bool` | YES | `true` |

#### Indexes

| name | type | definition |
|---|---|---|
| `deep_question_answers_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX deep_question_answers_pkey ON public.deep_question_answers USING btree (id)` |
| `deep_question_answers_user_id_question_id_key` | UNIQUE | `CREATE UNIQUE INDEX deep_question_answers_user_id_question_id_key ON public.deep_question_answers USING btree (user_id, question_id)` |
| `idx_deep_question_answers_user_id` | INDEX | `CREATE INDEX idx_deep_question_answers_user_id ON public.deep_question_answers USING btree (user_id)` |
| `unique_user_deep_questions` | UNIQUE | `CREATE UNIQUE INDEX unique_user_deep_questions ON public.deep_question_answers USING btree (user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Authenticated users can read all deep question answers` | SELECT | public | `(auth.role() = 'authenticated'::text)` |  |
| `Users can create their own deep question answers` | INSERT | public |  | `(auth.uid() = user_id)` |
| `Users can delete their own deep question answers` | DELETE | public | `(auth.uid() = user_id)` |  |
| `Users can update their own deep question answers` | UPDATE | public | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `email_unsubscribes`

**Columns: 3  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 0**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `email` | text | `text` | NO |  |
| 3 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `email_unsubscribes_email_key` | UNIQUE | `CREATE UNIQUE INDEX email_unsubscribes_email_key ON public.email_unsubscribes USING btree (email)` |
| `email_unsubscribes_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX email_unsubscribes_pkey ON public.email_unsubscribes USING btree (id)` |
| `idx_unsub_email` | INDEX | `CREATE INDEX idx_unsub_email ON public.email_unsubscribes USING btree (email)` |

#### RLS Policies

_No policies. RLS is ON so all access via `anon`/`authenticated` is denied by default._

### `email_verification_codes`

**Columns: 11  |  Indexes: 5  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | YES |  |
| 3 | `email` | text | `text` | NO |  |
| 4 | `code` | text | `text` | YES | `''::text` |
| 5 | `attempts` | integer | `int4` | YES | `0` |
| 6 | `max_attempts` | integer | `int4` | YES | `5` |
| 7 | `expires_at` | timestamp with time zone | `timestamptz` | NO |  |
| 8 | `verified_at` | timestamp with time zone | `timestamptz` | YES |  |
| 9 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 10 | `code_hash` | text | `text` | YES |  |
| 11 | `used` | boolean | `bool` | NO | `false` |

#### Indexes

| name | type | definition |
|---|---|---|
| `email_verification_codes_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX email_verification_codes_pkey ON public.email_verification_codes USING btree (id)` |
| `idx_email_verification_email` | INDEX | `CREATE INDEX idx_email_verification_email ON public.email_verification_codes USING btree (email)` |
| `idx_email_verification_user` | INDEX | `CREATE INDEX idx_email_verification_user ON public.email_verification_codes USING btree (user_id)` |
| `idx_evc_email_created` | INDEX | `CREATE INDEX idx_evc_email_created ON public.email_verification_codes USING btree (email, created_at)` |
| `idx_evc_email_expires` | INDEX | `CREATE INDEX idx_evc_email_expires ON public.email_verification_codes USING btree (email, expires_at DESC)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can request verification` | INSERT | public |  | `(auth.uid() = user_id)` |
| `Users can update own verification codes` | UPDATE | public | `(auth.uid() = user_id)` |  |
| `Users can view own verification codes` | SELECT | public | `(auth.uid() = user_id)` |  |

### `friend_badges`

**Columns: 9  |  Indexes: 5  |  RLS: ENABLED  |  Policies: 5**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `giver_id` | uuid | `uuid` | NO |  |
| 3 | `receiver_id` | uuid | `uuid` | NO |  |
| 4 | `icon_name` | text | `text` | NO |  |
| 5 | `message` | text | `text` | NO |  |
| 6 | `is_featured` | boolean | `bool` | NO | `false` |
| 7 | `is_hidden` | boolean | `bool` | NO | `false` |
| 8 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |
| 9 | `updated_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `friend_badges_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX friend_badges_pkey ON public.friend_badges USING btree (id)` |
| `idx_friend_badges_featured` | INDEX | `CREATE INDEX idx_friend_badges_featured ON public.friend_badges USING btree (receiver_id) WHERE (is_featured = true)` |
| `idx_friend_badges_giver` | INDEX | `CREATE INDEX idx_friend_badges_giver ON public.friend_badges USING btree (giver_id)` |
| `idx_friend_badges_receiver` | INDEX | `CREATE INDEX idx_friend_badges_receiver ON public.friend_badges USING btree (receiver_id)` |
| `unique_giver_receiver` | UNIQUE | `CREATE UNIQUE INDEX unique_giver_receiver ON public.friend_badges USING btree (giver_id, receiver_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Anyone can view featured badges` | SELECT | public | `((is_featured = true) AND (is_hidden = false))` |  |
| `Giver can delete badge` | DELETE | public | `(giver_id = auth.uid())` |  |
| `Giver can update badge content` | UPDATE | public | `((giver_id = auth.uid()) OR (receiver_id = auth.uid()))` |  |
| `Users can award badges to friends` | INSERT | authenticated |  | `((giver_id = auth.uid()) AND (EXISTS ( SELECT 1    FROM friends   WHERE ((friends.user_id = auth.uid()) AND (friends.friend_id = friend_badges.receiver_id) AND (friends.status = 'accepted'::text)))))` |
| `Users can view own badges` | SELECT | public | `((receiver_id = auth.uid()) OR (giver_id = auth.uid()) OR ((is_hidden = false) AND (EXISTS ( SELECT 1    FROM friends   WHERE (((friends.user_id = auth.uid()) AND (friends.friend_id = friend_badges.receiver_id)) OR ((...` |  |

### `friend_codes`

**Columns: 5  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `code` | text | `text` | NO |  |
| 4 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 5 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `friend_codes_code_key` | UNIQUE | `CREATE UNIQUE INDEX friend_codes_code_key ON public.friend_codes USING btree (code)` |
| `friend_codes_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX friend_codes_pkey ON public.friend_codes USING btree (id)` |
| `idx_friend_codes_code` | INDEX | `CREATE INDEX idx_friend_codes_code ON public.friend_codes USING btree (code)` |
| `unique_user_friend_code` | UNIQUE | `CREATE UNIQUE INDEX unique_user_friend_code ON public.friend_codes USING btree (user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can view friend codes by code` | SELECT | public | `true` |  |
| `Users can view their own friend code` | SELECT | public | `(auth.uid() = user_id)` |  |

### `friend_messages`

**Columns: 10  |  Indexes: 5  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `friendship_id` | uuid | `uuid` | NO |  |
| 3 | `sender_id` | uuid | `uuid` | NO |  |
| 4 | `receiver_id` | uuid | `uuid` | NO |  |
| 5 | `type` | text | `text` | NO | `'text'::text` |
| 6 | `content` | text | `text` | YES |  |
| 7 | `duration` | integer | `int4` | YES |  |
| 8 | `sent_at` | timestamp with time zone | `timestamptz` | NO | `now()` |
| 9 | `read_at` | timestamp with time zone | `timestamptz` | YES |  |
| 10 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `friend_messages_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX friend_messages_pkey ON public.friend_messages USING btree (id)` |
| `idx_friend_messages_friendship_id` | INDEX | `CREATE INDEX idx_friend_messages_friendship_id ON public.friend_messages USING btree (friendship_id)` |
| `idx_friend_messages_receiver_id` | INDEX | `CREATE INDEX idx_friend_messages_receiver_id ON public.friend_messages USING btree (receiver_id)` |
| `idx_friend_messages_sender_id` | INDEX | `CREATE INDEX idx_friend_messages_sender_id ON public.friend_messages USING btree (sender_id)` |
| `idx_friend_messages_sent_at` | INDEX | `CREATE INDEX idx_friend_messages_sent_at ON public.friend_messages USING btree (friendship_id, sent_at)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can mark friend messages as read` | UPDATE | public | `(auth.uid() = receiver_id)` | `(auth.uid() = receiver_id)` |
| `Users can send friend messages` | INSERT | public |  | `((auth.uid() = sender_id) AND (EXISTS ( SELECT 1    FROM friends   WHERE ((friends.id = friend_messages.friendship_id) AND ((friends.user_id = auth.uid()) OR (friends.friend_id = auth.uid()))))))` |
| `Users can view their friend messages` | SELECT | public | `((auth.uid() = sender_id) OR (auth.uid() = receiver_id))` |  |

### `friend_recommendations`

**Columns: 6  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 1**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `recommender_id` | uuid | `uuid` | NO |  |
| 3 | `recommended_person_id` | uuid | `uuid` | NO |  |
| 4 | `recommended_to_friend_id` | uuid | `uuid` | NO |  |
| 5 | `source_proposal_id` | uuid | `uuid` | YES |  |
| 6 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `friend_recommendations_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX friend_recommendations_pkey ON public.friend_recommendations USING btree (id)` |
| `friend_recommendations_recommender_person_friend_key` | UNIQUE | `CREATE UNIQUE INDEX friend_recommendations_recommender_person_friend_key ON public.friend_recommendations USING btree (recommender_id, recommended_person_id, recommended_to_friend_id)` |
| `idx_friend_recommendations_pair` | INDEX | `CREATE INDEX idx_friend_recommendations_pair ON public.friend_recommendations USING btree (recommended_person_id, recommended_to_friend_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can view their own recommendations` | SELECT | public | `(auth.uid() = recommender_id)` |  |

### `friend_suggestions`

**Columns: 10  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `suggested_by` | uuid | `uuid` | NO |  |
| 3 | `user_a_id` | uuid | `uuid` | NO |  |
| 4 | `user_b_id` | uuid | `uuid` | NO |  |
| 5 | `status` | text | `text` | NO | `'queued'::text` |
| 6 | `stashed_at` | timestamp with time zone | `timestamptz` | YES |  |
| 7 | `expires_at` | timestamp with time zone | `timestamptz` | NO |  |
| 8 | `converted_proposal_id` | uuid | `uuid` | YES |  |
| 9 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |
| 10 | `updated_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `friend_suggestions_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX friend_suggestions_pkey ON public.friend_suggestions USING btree (id)` |
| `idx_friend_suggestions_status` | INDEX | `CREATE INDEX idx_friend_suggestions_status ON public.friend_suggestions USING btree (status) WHERE (status = ANY (ARRAY['queued'::text, 'stashed'::text]))` |
| `idx_friend_suggestions_user_a_active` | UNIQUE | `CREATE UNIQUE INDEX idx_friend_suggestions_user_a_active ON public.friend_suggestions USING btree (user_a_id) WHERE (status = ANY (ARRAY['queued'::text, 'stashed'::text]))` |
| `idx_friend_suggestions_user_b_active` | UNIQUE | `CREATE UNIQUE INDEX idx_friend_suggestions_user_b_active ON public.friend_suggestions USING btree (user_b_id) WHERE (status = ANY (ARRAY['queued'::text, 'stashed'::text]))` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `users_can_expire_own_suggestions` | UPDATE | authenticated | `((auth.uid() = suggested_by) OR (auth.uid() = user_a_id) OR (auth.uid() = user_b_id))` | `(status = 'expired'::text)` |
| `users_can_insert_suggestions` | INSERT | public |  | `(auth.uid() = suggested_by)` |
| `users_can_read_own_suggestions` | SELECT | public | `(auth.uid() = suggested_by)` |  |

### `friends`

**Columns: 9  |  Indexes: 9  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `friend_id` | uuid | `uuid` | NO |  |
| 4 | `added_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 5 | `streak_days` | integer | `int4` | YES | `0` |
| 6 | `last_mutual_date` | date | `date` | YES |  |
| 7 | `streak_frozen` | boolean | `bool` | YES | `false` |
| 8 | `status` | text | `text` | NO | `'accepted'::text` |
| 9 | `requested_by` | uuid | `uuid` | YES |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `friends_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX friends_pkey ON public.friends USING btree (id)` |
| `friends_user_id_friend_id_key` | UNIQUE | `CREATE UNIQUE INDEX friends_user_id_friend_id_key ON public.friends USING btree (user_id, friend_id)` |
| `idx_friends_friend_accepted` | INDEX | `CREATE INDEX idx_friends_friend_accepted ON public.friends USING btree (friend_id, user_id) WHERE (status = 'accepted'::text)` |
| `idx_friends_friend_id` | INDEX | `CREATE INDEX idx_friends_friend_id ON public.friends USING btree (friend_id)` |
| `idx_friends_pending_recipient` | INDEX | `CREATE INDEX idx_friends_pending_recipient ON public.friends USING btree (friend_id, status) WHERE (status = 'pending'::text)` |
| `idx_friends_status` | INDEX | `CREATE INDEX idx_friends_status ON public.friends USING btree (status)` |
| `idx_friends_user_accepted` | INDEX | `CREATE INDEX idx_friends_user_accepted ON public.friends USING btree (user_id, friend_id) WHERE (status = 'accepted'::text)` |
| `idx_friends_user_id` | INDEX | `CREATE INDEX idx_friends_user_id ON public.friends USING btree (user_id)` |
| `unique_friendship` | UNIQUE | `CREATE UNIQUE INDEX unique_friendship ON public.friends USING btree (user_id, friend_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can delete their friendships` | DELETE | public | `((auth.uid() = user_id) OR (auth.uid() = friend_id))` |  |
| `Users can see pending friend requests targeting them` | SELECT | public | `((auth.uid() = friend_id) AND (status = 'pending'::text))` |  |
| `Users can view their friendships` | SELECT | public | `((auth.uid() = user_id) OR (auth.uid() = friend_id))` |  |

### `ghost_profiles`

**Columns: 12  |  Indexes: 2  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `created_by` | uuid | `uuid` | NO |  |
| 3 | `name` | text | `text` | NO |  |
| 4 | `age` | integer | `int4` | NO |  |
| 5 | `photos` | jsonb | `jsonb` | YES | `'[]'::jsonb` |
| 6 | `bio` | text | `text` | YES |  |
| 7 | `preferences` | jsonb | `jsonb` | YES | `'{}'::jsonb` |
| 8 | `invite_token` | text | `text` | NO |  |
| 9 | `claimed_by` | uuid | `uuid` | YES |  |
| 10 | `claimed_at` | timestamp with time zone | `timestamptz` | YES |  |
| 11 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 12 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `ghost_profiles_invite_token_key` | UNIQUE | `CREATE UNIQUE INDEX ghost_profiles_invite_token_key ON public.ghost_profiles USING btree (invite_token)` |
| `ghost_profiles_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX ghost_profiles_pkey ON public.ghost_profiles USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Friends can read their own ghost profile by token` | SELECT | public | `true` |  |
| `Matchmakers can read their own ghost profiles` | SELECT | public | `(auth.uid() = created_by)` |  |
| `Users can create ghost profiles` | INSERT | public |  | `(auth.uid() = created_by)` |

### `introductions`

**Columns: 10  |  Indexes: 1  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `matchmaker_id` | uuid | `uuid` | NO |  |
| 3 | `person_a_id` | uuid | `uuid` | NO |  |
| 4 | `person_b_id` | uuid | `uuid` | NO |  |
| 5 | `note` | text | `text` | YES |  |
| 6 | `status` | text | `text` | NO | `'suggested'::text` |
| 7 | `person_a_response` | text | `text` | YES |  |
| 8 | `person_b_response` | text | `text` | YES |  |
| 9 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 10 | `resolved_at` | timestamp with time zone | `timestamptz` | YES |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `introductions_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX introductions_pkey ON public.introductions USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Matchmakers can read/create their introductions` | ALL | public | `(auth.uid() = matchmaker_id)` |  |
| `Users can read introductions they are part of` | SELECT | public | `((auth.uid() = person_a_id) OR (auth.uid() = person_b_id))` |  |
| `Users can respond to their introductions` | UPDATE | public | `((auth.uid() = person_a_id) OR (auth.uid() = person_b_id))` |  |

### `karma_rank_snapshots`

**Columns: 5  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 1**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `snapshot_date` | date | `date` | NO |  |
| 4 | `rank` | integer | `int4` | NO |  |
| 5 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_karma_rank_snap_date_user` | INDEX | `CREATE INDEX idx_karma_rank_snap_date_user ON public.karma_rank_snapshots USING btree (snapshot_date, user_id)` |
| `karma_rank_snapshots_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX karma_rank_snapshots_pkey ON public.karma_rank_snapshots USING btree (id)` |
| `karma_rank_snapshots_user_id_snapshot_date_key` | UNIQUE | `CREATE UNIQUE INDEX karma_rank_snapshots_user_id_snapshot_date_key ON public.karma_rank_snapshots USING btree (user_id, snapshot_date)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can view rank snapshots` | SELECT | authenticated | `true` |  |

### `karma_scores`

**Columns: 13  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 1**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `total_assists` | integer | `int4` | YES | `0` |
| 4 | `total_proposals` | integer | `int4` | YES | `0` |
| 5 | `total_votes` | integer | `int4` | YES | `0` |
| 6 | `accurate_votes` | integer | `int4` | YES | `0` |
| 7 | `badge_tier` | text | `text` | YES | `'new'::text` |
| 8 | `proposal_success_rate` | numeric | `numeric` | YES | `0` |
| 9 | `voting_accuracy_rate` | numeric | `numeric` | YES | `0` |
| 10 | `slow_mode_active` | boolean | `bool` | YES | `false` |
| 11 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 12 | `karma_points` | integer | `int4` | YES | `0` |
| 13 | `total_inaccurate_votes` | integer | `int4` | YES | `0` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_karma_scores_tier` | INDEX | `CREATE INDEX idx_karma_scores_tier ON public.karma_scores USING btree (badge_tier)` |
| `idx_karma_scores_user_id` | INDEX | `CREATE INDEX idx_karma_scores_user_id ON public.karma_scores USING btree (user_id)` |
| `karma_scores_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX karma_scores_pkey ON public.karma_scores USING btree (id)` |
| `unique_user_karma` | UNIQUE | `CREATE UNIQUE INDEX unique_user_karma ON public.karma_scores USING btree (user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Authenticated users can read karma scores` | SELECT | public | `(auth.role() = 'authenticated'::text)` |  |

### `karma_weekly_snapshots`

**Columns: 5  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `week_start` | timestamp with time zone | `timestamptz` | NO |  |
| 4 | `karma_at_start` | integer | `int4` | NO | `0` |
| 5 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_karma_weekly_user_week` | INDEX | `CREATE INDEX idx_karma_weekly_user_week ON public.karma_weekly_snapshots USING btree (week_start, user_id)` |
| `karma_weekly_snapshots_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX karma_weekly_snapshots_pkey ON public.karma_weekly_snapshots USING btree (id)` |
| `karma_weekly_snapshots_user_id_week_start_key` | UNIQUE | `CREATE UNIQUE INDEX karma_weekly_snapshots_user_id_week_start_key ON public.karma_weekly_snapshots USING btree (user_id, week_start)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can view current week snapshots` | SELECT | authenticated | `(week_start = get_current_week_start())` |  |
| `Users can view their own snapshots` | SELECT | authenticated | `(auth.uid() = user_id)` |  |

### `match_exits`

**Columns: 9  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `match_id` | uuid | `uuid` | NO |  |
| 3 | `exiting_user_id` | uuid | `uuid` | NO |  |
| 4 | `exit_reason` | text | `text` | YES |  |
| 5 | `exit_details` | text | `text` | YES |  |
| 6 | `messages_exchanged` | integer | `int4` | YES |  |
| 7 | `days_since_match` | integer | `int4` | YES |  |
| 8 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 9 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_match_exits_match_id` | INDEX | `CREATE INDEX idx_match_exits_match_id ON public.match_exits USING btree (match_id)` |
| `idx_match_exits_user` | INDEX | `CREATE INDEX idx_match_exits_user ON public.match_exits USING btree (exiting_user_id)` |
| `match_exits_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX match_exits_pkey ON public.match_exits USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can create match exits` | INSERT | public |  | `(auth.uid() = exiting_user_id)` |
| `Users can view match exits for their matches` | SELECT | public | `(EXISTS ( SELECT 1    FROM matches   WHERE ((matches.id = match_exits.match_id) AND ((auth.uid() = matches.user_id_1) OR (auth.uid() = matches.user_id_2)))))` |  |

### `matches`

**Columns: 14  |  Indexes: 6  |  RLS: ENABLED  |  Policies: 4**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id_1` | uuid | `uuid` | NO |  |
| 3 | `user_id_2` | uuid | `uuid` | NO |  |
| 4 | `status` | text | `text` | NO | `'pending'::text` |
| 5 | `community_score` | numeric | `numeric` | YES |  |
| 6 | `algorithm_score` | numeric | `numeric` | YES |  |
| 7 | `user_1_decision` | text | `text` | YES | `'pending'::text` |
| 8 | `user_2_decision` | text | `text` | YES | `'pending'::text` |
| 9 | `proposed_at` | timestamp with time zone | `timestamptz` | YES |  |
| 10 | `matched_at` | timestamp with time zone | `timestamptz` | YES |  |
| 11 | `expires_at` | timestamp with time zone | `timestamptz` | YES |  |
| 12 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 13 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 14 | `proposal_id` | uuid | `uuid` | YES |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_matches_created_at` | INDEX | `CREATE INDEX idx_matches_created_at ON public.matches USING btree (created_at DESC)` |
| `idx_matches_status` | INDEX | `CREATE INDEX idx_matches_status ON public.matches USING btree (status)` |
| `idx_matches_user_id_1` | INDEX | `CREATE INDEX idx_matches_user_id_1 ON public.matches USING btree (user_id_1)` |
| `idx_matches_user_id_2` | INDEX | `CREATE INDEX idx_matches_user_id_2 ON public.matches USING btree (user_id_2)` |
| `matches_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX matches_pkey ON public.matches USING btree (id)` |
| `unique_match_per_proposal` | UNIQUE | `CREATE UNIQUE INDEX unique_match_per_proposal ON public.matches USING btree (proposal_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Friends can see friend match existence` | SELECT | public | `((EXISTS ( SELECT 1    FROM friends f   WHERE ((f.user_id = auth.uid()) AND (f.friend_id = ANY (ARRAY[matches.user_id_1, matches.user_id_2]))))) OR (EXISTS ( SELECT 1    FROM friends f   WHERE ((f.friend_id = auth.uid...` |  |
| `Users can delete their own matches` | DELETE | public | `((auth.uid() = user_id_1) OR (auth.uid() = user_id_2))` |  |
| `Users can update their own matches` | UPDATE | public | `((auth.uid() = user_id_1) OR (auth.uid() = user_id_2))` |  |
| `Users can view their own matches` | SELECT | public | `((auth.uid() = user_id_1) OR (auth.uid() = user_id_2))` |  |

### `messages`

**Columns: 10  |  Indexes: 6  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `match_id` | uuid | `uuid` | NO |  |
| 3 | `sender_id` | uuid | `uuid` | NO |  |
| 4 | `receiver_id` | uuid | `uuid` | NO |  |
| 5 | `type` | text | `text` | NO | `'text'::text` |
| 6 | `content` | text | `text` | NO |  |
| 7 | `duration` | integer | `int4` | YES |  |
| 8 | `sent_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 9 | `read_at` | timestamp with time zone | `timestamptz` | YES |  |
| 10 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_messages_match_id` | INDEX | `CREATE INDEX idx_messages_match_id ON public.messages USING btree (match_id)` |
| `idx_messages_match_sent` | INDEX | `CREATE INDEX idx_messages_match_sent ON public.messages USING btree (match_id, sent_at DESC)` |
| `idx_messages_receiver_id` | INDEX | `CREATE INDEX idx_messages_receiver_id ON public.messages USING btree (receiver_id)` |
| `idx_messages_sender_id` | INDEX | `CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id)` |
| `idx_messages_sent_at` | INDEX | `CREATE INDEX idx_messages_sent_at ON public.messages USING btree (sent_at DESC)` |
| `messages_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can mark received messages as read` | UPDATE | public | `(auth.uid() = receiver_id)` | `(auth.uid() = receiver_id)` |
| `Users can send messages` | INSERT | public |  | `(auth.uid() = sender_id)` |
| `Users can view their own messages` | SELECT | public | `((auth.uid() = sender_id) OR (auth.uid() = receiver_id))` |  |

### `notification_log`

**Columns: 9  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 0**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `notification_type` | text | `text` | NO |  |
| 4 | `category` | text | `text` | NO |  |
| 5 | `copy_variant` | integer | `int4` | YES | `0` |
| 6 | `sent_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 7 | `opened` | boolean | `bool` | YES | `false` |
| 8 | `opened_at` | timestamp with time zone | `timestamptz` | YES |  |
| 9 | `metadata` | jsonb | `jsonb` | YES | `'{}'::jsonb` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_notif_log_sent_at` | INDEX | `CREATE INDEX idx_notif_log_sent_at ON public.notification_log USING btree (sent_at)` |
| `idx_notif_log_user_date_cat` | INDEX | `CREATE INDEX idx_notif_log_user_date_cat ON public.notification_log USING btree (user_id, category, sent_at)` |
| `idx_notif_log_user_type_sent` | INDEX | `CREATE INDEX idx_notif_log_user_type_sent ON public.notification_log USING btree (user_id, notification_type, sent_at DESC)` |
| `notification_log_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX notification_log_pkey ON public.notification_log USING btree (id)` |

#### RLS Policies

_No policies. RLS is ON so all access via `anon`/`authenticated` is denied by default._

### `onboarding_progress`

**Columns: 4  |  Indexes: 1  |  RLS: ENABLED  |  Policies: 1**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `user_id` | uuid | `uuid` | NO |  |
| 2 | `current_step` | text | `text` | NO | `'phone'::text` |
| 3 | `data` | jsonb | `jsonb` | NO | `'{}'::jsonb` |
| 4 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `onboarding_progress_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX onboarding_progress_pkey ON public.onboarding_progress USING btree (user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can manage their own onboarding progress` | ALL | public | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `pool_vote_assignments`

**Columns: 6  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `proposal_id` | uuid | `uuid` | NO |  |
| 3 | `voter_id` | uuid | `uuid` | NO |  |
| 4 | `assignment_date` | date | `date` | YES | `CURRENT_DATE` |
| 5 | `has_voted` | boolean | `bool` | YES | `false` |
| 6 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_pool_assignments_proposal` | INDEX | `CREATE INDEX idx_pool_assignments_proposal ON public.pool_vote_assignments USING btree (proposal_id)` |
| `idx_pool_assignments_voter_date` | INDEX | `CREATE INDEX idx_pool_assignments_voter_date ON public.pool_vote_assignments USING btree (voter_id, assignment_date)` |
| `pool_vote_assignments_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX pool_vote_assignments_pkey ON public.pool_vote_assignments USING btree (id)` |
| `unique_pool_assignment` | UNIQUE | `CREATE UNIQUE INDEX unique_pool_assignment ON public.pool_vote_assignments USING btree (proposal_id, voter_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can update own pool assignments` | UPDATE | public | `(voter_id = auth.uid())` |  |
| `Users can view own pool assignments` | SELECT | public | `(voter_id = auth.uid())` |  |

### `profiles`

**Columns: 36  |  Indexes: 1  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO |  |
| 2 | `first_name` | text | `text` | NO |  |
| 3 | `last_name` | text | `text` | NO |  |
| 4 | `age` | integer | `int4` | NO |  |
| 5 | `gender` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 6 | `pronouns` | text | `text` | YES |  |
| 7 | `pronouns_list` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 8 | `custom_gender` | text | `text` | YES |  |
| 9 | `hometown` | text | `text` | YES |  |
| 10 | `location` | text | `text` | NO |  |
| 11 | `current_job` | text | `text` | YES |  |
| 12 | `company_position` | text | `text` | YES |  |
| 13 | `education_level` | text | `text` | YES |  |
| 14 | `school` | text | `text` | YES |  |
| 15 | `height_inches` | integer | `int4` | YES |  |
| 16 | `ethnicity` | text | `text` | YES |  |
| 17 | `religion` | text | `text` | YES |  |
| 18 | `political_leaning` | text | `text` | YES |  |
| 19 | `has_children` | text | `text` | YES |  |
| 20 | `family_plans` | text | `text` | YES |  |
| 21 | `drinking_frequency` | text | `text` | YES |  |
| 22 | `cannabis_frequency` | text | `text` | YES |  |
| 23 | `tobacco_frequency` | text | `text` | YES |  |
| 24 | `other_drugs_frequency` | text | `text` | YES |  |
| 25 | `interests` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 26 | `values` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 27 | `bio` | text | `text` | YES |  |
| 28 | `is_verified` | boolean | `bool` | YES | `false` |
| 29 | `is_paused` | boolean | `bool` | YES | `false` |
| 30 | `profile_completed` | boolean | `bool` | YES | `false` |
| 31 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 32 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 33 | `last_active_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 34 | `latitude` | double precision | `float8` | YES |  |
| 35 | `longitude` | double precision | `float8` | YES |  |
| 36 | `interested_in_genders` | ARRAY | `_text` | YES | `'{}'::text[]` |

#### Indexes

| name | type | definition |
|---|---|---|
| `profiles_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Public profiles are viewable by everyone` | SELECT | public | `true` |  |
| `Users can insert their own profile` | INSERT | public |  | `(auth.uid() = id)` |
| `Users can update their own profile` | UPDATE | public | `(auth.uid() = id)` |  |

### `proposal_votes`

**Columns: 9  |  Indexes: 6  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `proposal_id` | uuid | `uuid` | NO |  |
| 3 | `voter_user_id` | uuid | `uuid` | NO |  |
| 4 | `vote_type` | text | `text` | NO |  |
| 5 | `is_friend_vote` | boolean | `bool` | YES | `false` |
| 6 | `friend_of` | uuid | `uuid` | YES |  |
| 7 | `recommend_to_id` | uuid | `uuid` | YES |  |
| 8 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 9 | `vote_weight` | numeric | `numeric` | YES | `1.0` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_proposal_votes_proposal` | INDEX | `CREATE INDEX idx_proposal_votes_proposal ON public.proposal_votes USING btree (proposal_id)` |
| `idx_proposal_votes_voter` | INDEX | `CREATE INDEX idx_proposal_votes_voter ON public.proposal_votes USING btree (voter_user_id)` |
| `idx_proposal_votes_voter_created` | INDEX | `CREATE INDEX idx_proposal_votes_voter_created ON public.proposal_votes USING btree (voter_user_id, created_at DESC)` |
| `proposal_votes_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX proposal_votes_pkey ON public.proposal_votes USING btree (id)` |
| `unique_proposal_vote` | UNIQUE | `CREATE UNIQUE INDEX unique_proposal_vote ON public.proposal_votes USING btree (proposal_id, voter_user_id)` |
| `unique_vote_per_proposal` | UNIQUE | `CREATE UNIQUE INDEX unique_vote_per_proposal ON public.proposal_votes USING btree (proposal_id, voter_user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Authenticated users can read votes` | SELECT | public | `(auth.role() = 'authenticated'::text)` |  |
| `Users can cast their own votes` | INSERT | public |  | `(auth.uid() = voter_user_id)` |

### `proposals`

**Columns: 32  |  Indexes: 10  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_a_id` | uuid | `uuid` | NO |  |
| 3 | `user_b_id` | uuid | `uuid` | NO |  |
| 4 | `status` | text | `text` | NO | `'pending'::text` |
| 5 | `compatibility_score` | numeric | `numeric` | YES |  |
| 6 | `category_scores` | jsonb | `jsonb` | YES | `'{}'::jsonb` |
| 7 | `pool_yes_votes` | integer | `int4` | YES | `0` |
| 8 | `pool_no_votes` | integer | `int4` | YES | `0` |
| 9 | `friend_yes_votes` | integer | `int4` | YES | `0` |
| 10 | `friend_no_votes` | integer | `int4` | YES | `0` |
| 11 | `pool_eligible` | boolean | `bool` | YES | `true` |
| 12 | `user_a_decision` | text | `text` | YES | `'pending'::text` |
| 13 | `user_b_decision` | text | `text` | YES | `'pending'::text` |
| 14 | `user_a_decided_at` | timestamp with time zone | `timestamptz` | YES |  |
| 15 | `user_b_decided_at` | timestamp with time zone | `timestamptz` | YES |  |
| 16 | `voting_started_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 17 | `voting_expires_at` | timestamp with time zone | `timestamptz` | YES |  |
| 18 | `community_decided_at` | timestamp with time zone | `timestamptz` | YES |  |
| 19 | `passed_to_users_at` | timestamp with time zone | `timestamptz` | YES |  |
| 20 | `decision_deadline_at` | timestamp with time zone | `timestamptz` | YES |  |
| 21 | `confirmed_at` | timestamp with time zone | `timestamptz` | YES |  |
| 22 | `rejected_at` | timestamp with time zone | `timestamptz` | YES |  |
| 23 | `declined_at` | timestamp with time zone | `timestamptz` | YES |  |
| 24 | `expired_at` | timestamp with time zone | `timestamptz` | YES |  |
| 25 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 26 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 27 | `weighted_yes` | numeric | `numeric` | YES | `0` |
| 28 | `weighted_no` | numeric | `numeric` | YES | `0` |
| 29 | `created_by` | uuid | `uuid` | YES |  |
| 30 | `creation_type` | text | `text` | NO | `'algorithm'::text` |
| 31 | `sent_to_users_at` | timestamp with time zone | `timestamptz` | YES |  |
| 32 | `vote_context` | text | `text` | YES |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_proposals_created_by` | INDEX | `CREATE INDEX idx_proposals_created_by ON public.proposals USING btree (created_by) WHERE (created_by IS NOT NULL)` |
| `idx_proposals_status` | INDEX | `CREATE INDEX idx_proposals_status ON public.proposals USING btree (status)` |
| `idx_proposals_user_a` | INDEX | `CREATE INDEX idx_proposals_user_a ON public.proposals USING btree (user_a_id)` |
| `idx_proposals_user_b` | INDEX | `CREATE INDEX idx_proposals_user_b ON public.proposals USING btree (user_b_id)` |
| `idx_proposals_voting_expires` | INDEX | `CREATE INDEX idx_proposals_voting_expires ON public.proposals USING btree (voting_expires_at)` |
| `one_active_proposal_per_user_a` | UNIQUE | `CREATE UNIQUE INDEX one_active_proposal_per_user_a ON public.proposals USING btree (user_a_id) WHERE (status = ANY (ARRAY['pending'::text, 'deciding'::text]))` |
| `one_active_proposal_per_user_b` | UNIQUE | `CREATE UNIQUE INDEX one_active_proposal_per_user_b ON public.proposals USING btree (user_b_id) WHERE (status = ANY (ARRAY['pending'::text, 'deciding'::text]))` |
| `proposals_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX proposals_pkey ON public.proposals USING btree (id)` |
| `unique_proposal_pair` | UNIQUE | `CREATE UNIQUE INDEX unique_proposal_pair ON public.proposals USING btree (user_a_id, user_b_id)` |
| `unique_proposal_pair_permanent` | UNIQUE | `CREATE UNIQUE INDEX unique_proposal_pair_permanent ON public.proposals USING btree (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id)) WHERE (status <> 'expired'::text)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Authenticated users can read proposals` | SELECT | public | `(auth.role() = 'authenticated'::text)` |  |
| `Proposal participants can update proposals` | UPDATE | public | `((auth.uid() = user_a_id) OR (auth.uid() = user_b_id))` | `((auth.uid() = user_a_id) OR (auth.uid() = user_b_id))` |

### `rate_limit_attempts`

**Columns: 5  |  Indexes: 2  |  RLS: ENABLED  |  Policies: 0**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `identifier` | text | `text` | NO |  |
| 3 | `action_type` | text | `text` | NO |  |
| 4 | `attempted_at` | timestamp with time zone | `timestamptz` | NO | `now()` |
| 5 | `metadata` | jsonb | `jsonb` | YES | `'{}'::jsonb` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_rate_limit_attempts_identifier_action` | INDEX | `CREATE INDEX idx_rate_limit_attempts_identifier_action ON public.rate_limit_attempts USING btree (identifier, action_type, attempted_at DESC)` |
| `rate_limit_attempts_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX rate_limit_attempts_pkey ON public.rate_limit_attempts USING btree (id)` |

#### RLS Policies

_No policies. RLS is ON so all access via `anon`/`authenticated` is denied by default._

### `rate_limit_config`

**Columns: 3  |  Indexes: 1  |  RLS: ENABLED  |  Policies: 1**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `action_type` | text | `text` | NO |  |
| 2 | `max_attempts` | integer | `int4` | NO |  |
| 3 | `window_seconds` | integer | `int4` | NO |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `rate_limit_config_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX rate_limit_config_pkey ON public.rate_limit_config USING btree (action_type)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Public read rate limit config` | SELECT | public | `true` |  |

### `roster`

**Columns: 7  |  Indexes: 2  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `matchmaker_id` | uuid | `uuid` | NO |  |
| 3 | `user_id` | uuid | `uuid` | YES |  |
| 4 | `ghost_profile_id` | uuid | `uuid` | YES |  |
| 5 | `status` | text | `text` | NO | `'active'::text` |
| 6 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 7 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `roster_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX roster_pkey ON public.roster USING btree (id)` |
| `unique_matchmaker_target` | UNIQUE | `CREATE UNIQUE INDEX unique_matchmaker_target ON public.roster USING btree (matchmaker_id, user_id, ghost_profile_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Matchmakers can manage their roster` | ALL | public | `(auth.uid() = matchmaker_id)` |  |
| `Users can see who is matchmaking them` | SELECT | public | `(auth.uid() = user_id)` |  |

### `support_conversations`

**Columns: 6  |  Indexes: 2  |  RLS: ENABLED  |  Policies: 1**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `user_id` | uuid | `uuid` | NO |  |
| 2 | `last_message_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 3 | `has_unread_admin` | boolean | `bool` | YES | `false` |
| 4 | `has_unread_user` | boolean | `bool` | YES | `false` |
| 5 | `raffle_tickets` | integer | `int4` | YES | `0` |
| 6 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_support_conversations_last` | INDEX | `CREATE INDEX idx_support_conversations_last ON public.support_conversations USING btree (last_message_at DESC)` |
| `support_conversations_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX support_conversations_pkey ON public.support_conversations USING btree (user_id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users own their conversation` | ALL | public | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `support_messages`

**Columns: 6  |  Indexes: 2  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `content` | text | `text` | NO |  |
| 4 | `sender` | text | `text` | NO |  |
| 5 | `is_auto_reply` | boolean | `bool` | YES | `false` |
| 6 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_support_messages_user` | INDEX | `CREATE INDEX idx_support_messages_user ON public.support_messages USING btree (user_id, created_at)` |
| `support_messages_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX support_messages_pkey ON public.support_messages USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users read own messages` | SELECT | public | `(auth.uid() = user_id)` |  |
| `Users send messages` | INSERT | public |  | `((auth.uid() = user_id) AND (sender = 'user'::text))` |

### `support_reply_context`

**Columns: 3  |  Indexes: 1  |  RLS: ENABLED  |  Policies: 0**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | integer | `int4` | NO | `1` |
| 2 | `current_user_id` | uuid | `uuid` | YES |  |
| 3 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |

#### Indexes

| name | type | definition |
|---|---|---|
| `support_reply_context_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX support_reply_context_pkey ON public.support_reply_context USING btree (id)` |

#### RLS Policies

_No policies. RLS is ON so all access via `anon`/`authenticated` is denied by default._

### `user_photos`

**Columns: 7  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 4**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `storage_path` | text | `text` | NO |  |
| 4 | `is_main` | boolean | `bool` | YES | `false` |
| 5 | `display_order` | integer | `int4` | YES | `0` |
| 6 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 7 | `url` | text | `text` | YES |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_user_photos_main` | INDEX | `CREATE INDEX idx_user_photos_main ON public.user_photos USING btree (user_id, is_main) WHERE (is_main = true)` |
| `idx_user_photos_user_id` | INDEX | `CREATE INDEX idx_user_photos_user_id ON public.user_photos USING btree (user_id)` |
| `user_photos_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX user_photos_pkey ON public.user_photos USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Authenticated users can read all photos` | SELECT | public | `(auth.role() = 'authenticated'::text)` |  |
| `Users can delete their own photos` | DELETE | public | `(auth.uid() = user_id)` |  |
| `Users can insert their own photos` | INSERT | public |  | `(auth.uid() = user_id)` |
| `Users can update their own photos` | UPDATE | public | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `user_preferences`

**Columns: 19  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 4**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 4 | `age_min` | integer | `int4` | YES |  |
| 5 | `age_max` | integer | `int4` | YES |  |
| 6 | `looking_for` | text | `text` | YES | `'relationship'::text` |
| 7 | `preferred_height_min_inches` | integer | `int4` | YES |  |
| 8 | `preferred_height_max_inches` | integer | `int4` | YES |  |
| 9 | `max_distance` | integer | `int4` | YES |  |
| 10 | `preferred_ethnicities` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 11 | `preferred_politics` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 12 | `partner_drinking` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 13 | `partner_cannabis` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 14 | `partner_tobacco` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 15 | `partner_other_drugs` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 16 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 17 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 18 | `interested_in_genders` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 19 | `partner_lifestyle_preferences` | jsonb | `jsonb` | YES |  |
| 20 | `preferred_religions` | ARRAY | `_text` | YES | `'{}'::text[]` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_user_preferences_user_id` | INDEX | `CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id)` |
| `unique_user_preferences` | UNIQUE | `CREATE UNIQUE INDEX unique_user_preferences ON public.user_preferences USING btree (user_id)` |
| `user_preferences_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Authenticated users can read all preferences` | SELECT | public | `(auth.role() = 'authenticated'::text)` |  |
| `Users can create their own preferences` | INSERT | public |  | `(auth.uid() = user_id)` |
| `Users can delete their own preferences` | DELETE | public | `(auth.uid() = user_id)` |  |
| `Users can update their own preferences` | UPDATE | public | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `user_profiles`

**Columns: 55  |  Indexes: 7  |  RLS: ENABLED  |  Policies: 4**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | YES |  |
| 3 | `first_name` | text | `text` | NO | `''::text` |
| 4 | `last_name` | text | `text` | NO | `''::text` |
| 5 | `age` | integer | `int4` | YES |  |
| 6 | `gender` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 7 | `pronouns` | text | `text` | YES |  |
| 8 | `pronouns_list` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 9 | `custom_gender` | text | `text` | YES |  |
| 10 | `interested_in_genders` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 11 | `custom_interested_in` | text | `text` | YES |  |
| 12 | `height_inches` | integer | `int4` | YES |  |
| 13 | `ethnicity` | text | `text` | YES |  |
| 14 | `location` | text | `text` | YES |  |
| 15 | `latitude` | double precision | `float8` | YES |  |
| 16 | `longitude` | double precision | `float8` | YES |  |
| 17 | `hometown` | text | `text` | YES |  |
| 18 | `current_job` | text | `text` | YES |  |
| 19 | `company_position` | text | `text` | YES |  |
| 20 | `education_level` | text | `text` | YES |  |
| 21 | `custom_education_level` | text | `text` | YES |  |
| 22 | `school` | text | `text` | YES |  |
| 23 | `religion` | text | `text` | YES |  |
| 24 | `political_leaning` | text | `text` | YES |  |
| 25 | `custom_political_leaning` | text | `text` | YES |  |
| 26 | `has_children` | text | `text` | YES |  |
| 27 | `family_plans` | text | `text` | YES |  |
| 28 | `drinking_frequency` | text | `text` | YES |  |
| 29 | `cannabis_frequency` | text | `text` | YES |  |
| 30 | `tobacco_frequency` | text | `text` | YES |  |
| 31 | `other_drugs_frequency` | text | `text` | YES |  |
| 32 | `interests` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 33 | `values` | ARRAY | `_text` | YES | `'{}'::text[]` |
| 34 | `bio` | text | `text` | YES | `''::text` |
| 35 | `photos` | jsonb | `jsonb` | YES | `'[]'::jsonb` |
| 36 | `profile_photo_path` | text | `text` | YES |  |
| 37 | `phone_number` | text | `text` | YES |  |
| 38 | `non_negotiables` | jsonb | `jsonb` | YES | `'[]'::jsonb` |
| 39 | `is_verified` | boolean | `bool` | YES | `false` |
| 40 | `is_paused` | boolean | `bool` | YES | `false` |
| 41 | `section_visibility` | jsonb | `jsonb` | YES | `'{}'::jsonb` |
| 42 | `preference_visibility` | jsonb | `jsonb` | YES | `'{}'::jsonb` |
| 43 | `guide_completions` | jsonb | `jsonb` | YES | `'{}'::jsonb` |
| 44 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 45 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 46 | `email` | text | `text` | YES |  |
| 47 | `email_verified_at` | timestamp with time zone | `timestamptz` | YES |  |
| 48 | `profile_completed` | boolean | `bool` | YES | `false` |
| 49 | `deleted_at` | timestamp with time zone | `timestamptz` | YES |  |
| 50 | `deletion_scheduled_for` | timestamp with time zone | `timestamptz` | YES |  |
| 51 | `matchmaking_only` | boolean | `bool` | YES | `false` |
| 52 | `is_suspended` | boolean | `bool` | NO | `false` |
| 53 | `suspended_at` | timestamp with time zone | `timestamptz` | YES |  |
| 54 | `suspension_reason` | text | `text` | YES |  |
| 55 | `role` | text | `text` | NO | `'dater'::text` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_user_profiles_age` | INDEX | `CREATE INDEX idx_user_profiles_age ON public.user_profiles USING btree (age)` |
| `idx_user_profiles_email` | UNIQUE | `CREATE UNIQUE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email) WHERE (email IS NOT NULL)` |
| `idx_user_profiles_location` | INDEX | `CREATE INDEX idx_user_profiles_location ON public.user_profiles USING btree (location)` |
| `idx_user_profiles_suspended` | INDEX | `CREATE INDEX idx_user_profiles_suspended ON public.user_profiles USING btree (user_id) WHERE (is_suspended = true)` |
| `idx_user_profiles_user_id` | INDEX | `CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id)` |
| `unique_user_profile` | UNIQUE | `CREATE UNIQUE INDEX unique_user_profile ON public.user_profiles USING btree (user_id)` |
| `user_profiles_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Authenticated users can read all profiles` | SELECT | public | `(auth.role() = 'authenticated'::text)` |  |
| `Users can create their own profile` | INSERT | public |  | `(auth.uid() = user_id)` |
| `Users can delete their own profile` | DELETE | public | `(auth.uid() = user_id)` |  |
| `Users can update their own profile` | UPDATE | public | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `user_reports`

**Columns: 8  |  Indexes: 4  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `reporter_id` | uuid | `uuid` | NO |  |
| 3 | `reported_user_id` | uuid | `uuid` | NO |  |
| 4 | `reason` | text | `text` | NO | `'inappropriate_behavior'::text` |
| 5 | `details` | text | `text` | YES | `''::text` |
| 6 | `status` | text | `text` | NO | `'pending'::text` |
| 7 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 8 | `reviewed_at` | timestamp with time zone | `timestamptz` | YES |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_user_reports_reported` | INDEX | `CREATE INDEX idx_user_reports_reported ON public.user_reports USING btree (reported_user_id)` |
| `idx_user_reports_reporter` | INDEX | `CREATE INDEX idx_user_reports_reporter ON public.user_reports USING btree (reporter_id)` |
| `idx_user_reports_status` | INDEX | `CREATE INDEX idx_user_reports_status ON public.user_reports USING btree (status)` |
| `user_reports_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX user_reports_pkey ON public.user_reports USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can create reports` | INSERT | public |  | `(auth.uid() = reporter_id)` |
| `Users can view their own reports` | SELECT | public | `(auth.uid() = reporter_id)` |  |

### `user_settings`

**Columns: 13  |  Indexes: 3  |  RLS: ENABLED  |  Policies: 3**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | `uuid` | NO |  |
| 3 | `notifications_enabled` | boolean | `bool` | YES | `true` |
| 4 | `email_notifications` | boolean | `bool` | YES | `true` |
| 5 | `push_notifications` | boolean | `bool` | YES | `true` |
| 6 | `created_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 7 | `updated_at` | timestamp with time zone | `timestamptz` | YES | `now()` |
| 8 | `push_token` | text | `text` | YES |  |
| 9 | `pref_matches_enabled` | boolean | `bool` | YES | `true` |
| 10 | `pref_messages_enabled` | boolean | `bool` | YES | `true` |
| 11 | `pref_nudges_enabled` | boolean | `bool` | YES | `true` |
| 12 | `pref_show_name_if_winner` | boolean | `bool` | YES | `true` |
| 13 | `pref_leaderboard_visible` | boolean | `bool` | NO | `false` |

#### Indexes

| name | type | definition |
|---|---|---|
| `idx_user_settings_user_id` | INDEX | `CREATE INDEX idx_user_settings_user_id ON public.user_settings USING btree (user_id)` |
| `unique_user_settings` | UNIQUE | `CREATE UNIQUE INDEX unique_user_settings ON public.user_settings USING btree (user_id)` |
| `user_settings_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (id)` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Users can create their own settings` | INSERT | public |  | `(auth.uid() = user_id)` |
| `Users can read their own settings` | SELECT | public | `(auth.uid() = user_id)` |  |
| `Users can update their own settings` | UPDATE | public | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `waitlist_signups`

**Columns: 16  |  Indexes: 8  |  RLS: ENABLED  |  Policies: 2**

#### Columns

| # | name | data_type | udt_name | nullable | default |
|---|---|---|---|---|---|
| 1 | `id` | uuid | `uuid` | NO | `uuid_generate_v4()` |
| 2 | `created_at` | timestamp with time zone | `timestamptz` | NO | `now()` |
| 5 | `email` | USER-DEFINED | `citext` | NO |  |
| 6 | `phone` | text | `text` | YES |  |
| 7 | `location` | text | `text` | YES |  |
| 8 | `source` | text | `text` | YES |  |
| 9 | `user_agent` | text | `text` | YES |  |
| 10 | `ip` | inet | `inet` | YES |  |
| 11 | `consent` | boolean | `bool` | NO | `true` |
| 12 | `token_hash` | text | `text` | YES |  |
| 13 | `confirmation_sent_at` | timestamp with time zone | `timestamptz` | YES |  |
| 14 | `confirmed_at` | timestamp with time zone | `timestamptz` | YES |  |
| 15 | `token_expires_at` | timestamp with time zone | `timestamptz` | YES |  |
| 16 | `name` | text | `text` | NO |  |
| 17 | `interest_type` | text | `text` | YES |  |
| 18 | `student_email` | text | `text` | YES |  |

#### Indexes

| name | type | definition |
|---|---|---|
| `waitlist_signups_confirmed_at_idx` | INDEX | `CREATE INDEX waitlist_signups_confirmed_at_idx ON public.waitlist_signups USING btree (confirmed_at NULLS FIRST)` |
| `waitlist_signups_created_at_idx` | INDEX | `CREATE INDEX waitlist_signups_created_at_idx ON public.waitlist_signups USING btree (created_at DESC)` |
| `waitlist_signups_email_idx` | INDEX | `CREATE INDEX waitlist_signups_email_idx ON public.waitlist_signups USING btree (email)` |
| `waitlist_signups_email_unique` | UNIQUE | `CREATE UNIQUE INDEX waitlist_signups_email_unique ON public.waitlist_signups USING btree (email)` |
| `waitlist_signups_interest_type_idx` | INDEX | `CREATE INDEX waitlist_signups_interest_type_idx ON public.waitlist_signups USING btree (interest_type)` |
| `waitlist_signups_phone_idx` | INDEX | `CREATE INDEX waitlist_signups_phone_idx ON public.waitlist_signups USING btree (phone)` |
| `waitlist_signups_pkey` | PRIMARY KEY | `CREATE UNIQUE INDEX waitlist_signups_pkey ON public.waitlist_signups USING btree (id)` |
| `waitlist_signups_token_hash_idx` | INDEX | `CREATE INDEX waitlist_signups_token_hash_idx ON public.waitlist_signups USING btree (token_hash) WHERE ((token_hash IS NOT NULL) AND (confirmed_at IS NULL))` |

#### RLS Policies

| policy | cmd | roles | qual (summary) | with_check (summary) |
|---|---|---|---|---|
| `Service role only insert` | INSERT | service_role |  | `true` |
| `Service role select` | SELECT | service_role | `true` |  |

## 3. Functions / RPCs

Total: **136 functions**. Sorted alphabetically.

| name | arguments | return_type | security_definer | volatility |
|---|---|---|---|---|
| `accept_friend_request` | `request_id uuid` | `TABLE(success boolean, message text, friend_user_id uuid)` | YES | VOLATILE |
| `accept_proposal` | `p_user_id uuid, p_proposal_id uuid` | `json` | YES | VOLATILE |
| `add_friend_by_code` | `friend_code text` | `TABLE(success boolean, message text, friend_user_id uuid)` | YES | VOLATILE |
| `apply_karma_on_outcome` | `p_proposal_id uuid, p_outcome text` | `void` | YES | VOLATILE |
| `assign_daily_survey_to_user` | `p_user_id uuid` | `jsonb` | YES | VOLATILE |
| `auto_suspend_on_reports` | `` | `trigger` | YES | VOLATILE |
| `cancel_friend_request` | `request_id uuid` | `TABLE(success boolean, message text)` | YES | VOLATILE |
| `check_email_exists` | `p_email text` | `boolean` | YES | STABLE |
| `check_mutual_crush` | `p_crush_id uuid` | `boolean` | YES | VOLATILE |
| `check_rate_limit` | `p_identifier text, p_action_type text` | `SETOF rate_limit_result` | YES | VOLATILE |
| `citext` | `boolean` | `citext` | no | IMMUTABLE |
| `citext` | `character` | `citext` | no | IMMUTABLE |
| `citext` | `inet` | `citext` | no | IMMUTABLE |
| `citext_cmp` | `citext, citext` | `integer` | no | IMMUTABLE |
| `citext_eq` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_ge` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_gt` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_hash` | `citext` | `integer` | no | IMMUTABLE |
| `citext_hash_extended` | `citext, bigint` | `bigint` | no | IMMUTABLE |
| `citext_larger` | `citext, citext` | `citext` | no | IMMUTABLE |
| `citext_le` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_lt` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_ne` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_pattern_cmp` | `citext, citext` | `integer` | no | IMMUTABLE |
| `citext_pattern_ge` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_pattern_gt` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_pattern_le` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_pattern_lt` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `citext_smaller` | `citext, citext` | `citext` | no | IMMUTABLE |
| `citextin` | `cstring` | `citext` | no | IMMUTABLE |
| `citextout` | `citext` | `cstring` | no | IMMUTABLE |
| `citextrecv` | `internal` | `citext` | no | STABLE |
| `citextsend` | `citext` | `bytea` | no | STABLE |
| `compute_karma_tier` | `` | `trigger` | no | VOLATILE |
| `create_email_verification` | `p_user_id uuid, p_email text` | `TABLE(code text, expires_at timestamp with time zone)` | YES | VOLATILE |
| `create_friend_code_for_new_user` | `` | `trigger` | YES | VOLATILE |
| `create_onboarding_profile` | `p_user_id uuid, p_onboarding_data jsonb` | `TABLE(success boolean, error_code text, error_message text, profile_id uuid)` | YES | VOLATILE |
| `decline_friend_request` | `request_id uuid` | `TABLE(success boolean, message text)` | YES | VOLATILE |
| `decline_proposal` | `p_user_id uuid, p_proposal_id uuid` | `json` | YES | VOLATILE |
| `delete_user_account` | `target_user_id uuid` | `void` | YES | VOLATILE |
| `end_active_match` | `p_user_id uuid, p_match_id uuid, p_exit_reason text DEFAULT 'other'::text, p_exit_reason_detail text DEFAULT NULL::text` | `json` | YES | VOLATILE |
| `enforce_max_featured_badges` | `` | `trigger` | no | VOLATILE |
| `ensure_mock_profiles` | `min_count integer DEFAULT 10` | `void` | no | VOLATILE |
| `exec_sql` | `sql text` | `json` | YES | VOLATILE |
| `freeze_inactive_streaks` | `` | `void` | YES | VOLATILE |
| `generate_friend_code` | `` | `text` | no | VOLATILE |
| `generate_mock_surveys` | `` | `TABLE(surveys_created integer, users_covered integer)` | no | VOLATILE |
| `get_active_matches` | `p_user_id uuid` | `json` | YES | VOLATILE |
| `get_active_strike_count` | `target_user_id uuid` | `integer` | no | VOLATILE |
| `get_campus_stats` | `p_university text, p_requesting_user_id uuid DEFAULT NULL::uuid` | `json` | YES | STABLE |
| `get_crushes_on_me` | `` | `TABLE(user_id uuid)` | YES | VOLATILE |
| `get_current_week_start` | `` | `timestamp with time zone` | no | STABLE |
| `get_daily_grid` | `p_user_id uuid, p_grid_date date DEFAULT CURRENT_DATE` | `json` | YES | VOLATILE |
| `get_dashboard_stats` | `p_user_id uuid` | `TABLE(surveys_completed integer, total_matches integer, accepted_matches integer, match_rate numeric, friends_count integer, current_streak integer, prospective_partners integer, surveys_today integer, matches_today integer)` | YES | VOLATILE |
| `get_dashboard_summary` | `p_user_id uuid` | `jsonb` | YES | VOLATILE |
| `get_friend_grids` | `p_user_id uuid, p_grid_date date DEFAULT CURRENT_DATE` | `json` | YES | VOLATILE |
| `get_friend_stats` | `p_user_id uuid` | `TABLE(friend_id uuid, friend_code text, first_name text, matches_introduced integer, successful_matches integer, match_success_rate numeric, matchmaker_badge text, badge_color text)` | YES | VOLATILE |
| `get_friend_unread_count` | `p_friendship_id uuid, p_user_id uuid` | `integer` | YES | VOLATILE |
| `get_leaderboard_data` | `p_current_user_id uuid, p_limit integer DEFAULT 50` | `TABLE(user_id uuid, first_name text, weekly_karma integer, rank bigint, total_participants bigint, rank_change integer)` | YES | VOLATILE |
| `get_match_pool_stats` | `p_user_id uuid` | `TABLE(total_eligible_users integer, already_matched integer, prospective_partners integer, filters_applied jsonb, breakdown_by_preference jsonb)` | YES | VOLATILE |
| `get_onboarding_validation_errors` | `p_user_id uuid` | `jsonb` | no | VOLATILE |
| `get_pending_proposals` | `p_user_id uuid, p_limit integer DEFAULT 10` | `json` | YES | VOLATILE |
| `get_task_progress` | `p_user_id uuid, p_task_date date DEFAULT CURRENT_DATE` | `json` | YES | VOLATILE |
| `get_todays_match_count` | `` | `TABLE(count integer)` | YES | VOLATILE |
| `get_todays_survey_count` | `` | `TABLE(count integer)` | YES | VOLATILE |
| `get_unread_count` | `p_match_id uuid, p_user_id uuid` | `integer` | YES | VOLATILE |
| `get_user_by_email` | `p_email text` | `TABLE(id uuid, email text, profile_completed boolean)` | YES | STABLE |
| `get_user_exit_score` | `target_user_id uuid, days integer DEFAULT 30` | `numeric` | no | VOLATILE |
| `get_user_karma` | `p_user_id uuid` | `json` | YES | VOLATILE |
| `get_user_proposals` | `p_user_id uuid` | `json` | YES | VOLATILE |
| `get_user_stats` | `p_user_id uuid` | `json` | YES | STABLE |
| `get_user_survey_status` | `p_user_id uuid` | `jsonb` | YES | VOLATILE |
| `handle_new_user_friend_code` | `` | `trigger` | YES | VOLATILE |
| `handle_updated_at` | `` | `trigger` | no | VOLATILE |
| `increment_karma_for_vote` | `p_user_id uuid` | `void` | YES | VOLATILE |
| `increment_proposal_tallies` | `p_proposal_id uuid, p_pool_yes integer, p_pool_no integer, p_friend_yes integer, p_friend_no integer, p_weighted_yes numeric, p_weighted_no numeric` | `void` | YES | VOLATILE |
| `increment_total_proposals` | `p_user_id uuid` | `void` | YES | VOLATILE |
| `kill_dead_streaks` | `` | `void` | YES | VOLATILE |
| `mark_friend_messages_as_read` | `p_friendship_id uuid, p_user_id uuid` | `void` | YES | VOLATILE |
| `mark_messages_as_read` | `p_match_id uuid, p_user_id uuid` | `integer` | YES | VOLATILE |
| `max` | `citext` | `citext` | no | IMMUTABLE |
| `min` | `citext` | `citext` | no | IMMUTABLE |
| `notify_new_match` | `` | `trigger` | YES | VOLATILE |
| `notify_new_message` | `` | `trigger` | YES | VOLATILE |
| `notify_proposal_deciding` | `` | `trigger` | YES | VOLATILE |
| `record_rate_limit_attempt` | `p_identifier text, p_action_type text, p_metadata jsonb DEFAULT '{}'::jsonb` | `boolean` | YES | VOLATILE |
| `regenerate_mock_surveys` | `` | `TABLE(surveys_created integer, users_covered integer)` | no | VOLATILE |
| `regexp_match` | `citext, citext` | `text[]` | no | IMMUTABLE |
| `regexp_match` | `citext, citext, text` | `text[]` | no | IMMUTABLE |
| `regexp_matches` | `citext, citext` | `SETOF text[]` | no | IMMUTABLE |
| `regexp_matches` | `citext, citext, text` | `SETOF text[]` | no | IMMUTABLE |
| `regexp_replace` | `citext, citext, text` | `text` | no | IMMUTABLE |
| `regexp_replace` | `citext, citext, text, text` | `text` | no | IMMUTABLE |
| `regexp_split_to_array` | `citext, citext` | `text[]` | no | IMMUTABLE |
| `regexp_split_to_array` | `citext, citext, text` | `text[]` | no | IMMUTABLE |
| `regexp_split_to_table` | `citext, citext` | `SETOF text` | no | IMMUTABLE |
| `regexp_split_to_table` | `citext, citext, text` | `SETOF text` | no | IMMUTABLE |
| `replace` | `citext, citext, citext` | `text` | no | IMMUTABLE |
| `send_friend_request` | `friend_code text` | `TABLE(success boolean, message text, friend_user_id uuid, request_id uuid, was_auto_accepted boolean)` | YES | VOLATILE |
| `should_ban_user` | `target_user_id uuid` | `boolean` | no | VOLATILE |
| `should_generate_mock_surveys` | `` | `boolean` | no | VOLATILE |
| `snapshot_daily_ranks` | `` | `json` | YES | VOLATILE |
| `snapshot_weekly_karma_rpc` | `` | `json` | YES | VOLATILE |
| `split_part` | `citext, citext, integer` | `text` | no | IMMUTABLE |
| `strpos` | `citext, citext` | `integer` | no | IMMUTABLE |
| `submit_grid_selection` | `p_anchor_user_id uuid, p_grid_id uuid, p_selected_candidate_id uuid, p_grid_date date DEFAULT CURRENT_DATE` | `json` | YES | VOLATILE |
| `submit_proposal_vote` | `p_voter_user_id uuid, p_proposal_id uuid, p_vote boolean` | `json` | YES | VOLATILE |
| `sync_location_to_location_city` | `` | `trigger` | no | VOLATILE |
| `texticlike` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `texticlike` | `citext, text` | `boolean` | no | IMMUTABLE |
| `texticnlike` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `texticnlike` | `citext, text` | `boolean` | no | IMMUTABLE |
| `texticregexeq` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `texticregexeq` | `citext, text` | `boolean` | no | IMMUTABLE |
| `texticregexne` | `citext, citext` | `boolean` | no | IMMUTABLE |
| `texticregexne` | `citext, text` | `boolean` | no | IMMUTABLE |
| `translate` | `citext, citext, text` | `text` | no | IMMUTABLE |
| `trigger_update_streak` | `` | `trigger` | no | VOLATILE |
| `update_deep_question_answers_updated_at` | `` | `trigger` | no | VOLATILE |
| `update_friend_badges_updated_at` | `` | `trigger` | no | VOLATILE |
| `update_friend_codes_updated_at` | `` | `trigger` | no | VOLATILE |
| `update_friend_streak` | `p_user_id uuid, p_friend_id uuid` | `void` | YES | VOLATILE |
| `update_match_status` | `` | `trigger` | no | VOLATILE |
| `update_onboarding_profile` | `p_user_id uuid, p_onboarding_data jsonb` | `TABLE(success boolean, error_code text, error_message text)` | no | VOLATILE |
| `update_updated_at_column` | `` | `trigger` | no | VOLATILE |
| `update_user_streak` | `p_user_id uuid` | `void` | no | VOLATILE |
| `validate_age_range` | `p_age integer` | `TABLE(is_valid boolean, error_message text)` | no | VOLATILE |
| `validate_complete_onboarding` | `p_user_id uuid` | `TABLE(is_valid boolean, error_code text, error_message text, field_name text)` | no | VOLATILE |
| `validate_deep_question_tier_coverage` | `p_user_id uuid` | `boolean` | no | VOLATILE |
| `validate_email_domain` | `` | `trigger` | YES | VOLATILE |
| `validate_height` | `p_height_inches integer` | `TABLE(is_valid boolean, error_message text)` | no | VOLATILE |
| `validate_match_preferences` | `p_age_min integer, p_age_max integer, p_preferred_gender text` | `TABLE(is_valid boolean, error_message text)` | no | VOLATILE |
| `validate_match_preferences` | `p_age_min integer, p_age_max integer, p_preferred_gender text, p_max_distance_miles integer` | `TABLE(is_valid boolean, error_message text)` | no | VOLATILE |
| `validate_photos_requirements` | `p_user_id uuid` | `TABLE(is_valid boolean, error_message text)` | no | VOLATILE |
| `validate_required_profile_fields` | `p_first_name text, p_last_name text, p_age integer, p_gender text[], p_location text, p_height_inches integer` | `TABLE(is_valid boolean, error_message text)` | no | VOLATILE |
| `verify_email_code` | `p_user_id uuid, p_email text, p_code text` | `boolean` | YES | VOLATILE |

## 4. Triggers

Total: **21 triggers**.

| name | table | event | timing | action |
|---|---|---|---|---|
| `update_deep_question_answers_updated_at` | `deep_question_answers` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `trigger_friend_badges_updated_at` | `friend_badges` | UPDATE | BEFORE | `EXECUTE FUNCTION update_friend_badges_updated_at()` |
| `trigger_max_featured_badges` | `friend_badges` | UPDATE | BEFORE | `EXECUTE FUNCTION enforce_max_featured_badges()` |
| `trigger_max_featured_badges` | `friend_badges` | INSERT | BEFORE | `EXECUTE FUNCTION enforce_max_featured_badges()` |
| `update_ghost_profiles_updated_at` | `ghost_profiles` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `trg_compute_karma_tier` | `karma_scores` | UPDATE | BEFORE | `EXECUTE FUNCTION compute_karma_tier()` |
| `trg_compute_karma_tier` | `karma_scores` | INSERT | BEFORE | `EXECUTE FUNCTION compute_karma_tier()` |
| `update_karma_scores_updated_at` | `karma_scores` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `update_match_exits_updated_at` | `match_exits` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `trg_notify_new_match` | `matches` | INSERT | AFTER | `EXECUTE FUNCTION notify_new_match()` |
| `update_matches_updated_at` | `matches` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `trg_notify_new_message` | `messages` | INSERT | AFTER | `EXECUTE FUNCTION notify_new_message()` |
| `set_onboarding_progress_updated_at` | `onboarding_progress` | UPDATE | BEFORE | `EXECUTE FUNCTION handle_updated_at()` |
| `set_profiles_updated_at` | `profiles` | UPDATE | BEFORE | `EXECUTE FUNCTION handle_updated_at()` |
| `trg_notify_proposal_deciding` | `proposals` | UPDATE | AFTER | `EXECUTE FUNCTION notify_proposal_deciding()` |
| `update_proposals_updated_at` | `proposals` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `update_roster_updated_at` | `roster` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `update_user_preferences_updated_at` | `user_preferences` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `update_user_profiles_updated_at` | `user_profiles` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |
| `trg_auto_suspend_on_report` | `user_reports` | INSERT | AFTER | `EXECUTE FUNCTION auto_suspend_on_reports()` |
| `update_user_settings_updated_at` | `user_settings` | UPDATE | BEFORE | `EXECUTE FUNCTION update_updated_at_column()` |

## 5. Suspicious / unexplained items

### 5.1 Prod-only tables (not in known migration chain)

These tables exist in production but are NOT part of the documented migration chain in `supabase/migrations/`. They need backfill migrations so local dev mirrors prod.

#### `allowed_email_domains`

**5 columns, 2 indexes, 1 policies, RLS: ON**

| # | name | data_type | nullable | default |
|---|---|---|---|---|
| 1 | `id` | `uuid` (uuid) | NO | `gen_random_uuid()` |
| 2 | `domain` | `text` (text) | NO |  |
| 3 | `description` | `text` (text) | YES |  |
| 4 | `is_active` | `bool` (boolean) | YES | `true` |
| 5 | `created_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |

#### `introductions`

**10 columns, 1 indexes, 3 policies, RLS: ON**

| # | name | data_type | nullable | default |
|---|---|---|---|---|
| 1 | `id` | `uuid` (uuid) | NO | `gen_random_uuid()` |
| 2 | `matchmaker_id` | `uuid` (uuid) | NO |  |
| 3 | `person_a_id` | `uuid` (uuid) | NO |  |
| 4 | `person_b_id` | `uuid` (uuid) | NO |  |
| 5 | `note` | `text` (text) | YES |  |
| 6 | `status` | `text` (text) | NO | `'suggested'::text` |
| 7 | `person_a_response` | `text` (text) | YES |  |
| 8 | `person_b_response` | `text` (text) | YES |  |
| 9 | `created_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |
| 10 | `resolved_at` | `timestamptz` (timestamp with time zone) | YES |  |

#### `onboarding_progress`

**4 columns, 1 indexes, 1 policies, RLS: ON**

| # | name | data_type | nullable | default |
|---|---|---|---|---|
| 1 | `user_id` | `uuid` (uuid) | NO |  |
| 2 | `current_step` | `text` (text) | NO | `'phone'::text` |
| 3 | `data` | `jsonb` (jsonb) | NO | `'{}'::jsonb` |
| 4 | `updated_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |

#### `profiles`

**36 columns, 1 indexes, 3 policies, RLS: ON**

| # | name | data_type | nullable | default |
|---|---|---|---|---|
| 1 | `id` | `uuid` (uuid) | NO |  |
| 2 | `first_name` | `text` (text) | NO |  |
| 3 | `last_name` | `text` (text) | NO |  |
| 4 | `age` | `int4` (integer) | NO |  |
| 5 | `gender` | `_text` (ARRAY) | YES | `'{}'::text[]` |
| 6 | `pronouns` | `text` (text) | YES |  |
| 7 | `pronouns_list` | `_text` (ARRAY) | YES | `'{}'::text[]` |
| 8 | `custom_gender` | `text` (text) | YES |  |
| 9 | `hometown` | `text` (text) | YES |  |
| 10 | `location` | `text` (text) | NO |  |
| 11 | `current_job` | `text` (text) | YES |  |
| 12 | `company_position` | `text` (text) | YES |  |
| 13 | `education_level` | `text` (text) | YES |  |
| 14 | `school` | `text` (text) | YES |  |
| 15 | `height_inches` | `int4` (integer) | YES |  |
| 16 | `ethnicity` | `text` (text) | YES |  |
| 17 | `religion` | `text` (text) | YES |  |
| 18 | `political_leaning` | `text` (text) | YES |  |
| 19 | `has_children` | `text` (text) | YES |  |
| 20 | `family_plans` | `text` (text) | YES |  |
| 21 | `drinking_frequency` | `text` (text) | YES |  |
| 22 | `cannabis_frequency` | `text` (text) | YES |  |
| 23 | `tobacco_frequency` | `text` (text) | YES |  |
| 24 | `other_drugs_frequency` | `text` (text) | YES |  |
| 25 | `interests` | `_text` (ARRAY) | YES | `'{}'::text[]` |
| 26 | `values` | `_text` (ARRAY) | YES | `'{}'::text[]` |
| 27 | `bio` | `text` (text) | YES |  |
| 28 | `is_verified` | `bool` (boolean) | YES | `false` |
| 29 | `is_paused` | `bool` (boolean) | YES | `false` |
| 30 | `profile_completed` | `bool` (boolean) | YES | `false` |
| 31 | `created_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |
| 32 | `updated_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |
| 33 | `last_active_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |
| 34 | `latitude` | `float8` (double precision) | YES |  |
| 35 | `longitude` | `float8` (double precision) | YES |  |
| 36 | `interested_in_genders` | `_text` (ARRAY) | YES | `'{}'::text[]` |

#### `roster`

**7 columns, 2 indexes, 2 policies, RLS: ON**

| # | name | data_type | nullable | default |
|---|---|---|---|---|
| 1 | `id` | `uuid` (uuid) | NO | `gen_random_uuid()` |
| 2 | `matchmaker_id` | `uuid` (uuid) | NO |  |
| 3 | `user_id` | `uuid` (uuid) | YES |  |
| 4 | `ghost_profile_id` | `uuid` (uuid) | YES |  |
| 5 | `status` | `text` (text) | NO | `'active'::text` |
| 6 | `created_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |
| 7 | `updated_at` | `timestamptz` (timestamp with time zone) | YES | `now()` |

#### `waitlist_signups`

**16 columns, 8 indexes, 2 policies, RLS: ON**

| # | name | data_type | nullable | default |
|---|---|---|---|---|
| 1 | `id` | `uuid` (uuid) | NO | `uuid_generate_v4()` |
| 2 | `created_at` | `timestamptz` (timestamp with time zone) | NO | `now()` |
| 5 | `email` | `citext` (USER-DEFINED) | NO |  |
| 6 | `phone` | `text` (text) | YES |  |
| 7 | `location` | `text` (text) | YES |  |
| 8 | `source` | `text` (text) | YES |  |
| 9 | `user_agent` | `text` (text) | YES |  |
| 10 | `ip` | `inet` (inet) | YES |  |
| 11 | `consent` | `bool` (boolean) | NO | `true` |
| 12 | `token_hash` | `text` (text) | YES |  |
| 13 | `confirmation_sent_at` | `timestamptz` (timestamp with time zone) | YES |  |
| 14 | `confirmed_at` | `timestamptz` (timestamp with time zone) | YES |  |
| 15 | `token_expires_at` | `timestamptz` (timestamp with time zone) | YES |  |
| 16 | `name` | `text` (text) | NO |  |
| 17 | `interest_type` | `text` (text) | YES |  |
| 18 | `student_email` | `text` (text) | YES |  |

### 5.2 Redundant / dual-column patterns (possible drift)

Columns that look suspicious because they store the same semantic value twice, or overlap with other columns.

**Plaintext + hash pairs** (store raw value alongside its hash — usually a legacy/drift smell):

| table | plaintext column | hash column |
|---|---|---|
| `email_verification_codes` | `code` | `code_hash` |

**`email_verification_codes` columns:** `id`, `user_id`, `email`, `code`, `attempts`, `max_attempts`, `expires_at`, `verified_at`, `created_at`, `code_hash`, `used`

Both `code` and `code_hash` exist — this is a classic drift smell. Prod is likely mid-migration from plaintext codes to hashed codes. Check whether `code` should be removed after a hash cutover.

### 5.3 RLS-disabled tables

None — all 38 tables have RLS enabled.

### 5.4 Known-chain tables missing from prod

The following tables are created somewhere in the local migration chain but do NOT exist in production:

- `daily_pairings` — expected; daily-pairings feature was scrapped pre-launch.
- `daily_surveys` — expected; scrapped alongside daily pairings.
- `endorsements` — expected; dropped pre-launch (endorsement system replaced by proposal system).
- `friend_proposals` — likely renamed. Check whether `proposals` superseded it, or whether a migration still references it.

**Action required:** ensure local migration chain also drops `daily_pairings`, `daily_surveys`, `endorsements`, and `friend_proposals` by the end of the chain, or they will exist locally but not in prod.

### 5.5 Dropped-column residue (ordinal_position gaps)

Postgres preserves the column ordinal when a column is dropped, so gaps in `ordinal_position` indicate columns that were added and later dropped. Tables with gaps:

| table | ordinal positions present | implication |
|---|---|---|
| `user_preferences` | 1, 2, **4**–20 (gap at 3) | 1 column was dropped |
| `waitlist_signups` | 1, 2, **5**–18 (gap at 3–4) | 2 columns were dropped |

When recreating these tables in a fresh local env via `CREATE TABLE`, you won't reproduce these gaps — and that's fine (they only show up in `information_schema`). Useful context: these tables have been refactored in prod beyond what the current local migration chain shows.

### 5.6 Tables with NO RLS policies (but RLS ON — effectively locked)

These tables have RLS enabled but no policies, so non-service-role access is fully denied:

- `email_unsubscribes`
- `notification_log`
- `rate_limit_attempts`
- `support_reply_context`

These are service-role-only tables (accessed only by edge functions or admin code paths). This is intentional — confirm when recreating locally that the same policy structure is reproduced (i.e., RLS ON + no policies).

