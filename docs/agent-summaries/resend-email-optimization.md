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

### 1. Correctness / guard fixes (commit `13bf354`)
- **Flow cross-check on verify**: `email-signup` now accepts `flow` in the verify body and rejects with `FLOW_MISMATCH` when the caller's claimed flow doesn't match the flow the code was issued under. Closes an incomplete guard where a signup-flow code could be consumed by a login verify call (or vice versa) as long as the user happened to exist. `verifyEmailSignUpCode` in `authService.ts` now sends `flow: 'signup'`; `verifyLoginCode` sends `flow: 'login'`. Legacy rows with `codeRow.flow = null` are exempt (skip the cross-check) for a safe rollout.
- **Off-by-one attempt counter**: The attempt-limit check now runs BEFORE the increment so `MAX_ATTEMPTS_PER_CODE = 5` actually means 5 real attempts (was 6).
- **IP rate limit bump**: `MAX_SENDS_PER_IP_PER_HOUR` raised 20 → 60. Rice campus shared NAT was at risk of burning a 20/hr ceiling during orientation/signup bursts. 60 still caps abuse.
- **Stale comments updated**: `authService.ts:L658` and `EmailSignUpVerificationStep.tsx:L194-197` had comments describing the old anti-enumeration behavior; replaced with accurate description of current `ACCOUNT_EXISTS`/`NO_ACCOUNT` handling.
- **MIGRATION_LOG.md entry #83**: `20260417000005_email_verification_codes_add_flow_and_ip.sql` is now documented in the log (was missing). Status: `LOCAL_ONLY`. Function 500s on INSERT if the migration isn't applied to prod first — this is the critical deploy ordering constraint.

### 2. Delivery-speed optimization (commit `60f8a40`)
- **Parallelized pre-send DB calls**: The 3 independent pre-send checks (per-email rate limit, per-IP rate limit, user status lookup) now run in a single `Promise.all`. Saves ~2 round-trips (~100–150ms on typical Supabase latency) off the happy path. Early-return logic runs after all three resolve — wasted work only happens on rate-limited/error paths, never on the fast path.
- **Plain-text alternative**: Added `text` field to the Resend payload alongside `html`. HTML-only emails score higher on Gmail/Outlook spam filters and render poorly on watchOS and screen readers.
- **Hidden preheader**: `<div style="display:none; ...">Your 6-digit code expires in 10 minutes.</div>` at the top of the HTML body so Gmail's inbox-list preview shows something useful instead of "Bridge".
- **Font stack**: Swapped `-apple-system, BlinkMacSystemFont, 'Segoe UI'` for `Arial, Helvetica, sans-serif`. Gmail web strips `-apple-system` and falls back to serif, which looked off.
- **Removed visible footer**: Deleted the "Bridge at Rice University" line from both HTML and text. `List-Unsubscribe` header drives actual unsubscribe behavior; the visible text added nothing.

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
| Migration `20260417000005_email_verification_codes_add_flow_and_ip.sql` | LOCAL_ONLY | None — idempotent `IF NOT EXISTS` | Leave applied, additive only |
| Edge function `email-signup` | LOCAL_ONLY | Migration above must land first | Legacy `send-email-verification` v17 still deployed as fallback |
| Edge function `email-unsubscribe` | LOCAL_ONLY | None | Delete function; unsub rows harmless |

**Deploy order** (when user approves):
1. Apply migration via `scripts/supabase-exec.sh` (service_role-only)
2. `supabase functions deploy email-signup --no-verify-jwt`
3. `supabase functions deploy email-unsubscribe --no-verify-jwt`
4. Smoke test with a real @rice.edu address
5. Update `MIGRATION_LOG.md` (flip #83 to `PRODUCTION`) and `EDGE_FUNCTIONS.md` (move both to Anonymous Functions / DEPLOYED)

**Prod secrets required**: `RESEND_API_KEY` is already set per `docs/migrations/SECRETS.md`. No new secrets needed.

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
- **Flow cross-check** allows legacy rows (`codeRow.flow = null`) to pass through without the check — intentional, so rows issued before migration #83 lands still verify during the rollout window. After 1 week post-deploy, rows with null flow will have expired naturally and this branch becomes unreachable.
- **Resend domain reputation** is green now but Rice's own mail servers may be stricter than Gmail. If complaints come in, first check the DMARC reports to see what provider is flagging.
- **`email-unsubscribe` not deployed yet** means the `List-Unsubscribe` header in outbound email points to a URL that 404s in prod. Gmail's one-click unsubscribe quietly degrades sender reputation when the POST fails. Fix is to deploy the function at the same time as `email-signup`.

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
