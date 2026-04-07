#!/bin/bash
# Launch Party — Manual Proposal Generation Trigger
# Run this during the event to create proposals for everyone in the pool.
# Usage: ./scripts/run-proposals.sh

set -euo pipefail

# Load service role key from .env
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

echo "🚀 Triggering proposal generation..."
echo ""

RESPONSE=$(curl -s "https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/generate-proposals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{}')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""
echo "Done."
