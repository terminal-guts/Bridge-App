# Profile Simplification — Onboarding Redesign

## Context

Simplify onboarding from ~21 steps to 18. Remove 3 fields entirely (pronouns, children, current job). Make some steps skippable. Deep questions and extra photos become optional in the profile area. Profile strength encourages filling more but onboarding completion + mandatory fields determine matching pool entry.

## Final Onboarding Flow — 18 Steps

| # | Step | Skippable? | Notes |
|---|------|-----------|-------|
| 1 | Email signup | No | |
| 2 | Email verify | No | |
| 3 | Matchmaker mode | No | Defaults to dater. Moved before tutorial. |
| 4 | Voting tutorial | No | Teaches core mechanic |
| 5 | Vote on 1 proposal | No | Hands-on practice |
| 6 | Name | No | Shown on cards |
| 7 | Age | No | Hard filter in matching |
| 8 | Gender + Interested in | No | One screen, needed for matching |
| 9 | Height + Preferred height | No | One screen, used in matching |
| 10 | Ethnicity (yours) | No | Used in matching |
| 11 | Preferred ethnicities | No | Separate screen |
| 12 | Religion | No | Required |
| 13 | Politics | No | Required |
| 14 | Lifestyle (4 substances) | No | Required |
| 15 | Commitment preferences | No | Required |
| 16 | Interests | No | Min 3 required, 22% match weight |
| 17 | Values | No | Min 3 required, 12% match weight |
| 18 | Photos | No | Min 1 required |

## Matching Pool Entry Logic

**No skip buttons. Every onboarding step is required.** When you finish onboarding, all fields are filled → `profile_completed = true` → you're in the matching pool.

**One-way gate.** `profile_completed` never goes back to false. If someone later edits their profile and removes a photo or clears a field, they stay in the pool. Proposal cards gracefully handle missing data (initials for no photo, etc.).

**Editing is free.** Users can change any field at any time. No field change kicks them from the pool. The profileService guard that currently checks strength ≥ 100 should be simplified to: if `profile_completed` is already true, never re-evaluate.

## Profile Strength (in profile area)

Separate from profile_completed. Encourages adding MORE to your profile:
- Mandatory fields: baseline
- Religion, politics, lifestyle, commitment: bonus
- Deep questions (3 displayed): bonus
- Extra photos: bonus
- Full profile = better matches (shown in UI)

Profile strength is cosmetic/motivational. Only `profile_completed` gates the matching pool.

## Fields Removed

| Field | Removed from | Kept in DB? |
|-------|-------------|-------------|
| Pronouns | Onboarding + Edit Profile | Yes (no DB changes) |
| Children | Onboarding + Edit Profile | Yes (no DB changes) |
| Current Job | Onboarding + Edit Profile | Yes (no DB changes) |
| Deep Questions | Onboarding only | Yes — optional in profile area |
| Add Friends | Onboarding only | Yes — accessible from Community tab |

## Implementation

### 1. Reorder onboarding steps

**File:** `src/screens/onboarding/OnboardingScreen.tsx`

Update the `PROFILE_STEPS` array to the new order. Remove PronounsStep, ChildrenStep, CurrentJobStep, DeepQuestionsStep, AddFriendsStep from the array.

### 2. Add "Skip" button to skippable steps

**Files:** Religion, Politics, Lifestyle, Commitment step components

Add a "Skip" link/button that calls `onNext()` without saving data. The field stays null/empty in the DB.

### 3. Rewrite profileCompleteness.ts

**File:** `src/utils/profileCompleteness.ts`

New mandatory fields list (everything that must be filled for profile_completed=true):
- firstName, lastName, age
- gender, interestedInGenders
- height, preferredHeight (min + max)
- ethnicity, preferredEthnicities
- interests (≥3), values (≥3)
- photos (≥1)

Skippable fields (bonus for profile strength, not required for completion):
- religion, politicalLeaning
- drinkingFrequency, cannabisFrequency, tobaccoFrequency, otherDrugsFrequency
- familyPlans / commitment preferences
- deepQuestions, extra photos

### 4. Remove pronouns/children/currentJob from edit screens

**Files:**
- `src/screens/profile/EditBasicsScreen.tsx` — remove pronouns field, children field, current job field
- `src/screens/profile/EditAboutScreen.tsx` — remove if present
- `src/screens/profile/sections/` — remove from section components

Don't delete the DB columns or the profile type fields — just stop showing them in the UI.

### 5. Move deep questions to profile area

Deep questions are already accessible from the profile. Just remove the onboarding step. The profile area's "Questions" tab handles adding/editing deep questions.

### 6. Update profile completion banner

The "Complete your profile" banner on the Match tab should list which mandatory fields are missing, not just show a percentage. E.g., "Add your religion and lifestyle to enter the matching pool."

Wait — religion and lifestyle are SKIPPABLE, not mandatory. The banner should only show truly mandatory missing fields. If someone skipped religion, the banner shouldn't mention it. It only shows if they somehow have a mandatory field missing (e.g., they skipped photos).

Actually, if all mandatory fields are filled during onboarding (they can't skip those), `profile_completed` should be true by the time they finish. The only way it stays false is if they're a reviewer account (guard) or if they somehow have corrupted data.

Correction: since mandatory steps CANNOT be skipped in onboarding, every user who completes onboarding has all mandatory fields filled → `profile_completed = true` automatically. The banner only appears for edge cases (data corruption, old accounts from before this change).

### 7. Handle existing users

Users who signed up before this change have the old field set. Their profile_completed was set based on the old rules. No migration needed — they're already in the pool. The new rules only affect new signups.

## No Database Changes

All changes are frontend only. DB columns for pronouns, children, current_job stay. We just stop showing them in the UI.

## Testing

1. New signup → go through all 18 steps → profile_completed = true → in matching pool
2. New signup → skip religion/politics/lifestyle/commitment → still profile_completed = true (these are skippable, not mandatory)
3. Edit profile → pronouns/children/currentJob fields are gone
4. Edit profile → deep questions section still works
5. Edit profile → can add more photos
6. Existing user → nothing changes, still in pool
7. Reviewer accounts → still work correctly

### 8. Move encouragement popup from AgeStep to NameStep

The "Keep going, you're almost there!" popup currently shows on the age screen. Move it to the name screen — that's the first profile-building step after the voting tutorial, so it's a better moment to encourage completion.

## Files Changed

| File | Change |
|------|--------|
| `src/screens/onboarding/OnboardingScreen.tsx` | Reorder steps, remove 5 steps |
| `src/utils/profileCompleteness.ts` | Rewrite with new mandatory/optional split |
| `src/screens/profile/EditBasicsScreen.tsx` | Remove pronouns, children, current job |
| `src/screens/profile/EditAboutScreen.tsx` | Remove if present |
| Religion/Politics/Lifestyle/Commitment steps | Add "Skip" button |
| `src/config/onboardingMapping.ts` | Update field mappings |
