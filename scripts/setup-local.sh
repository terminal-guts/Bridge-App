#!/bin/bash
# ============================================
# Local Development Setup
# Run after `supabase start` to create storage buckets
# and seed test data that mirrors production.
# ============================================

set -e

echo "🔧 Setting up local development environment..."

# Service role key for local Supabase
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
BASE_URL="http://127.0.0.1:54321"
DB_CONTAINER="$(docker ps --filter "name=supabase_db" -q | head -1)"

# 0a. Install required extensions as postgres superuser
# (supabase_admin cannot create citext during migrations due to pg_read_file perms).
# Also upgrade waitlist_signups.email from TEXT → CITEXT to match prod exactly.
echo "🔌 Ensuring extensions are present (citext)..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -q <<'SQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'waitlist_signups'
          AND column_name = 'email'
          AND udt_name = 'text'
    ) THEN
        ALTER TABLE waitlist_signups ALTER COLUMN email TYPE citext;
    END IF;
END $$;
SQL
echo "  ✓ extensions + waitlist_signups.email upgraded to CITEXT"

# 1. Create storage buckets
echo "📦 Creating storage buckets..."
curl -s -X POST "$BASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"profile-photos","name":"profile-photos","public":true,"allowed_mime_types":["image/jpeg","image/jpg","image/png","image/webp","image/heic"],"file_size_limit":10485760}' \
  -o /dev/null 2>/dev/null && echo "  ✓ profile-photos bucket" || echo "  ✓ profile-photos bucket (already exists)"

# 2. Seed test users for proposal voting
echo "👥 Seeding test users (Emma + James)..."
docker exec -i $(docker ps --filter "name=supabase_db" -q) psql -U postgres -d postgres -q <<'SQL'
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'testusera@rice.edu', '', NOW(), NOW(), NOW(), 'authenticated', 'authenticated'),
  ('bbbb2222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'testuserb@rice.edu', '', NOW(), NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (user_id, first_name, last_name, age, gender, height_inches, ethnicity, religion, political_leaning, interests, values, role, drinking_frequency, cannabis_frequency, tobacco_frequency, other_drugs_frequency)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Emma', 'Rodriguez', 21, '{female}', 65, 'Hispanic', 'Catholic', 'moderate', '{Tennis,Reading,Cooking}', '{Honesty,Kindness,Growth}', 'dater', 'sometimes', 'no', 'no', 'no'),
  ('bbbb2222-2222-2222-2222-222222222222', 'James', 'Chen', 22, '{male}', 71, 'East Asian', 'Agnostic', 'liberal', '{Hiking,Music,Photography}', '{Loyalty,Adventure,Humor}', 'dater', 'yes', 'no', 'no', 'no')
ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name;

INSERT INTO proposals (id, user_a_id, user_b_id, status, pool_eligible, compatibility_score, voting_started_at, voting_expires_at)
VALUES ('cccc3333-3333-3333-3333-333333333333', 'aaaa1111-1111-1111-1111-111111111111', 'bbbb2222-2222-2222-2222-222222222222', 'pending', true, 87.5, NOW(), NOW() + INTERVAL '72 hours')
ON CONFLICT (id) DO UPDATE SET status = 'pending';
SQL
echo "  ✓ Test users + proposal seeded"

echo ""
echo "✅ Local setup complete!"
echo "   Studio: http://127.0.0.1:54323"
echo "   Mailpit: http://127.0.0.1:54324"
echo "   Login: any @rice.edu email + check Mailpit for codes"
