#!/bin/bash
# Seed local Supabase with mock data for development
# Creates: 1 main user (Saul), 5 mock users, 4 friendships, 1 friend request, 1 proposal

set -e

API="http://127.0.0.1:54321"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
AUTH="Authorization: Bearer $SERVICE_KEY"
API_KEY="apikey: $SERVICE_KEY"
PHOTO_BASE="$API/storage/v1/object/public/profile-photos/stockfaces"

echo "=== Seeding local Supabase ==="

# Helper: create auth user and return ID
create_user() {
  local email=$1
  local result=$(curl -s "$API/auth/v1/admin/users" \
    -H "$AUTH" -H "$API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"TestPass123!\",\"email_confirm\":true}")
  echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
}

echo "Creating users..."
SAUL_ID=$(create_user "saul@local.bridgedate.app")
echo "  Saul: $SAUL_ID"

ALEX_ID=$(create_user "alex@local.bridgedate.app")
echo "  Alex (male1): $ALEX_ID"

MAYA_ID=$(create_user "maya@local.bridgedate.app")
echo "  Maya (female1): $MAYA_ID"

RILEY_ID=$(create_user "riley@local.bridgedate.app")
echo "  Riley (female2): $RILEY_ID"

NINA_ID=$(create_user "nina@local.bridgedate.app")
echo "  Nina (female4): $NINA_ID"

TYLER_ID=$(create_user "tyler@local.bridgedate.app")
echo "  Tyler (male5): $TYLER_ID"

# Helper: insert profile via REST
insert_profile() {
  local data=$1
  curl -s -o /dev/null -w "%{http_code}" "$API/rest/v1/user_profiles" \
    -H "$AUTH" -H "$API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$data"
}

echo ""
echo "Creating profiles..."

# Saul (main user)
insert_profile "{
  \"user_id\": \"$SAUL_ID\",
  \"first_name\": \"Saul\",
  \"last_name\": \"B.\",
  \"age\": 21,
  \"gender\": [\"Man\"],
  \"pronouns\": \"He/Him\",
  \"interested_in_genders\": [\"Woman\"],
  \"height_inches\": 71,
  \"school\": \"Rice University\",
  \"location\": \"Houston, TX\",
  \"interests\": [\"Basketball\", \"Tennis\", \"Startups\", \"Music\"],
  \"values\": [\"Ambition\", \"Honesty\", \"Humor\"],
  \"bio\": \"Building things and meeting people.\",
  \"is_verified\": true,
  \"photos\": []
}"
echo " -> Saul profile created"

# Alex - male1.jpg (FRIEND 1)
insert_profile "{
  \"user_id\": \"$ALEX_ID\",
  \"first_name\": \"Alex\",
  \"last_name\": \"M.\",
  \"age\": 22,
  \"gender\": [\"Man\"],
  \"pronouns\": \"He/Him\",
  \"interested_in_genders\": [\"Woman\"],
  \"height_inches\": 73,
  \"school\": \"Rice University\",
  \"location\": \"Houston, TX\",
  \"interests\": [\"Soccer\", \"Photography\", \"Cooking\", \"Film\"],
  \"values\": [\"Loyalty\", \"Adventure\", \"Creativity\"],
  \"bio\": \"Soccer player turned amateur photographer. Always looking for the best tacos in Houston.\",
  \"is_verified\": true,
  \"photos\": [{\"id\": \"alex-1\", \"url\": \"$PHOTO_BASE/male1.jpg\", \"is_main\": true, \"display_order\": 0}]
}"
echo " -> Alex profile created"

# Maya - female1.jpg (FRIEND 2)
insert_profile "{
  \"user_id\": \"$MAYA_ID\",
  \"first_name\": \"Maya\",
  \"last_name\": \"K.\",
  \"age\": 20,
  \"gender\": [\"Woman\"],
  \"pronouns\": \"She/Her\",
  \"interested_in_genders\": [\"Man\"],
  \"height_inches\": 65,
  \"school\": \"Rice University\",
  \"location\": \"Houston, TX\",
  \"interests\": [\"Dance\", \"Reading\", \"Travel\", \"Yoga\"],
  \"values\": [\"Empathy\", \"Growth\", \"Authenticity\"],
  \"bio\": \"Contemporary dancer and bookworm. Currently reading way too many novels at once.\",
  \"is_verified\": true,
  \"photos\": [{\"id\": \"maya-1\", \"url\": \"$PHOTO_BASE/female1.jpg\", \"is_main\": true, \"display_order\": 0}]
}"
echo " -> Maya profile created"

# Riley - female2.jpg (FRIEND 3)
insert_profile "{
  \"user_id\": \"$RILEY_ID\",
  \"first_name\": \"Riley\",
  \"last_name\": \"W.\",
  \"age\": 21,
  \"gender\": [\"Woman\"],
  \"pronouns\": \"She/Her\",
  \"interested_in_genders\": [\"Man\"],
  \"height_inches\": 67,
  \"school\": \"Rice University\",
  \"location\": \"Houston, TX\",
  \"interests\": [\"Tennis\", \"Game Nights\", \"Video Games\", \"Hiking\"],
  \"values\": [\"Humor\", \"Ambition\", \"Kindness\"],
  \"bio\": \"Competitive about everything from tennis to board games. Let's grab coffee and argue about movies.\",
  \"is_verified\": true,
  \"photos\": [{\"id\": \"riley-1\", \"url\": \"$PHOTO_BASE/female2.jpg\", \"is_main\": true, \"display_order\": 0}]
}"
echo " -> Riley profile created"

# Nina - female4.jpg (FRIEND 4)
insert_profile "{
  \"user_id\": \"$NINA_ID\",
  \"first_name\": \"Nina\",
  \"last_name\": \"S.\",
  \"age\": 19,
  \"gender\": [\"Woman\"],
  \"pronouns\": \"She/Her\",
  \"interested_in_genders\": [\"Man\"],
  \"height_inches\": 64,
  \"school\": \"Rice University\",
  \"location\": \"Houston, TX\",
  \"interests\": [\"Art\", \"Music\", \"Coffee\", \"Writing\"],
  \"values\": [\"Creativity\", \"Honesty\", \"Passion\"],
  \"bio\": \"Studio art major. If I'm not painting, I'm at a concert or journaling at a cafe.\",
  \"is_verified\": true,
  \"photos\": [{\"id\": \"nina-1\", \"url\": \"$PHOTO_BASE/female4.jpg\", \"is_main\": true, \"display_order\": 0}]
}"
echo " -> Nina profile created"

# Tyler - male5.jpg (FRIEND REQUEST sender — not yet a friend)
insert_profile "{
  \"user_id\": \"$TYLER_ID\",
  \"first_name\": \"Tyler\",
  \"last_name\": \"R.\",
  \"age\": 22,
  \"gender\": [\"Man\"],
  \"pronouns\": \"He/Him\",
  \"interested_in_genders\": [\"Woman\"],
  \"height_inches\": 70,
  \"school\": \"Rice University\",
  \"location\": \"Houston, TX\",
  \"interests\": [\"Running\", \"Startups\", \"Cooking\", \"Basketball\"],
  \"values\": [\"Discipline\", \"Growth\", \"Humor\"],
  \"bio\": \"Marathon runner and aspiring founder. My pasta game is elite.\",
  \"is_verified\": true,
  \"photos\": [{\"id\": \"tyler-1\", \"url\": \"$PHOTO_BASE/male5.jpg\", \"is_main\": true, \"display_order\": 0}]
}"
echo " -> Tyler profile created"

echo ""
echo "Creating friend codes..."
# Friend codes
for pair in "$SAUL_ID:BRIDGE-SAUL-0001" "$ALEX_ID:BRIDGE-ALEX-0002" "$MAYA_ID:BRIDGE-MAYA-0003" "$RILEY_ID:BRIDGE-RILE-0004" "$NINA_ID:BRIDGE-NINA-0005" "$TYLER_ID:BRIDGE-TYLE-0006"; do
  uid=${pair%%:*}
  code=${pair##*:}
  curl -s -o /dev/null "$API/rest/v1/friend_codes" \
    -H "$AUTH" -H "$API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"user_id\": \"$uid\", \"code\": \"$code\"}" 2>/dev/null || true
done
echo "  Done"

echo ""
echo "Creating friendships (4 accepted friends)..."
# 4 accepted friendships: Saul <-> Alex, Maya, Riley, Nina (bidirectional)
for fid in "$ALEX_ID" "$MAYA_ID" "$RILEY_ID" "$NINA_ID"; do
  curl -s -o /dev/null "$API/rest/v1/friends" \
    -H "$AUTH" -H "$API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"user_id\": \"$SAUL_ID\", \"friend_id\": \"$fid\", \"status\": \"accepted\", \"requested_by\": \"$SAUL_ID\"}"
  curl -s -o /dev/null "$API/rest/v1/friends" \
    -H "$AUTH" -H "$API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"user_id\": \"$fid\", \"friend_id\": \"$SAUL_ID\", \"status\": \"accepted\", \"requested_by\": \"$SAUL_ID\"}"
done
echo "  4 friendships created"

echo ""
echo "Creating friend request (Tyler -> Saul, pending)..."
# Tyler sends Saul a friend request (pending)
curl -s -o /dev/null "$API/rest/v1/friends" \
  -H "$AUTH" -H "$API_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"user_id\": \"$TYLER_ID\", \"friend_id\": \"$SAUL_ID\", \"status\": \"pending\", \"requested_by\": \"$TYLER_ID\"}"
echo "  Pending request created"

echo ""
echo "Creating proposal (Riley + Alex, for Saul to vote on)..."
# Create a proposal between Riley and Alex that Saul can vote on
PROPOSAL_RESULT=$(curl -s "$API/rest/v1/proposals" \
  -H "$AUTH" -H "$API_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"user_a_id\": \"$RILEY_ID\",
    \"user_b_id\": \"$ALEX_ID\",
    \"status\": \"voting\",
    \"compatibility_score\": 85.0,
    \"pool_yes_votes\": 3,
    \"pool_no_votes\": 1,
    \"friend_yes_votes\": 0,
    \"friend_no_votes\": 0,
    \"pool_eligible\": true,
    \"creation_type\": \"algorithm\",
    \"voting_started_at\": \"$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)\",
    \"voting_expires_at\": \"$(date -u -v+4d +%Y-%m-%dT%H:%M:%SZ)\"
  }")
PROPOSAL_ID=$(echo "$PROPOSAL_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if isinstance(d,list) else d['id'])" 2>/dev/null || echo "unknown")
echo "  Proposal ID: $PROPOSAL_ID"

echo ""
echo "Creating karma scores..."
for pair in "$SAUL_ID:15:12:8:solid" "$ALEX_ID:20:16:12:solid" "$MAYA_ID:10:8:6:new" "$RILEY_ID:25:20:15:trusted" "$NINA_ID:8:6:4:new" "$TYLER_ID:12:10:7:solid"; do
  IFS=: read uid kp tv av bt <<< "$pair"
  curl -s -o /dev/null "$API/rest/v1/karma_scores" \
    -H "$AUTH" -H "$API_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"user_id\": \"$uid\", \"karma_points\": $kp, \"total_votes\": $tv, \"accurate_votes\": $av, \"badge_tier\": \"$bt\"}" 2>/dev/null || true
done
echo "  Done"

echo ""
echo "=========================================="
echo "  LOCAL SEED COMPLETE"
echo "=========================================="
echo "  Main user:  saul@local.bridgedate.app / TestPass123!"
echo "  Saul ID:    $SAUL_ID"
echo "  Friends:    Alex, Maya, Riley, Nina"
echo "  Request:    Tyler -> Saul (pending)"
echo "  Proposal:   Riley + Alex (voting, ID: $PROPOSAL_ID)"
echo "=========================================="
