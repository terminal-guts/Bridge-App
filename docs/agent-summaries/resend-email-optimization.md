# Agent Summary — Resend Email Optimization

**Agent role:** Resend email delivery specialist on `plan/proposal-gate-overhaul`.
**Scope:** `supabase/functions/email-signup/`, `supabase/functions/email-unsubscribe/`, the frontend auth screens that invoke them, related `authService.ts` functions, DNS, email-deliverability docs.
**Session dates:** 2026-04-18 → 2026-04-19.
**Last updated:** 2026-04-19 (final — all email work is code-complete and live-verified on local).

---

## TL;DR — what a master agent needs to know in 30 seconds

1. **The new auth path (Resend-direct OTP email) is LOCAL_ONLY.** Prod still runs the legacy `send-email-verification` v17 function which uses Supabase's built-in SMTP. That's the cause of the ~10s email latency.
2. **Exactly three artifacts need to deploy to prod** (in this order, with explicit user approval per CLAUDE.md):
   1. Migration `supabase/migrations/20260417000005_email_verification_codes_add_ip.sql` (entry #83)
   2. Migration `supabase/migrations/20260419000001_get_user_by_email_add_has_profile.sql` (entry #85, **owned by the onboarding agent**, but `email-signup` depends on it)
   3. Edge function `email-signup` via `supabase functions deploy email-signup --no-verify-jwt`
3. **Everything else email-related is already in prod** — `email_verification_codes` table, `email_unsubscribes` table, `RESEND_API_KEY` secret, SPF/DKIM/DMARC DNS.
4. **`email-unsubscribe` is DORMANT, not scheduled for deploy** (scope cut 2026-04-19). Transactional OTPs don't need unsubscribe; removing the `List-Unsubscribe` headers also removes the need for the function.
5. **DNS is clean.** DKIM + SPF verified green in Resend dashboard. DMARC `rua=mailto:saulbrauns@gmail.com` added 2026-04-19. First reports arrive within 48h.
6. **Risk after deploy:** low. Legacy `send-email-verification` v17 stays deployed as rollback; new auth flow is additive; both migrations are idempotent (`IF NOT EXISTS` / `DROP FUNCTION IF EXISTS`).
7. **End-to-end verified on local 2026-04-19.** Delivery `Sent → Delivered` in the same minute (Resend dashboard). Clean rendering in Gmail. Copy/paste works. Gmail thread-trim behavior defeated via per-email Ref. Phone notification preview reads cleanly.

---

## What's different on this branch vs `origin/main`

Authoritative delta for master-agent reconciliation.

### Edge functions — email scope

| Function | On `main` | On this branch | In prod | Deploy action |
|---|---|---|---|---|
| `email-signup` | ❌ not present | ✅ present, ~515 lines | ❌ not deployed | **DEPLOY** with `--no-verify-jwt` |
| `email-unsubscribe` | ❌ not present | ✅ present, 131 lines | ❌ not deployed | **DORMANT** — do not deploy. Source kept for possible future marketing stream. |
| `send-email-verification` | ✅ present (legacy) | ✅ present (legacy, unchanged) | ✅ DEPLOYED v17 | **LEAVE DEPLOYED** as rollback safety net for ≥ 7 days post-cutover; retire after that. |

### Migrations — email scope

| # | File | On `main` | On this branch | In prod | Deploy action |
|---|---|---|---|---|---|
| 71 | `20260412000002_check_email_exists.sql` | ✅ | ✅ | ✅ PRODUCTION | none |
| 72 | `20260415000001_email_verification_codes.sql` | ✅ | ✅ | ✅ PRODUCTION (table predated migration, file written to match prod shape) | none |
| 73 | `20260415000002_get_user_by_email_rpc.sql` | ✅ | ✅ | ✅ PRODUCTION | none |
| 74 | `20260415000003_email_unsubscribes.sql` | ✅ | ✅ | ✅ PRODUCTION | none (table exists but no function will hit it post-scope-cut) |
| 76 | `20260417000002_revoke_check_email_exists_anon.sql` | ✅ | ✅ | ✅ PRODUCTION | none |
| **83** | **`20260417000005_email_verification_codes_add_ip.sql`** | ❌ | ✅ | ❌ **LOCAL_ONLY** | **APPLY** via `scripts/supabase-exec.sh` **before** deploying `email-signup` |
| **85** | **`20260419000001_get_user_by_email_add_has_profile.sql`** | ❌ | ✅ | ❌ **LOCAL_ONLY** | **APPLY** via `scripts/supabase-exec.sh` **before** deploying `email-signup`. Owned by onboarding agent but `email-signup` reads the new `has_profile` return column to enforce Rule B signup-block. |

Migration #84 (`20260418000001_drop_dead_columns.sql`) is LOCAL_ONLY too but **unrelated to email** — it's from the onboarding-simplification agent. Included here only as a reminder that both #84 and #85 come from other scopes.

Migration #83 is idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Adds one column (`ip_address TEXT`) + one index (`idx_evc_ip_created ON email_verification_codes (ip_address, created_at)`). An earlier version of this migration also added a `flow TEXT` column — that was dropped 2026-04-19 as belt-and-suspenders with negligible security benefit. If any local DB still has a vestigial `flow` column from that earlier migration run, it's harmless (not referenced by the function).

Migration #85 is idempotent (`DROP FUNCTION IF EXISTS` then `CREATE OR REPLACE FUNCTION`). Adds `has_profile BOOLEAN` to the `get_user_by_email` RPC so `email-signup` can enforce **Rule B**: block signup whenever a `user_profiles` row exists for the email, regardless of completion state. Prevents accidental data overwrite from users re-running onboarding. The migration also re-`REVOKE`s from PUBLIC / anon / authenticated because `CREATE OR REPLACE` can reset grants in some Postgres versions.

### Frontend — email-scope files

| File | Status vs main | What changed |
|---|---|---|
| `src/services/authService.ts` | MODIFIED | New `sendEmailSignUpCode` / `verifyEmailSignUpCode` / `sendLoginCode` / `verifyLoginCode` that invoke `email-signup` edge function. Legacy `sendOtpToEmail` / `sendLoginOtpToEmail` / `verifyEmail` / `sendRiceEmailVerification` / `verifyRiceEmailCode` kept as `@deprecated` safety net. |
| `src/screens/onboarding/steps/EmailSignUpStep.tsx` | MODIFIED | Calls `sendEmailSignUpCode`. Handles `ACCOUNT_EXISTS` / `NO_ACCOUNT` / `RATE_LIMITED` error codes. Placeholder: `you@school.edu`. |
| `src/screens/onboarding/steps/EmailSignUpVerificationStep.tsx` | MODIFIED | Calls `verifyEmailSignUpCode`. `maxLength={64}` on hidden TextInput (paste-tolerant). "Didn't receive a code?" mini-loop → `EmailResendStep`. "Sign in instead" CTA after 2 failed attempts. |
| `src/screens/onboarding/steps/EmailResendStep.tsx` | NEW | Email re-entry mini-loop (fix typo + resend). Placeholder: `you@school.edu`. |
| `src/screens/auth/EmailVerificationScreen.tsx` | MODIFIED | Login-side OTP verify using `verifyLoginCode` + `sendLoginCode`. 60s resend cooldown. Paste-tolerant (handler strips non-digits, `maxLength={64}` on first cell). |
| `src/screens/auth/LoginScreen.tsx` | MODIFIED | Calls `sendLoginCode`. Placeholder: `you@school.edu`. |

### Secrets — email scope

| Secret | In prod? | In local | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | ✅ set | ✅ in `supabase/.env.local` | No change needed; already used by `notify-report` prod function. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ auto-injected | ✅ auto-injected | Standard. |

### Documentation — email scope

| File | Status |
|---|---|
| `docs/migrations/MIGRATION_LOG.md` | MODIFIED — entry #83 added (owned by this agent); #85 added (owned by onboarding agent, `email-signup` depends on) |
| `docs/migrations/EDGE_FUNCTIONS.md` | MODIFIED — `email-signup` LOCAL_ONLY, `email-unsubscribe` DORMANT |
| `docs/migrations/SECRETS.md` | Present (from earlier commits); lists `RESEND_API_KEY` |
| `docs/agent-summaries/resend-email-optimization.md` | This file |

---

## How the new email flow works

### Send (signup)
1. Client calls `sendEmailSignUpCode(email)` in `authService.ts`.
2. That invokes `email-signup` with `{ action: "send", email }`. No `flow` sent → defaults to signup.
3. Edge function runs **3 DB checks in parallel** (`Promise.all`):
   - Per-email rate limit: count rows in `email_verification_codes` where `email = ?` in last 10 min. Ceiling: 5.
   - Per-IP rate limit: count rows where `ip_address = ?` in last hour. Ceiling: 60.
   - User status: `get_user_by_email` RPC — returns `{ id, email, profile_completed, has_profile }`.
4. If signup and `has_profile === true` → return `{ error: "You already have an account. Tap Sign In instead.", code: "ACCOUNT_EXISTS" }` (**Rule B** — blocks even incomplete-profile users to prevent data overwrite).
5. If login and user doesn't exist → return `{ error: "...", code: "NO_ACCOUNT" }`.
6. Invalidate any existing unused codes for this email.
7. Generate 6-digit OTP (rejection sampling, no modulo bias). Hash with `SHA-256(code+":"+email)`. Generate 8-hex-char-with-dash email ref for Gmail thread-trim defeat.
8. POST to `https://api.resend.com/emails` with:
   - `from: "Bridge <verify@bridgedate.app>"`
   - `subject: "Your Bridge verification code"`
   - `html:` branded template (Arial, letter-spaced code in a card, no unsubscribe footer, no preheader, small `Email ID: XXXXXX-XX (not your code)` line at bottom)
   - `text:` plain-text alternative formatted for notification preview: `"Your Bridge verification code is 123456. This code expires in 10 minutes. ..."` — the period creates a sentence-break that survives notification whitespace collapse.
   - No `List-Unsubscribe` headers (transactional only).
9. Only after Resend 200: insert the code row with `email`, `code_hash`, `ip_address`, `expires_at`.
10. Return `{ ok: true }` to client.

### Verify
1. Client calls `verifyEmailSignUpCode(email, code)` or `verifyLoginCode(email, code)`. Neither sends `flow` — the cross-check was scope-cut 2026-04-19.
2. Edge function `handleVerify`:
   - Look up latest unused, non-expired code for email.
   - Check `attempts >= MAX_ATTEMPTS_PER_CODE` (5) — reject + mark `used=true` if over. Check happens **before** the increment so the ceiling is truly 5 attempts.
   - Increment attempts.
   - Constant-time hash compare.
   - Via admin client, create or find user, set a random temp password, sign in via anon client to get session tokens, mark code `used=true` only after session success.
   - Return `{ access_token, refresh_token, user: { id, email } }`.
3. Client calls `supabase.auth.setSession(...)` to establish the session.

### Resend (user taps "Didn't receive a code?")
- **Signup**: verification screen → `EmailResendStep` → user can correct email or keep → `sendEmailSignUpCode` → new code invalidates old.
- **Login**: 60s client cooldown → "Resend Code" → `sendLoginCode` → new code invalidates old.

### Reviewer bypass
`reviewer@bridgedate.app` and `reviewer2@bridgedate.app` skip Resend entirely; their auth is `validate-reviewer-access` + `signInWithPassword`. Edge function never sees these emails in production. Checked at every call site in `authService.ts`.

---

## Prod deploy plan (when user approves — user runs; agent never does)

**Precondition checks:**
- [ ] Confirm `RESEND_API_KEY` is set in prod (`supabase secrets list | grep RESEND`)
- [ ] Confirm the App Store build on users' phones still routes through legacy `send-email-verification` (it does — the new Resend path only exists post-merge + EAS build)
- [ ] Confirm migration #84 (onboarding-agent's drop-dead-columns) is being coordinated as part of the same deploy batch — the frontend changes that removed readers/writers of those columns are interlocked with the new auth flow's PR

**Steps (in order):**

```bash
# Step 1 — apply migration #83 (adds ip_address column + index)
./scripts/supabase-exec.sh "$(cat supabase/migrations/20260417000005_email_verification_codes_add_ip.sql)"

# Step 2 — apply migration #85 (DROP + CREATE get_user_by_email to add has_profile)
./scripts/supabase-exec.sh "$(cat supabase/migrations/20260419000001_get_user_by_email_add_has_profile.sql)"

# Step 3 — verify both landed
./scripts/supabase-query.sh "information_schema.columns" \
  "select=column_name&table=eq.email_verification_codes&column_name=eq.ip_address"
./scripts/supabase-exec.sh "SELECT pg_get_function_result('get_user_by_email(text)'::regprocedure)::text"
# Expected: table with id uuid, email text, profile_completed boolean, has_profile boolean

# Step 4 — deploy the edge function
supabase functions deploy email-signup --no-verify-jwt

# Step 5 — smoke test with a real @rice.edu address
# - Email arrives < 3s (was ~10s on legacy path)
# - Code pastes cleanly into the verify screen (6 digits in clipboard)
# - Gmail inbox preview shows "Your verification code:" body (no `•••` icon in fresh thread)
# - No visible unsubscribe footer
# - Phone notification preview reads "Your Bridge verification code is 123456. This code expires in..."

# Step 6 — update docs after deploy succeeds
# - MIGRATION_LOG.md: flip entry #83 and #85 from LOCAL_ONLY to PRODUCTION
# - EDGE_FUNCTIONS.md: move `email-signup` from Local-Only to Anonymous Functions (DEPLOYED)
```

**Rollback:** If the new function misbehaves, revert the app build — the deployed App Store app uses `send-email-verification` (still live). The migrations are additive and safe to leave in place even on rollback.

**Retirement (≥ 7 days after prod is stable):**
1. Remove `@deprecated` functions from `authService.ts` (`sendOtpToEmail`, `sendLoginOtpToEmail`, `verifyEmail`, `sendRiceEmailVerification`, `verifyRiceEmailCode`).
2. Mark `send-email-verification` DEPRECATED in `EDGE_FUNCTIONS.md`.
3. Delete `send-email-verification` after 30 days of zero invocations (edge function metrics).

---

## What is NOT in the deploy plan (and why)

| Item | Status | Rationale |
|---|---|---|
| `email-unsubscribe` function | DORMANT in repo | Removed `List-Unsubscribe` headers from outbound mail 2026-04-19 — transactional OTPs don't need unsubscribe. Source kept for potential future marketing-email stream. |
| `flow` column on `email_verification_codes` | Never shipped | Verify-side cross-check was belt-and-suspenders; attacker needs the victim's inbox to read the code anyway. Dropped 2026-04-19 to keep migration surface minimal. |
| Hidden preheader `<div style="display:none">` | Reverted 2026-04-19 | Gmail rendered it as a "show trimmed content" (•••) icon inside the code box, cluttering the email. Natural preview is fine for a message this short. |
| `List-Unsubscribe` / `List-Unsubscribe-Post` HTTP headers | Reverted 2026-04-19 | Transactional-only, per above. |
| Visible "Bridge at Rice University" footer | Removed | Purely decorative; `List-Unsubscribe` header was what actually mattered, and that's gone too. |
| DKIM prefix edit (`v=DKIM1; k=rsa;` before `p=...`) | No action needed | Resend dashboard shows DKIM green as-is. Bare `p=...` is RFC-6376-valid. |

---

## DNS state (as of 2026-04-19)

| Record | Host | Value | Verified? |
|---|---|---|---|
| SPF (apex) | `bridgedate.app` | `v=spf1 include:amazonses.com ~all` | ✅ green in Resend dashboard |
| SPF (Resend subdomain) | `send.bridgedate.app` | `v=spf1 include:amazonses.com ~all` | ✅ green |
| DKIM | `resend._domainkey.bridgedate.app` | `p=MIGfMA0...` (bare; no `v=DKIM1; k=rsa;` prefix) | ✅ green in Resend dashboard |
| Return-path MX | `send.bridgedate.app` | `10 feedback-smtp.us-east-1.amazonses.com` | ✅ |
| DMARC | `_dmarc.bridgedate.app` | `v=DMARC1; p=none; rua=mailto:saulbrauns@gmail.com;` | ✅ applied 2026-04-19 via Vercel DNS |

DNS is managed on Vercel (`ns1/ns2.vercel-dns.com`). **No further DNS changes needed for ship.** First DMARC reports from Gmail/Yahoo/Microsoft arrive at `saulbrauns@gmail.com` within 24–48h.

---

## Live verification (2026-04-19)

Tested end-to-end against local Supabase + real Resend-delivered emails to `sb278@rice.edu`:

- **Delivery latency**: Resend dashboard shows `Sent → Delivered` within the same minute (displayed as "0 minutes ago" in Gmail). Legacy path was ~10s; new path is effectively instant.
- **Template rendering** (Gmail web): clean. Letter-spaced code, full expiry line visible, no hidden-preheader artifact, no footer, no unsubscribe link, `Email ID: XXXXXX-XX (not your code)` line at bottom.
- **Copy/paste**: letter-spacing is CSS-only → clipboard contains `"682815"` not `"6 8 2 8 1 5"` → paste fills all 6 digits on the verify screen.
- **Thread-trim resistance (commit `7fbdca3`, test at 11:13 AM)**: confirmed fixed. Initial signup email (code 244978, ref `6fbc48`) and resend in the same Gmail conversation (code 300255, ref `22fecf`) both render in full — expiry line visible, no `•••`. Each email's unique Ref defeats Gmail's byte-repetition detection.
- **Resend Insights**: 10/11 checks passing. One warning (see Deferred section below).

**Mid-session false alarm investigated and fixed 2026-04-19:** earlier screenshots showed a `•••` icon (Gmail "show trimmed content") under the code box on 2nd+ emails in the same conversation thread. Root cause: Gmail threads OTP emails by subject+sender and collapses byte-identical passages (our expiry line) across threaded emails — the HTML Resend delivered was correct, Gmail was just hiding parts in the rendering. Commit `7fbdca3` adds a per-email `Email ID: XXXXXX-XX` line; commit `d76e957` reformatted it so a glance at a notification can't mistake it for the code. Also ruled out isolate caching by restarting the Docker edge-runtime container; source file has always been correct post-`e387005`, container live-mounts source directly.

---

## Deferred (post-launch polish, not blocking ship)

- **Send from a subdomain** (Resend Insights warning: "Use a subdomain"). Today we send from `Bridge <verify@bridgedate.app>` (apex domain). Resend recommends `verify@send.bridgedate.app` to isolate sender reputation from the apex domain. Cost: one-line change in `email-signup/index.ts` + a dashboard tweak in Resend to add the subdomain as a verified sending domain. We don't need this now — apex has no marketing-email reputation to protect, and Rice launch traffic is small. Revisit only if (a) adding marketing emails, (b) expanding beyond Rice, or (c) deliverability complaints surface in the DMARC reports.

---

## Known risks / open questions

- **IP rate limit 60/hr** is a guess calibrated against Rice shared NAT. If real orientation traffic outstrips it, bump to 120 or switch to per-email-only when one IP sends to many different emails (sign of sharing, not abuse).
- **No observability on function latency in prod yet.** Once deployed, pull edge-function logs to get p50/p95 of the Resend POST + the full function execution. If latency >3s at p95, investigate Resend region routing.
- **Rice mail servers may be stricter than Gmail.** If complaints come in post-deploy, check DMARC reports for which providers are flagging.
- **The `flow` column may still exist on local DBs** that ran an older version of migration #83. Harmless — no code references it. A `supabase db reset` on fresh local will produce a schema without the column.
- **Legacy `@deprecated` functions in `authService.ts`** (`sendOtpToEmail`, etc.) still work and are safe. After the new path is live for 7 days, remove them. Keeping them now maintains rollback safety.

---

## Branch commits touching email scope

**Mine** (all on `plan/proposal-gate-overhaul`, chronological):

| SHA | Message |
|---|---|
| `13bf354` | fix(email-signup): flow cross-check + off-by-one attempt counter + IP limit bump |
| `60f8a40` | perf(email-signup): parallelize pre-send checks + improve template deliverability |
| `d2a1928` | fix(email): restore code paste support — revert &nbsp; spacing, relax TextInput gates |
| `7dfc207` | docs(agent-summary): resend email optimization summary for master agent rollup |
| `e387005` | refactor(email-signup): drop preheader, List-Unsubscribe, and flow column |
| `258f843` | docs(agent-summary): rewrite resend handoff as authoritative reference |
| `4940831` | docs(agent-summary): add live verification results + subdomain deferred item |
| `7fbdca3` | fix(email-signup): add per-email ref to defeat Gmail thread content-trimming |
| `db6e755` | copy(email-inputs): placeholder "netid@rice.edu" → "you@school.edu" |
| `d76e957` | copy(email-signup): clarify Ref line so it can't be mistaken for the code |
| `55376cd` | copy(email-signup): plain-text body as complete sentence for notification preview |

**Prior email-related commits by other sessions on this branch** (for master-agent context):

| SHA | Message |
|---|---|
| `c43c52b` | feat: onboarding redesign — auth flow reorder + auto-preferences |
| `bf92ea9` | fix: harden email auth — IP rate limiting, login flow guard, anti-enumeration, XSS fix |
| `18deb7c` | feat: simplify verification to single 'Didn't receive a code?' flow |
| `980e3f0` | fix: EmailResendStep uses OnboardingLayout — matches all other steps |
| `480966e` | fix: login verification uses navigation.reset + mark old OTP funcs deprecated |
| `c8e355b` | chore: align email_verification_codes migration with prod + add schema dump script |
| `78aa6e8` | fix: photo flow + auth lockouts + auto-pref + step save errors |
| `94af64d` | feat(local-db): harden prod→local sync + Rule B signup-block migration (**adds migration #85 which `email-signup` depends on**) |

---

## Net effective function behavior (post all changes)

- **Primary send endpoint**: `email-signup` edge function (new).
- **Rate limits**: 5 codes per email per 10 min; 60 sends per IP per hour.
- **Error codes returned**: `ACCOUNT_EXISTS` (Rule B — blocks on any existing profile row, not just complete ones), `NO_ACCOUNT`, `RATE_LIMITED` (with `retryAfterSeconds`), `FLOW_MISMATCH` removed with scope cut.
- **Verify semantics**: 5 attempts per code (off-by-one fixed 2026-04-18). Code expiry 10 min.
- **Session creation**: admin-client creates/finds user → sets temp password → anon-client `signInWithPassword` → session tokens returned.
- **Template (HTML)**: Arial/Helvetica, letter-spaced code, no preheader, no unsubscribe footer, no `List-Unsubscribe` HTTP headers, `Email ID: XXXXXX-XX (not your code)` at the bottom for Gmail thread-trim defeat.
- **Template (plain-text)**: "Your Bridge verification code is 123456." as opening sentence — the period creates a notification-preview-friendly break that survives whitespace collapse on iOS/Android push notifications.
- **Paste**: both signup + login verify screens tolerate arbitrary clipboard content (up to 64 chars); handler strips non-digits and slices to 6.
- **Reviewer bypass preserved at every auth checkpoint**: `reviewer@bridgedate.app`, `reviewer2@bridgedate.app` → `validate-reviewer-access` + `signInWithPassword`.

---

## Files in scope (touched by this agent)

```
supabase/functions/email-signup/index.ts
supabase/migrations/20260417000005_email_verification_codes_add_ip.sql   (renamed from _add_flow_and_ip)
src/services/authService.ts
src/screens/onboarding/steps/EmailSignUpVerificationStep.tsx
src/screens/onboarding/steps/EmailSignUpStep.tsx            (placeholder only)
src/screens/onboarding/steps/EmailResendStep.tsx            (placeholder only)
src/screens/auth/EmailVerificationScreen.tsx
src/screens/auth/LoginScreen.tsx                            (placeholder only)
docs/migrations/MIGRATION_LOG.md                            (entry #83)
docs/migrations/EDGE_FUNCTIONS.md                           (email-signup / email-unsubscribe status)
docs/agent-summaries/resend-email-optimization.md           (this file)
```

## Files explicitly NOT touched (owned by other parallel agents)

- Profile/onboarding simplification: 14 step-file deletions, `OnboardingScreen.tsx`, `onboardingMapping.ts`, `profileCompleteness.ts`, `ProfileStrengthDashboard.tsx`, `EditLifestyleScreen.tsx`, `types/index.ts`, `AppNavigator.tsx`, `docs/plans/onboarding-simplification-v2.md`, **migration #84** (drop-dead-columns), **migration #85** (`get_user_by_email` + has_profile — `email-signup` depends on this but the migration itself is owned by the onboarding agent)
- Image moderation: `supabase/functions/moderate-image/` + `src/services/imageModerationService.ts` + related
- Proposal algorithm: `supabase/functions/_shared/scoring.ts`, `generate-proposals/index.ts`, `generate-proposal-for-user/index.ts`
- Cross-cutting policy docs: `CLAUDE.md` banner + `docs/migrations/README.md` banner
- UI: skeleton loaders PR (#32 merged)

The master agent should reconcile these per the normal rollup process.

---

## One-line deploy summary for master agent

> Apply migration `20260417000005_email_verification_codes_add_ip.sql` (entry #83), then migration `20260419000001_get_user_by_email_add_has_profile.sql` (entry #85), then `supabase functions deploy email-signup --no-verify-jwt`. Everything else is either already in prod, dormant, or reverted. Legacy `send-email-verification` v17 stays deployed as rollback safety net.

---
---

# PART 2 — Skeleton Loader Coverage

**Session date:** 2026-04-19
**Branch:** `plan/proposal-gate-overhaul`
**Trigger:** User reported Settings felt laggy ("thought the app glitched") and asked whether PR #32 should be merged into the feature branch, plus an independent audit of skeleton coverage.

---

## TL;DR (Part 2)

1. **PR #32 is merged** into `plan/proposal-gate-overhaul` (real 2-parent merge at `8f9c21e`). PR is closed on GitHub.
2. **Follow-up commit `14198c1`** adds 4 more skeletons (Settings, Chat, MatchPreferences, Badges) and fixes the Settings flicker the user reported.
3. Nothing deployed to prod. All changes are frontend-only and ride the normal EAS build review gate.
4. **Not yet visually tested in simulator** — only type-checked. Next step should be `npx expo start -c` and navigating into each screen.

---

## Merging PR #32

### PR #32 background
- Title: "Replace bare ActivityIndicator with layout-matching skeletons"
- Author: Jules bot (automated)
- Base: `main`, so ~30+ commits behind the current feature branch
- Touched 8 files, added 6 new skeleton components:
  - `BlockedUsersSkeleton`, `SuggestMatchSkeleton`, `ContactInviteSkeleton`, `ProfileMatchSkeleton`, `FriendListSkeleton`, `ProposalReviewSkeleton`

### Merge mechanics
- Clean merge except for one conflict in `src/screens/onboarding/steps/OnboardingProposalStep.tsx`: HEAD had a newer "no proposals available — here's how Bridge works" explainer that PR didn't know about.
- Resolution: keep HEAD's explainer for the empty-state path, adopt PR's `ProposalReviewSkeleton` for the loading-state path.

### History note (one piece of cruft)
There's a stale commit `e584f85` earlier in the branch titled "Merge PR #32: layout-matching skeleton loaders" that only contains the conflict resolution for `OnboardingProposalStep` — not a real merge. It's a residue from the first merge attempt where `git commit --no-edit` failed and dropped `MERGE_HEAD`. The actual merge is `8f9c21e`. Harmless, but noise if you read the log.

---

## Gap audit (independent follow-up)

After the PR merged, the skeleton agent grepped `ActivityIndicator` across `src/screens` and classified each usage as:
- **Primary loading state** — blocks the whole screen until data arrives. These need skeletons.
- **Inline / button indicator** — small spinner inside a button or row while an action runs. These stay as `ActivityIndicator`.

### Gaps PR #32 did NOT cover

| Screen / component | Severity | Fix applied |
|---|---|---|
| `SettingsScreen.tsx` | High (user-reported flicker) | Added `SettingsSkeleton` + gated render on both `profileLoaded && prefsLoaded` so matchmaker-only rows and toggle values don't pop in |
| `ChatScreen.tsx:452–462` | Medium | Replaced "Opening your conversation..." spinner with `ChatSkeleton` (alternating bubbles) |
| `MatchPreferencesScreen.tsx` | Medium | Replaced generic `LoadingState` with `MatchPreferencesSkeleton` (6 section-card placeholders) |
| `ProfileScreen.sections.tsx:232` | Low | Replaced bare `ActivityIndicator` in Badges tab with `BadgesSkeleton` |

### Deliberately NOT changed (correctly inline spinners)

- `BadgeAwardModal.tsx` — submit button spinner
- `FriendRequestCard.tsx` — accept/reject processing spinner
- `ShareMatchSheet.tsx` — "Creating your card..." preview spinner
- `ChatScreen.tsx:570` — send-message button spinner
- `SupportChatScreen.tsx:270` — send-message button spinner
- `AudioPlayer.tsx:110` — audio buffering spinner
- `MatchPreferencesScreen.tsx:374` — "Saving..." indicator
- `OnboardingScreen.tsx:701` — "Creating your profile..." blocking modal spinner (blocking flow, spinner is appropriate)
- `EditPhotosScreen.tsx:294` — per-thumbnail upload indicator
- `BlockedUsersScreen.tsx:242` — add-block button spinner
- `ContactInviteScreen.components.tsx:105` — add-friend button spinner
- `SuggestMatchScreen.tsx:208` — submit button spinner
- `ProfileMatchScreen.tsx:670` — like button spinner
- `EmailVerificationScreen.tsx:236` / `EmailSignUpVerificationStep.tsx:184` — "Verifying..." during OTP check

### Gaps also NOT covered (low priority, left alone)

- `OnboardingScreen.tsx:94` — `StepLoadingFallback` for Suspense boundary during step code-split. Briefly visible during step transitions. Could use a skeleton but the spinner is fine given how quickly steps resolve.

---

## Settings flicker fix (the user's actual report)

The user said Settings felt like "the app glitched." Root cause was not a missing skeleton — it was that `SettingsScreen` had **no loading state at all** and rendered immediately with defaults:

- `userRole` defaulted to `'dater'` → matchmaker-only rows ("Switch to Standard") rendered hidden, then popped in if the user is actually a matchmaker
- `prefsLoaded = false` → all 4 notification toggles rendered OFF, then flicked to their real values when `notificationPreferencesService.getPreferences()` resolved

Fix (`src/screens/profile/SettingsScreen.tsx`):
1. Added `profileLoaded` state, flipped to `true` in the `getUserProfile().then()` handler.
2. Added `isReady = profileLoaded && prefsLoaded` gate.
3. Render `<SettingsSkeleton />` while `!isReady`, real UI once both are loaded.

---

## Files changed (Part 2)

### From PR #32 (via merge commit `8f9c21e`)
```
src/components/ui/SkeletonLoader.tsx
src/components/ui/index.ts
src/components/community/proposal/ProposalReviewView.components.tsx
src/screens/community/SuggestMatchScreen.tsx
src/screens/friends/ContactInviteScreen.components.tsx
src/screens/onboarding/steps/OnboardingProposalStep.tsx  (conflict-resolved)
src/screens/profile/BlockedUsersScreen.tsx
src/screens/profile/ProfileMatchScreen.tsx
```

### From follow-up commit `14198c1`
```
src/components/ui/SkeletonLoader.tsx        (+4 new skeletons)
src/components/ui/index.ts                  (export new skeletons)
src/screens/profile/SettingsScreen.tsx      (skeleton + flicker fix)
src/screens/match/ChatScreen.tsx            (replace spinner)
src/screens/profile/MatchPreferencesScreen.tsx  (replace LoadingState)
src/screens/main/ProfileScreen.sections.tsx (replace badges spinner)
```

---

## Verification status (Part 2)

- [x] TypeScript: `npx tsc --noEmit -p tsconfig.json` — no new errors from the touched files. (Pre-existing test-file errors unrelated.)
- [ ] **Not run**: visual verification in simulator. Recommended next step: `npx expo start -c` and navigate:
  - Profile → Settings — confirm skeleton → settled UI, no toggle flicker
  - Match → any chat — confirm bubble skeleton on open
  - Profile → Match Preferences — confirm section-card skeleton
  - Profile → Badges tab — confirm 3-row badge skeleton

---

## Git history for skeleton work (last 5 relevant commits)

```
14198c1 feat(ui): add Settings / Chat / MatchPreferences / Badges skeletons  ← skeleton agent follow-up
1021515 fix(local-db): profile-photos bucket must be public to match prod    ← other session
8f9c21e Merge PR #32: layout-matching skeleton loaders                       ← real merge
94af64d feat(local-db): harden prod→local sync + Rule B signup-block migration  ← onboarding agent
e584f85 Merge PR #32: layout-matching skeleton loaders                       ← stale residue, see note above
```

---

## What's NOT part of the skeleton work

- No Supabase changes (no migrations, no RPC/policy edits, no function deploys, no secret rotation).
- No changes to production. Everything ships via EAS build → App Store review.
- No new tests added. Existing test suite has pre-existing errors unrelated to this work.
- GitHub PR #32 closed (it was auto-generated by Jules bot; content reaches main via the feature-branch merge, not via the PR).
