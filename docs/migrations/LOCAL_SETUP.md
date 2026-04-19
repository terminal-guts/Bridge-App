# Local Supabase Setup Guide

How to spin up a fully functional local Supabase environment for Bridge development — one that mirrors production exactly so every test is a realistic one.

## Prerequisites

- Docker Desktop (running)
- Supabase CLI (`npm install -g supabase`)
- Node.js v24+
- The Bridge repo cloned
- `.env` present at repo root with `SUPABASE_SERVICE_ROLE_KEY` (for read-only prod dumps)

## One-command setup (recommended)

```bash
supabase start                       # once — starts Docker containers
./scripts/bootstrap-local.sh         # wipes + reloads local to match prod
```

`bootstrap-local.sh` runs six steps end to end:

1. `supabase db reset` — reapplies every migration
2. `setup-local.sh` — installs `citext`, creates storage buckets, seeds 2 test users
3. `snapshot-export.sh` — dumps prod rows (read-only; SELECT-only guards enforced)
4. `snapshot-import.ts` — loads rows into local
5. `snapshot-import-photos.ts` — copies all 566 prod profile photos into local storage
6. `check-schema-parity.sh` — verifies zero drift between local and prod

Takes ~10–15 min, dominated by the photo copy (566 files, ~170 MB).

**Fast path (skip photos):**
```bash
./scripts/bootstrap-local.sh --no-photos   # ~2 min; avatars show placeholders
```

Use `--no-photos` when you're iterating on non-UI work and don't need real avatars.

## Manual / step-by-step

If you want to run the pieces individually:

```bash
supabase start
./scripts/dump-prod-schema.sh                  # <-- optional, refreshes schema snapshot
```

This starts all local services:
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **Inbucket** (email): http://127.0.0.1:54324
- **Edge Functions**: http://127.0.0.1:54321/functions/v1

It automatically applies all migrations from `supabase/migrations/`.

## Step 2: Point the App at Local Supabase

Ensure `.env.local` has the local URL (uncomment if needed):
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

**Always restart Expo with cache clear after switching environments:**
```bash
npx expo start -c
```

## Step 3: Import Test Data

To get production-like data for testing:
```bash
# Export production data (read-only SELECTs, enforced by script guards) → snapshots/snapshot.json
./scripts/snapshot-export.sh

# Import rows into local Supabase (hardcoded to 127.0.0.1 — safe)
npx tsx scripts/snapshot-import.ts

# Copy profile photos from prod storage → local storage (~5–10 min)
npx tsx scripts/snapshot-import-photos.ts
```

Without the photo copy, imported users show placeholder avatars.

## Step 4: Set Up Edge Function Secrets

For functions that call external APIs (like Resend), create a local env file:

```bash
echo "RESEND_API_KEY=re_your_key_here" > supabase/.env.local
```

Get the Resend key from: Resend Dashboard (resend.com) → API Keys → Create API Key

This file is gitignored and only used by `supabase functions serve`.

## Step 5: Serve Edge Functions

```bash
# Serve all functions
supabase functions serve --no-verify-jwt --env-file supabase/.env.local

# Serve a specific function
supabase functions serve email-signup --no-verify-jwt --env-file supabase/.env.local
```

## Step 6: Log In Locally

Any `@rice.edu` email works with password `localdev123`.

OTP verification emails go to Inbucket: http://127.0.0.1:54324

## Verifying Local Matches Production

The goal: after `supabase db reset`, the local `public` schema should match production exactly. Use the dump-and-diff workflow:

```bash
# 1. Dump production (read-only, uses exec_sql RPC)
./scripts/dump-prod-schema.sh
# → snapshots/prod-schema-<date>.json

# 2. Dump local (requires `supabase start`)
./scripts/dump-local-schema.sh
# → snapshots/local-schema-<date>.json

# 3. Diff them — exit 0 = identical, exit 1 = drift
./scripts/diff-schemas.py \
    snapshots/prod-schema-<date>.json \
    snapshots/local-schema-<date>.json
```

The diff reports: extra/missing tables, column drift (type, nullability, default), missing/extra indexes, RLS state mismatches, policy differences, missing/extra functions, missing/extra triggers.

**If drift appears:**
- If prod has something local doesn't → add a backfill migration in `supabase/migrations/` matching the prod shape. Mark it `BACKFILL` in `MIGRATION_LOG.md`.
- If local has something prod doesn't → either remove the extra object from local (edit or add a DROP migration) or deploy the local-only migration to prod (with explicit approval).

## Applying New Migrations Locally

Two options:

**Option A: Reset everything** (applies all migrations from scratch):
```bash
supabase db reset
```

**Option B: Apply a single migration** (without resetting):
```bash
docker exec -i $(docker ps -q -f name=supabase_db_Bridge) psql -U postgres -d postgres < supabase/migrations/FILENAME.sql
```

Or for quick SQL:
```bash
docker exec -i $(docker ps -q -f name=supabase_db_Bridge) psql -U postgres -d postgres -c "YOUR SQL HERE"
```

## Verifying Local State

```bash
# Check Supabase is running
supabase status

# Check tables exist
docker exec -i $(docker ps -q -f name=supabase_db_Bridge) psql -U postgres -d postgres -c "\dt public.*"

# Check a specific table
docker exec -i $(docker ps -q -f name=supabase_db_Bridge) psql -U postgres -d postgres -c "\d public.user_profiles"
```

## Switching Between Local and Production

| Environment | `.env.local` URL | How to switch |
|-------------|------------------|---------------|
| Local | `http://127.0.0.1:54321` | Uncomment local URL in `.env.local` |
| Production | (comment out or delete `.env.local`) | Production URL in `.env` takes over |

**Always run `npx expo start -c` after switching** to clear the Metro cache.

## Troubleshooting

**"supabase_db not found"**: Docker isn't running or Supabase isn't started. Run `supabase start`.

**Edge function 500 errors**: Check the terminal running `supabase functions serve` for error logs.

**"RESEND_API_KEY not set"**: Create `supabase/.env.local` with the key (see Step 4).

**Migration ordering issues**: Run `supabase db reset` to reapply all migrations from scratch.
