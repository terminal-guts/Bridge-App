#!/bin/bash
# ============================================
# check-schema-parity.sh
# One command to answer: "does my local DB match prod?"
#
# Dumps both, diffs them, prints the report, and exits 0 on match / 1 on drift.
#
# Requires:
#   - Docker running + `supabase start` completed (local schema dump)
#   - .env with SUPABASE_SERVICE_ROLE_KEY (prod schema dump)
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATE=$(date +%Y-%m-%d)

PROD_OUT="$PROJECT_DIR/snapshots/prod-schema-${DATE}.json"
LOCAL_OUT="$PROJECT_DIR/snapshots/local-schema-${DATE}.json"

echo "=== Step 1/3: dump production ==="
"$SCRIPT_DIR/dump-prod-schema.sh"

echo ""
echo "=== Step 2/3: dump local ==="
"$SCRIPT_DIR/dump-local-schema.sh"

echo ""
echo "=== Step 3/3: diff (excluding documented legacy cruft) ==="
"$SCRIPT_DIR/diff-schemas.py" --ignore "$SCRIPT_DIR/schema-diff-ignore.json" "$PROD_OUT" "$LOCAL_OUT"
