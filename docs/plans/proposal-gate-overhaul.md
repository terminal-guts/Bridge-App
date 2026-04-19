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

# Appendix A: Deferred Tickets — Bump Gate to 5 Proposals

---

## A1 — Raise `GATE_SIZE` from 3 to 5

**Status (2026-04-19):** Backend half **staged to branch** (`feat/gate-overhaul-followups`, commit `676518d`). Do NOT deploy standalone — the frontend threshold bump in `src/services/communityBackendService.ts` (`hasVoted >= 3` → `>= 5`, `Math.min(..., 3)` → `5`) must be live on the App Store first. Bundle with other frontend agents' App Store release. See runbook in MIGRATION_LOG.md "A1-BE" entry for deploy command + rollback.

### Problem
Users open Community, vote 3 times in under a minute, and bounce. The 3-vote cap limits daily engagement and slows how fast pending proposals reach the 8-vote decision threshold. Raising to 5 gives each user more throughput per session and helps proposals resolve faster.

### Root cause (why deferred)
Requires a coordinated frontend + backend release. The frontend change needs an App Store review cycle (1–3 days). Deploying only the backend bump works mechanically but leaves the frontend's completion-state logic firing at 3, which feels inconsistent until the app release lands.

### Acceptance criteria
- **Backend**: `get-proposals-for-voting` returns up to 5 proposals per request (was 3).
- **Frontend**: `getCommunityTaskProgress` returns `hasVoted=true` once the user has voted 5 times since the last 7PM Central reset (was 3).
- **Frontend**: `proposalsVotedCount` caps at 5 (was 3).
- **UI**: progress dots show "1 of 5, 2 of 5, … 5 of 5" automatically (already dynamic via `proposals.length` — no code change needed).
- **Edge case**: if the backend has fewer than 5 eligible proposals, gate shows however many exist and completes once user votes on all of them (existing "≥N AND 0 remaining" logic still applies, just with N=5).
- User who voted 1 during onboarding may see up to 5 in Community (total 6 that day) — this is acceptable per prior product call.

### Approach
- **Backend** — `supabase/functions/get-proposals-for-voting/index.ts`:
  - `const GATE_SIZE = 3` → `5` (single line, ~line 14).
- **Frontend** — `src/services/communityBackendService.ts`:
  - Line 360: `const hasVoted = votesCompleted >= 3` → `>= 5`.
  - Line 367: `Math.min(votesCompleted, 3)` → `Math.min(votesCompleted, 5)`.
  - Recommended: extract `5` to a named constant `DAILY_VOTE_TARGET` at the top of the file so it's a single point-of-truth.
- **Optional cosmetic** — `src/components/community/proposal/ProposalReviewView.tsx` line 8 JSDoc example: "(1 of 3, 2 of 3, 3 of 3)" → "(1 of N, 2 of N, …)".

### Test plan (local, prod-mirror)
1. `./scripts/bootstrap-local.sh` — produce a prod-faithful local.
2. Log in as a test user. Verify `get-proposals-for-voting` returns 5 proposals in the response body.
3. Vote through all 5 in the Community tab. Verify:
   - Progress dots render 1-of-5 through 5-of-5.
   - After 5th vote, gate completes and navigates to friends area.
   - DB shows 5 vote rows + karma +5.
4. Edge case: delete 3 of the 5 proposals before gate fetch (simulate fewer available). Verify user sees only 2, gate completes at 2.
5. Onboarding handoff: complete onboarding (1 vote) → open Community. Verify Community gate shows up to 5 fresh proposals (total 6 votes possible that day — OK).

### Dependencies
- Frontend change must ship through App Store release before backend deploy (or same-day coordination).
- No DB migration needed.

### Effort
~15 min code + 30 min local test + 1–3 days App Store review + ~5 min backend deploy.

### Risk
**LOW** — isolated change, easy rollback (bump back to 3).

### Rollback
- Backend: redeploy `get-proposals-for-voting` with `GATE_SIZE = 3`.
- Frontend: next app release reverts the two constants.

---

# Appendix B: Deferred Tickets — Recommendation-Boost Design Revisit

The `generate-proposals` function currently applies a flat 1.25× score multiplier to any pair that has at least one row in `friend_recommendations`. This is the simplest working system and was shipped 2026-04-18. These three tickets explore refinements to revisit once we have real-world data on how often the boost actually changes which pairs win exclusive allocation.

---

## B1 — Stack boosts per unique recommender

### Problem
Currently a pair with 1 recommender gets the same 1.25× boost as a pair with 5. This loses signal — multiple recommenders should indicate stronger community belief in the pair.

### Root cause (why deferred)
The simplest dedup model was shipped for launch. Stacking design requires product input on whether boost should scale linearly with recommender count or taper.

### Acceptance criteria
- Pair with N unique recommenders gets a score adjustment of `Math.min(RECOMMENDATION_BOOST_PER * N, RECOMMENDATION_BOOST_CAP)` added to the compatibility score.
- At most `RECOMMENDATION_BOOST_CAP / RECOMMENDATION_BOOST_PER` recommenders can matter (e.g., with 5 and 15 in constants, 3+ recommenders hit the cap).
- Constants from `_shared/constants.ts` (`RECOMMENDATION_BOOST_PER = 5`, `RECOMMENDATION_BOOST_CAP = 15`) finally get used.
- `Math.min(100, score)` cap still applies at the end.

### Approach
- `supabase/functions/generate-proposals/index.ts` scoring section:
  - Replace the existing `if (suggestedPairs.has(pairKey)) { result.total_score *= 1.25 }` block.
  - Build `recommenderCountByPair: Map<string, number>` from `friend_recommendations` grouped by `(recommended_person_id, recommended_to_friend_id)`.
  - For each candidate, look up count for pair key, compute `boost = Math.min(count * RECOMMENDATION_BOOST_PER, RECOMMENDATION_BOOST_CAP)`, add to score (ADDITIVE, not multiplicative).

### Test plan
- Seed `friend_recommendations` with 0, 1, 2, 3, 5 recommenders for 5 different pairs.
- Invoke `generate-proposals` locally. Verify score deltas:
  - 0 recommenders: no boost
  - 1 recommender: +5
  - 2: +10
  - 3: +15 (cap hit)
  - 5: +15 (cap still holds)

### Dependencies
None.

### Effort
~30 min code + 45 min local test.

### Risk
**LOW** — scoring tweak only, hard filters (gender, age, blocks) unchanged.

---

## B2 — Consumption cleanup on friend_recommendations

### Problem
A `friend_recommendations` row persists forever once created. If the recommended pair gets rejected and then re-paired 45 days later, the old boost still applies — even though the recommender's opinion may be stale. Also, as the table grows, `generate-proposals` scans more rows per cycle.

### Root cause (why deferred)
Simple-path shipped without consumption logic. Bounded growth is fine at current user scale; revisit before we 10× the user base.

### Acceptance criteria
- When `generate-proposals` creates a proposal from a recommended pair, the corresponding `friend_recommendations` row(s) for that pair are deleted.
- If the proposal is later rejected/expired and the pair becomes re-eligible 45 days later, no stale boost applies unless a user re-recommends.
- Indirectly limits table size to active-recommendation count.

### Approach
- `supabase/functions/generate-proposals/index.ts` after the `.insert({...})` into proposals succeeds:
  ```ts
  await supabase
    .from('friend_recommendations')
    .delete()
    .or(`and(recommended_person_id.eq.${pair.user_a_id},recommended_to_friend_id.eq.${pair.user_b_id}),and(recommended_person_id.eq.${pair.user_b_id},recommended_to_friend_id.eq.${pair.user_a_id})`);
  ```

### Test plan
- Seed a recommendation for pair (A, B).
- Run `generate-proposals`. Verify proposal (A, B) was created AND the recommendation row is deleted.
- Expire the proposal. Run `generate-proposals` again 46 days later (backdate). Verify pair (A, B) candidate gets NO boost (row is gone).
- If user re-recommends after expiry, boost returns on next cycle.

### Dependencies
None.

### Effort
~20 min code + 30 min test.

### Risk
**LOW** — deletion is scoped to the single consumed pair.

---

## B3 — Feedback loop: notify recommender when suggestion converts

### Problem
Recommenders never learn whether their suggestion had any effect. Losing this signal = lower engagement with the Recommend feature over time.

### Root cause (why deferred)
Notifications were out of scope for gate-overhaul-v2. Depends on existing notification infrastructure (cron-based push).

### Acceptance criteria
- When `generate-proposals` creates a proposal from a recommended pair, each unique recommender receives a push notification: "Your recommendation of {friend_name} just created a match — let's see how it goes."
- Notification fires once per (recommender, pair) — no duplicate pings.
- Respects existing notification preferences in `user_settings`.

### Approach
- Combine with B2 (consumption cleanup): same DELETE statement returns the list of recommenders that are about to be consumed.
- Before deletion, query their user_ids.
- Call existing push-notification RPC with a new template (`recommendation_converted`).

### Test plan
- Seed recommender A recommends (B, C). Seed recommender X recommends (B, C).
- Run `generate-proposals`. Verify A and X each receive 1 notification.
- Verify only 1 notification per (recommender, pair) — even if X recommended twice.

### Dependencies
Requires existing push-notification scaffolding (`notification-log` table, `send-push` helper).

### Effort
~1 hr code + 1 hr test.

### Risk
**LOW** — additive; failures should not block proposal creation (wrap in try/catch with logging).

---

# Appendix C: Known Issues Deferred from 2026-04-18 Deploy

---

## C1 — LiveVoteBar doesn't visibly render on high-vote proposals

### Problem
Observed by the product owner during post-deploy manual testing (2026-04-18): on a proposal with 37 existing votes, the `LiveVoteBar` appeared not to render (or rendered slowly). Fresh 0-vote proposals rendered fine. The cached memory entry is `project_livevotebar_bug_apr18.md`.

### Root cause (identified 2026-04-18 investigation)
**Not a bug — by-design gating.** `ProposalReviewView.tsx:449` wraps the bar in `{hasVotedCurrent && (...)}`. The bar is intentionally hidden until the viewing user has voted on this proposal, to avoid biasing their decision with the existing tally. What the product owner observed on the 37-vote proposal was the bar staying hidden until they cast a YES/NO — it then reveals. This matches the design comment `{/* ── Vote bar — only visible after voting ── */}`.

Inside `LiveVoteBar.tsx` itself, the same guard is duplicated defensively (`if (total === 0 || !hasVoted) return <placeholder>`), so even if the parent passed `hasVoted=false` the bar would show a neutral shimmer rather than the tally — it would never leak pre-vote counts.

### Resolution paths (product decision, not code fix)
1. **Close as wontfix** — the design is correct; the product owner should expect the bar after voting, not before. Add a faint hint like "Results reveal after you vote" to set expectations.
2. **Flip the design** — always show the tally regardless of `hasVotedCurrent`. Requires removing the gate at `ProposalReviewView.tsx:449` and changing the default `hasVoted` prop semantics. One-line change, but a meaningful UX shift.

No implementation recommended until the product owner decides which path. Leave `LiveVoteBar.tsx` untouched — the component is correct.

### Acceptance criteria
- LiveVoteBar renders within 500 ms of the proposal card becoming visible, regardless of existing vote count.
- Updates in realtime as new votes arrive (preserve existing behavior).
- No console errors or warnings on render.

### Approach
1. **Reproduce locally**: `./scripts/bootstrap-local.sh` to get prod-mirror data. Open a proposal with ≥30 existing votes in the Community tab. Observe rendering timeline.
2. **Inspect**:
   - `src/components/community/proposal/LiveVoteBar.tsx` — find initial render logic.
   - `src/components/community/proposal/ProposalReviewView.hooks.ts` — check realtime subscription setup and whether it initializes from gate-fetch props.
3. **Likely fix**: ensure the component renders from `proposal.pool_yes_votes`/`pool_no_votes` props immediately, then subscribes to realtime deltas. Don't wait for subscription ack before first paint.

### Test plan
- Local: seed proposals with vote counts 0, 1, 10, 30, 50. Verify each renders within 500 ms.
- Live: vote on a proposal; verify bar updates smoothly as counts change.
- Regression: verify progress dots + overall voting flow unchanged.

### Dependencies
Frontend change → App Store release. **Bundle with A1 (gate=5 frontend change) for a single release.**

### Effort
~1 hr investigation + 30 min fix + 30 min test.

### Risk
**LOW** — isolated UI component.

---

## C2 — Concurrent-vote tally race

**Status (2026-04-19):** Migration M6 (`supabase/migrations/20260418100002_increment_tallies_status_guard.sql`) **staged to branch** (commit `64b641d`). Awaiting prod deploy approval. Adds the `AND status = 'pending'` guard to `increment_proposal_tallies`; signature unchanged; `CREATE OR REPLACE` — drop-in. See MIGRATION_LOG.md "M6" entry for deploy command + rollback.

### Problem
Parallel stress test (20 simultaneous votes) during pre-deploy testing lost 1 of 12 expected YES increments. `proposal_votes` had all 20 rows (unique constraint protected), but the denormalized `pool_yes_votes` counter on `proposals` drifted by 1.

### Root cause
`increment_proposal_tallies` RPC uses read-modify-write pattern. Two concurrent votes read the same tally value, each compute `x + 1`, and one write overwrites the other. Postgres row-level locking should serialize — something in the RPC is letting one slip.

### Acceptance criteria
- 100 parallel votes on the same proposal result in exactly 100 counted tallies (matching `proposal_votes` row count).
- No drift under any concurrency pattern verified by the local stress test script.
- Atomicity preserved for mixed YES/NO vote types and friend vs pool weights.

### Approach (recommended)
- New migration that rewrites `increment_proposal_tallies` to use atomic SQL expressions in a single UPDATE:
  ```sql
  UPDATE proposals SET
    pool_yes_votes = pool_yes_votes + p_pool_yes,
    pool_no_votes = pool_no_votes + p_pool_no,
    friend_yes_votes = friend_yes_votes + p_friend_yes,
    friend_no_votes = friend_no_votes + p_friend_no,
    weighted_yes = weighted_yes + p_weighted_yes,
    weighted_no = weighted_no + p_weighted_no,
    updated_at = NOW()
  WHERE id = p_proposal_id
    AND status = 'pending';  -- also guards against the pause-trigger race (BUG-04 equivalent)
  ```
- Using Postgres column-level expressions ensures row lock is held only for the UPDATE duration — no read-side race window.

### Alternative (more invasive)
Drop denormalized columns entirely, compute counts from `proposal_votes` via a trigger or on-read query. Eliminates drift permanently but is a bigger refactor affecting `proposal-lifecycle` queries.

### Test plan
- Local: adapt the existing `/tmp/concurrency-test.mjs` script (from the 2026-04-18 session) to fire 100 parallel votes.
- Verify `proposal_votes` row count equals `pool_yes_votes + pool_no_votes + friend_yes_votes + friend_no_votes` exactly.
- Day-3 edge case: decide a proposal that was near the 50% threshold pre-fix — re-run post-fix to confirm no off-by-one flips the decision.

### Dependencies
None.

### Effort
~1 hr migration + 1 hr local concurrency test.

### Risk
**MEDIUM** — changes an RPC touching live vote data. Mitigate via idempotent `CREATE OR REPLACE FUNCTION`, pre-deploy comparison of function bodies, and rollback script ready before the push.

### Rollback
- Keep a copy of the current RPC body (captured in `snapshots/prod-backup-2026-04-18/rpc-defs.json`).
- Redeploy old definition via `exec_sql` if issues surface.

---

## C3 — Stale-vote `+1 karma` farming on random UUIDs

**Status (2026-04-19):** Fix **staged to branch** (commit `d93ff72`). Awaiting prod deploy approval. Edge function only — no migration. See MIGRATION_LOG.md "C3" entry for deploy command + rollback. Verified frontend-compatible: `ProposalReviewView.hooks.ts:277` treats 404 same as 400/403 (silent advance + background refresh).

### Problem
Attacker logged in as any valid user can send votes with random UUIDs as `proposal_id`. The `process-vote` stale-path handler grants `+1` karma on FK-violation inserts (meaning the proposal doesn't exist at all). Capped by the 50-votes/day rate limit, so maximum damage is +50/day.

### Root cause
The silent stale-vote path was designed for "proposal exists but is no longer votable" (expired, rejected, subject paused). It does not distinguish that from "proposal doesn't exist at all." Error-code check only blocks the unique-violation case, not the FK-violation case.

### Acceptance criteria
- Vote on a UUID matching NO existing proposal → returns **404 "Proposal not found"**, no karma granted, no row inserted.
- Vote on a real-but-stale proposal (status in {expired, rejected, deciding}, or subjects paused/suspended) → returns 200 silent success with +1 karma once (existing behavior preserved).
- Vote on a valid pending proposal → full normal flow (unchanged).

### Approach
- `supabase/functions/process-vote/index.ts` stale-handler section. Before calling `handleStaleVote`, short-circuit when proposal is null:
  ```ts
  if (!proposal) {
    return Response.json({ error: 'Proposal not found' }, { status: 404, headers: corsHeaders });
  }
  ```
- The existing stale-vote path (for real-but-stale proposals) continues handling its cases unchanged.

### Test plan
- Vote with random UUID → expect 404, verify no new `proposal_votes` row, verify karma unchanged.
- Vote on expired proposal → expect 200 + karma +1 (regression check).
- Vote on valid pending proposal → expect 200 + karma +1 + tally increment (regression check).
- Daily rate-limit: verify the 404 path still counts against (or doesn't, per product call) the 50/day cap.

### Dependencies
None.

### Effort
~15 min code + 30 min test.

### Risk
**LOW** — tightens an already-graceful path.

---

## C4 — `pool_vote_assignments` dead rows (table cleanup)

### Problem
As of 2026-04-18 deploy, the `pool_vote_assignments` table contains ~3878 rows but no function writes to it anymore. Dead data adds noise to backups, grows disk usage over time, and confuses future developers who may wrongly assume it's live.

### Root cause
Gate-overhaul-v2 removed the assignment-write path but kept the table to avoid breaking `delete_user_account` and to preserve forensic data during the stability window.

### Acceptance criteria
- After **2+ weeks of verified zero-writes** post-deploy (so rollback to old code wouldn't break), drop the table.
- No code reference remains in `src/` or `supabase/functions/` (except possibly an idempotent cleanup line in `delete_user_account`).
- `MIGRATION_LOG.md` records the cleanup migration.
- `supabase db reset` no longer creates the table.

### Approach
1. Run `grep -rE "pool_vote_assignments" src/ supabase/functions/ supabase/migrations/` to confirm remaining references. Expected: RLS policies in older migrations (idempotent, harmless) + `delete_user_account` RPC.
2. Update `delete_user_account` RPC: remove or no-op the `DELETE FROM pool_vote_assignments` line.
3. New migration `<YYYYMMDD>_drop_pool_vote_assignments.sql`:
   ```sql
   DROP TABLE IF EXISTS pool_vote_assignments CASCADE;
   ```

### Test plan
- Local: apply migration, verify `supabase db reset` completes without error, verify `delete_user_account` RPC still works end-to-end.
- Prod: pre-deploy read-only check that zero writes occurred in the last 14 days: `SELECT COUNT(*) FROM pool_vote_assignments WHERE created_at > NOW() - INTERVAL '14 days'`.
- Post-deploy: verify schema parity via `check-schema-parity.sh`.

### Dependencies
- **2+ weeks of stability** since 2026-04-18 deploy (do not ship before 2026-05-02).

### Effort
~30 min code + 30 min test + verification query.

### Risk
**LOW** after the stability window. Table drop is destructive but the data is dead; keep a pre-drop backup via `pg_dump` of the table.

---

## C5 — Local schema drift (migration-chain backfill)

### Problem
Several columns and tables exist in production (added via manual `ALTER` statements outside the migration chain) but are missing from the local migration chain. Running `supabase db reset` does not reproduce production state; developers must manually add missing columns to test anything that queries them. This friction bit us multiple times during the 2026-04-18 session.

### Concretely missing from local
- `user_profiles.profile_completed` — partially handled by `20260417100002_local_align_profile_completed.sql` (LOCAL_ONLY)
- `user_profiles.email` — missing locally (was added manually in prod)
- `proposals.vote_context` — missing locally
- `onboarding_progress` table — missing locally (added manually in prod)
- `storage.buckets` entry for `profile-photos` — missing locally (manually created during 2026-04-18 session)
- Likely more — requires a schema-drift audit

### Root cause
Early-stage Supabase development did not discipline manual schema changes into migrations. Each ad-hoc `ALTER TABLE` in prod was never backfilled into the migration chain.

### Acceptance criteria
- `./scripts/bootstrap-local.sh` produces a local database that passes `./scripts/check-schema-parity.sh` with zero unexpected drift.
- Every column, table, index, trigger, and RLS policy present in production is reproduced by a migration in `supabase/migrations/` (or is explicitly documented as LOCAL_ONLY / expected drift in `scripts/schema-diff-ignore.json`).
- Fresh developer machine can clone repo, run `bootstrap-local.sh`, and have a faithful local environment without manual ALTER statements.

### Approach
1. Enumerate current drift:
   ```bash
   ./scripts/dump-prod-schema.sh && ./scripts/dump-local-schema.sh
   ./scripts/diff-schemas.py snapshots/prod-schema-<today>.json snapshots/local-schema-<today>.json > drift-report.txt
   ```
2. For each A-only (prod-only) item, decide: add to migration chain (LOCAL backfill) or ignore (expected drift, add to ignore list).
3. Extend the existing `20260417100002_local_align_profile_completed.sql` OR create new `local_align` migrations for the remaining columns/tables.
4. Document each migration in `MIGRATION_LOG.md` as LOCAL_ONLY.
5. Re-run full test battery from gate-overhaul-v2 after reset + import to verify no regression.

### Test plan
- Wipe local: `supabase db reset`
- Run `./scripts/bootstrap-local.sh` (no `--no-photos`) end-to-end
- `./scripts/check-schema-parity.sh` → zero drift (or only deliberately-ignored entries)
- Run all 15 scenarios from the gate-overhaul-v2 test battery — all pass without manual ALTERs

### Dependencies
None.

### Effort
- 2-3 hrs investigation + enumeration
- 1 hr writing migrations
- 1 hr test battery
- Total: ~4–5 hrs

### Risk
**LOW** — LOCAL_ONLY migrations, no prod impact.

---

# Execution Order (recommended)

Work the deferred items in this sequence to maximize leverage and minimize coordination overhead:

| Phase | Item | Rationale |
|---|---|---|
| **1** | Refine this doc (done — you're reading it) | Plan before execute |
| **2a** | **C5 — Local schema drift** | Makes all subsequent local testing faithful to prod. Highest leverage per hour. |
| **2b** | **C3 — Stale-vote karma farming** | Security-adjacent, ~15 min code, fast ship. |
| **2c** | **C2 — Concurrent-vote tally race** | Data integrity. New migration + stress test. |
| **2d** | **C4 — pool_vote_assignments drop** | Wait until ≥ 2026-05-02 for 2-week stability window. Then simple cleanup. |
| **3** | **A1 — Gate=5 (frontend + backend)** | Bundle with **C1 (LiveVoteBar)** in a single frontend release through App Store. Coordinate backend deploy on the day the app release goes live. |
| **4** | **B1 / B2 / B3** (recommendation-boost refinements) | Revisit with post-launch data. Can ship independently. |

### Cross-branch coordination
- These tickets are being tracked on branch `feat/gate-overhaul-followups` (cut from main).
- Separate from `plan/proposal-gate-overhaul` (email-signup / image-moderation / onboarding polish stream).
- Ship each ticket as its own PR to main where possible.
