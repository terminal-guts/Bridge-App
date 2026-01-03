# Remaining Type Safety Issues

**Status**: 31 of 37 'as any' type assertions remaining
**Completed**: 6/37 (16%) - Fixed in `src/screens/profile/ProfileScreen.tsx`

## Progress Summary

### ✅ Completed (6 instances)
- **src/screens/profile/ProfileScreen.tsx** - All 6 instances fixed
  - Fixed Ionicons typing in `InfoPill`, `Section`, `Tag`, and `LifestyleRow` components
  - Fixed route params typing with proper type assertions

---

## 🔴 High Priority - Ionicons Typing (11 instances)

These are straightforward fixes where `icon: string` should be `icon: keyof typeof Ionicons.glyphMap`.

### src/screens/match/MatchProposalScreen.tsx (4 instances)
```typescript
// Line 418
<Ionicons name={icon as any} size={14} color={style.iconColor} />
// Fix: Change component prop from `icon: string` to `icon: keyof typeof Ionicons.glyphMap`

// Line 442
<Ionicons name={icon as any} size={15} color={COLORS.primary500} />
// Fix: Change component prop type

// Line 476
<Ionicons name={icon as any} size={17} color={COLORS.neutral500} />
// Fix: Change component prop type

// Line 554
<Ionicons name={option.icon as any} size={16} color={...} />
// Fix: Update option.icon type in feedback options
```

### src/components/YoureAllSetView.tsx (3 instances)
```typescript
// Line 210
<Ionicons name={icon as any} size={20} color={color} />
// Fix: Change prop type in StatCard component

// Line 243
<Ionicons name={icon as any} size={14} color={iconColor} />
// Fix: Change prop type in SectionHeader component

// Line 316
<Ionicons name={config.icon as any} size={36} color={config.iconColor} />
// Fix: Update config type for icon property
```

### src/components/ProfileCompletenessCard.tsx (1 instance)
```typescript
// Line 74
<Ionicons name={icon as any} size={24} color={color} />
// Fix: Change prop type in component definition
```

### src/screens/profile/SettingsScreen.tsx (1 instance)
```typescript
// Line 287
<Ionicons name={icon as any} size={20} color="#667085" />
// Fix: Change MenuItem component prop type
```

### src/screens/profile/ProfileEditScreen.tsx (2 instances)
```typescript
// Lines 481-482
const currentArray = current[field] as any[] | undefined;
const originalArray = original[field] as any[] | undefined;
// Fix: Use proper generic type or union type for array comparison
```

---

## 🟡 Medium Priority - Service Layer (7 instances)

### src/services/friendService.ts (4 instances)
Mock data construction with type mismatches:
```typescript
// Line 281
school: (profile as any).education || '',
// Fix: Add 'education' property to mock profile type or use optional chaining

// Line 290
lifestyle: profile.lifestyle || {} as any,
// Fix: Define proper empty lifestyle object type

// Line 292
preferences: profile.preferences || {} as any,
// Fix: Define proper empty preferences object type

// Line 297
currentJob: (profile as any).occupation || '',
// Fix: Add 'occupation' property to mock profile type or use optional chaining
```

### src/services/profileService.ts (2 instances)
```typescript
// Line 481
(mockUserProfile as any)[field] = true;
// Fix: Use proper type for dynamic field assignment or Record type

// Line 512
return (mockUserProfile as any)[field] === true;
// Fix: Use proper type for dynamic field access
```

### src/services/blockService.ts (1 instance)
```typescript
// Line 207
} as any : undefined,
// Fix: Define proper partial profile type for blocked users
```

---

## 🟠 Medium Priority - Onboarding (3 instances)

### src/screens/onboarding/OnboardingScreen.tsx (2 instances)
```typescript
// Line 71
} as any, // Cast to any to avoid TS errors for missing required fields
// Fix: Create proper partial/initial type for onboarding data

// Line 245
(navigation as any).navigate('MainTabs');
// Fix: Use proper navigation type from stack params
```

### src/screens/onboarding/steps/PoliticalBeliefsStep.tsx (1 instance)
```typescript
// Line 45
politicalLeaning: selectedPolitics as any,
// Fix: Ensure selectedPolitics matches PoliticalLeaning type exactly
```

### src/screens/onboarding/steps/PreferencesStep.tsx (1 instance)
```typescript
// Line 40
lookingFor: commitmentLevel as any,
// Fix: Ensure commitmentLevel matches expected type
```

---

## 🟢 Low Priority - Utility Functions (10 instances)

### src/validation/schemas.ts (1 instance)
```typescript
// Line 412
sanitized[key] = sanitizeString(sanitized[key]) as any;
// Fix: Properly type the return value of sanitizeString or use type guard
```

### src/services/photoService.ts (1 instance)
```typescript
// Line 158
encoding: 'base64' as any, // Use string literal instead of enum
// Fix: Import proper FileSystem encoding type from expo-file-system
```

### src/config/featureFlags.ts (2 instances)
```typescript
// Line 46
(FEATURE_FLAGS as any)[flag] = true;
// Fix: Make FEATURE_FLAGS mutable or use Record<FeatureFlag, boolean>

// Line 59
(FEATURE_FLAGS as any)[flag] = false;
// Fix: Same as above
```

### src/hooks/useGuide.ts (1 instance)
```typescript
// Line 86
return completedGuides.has(guideId as any);
// Fix: Ensure guideId type matches Set element type
```

### src/components/MatchRevealView.tsx (1 instance)
```typescript
// Line 169
const currentX = (heart.x as any).__getValue?.() ?? SCREEN_WIDTH * 0.5;
// Fix: Properly type Animated.Value to access __getValue method
```

### src/components/icons/EvaIcon.tsx (1 instance)
```typescript
// Line 109
return (registry as any)[fileName] || null;
// Fix: Use Record<string, string> or proper index signature
```

### src/components/community/DailyGridView.tsx (1 instance)
```typescript
// Line 67
const isComplete = taskProgress?.hasCompletedRandomMatch ?? (taskProgress as any)?.completedGrid ?? false;
// Fix: Update TaskProgress type to include both field variations or normalize field name
```

### src/screens/main/DeepQuestionsScreen.tsx (1 instance)
```typescript
// Line 239 (false positive - this is actually a comment line)
// No actual 'as any' here, just a comment
```

---

## Recommended Fix Order

1. **Start with Ionicons typing issues** (11 instances) - Simple, consistent pattern
2. **Fix onboarding type issues** (3 instances) - Important for user flow
3. **Address service layer issues** (7 instances) - Critical for data integrity
4. **Clean up utility functions** (10 instances) - Lower priority, less impact

## Implementation Notes

### For Ionicons Fixes
```typescript
// Before
const Component: React.FC<{ icon: string }> = ({ icon }) => (
  <Ionicons name={icon as any} />
);

// After
const Component: React.FC<{ icon: keyof typeof Ionicons.glyphMap }> = ({ icon }) => (
  <Ionicons name={icon} />
);
```

### For Dynamic Field Access
```typescript
// Before
(obj as any)[field] = value;

// After - Option 1: Use Record type
const obj: Record<string, unknown> = {};

// After - Option 2: Use type assertion with known fields
type KnownFields = 'field1' | 'field2';
(obj as Record<KnownFields, unknown>)[field] = value;
```

### For Empty Object Defaults
```typescript
// Before
const lifestyle = profile.lifestyle || {} as any;

// After
type Lifestyle = { /* define props */ };
const emptyLifestyle: Lifestyle = { /* default values */ };
const lifestyle = profile.lifestyle || emptyLifestyle;
```

---

## Testing Checklist

After each fix, verify:
- [ ] TypeScript compilation succeeds
- [ ] No new type errors introduced
- [ ] Component renders correctly
- [ ] Runtime behavior unchanged
- [ ] All props properly typed
