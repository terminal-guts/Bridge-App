#!/bin/bash
# ============================================
# check-edge-function-parity.sh
# Compares edge functions deployed to production with the folders in
# supabase/functions/ — surfaces drift in both directions.
#
# READ-ONLY on prod: only calls `supabase functions list`.
#
# Exit 0: everything matches
# Exit 1: drift detected (prod-only or local-only functions)
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_REF="ikyiwnydgedwbmcdzgbe"

TMP_PROD=$(mktemp)
TMP_LOCAL=$(mktemp)
trap "rm -f $TMP_PROD $TMP_LOCAL" EXIT

echo "=== Edge function parity check ==="
echo ""

echo "  Fetching prod function list..."
supabase functions list --project-ref "$PROJECT_REF" 2>/dev/null \
  | awk -F'|' '/ACTIVE/{gsub(/ /,"",$3); print $3}' \
  | sort > "$TMP_PROD"

ls "$PROJECT_DIR/supabase/functions/" | grep -v '^_' | sort > "$TMP_LOCAL"

PROD_COUNT=$(wc -l < "$TMP_PROD" | tr -d ' ')
LOCAL_COUNT=$(wc -l < "$TMP_LOCAL" | tr -d ' ')
SHARED_COUNT=$(comm -12 "$TMP_PROD" "$TMP_LOCAL" | wc -l | tr -d ' ')
PROD_ONLY=$(comm -23 "$TMP_PROD" "$TMP_LOCAL")
LOCAL_ONLY=$(comm -13 "$TMP_PROD" "$TMP_LOCAL")

echo "  Prod:   $PROD_COUNT functions deployed"
echo "  Local:  $LOCAL_COUNT function folders in repo"
echo "  Shared: $SHARED_COUNT"
echo ""

DRIFT=0

if [ -n "$PROD_ONLY" ]; then
  DRIFT=1
  PROD_ONLY_COUNT=$(echo "$PROD_ONLY" | wc -l | tr -d ' ')
  echo "⚠ Deployed in prod but NOT in supabase/functions/ ($PROD_ONLY_COUNT):"
  echo "$PROD_ONLY" | sed 's/^/    - /'
  echo ""
  echo "  These fall into two groups:"
  echo "    1. Legacy cruft — deploy predates the current repo, never cleaned up."
  echo "       Safe to leave (also safe to undeploy with user approval)."
  echo "    2. Real functions missing from the repo — if src/ calls them, they run in"
  echo "       prod but not locally. Grep the client to tell the difference:"
  echo "         grep -rn 'FUNCTION_NAME' src/ supabase/"
  echo ""
fi

if [ -n "$LOCAL_ONLY" ]; then
  DRIFT=1
  LOCAL_ONLY_COUNT=$(echo "$LOCAL_ONLY" | wc -l | tr -d ' ')
  echo "⚠ In supabase/functions/ but NOT deployed to prod ($LOCAL_ONLY_COUNT):"
  echo "$LOCAL_ONLY" | sed 's/^/    - /'
  echo ""
  echo "  These run locally via \`supabase functions serve\` but will fail in prod"
  echo "  if the client calls them. Either deploy (with approval) or delete."
  echo ""
fi

if [ "$DRIFT" -eq 0 ]; then
  echo "✅ Edge function parity: perfect match."
fi

exit $DRIFT
