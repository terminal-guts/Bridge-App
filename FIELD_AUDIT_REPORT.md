# Profile Strength Calculation - Field Audit Report

**Date:** 2026-01-04
**Purpose:** Verify that mandatory fields in calculations match what's collected during onboarding

---

## ⚠️ ISSUES FOUND

### 🔴 CRITICAL: Missing Field in Match Preferences

**Field:** `preferredPolitics` (Preferred Politics)
**Issue:** Counted as mandatory in Match Preferences (1 of 8) but NOT collected during onboarding
**Impact:** Users can never reach 100% Match Preferences completion through onboarding alone

**Evidence:**
- ✅ Present in `calculateMatchPreferencesCompleteness()` - Line 639
- ✅ Present in `MatchPreferencesScreen.tsx` - Can be edited post-onboarding
- ❌ NOT present in `onboardingMapping.ts` - Not collected during onboarding
- ❌ No onboarding step collects partner political preferences

**Recommendation:** Either:
1. Remove `preferredPolitics` from mandatory Match Preferences (reduce from 8 to 7 fields)
2. Add a step to onboarding to collect political preferences
3. Make it optional (don't count toward mandatory percentage)

---

### 🟡 WARNING: Fields Collected But Not Counted

These fields are collected during onboarding but NOT counted in profile strength:

1. **`hometown`** (Step 8 in onboarding)
   - Collected during onboarding
   - NOT counted in About Me (19 fields)
   - Could be added for more granular tracking

2. **`companyPosition`** (Step 11 in onboarding)
   - Collected during onboarding
   - NOT counted in About Me (19 fields)
   - Could be added if important

3. **`educationLevel`** (Step 12 in onboarding)
   - Collected during onboarding
   - NOT counted in About Me (19 fields)
   - Could be added for education tracking

4. **`school`** (Step 13 in onboarding)
   - Collected during onboarding
   - NOT counted in About Me (19 fields)
   - Could be added for education tracking

**Impact:** Low - These fields being ignored doesn't break anything, but users fill them out thinking they count toward profile completion.

**Recommendation:** Either:
1. Add these fields to About Me calculation (would increase from 19 to 23 fields)
2. Document that these are "bonus" fields that don't affect profile strength
3. Remove them from onboarding if they're not important

---

## ✅ ABOUT ME SECTION (19 Fields)

### Correctly Counted Fields:

| # | Field | Onboarding Step | In Calculation | Notes |
|---|-------|----------------|----------------|-------|
| 1 | `firstName` | Step 1 (name) | ✅ | Required |
| 2 | `lastName` | Step 1 (name) | ✅ | Required |
| 3 | `age` | Step 2 (age) | ✅ | Required |
| 4 | `height` | Step 5 (height) | ✅ | Required |
| 5 | `ethnicity` | Step 6 (ethnicity) | ✅ | Required |
| 6 | `location` | Step 9 (location) | ✅ | Required |
| 7 | `currentJob` | Step 10 (current_job) | ✅ | Required |
| 8 | `pronounsList` | Step 4 (pronouns) | ✅ | Required |
| 9 | `gender` | Step 3 (gender) | ✅ | Required |
| 10 | `religion` | Step 14 (religion) | ✅ | Required |
| 11 | `politicalLeaning` | Step 15 (political_beliefs) | ✅ | Required (if not 'prefer_not_to_say') |
| 12 | `hasChildren` | Step 8 (children) | ✅ | Required |
| 13 | `familyPlans` | Step 8 (children) | ✅ | Required |
| 14 | `drinkingFrequency` | Step 16 (lifestyle) | ✅ | Required |
| 15 | `cannabisFrequency` | Step 16 (lifestyle) | ✅ | Required |
| 16 | `tobaccoFrequency` | Step 16 (lifestyle) | ✅ | Required |
| 17 | `otherDrugsFrequency` | Step 16 (lifestyle) | ✅ | Required |
| 18 | `interests` (3+) | Step 18 (interests) | ✅ | Requires 3+ |
| 19 | `values` (3+) | Step 17 (values) | ✅ | Requires 3+ |

**Total: 19 fields** ✅

---

## ⚠️ MATCH PREFERENCES SECTION (8 Fields)

### Currently Counted Fields:

| # | Field | Onboarding Step | In Calculation | Issue |
|---|-------|----------------|----------------|-------|
| 1 | `lookingFor` | Step 22 (preferences) | ✅ | ✅ OK |
| 2 | `interestedInGenders` | Step 3 (gender) | ✅ | ✅ OK |
| 3 | `ageMin` & `ageMax` | Step 2 (age) | ✅ | ✅ OK |
| 4 | `heightMin` & `heightMax` | Step 5 (height) | ✅ | ✅ OK |
| 5 | `maxDistance` | Step 7 (dating_distance) | ✅ | ✅ OK |
| 6 | `preferredEthnicities` | Step 6 (ethnicity) | ✅ | ✅ OK |
| 7 | `preferredPolitics` | ❌ NOT IN ONBOARDING | ✅ | 🔴 **PROBLEM** |
| 8 | `partnerLifestylePreferences` | Step 16 (lifestyle) | ✅ | ✅ OK |

**Total: 8 fields (but 1 not collected!)** ⚠️

---

## 📊 PHOTOS SECTION (6 Photos)

| # | Field | Onboarding Step | In Calculation | Notes |
|---|-------|----------------|----------------|-------|
| 1-6 | `photos` | Step 19 (photos) | ✅ | Requires 6 photos for 100% |

**Total: 6 photos required** ✅

---

## ❓ DEEP QUESTIONS SECTION (3 Displayed)

| # | Field | Onboarding Step | In Calculation | Notes |
|---|-------|----------------|----------------|-------|
| 1-3 | `displayedQuestions` | Step 20 (deep_questions) | ✅ | Requires 3 starred questions |

**Total: 3 displayed questions required** ✅

---

## 🎯 OVERALL PROFILE STRENGTH

**Formula:**
```
Total Score = aboutMeScore (19 max) + matchPrefsScore (25 max) + photosScore (25 max) + questionsScore (25 max)
Overall % = (Total Score / 94) * 100
```

**Maximum Possible Points: 94**
- About Me: 19 points (1 per field)
- Match Preferences: 25 points (calculated from 8 fields = 8/8 * 25)
- Photos: 25 points (6 photos = 6/6 * 25)
- Deep Questions: 25 points (3 displayed = 3/3 * 25)

---

## 🔍 DETAILED ANALYSIS

### Issue #1: `preferredPolitics` Not Collected

**Current State:**
- Match Preferences checks for 8 mandatory fields
- One of these fields (`preferredPolitics`) is never collected during onboarding
- Users must manually add it in MatchPreferencesScreen after onboarding

**Impact:**
- Users completing onboarding will have 7/8 Match Preferences = 87.5%
- Maximum possible Match Preferences through onboarding = 87.5% (not 100%)
- Maximum overall profile through onboarding = ~96% (not 100%)

**Math:**
```
With preferredPolitics (current):
  7/8 fields complete = 87.5%
  Match Prefs Score = 0.875 * 25 = 21.875 ≈ 22 points
  Max through onboarding = 19 + 22 + 25 + 25 = 91/94 = 96.8%

Without preferredPolitics (if removed):
  7/7 fields complete = 100%
  Match Prefs Score = 1.0 * 25 = 25 points
  Max through onboarding = 19 + 25 + 25 + 25 = 94/94 = 100%
```

---

### Issue #2: Uncounted Onboarding Fields

**Fields collected but not counted:**
- `hometown`
- `companyPosition`
- `educationLevel`
- `school`

**Impact:**
- Users fill out these fields thinking they contribute to profile completion
- Fields are saved to database but ignored in calculations
- Potential user confusion: "Why doesn't my profile strength increase?"

**Possible Solutions:**

**Option A: Add to About Me calculation** (increases to 23 fields)
```javascript
// Add to About Me calculation
if (profile.hometown) aboutScore += 1;        // 20th field
if (profile.companyPosition) aboutScore += 1; // 21st field
if (profile.educationLevel) aboutScore += 1;  // 22nd field
if (profile.school) aboutScore += 1;          // 23rd field

const aboutMePercentage = Math.round((aboutScore / 23) * 100);
```

**Option B: Remove from onboarding** (reduce onboarding steps)
- If these fields aren't important enough to count, why collect them?

**Option C: Make them "bonus" fields**
- Document that they're optional enrichment fields
- Maybe show a different indicator (e.g., "Profile Enrichment: 4/4")

---

## 🎬 RECOMMENDATIONS

### Priority 1: Fix `preferredPolitics` Issue 🔴

**Recommended Solution:** Remove from mandatory Match Preferences

**Rationale:**
- Political preferences are sensitive
- Not collected during onboarding (likely intentional)
- Users can add it later if they want
- Would simplify Match Preferences to 7 fields

**Code Changes:**
```javascript
// In calculateMatchPreferencesCompleteness()
// REMOVE THIS:
if (profile.preferredPolitics && profile.preferredPolitics.length > 0) {
  completedCount++;
} else {
  missingFields.push('Politics');
}

// Change totalCount from 8 to 7:
const percentage = Math.round((completedCount / 7) * 100);

return {
  percentage,
  completedCount,
  totalCount: 7, // Changed from 8
  missingFields,
};
```

**Impact:**
- Users can now reach 100% Match Preferences through onboarding
- Users can still set political preferences if they want (just not mandatory)
- More realistic completion percentages

---

### Priority 2: Decide on Uncounted Fields 🟡

**Recommended Solution:** Document as optional

**Rationale:**
- These fields add richness but aren't core to matching
- Removing from onboarding would make it too short
- Adding to calculation would dilute other field importance

**Implementation:**
- Add tooltip: "These fields enrich your profile but don't affect matching score"
- Maybe show separate "Profile Details: 4/4" indicator
- Keep collecting them, just don't count toward strength percentage

---

### Priority 3: Update Total Points 🟢

If Priority 1 is implemented, update the total points calculation:

**Current:**
```javascript
const maxTotal = 94; // 19 + 25 + 25 + 25
```

**After removing preferredPolitics:**
```javascript
// Match Prefs score calculation would automatically adjust
// because it uses: Math.round((percentage / 100) * 25)
// No change needed to maxTotal (still 94)
```

**No change needed** - the scoring automatically adjusts based on the percentage!

---

## ✅ WHAT'S CORRECT

Despite these issues, many things are working well:

1. ✅ All 19 About Me fields are collected and counted correctly
2. ✅ Photos calculation is correct (6 photos for 100%)
3. ✅ Deep Questions calculation is correct (3 displayed for 100%)
4. ✅ 7 out of 8 Match Preferences fields are collected and counted correctly
5. ✅ Overall formula is mathematically sound
6. ✅ All calculations are now centralized (no inconsistencies)

---

## 📝 SUMMARY

| Section | Fields Counted | Fields Collected | Status |
|---------|---------------|------------------|--------|
| About Me | 19 | 23 (4 extra) | ✅ Mostly OK |
| Match Preferences | 8 | 7 (1 missing) | ⚠️ **Issue** |
| Photos | 6 | 6 | ✅ Correct |
| Deep Questions | 3 | 3 | ✅ Correct |

**Main Issue:** `preferredPolitics` is counted as mandatory but never collected during onboarding.

**Recommendation:** Remove `preferredPolitics` from mandatory Match Preferences, reducing from 8 to 7 fields.

---

**Audit Completed:** 2026-01-04
**Audited By:** Claude Sonnet 4.5
**Status:** ⚠️ **1 Critical Issue Found**
