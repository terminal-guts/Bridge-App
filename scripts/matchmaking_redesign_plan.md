# Matchmaking Algorithm Redesign — Complete Plan

**Date:** 2026-03-15
**Status:** Active
**Author:** Matchmaking Systems Architect Agent

---

## A. Current System Diagnosis

### Architecture Overview

The Bridge matchmaking system consists of:

1. **Scoring Engine** (`supabase/functions/_shared/scoring.ts`) — 10-category weighted sum producing a 0–100 score
2. **Batch Generator** (`supabase/functions/generate-proposals/index.ts`) — O(n²) pair generation, runs at 7PM Central via cron
3. **On-Demand Generator** (`supabase/functions/generate-proposal-for-user/index.ts`) — Same scoring, triggered per-user when they open the app
4. **Proposal Lifecycle** (`supabase/functions/proposal-lifecycle/index.ts`) — Checks expiry, rejection floors, confirmation thresholds
5. **Vote Processor** (`supabase/functions/process-vote/index.ts`) — Inline lifecycle cascade after each vote
6. **Frontend Display Helpers** (`src/utils/compatibilityHelpers.ts`, `src/utils/proposalMatching.ts`) — Entirely separate scoring used for UI display only

### Current Weights

| Category | Weight | Signal Type |
|----------|--------|-------------|
| Age | 18% | Preference satisfaction (mutual) |
| Interests | 15% | Similarity (overlap coefficient) |
| Lifestyle/Substances | 11% | Preference satisfaction (mutual) |
| Height | 11% | Preference satisfaction (mutual) |
| Ethnicity | 11% | Preference satisfaction (mutual) |
| Politics | 9% | Hybrid (preference + spectrum distance) |
| Values | 7% | Similarity (overlap coefficient) |
| Family | 6% | Similarity (matrix lookup) |
| Religion | 6% | Hybrid (preference + compatibility groups) |
| Deep Questions | 6% | Similarity (keyword + question overlap) |

### Current Flow

1. Fetch all eligible profiles (not paused, profile complete, not matchmaking_only)
2. O(n²) loop: for each pair, check basic filter (gender + age range)
3. Score surviving pairs across 10 categories
4. Add friend recommendation boost (+5 per rec, cap +15)
5. Filter to scores ≥ 25
6. Sort descending by score
7. Slice top N pairs
8. Insert proposals into DB
9. Assign 6 random pool voters per proposal

### Hard Constraints (Current)

- Gender compatibility (mutual interested_in_genders)
- Age range (mutual — hard filter in `passesBasicFilter`)
- Blocked users
- ~~Friend pairs (cannot be romantically matched)~~ — **removed 2026-03-16**: friends can now be algorithmically matched
- Previously rejected/declined pairs (permanent block)
- Users with active proposals or matches
- Users with queued friend suggestions

---

## B. Core Failures in the Current Matchmaking Algorithm

### CRITICAL BUG 1: Family Plans Data Mismatch (Scoring Is Broken)

**Severity: CRITICAL — scoring returns wrong values for most users**

The onboarding stores family plan values as:
- `want_children`, `dont_want_children`, `not_sure`

The scoring engine's `FAMILY_PLANS_MATRIX` expects:
- `want_someday`, `dont_want`, `open`, `not_sure`, `prefer_not_to_say`

**Result:** Only `not_sure` matches. Users who selected `want_children` or `dont_want_children` ALWAYS fall through to the default return value of `0.5`. A pair where both users want children gets 0.5 instead of 1.0. A pair where one wants children and the other doesn't gets 0.5 instead of 0.0.

**The family plans category is effectively non-functional.** It always returns ~0.5 regardless of actual values.

### CRITICAL BUG 2: No Allocation Exclusivity

**Severity: CRITICAL — users can appear in multiple proposals per cycle**

`generate-proposals` scores all pairs, sorts by score, and takes the top N. But it does NOT track which users have been allocated in the current batch. If user A is the highest-scoring partner for both user B and user C, user A can appear in two proposals in the same cycle.

The `usersWithActiveProposal` check only catches users who had proposals BEFORE this run started. It does not remove users from consideration as proposals are created within the same run.

The DB has a partial unique index preventing duplicate active proposals, but the insert would simply fail silently (caught as error code 23505). The second-best match for the displaced user is never created.

### CRITICAL BUG 3: Interests/Values Scoring Formula Is Biased

**Severity: HIGH — systematically inflates scores for users with few selections**

Both `scoreInterests` and `scoreValues` use:
```
shared / min(a.size, b.size)
```

This is the **overlap coefficient**, which rewards users who selected very few items. Example:
- User A has 1 interest ("Hiking"), User B has 15 interests including "Hiking"
- Score = 1/1 = 1.0 (PERFECT)
- But they only share 1 out of 15 things. This is not a perfect interest match.

The frontend (`proposalMatching.ts`) correctly uses Jaccard similarity (`shared / union`), creating a backend/frontend divergence.

### BUG 4: Day 5 Auto-Send Has No Quality Floor

**Severity: HIGH — mediocre proposals auto-send to users**

In the lifecycle check, day > 5 immediately sets `newStatus = 'deciding'` BEFORE rejection floor checks run. The rejection floor checks are gated on `if (newStatus === 'pending')`, so they never execute for expired proposals.

A proposal with 2 yes votes and 5 no votes (29% yes rate, only 7 total pool votes — below the 8-vote rejection floor threshold) would auto-send on day 5.

### BUG 5: Ethnicity Scoring Is Binary

**Severity: MEDIUM — no partial credit for cultural proximity**

`scoreEthnicity` returns 1.0 if the partner's ethnicity is in the preference list, 0.0 if not. There is no concept of cultural proximity. East Asian and Southeast Asian, for example, are treated as completely unrelated.

### BUG 6: Substance Scoring Cliff-Edge

**Severity: MEDIUM — harsh 0/1 with minimal gradients**

`scoreSingleSubstance` gives partial credit only for `sometimes` vs `yes`/`no` (0.5). All other mismatches return 0.0. A user who prefers "no drinking" gets 0.0 for someone who "sometimes" drinks — the same score as for a heavy drinker. There is no ordinal gradient.

### BUG 7: Religion Preference Perverse Incentive

**Severity: MEDIUM — users who set preferences get penalized**

If religion preferences are set, score = `0.6 * prefMatch + 0.4 * compatibility`. If a user's preference doesn't match, `prefMatch = 0.0`, so the max possible score is `0.4 * compatibility`. But a user who DOESN'T set preferences gets `1.0 * compatibility`. Setting preferences can only hurt your score, never help it (since prefMatch=1.0 + compat≥0.5 ≈ 0.8 vs compat alone could be 1.0).

### BUG 8: Weight Miscalibration for Campus Context

**Severity: MEDIUM — weights don't reflect campus-specific reality**

- **Age at 18%** is excessive when all users are 18-22 year-old undergrads. Most pairs will score high, wasting 18% of the score on a non-discriminating signal.
- **Height at 11%** is the same weight as lifestyle and ethnicity. Height preference is real but shouldn't be weighted the same as lifestyle compatibility.
- **Interests at 15%** is underweighted given the product requirement that "interests are likely one of the most important signals."
- **Values at 7%** is underweighted. Shared values are among the strongest predictors of relationship satisfaction.

### BUG 9: Missing Data Defaults Are Inconsistent

**Severity: LOW — but creates unpredictable score behavior**

| Category | Missing Data Default | Principle |
|----------|---------------------|-----------|
| Age | 0.5 | Neutral |
| Interests | 0.5 (both missing) or 0.25 (one missing) | Penalty |
| Values | 0.5 (both missing) or 0.25 (one missing) | Penalty |
| Height | 0.5 | Neutral |
| Ethnicity | 0.5 | Neutral |
| Religion | 0.5 | Neutral |
| Politics | 0.5 | Neutral |
| Family | 0.5 | Neutral |
| Deep Questions | 0.5 (both missing) or 0.3 (one missing) | Penalty |

No principled framework — some categories penalize one-sided missing data (0.25), others don't.

### BUG 10: Frontend/Backend Scoring Divergence

**Severity: LOW (display-only) — but creates confusion**

`src/utils/compatibilityHelpers.ts` has a completely different scoring engine:
- Religion: 15 points (vs 6% backend)
- Values: 25 points (vs 7% backend)
- Interests: 15 points (vs 15% backend)
- Politics: 15 points (vs 9% backend)
- Family: 20 points (vs 6% backend)
- Lifestyle: 10 points (vs 11% backend)
- No age, height, ethnicity, or deep questions

This is used only for display and does not affect matching decisions. But it means the frontend shows different compatibility assessments than what the algorithm actually computed.

---

## C. Research Insights That Matter for Bridge

### 1. Shared Interests as Compatibility Predictors

The **similarity-attraction hypothesis** (Byrne, 1971; Montoya & Horton, 2013 meta-analysis) is one of the most robust findings in social psychology. People are attracted to those who share their attitudes, values, and interests. The effect is strongest for:
- **Attitudes and values** (r = 0.40–0.50)
- **Activities and interests** (r = 0.35–0.45)
- **Background similarity** (r = 0.20–0.30)

For Bridge's college context, shared interests are especially powerful because they directly translate to shared activities — giving couples things to do together. This validates elevating interests weight significantly.

### 2. Preference Satisfaction vs. Similarity

OKCupid's internal research (Rudder, 2014) found that **stated preferences predict attraction better than demographic similarity** for categories like religion and politics, but **behavioral similarity** (interests, lifestyle) predicts relationship longevity better than stated preferences about those categories.

This means the algorithm should use:
- **Preference satisfaction** for identity categories (religion, politics, ethnicity, height, age)
- **Similarity** for behavioral categories (interests, values, lifestyle patterns)
- **Hybrid** where both matter (substances — preference for partner + similarity of habits)

### 3. Set Similarity Metrics

For comparing sets of interests/values, the key metrics are:
- **Jaccard Index**: `|A ∩ B| / |A ∪ B|` — penalizes having many non-shared items
- **Dice/Sørensen**: `2|A ∩ B| / (|A| + |B|)` — less punishing than Jaccard
- **Overlap Coefficient**: `|A ∩ B| / min(|A|, |B|)` — current (broken, inflates for small sets)

**Best choice for Bridge:** Modified Jaccard that blends proportional overlap with absolute shared count. This rewards both having a high proportion of shared interests AND having many shared interests in absolute terms.

### 4. Ordinal Category Distance

For ordered categories (substance use, education level), distance should follow a **decay function**, not binary match. The standard approach:
- Define ordinal positions (e.g., never=0, sometimes=1, regularly=2)
- Score = 1 - (distance / max_distance)
- Apply non-linear decay if appropriate (e.g., quadratic: closer distances matter more)

### 5. Matching Allocation and Fairness

The **deferred acceptance algorithm** (Gale-Shapley, 1962) produces stable matchings but requires preference rankings from both sides. Bridge's one-sided scoring is simpler. For Bridge's needs:
- **Greedy maximum-weight allocation** with exclusivity is sufficient
- Process pairs in descending score order
- Once a user is allocated, remove them from consideration
- This is O(k log k) for k scored pairs (sort dominates)
- Not globally optimal (Hungarian algorithm would be) but simple, fast, and produces very good results

### 6. Scalability at 1,000 Users

At 1,000 eligible users:
- n² = 500,000 pairs
- Gender filter eliminates ~50% (hetero: ~250K remain; more for mixed orientations)
- Age filter eliminates ~10-20% more
- ~150,000–200,000 pairs need full scoring
- Each scoring call: ~10 category evaluations, each O(1) or O(k) for set operations
- Total compute: 5–15 seconds in an edge function — **acceptable**

At 5,000 users this becomes 12.5M pairs, which would require moving to a precomputed index or locality-sensitive hashing. Not needed for Rice beta.

---

## D. Proposed Algorithm Architecture

### Staged Pipeline

```
Stage 1: Hard Filter (binary pass/fail)
    → Gender compatibility
    → Age range (mutual)
    → Blocked pairs / friend pairs / existing pairs
    → Active proposals / matches

Stage 2: Full Scoring (10 categories, 0–1 per category)
    → Each category produces a raw score [0, 1]
    → Weighted sum produces total [0, 100]
    → Friend recommendation boost applied

Stage 3: Quality Gate
    → Minimum score threshold (configurable, currently 25)
    → Pairs below threshold are discarded

Stage 4: Exclusive Allocation
    → Sort surviving pairs by score descending
    → Greedy allocation: take highest pair, mark both users as allocated
    → Continue until all users allocated or no pairs remain
    → Some users may receive no proposal (by design)

Stage 5: Proposal Creation
    → Insert allocated pairs as proposals
    → Assign pool voters
```

### Key Architectural Changes from Current System

1. **Exclusive allocation** replaces naive top-N slicing
2. **Quality floor on Day 5 auto-send** added to lifecycle
3. **Interests elevated to most important category**
4. **Family plans data mismatch fixed**
5. **Set similarity metric changed from overlap coefficient to modified Jaccard**
6. **Substance scoring gets ordinal gradients**
7. **Ethnicity scoring gets partial credit**
8. **Religion preference scoring incentive fixed**

---

## E. Field-by-Field Modeling Decisions

### 1. Age (10% — reduced from 18%)

**Signal type:** Preference satisfaction (mutual)
**Method:** Current approach is sound — check if each person's age falls within the other's preferred range, score based on distance from ideal (midpoint of range).
**Why reduced:** At Rice University, all users are 18-22. Age range filtering already happens in hard constraints. The remaining scoring adds minimal discrimination. 10% is appropriate — it still matters but shouldn't dominate.
**Missing data:** 0.5 (neutral)
**Edge cases:** Very narrow ranges (e.g., 20-20) work correctly with the current formula.

### 2. Interests (22% — increased from 15%)

**Signal type:** Similarity (set overlap)
**Method:** Modified Jaccard with absolute bonus

```typescript
const union = new Set([...aInts, ...bInts]).size;
const jaccard = union > 0 ? shared / union : 0;
const absoluteBonus = Math.min(shared / 4, 1.0);
const score = jaccard * 0.5 + absoluteBonus * 0.5;
```

**Why this formula:**
- Jaccard component rewards proportional overlap (not biased by set size)
- Absolute bonus rewards having many shared interests (4+ shared = max bonus)
- Blend ensures both aspects matter
- Example: 3 shared out of union 10 → 0.3 * 0.5 + 0.75 * 0.5 = 0.525
- Example: 1 shared out of union 15 → 0.067 * 0.5 + 0.25 * 0.5 = 0.158
- Example: 5 shared out of union 8 → 0.625 * 0.5 + 1.0 * 0.5 = 0.8125

**Missing data:** 0.4 (one side missing) or 0.5 (both missing). Slight penalty for not filling out interests — it's an important signal.
**Edge cases:** Both empty → 0.5 (neutral, don't penalize). One empty → 0.4 (mild penalty).

### 3. Values (12% — increased from 7%)

**Signal type:** Similarity (set overlap)
**Method:** Same modified Jaccard as interests but with different absolute bonus threshold (3 instead of 4, since values lists tend to be shorter)

```typescript
const union = new Set([...aVals, ...bVals]).size;
const jaccard = union > 0 ? shared / union : 0;
const absoluteBonus = Math.min(shared / 3, 1.0);
const score = jaccard * 0.5 + absoluteBonus * 0.5;
```

**Missing data:** 0.4 (one side) or 0.5 (both)
**Edge cases:** Same as interests.

### 4. Lifestyle/Substances (10% — reduced from 11%)

**Signal type:** Preference satisfaction (mutual) with ordinal gradients
**Method:** For each substance (drinking, cannabis, tobacco, other_drugs), compute preference satisfaction with ordinal distance fallback.

```typescript
// Ordinal scales
const SUBSTANCE_ORDINAL: Record<string, Record<string, number>> = {
  drinking: { never: 0, rarely: 1, sometimes: 2, socially: 2, regularly: 3, yes: 3 },
  cannabis: { never: 0, rarely: 1, sometimes: 2, regularly: 3, yes: 3 },
  tobacco:  { never: 0, sometimes: 1, regularly: 2, yes: 2 },
  other_drugs: { never: 0, sometimes: 1, regularly: 2, yes: 2 },
};

function oneDirection(habit, prefs, substance):
  if no prefs or dont_care → 1.0
  if habit in prefs → 1.0
  if prefer_not_to_say → 0.5
  // Ordinal fallback: find closest preferred value
  habitOrd = SUBSTANCE_ORDINAL[substance][habit]
  minDist = min(|habitOrd - prefOrd| for each pref)
  maxScale = max ordinal value for this substance
  return max(0, 1.0 - (minDist / maxScale) * 0.8)
```

**Why ordinal gradients:** "Sometimes" drinking should score higher with someone who prefers "no" than "regularly" does. The current binary scoring doesn't capture this.
**Missing data:** 0.6 (neutral-positive — most people aren't strict about substances)
**Edge cases:** `prefer_not_to_say` → 0.5 (true neutral)

### 5. Religion (9% — increased from 6%)

**Signal type:** Hybrid (preference satisfaction + compatibility groups)
**Method:** Fix the perverse incentive. If preferences are set AND matched, give bonus. If not set, use compatibility only. Never penalize for setting preferences.

```typescript
function scoreReligion(profileA, prefsA, profileB, prefsB):
  compatScore = compatDirection(aReligion, bReligion) // Uses similar/opposing groups

  // Preference bonus (additive, not replacing compat)
  aPrefBonus = aPrefRel.length > 0 ? (prefDirection(bReligion, aPrefRel) === 1.0 ? 0.2 : -0.15) : 0
  bPrefBonus = bPrefRel.length > 0 ? (prefDirection(aReligion, bPrefRel) === 1.0 ? 0.2 : -0.15) : 0

  aScore = clamp(compatScore + aPrefBonus, 0, 1)
  bScore = clamp(compatScore + bPrefBonus, 0, 1)
  return (aScore + bScore) / 2
```

**Why this approach:** The base score is always compatibility. Preferences act as a bonus/penalty modifier. Users who set preferences and get a match are rewarded (+0.2). Users who set preferences and don't match are penalized (-0.15). Users who don't set preferences get pure compatibility — never better than a matched preference, never worse than a mismatched one.

**Similar religion groups (expanded):**
- christian ↔ catholic (0.75)
- christian ↔ spiritual (0.65)
- catholic ↔ spiritual (0.60)
- buddhist ↔ spiritual (0.70)
- hindu ↔ spiritual (0.60)
- jewish ↔ spiritual (0.50)
- agnostic ↔ spiritual (0.65)
- agnostic ↔ atheist (0.70)

**Opposing religion groups:**
- atheist ↔ any organized religion (0.25)
- agnostic ↔ strongly religious (0.35)

**Missing data:** 0.5 (neutral)
**Edge cases:** "Other" → 0.5 (unscored). Multi-religion (e.g., "Christian / Buddhist") → check each component.

### 6. Politics (7% — reduced from 9%)

**Signal type:** Hybrid (preference satisfaction + spectrum distance)
**Method:** Fix `not_political` handling. It should NOT be on the liberal-conservative spectrum.

```typescript
// not_political compatibility (orthogonal axis):
// not_political ↔ not_political: 1.0
// not_political ↔ moderate: 0.75
// not_political ↔ liberal/conservative: 0.55
// not_political ↔ very_liberal/very_conservative: 0.35

// Spectrum distance (for on-spectrum values only):
// Same position: 1.0
// 1 step: 0.80
// 2 steps: 0.50
// 3 steps: 0.20
// 4 steps (very_liberal ↔ very_conservative): 0.05
```

**Missing data:** 0.5 (neutral)
**Edge cases:** "Other" → 0.5. "prefer_not_to_say" → 0.5.

### 7. Height (7% — reduced from 11%)

**Signal type:** Preference satisfaction (mutual)
**Method:** Current approach is sound. Keep as-is.
**Why reduced:** Height matters but not as much as interests, values, or religion.
**Missing data:** 0.7 (positive — most people don't have strong height preferences)
**Edge cases:** No preference set → 1.0 (current behavior, correct)

### 8. Ethnicity (6% — reduced from 11%)

**Signal type:** Preference satisfaction with cultural proximity partial credit
**Method:** When ethnicity doesn't exactly match preferences, check cultural proximity.

```typescript
const ETHNICITY_PROXIMITY: Record<string, Record<string, number>> = {
  'east asian': { 'southeast asian': 0.5, 'south asian': 0.25 },
  'southeast asian': { 'east asian': 0.5, 'south asian': 0.35, 'pacific islander': 0.35 },
  'south asian': { 'southeast asian': 0.35, 'middle eastern': 0.25, 'east asian': 0.25 },
  'hispanic': { 'white': 0.25, 'native american': 0.2 },
  'middle eastern': { 'south asian': 0.25, 'white': 0.15 },
  'pacific islander': { 'southeast asian': 0.35 },
  'native american': { 'hispanic': 0.2 },
};

function oneDirection(theirEthnicity, myPrefEthnicities):
  if no prefs or 'no_preference' → 1.0
  if exact match → 1.0
  if multi-ethnic, any component matches → 1.0
  // Partial credit via proximity
  bestProximity = 0
  for each pref in myPrefEthnicities:
    proximity = ETHNICITY_PROXIMITY[pref]?.[theirEthnicity] || 0
    bestProximity = max(bestProximity, proximity)
  return bestProximity
```

**Missing data:** 0.6 (neutral-positive)
**Edge cases:** "Other" → 0.5. Multi-ethnic → check all components.

### 9. Family Plans (6%)

**Signal type:** Similarity (matrix lookup)
**Method:** FIX the data mismatch first. Then keep matrix approach.

```typescript
// Updated matrix keys to match ACTUAL stored values:
const FAMILY_PLANS_MATRIX = new Map([
  ['want_children|want_children', 1.0],
  ['want_children|not_sure', 0.6],
  ['want_children|dont_want_children', 0.0],
  ['dont_want_children|dont_want_children', 1.0],
  ['dont_want_children|not_sure', 0.4],
  ['not_sure|not_sure', 0.9],
  // Legacy values (keep for backward compat)
  ['want_someday|want_someday', 1.0],
  ['want_someday|open', 0.8],
  ['want_someday|not_sure', 0.6],
  ['want_someday|dont_want', 0.0],
  ['dont_want|dont_want', 1.0],
  ['dont_want|open', 0.4],
  ['dont_want|not_sure', 0.4],
  ['open|open', 1.0],
  ['open|not_sure', 0.8],
]);
```

**Missing data:** 0.5 (neutral)
**Edge cases:** `prefer_not_to_say` → 0.5

### 10. Deep Questions (5%)

**Signal type:** Similarity (keyword + question overlap)
**Method:** Keep current lightweight approach. No changes needed.
**Missing data:** 0.5 (both missing) or 0.3 (one missing)

### 11. Education (3%)

**Signal type:** Similarity (ordinal distance)
**Method:** Keep current approach. All Rice students are undergrads so this is minimally discriminating.
**Missing data:** 0.5

### 12. Career (3%)

**Signal type:** Similarity (keyword overlap)
**Method:** Keep current approach.
**Missing data:** 0.5

### 13. Distance (0% — disabled for campus beta)

**Signal type:** Preference satisfaction (mutual)
**Method:** Haversine distance vs max_distance preference. Currently disabled.
**Future:** Re-enable when expanding beyond single campus. Weight 8-10%.
**Note:** `scoreDistance` function kept in code but not included in weights.

---

## F. Weighting Philosophy and Score Composition

### Redesigned Weights

| Category | Old Weight | New Weight | Rationale |
|----------|-----------|------------|-----------|
| Interests | 15% | **22%** | Most important signal per product requirement. Shared activities drive dates and connection. |
| Values | 7% | **12%** | Strong predictor of relationship satisfaction. Underweighted before. |
| Lifestyle/Substances | 11% | **10%** | Important but ordinal gradients make the scoring more precise, so less weight needed. |
| Age | 18% | **10%** | All users are 18-22. Non-discriminating at campus scale. |
| Religion | 6% | **9%** | Important identity signal. Fixed incentive structure. |
| Politics | 9% | **7%** | Matters but less than interests/values for college students. |
| Height | 11% | **7%** | Preference matters but overweighted before. |
| Ethnicity | 11% | **6%** | Partial credit makes it more nuanced, less weight needed. |
| Family Plans | 6% | **6%** | Appropriate. DATA FIX is the key change. |
| Deep Questions | 6% | **5%** | Appropriate for lightweight approach. |
| Education | 0% | **3%** | Minor signal at campus scale. |
| Career | 0% | **3%** | Minor signal at campus scale. |
| **Total** | **100%** | **100%** | |

### Philosophy

The weights embody these principles:
1. **Behavioral compatibility > Identity matching** — What you DO together (interests, lifestyle) matters more than what you ARE (ethnicity, height)
2. **Values alignment is foundational** — Shared values predict long-term relationship success
3. **Preference satisfaction for identity categories** — Let users' stated preferences drive identity-based scoring
4. **Campus context awareness** — Age and distance are near-constant at Rice, so weight them less
5. **Partial credit over cliffs** — Gradients everywhere: substances, ethnicity, religion, politics

### Score Architecture

Remains a **weighted sum** producing a 0-100 score. This is the right choice because:
- Explainable internally
- Easy to debug and tune
- Category scores can be stored and inspected per proposal
- No interaction effects that could create surprising behavior
- Sufficient for the current feature set

A staged/tiered architecture (e.g., must pass category minimums before entering weighted sum) was considered but rejected because:
- Bridge explicitly does NOT want hard dealbreakers beyond gender/age/blocks
- Category minimums would act as implicit dealbreakers
- The weighted sum naturally handles "bad in one area, great in others" tradeoffs

### Missing Data Framework

**Principle:** Missing data should produce a score that is slightly below the mean expected score for that category, but never dramatically penalize. Missing data means we don't know — it should neither reward nor severely punish.

| Category | Both Missing | One Side Missing |
|----------|-------------|-----------------|
| Interests | 0.50 | 0.40 |
| Values | 0.50 | 0.40 |
| Lifestyle | 0.60 | 0.60 |
| Age | 0.50 | 0.50 |
| Religion | 0.50 | 0.50 |
| Politics | 0.50 | 0.50 |
| Height | 0.70 | 0.70 |
| Ethnicity | 0.60 | 0.60 |
| Family | 0.50 | 0.50 |
| Deep Questions | 0.50 | 0.30 |
| Education | 0.50 | 0.50 |
| Career | 0.50 | 0.50 |

Height defaults high because most people don't have strong height preferences. Lifestyle defaults slightly high because most people are tolerant. Deep questions penalizes one-side missing because answering questions signals engagement.

---

## G. Candidate Generation and Scalability Plan

### Current Approach: O(n²) Brute Force

At 1,000 users:
- 499,500 total pairs
- After gender filter (~50% hetero campus): ~250K pairs
- After age filter: ~200K pairs
- Full scoring on ~200K pairs
- Each scoring call: ~10 category evaluations, microseconds each
- **Estimated time: 5-15 seconds** — acceptable for edge function (60s timeout)

### Decision: Keep O(n²) for Now

**Rationale:**
- 1,000 users is well within budget
- No precomputation infrastructure needed
- Simple, correct, easy to debug
- Campus context means most users share location, age range — filters remove many pairs early

### When to Revisit

Move to **candidate pre-filtering** when:
- Eligible users exceed 3,000 (edge function timeout risk)
- Multiple campuses with distance filtering (locality-sensitive hashing)
- Score computation becomes heavier (e.g., LLM-based deep question scoring)

### Optimization Applied Now

1. **Early termination in basic filter** — gender check before age check (gender eliminates more pairs)
2. **No unnecessary object allocation** — score inline rather than building candidate objects first
3. **Batch DB operations** — all exclusion sets fetched in parallel before scoring loop

---

## H. Proposal Allocation and Exclusivity Logic

### Current (Broken)

```
scored.sort(descending)
topPairs = scored.slice(0, maxProposals)
// Insert all — no exclusivity check
```

### Redesigned: Greedy Exclusive Allocation

```typescript
scored.sort((a, b) => b.score - a.score);
const allocated = new Set<string>();
const proposalsToCreate: ScoredPair[] = [];

for (const pair of scored) {
  if (allocated.has(pair.user_a_id) || allocated.has(pair.user_b_id)) {
    continue; // User already allocated in this cycle
  }
  proposalsToCreate.push(pair);
  allocated.add(pair.user_a_id);
  allocated.add(pair.user_b_id);

  if (proposalsToCreate.length >= maxProposals) break;
}
```

**Properties:**
- Each user appears in at most one proposal per cycle
- Higher-scoring pairs are allocated first
- Users who don't appear in any top pair receive no proposal (by design — scarcity)
- O(k) where k = number of scored pairs above threshold
- Not globally optimal but very close and much simpler than Hungarian/Blossom

### Band-Based Selection (Considered, Rejected for Now)

We considered selecting from a "top band" (e.g., all pairs within 5 points of the top score) rather than strict top-1. This would add diversity but:
- Complicates allocation logic
- At small scale, the "band" is often just 1-2 pairs per user anyway
- Can be added later as the user base grows
- Greedy allocation already provides natural diversity (blocking top pairs creates opportunities for second-best pairs)

---

## I. Edge Cases and Failure Modes

### 1. User With No Viable Candidates
**Scenario:** All potential partners are blocked, matched, or below threshold.
**Behavior:** User receives no proposal. This is correct and intended.
**Mitigation:** None needed — scarcity is a product feature.

### 2. Very Small User Pool (< 10 eligible)
**Scenario:** Few eligible users, limited gender compatibility.
**Behavior:** Algorithm may produce very few or no proposals.
**Mitigation:** Lower MIN_COMPATIBILITY_SCORE to 20 when eligible pool < 15. (Already handled — score of 25 is lenient.)

### 3. Race Condition: Cron vs On-Demand Generator
**Scenario:** `generate-proposal-for-user` creates a proposal while `generate-proposals` cron is running.
**Behavior:** DB unique constraint prevents duplicate proposals. Second insert fails silently.
**Mitigation:** Current error handling (catch 23505) is correct.

### 4. All Votes Are "No" But < 6 Pool Votes
**Scenario:** 4 pool votes, all NO. Not enough for immediate cancel (needs 6).
**Behavior:** Proposal stays pending until more votes arrive or day 5.
**FIX:** The day 5 auto-send quality floor (new) will reject this proposal instead of auto-sending.

### 5. User Changes Preferences After Proposal Created
**Scenario:** User A updates their age range after being proposed with User B.
**Behavior:** Proposal persists with original scoring. No retroactive re-scoring.
**Mitigation:** None needed — proposals are short-lived (5 days max).

### 6. User Has "prefer_not_to_say" for Multiple Categories
**Scenario:** User declines to share religion, politics, height.
**Behavior:** Each category scores 0.5. Total score is pulled toward ~50.
**Mitigation:** This is correct. The user is choosing to provide less signal.

### 7. Day 5 Auto-Send Quality Floor
**New behavior:**
- If proposal reaches day 5+ AND total votes ≥ 3 AND combined yes rate < 40%: **reject** (not auto-send)
- If proposal reaches day 5+ AND total votes < 3: **expire** (not reject — can retry)
- If proposal reaches day 5+ AND combined yes rate ≥ 40%: **auto-send** (current behavior)

---

## J. Implementation Plan

### Phase 1: Fix Critical Bugs (No Weight Changes)

1. **Fix family plans data mismatch** in `scoring.ts`
   - Update `FAMILY_PLANS_MATRIX` keys to match actual stored values
   - Keep legacy keys for backward compatibility

2. **Fix interests/values scoring formula** in `scoring.ts`
   - Replace overlap coefficient with modified Jaccard
   - Both `scoreInterests` and `scoreValues`

3. **Add exclusive allocation** in `generate-proposals/index.ts`
   - Track allocated users during proposal creation loop
   - Skip pairs where either user is already allocated

4. **Add Day 5 quality floor** in `proposal-lifecycle/index.ts` and `process-vote/index.ts`
   - Before auto-promoting on day 5+, check combined yes rate
   - Reject if < 40% yes rate with ≥ 3 votes
   - Expire if < 3 total votes

### Phase 2: Scoring Improvements

5. **Add substance ordinal gradients** in `scoring.ts`
   - Define ordinal scales per substance
   - Replace binary match with ordinal distance fallback

6. **Add ethnicity partial credit** in `scoring.ts`
   - Add ETHNICITY_PROXIMITY map
   - Check proximity when exact match fails

7. **Fix religion preference incentive** in `scoring.ts`
   - Change from replacement blend to additive bonus/penalty
   - Ensure setting preferences can help, not just hurt

8. **Fix politics not_political handling** in `scoring.ts`
   - Make not_political orthogonal to spectrum
   - Define explicit compatibility values

### Phase 3: Weight Rebalancing

9. **Update WEIGHTS constant** in `scoring.ts`
   - Apply new weight distribution
   - Re-enable education and career (3% each)

10. **Update missing data defaults** across all scoring functions
    - Apply principled framework from Section F

### Phase 4: Allocation Logic in On-Demand Generator

11. **Update `generate-proposal-for-user/index.ts`**
    - This function picks the single best candidate for a specific user
    - No allocation exclusivity needed (single user)
    - But scoring improvements should be inherited via shared `scoring.ts`

### Rollout Considerations

- All scoring changes affect future proposals only — existing proposals keep their stored scores
- The `category_scores` stored on proposals will reflect the new scoring
- The `compatibility_score` column on proposals is the display-only random 70-99 value (per CLAUDE.md — DO NOT CHANGE)
- No migration needed — just deploy updated edge functions

---

## K. Validation Plan

### 1. Score Behavior on Edge Cases

Test the following scenarios manually against the scoring engine:

| Scenario | Expected Behavior |
|----------|-------------------|
| Both users want_children | Family score = 1.0 (not 0.5) |
| User A: 1 interest, User B: 15 interests, 1 shared | Interest score ≈ 0.16 (not 1.0) |
| User A: 5 interests, User B: 8 interests, 4 shared | Interest score ≈ 0.72 |
| User A: "sometimes" drinks, User B prefers "no" | Lifestyle partial credit ≈ 0.5-0.7 (not 0.0) |
| User A: East Asian, User B prefers South Asian | Ethnicity partial credit ≈ 0.25 (not 0.0) |
| Both users not_political | Politics score = 1.0 |
| User A: not_political, User B: very_conservative | Politics score ≈ 0.35 |
| User A sets religion pref to "Christian", User B is Christian | Religion score > pure compatibility |
| User A sets religion pref to "Christian", User B is Muslim | Religion score < pure compatibility but > 0 |

### 2. Threshold Behavior

- Day 5 with 2 yes, 5 no → rejected (not auto-sent)
- Day 5 with 0 votes → expired (not rejected, can retry)
- Day 5 with 4 yes, 2 no → auto-sent (above 40% floor)

### 3. Exclusivity

- Run generate-proposals with 4 eligible users: A, B, C, D
- Best pair: A-B (score 80), second: A-C (score 75), third: C-D (score 70)
- Expected: A-B created, C-D created. NOT A-B and A-C.

### 4. Missing Data Behavior

- User with no interests + User with 10 interests → Interest score = 0.40 (not 0.25 or 1.0)
- User with no religion + User with religion → Religion score = 0.50

### 5. Scalability

- Simulate 1,000 eligible user profiles
- Measure scoring time < 30 seconds
- Verify allocation produces correct exclusivity

---

## L. RESOURCES.md Additions

```markdown
## Matchmaking & Compatibility Research

- [Similarity-Attraction Effect Meta-Analysis (Montoya & Horton, 2013)](https://psycnet.apa.org/record/2012-33628-001) — Most comprehensive meta-analysis of similarity-attraction. Attitude/value similarity has strongest effect (r=0.40-0.50). Directly validates weighting interests and values heavily.
- [Gale-Shapley Stable Matching (Wikipedia)](https://en.wikipedia.org/wiki/Gale%E2%80%93Shapley_algorithm) — Foundation of two-sided matching theory. Bridge uses greedy allocation (not full Gale-Shapley) because scoring is symmetric, not preference-ranked.
- [Jaccard Index vs Overlap Coefficient (Wikipedia)](https://en.wikipedia.org/wiki/Jaccard_index) — Set similarity metrics. Bridge switched from overlap coefficient to modified Jaccard for interests/values scoring to fix small-set inflation bias.
- [OKCupid Data Insights (Dataclysm, Christian Rudder)](https://www.goodreads.com/book/show/21480734-dataclysm) — Empirical findings from OKCupid's dataset: stated preferences predict attraction; behavioral similarity predicts longevity.
```

---

## Final Judgment

### 1. What is the single biggest flaw in the current algorithm?

**The family plans data mismatch.** The scoring matrix uses keys (`want_someday`, `dont_want`, `open`) that don't match the actual stored values (`want_children`, `dont_want_children`, `not_sure`). This means family plans scoring returns 0.5 for virtually every pair regardless of actual compatibility. A fundamental category of the algorithm is non-functional.

Close second: the interests/values overlap coefficient bias, which systematically inflates scores for users who selected few items.

### 2. What are the 5 highest-leverage changes to make first?

1. **Fix family plans data mismatch** — Currently broken, easy fix, immediate impact
2. **Fix interests/values scoring formula** — Overlap coefficient → modified Jaccard. Fixes systematic bias.
3. **Add exclusive allocation** — Prevents users from appearing in multiple proposals per cycle
4. **Add Day 5 quality floor** — Prevents bad proposals from auto-sending to users
5. **Rebalance weights** — Interests to 22%, values to 12%, age to 10%, height to 7%

### 3. Should the final architecture remain a weighted sum, a staged system, or some hybrid?

**Weighted sum with a staged pipeline around it.** The scoring itself remains a weighted sum (simple, explainable, debuggable). But the overall pipeline is staged: hard filter → scoring → quality gate → exclusive allocation. This gives the benefits of staging (clear separation of concerns, ability to add stages later) without the complexity of multi-tier scoring architectures.

### 4. Is O(n²) acceptable for Bridge's next stage, or should it be replaced now?

**O(n²) is acceptable now.** At 1,000 eligible users with gender/age filtering, the actual scoring work is ~150-200K pairs, completing in 5-15 seconds. Edge function timeout is 60 seconds. This has comfortable headroom. Replace at 3,000+ users or when adding expensive per-pair computations.

### 5. What is the cleanest way to balance stated preferences, shared interests, broader compatibility, scarcity, and allocation exclusivity?

**Use each signal type for what it does best:**
- **Stated preferences** → drive identity categories (religion, politics, ethnicity, height, age) via preference satisfaction scoring
- **Shared interests/values** → drive behavioral compatibility via modified Jaccard similarity
- **Broader compatibility** → captured by the weighted sum across all 12 categories
- **Scarcity** → enforced by the quality gate (MIN_COMPATIBILITY_SCORE) and by design: not every user gets a proposal every cycle
- **Allocation exclusivity** → enforced by greedy allocation after scoring: once you're paired, you're out of the pool

The elegance is that these are orthogonal mechanisms that compose cleanly. Scoring handles quality. Allocation handles exclusivity. The quality gate handles scarcity. No single mechanism is overloaded.
