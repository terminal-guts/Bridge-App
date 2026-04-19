# Agent Summary — Resend Email Optimization

**Agent role**: Resend email delivery specialist. Scope: `supabase/functions/email-signup/`, `supabase/functions/email-unsubscribe/`, the frontend auth screens that invoke them, related `authService.ts` functions, DNS records, and email-deliverability docs.

**Branch**: `plan/proposal-gate-overhaul`
**Session dates**: 2026-04-18 → 2026-04-19
**Commits produced**:
- `13bf354 fix(email-signup): flow cross-check + off-by-one attempt counter + IP limit bump`
- `60f8a40 perf(email-signup): parallelize pre-send checks + improve template deliverability`
- `d2a1928 fix(email): restore code paste support — revert &nbsp; spacing, relax TextInput gates`

---

## What shipped on this branch (local commits, not yet in prod)

### 1. Correctness / guard fixes (commit `13bf354`, partially reverted in a later scope cut — see note below)
- **Off-by-one attempt counter**: The attempt-limit check now runs BEFORE the increment so `MAX_ATTEMPTS_PER_CODE = 5` actually means 5 real attempts (was 6).
- **IP rate limit bump**: `MAX_SENDS_PER_IP_PER_HOUR` raised 20 → 60. Rice campus shared NAT was at risk of burning a 20/hr ceiling during orientation/signup bursts. 60 still caps abuse.
- **Stale comments updated**: `authService.ts:L658` and `EmailSignUpVerificationStep.tsx:L194-197` had comments describing the old anti-enumeration behavior; replaced with accurate description of current `ACCOUNT_EXISTS`/`NO_ACCOUNT` handling.
- **MIGRATION_LOG.md entry #83**: `20260417000005_email_verification_codes_add_ip.sql` is now documented in the log (was missing). Status: `LOCAL_ONLY`. Function 500s on INSERT if the migration isn't applied to prod first — this is the critical deploy ordering constraint.
- **REVERTED 2026-04-19**: The verify-side `flow` cross-check + `FLOW_MISMATCH` error + accompanying `flow` column. Belt-and-suspenders with negligible real security benefit (attacker already needs the victim's inbox to read the code). Dropped to keep the migration surface minimal and the function simpler. Send-side signup-vs-login business logic (NO_ACCOUNT for login-without-account, ACCOUNT_EXISTS for signup-with-completed-profile) lives entirely in memory now.

### 2. Delivery-speed optimization (commit `60f8a40`, subsequent scope cut in commit added 2026-04-19)
- **Parallelized pre-send DB calls**: The 3 independent pre-send checks (per-email rate limit, per-IP rate limit, user status lookup) now run in a single `Promise.all`. Saves ~2 round-trips (~100–150ms on typical Supabase latency) off the happy path. Early-return logic runs after all three resolve — wasted work only happens on rate-limited/error paths, never on the fast path.
- **Plain-text alternative**: Added `text` field to the Resend payload alongside `html`. HTML-only emails score higher on Gmail/Outlook spam filters and render poorly on watchOS and screen readers.
- **Font stack**: Swapped `-apple-system, BlinkMacSystemFont, 'Segoe UI'` for `Arial, Helvetica, sans-serif`. Gmail web strips `-apple-system` and falls back to serif, which looked off.
- **Removed visible footer**: Deleted the "Bridge at Rice University" line from both HTML and text.
- **REVERTED 2026-04-19**: The hidden preheader div. Gmail rendered it as a "show trimmed content" (•••) icon inside the code box, cluttering the email more than the preview benefit was worth. Removed. For a transactional message this short, Gmail's natural preview ("Bridge" or "Your verification code:") is fine.
- **REVERTED 2026-04-19**: The `List-Unsubscribe` and `List-Unsubscribe-Post` headers. Transactional OTP codes aren't something users subscribe to — advertising unsubscribe invites accidental clicks that hurt reputation. Removed along with the `getEmailHeaders`/`getUnsubscribeUrl` helpers.

### 3. Paste regression fix (commit `d2a1928`)
- **Root cause**: Earlier version of `60f8a40` rendered the code as `1 &nbsp; 2 &nbsp; 3 &nbsp; 4 &nbsp; 5 &nbsp; 6` for cross-client visual spacing. That meant the clipboard copy from Gmail contained 31 chars (including non-breaking spaces). The verify TextInput's `maxLength={6}` caused native truncation BEFORE the digit-strip regex could run, so only the first 2 digits landed.
- **Fix**:
  - Back to CSS `letter-spacing: 8px` for visual gap. CSS is render-only and doesn't appear in the clipboard → clean "123456" paste.
  - `maxLength` bumped to 64 on the hidden TextInput (`EmailSignUpVerificationStep.tsx`) and on the first cell of the login-side OTP grid (`EmailVerificationScreen.tsx`). Handlers already strip non-digits and slice to 6.
  - Login-side gate: loosened from `if (value && !/^\d+$/.test(value)) return` to only block single-char typed input — pastes with mixed content now fall through to the strip branch instead of being rejected outright.

---

## What's LOCAL_ONLY and needs deploying (for whichever agent handles prod)

All depend on user's explicit per-action approval per CLAUDE.md.

| Artifact | Status | Deploy prereq | Rollback |
|---|---|---|---|
| Migration `20260417000005_email_verification_codes_add_ip.sql` | LOCAL_ONLY | None — idempotent `IF NOT EXISTS` | Leave applied, additive only |
| Edge function `email-signup` | LOCAL_ONLY | Migration above must land first | Legacy `send-email-verification` v17 still deployed as fallback |

**Deploy order** (when user approves):
1. Apply migration via `scripts/supabase-exec.sh` (service_role-only)
2. `supabase functions deploy email-signup --no-verify-jwt`
3. Smoke test with a real @rice.edu address
4. Update `MIGRATION_LOG.md` (flip #83 to `PRODUCTION`) and `EDGE_FUNCTIONS.md` (move `email-signup` to Anonymous Functions / DEPLOYED)

**Prod secrets required**: `RESEND_API_KEY` is already set per `docs/migrations/SECRETS.md`. No new secrets needed.

**`email-unsubscribe` is NOT in the deploy plan.** 2026-04-19 scope cut: we only send transactional OTP codes (user explicitly requested each one), so there's nothing to unsubscribe from. `email-signup` no longer emits the `List-Unsubscribe` / `List-Unsubscribe-Post` headers. Function source kept in-repo as `DORMANT` for possible future marketing-email stream.

---

## DNS changes made by user (2026-04-19)

- **DMARC**: `_dmarc.bridgedate.app` TXT updated from `v=DMARC1; p=none;` to `v=DMARC1; p=none; rua=mailto:saulbrauns@gmail.com;`. Now collects aggregate reports from Gmail/Yahoo/Microsoft. First reports expected within 24–48h.
- **DKIM**: Verified green in Resend dashboard on 2026-04-19. Bare `p=MIGf...` format (without the optional `v=DKIM1; k=rsa;` prefix) is what Resend issues and is RFC-6376-valid. No change needed.
- **SPF**: Verified green on both apex (`bridgedate.app`) and `send.bridgedate.app` subdomain. No change needed.

---

## What still needs to happen before shipping

1. **Real-world local test** (user): open Expo app against local Supabase, sign up / log in with a @rice.edu email, verify code email arrives fast (goal: <3s from Resend), verify copy-paste of the code works, verify "Didn't receive a code?" mini-loop works, verify 60s resend cooldown on login works.
2. **Coordinated prod deploy** with the other parallel work from the master agent's rollup:
   - Profile/onboarding simplification agent's changes
   - Image moderation agent's changes
   - Proposal algorithm agent's changes
3. **App Store submission** — out of my scope; the master agent or a dedicated App Store agent handles EAS build + version bump + submit.

---

## Known risks / caveats

- **IP rate limit 60/hr** is a guess calibrated against Rice shared NAT during orientation. If real orientation traffic outstrips it, bump to 120 or switch to per-email-only when IP looks shared.
- **Resend domain reputation** is green now (DKIM/SPF verified, DMARC `p=none; rua=` added 2026-04-19) but Rice's own mail servers may be stricter than Gmail. If complaints come in, first check the DMARC reports (sent to `saulbrauns@gmail.com`) to see what provider is flagging.
- **No `List-Unsubscribe` header** on outbound mail as of 2026-04-19 scope cut. Correct for transactional-only streams; revisit if marketing-email stream is added later.

---

## Files touched on this branch (Resend scope only)

```
supabase/functions/email-signup/index.ts
src/services/authService.ts
src/screens/onboarding/steps/EmailSignUpVerificationStep.tsx
src/screens/auth/EmailVerificationScreen.tsx
docs/migrations/MIGRATION_LOG.md
docs/migrations/EDGE_FUNCTIONS.md
```

## Files NOT touched (owned by other agents)

The following uncommitted working-tree changes belong to other agents and are intentionally untouched:
- Profile/onboarding simplification: 14 step-file deletions, `OnboardingScreen.tsx`, `onboardingMapping.ts`, `profileCompleteness.ts`, `ProfileStrengthDashboard.tsx`, `EditLifestyleScreen.tsx`, `types/index.ts`, `AppNavigator.tsx`, `docs/plans/onboarding-simplification-v2.md`
- Image moderation: `supabase/functions/moderate-image/` + related
- Proposal algorithm: `supabase/functions/_shared/scoring.ts`, `generate-proposals/index.ts`, `generate-proposal-for-user/index.ts`
- Policy docs: `CLAUDE.md` + `docs/migrations/README.md` banner additions

The master agent should reconcile these per the normal rollup process.
