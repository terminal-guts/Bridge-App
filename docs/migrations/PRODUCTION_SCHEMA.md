# Production Schema

**Authoritative snapshot:** [`archive/prod-schema-snapshot-2026-04-17.md`](archive/prod-schema-snapshot-2026-04-17.md) (1,795 lines — every table, column, index, policy, function, trigger in prod as of 2026-04-17).

**Raw JSON dump:** `snapshots/prod-schema-2026-04-17.json`.

## Current totals (2026-04-17)

| Object | Count |
|---|---|
| Tables | 38 |
| Columns | 409 |
| Indexes | 145 |
| RLS policies | 85 |
| Functions / RPCs | 136 |
| Triggers | 21 |

All 38 tables have RLS **enabled**.

## How to refresh this snapshot

```bash
# 1. Dump the live prod schema to JSON (read-only via exec_sql RPC)
./scripts/dump-prod-schema.sh

# 2. Dump the local schema the same way (requires `supabase start`)
./scripts/dump-local-schema.sh

# 3. Diff them — exit 0 = match, exit 1 = drift detected
./scripts/diff-schemas.py \
    snapshots/prod-schema-<date>.json \
    snapshots/local-schema-<date>.json
```

The dump scripts pull from `information_schema`, `pg_indexes`, `pg_policies`, `pg_proc`, and `pg_catalog` — same queries for both, so the outputs are directly comparable.

## When the snapshot is stale

1. Re-run `./scripts/dump-prod-schema.sh` to produce a fresh JSON.
2. Write a new dated `PROD_SCHEMA_SNAPSHOT_YYYY-MM-DD.md` (or update this one with the new date).
3. Update the link at the top of this file.
4. If new tables appeared in prod: add a backfill migration in `supabase/migrations/` and an entry in `MIGRATION_LOG.md` with status `BACKFILL`.
5. Re-run `supabase db reset` locally, then `./scripts/dump-local-schema.sh` and `./scripts/diff-schemas.py` to confirm parity.

## Table index (38)

```
allowed_email_domains       friend_messages           match_exits               roster
blocked_users               friend_recommendations    matches                   support_conversations
crushes                     friend_suggestions        messages                  support_messages
deep_question_answers       friends                   notification_log          support_reply_context
email_unsubscribes          ghost_profiles            onboarding_progress       user_photos
email_verification_codes    introductions             pool_vote_assignments     user_preferences
friend_badges               karma_rank_snapshots      profiles                  user_profiles
friend_codes                karma_scores              proposal_votes            user_reports
                            karma_weekly_snapshots    proposals                 user_settings
                                                      rate_limit_attempts       waitlist_signups
                                                      rate_limit_config
```

## Migration-to-table map

See [`MIGRATION_LOG.md`](MIGRATION_LOG.md) for which migration file produced each table. Notable:

- **`profiles`, `onboarding_progress`, `waitlist_signups`, `allowed_email_domains`** — created directly in prod pre-migration-hygiene. Backfilled for local in migration `20260417000003_backfill_prod_only_tables.sql`.
- **`email_verification_codes`** — table existed in prod before migration `20260415000001`. That migration was rewritten to match prod shape (both `code` and `code_hash` columns, `used` flag).
- **All other tables** — 1:1 with their respective `CREATE TABLE` migrations (see MIGRATION_LOG).
