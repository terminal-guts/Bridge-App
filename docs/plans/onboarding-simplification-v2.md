# Onboarding Simplification v2 — Plan

**Status:** LOCKED
**Branch:** `plan/proposal-gate-overhaul`
**Date:** 2026-04-18

---

## Why we're doing this

Over the last month the onboarding got simplified in pieces — steps deleted, fields removed, matchmaker mode shipped. The cleanup was never finished. What's left behind:

- 13 old step files sitting unused
- Profile strength bar is broken — every new user caps at 85%
- 17% of the matching algo is scoring fields we no longer collect (falls back to defaults)
- Two edit profile screens edit the same lifestyle fields
- Dead columns in the DB

Goal: finish the cleanup in one pass so onboarding, profile, edit, and matching all agree with each other.

---

## Ironclad rule — local only

**No prod database changes. Not now.**

- We **look at** prod (read-only via `scripts/supabase-exec.sh`)
- We **simulate** everything in local — import prod snapshot, apply changes there
- Every migration gets written as a proper `.sql` file and committed to `supabase/migrations/`
- Later, when Saul is ready, those committed migrations can be replayed to prod in a separate explicit deploy event — not part of this plan

Same goes for edge function deploys: all changes stay local until Saul gives a separate explicit green light.

---

## What's staying the same

- 16-step dater flow
- 8-step matchmaker flow (**matchmaker photo stays in onboarding** — Saul's call)
- Fields we collect: name, birthday, role, gender, height, ethnicity, religion, politics, 4 lifestyle habits, interests, values, photos

Nothing live users see day-to-day will change from this work until Saul explicitly ships it.

---

## The workstreams

### W1 — Delete dead code
Remove the 13 orphan step files in `src/screens/onboarding/steps/` + the ~10 dead entries in `src/config/onboardingMapping.ts` pointing at removed steps. Type-check must still pass.

**Risk:** Very low. These aren't imported by the active flow.

### W2 — Fix profile strength bar
In `src/utils/profileCompleteness.ts`:
- Remove `commitment` (3 pts) from `MANDATORY_FIELDS`
- Remove `deepQuestions` (12 pts) from `MANDATORY_FIELDS` → **kill entirely, per Saul**
- Redistribute 15 pts across fields we actually collect so 100% is reachable
- Mirror the same change in `src/services/profileService.onboarding.ts` if needed

Net: a fully-filled new profile hits 100%.

### W3 — Merge duplicate edit screens
- `EditAboutScreen` already edits religion + politics + 4 lifestyle freqs
- `EditLifestyleScreen` edits only the 4 lifestyle freqs (duplicate)
- Delete `EditLifestyleScreen.tsx`
- Remove its route from `ProfileEditScreen.tsx` section list
- Update any navigation calls pointing to it

**Risk:** Low. Pure frontend.

### W4 — Algorithm rebalance (Option A — strip)
In `supabase/functions/_shared/scoring.ts`:
- Remove from the `WEIGHTS` object: `family`, `deep_questions`, `education`, `career`
- Delete the scoring functions for each (lines ~587–744: `scoreFamilyPlans`, `scoreDeepQuestions`, `scoreEducation`, `scoreCareer`)
- Redistribute the 17% across the 8 surviving categories. Proposed new weights:

| Category | Old | New |
|---|---|---|
| Interests | 22% | 25% |
| Values | 10% | 14% |
| Lifestyle | 10% | 12% |
| Age Range | 10% | 12% |
| Ethnicity | 10% | 12% |
| Religion | 7% | 9% |
| Politics | 7% | 8% |
| Height | 7% | 8% |
| **Total** | 83% | **100%** |

- Update the header doc comment to reflect the new 8-category model
- Verify no caller of `calculateCompatibility()` reads the removed category scores from the returned `breakdown` object — if so, strip those reads too

Edge functions affected (code change only, deploy deferred): `generate-proposals`, `generate-proposal-for-user`, any others that import from `_shared/scoring.ts`.

### W5 — Matchmaker flow
**No change.** Saul confirmed photo stays in onboarding.

### W6 — Database column cleanup (LOCAL ONLY)
Write a new migration file:

```
supabase/migrations/20260419000000_drop_dead_columns.sql
```

Drops from `user_profiles` (7):
1. `non_negotiables`
2. `matchmaking_only`
3. `location`
4. `latitude`
5. `longitude`
6. `hometown`
7. `profile_photo_path`

Drops from `user_preferences` (1):
8. `looking_for`

Before DROP, `grep` each column across `src/` and `supabase/functions/` to prove zero references. Apply to local via `supabase db reset` or direct exec_sql. **Do NOT run against prod.** Log it in `docs/migrations/MIGRATION_LOG.md` with a `LOCAL-APPLIED-ONLY` tag. Prod replay is a future separate event.

### W7 — Age NULL bug
**Deferred.** Not doing this now, per Saul.

---

## Scope decisions (locked)

**(a) Deep questions — KEEP as voluntary feature, not mandatory.**
- Table and answer UI stay
- Users can answer optionally; answers display on their profile and in the voting/proposal area
- **Removed from onboarding** (already true — no step collects them)
- **Removed from matching algo** (handled by W4 — `deep_questions` weight stripped)
- **Removed from profile strength mandatory list** (handled by W2)
- **Testing phase must verify** the display still works on profile + voting surfaces

**(b) `lookingFor` field — STRIP.**
- Add `user_preferences.looking_for` to the W6 drop migration (8 columns total now)
- Remove the `commitment` check from `profileCompleteness.ts` (already part of W2)
- Grep for any `looking_for` / `lookingFor` references in `src/` and remove

**(c) Role switch direction — KEEP one-way.**
- No code changes. Matchmaker → dater stays the only switch path.

---

## Order of work

```
W1 dead code  →  W2 profile bar  →  W3 edit screens merge  →  W4 algo rebalance
              →  W6 DB column migration (local only)  →  DONE
```

All frontend. All TypeScript/SQL. Nothing leaves local until Saul says so.

---

## Testing phase — one gate, happens after ALL workstreams are code-complete

### Step 1 — Fresh local mirror of prod
```bash
./scripts/snapshot-export.sh             # read-only prod dump
supabase db reset                        # wipe local, replay migrations
./scripts/snapshot-import.ts              # import prod data into local
./scripts/snapshot-import-photos.ts       # 566 photos
./scripts/check-schema-parity.sh          # verify local matches prod + new migration
```

Local now has: 207 users, 160 profiles, 84 friendships, 34 proposals, 423 votes, 566 photos — **minus** the 7 columns dropped in W6.

### Step 2 — Manual walkthrough
Using Expo + Mailpit against local:
1. **Dater flow** — walk all 16 steps fresh. Every field saves. Lands on MainTabs.
2. **Matchmaker flow** — walk all 8 steps. Lands on MatchmakerTabs.
3. **Profile strength** — fully-filled profile hits 100%. No more "answer 3 more questions" phantom prompt. (W2 gate)
4. **Edit profile** — tap every section. Confirm no duplicate edit paths. (W3 gate)
5. **Matching** — `generate-proposals` against imported prod users. Spot-check 10 compatibility scores. Confirm no NaN, no missing-field crashes. (W4 gate)
6. **Profiles still render** — pull up 20 imported prod users' profiles in the app, confirm nothing crashes from missing fields (W4 + W6 gate)
7. **Deep questions still display** — for a user who has answered deep questions, confirm they show on their profile AND inside the voting/proposal view (scope decision (a))
8. **Schema parity** — `./scripts/check-schema-parity.sh` should show drift ONLY on the 8 columns we intentionally dropped (W6 gate)

### Step 3 — Deploy (a SEPARATE future event, not part of this plan)
When Saul decides to ship:
1. Frontend → TestFlight
2. Edge functions → `supabase functions deploy`
3. Prod migration → `scripts/supabase-exec.sh` with the W6 SQL, only after explicit go-ahead

**Nothing deploys until Saul says "go" for that specific step.**

---

## Critical files to touch

| File | Workstream |
|---|---|
| `src/screens/onboarding/steps/*` (delete 13 files) | W1 |
| `src/screens/onboarding/steps/index.ts` | W1 |
| `src/config/onboardingMapping.ts` | W1 |
| `src/screens/onboarding/OnboardingScreen.tsx` (imports only) | W1 |
| `src/utils/profileCompleteness.ts` | W2 |
| `src/services/profileService.onboarding.ts` | W2 (if mirrors weights) |
| `src/screens/profile/EditLifestyleScreen.tsx` (delete) | W3 |
| `src/screens/profile/EditAboutScreen.tsx` (absorb) | W3 |
| `src/screens/profile/ProfileEditScreen.tsx` | W3 |
| `src/navigation/AppNavigator.tsx` (if EditLifestyle is routed) | W3 |
| `supabase/functions/_shared/scoring.ts` | W4 |
| `supabase/functions/generate-proposals/index.ts` | W4 (verify no direct refs to removed categories) |
| `supabase/functions/generate-proposal-for-user/index.ts` | W4 (same) |
| `supabase/migrations/20260419000000_drop_dead_columns.sql` (new) | W6 |
| `docs/migrations/MIGRATION_LOG.md` | W6 (log the new migration + LOCAL-APPLIED-ONLY flag) |
