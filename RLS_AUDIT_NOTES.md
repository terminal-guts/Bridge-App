# RLS Audit Notes — Bridge App

**Date:** March 10, 2026
**Auditor:** Claude (RLS security audit)
**Scope:** All Supabase tables, frontend services, edge functions

---

## Deployment Order

1. **Tier 1** (`20260310_rls_tier1_sensitive.sql`) → Test: messaging, matches, profiles, photos, settings
2. **Tier 2** (`20260310_rls_tier2_important.sql`) → Test: voting flow, friend list, karma display
3. **Tier 3** (`20260310_rls_tier3_general.sql`) → Test: deep questions, friend codes, blocking, preferences

**Never deploy all 3 at once.** Each tier should be deployed, tested for 24h minimum, then proceed.

---

## Testing Steps Per Tier

### Tier 1
- [ ] Log in as a user → verify profile loads (user_profiles SELECT)
- [ ] View another user's profile → verify it loads (user_profiles SELECT all auth)
- [ ] Update your own profile → verify save works (user_profiles UPDATE)
- [ ] Open an active match → verify messages load (messages SELECT)
- [ ] Send a message in a match → verify it appears (messages INSERT)
- [ ] Check notification settings → verify they load (user_settings SELECT)
- [ ] Toggle a notification setting → verify it saves (user_settings UPDATE)
- [ ] Verify Realtime: messages and matches subscriptions still fire
- [ ] Verify dev tools: match INSERT will fail (expected, dev-only)

### Tier 2
- [ ] Open the voting screen → verify proposals load (proposals SELECT)
- [ ] Cast a vote → verify it registers (proposal_votes INSERT, pool_vote_assignments UPDATE)
- [ ] Accept/decline a passed proposal → verify it updates (proposals UPDATE)
- [ ] Open friends list → verify all friends appear (friends SELECT both directions)
- [ ] Remove a friend → verify both directions removed (friends DELETE)
- [ ] Block a user → verify friendship removed both ways (friends DELETE + blocked_users INSERT)
- [ ] View karma on profile → verify it displays (karma_scores SELECT)
- [ ] Send a friend message → verify it works (friend_messages, already had RLS)
- [ ] Verify Realtime: proposals subscription still fires for voting updates

### Tier 3
- [ ] View deep question answers on a profile (deep_question_answers SELECT)
- [ ] Edit your own deep question answers (deep_question_answers UPDATE)
- [ ] View your friend code (friend_codes SELECT)
- [ ] Add a friend by code (add_friend_by_code RPC, SECURITY DEFINER)
- [ ] Block a user → verify they appear in both outgoing and incoming block checks
- [ ] Unblock a user → verify it works
- [ ] View/edit matching preferences (user_preferences SELECT/UPDATE)
- [ ] End a match → verify match_exits record is created
- [ ] Verify friend recommendations count (communityBackendService.ts:562) now returns data
  (was previously returning 0 — this tier FIXES the bug)

---

## Frontend Queries Needing Follow-up

These queries will break after RLS is enabled. All are **dev-only code** and do not affect production users:

| File | Line | Table | Operation | Issue |
|------|------|-------|-----------|-------|
| `developerService.ts` | 58 | `matches` | INSERT | No INSERT policy (matches via edge fn only) |
| `developmentDataService.ts` | 321 | `friends` | INSERT | No INSERT policy (via RPC only) |
| `developmentDataService.ts` | 328 | `friend_codes` | INSERT | No INSERT policy (via trigger only) |

**Recommended fix:** Create a SECURITY DEFINER RPC for dev data seeding, or gate dev service behind a service role client.

---

## Tables NOT Given RLS (and why)

| Table | Status | Reason |
|-------|--------|--------|
| `rate_limit_config` | RLS ENABLED, SELECT(TRUE) | Public read config — correct |
| `rate_limit_attempts` | RLS ENABLED, no policies | Only accessed via SECURITY DEFINER RPCs — correct |
| `support_conversations` | RLS ENABLED, ALL(own) | Already has correct policies |
| `support_messages` | RLS ENABLED, SELECT+INSERT(own) | Already has correct policies |
| `user_reports` | RLS ENABLED, SELECT+INSERT(own) | Already has correct policies |
| `daily_surveys` | DROPPED | Table no longer exists |
| `endorsements` | DROPPED | Table no longer exists |

---

## Edge Functions — All Safe

All 15 edge functions use `createAdminClient()` (service role key), which bypasses RLS entirely. No edge function uses the anon key for data mutations.

---

## Existing Bug Fixed by This Audit

**`friend_recommendations` table** has had RLS enabled since creation (March 5, 2026) but **zero SELECT policies**. Frontend queries at `communityBackendService.ts:562` and `:997` have been silently returning 0 rows. Tier 3 adds the missing SELECT policy, fixing this bug.

---

## Security Notes

### Intentionally Broad SELECT Policies
- **`proposals`**: All authenticated users can read ALL proposals. This is by design — the community voting flow requires users to see proposals they're assigned to vote on. Vote assignment is enforced at the edge function level (`get-proposals-for-voting`), not by RLS.
- **`proposal_votes`**: All authenticated users can read all votes. Needed for vote activity display.
- **`user_profiles`**, **`user_photos`**, **`deep_question_answers`**: All authenticated users can read all rows. Needed for viewing profiles in proposals, matches, and friend lists.

### Service-Role-Only Write Tables
These tables have no INSERT/UPDATE policies, meaning only service role (edge functions, SECURITY DEFINER RPCs) can write:
- `matches` (INSERT dropped in Tier 1)
- `proposals` (INSERT dropped in Tier 2)
- `karma_scores` (INSERT + UPDATE dropped in Tier 2)
- `friend_recommendations` (never had write policies)
- `friends` (no INSERT/UPDATE — handled by SECURITY DEFINER RPCs)
- `friend_codes` (no INSERT — handled by trigger)

### RPC Functions That Bypass RLS (SECURITY DEFINER)
- `add_friend_by_code()` — reads friend_codes, inserts friends
- `mark_messages_as_read()` — updates messages
- `get_unread_count()` — reads messages
- `mark_friend_messages_as_read()` — updates friend_messages
- `get_friend_unread_count()` — reads friend_messages
- `update_friend_streak()` — updates friends
- `freeze_inactive_streaks()` — updates friends
- `kill_dead_streaks()` — updates friends
- `increment_karma_for_vote()` — inserts/updates karma_scores
- `apply_karma_on_outcome()` — updates karma_scores, proposal_votes
- `increment_total_proposals()` — updates karma_scores
- `check_rate_limit()` — reads rate_limit_config, rate_limit_attempts
- `record_rate_limit_attempt()` — inserts rate_limit_attempts
- `delete_user_account()` — deletes across all tables
- `handle_new_user_friend_code()` — inserts friend_codes (trigger)

### Potential Future Concern: `get_friend_stats` RPC
`friendService.ts:599` calls `supabase.rpc('get_friend_stats')`. This function was not found in the migration files audited. If it exists and is NOT `SECURITY DEFINER`, it will be subject to RLS on any tables it queries. **Verify this function's security context before deploying.**
