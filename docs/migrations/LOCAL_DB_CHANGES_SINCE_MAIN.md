# Local DB Sync — Changes on `plan/proposal-gate-overhaul` vs `main`

> Generated 2026-04-19. This file summarises **every change on this branch that
> affects local-database sync** — what exists to make a fresh local Supabase a
> faithful mirror of prod, what's new, and what was modified.
>
> All changes are **additive or local-only**. No production writes. No prod
> schema was mutated as a side-effect of building this tooling.

---

## TL;DR

If you run `./scripts/bootstrap-local.sh` after checking out this branch:

1. Wipes local Supabase clean.
2. Reapplies every migration in `supabase/migrations/` — including 3 that are
   `LOCAL_ONLY` (not yet promoted to prod).
3. Dumps prod data (SELECT-only) to `snapshots/snapshot-<date>.json`.
4. Imports those rows with **2-pass FK retry** + **strict row-count verification**
   that fails loudly if local diverges from the snapshot.
5. Copies every file in the prod `profile-photos` bucket (and `chat-audio`,
   when non-empty) into local storage.
6. Reports schema drift — it will flag exactly 3 tables, all caused by the 3
   `LOCAL_ONLY` migrations sitting on top of prod.
7. Reports edge-function parity — 11 prod-only (legacy cruft + `send-sms`/
   `send-nudge`) and 1 local-only (`moderate-image`).

End state: local row counts match snapshot exactly, ~569 photos copied,
schema is prod + the local-only migrations stacked on top.

---

## New files (not in `main`)

### Scripts

| Path | Purpose |
|---|---|
| `scripts/bootstrap-local.sh` | One-shot orchestrator: reset → setup → export → import → photos → schema-parity → edge-fn-parity. Removed the previous `tail -8` output silencers so every error is now visible; fails the whole run if any step fails. |
| `scripts/snapshot-import-photos.ts` | Mirrors prod storage buckets into local. Handles both `profile-photos` and `chat-audio`. Supports `--only=<bucket>`, `--force` flags. Exits 1 on any failure. |
| `scripts/check-edge-function-parity.sh` | Lists functions deployed to prod (via `supabase functions list`) vs folders in `supabase/functions/`. Surfaces drift in both directions. |

### Docs

| Path | Purpose |
|---|---|
| `docs/migrations/EDGE_FUNCTIONS.md` | Registry of every edge function: name, status (DEPLOYED / LOCAL_ONLY / DORMANT), version, schedule, purpose, and a live "parity" section tracking prod-only and local-only gaps. |
| `docs/migrations/LEGACY_CRUFT_IN_PROD.md` | Documents the 47 legacy DB functions deployed to prod that aren't in any current migration. Explains why they're inert and safe; includes the path to the DROP migration that would clean them up (still pending user approval). |
| `docs/migrations/SECRETS.md` | Names-only registry of Supabase secrets referenced by edge functions. No values. |
| `docs/migrations/archive/prod-schema-snapshot-2026-04-17.md` | Frozen forensic dump of prod schema at that date — 38 tables × every column/index/policy, 136 RPCs, 21 triggers. Used to drive the BACKFILL migrations below. |
| `docs/migrations/archive/synthetic-local-schema-2026-04-17.md` | What `supabase db reset` produced at that date (pre-alignment). |
| `docs/migrations/archive/drift-report-2026-04-17.md` | One-time drift audit that drove the alignment work. Archived — drift it documented has since been resolved. |

### Migrations added

These extend `supabase/migrations/` so that `supabase db reset` reproduces
prod locally. All are additive to what `main` contains.

| File | Type | Status | What it does |
|---|---|---|---|
| `20260415000001_email_verification_codes.sql` | ADDITIVE | PRODUCTION | OTP code storage for `email-signup` edge function. Matches prod shape (`code` + `code_hash` + `used`). |
| `20260415000002_get_user_by_email_rpc.sql` | ADDITIVE | PRODUCTION | Look up user + profile status by email (service_role only). |
| `20260415000003_email_unsubscribes.sql` | ADDITIVE | PRODUCTION | Track email unsubscribe preferences. |
| `20260417000001_add_missing_production_columns.sql` | BACKFILL | PRODUCTION | Catch-up columns added to prod manually that local was missing: `user_profiles.profile_completed`, `user_profiles.email`, `user_preferences.interested_in_genders` + partner_* + `preferred_politics`, `proposals.vote_context`. |
| `20260417000002_revoke_check_email_exists_anon.sql` | FIX | PRODUCTION | REVOKE EXECUTE on `check_email_exists` from anon (anti-enumeration). |
| `20260417000003_backfill_prod_only_tables.sql` | BACKFILL | PRODUCTION | Reproduces 4 prod-only tables in local: `profiles`, `onboarding_progress`, `waitlist_signups`, `allowed_email_domains`. |
| `20260417000004_align_local_with_prod.sql` | BACKFILL | PRODUCTION | Aligns remaining structural drift — missing columns, 9 missing indexes, 5 missing policies, RLS on `support_reply_context`, triggers, `exec_sql()` function, drops one local-only index. |
| `20260417000005_email_verification_codes_add_ip.sql` | ADDITIVE | **LOCAL_ONLY** | Adds `flow` and `ip_address` columns + rate-limit index to `email_verification_codes`. Prerequisite for the email-signup function flow. Not yet deployed to prod. |
| `20260418000001_drop_dead_columns.sql` | DESTRUCTIVE | **LOCAL_ONLY** | Drops 8 dead columns from `user_profiles` (`non_negotiables`, `matchmaking_only`, `location`, `latitude`, `longitude`, `hometown`, `profile_photo_path`) and `user_preferences.looking_for`. Not yet deployed to prod — cause of the current 3-table schema drift. |
| `20260419000001_get_user_by_email_add_has_profile.sql` | ADDITIVE | **LOCAL_ONLY** | Drops + recreates `get_user_by_email` with a new `has_profile BOOLEAN` return column so the `email-signup` edge function can distinguish "no profile row at all" from "profile row with `profile_completed=false`". Required for Rule B signup-block logic (see below). |
| `supabase/migrations_pending/cleanup_legacy_functions_from_prod.sql` | DESTRUCTIVE | STAGED | Drops 47 legacy functions from prod. **Staged, not in `migrations/`** — move and apply with user approval to achieve zero drift. |

---

## Modified files (vs `main`)

### Scripts

| Path | Change |
|---|---|
| `scripts/snapshot-import.ts` | Pre-prunes orphan `pool_vote_assignments` / `proposal_votes` rows whose `proposal_id` target isn't in the snapshot (prevents silent FK failures). Adds a 2-pass retry loop for transient FK failures. Adds a mandatory verification step that queries every imported table's live count and compares to the snapshot; prints a delta table; exits `1` if any count mismatches (use `--force-continue` to suppress). Replaced broken `supabase.auth.admin.listUsers` pagination with raw fetches for clearing and with an `exec_sql` RPC call for counting (GoTrue returns 500 past page 2 on our dataset). |
| `scripts/setup-local.sh` | `profile-photos` bucket is now created with `public: true` and the full prod MIME list (`image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/heic`). Previously created as `public: false` with a narrower MIME list, which silently broke photo rendering in the app: `profileService` calls `supabase.storage.from('profile-photos').getPublicUrl(p.url)` in three places, and `getPublicUrl` on a private bucket returns a URL the bucket refuses to serve. Now matches prod exactly. |
| `scripts/snapshot-import-photos.ts` | If the `profile-photos` bucket already exists with mismatched `public` flag, script reconciles it via `updateBucket()` as a defensive fallback. Prevents the earlier footgun where re-running bootstrap without a full reset could leave the bucket private. |

### Edge functions

| Path | Change |
|---|---|
| `supabase/functions/email-signup/index.ts` | **Rule B**: signup is now blocked whenever a `user_profiles` row exists for the email, not just when `profile_completed=true`. The previous rule let retroactively-incomplete profiles (e.g. a completed user who deleted a photo → `profile_completed` flipped back to false) pass the signup block — where onboarding would silently overwrite real data. A profile row is created the moment a user first verifies an OTP (`ensureProfileRow()` in `OnboardingScreen`), which makes OTP verification the commitment line: post-verify users who want to restart must sign in (auto-resumes onboarding) or delete their account. Requires the migration above. LOCAL_ONLY until approved for prod. |

### Docs

| Path | Change |
|---|---|
| `docs/migrations/README.md` | Expanded the "Keeping local in sync with prod" table to reference the new scripts and capabilities. |
| `docs/migrations/MIGRATION_LOG.md` | Added entries 71–84 for every new migration above, with status (PRODUCTION / LOCAL_ONLY / BACKFILL). Records the 2026-04-18 gate-overhaul-v2 deploy. |
| `docs/migrations/PRODUCTION_SCHEMA.md` | Points at the latest dated prod schema snapshot. |
| `docs/migrations/LOCAL_SETUP.md` | Documents the one-command path (`bootstrap-local.sh`) plus the manual step-by-step; added the dump-and-diff workflow for verifying local matches prod. |

---

## Known intentional drift (after bootstrap)

Running `./scripts/check-schema-parity.sh` **will report drift in exactly 3
tables**. This is expected and documented:

| Table | Drift | Root cause |
|---|---|---|
| `user_profiles` | prod has 7 extra cols (`hometown`, `latitude`, `location`, `longitude`, `matchmaking_only`, `non_negotiables`, `profile_photo_path`) | migration `20260418000001_drop_dead_columns.sql` is `LOCAL_ONLY` |
| `user_preferences` | prod has extra col `looking_for` | same migration |
| `email_verification_codes` | local has extra cols `flow`, `ip_address` + one index | migration `20260417000005_email_verification_codes_add_ip.sql` is `LOCAL_ONLY` |

Edge-function parity check will flag:

- **11 prod-only** functions: 9 are legacy cruft (old grid/survey system, old
  snake_case match/message functions), 2 (`send-sms`, `send-nudge`) are real
  but absent from the repo.
- **1 local-only** function: `moderate-image` — called by
  `src/services/imageModerationService.ts` but not yet deployed to prod
  (already on the post-launch bug list).

---

## Commands

```bash
# Full mirror (10–15 min; ~570 photos + data + verification)
./scripts/bootstrap-local.sh

# Fast path, skip photos (2 min; broken avatars)
./scripts/bootstrap-local.sh --no-photos

# Allow partial success (exits 0 even on count mismatch)
./scripts/bootstrap-local.sh --force-continue

# Individual pieces
./scripts/snapshot-export.sh                            # SELECT-only prod dump
npx tsx scripts/snapshot-import.ts                       # load + verify
npx tsx scripts/snapshot-import-photos.ts                # both buckets
npx tsx scripts/snapshot-import-photos.ts --only=profile-photos
npx tsx scripts/snapshot-import-photos.ts --force        # overwrite existing
./scripts/check-schema-parity.sh                         # dump + diff schema
./scripts/check-edge-function-parity.sh                  # edge fn audit
```

---

## Guard rails

Every script that talks to prod does so **read-only**:

- `snapshot-export.sh` has inline SQL keyword filters rejecting anything that
  isn't a `SELECT`.
- `snapshot-import.ts` hardcodes `http://127.0.0.1:54321` as the target and
  refuses to run if local Supabase isn't reachable.
- `snapshot-import-photos.ts` reads from prod storage via the public client
  (download-only) and writes exclusively to `http://127.0.0.1:54321`.
- `check-schema-parity.sh` / `check-edge-function-parity.sh` only query prod.

No script in this branch can mutate production.

---

## Open items / handoff

### 1. Pending prod deploys (per-action approval required)

Four artifacts on this branch are tested locally but **not yet in prod**.
Each one needs explicit, conversational go-ahead from the maintainer before
being applied to production — the per-action rule at the top of `CLAUDE.md`.
No agent or session should promote these unilaterally.

| # | Artifact | Shape of prod change |
|---|---|---|
| 83 | `20260417000005_email_verification_codes_add_ip.sql` | `ALTER TABLE email_verification_codes ADD COLUMN ip_address` + index |
| 84 | `20260418000001_drop_dead_columns.sql` | `ALTER TABLE … DROP COLUMN` for 8 dead columns |
| 85 | `20260419000001_get_user_by_email_add_has_profile.sql` | `DROP FUNCTION` + `CREATE FUNCTION get_user_by_email` with new return shape |
| — | `email-signup/index.ts` (Rule B edition) | `supabase functions deploy email-signup` — depends on #85 |

Deploy order (if/when approved): **#83 → #85 → email-signup redeploy → #84**
(Rule B depends on #85 being live first. #84 is independent — can land any time.)

Until promoted, local will keep reporting "drift" in the 3 tables above
(expected), and Rule B will only exist locally.

### 2. Two prod-only edge functions not in the repo

`check-edge-function-parity.sh` flags `send-sms` and `send-nudge` as
deployed to prod but absent from `supabase/functions/`. They're not
referenced in `src/` (the mobile client), but they might be invoked by
other edge functions or cron jobs. Not investigated deeply in this session.

Next steps (for whoever picks this up):
1. Grep all of `supabase/functions/**/*.ts` for `send-sms` / `send-nudge` calls.
2. Check `cron.job` in prod for schedules targeting these functions.
3. If dead → add to the cleanup migration at `supabase/migrations_pending/cleanup_legacy_functions_from_prod.sql` (needs user approval to run).
4. If alive → pull source from prod via `supabase functions download` and commit to the repo so they're tracked and locally-servable.

### 3. End-to-end UX verification

All Rule B testing was curl-against-the-edge-function. Still to do: run
the app against local and confirm the signup screen shows the
"Tap Sign In instead" error cleanly when a user with any profile row
(complete or partial) attempts signup. The quickest canary accounts:

- `sw186@rice.edu` — complete profile (`profile_completed=true`)
- `dc118@rice.edu` — partial profile (`profile_completed=false`) — **this is the new Rule B case**
- Any brand-new email — should pass signup through to OTP verify

Relevant UI copy lives in `src/screens/onboarding/steps/EmailSignUpStep.tsx`
(error code `ACCOUNT_EXISTS` → user-visible message).
