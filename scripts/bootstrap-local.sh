#!/bin/bash
# ============================================
# bootstrap-local.sh
# ONE-SHOT command to make local fully mimic production:
#   1. supabase db reset        — wipe local, reapply all migrations
#   2. scripts/setup-local.sh   — extensions, storage buckets, seed users
#   3. snapshot-export.sh       — dump prod data (read-only SELECTs only)
#   4. snapshot-import.ts       — load prod rows into local
#   5. snapshot-import-photos.ts — copy prod photos into local storage
#   6. check-schema-parity.sh   — verify zero drift
#
# Takes ~10–15 minutes end to end (photos are the slow part: 566 files).
#
# Usage:
#   ./scripts/bootstrap-local.sh              # full bootstrap
#   ./scripts/bootstrap-local.sh --no-photos  # skip photo copy (fast, ~2 min)
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKIP_PHOTOS=false
for arg in "$@"; do
  if [ "$arg" = "--no-photos" ]; then SKIP_PHOTOS=true; fi
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Bootstrapping local Supabase to mirror production       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. supabase db reset ────────────────────────────────────
echo "▶ Step 1/6: supabase db reset (reapplies all migrations)"
supabase db reset >/dev/null
echo "  ✓ reset complete"
echo ""

# ── 2. setup-local ──────────────────────────────────────────
echo "▶ Step 2/6: setup-local.sh (extensions, buckets, seed test users)"
"$SCRIPT_DIR/setup-local.sh" | sed 's/^/  /'
echo ""

# ── 3. dump prod data ───────────────────────────────────────
echo "▶ Step 3/6: snapshot-export.sh (read-only SELECT from prod)"
"$SCRIPT_DIR/snapshot-export.sh" | tail -15 | sed 's/^/  /'
echo ""

# ── 4. import data into local ───────────────────────────────
echo "▶ Step 4/6: snapshot-import.ts (load rows into local)"
npx tsx "$SCRIPT_DIR/snapshot-import.ts" | tail -20 | sed 's/^/  /'
echo ""

# ── 5. copy photos ──────────────────────────────────────────
if [ "$SKIP_PHOTOS" = false ]; then
  echo "▶ Step 5/6: snapshot-import-photos.ts (copy prod photos → local storage)"
  echo "  This takes several minutes — 566 files, ~170 MB total."
  npx tsx "$SCRIPT_DIR/snapshot-import-photos.ts" | tail -8 | sed 's/^/  /'
  echo ""
else
  echo "▶ Step 5/6: skipped (--no-photos)"
  echo "  Users will show placeholder avatars. Run snapshot-import-photos.ts"
  echo "  later to fetch them."
  echo ""
fi

# ── 6. verify parity ────────────────────────────────────────
echo "▶ Step 6/6: check-schema-parity.sh"
if "$SCRIPT_DIR/check-schema-parity.sh" >/dev/null 2>&1; then
  echo "  ✓ no drift — local schema matches prod exactly"
else
  echo "  ⚠ drift detected. Re-run: ./scripts/check-schema-parity.sh"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Bootstrap complete. Local mirrors production.           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Next:"
echo "  npx expo start -c         — launch the app against local"
echo "  http://127.0.0.1:54323    — Studio (browse data)"
echo "  http://127.0.0.1:54324    — Mailpit (view OTP emails)"
echo ""
echo "Log in: any seeded @rice.edu email + password \"localdev123\""
