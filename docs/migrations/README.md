# Supabase Migration & Infrastructure Tracking

This directory is the single source of truth for what's deployed to production vs what's local-only. It tracks database migrations, edge functions, and secrets.

## Files

| File | What it tracks |
|------|---------------|
| [MIGRATION_LOG.md](MIGRATION_LOG.md) | Every SQL migration with production status |
| [PRODUCTION_SCHEMA.md](PRODUCTION_SCHEMA.md) | Pointer to the latest dated prod snapshot + how to refresh |
| [archive/prod-schema-snapshot-2026-04-17.md](archive/prod-schema-snapshot-2026-04-17.md) | Full prod forensics: 38 tables × every column/index/policy, 136 RPCs, 21 triggers (2026-04-17 snapshot, archived) |
| [archive/synthetic-local-schema-2026-04-17.md](archive/synthetic-local-schema-2026-04-17.md) | What `supabase db reset` produced from the migration chain (2026-04-17 snapshot, archived) |
| [archive/drift-report-2026-04-17.md](archive/drift-report-2026-04-17.md) | One-time 2026-04-17 drift audit — drift now resolved (archived) |
| [EDGE_FUNCTIONS.md](EDGE_FUNCTIONS.md) | All edge functions with deployment status and auth type |
| [SECRETS.md](SECRETS.md) | Secret names (never values), which functions use them |
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | How to spin up a new local Supabase environment |

## Keeping local in sync with prod

**One command to fully mirror prod:**

```bash
./scripts/bootstrap-local.sh              # reset + setup + import rows + import photos + verify parity
./scripts/bootstrap-local.sh --no-photos  # same but skip the slow photo copy
```

| Script | What it does |
|---|---|
| `scripts/bootstrap-local.sh` | One-shot: reset + setup + import rows + photos + parity check |
| `scripts/dump-prod-schema.sh` | Dumps live prod schema (read-only) to `snapshots/prod-schema-<date>.json` |
| `scripts/dump-local-schema.sh` | Dumps local Supabase schema to `snapshots/local-schema-<date>.json` |
| `scripts/diff-schemas.py <a.json> <b.json>` | Reports drift between two dumps (exit 0 = match, 1 = drift) |
| `scripts/check-schema-parity.sh` | dump-prod + dump-local + diff in one call |
| `scripts/snapshot-export.sh` | Dumps prod data (SELECT-only) to `snapshots/snapshot.json` |
| `scripts/snapshot-import.ts` | Loads `snapshots/snapshot.json` into local (hardcoded `127.0.0.1`) |
| `scripts/snapshot-import-photos.ts` | Copies prod `profile-photos` bucket → local bucket (566 files, ~170 MB) |

## Workflows

### Adding a new migration

1. Write the SQL file in `supabase/migrations/`
2. Test locally: apply via `supabase db reset` or `docker exec`
3. Add an entry to `MIGRATION_LOG.md` with status `LOCAL_ONLY`
4. Test thoroughly in local environment
5. When ready for production: get explicit approval, run via `scripts/supabase-exec.sh`
6. Update status in `MIGRATION_LOG.md` to `PRODUCTION`
7. Update `PRODUCTION_SCHEMA.md` if schema changed

### Promoting a local migration to production

1. Find the migration in `MIGRATION_LOG.md` — it should be `LOCAL_ONLY`
2. Review the SQL one more time
3. Run via `scripts/supabase-exec.sh "$(cat supabase/migrations/FILENAME.sql)"`
4. Verify in Supabase Studio or via read-only query
5. Update `MIGRATION_LOG.md` status to `PRODUCTION`
6. Update `PRODUCTION_SCHEMA.md` with any new tables/RPCs/indexes

### Spinning up a new local environment

Follow [LOCAL_SETUP.md](LOCAL_SETUP.md).

### Deploying a new edge function

1. Add entry to `EDGE_FUNCTIONS.md` with status `LOCAL_ONLY`
2. Test locally with `supabase functions serve`
3. When ready: `supabase functions deploy FUNCTION_NAME [--no-verify-jwt]`
4. Update `EDGE_FUNCTIONS.md` status to `DEPLOYED`
5. If new secrets needed: add to `SECRETS.md` and set via `supabase secrets set`

## Rules

- **Never expose secret values** in any file — names only
- **Always update these docs** when making migration or deployment changes
- **Production changes require explicit user approval** — Supabase changes go live immediately
- **Test locally first** — verify with local Supabase before touching production
