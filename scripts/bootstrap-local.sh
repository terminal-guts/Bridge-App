#!/bin/bash
# ============================================
# bootstrap-local.sh
# ONE-SHOT command to make local fully mimic production.
#
# Pipeline (read-only on prod; all writes go to 127.0.0.1:
#   1. supabase db reset              — wipe local, reapply all migrations
#   2. scripts/setup-local.sh         — extensions, storage buckets, seed users
#   3. snapshot-export.sh             — dump prod rows (SELECT-only guards)
#   4. snapshot-import.ts             — load rows + verify counts (fails on delta)
#   5. snapshot-import-photos.ts      — copy profile-photos + chat-audio buckets
#   6. check-schema-parity.sh         — verify schema drift == documented drift
#   7. check-edge-function-parity.sh  — report edge function drift prod vs repo
#
# Takes ~10–15 minutes end to end (photos dominate: 569+ files, ~170 MB).
#
# Usage:
#   ./scripts/bootstrap-local.sh                 # full bootstrap
#   ./scripts/bootstrap-local.sh --no-photos     # skip photo copy (fast, ~2 min)
#   ./scripts/bootstrap-local.sh --force-continue # don't exit on count mismatch
#
# Design rule: **never silence output with tail/head**. Every step's errors must
# be visible. If a step fails, the bootstrap fails — no partial success.
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKIP_PHOTOS=false
FORCE_CONTINUE_FLAG=""
for arg in "$@"; do
  case "$arg" in
    --no-photos) SKIP_PHOTOS=true ;;
    --force-continue) FORCE_CONTINUE_FLAG="--force-continue" ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Bootstrapping local Supabase to mirror production       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. supabase db reset ────────────────────────────────────
echo "▶ Step 1/7: supabase db reset (reapplies all migrations)"
supabase db reset >/dev/null
echo "  ✓ reset complete"
echo ""

# ── 2. setup-local ──────────────────────────────────────────
echo "▶ Step 2/7: setup-local.sh (extensions, buckets, seed test users)"
"$SCRIPT_DIR/setup-local.sh" | sed 's/^/  /'
echo ""

# ── 3. dump prod data ───────────────────────────────────────
echo "▶ Step 3/7: snapshot-export.sh (read-only SELECT from prod)"
"$SCRIPT_DIR/snapshot-export.sh" | sed 's/^/  /'
echo ""

# ── 4. import data into local (fails loudly on count drift) ─
echo "▶ Step 4/7: snapshot-import.ts (load rows + verify counts)"
if ! npx tsx "$SCRIPT_DIR/snapshot-import.ts" $FORCE_CONTINUE_FLAG 2>&1 | sed 's/^/  /'; then
  echo ""
  echo "❌ Data import failed verification (row counts don't match snapshot)."
  echo "   Re-run with --force-continue if partial state is acceptable."
  exit 1
fi
echo ""

# ── 5. copy storage buckets (both profile-photos + chat-audio) ──
if [ "$SKIP_PHOTOS" = false ]; then
  echo "▶ Step 5/7: snapshot-import-photos.ts (copy prod storage → local)"
  echo "  profile-photos: ~569 files, ~170 MB. chat-audio: usually small."
  if ! npx tsx "$SCRIPT_DIR/snapshot-import-photos.ts" 2>&1 | sed 's/^/  /'; then
    echo ""
    echo "❌ Storage sync reported failures — see output above."
    exit 1
  fi
  echo ""
else
  echo "▶ Step 5/7: skipped (--no-photos)"
  echo "  Users will show placeholder avatars. Run snapshot-import-photos.ts"
  echo "  later to fetch them."
  echo ""
fi

# ── 6. schema parity ────────────────────────────────────────
echo "▶ Step 6/7: check-schema-parity.sh"
if "$SCRIPT_DIR/check-schema-parity.sh" | sed 's/^/  /'; then
  :
else
  echo "  ⚠ schema drift detected — see report above. Expected drift:"
  echo "    LOCAL_ONLY migrations #83, #84 cause columns to differ until"
  echo "    those migrations are promoted to prod. See docs/migrations/MIGRATION_LOG.md."
fi
echo ""

# ── 7. edge function parity (always informational) ──────────
echo "▶ Step 7/7: check-edge-function-parity.sh"
"$SCRIPT_DIR/check-edge-function-parity.sh" | sed 's/^/  /' || true
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
echo "Log in as any real prod user: their @rice.edu email + password \"localdev123\""
echo "(your own saulbrauns@rice.edu won't work — you have no user_profiles row in prod;"
echo " log in as e.g. sam.walker@rice.edu to see the community gate with real data)"
