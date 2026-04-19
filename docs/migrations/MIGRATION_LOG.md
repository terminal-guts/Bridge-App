# Migration Log

Single source of truth for every SQL migration's state. Ordered by filename (timestamp).

## Legend

- **PRODUCTION** — applied to prod, verified live
- **LOCAL_VERIFIED** — applied locally, verified via tests; pending prod push
- **LOCAL_ONLY** — applied locally only; deliberately excluded from prod (e.g., catch-up migrations where prod already has the change)
- **NEW** — not yet applied anywhere

## Gate-overhaul-v2 follow-up: local schema parity (2026-04-18)

| # | File | Purpose | Status | Applied LOCAL | Applied PROD | Idempotent? | Notes |
|---|------|---------|--------|---------------|--------------|-------------|-------|
| M5 | `20260418100001_local_align_prod_schema.sql` | Backfills every prod-only object that was added via manual ALTER/CREATE outside the migration chain (4 tables, 10 columns, 5 indexes, 2 policies, 1 trigger, `citext` extension, `handle_updated_at()`, `support_reply_context` RLS, `user_profiles.role` NOT NULL) | **NEW** | pending reset | 🚫 NOT APPLIED (prod already has every object) | Yes (every statement is guarded via `IF NOT EXISTS` / `CREATE OR REPLACE` / `DO $block$ ... NOT EXISTS` / `DROP TRIGGER IF EXISTS` first) | Catch-up migration only — closes the C5 drift ticket. Accompanied by updates to `scripts/schema-diff-ignore.json` + `scripts/diff-schemas.py` so remaining drift (dead `profiles` table, legacy prod-only functions, functionally-equivalent policy names, local-only improvements) is documented as expected. |
| M6 | `20260418100002_increment_tallies_status_guard.sql` | Tightens `increment_proposal_tallies` RPC with `AND status = 'pending'` guard to prevent tick-after-expiry drift when the pause trigger fires mid-vote | **NEW** | pending reset | ⏳ pending approval | Yes (`CREATE OR REPLACE FUNCTION`, signature unchanged, REVOKE/GRANT re-asserted) | Closes C2 in proposal-gate-overhaul plan. UPDATE was already atomic via column expressions; this adds the missing auto-expire-race guard. No callers change. |

### Non-migration changes staged alongside M5 / M6 (edge functions)

These are tracked here because deploying them to prod is part of the same approval batch as M6. They are NOT SQL migrations — they ship via `supabase functions deploy`.

| # | File | Purpose | Status | Applied LOCAL | Applied PROD | Rollback | Notes |
|---|------|---------|--------|---------------|--------------|----------|-------|
| C3 | `supabase/functions/process-vote/index.ts` | Closes +1 karma farming on random proposal UUIDs: short-circuits with 404 before ever reaching the silent stale-vote path. Rate limit, suspended-voter check, and TOCTOU-race +1 for cascade-deleted-mid-request all preserved. | **STAGED** (commit `d93ff72`) | pending reset | ⏳ pending approval | `git checkout main -- supabase/functions/process-vote && supabase functions deploy process-vote` | Frontend already tolerates 404 (`ProposalReviewView.hooks.ts:277` handles 400/403/404 identically — silent advance). |
| A1-BE | `supabase/functions/get-proposals-for-voting/index.ts` | Bumps `GATE_SIZE` 3 → 5. Backend gives up to 5 proposals per gate fetch. | **STAGED** (commit `676518d`) | pending reset | 🚫 HOLD — deploy only on the App Store release day when the frontend `hasVoted >= 5` threshold is live. Shipping backend alone would close the gate at vote 3 despite 5 being returned. | Redeploy previous `get-proposals-for-voting` with `GATE_SIZE = 3`. | Lockstep release required with frontend bump in `src/services/communityBackendService.ts`. |

### Residual drift after M5 (documented as expected)

- `profiles` table and `set_profiles_updated_at` trigger — dead legacy in prod, unused; ignored.
- `exec_sql`, `get_user_by_email` and ~46 legacy RPCs — prod-only admin/legacy functions; ignored.
- `proposal_votes.unique_proposal_vote` — equivalent to local `unique_vote_per_proposal` (same columns, constraint-generated); ignored.
- `proposals.unique_proposal_pair` — superseded by local `unique_active_proposal_pair` (order-independent, status-aware); local is better; ignored.
- `friend_badges` policy role drift (`authenticated` vs `public`) — functionally equivalent; ignored.
- `onboarding_progress` policies — local uses `own_onboarding_progress_modify` + `_select` (split); prod uses one `Users can manage their own onboarding progress` (combined); functionally equivalent; ignored both sides.
- `get_leaderboard_data` volatility — VOLATILE in prod, STABLE locally; cosmetic; ignored.

## Proposal-gate overhaul v2 (2026-04-17 → 2026-04-18)

| # | File | Purpose | Status | Applied LOCAL | Applied PROD | Idempotent? | Notes |
|---|------|---------|--------|---------------|--------------|-------------|-------|
| M1 | `20260417100001_remove_proposal_lifecycle_check_cron.sql` | Unschedule the 4-hour `proposal-lifecycle-check` safety-net cron | **PRODUCTION** | 2026-04-17 | **2026-04-18 23:52 UTC** ✅ | Yes (`WHERE EXISTS` guard) | Gate-overhaul-v2 consolidates all decisions into the single 7PM cron |
| M2 | `20260417100002_local_align_profile_completed.sql` | Adds `user_profiles.profile_completed` column (already exists in prod) | LOCAL_ONLY | 2026-04-17 | 🚫 NOT APPLIED (prod already has it) | Yes (`IF NOT EXISTS`) | Catch-up migration — fixes local-vs-prod schema drift only |
| M3 | `20260417100003_karma_outcome_v2.sql` | Rewrites `apply_karma_on_outcome` RPC to +3/-1 simpler model + `karma_applied` flag + REVOKE/GRANT | **PRODUCTION** | 2026-04-17 | **2026-04-18 23:53 UTC** ✅ | Yes (`CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`) | Forward-only: in-flight proposals skip retroactive karma. Post-deploy grants limited to `postgres` + `service_role` (was: PUBLIC + anon + authenticated — SECURITY HOLE CLOSED) |
| M4 | `20260417100004_auto_expire_on_pause.sql` | Trigger on `user_profiles` to auto-expire pending/deciding proposals when subject pauses or is suspended | **PRODUCTION** | 2026-04-17 | **2026-04-18 23:54 UTC** ✅ | Yes (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` first) | Frees the other subject for next cycle; no karma adjustment on these expirations |

### Deploy verification snapshot (2026-04-18 23:55 UTC)
Post-deploy query result:
```json
{
  "crons": ["generate-proposals", "proposal-lifecycle", "snapshot-weekly-karma"],
  "karma_applied_col": 1,
  "karma_rpc_has_v2_logic": true,
  "karma_rpc_grants": ["postgres", "service_role"],
  "pause_trigger_fn": 1,
  "pause_trigger": 1,
  "proposal_lifecycle_check_gone": true
}
```
Edge functions deployed (verified via `supabase functions list`): `process-vote`, `proposal-lifecycle`, `generate-proposals`, `get-proposals-for-voting`, `generate-proposal-for-user`, `assign-new-user-proposals` — all `ACTIVE` with 2026-04-18 timestamps.

### Schema changes in this batch
| Object | Action | Scope |
|---|---|---|
| `user_profiles.profile_completed` column | ADD (LOCAL catch-up only) | local |
| `proposals.karma_applied` column | ADD | local + prod |
| `apply_karma_on_outcome(UUID, TEXT)` function | REPLACE (existed before, new logic) | local + prod |
| `auto_expire_user_active_proposals()` function | CREATE | local + prod |
| `trg_auto_expire_on_pause` trigger on `user_profiles` | CREATE | local + prod |
| Cron job `proposal-lifecycle-check` | UNSCHEDULE | local + prod |

### Deploy sequence when promoting to prod

All commands run from repo root. Apply in order. Each line blocks on the previous.

```bash
# 1. M1 — unschedule 4h cron
./scripts/supabase-exec.sh "$(cat supabase/migrations/20260417100001_remove_proposal_lifecycle_check_cron.sql)"
# Verify: SELECT jobname FROM cron.job WHERE jobname='proposal-lifecycle-check'; — should return 0 rows

# 2. M3 — karma RPC rewrite
./scripts/supabase-exec.sh "$(cat supabase/migrations/20260417100003_karma_outcome_v2.sql)"
# Verify: SELECT column_name FROM information_schema.columns WHERE table_name='proposals' AND column_name='karma_applied'; — returns 1 row
# Verify: SELECT prosrc FROM pg_proc WHERE proname='apply_karma_on_outcome'; — contains 'WHEN p_outcome' string

# 3. M4 — auto-expire trigger
./scripts/supabase-exec.sh "$(cat supabase/migrations/20260417100004_auto_expire_on_pause.sql)"
# Verify: SELECT tgname FROM pg_trigger WHERE tgname='trg_auto_expire_on_pause'; — returns 1 row
```

M2 is **deliberately never applied** to prod. Prod already has `profile_completed` via a manual ALTER outside the migration chain.

### Rollback

- **M1**: re-schedule via `SELECT cron.schedule('proposal-lifecycle-check', '0 */4 * * *', $$ ...same body from 20260403000002... $$);`
- **M3**: restore the old `apply_karma_on_outcome` definition (captured in pre-deploy snapshot from `./scripts/dump-prod-schema.sh`)
- **M4**: `DROP TRIGGER trg_auto_expire_on_pause ON user_profiles; DROP FUNCTION auto_expire_user_active_proposals;`
