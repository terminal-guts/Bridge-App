# Edge Functions Registry

Last updated: 2026-04-19

**To audit parity:** `./scripts/check-edge-function-parity.sh` — compares prod-deployed functions vs the `supabase/functions/` folder.

## Deployment Status Key

`DEPLOYED` = live in production | `LOCAL_ONLY` = tested locally, not yet deployed

## Current parity (2026-04-19)

- Prod-deployed: **44** functions
- In repo: **34** function folders
- Shared: **33**

### Deployed in prod but NOT in repo (11)

**Legacy cruft (9)** — predate current repo, never cleaned up. No calls from `src/` or any current edge function. Safe to undeploy with user approval:

```
accept_match              exit_match               generate_daily_survey
generate_match_candidates generate-daily-pairings  generate-daily-surveys
record_survey_answers     reject_match             send_message
```

**Possibly-live but missing from repo (2)** — not referenced in `src/`, but may be called by crons or other edge functions. Investigate before undeploying:

- `send-sms`
- `send-nudge`

### In repo but NOT deployed to prod (1)

- `moderate-image` — LOCAL_ONLY. `src/services/imageModerationService.ts` calls it. Image moderation therefore works locally but fails open in prod. (Tracked on post-launch bug list.)

## User-Facing Functions (JWT Required)

| Function | Status | Version | Purpose |
|----------|--------|---------|---------|
| assign-new-user-proposals | DEPLOYED | v4 | Assign existing proposals to newly verified users |
| delete-account | DEPLOYED | v16 | Cascade-delete user across all tables |
| exit-match | DEPLOYED | v11 | User exits an active match |
| generate-photo-blurhash | DEPLOYED | v4 | Generate blurhash placeholders for photos |
| generate-proposal-for-user | DEPLOYED | v17 | Generate a new proposal specifically for a user |
| get-leaderboard | DEPLOYED | v18 | Karma leaderboard data |
| get-proposals-for-voting | DEPLOYED | v31 | Get proposals for voting gate |
| get-stats | DEPLOYED | v8 | Personal and campus statistics |
| moderate-image | LOCAL_ONLY | v1 | Image moderation (face + safe-search) via Google Vision — fails open when `GOOGLE_VISION_API_KEY` unset |
| moderate-text | DEPLOYED | v4 | Content moderation via AI |
| notify-report | DEPLOYED | v8 | Send report notification email via Resend |
| process-decision | DEPLOYED | v19 | Process user's accept/reject on a proposal |
| process-vote | DEPLOYED | v31 | Process a vote on a proposal |
| reject-match | DEPLOYED | v11 | User rejects a match |
| send-support-message | DEPLOYED | v15 | Send message in support chat |
| submit-recommendation | DEPLOYED | v13 | Submit a friend recommendation |
| suggest-friend-match | DEPLOYED | v9 | Suggest two friends as a match |

## Scheduled Functions (Service Role Required)

| Function | Status | Version | Schedule (UTC) | Schedule (CST) | Purpose |
|----------|--------|---------|---------------|----------------|---------|
| generate-proposals | DEPLOYED | v39 | `0 0 * * *` | 7:00 PM | Generate daily proposals |
| proposal-lifecycle | DEPLOYED | v28 | `55 23 * * *` + `0 */4 * * *` | 6:55 PM + 4-hourly | Expire/advance proposals |
| snapshot-weekly-karma | DEPLOYED | v11 | `0 0 * * 1` | Sun 7:00 PM | Weekly karma baseline |
| notify-streak-at-risk | DEPLOYED | v11 | `0 23 * * *` | 6:00 PM | Warn users about expiring streaks |
| notify-vote-reminder | DEPLOYED | v12 | `0 1 * * *` | 8:00 PM | Nudge users to vote |
| notify-morning-leaderboard | DEPLOYED | v11 | `30 13 * * *` | 8:30 AM | Leaderboard position update |
| notify-dormant-users | DEPLOYED | v10 | `0 17 * * *` | 12:00 PM | Re-engagement nudge |
| notify-ice-breaker | DEPLOYED | v12 | `0 */4 * * *` | Every 4h | Nudge unmessaged matches |
| notify-match-expiring | DEPLOYED | v10 | `30 */4 * * *` | Every 4h +30m | Warn about expiring matches |
| notify-transactional | DEPLOYED | v12 | (trigger-based) | — | New match/message/decision push |
| send-weekly-summary | DEPLOYED | v14 | (manual) | — | Weekly summary email |

## Anonymous Functions (No JWT)

| Function | Status | Version | Flag | Purpose |
|----------|--------|---------|------|---------|
| invite-redirect | DEPLOYED | v13 | — | SMS invite link landing page |
| receive-support-reply | DEPLOYED | v19 | — | Webhook for support email replies |
| send-email-verification | DEPLOYED | v17 | — | Rice email verification (phone-auth users) |
| validate-reviewer-access | DEPLOYED | v9 | — | App Store reviewer password check |

## Local-Only (Not Yet Deployed)

| Function | Status | Flag | Purpose | Depends On |
|----------|--------|------|---------|-----------|
| email-signup | LOCAL_ONLY | `--no-verify-jwt` | OTP code send + verify for signup (Resend direct) | email_verification_codes table (with `ip_address` column from migration #83), get_user_by_email RPC, RESEND_API_KEY |
| email-unsubscribe | DORMANT | `--no-verify-jwt` | Handle email unsubscribe requests. **Not scheduled for deploy** as of 2026-04-19 — `email-signup` no longer emits `List-Unsubscribe` headers since we only send transactional OTP codes (nothing to unsubscribe from). Function source kept for possible future marketing-email stream. | email_unsubscribes table (already in prod) |

## Shared Utilities (`supabase/functions/_shared/`)

| File | Purpose |
|------|---------|
| admin-auth.ts | `requireServiceRole()` with constant-time comparison |
| constants.ts | Shared configuration constants |
| cors.ts | CORS headers for edge functions |
| scoring.ts | Proposal/matching compatibility algorithm (35KB) |
| send-push.ts | Push notification sender (Expo) |
| send-sms.ts | Twilio SMS sender |
| supabase-client.ts | `createAdminClient()` factory |
| types.ts | Shared TypeScript interfaces |

## Deployment Commands

```bash
# Deploy a JWT-required function
supabase functions deploy FUNCTION_NAME

# Deploy an anonymous function (no JWT check)
supabase functions deploy FUNCTION_NAME --no-verify-jwt

# Serve locally for testing
supabase functions serve FUNCTION_NAME --no-verify-jwt --env-file supabase/.env.local

# Check deployment status
supabase functions list
```
