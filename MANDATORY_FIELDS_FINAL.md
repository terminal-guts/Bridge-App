# Mandatory Fields vs Onboarding - FINAL CLARIFICATION

**Date:** 2026-01-04
**Status:** ✅ Calculations are CORRECT - No changes needed

---

## 🎯 Key Understanding

1. ✅ **Onboarding does NOT need to collect all mandatory fields**
2. ✅ **Users CAN enter the app with incomplete profiles**
3. ✅ **Users CANNOT enter matching pool until ALL mandatory fields are complete**
4. ✅ **Many onboarding pages are skippable**

---

## ✅ MANDATORY FIELDS (All Calculations are Correct)

### About Me: 19 Fields (CORRECT)
1. firstName
2. lastName
3. age
4. height
5. ethnicity
6. location
7. currentJob
8. pronounsList
9. gender
10. religion
11. politicalLeaning
12. hasChildren
13. familyPlans ✅ (NOW collected in onboarding - both questions on same page)
14. drinkingFrequency
15. cannabisFrequency
16. tobaccoFrequency
17. otherDrugsFrequency
18. interests (3+ required)
19. values (3+ required)

### Match Preferences: 8 Fields (CORRECT)
1. preferences.lookingFor
2. interestedInGenders
3. preferences.ageMin & ageMax
4. preferences.heightMin & heightMax
5. preferences.maxDistance
6. preferredEthnicities ⚠️ NOT in onboarding (must complete in-app)
7. preferredPolitics ⚠️ NOT in onboarding (must complete in-app)
8. partnerLifestylePreferences ⚠️ NOT in onboarding (must complete in-app)

### Photos: 6 Photos (CORRECT)
- Onboarding collects 1 photo
- Users must upload 5 more in-app to reach 100%

### Deep Questions: 3 Displayed (CORRECT)
- NOT collected in onboarding
- Must be completed in-app

---

## 📋 What Onboarding ACTUALLY Collects (21 Steps)

### Step 0: PhoneNumberStep
- phoneNumber

### Step 1: PhoneVerificationStep
- Verification code

### Step 2: NameStep
- firstName ✅
- lastName ✅

### Step 3: AgeStep
- age ✅
- preferences.ageMin ✅
- preferences.ageMax ✅

### Step 4: GenderStep
- gender ✅
- interestedInGenders ✅

### Step 5: PronounsStep
- pronounsList ✅

### Step 6: HeightStep
- height ✅
- preferences.heightMin ✅
- preferences.heightMax ✅

### Step 7: EthnicityStep
- ethnicity ✅
- ❌ Does NOT collect preferredEthnicities (mandatory but post-onboarding)

### Step 8: DatingDistanceStep
- preferences.maxDistance ✅

### Step 9: ChildrenStep
- hasChildren ✅
- familyPlans ✅ (BOTH collected on same page now)

### Step 10: WhereLiveNowStep
- location ✅

### Step 11: CurrentJobStep
- currentJob ✅

### Step 12: ReligionStep
- religion ✅

### Step 13: PoliticalBeliefsStep
- politicalLeaning ✅ (user's own politics)
- ❌ Does NOT collect preferredPolitics (mandatory but post-onboarding)

### Step 14: LifestyleStep
- drinkingFrequency ✅
- cannabisFrequency ✅
- tobaccoFrequency ✅
- otherDrugsFrequency ✅
- ❌ Does NOT collect partnerLifestylePreferences (mandatory but post-onboarding)

### Step 15: ValuesStep
- values ✅

### Step 16: InterestsStep
- interests ✅

### Step 17: PhotoUploadStep
- photos ✅ (1 photo only - need 6 total for matching pool)
- ⚠️ 5 more photos needed post-onboarding

### Step 18: PreferencesStep
- preferences.lookingFor ✅

### Step 19: AddFriendsStep
- Friend connections (not profile data)

### Step 20: WelcomeToBridgeStep
- Welcome screen (no data)

---

## ⚠️ MANDATORY FIELDS NOT IN ONBOARDING

These must be completed in-app before entering matching pool:

1. **preferredEthnicities** - Partner ethnicity preferences (Match Preferences)
2. **preferredPolitics** - Partner political preferences (Match Preferences)
3. **partnerLifestylePreferences** - Partner lifestyle preferences (Match Preferences)
   - drinking
   - cannabis
   - tobacco
   - otherDrugs
4. **displayedQuestions** - 3 starred deep questions (Deep Questions)
5. **Additional photos** - 5 more photos (Photos - need 6 total)

---

## 📊 Profile Completion After Onboarding

If user completes ALL onboarding steps without skipping:

### About Me: 100% (19/19)
✅ All fields collected in onboarding

### Match Preferences: 62.5% (5/8)
- ✅ lookingFor
- ✅ interestedInGenders
- ✅ ageMin/ageMax
- ✅ heightMin/heightMax
- ✅ maxDistance
- ❌ preferredEthnicities (must complete in-app)
- ❌ preferredPolitics (must complete in-app)
- ❌ partnerLifestylePreferences (must complete in-app)

**Match Prefs Score:** 5/8 = 62.5% → 15.625/25 points → ~16 points

### Photos: 16.7% (1/6)
- ✅ 1 photo uploaded
- ❌ Need 5 more

**Photos Score:** 1/6 = 16.7% → 4.17/25 points → ~4 points

### Deep Questions: 0% (0/3)
- ❌ Not collected in onboarding

**Questions Score:** 0 points

### Overall Profile Strength
```
Total: 19 + 16 + 4 + 0 = 39/94 points = ~41%
```

**Users who complete all onboarding will have ~41% profile strength**
**Users who skip steps will have less**

---

## ✅ CALCULATIONS ARE CORRECT

All profile strength calculations in `profileCompleteness.ts` are **100% correct**:

### calculateProfileStrengthBreakdown()
- ✅ Checks 19 About Me fields (correct)
- ✅ Checks 8 Match Preferences fields (correct - includes fields not in onboarding)
- ✅ Requires 6 photos for 100% (correct)
- ✅ Requires 3 displayed questions for 100% (correct)
- ✅ Scoring formula is correct: 94 points total (19+25+25+25)

### Banner Display Logic
- ✅ ProfileCompletionBanner shows when overall < 100% (correct)
- ✅ PhotoCompletionBanner shows when About Me = 100% AND photos < 6 (correct)
- ✅ All percentages are calculated consistently (correct)

---

## 🔄 Updated Files

### ✅ onboardingMapping.ts
**Updated to match actual onboarding flow:**
- ✅ EthnicityStep: Only collects ethnicity (NOT preferredEthnicities)
- ✅ ChildrenStep: Collects both hasChildren AND familyPlans
- ✅ LifestyleStep: Only collects user's habits (NOT partnerLifestylePreferences)
- ✅ Removed outdated steps: hometown, companyPosition, educationLevel, school
- ✅ Removed outdated steps: deepQuestions, nonNegotiables
- ✅ Added clear documentation about mandatory vs onboarding fields

---

## 🎯 FINAL ANSWER

**Q: Are the calculations using the right mandatory fields?**

**A: YES ✅**

All mandatory fields are correct:
- About Me: 19 fields ✅
- Match Preferences: 8 fields ✅
- Photos: 6 photos ✅
- Deep Questions: 3 displayed ✅

The calculations are working exactly as intended. Onboarding collects some (but not all) mandatory fields, and users complete the rest in-app before entering the matching pool.

---

**Document Updated:** 2026-01-04
**Status:** ✅ NO CHANGES NEEDED TO CALCULATIONS
**Action Taken:** Updated onboardingMapping.ts to prevent future confusion
