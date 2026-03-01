# Backend Gap Analysis — Mock → Real Supabase

**Date:** 2026-03-01
**Status:** The real backend (`communityBackendService.ts`) already exists and `COMMUNITY_BACKEND_ENABLED: true` is set in `features.ts`. The app is already routing to the real service for most screens.

## Critical Finding

The mock service (`communityService.ts`) is **not being used in production** for most screens. The service switcher (`communityServiceIndex.ts`) routes to `communityBackendService.ts` when the feature flag is on. However, there are **specific gaps** that need fixing for the real backend to work correctly.

---

## GAP 1: MatchesScreen.tsx Bypasses Service Switcher (CRITICAL)

**File:** `src/screens/match/MatchesScreen.tsx:5`
**Issue:** Directly imports from `communityService` (mock) instead of `communityServiceIndex`
**Impact:** The Match tab ALWAYS uses mock data regardless of feature flags

```typescript
// BROKEN — always uses mock
import { communityService, MatchEndedEvent } from '../../services/communityService';

// SHOULD BE
import { communityService } from '../../services/communityServiceIndex';
import type { MatchEndedEvent } from '../../services/communityService';
```

**Methods used:** `getFriendsAreaData()`, `onStateChange()`, `getEndedMatchEvent()`, `clearEndedMatchEvent()`, `endActiveMatch()`

**Fix:** Change import to use service index. Export `MatchEndedEvent` type from a shared location.

---

## GAP 2: daily_surveys Column Name Mismatches (CRITICAL)

**File:** `communityBackendService.ts` lines 230-305, 370-432, 659-666
**Issue:** Backend service uses column names that don't match the actual `daily_surveys` schema

| Backend Service Uses | Actual Schema Column |
|---------------------|---------------------|
| `user_id` | `ranker_user_id` |
| `anchor_id` | `recipient_user_id` |
| `candidate_ids` (array) | `candidate_1_user_id`, `candidate_2_user_id`, `candidate_3_user_id` (separate columns) |
| `submitted_at` | `completed_at` |
| `selected_candidate_id` | *does not exist* |
| `submitted_by_friend_id` | *does not exist* |

**Impact:** Every daily grid query returns empty results. Grid voting submissions silently fail.

**Fix:** Update all queries to use correct column names. Collect candidate IDs from 3 separate columns.

---

## GAP 3: Missing `pool_vote_assignments` Migration (MODERATE)

**Issue:** Edge Functions (`generate-proposals`, `get-proposals-for-voting`, `process-vote`) all reference `pool_vote_assignments` table, but no individual migration file exists.
**Note:** The table IS defined in `combined_migration.sql` — if that was run on the production DB, the table exists. But it should have its own migration file for consistency.

**Schema (from combined_migration.sql):**
```sql
CREATE TABLE pool_vote_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_date DATE DEFAULT CURRENT_DATE,
    has_voted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pool_assignment UNIQUE (proposal_id, voter_id)
);
```

---

## GAP 4: No Unique Pairing Constraint on Proposals (MODERATE)

**File:** `supabase/migrations/20260214_proposals.sql`
**Issue:** No UNIQUE constraint on `(user_a_id, user_b_id)` — the same two users can be proposed multiple times.
**Fix:** Add order-independent unique index:
```sql
CREATE UNIQUE INDEX unique_proposal_pair
ON proposals (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
WHERE status NOT IN ('expired', 'rejected', 'declined');
```

---

## GAP 5: Stub Methods in Backend Service (LOW)

| Method | Current Behavior | Needed |
|--------|-----------------|--------|
| `onStateChange()` | Returns no-op unsubscribe | Should use Supabase Realtime subscriptions on `proposals`, `matches` tables |
| `getNextResetAt()` | Returns `new Date()` (wrong) | Should return next 7PM Central from `this.nextResetAt` |
| `triggerReset()` | Empty no-op | Should reset vote count for new daily cycle |

---

## GAP 6: DevStateToggle Direct Mock Import (LOW, DEV-ONLY)

**File:** `src/components/DevStateToggle.tsx:11`
**Issue:** Directly imports mock service — but this is intentional since it's a dev-only tool for toggling mock states.
**Impact:** None in production (gated by `ENABLE_DEV_STATE_TOGGLE: false`)

---

## Fix Priority

1. **GAP 1** — MatchesScreen import (blocks Match tab from working with real data)
2. **GAP 2** — daily_surveys columns (blocks grid features entirely)
3. **GAP 4** — Unique constraint (data integrity)
4. **GAP 3** — pool_vote_assignments migration (consistency)
5. **GAP 5** — Stub methods (timer display, realtime updates)
6. **GAP 6** — DevStateToggle (no fix needed)
