#!/bin/bash
# Execute arbitrary SQL against Supabase via the exec_sql RPC function.
# Usage: ./scripts/supabase-exec.sh "SELECT json_agg(row_to_json(t)) FROM profiles t LIMIT 5"
#
# The SQL must return JSON (use json_agg, row_to_json, json_build_object, etc.)
# For DDL statements (CREATE, ALTER, DROP), wrap in: SELECT json_build_object('done', true); after your statement.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  exit 1
fi

SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d'=' -f2-)
SUPABASE_URL="https://ikyiwnydgedwbmcdzgbe.supabase.co"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY not found in .env"
  exit 1
fi

SQL="$1"

curl -s "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,sys; print(json.dumps({'sql': sys.argv[1]}))" "$SQL")"

echo ""
