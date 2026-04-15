# Account Deletion Runbook

How to safely remove user accounts from production. Use for imposters, spam, test accounts, or any account that needs manual removal.

## Prerequisites

- Access to `scripts/supabase-exec.sh` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env`)
- The user's **auth ID** (UUID from `auth.users.id`), NOT their profile ID

## Step 1: Identify the account

Find the account by email, name, or auth ID:

```bash
# By name
scripts/supabase-exec.sh "SELECT json_agg(row_to_json(t)) FROM (
  SELECT up.id as profile_id, up.first_name, up.last_name, up.user_id as auth_id, au.email
  FROM user_profiles up JOIN auth.users au ON au.id = up.user_id
  WHERE LOWER(up.first_name) = 'firstname' OR LOWER(up.last_name) = 'lastname'
) t"

# By email
scripts/supabase-exec.sh "SELECT json_agg(row_to_json(t)) FROM (
  SELECT id as auth_id, email, created_at, last_sign_in_at FROM auth.users
  WHERE email = 'someone@rice.edu'
) t"
```

## Step 2: Assess impact

Before deleting, check what data the account has:

```bash
scripts/supabase-exec.sh "SELECT json_agg(row_to_json(t)) FROM (
  SELECT 'proposals' as tbl, count(*) as cnt FROM proposals
    WHERE user_a_id = '<AUTH_ID>' OR user_b_id = '<AUTH_ID>'
  UNION ALL
  SELECT 'friends', count(*) FROM friends
    WHERE user_id = '<AUTH_ID>' OR friend_id = '<AUTH_ID>'
  UNION ALL
  SELECT 'matches', count(*) FROM matches
    WHERE user_id_1 = '<AUTH_ID>' OR user_id_2 = '<AUTH_ID>'
  UNION ALL
  SELECT 'proposal_votes', count(*) FROM proposal_votes
    WHERE voter_user_id = '<AUTH_ID>'
  UNION ALL
  SELECT 'pool_vote_assignments', count(*) FROM pool_vote_assignments
    WHERE voter_id = '<AUTH_ID>'
  UNION ALL
  SELECT 'karma_scores', count(*) FROM karma_scores
    WHERE user_id = '<AUTH_ID>'
) t"
```

### What to look for

| Data | Impact of deletion |
|------|-------------------|
| **Active proposals** (status: pending/deciding) | Paired user loses their proposal. They'll get a new one in the next generation cycle (7:05PM Central). |
| **Active matches** (status: active) | Match is set to 'ended'. The other user sees the match disappear. |
| **Friends** | Friend connections deleted. Friends see the user disappear from their list. |
| **Votes** | Removed from tallies. Minor impact unless the account cast many votes. |
| **Pool vote assignments** | Cleaned up so the voting gate doesn't serve dead proposals. |

## Step 3: Delete the account

Use the `delete_user_account()` RPC — it handles all 30+ tables in the correct order:

```bash
scripts/supabase-exec.sh "SELECT delete_user_account('<AUTH_ID>')"
```

This runs as a single transaction. If anything fails, nothing is deleted.

### What the RPC does (in order)

1. Deletes pool_vote_assignments for proposals involving this user
2. Deletes all proposal_votes on this user's proposals
3. Nulls out `friend_suggestions.converted_proposal_id` references
4. **Hard-deletes proposals** (not soft-expire — prevents profile lookup crashes)
5. Ends active matches (sets status to 'ended')
6. Deletes this user's own votes + nulls `friend_of`/`recommend_to_id` references
7. Deletes match_exits, messages, friend_messages
8. Deletes friend_suggestions, friends, friend_codes
9. Deletes blocked_users, karma_scores, user_photos, user_settings, user_preferences
10. Deletes onboarding_progress, deep_question_answers, friend_badges
11. Deletes user_profiles
12. Deletes support_messages, support_conversations
13. Deletes karma snapshots, friend_streaks, friend_recommendations
14. Deletes user_reports, support_reply_context, email_verification_codes
15. **Deletes auth.users row** (cascades any remaining FKs)

## Step 4: Verify deletion

```bash
# Should return null
scripts/supabase-exec.sh "SELECT json_agg(row_to_json(t)) FROM (
  SELECT id, email FROM auth.users WHERE id = '<AUTH_ID>'
) t"
```

## Important notes

- **Always use auth ID** (from `auth.users.id`), not profile ID (from `user_profiles.id`)
- **Never manually delete from `auth.users` directly** — use the RPC, which cleans up all dependent tables first
- **Proposals are hard-deleted**, not soft-expired. Soft-expiring leaves dangling user references that crash profile lookups.
- **Matches are soft-ended** (status = 'ended'), not deleted — preserves match history.
- **The RPC is idempotent** — safe to call twice on the same ID (second call is a no-op since the user is already gone).
