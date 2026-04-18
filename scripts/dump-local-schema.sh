#!/bin/bash
# ============================================
# dump-local-schema.sh
# Dumps the LOCAL Supabase database schema to JSON in the same shape
# as dump-prod-schema.sh so the two can be diffed directly.
#
# Prereq: `supabase start` must be running (Docker up).
#
# Usage: ./scripts/dump-local-schema.sh
# Output: snapshots/local-schema-YYYY-MM-DD.json
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATE=$(date +%Y-%m-%d)
OUT_DIR="$PROJECT_DIR/snapshots"
OUT_FILE="$OUT_DIR/local-schema-${DATE}.json"

mkdir -p "$OUT_DIR"

# Find the local supabase_db container
DB_CONTAINER=$(docker ps --filter "name=supabase_db" -q | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "Error: no supabase_db container running. Run 'supabase start' first." >&2
  exit 1
fi

run_sql() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -At -c "$1"
}

echo "=== Dumping Local Schema ==="
echo "Date:      $DATE"
echo "Container: $DB_CONTAINER"
echo ""

echo "  [1/7] Tables..."
TABLES=$(run_sql "
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT table_name, table_type
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
) t;
")

echo "  [2/7] Columns..."
COLUMNS=$(run_sql "
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT table_name, column_name, ordinal_position,
         data_type, udt_name, is_nullable,
         column_default, character_maximum_length
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
) t;
")

echo "  [3/7] Indexes..."
INDEXES=$(run_sql "
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname
) t;
")

echo "  [4/7] RLS status..."
RLS_STATUS=$(run_sql "
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname
) t;
")

echo "  [5/7] Policies..."
POLICIES=$(run_sql "
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname
) t;
")

echo "  [6/7] Functions..."
FUNCTIONS=$(run_sql "
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT p.proname AS function_name,
         pg_get_function_arguments(p.oid) AS arguments,
         pg_get_function_result(p.oid) AS return_type,
         p.prosecdef AS security_definer,
         CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' WHEN 'v' THEN 'VOLATILE' END AS volatility
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  ORDER BY p.proname
) t;
")

echo "  [7/7] Triggers..."
TRIGGERS=$(run_sql "
SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
  SELECT trigger_name, event_manipulation, event_object_table,
         action_statement, action_timing
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  ORDER BY event_object_table, trigger_name
) t;
")

echo ""
echo "  Assembling output..."

python3 -c "
import json, sys

data = {
    'dump_date': '$DATE',
    'source': 'local',
    'tables': json.loads(sys.argv[1]),
    'columns': json.loads(sys.argv[2]),
    'indexes': json.loads(sys.argv[3]),
    'rls_status': json.loads(sys.argv[4]),
    'policies': json.loads(sys.argv[5]),
    'functions': json.loads(sys.argv[6]),
    'triggers': json.loads(sys.argv[7]),
}

with open('$OUT_FILE', 'w') as f:
    json.dump(data, f, indent=2)

print(f\"  Tables:    {len(data['tables'])}\")
print(f\"  Columns:   {len(data['columns'])}\")
print(f\"  Indexes:   {len(data['indexes'])}\")
print(f\"  Policies:  {len(data['policies'])}\")
print(f\"  Functions: {len(data['functions'])}\")
print(f\"  Triggers:  {len(data['triggers'])}\")
" "$TABLES" "$COLUMNS" "$INDEXES" "$RLS_STATUS" "$POLICIES" "$FUNCTIONS" "$TRIGGERS"

echo ""
echo "=== Schema dumped to: $OUT_FILE ==="
