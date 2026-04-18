# Migration Log

Single source of truth for every SQL migration's state. Ordered by filename (timestamp).

## Legend

- **PRODUCTION** — applied to prod, verified live
- **LOCAL_VERIFIED** — applied locally, verified via tests; pending prod push
- **LOCAL_ONLY** — applied locally only; deliberately excluded from prod (e.g., catch-up migrations where prod already has the change)
- **NEW** — not yet applied anywhere

## Proposal-gate overhaul v2 (2026-04-17 → 2026-04-18)

| # | File | Purpose | Status | Applied LOCAL | Applied PROD | Idempotent? | Notes |
|---|------|---------|--------|---------------|--------------|-------------|-------|
| M1 | `20260417100001_remove_proposal_lifecycle_check_cron.sql` | Unschedule the 4-hour `proposal-lifecycle-check` safety-net cron | LOCAL_VERIFIED | 2026-04-17 (verified: `cron.job` no longer lists it) | ⏳ pending | Yes (`WHERE EXISTS` guard) | Gate-overhaul-v2 consolidates all decisions into the single 7PM cron |
| M2 | `20260417100002_local_align_profile_completed.sql` | Adds `user_profiles.profile_completed` column (already exists in prod) | LOCAL_ONLY | 2026-04-17 | 🚫 DO NOT APPLY (prod already has it) | Yes (`IF NOT EXISTS`) | Catch-up migration — fixes local-vs-prod schema drift only |
| M3 | `20260417100003_karma_outcome_v2.sql` | Rewrites `apply_karma_on_outcome` RPC to +3/-1 simpler model + idempotency flag `proposals.karma_applied` | NEW | ⏳ pending | ⏳ pending | Yes (`CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`) | Forward-only: in-flight proposals skip retroactive karma |
| M4 | `20260417100004_auto_expire_on_pause.sql` | Trigger on `user_profiles` to auto-expire pending/deciding proposals when subject pauses or is suspended | NEW | ⏳ pending | ⏳ pending | Yes (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` first) | Frees the other subject for next cycle; no karma adjustment on these expirations |

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
