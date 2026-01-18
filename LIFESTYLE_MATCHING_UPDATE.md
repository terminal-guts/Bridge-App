# Lifestyle Matching Logic Update

## Summary

Updated the lifestyle matching logic to support array-based partner preferences, matching the actual implementation in the Match Preferences screen.

## Changes Made

### 1. Updated Matching Logic (`src/utils/proposalMatching.ts`)

**Function**: `matchLifestyleAttribute()`

#### Before:
```typescript
aPreference: string | undefined
bPreference: string | undefined
```
- Accepted single string values
- Used `dont_care` (no apostrophe)
- Direct equality check: `bRoutine === aPreference`

#### After:
```typescript
aPreferences: string | string[] | undefined
bPreferences: string | string[] | undefined
```
- Accepts both string and array formats (backward compatible)
- Uses `"don't care"` (with apostrophe)
- Array inclusion check: `aPreferenceArray.includes(bRoutine)`
- Supports multiple selections: `["yes", "sometimes"]`

### 2. Updated TypeScript Types (`src/types/index.ts`)

**Interface**: `UserProfile.partnerLifestylePreferences`

#### Before:
```typescript
partnerLifestylePreferences?: {
  drinking: string;
  cannabis: string;
  tobacco: string;
  otherDrugs: string;
};
```

#### After:
```typescript
partnerLifestylePreferences?: {
  drinking: string | string[];
  cannabis: string | string[];
  tobacco: string | string[];
  otherDrugs: string | string[];
};
```

### 3. Updated Documentation

Updated `PROPOSAL_REVIEW_UI_REDESIGN.md` with:
- Array-based preference format
- Corrected "don't care" spelling
- New matching algorithm steps
- Updated examples showing array usage
- Multiple selection examples

## How It Works

### Personal Routine (Single Value)
- User answers: `"yes"`, `"sometimes"`, `"no"`, or `"prefer_not_to_say"`
- Stored in: `drinkingFrequency`, `cannabisFrequency`, `tobaccoFrequency`

### Partner Preferences (Array)
- User selects: One or more from `["yes", "sometimes", "no", "don't care"]`
- Can select multiple: `["yes", "sometimes"]` means "I'm okay with either"
- Stored in: `partnerLifestylePreferences.{drinking|cannabis|tobacco}`
- Format: `string[]`

### Matching Logic

```typescript
// Step 1: Normalize to arrays
const aPreferenceArray = Array.isArray(aPreferences)
  ? aPreferences
  : [aPreferences];

// Step 2: Check "don't care"
const aDontCare = aPreferenceArray.includes("don't care");

// Step 3: Match routine with preferences
const aHappy = aDontCare || aPreferenceArray.includes(bRoutine);
```

### Examples

**Example 1: Single preference**
```typescript
Person A: routine "yes", preferences ["no"]
Person B: routine "no", preferences ["yes"]
Result: Both happy ✓ (A wants "no", B is "no" ✓; B wants "yes", A is "yes" ✓)
```

**Example 2: Multiple preferences**
```typescript
Person A: routine "yes", preferences ["yes", "sometimes"]
Person B: routine "sometimes", preferences ["sometimes", "no"]
Result: Only A happy (A accepts "sometimes" ✓; B doesn't accept "yes" ✗)
```

**Example 3: Don't care**
```typescript
Person A: routine "yes", preferences ["don't care"]
Person B: routine "no", preferences ["yes"]
Result: Only A happy (A doesn't care ✓; B wants "yes" but A is "yes" ✓)
Wait, that's wrong. Let me recalculate:
Person A: routine "yes", preferences ["don't care"]
Person B: routine "no", preferences ["yes"]
Result: Only A happy (A doesn't care ✓; B wants "yes", A is "yes" ✓)
Actually both should be happy! Fixed logic:
Result: Both happy ✓
```

**Example 4: Prefer not to say**
```typescript
Person A: routine "prefer_not_to_say", preferences ["yes"]
Person B: routine "yes", preferences ["yes"]
Result: Grey ⊝ (cannot evaluate - A's routine is hidden)
```

## Backward Compatibility

The matching logic supports both:
- **Old format**: `"yes"` (string) → converted to `["yes"]`
- **New format**: `["yes", "sometimes"]` (array)

This ensures:
- Legacy data continues to work
- New multi-selection data works correctly
- Gradual migration without breaking existing proposals

## Testing Checklist

- [x] TypeScript compilation passes
- [x] Array-based preferences supported
- [x] Single-string preferences supported (legacy)
- [x] "don't care" spelling corrected
- [x] Multiple selection logic works
- [x] "prefer not to say" triggers grey state
- [x] Documentation updated with examples

## Next Steps

1. **Test with real data**: Verify matching logic with actual user profiles
2. **UI testing**: Ensure ComparisonRow displays lifestyle matches correctly
3. **Edge cases**: Test with missing data, empty arrays, null values
4. **Migration**: Consider migrating legacy string data to arrays (optional)

## Files Modified

1. `src/utils/proposalMatching.ts` - Core matching logic
2. `src/types/index.ts` - TypeScript type definitions
3. `PROPOSAL_REVIEW_UI_REDESIGN.md` - Design specification
4. `LIFESTYLE_MATCHING_UPDATE.md` - This document

## Related Issues

- Partner preferences NOT collected in onboarding (only in Match Preferences screen)
- Coordinates for distance calculation not yet implemented (placeholder used)
- Mock data uses old string format - may need updating for testing
