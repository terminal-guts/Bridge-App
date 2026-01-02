# Community Matching System Components

**Status:** Phase 1 Complete - Integration & Polish ✅
**Last Updated:** December 2025

This directory contains all UI components for Bridge's Community Matching System v2, featuring the triangle grid layout, proposal voting, and friends area.

---

## Core Components

### TriangleGrid

Triangle layout with 1 anchor at top and 3 candidates positioned below.

**Features:**
- Staggered entrance animations
- Haptic feedback on selection
- Single-select interaction (tap to select/deselect)
- Responsive layout
- Smooth spring animations

**Props:**
```typescript
interface TriangleGridProps {
  anchor: UserProfile;
  candidates: UserProfile[];
  selectedCandidateId: string | null;
  onCandidateSelect: (candidateId: string) => void;
  disabled?: boolean;
  karma?: KarmaScore;
  isRandomMatcher?: boolean;
}
```

**Example Usage:**
```tsx
<TriangleGrid
  anchor={grid.anchor}
  candidates={grid.candidates}
  selectedCandidateId={selectedId}
  onCandidateSelect={(id) => setSelectedId(id)}
  isRandomMatcher
/>
```

**Visual Layout:**
```
        [Anchor]
       /    |    \
   [C1]   [C2]   [C3]
```

**File:** `TriangleGrid.tsx:1`

---

### CandidateCard

Compact candidate display for triangle grid.

**Features:**
- Circular photo (80px)
- First initial + age (e.g., "S, 27")
- Location and 2-3 key attributes
- Selected state with blue border + checkmark
- Press animations (scale 0.95 on press)
- Smooth shadow transitions

**Props:**
```typescript
interface CandidateCardProps {
  candidate: UserProfile;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}
```

**Example Usage:**
```tsx
<CandidateCard
  candidate={candidate}
  isSelected={selectedId === candidate.id}
  onPress={() => handleSelect(candidate.id)}
/>
```

**Design Specs:**
- Size: 100px wide
- Photo: 80px circular
- Border: 1px neutral-300 (unselected), 2px blue-500 (selected)
- Shadow: elevation 2

**File:** `CandidateCard.tsx:1`

---

### AnchorCard

Displays the friend you're matching for.

**Features:**
- Larger card (120px wide)
- Circular photo (100px)
- Full name, age, location
- Optional karma badge (top-right corner)
- Context text for random matcher

**Props:**
```typescript
interface AnchorCardProps {
  anchor: UserProfile;
  karma?: KarmaScore;
  isRandomMatcher?: boolean;
}
```

**Example Usage:**
```tsx
<AnchorCard
  anchor={grid.anchor}
  karma={karmaScore}
  isRandomMatcher
/>
```

**Design Specs:**
- Size: 120px wide
- Photo: 100px circular
- Shadow: elevation 3 (more prominent than candidates)
- Context text: "Find a match for [Name]"

**File:** `AnchorCard.tsx:1`

---

### KarmaBadge

Displays karma tier with icon and optional label.

**Features:**
- Four tiers: New 🌱, Solid ⭐, Trusted 💎, Elite 👑
- Compact and full modes
- Interactive tooltip with progress bar
- Shows assists count and next tier progress

**Props:**
```typescript
interface KarmaBadgeProps {
  tier: KarmaTier;
  assists?: number;
  compact?: boolean;
}
```

**Example Usage:**
```tsx
{/* Compact mode (icon only) */}
<KarmaBadge tier="solid" assists={8} compact />

{/* Full mode (icon + label) */}
<KarmaBadge tier="trusted" assists={12} />
```

**Karma Tiers:**
| Tier | Icon | Min Assists | Color |
|------|------|-------------|-------|
| New | 🌱 | 0 | Gray |
| Solid | ⭐ | 3 | Green |
| Trusted | 💎 | 10 | Purple |
| Elite | 👑 | 25 | Gold |

**File:** `KarmaBadge.tsx:1`

---

## Loading States

### SkeletonLoader

Reusable animated skeleton for loading states.

**Components:**
- `SkeletonLoader` - Base loader component
- `CandidateCardSkeleton` - Loading placeholder for CandidateCard
- `AnchorCardSkeleton` - Loading placeholder for AnchorCard
- `TriangleGridSkeleton` - Full triangle grid skeleton

**Features:**
- Pulsing animation (opacity 0.3 → 0.6)
- Matches component dimensions exactly
- Configurable width, height, border radius

**Example Usage:**
```tsx
{loading ? (
  <TriangleGridSkeleton />
) : (
  <TriangleGrid {...props} />
)}
```

**File:** `SkeletonLoader.tsx:1`

---

## Error & Empty States

### EmptyState

Friendly empty and error states with clear messaging.

**Types:**
- `no_grid` - No grid assignment today
- `network_error` - Connection lost
- `no_candidates` - No candidates available
- `loading_error` - General error

**Props:**
```typescript
interface EmptyStateProps {
  type: 'no_grid' | 'network_error' | 'no_candidates' | 'loading_error';
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onRetry?: () => void;
}
```

**Example Usage:**
```tsx
{error && (
  <EmptyState
    type="network_error"
    onRetry={handleRetry}
  />
)}
```

**File:** `EmptyState.tsx:1`

---

## Success Animations

### SuccessAnimation

Celebratory animation when proposal is submitted.

**Features:**
- Checkmark with scale + rotation animation
- Success haptic feedback
- Auto-dismisses after duration
- Fade in/out transitions

**Props:**
```typescript
interface SuccessAnimationProps {
  message?: string;
  onComplete?: () => void;
  duration?: number;
}
```

**Example Usage:**
```tsx
{showSuccess && (
  <SuccessAnimation
    message="Proposal Submitted!"
    duration={2000}
    onComplete={() => setShowSuccess(false)}
  />
)}
```

**File:** `SuccessAnimation.tsx:1`

---

## View Components

### DailyGridView

Page 1 of Community Tab - Random matcher assignment.

**Features:**
- Fetches today's grid from communityService
- Shows anchor + triangle grid
- Single-select candidate
- Submit proposal button
- Completion state
- Pull-to-refresh

**File:** `DailyGridView.tsx:1`

### ProposalReviewView

Page 2 of Community Tab - Vote on proposals.

**File:** `ProposalReviewView.tsx:1`

### FriendsAreaView

Page 3 of Community Tab - Friends' grids, pending proposals, active matches.

**File:** `FriendsAreaView.tsx:1`

---

## Design System

### Colors

**Primary:**
- Selected state: `#437FFF` (primary-500)
- Hover: `#6E9CFF` (primary-400)
- Active: `#2F63D4` (primary-600)

**Neutrals:**
- App background: `#F9FAFB` (neutral-50)
- Card background: `#FFFFFF`
- Borders: `#D0D5DD` (neutral-300)
- Text primary: `#101828` (neutral-900)
- Text secondary: `#475467` (neutral-600)

### Spacing

- Card padding: 16-24px
- Screen padding: 16px horizontal
- Section spacing: 24-32px
- Touch targets: minimum 44x44px

### Animations

**Durations:**
- Quick interactions: 150ms
- Entrance animations: 300ms
- Stagger delay: 100ms between elements

**Easing:**
- Standard: `Easing.out(Easing.ease)`
- Spring: `{ damping: 15, stiffness: 150 }`

### Typography

**Headings (Satoshi):**
- H1: 24px / 600 weight
- H2: 20px / 600 weight

**Body (Inter):**
- Body: 16px / 400 weight
- Small: 14px / 400 weight
- Label: 12px / 500 weight

---

## Integration Guide

### 1. Wire Up to Services

```tsx
import { communityService } from '../../services/communityService';

// Fetch grid data
const grid = await communityService.getTodaysGrid();

// Submit proposal
await communityService.submitDailyGridProposal(selectedCandidateId);
```

### 2. Add Loading States

```tsx
{loading ? (
  <TriangleGridSkeleton />
) : grid ? (
  <TriangleGrid {...gridProps} />
) : (
  <EmptyState type="no_grid" />
)}
```

### 3. Add Error Handling

```tsx
try {
  const grid = await communityService.getTodaysGrid();
  setGrid(grid);
} catch (error) {
  showEmptyState('network_error');
}
```

### 4. Add Success Feedback

```tsx
const handleSubmit = async () => {
  await communityService.submitDailyGridProposal(selectedId);
  setShowSuccess(true);
  // Success animation auto-dismisses after 2s
};
```

---

## Accessibility

### Touch Targets

All interactive elements meet minimum 44x44px touch target size:
- CandidateCard: 100x100px (card itself)
- Buttons: 44px minimum height
- KarmaBadge: Pressable area >= 44x44px

### Screen Reader Support

Future enhancement (post-V1):
- Add accessible labels
- Test with VoiceOver
- Ensure proper navigation order

### Color Contrast

All text meets WCAG AA standards:
- Primary text (#101828) on white: 13.6:1
- Secondary text (#475467) on white: 6.5:1
- Primary blue (#437FFF) on white: 3.4:1 (large text only)

---

## Performance Considerations

### Optimizations

1. **React Native Reanimated** for 60fps animations
2. **Memoization** on expensive calculations
3. **Image caching** via React Native Image component
4. **Skeleton loaders** for perceived performance

### Bundle Size

These components add:
- React Native Reanimated (~150KB)
- Expo Haptics (~10KB)
- Total: ~160KB to bundle

---

## Testing Checklist

- [ ] Triangle displays correctly on iPhone SE (small screen)
- [ ] Triangle displays correctly on iPhone 14 Pro Max (large screen)
- [ ] Can select/deselect candidates
- [ ] Only one candidate selected at a time
- [ ] Animations are smooth (60fps)
- [ ] Haptic feedback works on physical device
- [ ] Loading states appear
- [ ] Error states are user-friendly
- [ ] Success animation plays
- [ ] Touch targets >= 44px
- [ ] Pull-to-refresh works

---

## Known Issues & TODOs

### Phase 2 Enhancements

- [ ] Add connection lines between anchor and candidates (optional visual)
- [ ] Implement screen reader support
- [ ] Add reduced motion preferences support
- [ ] Test with VoiceOver
- [ ] Add unit tests for components
- [ ] Performance profiling on older devices

### Future Features

- [ ] Confetti animation on proposal approval
- [ ] Micro-interactions for karma badge level-up
- [ ] Swipe gestures for navigation
- [ ] Dark mode support

---

## File Structure

```
src/components/community/
├── TriangleGrid.tsx         # Triangle layout component
├── CandidateCard.tsx        # Compact candidate card
├── AnchorCard.tsx           # Anchor display card
├── KarmaBadge.tsx           # Karma tier badge
├── SkeletonLoader.tsx       # Loading skeletons
├── EmptyState.tsx           # Error & empty states
├── SuccessAnimation.tsx     # Success celebration
├── DailyGridView.tsx        # Page 1: Daily Grid
├── ProposalReviewView.tsx   # Page 2: Voting
├── FriendsAreaView.tsx      # Page 3: Friends
├── PageIndicator.tsx        # Navigation dots
└── README.md                # This file
```

---

## Dependencies

**Required:**
- `react-native-reanimated` - Smooth animations
- `expo-haptics` - Tactile feedback
- `@expo/vector-icons` - Ionicons
- `nativewind` - Tailwind CSS styling

**Peer:**
- `react-native`
- `react`

---

## Support

**References:**
- [BRIDGE_VISION.md](../../BRIDGE_VISION.md) - Product vision & mechanics
- [design_specs.md](../../design_specs.md) - Design standards
- [IMPLEMENTATION_ROADMAP.md](../../IMPLEMENTATION_ROADMAP.md) - Development plan

**Issues:**
Report bugs or suggest improvements in the project repo.

---

**Last Updated:** December 2025
**Component Status:** ✅ Integration & Polish Complete
**Next Phase:** Backend Integration (Phase 3)
