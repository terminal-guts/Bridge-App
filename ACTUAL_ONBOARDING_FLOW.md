# Actual Onboarding Flow Analysis

Based on `OnboardingScreen.tsx` (lines 75-99)

---

## 📋 Steps in Current Onboarding (21 total)

### Step 0: PhoneNumberStep
- Collects: `phoneNumber`

### Step 1: PhoneVerificationStep
- Collects: Verification code (validates phone)

### Step 2: NameStep
- Collects: `firstName`, `lastName`

### Step 3: AgeStep
- Collects: `age` (user's age)
- Collects: `preferences.ageMin`, `preferences.ageMax` (partner age range)
- Comment: "Will be converted to birthday picker"

### Step 4: GenderStep
- Collects: `gender` (user's gender - array)
- Collects: `interestedInGenders` (partner gender preference - array)

### Step 5: PronounsStep
- Collects: `pronounsList` (array)

### Step 6: HeightStep
- Collects: `height` (user's height)
- Collects: `preferences.heightMin`, `preferences.heightMax` (partner height range)

### Step 7: EthnicityStep
- Collects: `ethnicity` (user's ethnicity)
- Collects: `preferredEthnicities` (partner ethnicity preferences - array)

### Step 8: DatingDistanceStep
- Collects: `preferences.maxDistance` (dating distance)

### Step 9: ChildrenStep
- Collects: `hasChildren` (yes/no)
- Comment: "Future plans removed, skip button added"
- ⚠️ Does NOT collect `familyPlans` anymore!

### Step 10: WhereLiveNowStep
- Collects: `location` (current location)

### Step 11: CurrentJobStep
- Collects: `currentJob` (occupation)

### Step 12: ReligionStep
- Collects: `religion`

### Step 13: PoliticalBeliefsStep
- Collects: `politicalLeaning` (user's political beliefs)

### Step 14: LifestyleStep
- Collects: `drinkingFrequency`
- Collects: `cannabisFrequency`
- Collects: `tobaccoFrequency`
- Collects: `otherDrugsFrequency`
- Collects: `partnerLifestylePreferences` (partner preferences for all 4)

### Step 15: ValuesStep
- Collects: `values` (array)

### Step 16: InterestsStep
- Collects: `interests` (array)

### Step 17: PhotoUploadStep
- Collects: `photos`
- Comment: "Changed to 1 photo"
- ⚠️ Only collects 1 photo, not 6!

### Step 18: PreferencesStep (Commitment Level)
- Collects: `preferences.lookingFor` (relationship type)

### Step 19: AddFriendsStep
- Collects: Friend connections (not profile data)

### Step 20: WelcomeToBridgeStep
- Final welcome screen (no data collected)

---

## ❌ REMOVED FROM ONBOARDING

### Comment on line 88:
"REMOVED FROM ONBOARDING (still in profile edit): WhereFromStep, CompanyPositionStep, EducationLevelStep, SchoolStep"

- `hometown` - NOT collected
- `companyPosition` - NOT collected
- `educationLevel` - NOT collected
- `school` - NOT collected

### Comment on line 95:
"REMOVED FROM ONBOARDING (still in profile edit): DeepQuestionsStep, NonNegotiablesStep"

- `deepQuestions` - NOT collected
- `nonNegotiables` - NOT collected
- `displayedQuestions` - NOT collected

---

## 🔍 What Onboarding ACTUALLY Collects

### About Me Fields (18 of 19):
1. ✅ `firstName` - Step 2
2. ✅ `lastName` - Step 2
3. ✅ `age` - Step 3
4. ✅ `height` - Step 6
5. ✅ `ethnicity` - Step 7
6. ✅ `location` - Step 10
7. ✅ `currentJob` - Step 11
8. ✅ `pronounsList` - Step 5
9. ✅ `gender` - Step 4
10. ✅ `religion` - Step 12
11. ✅ `politicalLeaning` - Step 13
12. ✅ `hasChildren` - Step 9
13. ❌ `familyPlans` - NOT COLLECTED (removed per comment)
14. ✅ `drinkingFrequency` - Step 14
15. ✅ `cannabisFrequency` - Step 14
16. ✅ `tobaccoFrequency` - Step 14
17. ✅ `otherDrugsFrequency` - Step 14
18. ✅ `interests` - Step 16
19. ✅ `values` - Step 15

**Missing: `familyPlans` (1 field)**

### Match Preferences (7 of 8):
1. ✅ `preferences.lookingFor` - Step 18
2. ✅ `interestedInGenders` - Step 4
3. ✅ `preferences.ageMin/ageMax` - Step 3
4. ✅ `preferences.heightMin/heightMax` - Step 6
5. ✅ `preferences.maxDistance` - Step 8
6. ✅ `preferredEthnicities` - Step 7
7. ❌ `preferredPolitics` - NOT COLLECTED
8. ✅ `partnerLifestylePreferences` - Step 14

**Missing: `preferredPolitics` (1 field)**

### Photos:
- ⚠️ Only 1 photo collected (not 6)
- Comment: "Changed to 1 photo"

### Deep Questions:
- ❌ NOT collected in onboarding
- Comment: "REMOVED FROM ONBOARDING"

---

## 🎯 Summary

**About Me:** 18 of 19 fields collected (missing `familyPlans`)
**Match Preferences:** 7 of 8 fields collected (missing `preferredPolitics`)
**Photos:** 1 of 6 collected
**Deep Questions:** 0 of 3 collected

---

## 🤔 Questions for User

1. **`familyPlans`** - Comment says "Future plans removed" from ChildrenStep. Should this still be counted as mandatory?

2. **`preferredPolitics`** - Never collected. Should this be mandatory?

3. **Photos** - Comment says "Changed to 1 photo". Should profile strength require 6 photos or just 1?

4. **Deep Questions** - Removed from onboarding. Are these still mandatory for profile strength?

5. **Fields removed but in mapping** - The onboardingMapping.ts file still references removed fields. Is this file outdated?
