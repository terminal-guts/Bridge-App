# Session Handoff — 2026-04-18

> **For the next agent**: this document is a complete-enough snapshot to pick up cold. Read CLAUDE.md first (project conventions), then this file for session state + open work.

---

## TL;DR

Two parallel streams of work sit unmerged:

1. **PR #33** — closes the local↔prod schema drift. Safe, not merged.
2. **Commit `3e5f0be`** — restores image moderation (frontend + edge function). Lives on `plan/proposal-gate-overhaul`, not on the currently checked-out branch.

The user has now switched to `feat/proposal-gate-overhaul-impl` (new branch off `main`) with fresh WIP on proposal-gate edge functions. **Clarify with the user which branch is canonical going forward before moving code around.**

---

## Branch topology (critical — read carefully)

```
main ────────●────────────────────────────────────────────── (production)
              │
              ├──● chore/close-local-prod-drift  ← PR #33 (parity fix, 26 files, unmerged)
              │
              ├──● feat/proposal-gate-overhaul-impl  ← CURRENTLY CHECKED OUT
              │    uncommitted WIP on 7 supabase/functions files
              │    + new migration 20260417100001_remove_proposal_lifecycle_check_cron.sql
              │    + new docs/plans/ directory
              │
              ╵
plan/proposal-gate-overhaul ──...──● 3e5f0be  (image moderation, unmerged)
  │ (30+ commits: onboarding redesign, bug fixes, photo upload changes, etc.)
  │
  └── branched from ─→ deferred/image-moderation  (source of moderation code)
```

### What each branch has

| Branch | State | Contents |
|---|---|---|
| `main` | production truth | Current App Store build basis |
| `chore/close-local-prod-drift` | PR #33 open | **Parity**: 7 migrations + 2 edge function dirs (email-signup, email-unsubscribe) + 6 parity scripts + 10 docs. Pure additions, zero deletions. |
| `plan/proposal-gate-overhaul` | unmerged | 30+ feature commits (onboarding redesign, auth hardening, photo upload refactor, etc.) + my moderation commit on top |
| `feat/proposal-gate-overhaul-impl` | currently checked out | Fresh branch from main. User has uncommitted changes to 7 proposal/cron edge functions + 1 new migration. Purpose unclear to me — user may be restructuring. |
| `deferred/image-moderation` | reference only | Where the image moderation code was rescued from. Its own history has stale profile/onboarding work we ignored. |

---

## Work completed this session

### 1. Local↔prod parity audit (3 parallel agents)

Deployed agents to independently verify whether a fresh `main` + `supabase db reset` would mimic prod. **Answer: no.** `main` was missing:

- **6 tables** (`profiles`, `onboarding_progress`, `waitlist_signups`, `allowed_email_domains`, `email_verification_codes`, `email_unsubscribes`)
- **~17 columns** across existing tables
- **3 functions**, ~10 indexes, 6+ RLS policies
- **2 edge functions** (`email-signup`, `email-unsubscribe`) already deployed to prod but missing from git

Full audit lives in:
- `docs/migrations/PRODUCTION_SCHEMA_DRIFT_REPORT.md`
- `docs/migrations/LEGACY_CRUFT_IN_PROD.md`
- `snapshots/prod-schema-2026-04-17.json` (ground truth dump)

### 2. PR #33: parity fix (unmerged)

**URL**: https://github.com/saulbrauns-bot/Bridge-App/pull/33

Branched from `origin/main`, cherry-copied only parity-related files from `plan/proposal-gate-overhaul`:

- 7 migrations (`20260415000001` → `20260417000004`)
- 2 edge function source dirs (already deployed to prod as v17 / v2)
- `supabase/migrations_pending/cleanup_legacy_functions_from_prod.sql` (staged but not applied)
- Parity tooling: `check-schema-parity.sh`, `diff-schemas.py`, `dump-*-schema.sh`, `setup-local.sh`, `schema-diff-ignore.json`
- 10 docs in `docs/migrations/`

**Safety confirmed**: no `.github/` directory → no CI/CD → merging does not trigger any prod deploy. All 26 files are pure additions. Migrations don't auto-apply.

### 3. Image moderation restoration (commit `3e5f0be`)

On `plan/proposal-gate-overhaul`, plucked image moderation from `deferred/image-moderation` (originally deleted in commit `7241b9f` on 2026-04-07 to unblock App Store launch).

**Product decisions captured during planning**:
- On moderation reject → delete uploaded photo + force user to pick a different one
- On Vision API error / missing key → fail open (current prod has no moderation at all; fail-open strictly improves safety)
- Face-detection threshold relaxed from **0.5 → 0.3** to allow side-angle / partial-face photos
- Deploy edge function now, add API key later (intermediate state = current prod behavior)
- Grandfather existing photos — no backfill scan

**Files in the commit (9 files, 301 inserts / 11 deletes)**:
- NEW `src/services/imageModerationService.ts`
- NEW `supabase/functions/moderate-image/index.ts` (Google Vision FACE_DETECTION + SAFE_SEARCH)
- `src/services/photoService.ts` — Promise.all moderation + blurhash, delete orphan on reject, return `MODERATION_REJECTED` error code
- `src/services/profileService.photos.ts` — passthrough MODERATION_REJECTED from `addProfilePhotos`
- `src/screens/onboarding/OnboardingScreen.tsx` — `photoModerationError` state + eager-upload rejection handler
- `src/screens/onboarding/steps/PhotoUploadStep.tsx` — accepts + renders `photoModerationError` prop, clears on new pick
- `src/screens/profile/sections/SectionScreenWrapper.tsx` — separate Alert on moderation reject (doesn't trip generic retry alert)
- `docs/migrations/SECRETS.md` — `GOOGLE_VISION_API_KEY` row added
- `docs/migrations/EDGE_FUNCTIONS.md` — `moderate-image` LOCAL_ONLY v1 entry

Plan file at: `/Users/saulbrauns/.claude/plans/for-unkown-3-what-deep-pinwheel.md`

---

## Open items / decisions needed

### Items 1–4 (surfaced during parity work, pending user decisions)

1. **Migration `20260417000005_email_verification_codes_add_flow_and_ip.sql`** — marked `LOCAL_ONLY` on `plan/proposal-gate-overhaul`. Adds `flow` + `ip_address` columns to `email_verification_codes` that don't exist in prod. Creates drift in the *opposite* direction. **Decide**: ship to prod (via `exec_sql`) or delete.

2. **`unique_active_proposal_pair` index** on `proposals` table — exists on `main`/local, **not** on prod. It's a safety rail preventing duplicate active proposals. **Decide**: remove from main, or apply to prod.

3. **`profile-photos` storage bucket** — `scripts/setup-local.sh` creates it as `private`; prod is `public`. Breaks photo rendering locally without signed URLs. **Fix**: 1-line change to setup-local.sh.

4. **`scripts/snapshot-import.ts`** — `TABLE_ORDER` excludes `friend_badges`, `user_settings`, `user_preferences`, `deep_question_answers`. Imported users look blank. **Fix**: add those tables.

### Deployment steps not yet taken

| Step | Command | Requires user approval? | Reaches users when |
|---|---|---|---|
| Merge PR #33 | Via GitHub UI or `gh pr merge 33` | Yes | Never reaches users directly — it's git only |
| Port moderation commit to canonical branch | Cherry-pick or merge — depends on user's direction | Yes | Ships with next build |
| EAS build + App Store submit | EAS CLI | Yes | Days/weeks (Apple review) |
| `supabase functions deploy moderate-image --project-ref ikyiwnydgedwbmcdzgbe` | Supabase CLI | **YES — CLAUDE.md rule** | Immediately |
| `supabase secrets set GOOGLE_VISION_API_KEY=<value> --project-ref ikyiwnydgedwbmcdzgbe` | Supabase CLI | **YES — CLAUDE.md rule** | Immediately |
| Decisions 1–4 above | Various | Mixed | Varies |

### Question currently outstanding

User is on `feat/proposal-gate-overhaul-impl` with different WIP. They may want one of:
- (a) Cherry-pick `3e5f0be` onto the current branch
- (b) Leave moderation on `plan/proposal-gate-overhaul`, merge/rebase later
- (c) Something else (restructuring branches)

**Ask the user before moving the moderation commit.**

---

## Critical context

### Production constraints (from CLAUDE.md — may already be loaded)

- **LIVE on App Store** as of 2026-04-05. Real users active.
- **Supabase changes are instant** — never deploy without explicit user confirmation. Describe the change first, wait for "go ahead."
- **Frontend changes ship with builds** — go through EAS build + App Store review. Not instant.
- **Voting gate is the #1 priority feature** — never break it. See CLAUDE.md §Voting Gate.
- **App Store reviewer bypass** (`reviewer@bridgedate.app` + `EXPO_PUBLIC_REVIEWER_PASSWORD`) is **permanent**. Do not remove.
- **Locked values** (do not change without explicit instruction):
  - Bottom nav bar (`AppNavigator.tsx` CustomTabBar) — all geometry + colors
  - Compatibility score display — must use hash-based 70–99 formula, never `proposal.compatibilityScore`
- **Protected contributors**: code by `LivingW123` and `A-Arav0307` is off limits. Run `git log --follow <file>` before modifying; ask for permission.

### Supabase access pattern

- **REST API only** (no `psql` from this network)
- **SQL execution**: `scripts/supabase-exec.sh "<SQL>"` via `exec_sql` RPC (service_role only)
- **Reads**: `scripts/supabase-query.sh "<table>" "<params>"`
- **Project ref**: `ikyiwnydgedwbmcdzgbe`
- **Key**: `.env` → `SUPABASE_SERVICE_ROLE_KEY`
- `supabase functions deploy` works; `supabase db push` does not — use `exec_sql` for migrations

### Local dev environment

- Local Supabase via Docker (`supabase start`) at `127.0.0.1:54321`
- Toggle `.env.local` to switch local/prod; `npx expo start -c` after
- Login locally: any `@rice.edu` email + password `localdev123`
- Studio: http://127.0.0.1:54323 | Inbucket (email): http://127.0.0.1:54324

### Known prod cruft (intentionally ignored)

47 legacy `public.*` functions exist in prod but not local. None are wired to triggers, none are called by app code. A staged DROP migration lives at `supabase/migrations_pending/cleanup_legacy_functions_from_prod.sql` (NOT auto-applied). See `docs/migrations/LEGACY_CRUFT_IN_PROD.md` for the full list + rationale.

---

## Tooling available

### Scripts (all in `scripts/`)

| Script | Purpose |
|---|---|
| `supabase-exec.sh` | Run arbitrary SQL against prod (service_role) |
| `supabase-query.sh` | REST read against prod tables |
| `check-schema-parity.sh` | One-command local↔prod diff |
| `diff-schemas.py` | Diff two schema JSONs (honors `schema-diff-ignore.json`) |
| `dump-prod-schema.sh` | Dump prod schema to `snapshots/prod-schema-DATE.json` |
| `dump-local-schema.sh` | Dump local schema |
| `setup-local.sh` | Bootstrap fresh local env (installs citext, creates bucket, seeds 2 users + 1 proposal) |
| `seed-local.sh` | Creates Saul + 5 mock users + friendships + proposal + karma |
| `snapshot-export.sh` | Export prod data (read-only) → `snapshots/*.json` |
| `snapshot-import.ts` | Import snapshots into local (hardcoded 127.0.0.1) |

> **Note**: scripts live on `plan/proposal-gate-overhaul` and `chore/close-local-prod-drift`. Current branch `feat/proposal-gate-overhaul-impl` (from main) does not have them yet — inherits from PR #33 once that merges.

### Docs (all in `docs/migrations/` on `plan/proposal-gate-overhaul` and `chore/close-local-prod-drift`)

- `MIGRATION_LOG.md` — every SQL migration with prod status
- `PRODUCTION_SCHEMA.md` — current prod tables, RPCs, indexes, policies (known to have minor drift — see DRIFT_REPORT)
- `PRODUCTION_SCHEMA_DRIFT_REPORT.md` — 2026-04-17 audit
- `PROD_SCHEMA_SNAPSHOT_2026-04-17.md` — full prod schema (1795 lines)
- `SYNTHETIC_LOCAL_SCHEMA_2026-04-17.md` — what local looks like after all migrations
- `LEGACY_CRUFT_IN_PROD.md` — 47 prod-only legacy functions
- `EDGE_FUNCTIONS.md` — every edge function + deploy status + version
- `SECRETS.md` — secret names (never values) + which function reads them
- `LOCAL_SETUP.md` — fresh-env bootstrap
- `README.md` — index of the above

### Memory files (agent memory, persists across sessions)

Location: `/Users/saulbrauns/.claude/projects/-Users-saulbrauns-Bridge-Version1-Mock/memory/`

Relevant files to read on session start (via MEMORY.md index):
- `project_app_live_supabase_policy.md` — prod policy
- `project_voting_gate_policy.md` — #1 priority feature rules
- `project_post_launch_bugfix_plan.md` — bug list (image moderation was item #5)
- `project_local_dev_setup.md` — local env setup details
- `feedback_production_approach.md` — ultra-thorough research pattern
- `feedback_separate_branch_and_production.md` — don't mix branch/prod changes
- `feedback_no_ux_changes_without_approval.md` — don't touch profile/onboarding UX unprompted

---

## Verification / testing (not yet done)

### For PR #33 (parity fix)

5-minute smoke test offered, not yet run:
```
1. git checkout chore/close-local-prod-drift
2. supabase stop && supabase db reset
3. ./scripts/setup-local.sh
4. ./scripts/check-schema-parity.sh   # should exit 0 with only 47-function drift
5. App smoke test (user must drive simulator)
```

### For image moderation commit

Type-check already passed (zero new errors — only pre-existing test errors in `__tests__/services/photoService.test.ts`). Remaining tests:

1. **Local edge function** (optional): `supabase functions serve moderate-image --env-file supabase/.env.local` with key in env file. Upload a test photo.
2. **Unit test** (not written): mock `moderateImage` to return rejected, assert `MODERATION_REJECTED` + `storage.remove` called.
3. **Manual onboarding** — three fixtures:
   - (a) front-facing portrait → accepted
   - (b) landscape/no-face as main → rejected, slot clears, error renders, new pick clears error
   - (c) any image without Vision key set → passes (fail-open)
4. **Manual profile edit** — same fixtures through `EditPhotosScreen` save. Rejected photo shows dedicated Alert.

---

## Stashes (left intact for user)

- `stash@{0}` — older WIP versions of `PhotoUploadStep.tsx` + `profileService.onboarding.ts` from the parity-branch session. User should inspect + drop when confident.
- `stash@{1}` — `WIP on main: 3054d6b` — not mine, pre-existing, ignore.

---

## Recommended next moves for the new agent

1. **Orient**: `git branch --show-current` + `git log --oneline -10` + `git status`. You'll be on `feat/proposal-gate-overhaul-impl` likely, with proposal-gate WIP.
2. **Confirm intent**: ask the user explicitly which branch is canonical now, and whether they want the image moderation commit (`3e5f0be` on `plan/proposal-gate-overhaul`) ported over or left where it is.
3. **Do not merge PR #33 or deploy anything without explicit approval** per CLAUDE.md rules.
4. **For any new Supabase change**: describe → get "go ahead" → then execute.
5. **If doing frontend work on voting gate / onboarding / profile**: check the locked-value list in CLAUDE.md first.
6. **Working tree state is non-trivial** — there's a partially-finished feature branch, uncommitted WIP, 2 stashes. Don't run destructive git operations without user confirmation.

---

## Questions to confirm with the user (priority order)

1. Which branch do you want as the canonical feature branch — `plan/proposal-gate-overhaul`, `feat/proposal-gate-overhaul-impl`, or something else?
2. Where should the image moderation commit (`3e5f0be`) end up? Cherry-pick, merge, or leave alone?
3. Ready to merge PR #33? (It's safe but unmerged.)
4. Any of decisions 1–4 (LOCAL_ONLY migration, unique-index drift, bucket privacy, snapshot-import gaps) you want to resolve now?
5. When you want to deploy `moderate-image`: I'll need explicit approval to run `supabase functions deploy` and `supabase secrets set`.
