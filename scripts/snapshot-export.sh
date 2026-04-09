#!/bin/bash
# Export a read-only snapshot of production data for local development.
# This script ONLY runs SELECT queries — it never writes to production.
#
# Usage:
#   ./scripts/snapshot-export.sh              # Export all users
#
# Output: snapshots/snapshot-YYYY-MM-DD.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
SNAPSHOT_DIR="$PROJECT_DIR/snapshots"
TEMP_DIR="$SNAPSHOT_DIR/.tmp"
DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="$SNAPSHOT_DIR/snapshot-${DATE}.json"

# --- Load credentials ---
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

mkdir -p "$SNAPSHOT_DIR"
mkdir -p "$TEMP_DIR"

# --- Helper: run a SELECT query, save result to a temp file ---
exec_query() {
  local sql="$1"
  local output_file="$2"
  local label="$3"

  # SAFETY: Reject anything that isn't a SELECT
  if ! echo "$sql" | grep -qi '^[[:space:]]*SELECT'; then
    echo "FATAL: Query does not start with SELECT. Refusing to run: $sql"
    exit 1
  fi

  # Reject dangerous keywords
  for keyword in INSERT UPDATE DELETE DROP ALTER TRUNCATE CREATE; do
    if echo "$sql" | grep -qiw "$keyword"; then
      echo "FATAL: Query contains '$keyword'. Refusing to run."
      exit 1
    fi
  done

  echo "  Exporting $label..."
  curl -s "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'sql': sys.argv[1]}))" "$sql")" \
    -o "$output_file"

  # Replace null with empty array
  if [ "$(cat "$output_file")" = "null" ] || [ ! -s "$output_file" ]; then
    echo "[]" > "$output_file"
  fi

  # Small delay to avoid rate limiting
  sleep 0.15
}

echo ""
echo "=== Bridge Production Snapshot Export ==="
echo "=== READ-ONLY — no data will be modified ==="
echo ""
echo "Target: $SUPABASE_URL"
echo "Output: $OUTPUT_FILE"
echo ""

# --- Export each table to temp files ---

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT id, email, phone, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, email_confirmed_at, phone_confirmed_at, confirmed_at, role, aud FROM auth.users ORDER BY created_at) t" \
  "$TEMP_DIR/auth_users.json" "auth.users"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM user_profiles ORDER BY created_at) t" \
  "$TEMP_DIR/user_profiles.json" "user_profiles"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM user_photos ORDER BY created_at) t" \
  "$TEMP_DIR/user_photos.json" "user_photos"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM friend_codes ORDER BY created_at) t" \
  "$TEMP_DIR/friend_codes.json" "friend_codes"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM friends ORDER BY added_at) t" \
  "$TEMP_DIR/friends.json" "friends"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM karma_scores) t" \
  "$TEMP_DIR/karma_scores.json" "karma_scores"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM proposals ORDER BY created_at) t" \
  "$TEMP_DIR/proposals.json" "proposals"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM proposal_votes ORDER BY created_at) t" \
  "$TEMP_DIR/proposal_votes.json" "proposal_votes"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM matches ORDER BY created_at) t" \
  "$TEMP_DIR/matches.json" "matches"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM messages ORDER BY created_at) t" \
  "$TEMP_DIR/messages.json" "messages"

exec_query \
  "SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM match_exits ORDER BY created_at) t" \
  "$TEMP_DIR/match_exits.json" "match_exits"

# --- Assemble into one JSON file ---
echo ""
echo "Assembling snapshot..."

python3 << 'PYEOF'
import json, os

temp_dir = os.environ.get('TEMP_DIR', 'snapshots/.tmp')
output_file = os.environ.get('OUTPUT_FILE', 'snapshots/snapshot.json')
date = os.environ.get('DATE', 'unknown')

tables = {}
table_names = [
    'auth_users', 'user_profiles', 'user_photos', 'friend_codes',
    'friends', 'karma_scores', 'proposals', 'proposal_votes',
    'matches', 'messages', 'match_exits'
]

for name in table_names:
    filepath = os.path.join(temp_dir, f'{name}.json')
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            tables[name] = data if isinstance(data, list) else []
    except (json.JSONDecodeError, FileNotFoundError):
        tables[name] = []

snapshot = {
    'exported_at': f'{date}',
    'source': 'production',
    'tables': tables
}

# Print summary
total = 0
for name, rows in tables.items():
    count = len(rows)
    total += count
    print(f'  {name}: {count} rows')

print(f'\n  Total: {total} rows')

with open(output_file, 'w') as f:
    json.dump(snapshot, f, indent=2)

size = os.path.getsize(output_file)
print(f'\nSnapshot saved to: {output_file}')
print(f'File size: {size:,} bytes')
PYEOF

# Clean up temp files
rm -rf "$TEMP_DIR"

echo ""
echo "Done! Next step: npx tsx scripts/snapshot-import.ts"
echo ""
