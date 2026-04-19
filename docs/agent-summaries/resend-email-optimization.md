# Agent Summary — Resend Email Optimization

**Agent role:** Resend email delivery specialist on `plan/proposal-gate-overhaul`.
**Scope:** `supabase/functions/email-signup/`, `supabase/functions/email-unsubscribe/`, the frontend auth screens that invoke them, related `authService.ts` functions, DNS, email-deliverability docs.
**Session dates:** 2026-04-18 → 2026-04-19.
**Last updated:** 2026-04-19 (post scope-cut + post live verification).

---

## TL;DR — what a master agent needs to know in 30 seconds

1. **The new auth path (Resend-direct OTP email) is LOCAL_ONLY.** Prod still runs the legacy `send-email-verification` v17 function which uses Supabase's built-in SMTP. That's the cause of the ~10s email latency users report today.
2. **Two artifacts need to deploy to prod** (in this order, with explicit user approval per CLAUDE.md):
   - Migration `supabase/migrations/20260417000005_email_verification_codes_add_ip.sql`
   - Edge function `email-signup`
3. **Everything else is already in prod** — `email_verification_codes` table, `get_user_by_email` RPC, `email_unsubscribes` table, `RESEND_API_KEY` secret.
4. **`email-unsubscribe` is DORMANT, not scheduled for deploy** (scope cut 2026-04-19). Transactional OTPs don't need unsubscribe; removing the `List-Unsubscribe` headers also removes the need for the function.
5. **DNS is clean.** DKIM + SPF verified green in Resend dashboard. DMARC `rua=mailto:saulbrauns@gmail.com` added 2026-04-19. First reports arrive within 48h.
6. **Risk after deploy:** low. Legacy `send-email-verification` stays deployed as rollback; new auth flow is additive; migration is idempotent `IF NOT EXISTS`.
7. **Live-verified locally 2026-04-19 10:21 AM CT.** Code email sent via local `email-signup` → Resend dashboard shows `Sent → Delivered` in the same minute (0 m). Gmail shows a clean email: no `•••` icon, letter-spaced code, no footer. Resend's own Insights report: 10 checks passing, 1 minor warning (sending from apex instead of a subdomain) — deferred as post-launch polish, see below.

---

## What's different on this branch vs `origin/main`

This is the authoritative delta. Everything the master agent needs to reconcile.

### Edge functions — email scope only

| Function | On `main` | On this branch | In prod | Deploy action |
|---|---|---|---|---|
| `email-signup` | ❌ not present | ✅ present, 480 lines | ❌ not deployed | **DEPLOY** with `--no-verify-jwt` |
| `email-unsubscribe` | ❌ not present | ✅ present, 131 lines | ❌ not deployed | **DORMANT** — do not deploy. Source kept for possible future marketing stream. |
| `send-email-verification` | ✅ present (legacy) | ✅ present (legacy, unchanged) | ✅ DEPLOYED v17 | **LEAVE DEPLOYED** as rollback safety net for ≥ 7 days post-cutover; retire after that. |

### Migrations — email scope only

| # | File | On `main` | On this branch | In prod | Deploy action |
|---|---|---|---|---|---|
| 71 | `20260412000002_check_email_exists.sql` | ✅ | ✅ | ✅ PRODUCTION | none |
| 72 | `20260415000001_email_verification_codes.sql` | ✅ | ✅ | ✅ PRODUCTION (table predated migration, file written to match prod shape) | none |
| 73 | `20260415000002_get_user_by_email_rpc.sql` | ✅ | ✅ | ✅ PRODUCTION | none |
| 74 | `20260415000003_email_unsubscribes.sql` | ✅ | ✅ | ✅ PRODUCTION | none (table exists but no function will hit it post-scope-cut) |
| 76 | `20260417000002_revoke_check_email_exists_anon.sql` | ✅ | ✅ | ✅ PRODUCTION | none |
| 83 | `20260417000005_email_verification_codes_add_ip.sql` | ❌ | ✅ | ❌ LOCAL_ONLY | **APPLY** via `scripts/supabase-exec.sh` before deploying `email-signup` |

Migration #83 is idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Adds one column (`ip_address TEXT`) + one index (`idx_evc_ip_created ON email_verification_codes (ip_address, created_at)`). An earlier version of this migration also added a `flow TEXT` column — that was dropped 2026-04-19 as belt-and-suspenders with negligible security benefit. If any local DB still has the vestigial `flow` column from an earlier migration run, it's harmless (not referenced).

### Frontend — email-scope files

| File | Status vs main | What changed |
|---|---|---|
| `src/services/authService.ts` | MODIFIED | New `sendEmailSignUpCode` / `verifyEmailSignUpCode` / `sendLoginCode` / `verifyLoginCode` that invoke `email-signup` edge function. Legacy `sendOtpToEmail` / `sendLoginOtpToEmail` / `verifyEmail` / `sendRiceEmailVerification` / `verifyRiceEmailCode` kept as `@deprecated` safety net. |
| `src/screens/onboarding/steps/EmailSignUpStep.tsx` | MODIFIED | Calls `sendEmailSignUpCode`. Handles `ACCOUNT_EXISTS` / `NO_ACCOUNT` / `RATE_LIMITED` error codes from the edge function. |
| `src/screens/onboarding/steps/EmailSignUpVerificationStep.tsx` | MODIFIED | Calls `verifyEmailSignUpCode`. `maxLength={64}` on hidden TextInput (paste-tolerant). "Didn't receive a code?" mini-loop → `EmailResendStep`. "Sign in instead" CTA after 2 failed attempts. |
| `src/screens/onboarding/steps/EmailResendStep.tsx` | NEW | Email re-entry mini-loop (fix typo + resend). |
| `src/screens/auth/EmailVerificationScreen.tsx` | MODIFIED | Login-side OTP verify using `verifyLoginCode` + `sendLoginCode`. 60s resend cooldown. First OTP cell `maxLength={64}` (paste-tolerant); handler strips non-digits. |

### Secrets — email scope

| Secret | In prod? | In local | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | ✅ set | ✅ in `supabase/.env.local` | No change needed; already used by `notify-report` prod function. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ auto-injected | ✅ auto-injected | Standard. |

### Documentation — email scope

| File | Status |
|---|---|
| `docs/migrations/MIGRATION_LOG.md` | MODIFIED — entry #83 added, status `LOCAL_ONLY` |
| `docs/migrations/EDGE_FUNCTIONS.md` | MODIFIED — `email-signup` LOCAL_ONLY, `email-unsubscribe` DORMANT |
| `docs/migrations/SECRETS.md` | Present (from earlier commits); lists `RESEND_API_KEY` |
| `docs/agent-summaries/resend-email-optimization.md` | This file |

---

## How the new email flow works (current branch state)

### Send (signup)
1. Client calls `sendEmailSignUpCode(email)` in `authService.ts`.
2. That invokes `email-signup` with `{ action: "send", email }`. No `flow` sent → defaults to signup.
3. Edge function runs **3 DB checks in parallel** (`Promise.all`):
   - Per-email rate limit: count rows in `email_verification_codes` where `email = ?` in last 10 min. Ceiling: 5.
   - Per-IP rate limit: count rows where `ip_address = ?` in last hour. Ceiling: 60.
   - User status: `get_user_by_email` RPC.
4. If signup and user has `profile_completed = true` → return `{ error: "...", code: "ACCOUNT_EXISTS" }`.
5. If login and user doesn't exist → return `{ error: "...", code: "NO_ACCOUNT" }`.
6. Invalidate any existing unused codes for this email.
7. Generate 6-digit OTP (rejection sampling, no modulo bias). Hash with `SHA-256(code+":"+email)`.
8. POST to `https://api.resend.com/emails` with:
   - `from: "Bridge <verify@bridgedate.app>"`
   - `subject: "Your Bridge verification code"`
   - `html:` branded template (Arial, letter-spaced code, no unsubscribe footer, no preheader)
   - `text:` plain-text alternative (for deliverability + watchOS + screen readers)
   - No `List-Unsubscribe` headers (transactional only)
9. Only after Resend 200: insert the code row into `email_verification_codes` with `email`, `code_hash`, `ip_address`, `expires_at`. (`flow` is **not** persisted.)
10. Return `{ ok: true }` to client.

### Verify
1. Client calls `verifyEmailSignUpCode(email, code)` or `verifyLoginCode(email, code)`. Neither sends `flow` anymore.
2. Edge function invokes `handleVerify`:
   - Look up latest unused, non-expired code for email.
   - Check `attempts >= MAX_ATTEMPTS_PER_CODE` (5) — reject + mark `used=true` if over.
   - Increment attempts.
   - Constant-time hash compare.
   - Via admin client, create or find user, set a random temp password, sign in via anon client to get session tokens, mark code `used=true` only after session success.
   - Return `{ access_token, refresh_token, user: { id, email } }`.
3. Client calls `supabase.auth.setSession(...)` to establish the session.

### Resend (user taps "Didn't receive a code?")
- **Signup path**: verification screen → `EmailResendStep` → user can correct email or keep → `sendEmailSignUpCode` → new code invalidates old.
- **Login path**: 60s client cooldown → "Resend Code" → `sendLoginCode` → new code invalidates old.

### Reviewer bypass
`reviewer@bridgedate.app` and `reviewer2@bridgedate.app` skip Resend entirely; their auth is `validate-reviewer-access` + `signInWithPassword`. Edge function never sees these emails in production. This is checked before any `sendEmailSignUpCode` / `verifyEmailSignUpCode` / `sendLoginCode` / `verifyLoginCode` call in `authService.ts`.

---

## Deploy plan (when user approves)

**Precondition checks:**
- [ ] Confirm `RESEND_API_KEY` is set in prod (`supabase secrets list | grep RESEND`)
- [ ] Confirm the App Store build on users' phones still routes through legacy `send-email-verification` (it does — the new Resend path only exists post-merge)

**Steps (user runs; agent does not):**

1. **Apply migration #83 to prod:**
   ```bash
   # Feed the SQL file into the exec_sql RPC via the existing script.
   ./scripts/supabase-exec.sh "$(cat supabase/migrations/20260417000005_email_verification_codes_add_ip.sql)"
   ```

2. **Verify columns landed:**
   ```bash
   ./scripts/supabase-query.sh "information_schema.columns" \
     "select=column_name&table=eq.email_verification_codes&column_name=eq.ip_address"
   ```

3. **Deploy the function:**
   ```bash
   supabase functions deploy email-signup --no-verify-jwt
   ```

4. **Smoke test** — send yourself a code to a real `@rice.edu` address. Expect:
   - Email arrives < 3s (was ~10s on legacy path).
   - Code pastes cleanly into the verify screen (6 digits in clipboard).
   - Gmail inbox preview shows "Your verification code:" (no `•••` icon).
   - No visible unsubscribe footer.

5. **Update docs after deploy succeeds:**
   - `MIGRATION_LOG.md`: flip entry #83 from `LOCAL_ONLY` to `PRODUCTION`.
   - `EDGE_FUNCTIONS.md`: move `email-signup` from Local-Only section to Anonymous Functions (DEPLOYED).

6. **Legacy path retirement** (≥ 7 days later):
   - Remove `@deprecated` functions from `authService.ts`.
   - Mark `send-email-verification` DEPRECATED in `EDGE_FUNCTIONS.md`.
   - Delete after 30 days of zero invocations (visible in edge function metrics).

**Rollback:** If the new function misbehaves, revert the app build — the deployed app uses `send-email-verification` (still live). The migration is additive and safe to leave in place.

---

## What is NOT in the deploy plan (and why)

| Item | Status | Rationale |
|---|---|---|
| `email-unsubscribe` function | DORMANT in repo | Removed `List-Unsubscribe` headers from outbound mail 2026-04-19 — transactional OTPs don't need unsubscribe. Source kept so a future marketing-email stream can reuse it. |
| `flow` column on `email_verification_codes` | Never shipped | Verify-side cross-check was belt-and-suspenders; attacker needs the victim's inbox to read the code anyway. Dropped 2026-04-19 to keep migration surface minimal. |
| Hidden preheader `<div style="display:none">` | Reverted 2026-04-19 | Gmail rendered it as a "show trimmed content" (•••) icon inside the code box, which cluttered the email. Natural preview is fine for a message this short. |
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

DNS is managed on Vercel (`ns1/ns2.vercel-dns.com`). No further DNS changes needed for the ship. First DMARC reports from Gmail/Yahoo/Microsoft arrive at `saulbrauns@gmail.com` within 24–48 h.

---

## Branch commits touching email scope

My commits (all on `plan/proposal-gate-overhaul`, layered bottom-up):

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

Prior email-related commits from other sessions on this branch (for master agent context):

| SHA | Message |
|---|---|
| `c43c52b` | feat: onboarding redesign — auth flow reorder + auto-preferences |
| `bf92ea9` | fix: harden email auth — IP rate limiting, login flow guard, anti-enumeration, XSS fix |
| `18deb7c` | feat: simplify verification to single 'Didn't receive a code?' flow |
| `980e3f0` | fix: EmailResendStep uses OnboardingLayout — matches all other steps |
| `480966e` | fix: login verification uses navigation.reset + mark old OTP funcs deprecated |
| `c8e355b` | chore: align email_verification_codes migration with prod + add schema dump script |
| `78aa6e8` | fix: photo flow + auth lockouts + auto-pref + step save errors |

---

## Net effective function behavior (summary of all changes across the branch)

- **Primary send endpoint**: `email-signup` edge function (new).
- **Rate limits**: 5 codes per email per 10 min; 60 sends per IP per hour (was 20 on an earlier revision; bumped for Rice shared NAT).
- **Error codes returned**: `ACCOUNT_EXISTS`, `NO_ACCOUNT`, `RATE_LIMITED` (with `retryAfterSeconds`) — previously silent anti-enumeration, changed to explicit errors 2026-04-17 per product decision in commit `bf92ea9`.
- **Verify semantics**: 5 attempts per code (was 6 due to off-by-one; fixed 2026-04-18). Code expiry 10 min.
- **Session creation**: admin-client creates/finds user → sets temp password → anon-client `signInWithPassword` → session tokens returned.
- **Template**: Arial/Helvetica, letter-spaced code, plain-text alt included, no preheader, no unsubscribe footer, no `List-Unsubscribe` HTTP headers.
- **Paste**: both signup + login verify screens tolerate arbitrary clipboard content (up to 64 chars); handler strips non-digits and slices to 6.
- **Reviewer bypass preserved at every auth checkpoint**: `reviewer@bridgedate.app`, `reviewer2@bridgedate.app` → `validate-reviewer-access` + `signInWithPassword`.

---

## Live verification results (2026-04-19)

Tested end-to-end against local Supabase + real Resend-delivered emails to `sb278@rice.edu`:

- **Delivery latency**: Resend dashboard shows `Sent → Delivered` within the **same minute** (displayed as "0 minutes ago" in Gmail). Legacy path was ~10s; new path is effectively instant.
- **Template rendering** (Gmail web): clean. Letter-spaced code, full expiry line visible, no hidden-preheader artifact, no footer, no unsubscribe link.
- **Copy/paste**: letter-spacing is CSS-only → clipboard contains `"682815"` not `"6 8 2 8 1 5"` → paste fills all 6 digits on the verify screen.
- **Thread-trim resistance (commit `7fbdca3`, 11:13 AM test)**: confirmed fixed. Initial signup email (code 244978, ref `6fbc48`) and resend in the same Gmail conversation (code 300255, ref `22fecf`) both render in full — expiry line visible, no `•••`. Each email's unique `Ref: xxxxxx` line at the bottom defeats Gmail's byte-repetition detection, so Gmail can't identify any section as "repeated content" to collapse.
- **Resend Insights**: 10/11 checks passing. One warning (see Deferred section below). All others green: custom subdomain for click/open tracking, link URLs match sending domain, valid DMARC record, plain-text alternative present, small body size, no "no-reply" sender, images hosted on sending domain, no SVG images, full YouTube URLs (N/A).

**Mid-session false alarm investigated and fixed 2026-04-19:** earlier screenshots showed a `•••` icon (Gmail "show trimmed content") under the code box on 2nd+ emails in the same conversation thread. Root cause: Gmail threads all OTP emails by subject+sender and automatically collapses byte-identical passages (our expiry line) across threaded emails — the HTML Resend delivered was correct, Gmail was just hiding parts in the rendering. Commit `7fbdca3` adds a 6-char random hex `Ref: xxxxxx` line to the bottom of every email (HTML + plain-text), making each email's body uniquely different so Gmail leaves the full content rendered. Ref has no security value — it's purely a display-layer workaround. Also ruled out isolate caching by restarting the Docker edge-runtime container; source file has always been correct post-`e387005`, container live-mounts source directly.

## Deferred (post-launch polish, not blocking ship)

- **Send from a subdomain** (Resend Insights warning: "Use a subdomain"). Today we send from `Bridge <verify@bridgedate.app>` (apex domain). Resend recommends `verify@send.bridgedate.app` to isolate sender reputation from the apex domain's general reputation. Cost: one-line change in `email-signup/index.ts` + a dashboard tweak in Resend to add the subdomain as a verified sending domain. We don't need this now — the apex domain has no marketing-email reputation to protect, and Rice launch traffic is small. Revisit only if (a) adding marketing emails, (b) expanding beyond Rice, or (c) deliverability complaints surface in the DMARC reports.

## Known risks / open questions

- **IP rate limit 60/hr** is a guess calibrated against Rice shared NAT. If real orientation traffic outstrips it, bump to 120 or switch to per-email-only when one IP sends to many different emails (sign of sharing, not abuse).
- **No observability on function latency in prod yet.** Once deployed, you should be able to pull edge-function logs to get p50/p95 of the Resend POST + the full function execution. If latency >3s at p95, investigate Resend region routing.
- **Rice mail servers may be stricter than Gmail.** If complaints come in post-deploy, check DMARC reports for which providers are flagging.
- **The `flow` column may still exist on local DBs** that ran an older version of migration #83. Harmless — no code references it. A `supabase db reset` on fresh local will produce a schema without the column; drift tooling (`scripts/check-schema-parity.sh`) may briefly show this until the old column is dropped manually.
- **Legacy `@deprecated` functions in `authService.ts`** (`sendOtpToEmail`, etc.) still work and are safe. After the new path is live for 7 days, remove them. Keeping them now maintains rollback safety.

---

## Files in scope (touched by this agent)

```
supabase/functions/email-signup/index.ts
supabase/migrations/20260417000005_email_verification_codes_add_ip.sql  (renamed from _add_flow_and_ip)
src/services/authService.ts
src/screens/onboarding/steps/EmailSignUpVerificationStep.tsx
src/screens/auth/EmailVerificationScreen.tsx
docs/migrations/MIGRATION_LOG.md
docs/migrations/EDGE_FUNCTIONS.md
docs/agent-summaries/resend-email-optimization.md   (this file)
```

## Files explicitly NOT touched (owned by other parallel agents)

- Profile/onboarding simplification: 14 step-file deletions, `OnboardingScreen.tsx`, `onboardingMapping.ts`, `profileCompleteness.ts`, `ProfileStrengthDashboard.tsx`, `EditLifestyleScreen.tsx`, `types/index.ts`, `AppNavigator.tsx`, `docs/plans/onboarding-simplification-v2.md`
- Image moderation: `supabase/functions/moderate-image/` + `src/services/imageModerationService.ts` + related
- Proposal algorithm: `supabase/functions/_shared/scoring.ts`, `generate-proposals/index.ts`, `generate-proposal-for-user/index.ts`
- Cross-cutting policy docs: `CLAUDE.md` banner + `docs/migrations/README.md` banner
- Unrelated migration: `supabase/migrations/20260418000001_drop_dead_columns.sql`

The master agent should reconcile these per the normal rollup process.

---

## One-line deploy summary for master agent

> Apply `supabase/migrations/20260417000005_email_verification_codes_add_ip.sql` to prod via `scripts/supabase-exec.sh`, then `supabase functions deploy email-signup --no-verify-jwt`. Everything else is either already in prod, dormant, or reverted.
