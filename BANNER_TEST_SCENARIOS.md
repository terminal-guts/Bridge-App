# Profile Strength Banner Testing Scenarios

## Overview
This document provides comprehensive testing scenarios to verify that all profile strength banners are working correctly and consistently after the fix.

## Files Modified
- ✅ `src/utils/profileCompleteness.ts` - Centralized calculation
- ✅ `src/components/ProfileStrengthDashboard.tsx` - Uses centralized function
- ✅ `src/components/ProfileCompletionBanner.tsx` - Overall strength banner
- ✅ `src/components/PhotoCompletionBanner.tsx` - Photos banner
- ✅ `src/screens/profile/ProfileEditScreen.tsx` - About Me progress bar
- ✅ `src/screens/profile/MatchPreferencesScreen.tsx` - Match prefs progress bar

---

## Test Scenarios

### Scenario 1: Empty Profile (New User)
**Expected Behavior:**
- ✅ **ProfileScreen**: ProfileCompletionBanner shows "0% Profile Strength"
- ✅ **ProfileEditScreen**: Header progress bar shows "0/19 completed (0%)"
- ✅ **ProfileEditScreen**: PhotoCompletionBanner does NOT show (About Me incomplete)
- ✅ **MatchPreferencesScreen**: Header progress bar shows "0/8 completed (0%)"
- ✅ **ProfileStrengthDashboard**: All 4 cards show 0%

**Verification:**
```
Overall: 0%
About Me: 0/19 = 0%
Match Preferences: 0/8 = 0%
Photos: 0/6 = 0%
Deep Questions: 0/3 = 0%
```

---

### Scenario 2: Partially Complete About Me (50%)
**Setup:** Fill in 10 out of 19 About Me fields

**Expected Behavior:**
- ✅ **ProfileScreen**: ProfileCompletionBanner shows "~11% Profile Strength"
  - (10 About Me points / 94 total = 11%)
- ✅ **ProfileEditScreen**: Header progress bar shows "10/19 completed (53%)"
- ✅ **ProfileEditScreen**: PhotoCompletionBanner does NOT show (About Me incomplete)
- ✅ **ProfileStrengthDashboard**: About Me card shows 53%

**Verification:**
```
Overall: ~11% (10/94)
About Me: 10/19 = 53%
Match Preferences: 0/8 = 0%
Photos: 0/6 = 0%
Deep Questions: 0/3 = 0%
```

**Key Check:** ProfileEditScreen header (53%) should NOT match overall banner (11%)
- This is CORRECT - EditScreen only shows About Me progress, not overall

---

### Scenario 3: Complete About Me, No Photos
**Setup:** Fill in all 19 About Me fields

**Expected Behavior:**
- ✅ **ProfileScreen**: ProfileCompletionBanner shows "20% Profile Strength"
  - (19 About Me points / 94 total = 20%)
- ✅ **ProfileEditScreen**: Header progress bar shows "19/19 completed (100%)" and HIDES
- ✅ **ProfileEditScreen**: PhotoCompletionBanner SHOWS "0/6 Photos (0%)"
  - This is the KEY test - banner should appear when About Me = 100% and Photos < 6
- ✅ **ProfileStrengthDashboard**: About Me card shows 100%, Photos card shows 0%

**Verification:**
```
Overall: 20% (19/94)
About Me: 19/19 = 100% ✓
Match Preferences: 0/8 = 0%
Photos: 0/6 = 0%
Deep Questions: 0/3 = 0%
```

**Critical Test:** PhotoCompletionBanner should appear ONLY in this scenario!

---

### Scenario 4: Complete About Me + 3 Photos
**Setup:** Fill in all 19 About Me fields + upload 3 photos

**Expected Behavior:**
- ✅ **ProfileScreen**: ProfileCompletionBanner shows "34% Profile Strength"
  - (19 + 12.5 points / 94 total = 34%)
- ✅ **ProfileEditScreen**: PhotoCompletionBanner shows "3/6 Photos (50%)"
- ✅ **ProfileStrengthDashboard**: About Me 100%, Photos 50%

**Verification:**
```
Overall: 34% (31.5/94)
About Me: 19/19 = 100%
Match Preferences: 0/8 = 0%
Photos: 3/6 = 50%
Deep Questions: 0/3 = 0%
```

**Key Check:** All percentages should match across all components!

---

### Scenario 5: Complete About Me + 6 Photos
**Setup:** Fill in all 19 About Me fields + upload 6 photos

**Expected Behavior:**
- ✅ **ProfileScreen**: ProfileCompletionBanner shows "47% Profile Strength"
  - (19 + 25 points / 94 total = 47%)
- ✅ **ProfileEditScreen**: PhotoCompletionBanner does NOT show (Photos complete)
- ✅ **ProfileStrengthDashboard**: About Me 100%, Photos 100%

**Verification:**
```
Overall: 47% (44/94)
About Me: 19/19 = 100%
Match Preferences: 0/8 = 0%
Photos: 6/6 = 100%
Deep Questions: 0/3 = 0%
```

**Critical Test:** PhotoCompletionBanner should DISAPPEAR when photos = 6!

---

### Scenario 6: Complete Match Preferences
**Setup:** Fill in all 8 mandatory match preference fields

**Expected Behavior:**
- ✅ **MatchPreferencesScreen**: Header progress bar shows "8/8 completed (100%)" and HIDES
- ✅ **ProfileScreen**: ProfileCompletionBanner updates to include match prefs score
- ✅ **ProfileStrengthDashboard**: Match Preferences card shows 100%

**Verification:**
```
Overall: 73% (69/94) if About Me + Photos also complete
About Me: 19/19 = 100%
Match Preferences: 8/8 = 100%
Photos: 6/6 = 100%
Deep Questions: 0/3 = 0%
```

---

### Scenario 7: Complete Profile (100%)
**Setup:** Complete all sections - About Me + Photos + Match Prefs + 3 Displayed Questions

**Expected Behavior:**
- ✅ **ProfileScreen**: ProfileCompletionBanner does NOT show (100% complete)
- ✅ **ProfileEditScreen**: No banners show
- ✅ **MatchPreferencesScreen**: No banner shows
- ✅ **ProfileStrengthDashboard**: All cards show 100%, overall "Excellent (100%)"

**Verification:**
```
Overall: 100% (94/94)
About Me: 19/19 = 100%
Match Preferences: 8/8 = 100%
Photos: 6/6 = 100%
Deep Questions: 3/3 = 100%
```

**Critical Test:** All banners should be hidden!

---

## Consistency Checks

### Check 1: Overall Percentage Calculation
The overall percentage should ALWAYS equal:
```
(aboutMeScore + matchPrefsScore + photosScore + questionsScore) / 94 * 100
```

Where:
- `aboutMeScore` = completed fields out of 19
- `matchPrefsScore` = (matchPrefsPercentage / 100) * 25
- `photosScore` = (photoCount / 6) * 25, capped at 25
- `questionsScore` = (displayedCount / 3) * 25, capped at 25

### Check 2: Banner Display Logic

**ProfileCompletionBanner:**
```javascript
// Shows when overall < 100%
if (overallPercentage >= 100) return null;
```

**PhotoCompletionBanner:**
```javascript
// Shows when About Me = 100% AND photos < 6
if (aboutMePercentage < 100 || photoCount >= 6) return null;
```

### Check 3: Cross-Component Consistency

For ANY profile state, these should ALWAYS match:
1. ProfileCompletionBanner percentage = ProfileStrengthDashboard overall percentage
2. PhotoCompletionBanner About Me % = ProfileStrengthDashboard About Me card %
3. PhotoCompletionBanner photos count = ProfileStrengthDashboard Photos card count
4. MatchPreferencesScreen header % = ProfileStrengthDashboard Match Prefs card %

---

## Manual Testing Checklist

- [ ] **Test 1**: Create new profile, verify all banners show 0%
- [ ] **Test 2**: Fill in About Me progressively, watch percentages update in real-time
- [ ] **Test 3**: Complete About Me to 100%, verify PhotoCompletionBanner appears
- [ ] **Test 4**: Upload photos one by one, verify PhotoCompletionBanner updates correctly
- [ ] **Test 5**: Upload 6th photo, verify PhotoCompletionBanner disappears
- [ ] **Test 6**: Fill in match preferences, verify MatchPreferencesScreen header updates
- [ ] **Test 7**: Complete all sections to 100%, verify all banners hide
- [ ] **Test 8**: Open ProfileScreen and verify ProfileStrengthDashboard shows correct percentages
- [ ] **Test 9**: Edit profile while watching console logs for consistency markers (✅)
- [ ] **Test 10**: Navigate between screens rapidly to check for race conditions

---

## Console Log Verification

When testing, look for these console logs:

```javascript
✅ ProfileCompletionBanner: Overall strength = X%
✅ PhotoCompletionBanner: { aboutMe: X%, photos: Y/6 (Z%) }
📊 Profile Strength Breakdown (MASTER): { ... }
🎯 DASHBOARD using centralized calculation: X%
```

All percentages in these logs should match for the same profile state!

---

## Known Good States

### Beginner Profile (20%)
```json
{
  "aboutMe": "100%",
  "photos": "0%",
  "matchPrefs": "0%",
  "questions": "0%",
  "overall": "20%"
}
```

### Intermediate Profile (47%)
```json
{
  "aboutMe": "100%",
  "photos": "100%",
  "matchPrefs": "0%",
  "questions": "0%",
  "overall": "47%"
}
```

### Advanced Profile (73%)
```json
{
  "aboutMe": "100%",
  "photos": "100%",
  "matchPrefs": "100%",
  "questions": "0%",
  "overall": "73%"
}
```

### Complete Profile (100%)
```json
{
  "aboutMe": "100%",
  "photos": "100%",
  "matchPrefs": "100%",
  "questions": "100%",
  "overall": "100%"
}
```

---

## Troubleshooting

### If percentages don't match:
1. Check console logs for calculation breakdown
2. Verify all components are using centralized functions
3. Clear app cache and restart
4. Check for stale state in AsyncStorage

### If banners glitch or flicker:
1. Verify useMemo dependencies are correct
2. Check that state updates are batched properly
3. Ensure no race conditions in profile loading

### If PhotoCompletionBanner shows/hides incorrectly:
1. Verify About Me is truly 100% (all 19 fields)
2. Check photo count is accurate
3. Confirm display logic: `aboutMePercentage < 100 || photoCount >= 6`

---

## Success Criteria

✅ All banners show consistent percentages for the same profile state
✅ PhotoCompletionBanner only shows when About Me = 100% and Photos < 6
✅ ProfileCompletionBanner hides when overall = 100%
✅ No glitching or flickering when navigating between screens
✅ Real-time updates reflect immediately across all components
✅ Console logs show consistent calculations with ✅ markers
