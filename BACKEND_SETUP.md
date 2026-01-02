# Bridge Backend Setup Guide

## Backend Architecture

Bridge uses **Supabase** as the backend - a complete Backend-as-a-Service platform built on PostgreSQL.

### What Supabase Provides:
- **Database**: PostgreSQL (with full SQL access)
- **Authentication**: Built-in user authentication with email/phone
- **Real-time**: WebSocket-based real-time subscriptions
- **Storage**: File storage for user photos
- **Auto-generated APIs**: REST and GraphQL APIs
- **Row Level Security**: Database-level security policies

## Setup Options

You have two options for running the backend:

### Option 1: Use the Hosted Supabase Project (Recommended for Development)
This is the easiest way to get started and test the backend.

### Option 2: Run Supabase Locally (Advanced)
Run a local Supabase instance using Docker for offline development.

---

## Option 1: Hosted Supabase Setup

### Step 1: Get Access to the Existing Project

The Bridge-Version1 already has a configured Supabase project. You'll need the credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://ikyiwnydgedwbmcdzgbe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... (ask project owner)
```

**To get access:**
1. Ask the project owner to invite you to the Supabase project
2. Go to https://supabase.com and accept the invitation
3. Navigate to Project Settings > API to view the keys

### Step 2: Configure Environment Variables

Copy the Bridge-Version1/.env file or create your own:

```bash
# Copy from Bridge-Version1
cp Bridge-Version1/.env .env

# Or create manually
cat > .env << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://ikyiwnydgedwbmcdzgbe.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
EOF
```

### Step 3: Test Backend Connection

```bash
# Install tsx if not already installed
npm install -D tsx

# Run the backend test script (from Bridge-Version1)
npx tsx Bridge-Version1/scripts/test-backend-connection.ts
```

Expected output:
```
✅ Connected to Supabase
✅ Database is accessible
✅ Authentication is working
```

### Step 4: Access the Supabase Dashboard

1. Go to https://supabase.com
2. Select your project
3. Explore:
   - **Table Editor**: View/edit database tables
   - **SQL Editor**: Run custom queries
   - **Authentication**: Manage users
   - **Storage**: Manage uploaded files
   - **Database**: View database schema and relationships

---

## Option 2: Local Supabase Setup (Advanced)

### Prerequisites
- Docker Desktop installed and running
- Supabase CLI installed

### Step 1: Install Supabase CLI

```bash
# Install globally
npm install -g supabase

# Or use npx (no installation needed)
npx supabase --version
```

### Step 2: Initialize Supabase

```bash
# Initialize Supabase in your project
supabase init
```

This creates a `supabase/` directory with:
- `config.toml` - Supabase configuration
- `migrations/` - Database migration files
- `seed.sql` - Initial seed data

### Step 3: Start Local Supabase

```bash
# Start all Supabase services (requires Docker)
supabase start
```

This will start:
- PostgreSQL database
- Auth server
- REST API (PostgREST)
- Realtime server
- Storage server
- Studio (web UI)

**Services will be available at:**
- Studio: http://localhost:54323
- API: http://localhost:54321
- Database: postgresql://postgres:postgres@localhost:54322/postgres

### Step 4: Create Database Schema

Copy the schema from the hosted project or create migrations:

```bash
# Pull schema from hosted project
supabase db pull

# Or create a new migration
supabase migration new init_schema
```

### Step 5: Apply Migrations

```bash
# Reset database and apply all migrations
supabase db reset
```

### Step 6: Update .env for Local Development

```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
```

Get the keys from the `supabase start` output.

---

## Database Scripts

The `Bridge-Version1/scripts/` directory contains TypeScript utilities for managing the database:

### Essential Scripts

#### 1. Test Backend Connection
```bash
npx tsx Bridge-Version1/scripts/test-backend-connection.ts
```
Verifies connection to Supabase and tests RPC functions.

#### 2. Create Development User
```bash
npx tsx Bridge-Version1/scripts/create-dev-user.ts
```
Creates a test user for development.

#### 3. Seed Test Users
```bash
npx tsx Bridge-Version1/scripts/seed-test-users.ts
```
Populates the database with realistic test data.

#### 4. Check Test Data
```bash
npx tsx Bridge-Version1/scripts/check-test-data.ts
```
Verifies that test data was created successfully.

#### 5. Generate Daily Grids
```bash
npx tsx Bridge-Version1/scripts/generate-daily-grids-manual.ts
```
Manually trigger the daily grid generation process.

### SQL Scripts

#### 1. Create Friends Area Test Data
```bash
psql -f Bridge-Version1/scripts/create-friends-area-test-data.sql
```
Creates test data for the friends matching area.

#### 2. Fix Displayed Question IDs
```bash
psql -f Bridge-Version1/scripts/fix_displayed_question_ids.sql
```
Repairs question display tracking.

---

## Frontend Integration

### Current Setup (Mock)
The current project (`Bridge-Version1-Mock`) uses **mocked** Supabase calls:
- File: `src/lib/supabase.ts`
- All API calls return fake data
- No real backend connection

### Switching to Real Backend

To connect to the real Supabase backend:

1. **Install Supabase client** (if not already installed):
```bash
npm install @supabase/supabase-js
```

2. **Replace mock with real client** in `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

3. **Update service files** to use real Supabase queries instead of mocks

4. **Test the connection**:
```bash
npm start
# Try signing in or viewing profiles
```

---

## Database Schema Overview

### Main Tables

**user_profiles**
- User profile information
- Demographics, preferences, photos
- Links to auth.users

**matches**
- Matching proposals and states
- Community voting results
- Match progression

**friendships**
- Friend connections
- Friend requests and approvals

**votes**
- Community votes on potential matches
- Vote tracking and analysis

**daily_grids**
- Daily matching grids for users
- Grid generation and completion tracking

**questions**
- Profile questions and prompts
- Question responses

---

## Troubleshooting

### Connection Issues

**Error: "Missing environment variables"**
- Check that `.env` file exists and contains valid credentials
- Ensure variables are prefixed with `EXPO_PUBLIC_` for frontend access

**Error: "Failed to connect to Supabase"**
- Verify Supabase URL is correct
- Check that API keys are valid (not expired)
- Ensure you have internet connection (for hosted Supabase)

### Database Scripts Failing

**Error: "Cannot find module 'pg'"**
```bash
npm install --save-dev pg @types/pg
```

**Error: "tsx command not found"**
```bash
npm install -D tsx
```

**Error: "RPC function does not exist"**
- Database migrations may not be applied
- Run `supabase db reset` (local) or check hosted project

### Local Supabase Issues

**Docker not running**
- Start Docker Desktop
- Verify: `docker ps`

**Port conflicts**
- Stop other services using ports 54321-54323
- Or change ports in `supabase/config.toml`

**Services not starting**
```bash
# Stop and restart
supabase stop
supabase start
```

---

## Production Deployment

### Hosted Supabase (Recommended)
1. Create production project on Supabase
2. Apply migrations: `supabase db push`
3. Configure production `.env` variables
4. Set up Row Level Security policies
5. Enable database backups

### Self-Hosted (Advanced)
- Requires server infrastructure
- Docker Compose setup
- Database backups and monitoring
- See: https://supabase.com/docs/guides/self-hosting

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## Summary

**To test the backend:**
1. Get Supabase credentials from project owner
2. Add to `.env` file
3. Run `npx tsx Bridge-Version1/scripts/test-backend-connection.ts`
4. Access Supabase dashboard at https://supabase.com

**To develop locally:**
1. Install Docker + Supabase CLI
2. Run `supabase start`
3. Run database scripts to seed data
4. Connect frontend to local Supabase

**Current project state:**
- Frontend: Fully mocked, no backend connection
- To connect: Replace `src/lib/supabase.ts` with real client
