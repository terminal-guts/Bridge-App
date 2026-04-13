#!/bin/bash
# ============================================================================
# upload-demo-photos.sh — Upload stock photos for demo users to Supabase Storage
# ============================================================================
# Uploads photos from assets/stockface-*.jpg to the profile-photos bucket,
# then updates the user_profiles.photos JSONB column for each demo user.
#
# Run ONCE after seed-reviewer-data.sql. Safe to re-run (overwrites existing).
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

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

BUCKET="profile-photos"

# Demo user ID -> stock photo mapping
declare -A USERS
USERS[d0000001-de10-4000-a000-000000000001]="stockface-female1.jpg"  # Emma
USERS[d0000002-de10-4000-a000-000000000002]="stockface-male1.jpg"    # Jordan
USERS[d0000003-de10-4000-a000-000000000003]="stockface-female2.jpg"  # Sophie
USERS[d0000004-de10-4000-a000-000000000004]="stockface-male3.jpg"    # Marcus
USERS[d0000005-de10-4000-a000-000000000005]="stockface-female3.jpg"  # Lily
USERS[d0000006-de10-4000-a000-000000000006]="stockface-male5.jpg"    # Alex

echo "Uploading demo user photos to Supabase Storage..."
echo ""

for USER_ID in "${!USERS[@]}"; do
  PHOTO_FILE="${USERS[$USER_ID]}"
  LOCAL_PATH="$PROJECT_DIR/assets/$PHOTO_FILE"
  STORAGE_PATH="$USER_ID/demo_photo.jpg"

  if [ ! -f "$LOCAL_PATH" ]; then
    echo "SKIP: $LOCAL_PATH not found"
    continue
  fi

  echo "Uploading $PHOTO_FILE -> $BUCKET/$STORAGE_PATH"

  # Upload to Supabase Storage (upsert: overwrite if exists)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$SUPABASE_URL/storage/v1/object/$BUCKET/$STORAGE_PATH" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: image/jpeg" \
    -H "x-upsert: true" \
    --data-binary "@$LOCAL_PATH")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "  OK ($HTTP_CODE)"
  else
    echo "  WARN: HTTP $HTTP_CODE — retrying with PUT..."
    # Some Supabase versions need PUT for upsert
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X PUT "$SUPABASE_URL/storage/v1/object/$BUCKET/$STORAGE_PATH" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: image/jpeg" \
      --data-binary "@$LOCAL_PATH")
    echo "  Retry: HTTP $HTTP_CODE"
  fi

  # Update user_profiles.photos JSONB column
  # Include id and order fields to match the Photo interface in src/types/index.ts
  PHOTOS_JSON="[{\"id\": \"demo_1\", \"url\": \"$STORAGE_PATH\", \"is_main\": true, \"order\": 0}]"
  SQL="UPDATE user_profiles SET photos = '$PHOTOS_JSON'::jsonb WHERE user_id = '$USER_ID'; SELECT json_build_object('updated', '$USER_ID');"

  RESULT=$(curl -s "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'sql': sys.argv[1]}))" "$SQL")")

  echo "  DB updated: $RESULT"
  echo ""
done

echo "All demo photos uploaded and profiles updated."
echo ""
echo "Verify by checking any demo user's profile in the app or via:"
echo "  ./scripts/supabase-exec.sh \"SELECT user_id, photos FROM user_profiles WHERE user_id LIKE 'd0000%' LIMIT 6\""
