# Plan: Rewrite Proposal Generation, Distribution & Lifecycle

## Context

**Why this is being made:** Multiple post-launch failures of the voting gate. Most recent: Devin had 0 votable proposals between Apr 15 7PM → Apr 16 7PM. Investigation revealed the system is structurally biased against putting proposals in users' gates:

- Each proposal gets only **6 new voters per cron run** (`VOTERS_PER_PROPOSAL`), capped at **30 total** (`MAX_POOL_VOTES`). With 121 active users, ~80% never see any given proposal.
- A proposal exits community-voting (status `pending` → `deciding`) **as soon as 3 yes votes hit** — typically within ~25 minutes of creation. After that it's invisible to everyone else's gate.
- Two mid-day instant-reject rules can also yank a proposal out of `pending` at random times.
- Result: even when proposals exist, 99% of users never get to vote on them. Devin happened to be assigned to 1 proposal in 24h, and that one got declined by a matched user before she opened the app.

**Intended outcome:** Every eligible community member is assigned to every active proposal. Status changes only happen at one predictable daily checkpoint (just before new proposals are generated). Decisions are based on community-wide vote rates, not the first 3 voters.

## Confirmed Rules (from interview)

### Proposal generation
- **Cadence**: daily, one cycle. Daily evaluation runs FIRST, then generation.
- **One active proposal per user** (unchanged).
- **Re-pairing**:
  - Reached `deciding` (regardless of declined/passed_to_match outcome) → **never** re-proposable.
  - Rejected during community-`pending` phase → re-eligible after **45 days**.
  - Expired (out of scope of this plan, but treated same as rejected: re-eligible after 45 days).
- Generation cap and score floor unchanged. New-user / starvation boosts unchanged.

### Voter assignment
- At proposal creation: insert one `pool_vote_assignments` row for **every eligible community member** (everyone except `user_a`, `user_b`, blocked users).
  - Friends of `user_a` / `user_b` ARE assigned (only excluded at gate-display time).
  - Paused / suspended users skipped.
- New users completing onboarding mid-cycle: assigned to **all current `pending` proposals** (not just 3).
- All caps removed: `VOTERS_PER_PROPOSAL`, `MAX_POOL_VOTES`, `DAILY_ASSIGNMENT_CAP`.

### Gate display (per user)
- 3 slots maximum (`GATE_SIZE = 3`, unchanged).
- Prefer non-friend proposals; fill with friend proposals only if fewer than 3 non-friend ones available.
- Friend votes stay weighted 1.25× (unchanged).
- Friend-proposal "vote" button outside the gate already exists — out of scope.

### Daily evaluation (one cron, runs ~5 minutes before generation)
For each `pending` proposal:
1. **If <25% of assigned voters have voted** → stay pending.
2. **Else if days alive ≥ 3** (force-decide):
   - yes-rate ≥ 50% → accept (`pending` → `deciding`)
   - else → reject
3. **Else** (quorum met, day < 3):
   - yes-rate < 35% → reject
   - yes-rate > 70% → accept
   - 35–70% → stay pending

### Mid-day rules — ALL removed
- Remove `IMMEDIATE_CANCEL_POOL_VOTES` (first-6-NO instant reject).
- Remove `REJECTION_FLOOR_*` (the ≥8 votes & <35% mid-day check).
- Remove the every-4-hour `proposal-lifecycle-check` cron run — only the daily run before generation matters.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/_shared/constants.ts` | Delete: `MAX_POOL_VOTES`, `IMMEDIATE_CANCEL_POOL_VOTES`, `REJECTION_FLOOR_YES_RATE`, `REJECTION_FLOOR_MIN_VOTES`, `THRESHOLD_SCHEDULE`, `CONFIRMATION_MIN_*`. Add: `DAILY_QUORUM_PCT = 0.25`, `REJECT_YES_RATE = 0.35`, `ACCEPT_YES_RATE = 0.70`, `DAY3_LENIENT_YES_RATE = 0.50`, `REPAIR_AFTER_DAYS = 45`. |
| `supabase/functions/generate-proposals/index.ts` | (a) Remove `VOTERS_PER_PROPOSAL`. Replace assignment block (lines 391-479) with single batch-insert of all eligible voters per new proposal. (b) Update `existingRes` query (line 87) and `existingPairs` set: split into `permanentBlock` (declined / passed_to_match) and `temporaryBlock` (rejected / expired with `rejected_at`/`expired_at` < NOW − 45 days re-allowed). |
| `supabase/functions/proposal-lifecycle/index.ts` | Rewrite the per-proposal loop (lines 73-200) to use the new daily-eval rules. Drop immediate-cancel and rejection-floor logic. Keep status updates, karma calls, notifications. |
| `supabase/functions/get-proposals-for-voting/index.ts` | (a) Remove JIT assignment block (lines 152-183) and `DAILY_ASSIGNMENT_CAP`. (b) Change query to fetch only proposals where the user has an existing `pool_vote_assignments` row with `has_voted=false` AND `proposals.status='pending'`. (c) Keep "prefer non-friend, fill with friend" ordering. |
| `supabase/functions/assign-new-user-proposals/index.ts` | Replace "shuffle and pick 3" (lines 58-63) with: insert assignments for all current `pending` proposals where the user is not `user_a`/`user_b`. |
| `supabase/functions/generate-proposal-for-user/index.ts` | Audit: this likely also needs voter assignment update for consistency (assign all eligible voters, not just `MAX_VOTING_GATE = 3`). Read first; modify if it touches `pool_vote_assignments`. |
| Cron config (`supabase/config.toml` or wherever `proposal-lifecycle-check` is scheduled) | Remove the every-4-hour `proposal-lifecycle-check` cron schedule. Keep daily `proposal-lifecycle` at `0 0 * * *` (UTC = 7PM Central CDT) and `generate-proposals` at `5 0 * * *` so eval runs first, then generation. |

## What WON'T Change (explicitly out of scope)

- One-active-proposal-per-user rule.
- `GATE_SIZE = 3`.
- Compatibility scoring algorithm and weights.
- New-user / starvation score boosts.
- `MAX_PROPOSALS_PER_RUN = 50` cap.
- "Community area" UI for friend votes (existing friend-proposal vote button stays as-is).
- Karma rules (we'll revisit `+10 assist` separately if it breaks under the new model).
- Frontend `ProposalReviewView` / progress dots (still 3 of 3).

## Verification (Local DB, Snapshot-Based)

Local Supabase already runs at `127.0.0.1:54321` per `MEMORY.md`.

1. **Snapshot prod state** (read-only):
   ```bash
   ./scripts/snapshot-export.sh
   ```
2. **Switch app to local**: confirm `.env.local` URL is `http://127.0.0.1:54321` (already configured).
3. **Reset local DB and import snapshot**:
   ```bash
   supabase db reset
   npx tsx scripts/snapshot-import.ts
   ```
4. **Deploy modified functions to local**:
   ```bash
   supabase functions serve --env-file .env
   ```
5. **End-to-end checks** (run in this order):
   - **Voter assignment scope**: invoke `generate-proposals` against local. Query: every new proposal should have a `pool_vote_assignments` row count equal to `eligible_voters - 2` (minus user_a, user_b, minus blocked). Run:
     ```sql
     SELECT p.id, p.created_at,
       (SELECT COUNT(*) FROM pool_vote_assignments WHERE proposal_id = p.id) AS assignees,
       (SELECT COUNT(*) FROM user_profiles WHERE profile_completed=true AND is_paused=false AND is_suspended=false) - 2 AS expected
     FROM proposals p WHERE p.created_at > NOW() - INTERVAL '5 minutes';
     ```
   - **Daily eval — quorum gate**: cast votes from <25% of voters, run `proposal-lifecycle`, confirm proposal still `pending`.
   - **Daily eval — accept**: cast 80% yes votes from ≥25% of voters, run `proposal-lifecycle`, confirm proposal moves to `deciding`.
   - **Daily eval — reject**: cast 80% no votes from ≥25% of voters, run `proposal-lifecycle`, confirm proposal moves to `rejected`.
   - **Daily eval — middle zone holds**: cast 50% yes / 50% no from ≥25% of voters, day 1, confirm stays `pending`.
   - **Day-3 lenient**: backdate a proposal's `voting_started_at` to 4 days ago, with 50% yes-rate, run `proposal-lifecycle`, confirm `deciding`.
   - **Day-3 lenient reject**: same, with 40% yes-rate, confirm `rejected`.
   - **Re-pairing 45 days**: take a `rejected` proposal, backdate `rejected_at` to 46 days ago, run `generate-proposals`, confirm the pair appears in candidate pool again.
   - **Re-pairing permanent block**: take a `declined` proposal, backdate to 60 days ago, confirm pair NEVER reappears.
   - **No mid-day actions**: cast 6 NO votes immediately after a proposal is created, do NOT run lifecycle, confirm proposal stays `pending` (used to instantly reject).
   - **New user assignment**: create a fresh test user, complete onboarding, invoke `assign-new-user-proposals`, confirm they're assigned to ALL current `pending` proposals.
6. **Open the local app as Devin** (`ds227@rice.edu`, password `localdev123`) and confirm her gate populates.

## Why-So-Few-Proposals Diagnosis (separate finding for the user)

Today's count of 5 proposals/cycle is NOT a bug to fix in this plan — it's the natural result of:
- 64 daters with completed profiles
- 30 already locked in active proposals (one-at-a-time rule, 3-day lifespans)
- 4 in active matches
- 23 pairs in the permanent block list (declined / passed_to_match)
- → ~30 daters free per cycle → ~15 candidate pairs after gender + age filtering → exclusive allocation picks the top 5

The 45-day re-pairing rule (this plan) will gradually expand the eligible pool by un-blocking ~17 of the 23 currently-blocked pairs that were rejected during the community phase. Volume per cycle should rise to ~8-12 over the next couple of weeks as the unblock window opens.

If you want MORE than that, the levers are: drop "one active per user" (you said no), add new users, or relax gender/age filtering (you said keep strict). Nothing more in scope.

## Risk Notes

- **Database write volume**: assignment rows go from ~6 per proposal to ~119 per proposal. With 5 proposals/cycle that's ~600 inserts vs ~30 today — fine.
- **Front-end gate query**: now returns rows for every assigned proposal (could be many). The `LIMIT GATE_SIZE = 3` still applies in the SQL. Confirm pagination is correct.
- **Karma "assist" bonus** may stop firing under the new model. Will surface as a follow-up after deploy.
- **Daily-only decisions** mean a "clearly bad" proposal (all NO votes) sits in everyone's gate for up to 24h before getting cleared. User has accepted this trade.

---

# Status (2026-04-18) — SHIPPED

The plan above was executed in a revised v2 form. Production deploy completed 2026-04-18 23:52–23:54 UTC.

**What shipped vs this plan:**
- Voter assignment via `pool_vote_assignments`: **dropped entirely** (pre-insertion was redundant under "every user votes on every proposal"). Gate now uses a dynamic SELECT against `proposal_votes` + `blocked_users` + `user_profiles` on every fetch.
- Day 1-2 rules: changed from `<25% turnout → stay pending` to `<8 absolute votes → stay pending`. The turnout-percent rule was mathematically broken under the new assignment-all model (max possible turnout per proposal was ~12% given GATE_SIZE=3).
- Day 3+: `≥50% yes-rate → deciding, else reject` (including 0-vote → reject). No min-vote floor on day 3 (force-decide).
- Karma: simplified to `+1 per vote + 3 if accurate − 1 if inaccurate`. Dropped the old `+10 assist` and `+2 / +3 split`. Idempotency via `proposals.karma_applied` flag.
- Auto-expire on pause/suspend: added as DB trigger `trg_auto_expire_on_pause`.
- Removed `proposal-lifecycle-check` every-4h cron.

**Reference docs now in this repo:**
- `docs/migrations/MIGRATION_LOG.md` entries #79–82 (our M1–M4)
- `CLAUDE.md` "Voting Gate" section rewritten for gate-overhaul-v2

---

# Appendix A: Deferred — Bump Gate to 5 Proposals

Not shipped in the 2026-04-18 push. Needs a coordinated frontend + backend release (App Store review cycle for the frontend side).

## Summary
Backend: `GATE_SIZE = 3` → `5` in `get-proposals-for-voting`. Frontend: `src/services/communityBackendService.ts` line 360 `>= 3` → `>= 5`, line 367 `Math.min(..., 3)` → `Math.min(..., 5)`. Consider extracting `5` to a named constant `DAILY_VOTE_TARGET`.

## Frontend audit (read-only, done 2026-04-18)
| Location | Dynamic? | Change needed? |
|---|---|---|
| `ProposalReviewView.tsx` ProgressDots | Yes (uses `proposals.length`) | No |
| `ProposalReviewView.tsx` progress label | Yes | No |
| `communityBackendService.ts:360` | Hardcoded 3 | Yes → 5 |
| `communityBackendService.ts:367` | Hardcoded 3 | Yes → 5 |
| `ProposalReviewView.tsx:8` JSDoc | Comment only | Optional cosmetic |

## Why deferred
Requires frontend build through App Store review (1–3 days). Backend-only bump is harmless but misaligned with completion state until app update lands. Coordinate.

## Approach
Option B — show up to 5, no onboarding quota subtraction. A user who voted 1 in onboarding sees up to 5 in Community (possibly 6 total that day). Engagement not throttled.

## Open questions (for implementation day)
- Other hardcoded 3s elsewhere? Wider grep before shipping.
- Is 5 the right number? Data-driven revisit after launch.

---

# Appendix B: Recommendation-boost design revisit

The `generate-proposals` function reads `friend_recommendations` (fix shipped 2026-04-18) and applies a flat 1.25× score multiplier to any pair that has at least one recommendation.  Simple, dedup'd — one recommendation = one 1.25× boost regardless of how many people vouched.  Good enough for launch; revisit when bumping gate to 5.

Options to consider at revisit:
1. **Stack boosts per recommender** — use the unused constants `RECOMMENDATION_BOOST_PER=5`, `RECOMMENDATION_BOOST_CAP=15` in `_shared/constants.ts` to add +5 per unique recommender up to +15.
2. **Consumption cleanup** — delete `friend_recommendations` rows once their pair has been proposed (avoids perpetual boost on pairs that got rejected and then re-paired 45 days later).
3. **Feedback loop** — notify the recommender when their suggestion resulted in a proposal.

---

# Appendix C: Known issues deferred from 2026-04-18 deploy

**C1. LiveVoteBar doesn't visibly render on high-vote proposals.**
Observed by Saul during the post-deploy manual test: on a proposal with 37 existing votes, the `LiveVoteBar` appeared not to render or updated slowly, while fresh 0-vote proposals rendered fine. DB-side is correct (tallies accurate). Not caused by this deploy — we didn't modify `LiveVoteBar.tsx` or realtime subscriptions. Investigate: `src/components/community/proposal/LiveVoteBar.tsx` + `ProposalReviewView.hooks.ts`. Priority: LOW, cosmetic.

**C2. Concurrent-vote tally race.**
Parallel stress test (20 simultaneous votes on same proposal) lost 1 of 12 expected YES increments — pre-existing bug in `increment_proposal_tallies` RPC's read-modify-write pattern. Drift is bounded (1–2% under burst). Fix: convert RPC to atomic `SET x = x + :delta` via SQL expressions, or an AFTER INSERT trigger that maintains tallies from `proposal_votes` count. Priority: LOW until burst traffic becomes common.

**C3. Stale-vote `+1 karma` farming on random UUIDs.**
`process-vote` stale path grants `+1` if insert fails with FK violation (fake proposal UUID). Capped by the 50/day vote limit, so attacker maxes at +50/day. Fix: return 404 when `!proposal` instead of going down the silent-success path. Priority: LOW; accepted by product as an acceptable abuse vector for launch.

**C4. `pool_vote_assignments` dead rows.**
As of the deploy: ~3878 rows in prod, no writes anymore (new generate-proposals doesn't insert). Table can be dropped in a future cleanup migration after 1–2 weeks of verified stability. Priority: LOW.

**C5. Local schema drift — `onboarding_progress`, `user_profiles.email`, `vote_context`.**
These columns/tables exist in prod (added via manual ALTERs outside the migration chain) but aren't in the local migration chain. Tonight we added them inline to local for testing; the "proper" fix is to add them to the migration chain (or the `20260417000001_add_missing_production_columns.sql` backfill) so `supabase db reset` produces a prod-mirror local. Priority: MEDIUM — affects developer experience.
