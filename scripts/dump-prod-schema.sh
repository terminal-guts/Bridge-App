#!/bin/bash
# ============================================
# dump-prod-schema.sh
# Dumps the REAL production database schema to JSON.
# This is the ground truth for what production looks like.
#
# Usage: ./scripts/dump-prod-schema.sh
# Output: snapshots/prod-schema-YYYY-MM-DD.json
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EXEC="$SCRIPT_DIR/supabase-exec.sh"
DATE=$(date +%Y-%m-%d)
OUT_DIR="$PROJECT_DIR/snapshots"
OUT_FILE="$OUT_DIR/prod-schema-${DATE}.json"

mkdir -p "$OUT_DIR"

echo "=== Dumping Production Schema ==="
echo "Date: $DATE"
echo ""

# --- 1. Tables ---
echo "  [1/6] Tables..."
TABLES=$("$EXEC" "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT table_name, table_type
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
) t
")

# --- 2. Columns ---
echo "  [2/6] Columns..."
COLUMNS=$("$EXEC" "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT table_name, column_name, ordinal_position,
         data_type, udt_name, is_nullable,
         column_default, character_maximum_length
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
) t
")

# --- 3. Indexes ---
echo "  [3/6] Indexes..."
INDEXES=$("$EXEC" "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname
) t
")

# --- 4. RLS status + policies ---
echo "  [4/6] RLS policies..."
RLS_STATUS=$("$EXEC" "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.relname
) t
")

POLICIES=$("$EXEC" "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname
) t
")

# --- 5. Functions/RPCs ---
echo "  [5/6] Functions..."
FUNCTIONS=$("$EXEC" "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT p.proname AS function_name,
         pg_get_function_arguments(p.oid) AS arguments,
         pg_get_function_result(p.oid) AS return_type,
         p.prosecdef AS security_definer,
         CASE p.provolatile WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' WHEN 'v' THEN 'VOLATILE' END AS volatility
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  ORDER BY p.proname
) t
")

# --- 6. Triggers ---
echo "  [6/6] Triggers..."
TRIGGERS=$("$EXEC" "
SELECT json_agg(row_to_json(t)) FROM (
  SELECT trigger_name, event_manipulation, event_object_table,
         action_statement, action_timing
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  ORDER BY event_object_table, trigger_name
) t
")

# --- Assemble JSON ---
echo ""
echo "  Assembling output..."

python3 -c "
import json, sys

data = {
    'dump_date': '$DATE',
    'source': 'production',
    'tables': json.loads(sys.argv[1]) if sys.argv[1].strip() not in ('null', '') else [],
    'columns': json.loads(sys.argv[2]) if sys.argv[2].strip() not in ('null', '') else [],
    'indexes': json.loads(sys.argv[3]) if sys.argv[3].strip() not in ('null', '') else [],
    'rls_status': json.loads(sys.argv[4]) if sys.argv[4].strip() not in ('null', '') else [],
    'policies': json.loads(sys.argv[5]) if sys.argv[5].strip() not in ('null', '') else [],
    'functions': json.loads(sys.argv[6]) if sys.argv[6].strip() not in ('null', '') else [],
    'triggers': json.loads(sys.argv[7]) if sys.argv[7].strip() not in ('null', '') else [],
}

with open('$OUT_FILE', 'w') as f:
    json.dump(data, f, indent=2)

# Print summary
print(f\"  Tables:    {len(data['tables'])}\")
print(f\"  Columns:   {len(data['columns'])}\")
print(f\"  Indexes:   {len(data['indexes'])}\")
print(f\"  Policies:  {len(data['policies'])}\")
print(f\"  Functions: {len(data['functions'])}\")
print(f\"  Triggers:  {len(data['triggers'])}\")
" "$TABLES" "$COLUMNS" "$INDEXES" "$RLS_STATUS" "$POLICIES" "$FUNCTIONS" "$TRIGGERS"

echo ""
echo "=== Schema dumped to: $OUT_FILE ==="
