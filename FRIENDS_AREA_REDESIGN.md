# Friends Area UI Redesign Plan

**Date:** January 2026
**Status:** In Progress

---

## Overview

This document outlines the complete redesign of the Friends Area in Bridge's Community tab. The goal is to create a fun, digestible, and seamless interface that emphasizes community participation while celebrating friend streaks and assists.

---

## Design Philosophy

**"Fun, Social, and Celebratory"** - The friends area should feel like a social game where you're helping your crew while celebrating streaks and assists. It should be energetic but not overwhelming.

### Core Principles
- **Primary Action**: Help friends find matches (Vote button is the hero)
- **Visual Style**: Between minimal and game-like - fun but refined
- **Hierarchy**: Name is primary, details are secondary and tucked underneath
- **Consistency**: Same card height (76px) for both pending and completed states

---

## Key Changes

### 1. Combine Into One "Friends" Section
- **Before**: Separate "Help Friends" and "Leaderboard" sections
- **After**: Single scrollable list with smart sorting
  - Top: Friends who need help (pending)
  - Middle: Visual separator
  - Bottom: Friends already helped (completed, sorted by streak)
- **Benefit**: Reduces cognitive load, faster scanning

### 2. Enhanced Timer with Urgency States
Four urgency states that change color, icon, and behavior:

| State | Hours Remaining | Icon | Color | Pulse |
|-------|----------------|------|-------|-------|
| Plenty | 6+ | ⏰ | Gray (#64748B) | No |
| Moderate | 2-6 | 🔥 | Orange (#F59E0B) | No |
| Urgent | 0.25-2 | ⚡ | Rose (#F43F5E) | Yes |
| Critical | <0.25 (15m) | 🚨 | Red (#DC2626) | Yes |

### 3. Cleaner Friend Cards

**Pending Cards:**
```
┌──────────────────────────────────────────┐
│  [Avatar]  Maya                          │
│   (56x56)  🔥 5  Great friends      VOTE │
└──────────────────────────────────────────┘
```
- Height: 76px
- Larger avatar (56x56 up from 48x48)
- Name: 18px bold (primary)
- Streak/tier: 12px/10px (tucked 2px under name)
- Vote button: Prominent blue CTA

**Completed Cards:**
```
┌──────────────────────────────────────────┐
│  [Avatar]  Olivia                    20  │
│   (56x56)  🔥 20 💎 Best friends    ⭐⭐⭐│
└──────────────────────────────────────────┘
```
- Height: 76px (SAME as pending - cleaner!)
- Karma score: 20px bold, color-coded by tier
- Stars below karma (⭐ system)
- NO "✓ Helped today" line (removed for cleanliness)
- Subtle background tint (#F8FAFC)

### 4. Streak Celebrations

Progressive enhancement based on streak length:

| Streak | Visual Treatment |
|--------|-----------------|
| 0-9 | 🔥 Normal flame |
| 10-14 | 🔥 ✨ Flame + sparkle, gold glow |
| 15-19 | 🔥 💫 Flame + star, gold glow + shimmer |
| 20-29 | 🔥 💎 Flame + diamond, rainbow shimmer |
| 30+ | 🔥 👑 Flame + crown, animated golden aura |

**High Streak Treatment (15+):**
- Gold background (#FEF3C7)
- Gold border (#FCD34D)
- First view: Particle animation (sparkles fade in/out)

### 5. Karma Star System

Karma score displayed with star tiers:

| Assists | Stars | Color |
|---------|-------|-------|
| 0-4 | (none) | Gray (#94A3B8) |
| 5-9 | ⭐ | Bronze (#CD7F32) |
| 10-14 | ⭐⭐ | Silver (#C0C0C0) |
| 15-19 | ⭐⭐⭐ | Gold (#D97706) |
| 20+ | ⭐⭐⭐✨ | Diamond Purple (#8B5CF6) |

### 6. Celebration Banner

When all friends are helped:
```
┌───────────────────────────────────────────┐
│   🎉 You helped everyone today! 🌟       │
└───────────────────────────────────────────┘
```
- One line, centered
- Gradient background (rose to amber)
- Confetti animation on appearance
- Success haptic

### 7. In-Line Separator

Between pending and completed friends:
```
──────── Already helped today ────────
```
- 48px height
- 12px gray text, centered
- Subtle divider lines

---

## Typography & Spacing

### Font Sizes
- **Name**: 18px bold (unchanged - stays prominent)
- **Streak emoji**: 12px (down from 14px)
- **Streak number**: 12px medium (down from 14px)
- **Tier pill**: 10px semibold (down from 11px)
- **Karma score**: 20px bold (large, celebratory)
- **Stars**: 14px

### Spacing
- **Name to streak row**: 2px (down from 4px - tighter!)
- **Tier pill padding**: 6px horizontal, 2px vertical (down from 8px/3px)
- **Cards**: 76px height (consistent for both variants)
- **Between cards**: Natural FlatList spacing

---

## Component Structure

### New Components
1. **TimerBadge.tsx** - Timer with urgency states and pulse animation
2. **CelebrationBanner.tsx** - Celebration message with confetti

### Updated Components
1. **FriendCard.tsx** - Redesigned layout, removed "Helped today", added stars
2. **FriendsAreaView.tsx** - Single FlatList, combined friends, new sections

### New Constants
1. **src/constants/friendsArea.ts** - All styling constants centralized

---

## Technical Implementation

### Performance Optimizations
- Replace `ScrollView` with `FlatList` for better performance
- Use `React.memo` on FriendCard (already done)
- Implement `getItemLayout` for instant scrolling
- Set `removeClippedSubviews={true}`
- Batch rendering with `maxToRenderPerBatch={10}`

### Data Structure
```typescript
// Combine friends into single sorted array
const combinedFriends = useMemo(() => {
  const pending = friendsNeedingHelp;
  const completed = friendsAlreadyHelped.sort((a, b) =>
    b.streakDays - a.streakDays
  );

  return [
    ...pending.map(f => ({ ...f, variant: 'pending' })),
    ...completed.map(f => ({ ...f, variant: 'completed' }))
  ];
}, [friendsNeedingHelp, friendsAlreadyHelped]);
```

### FlatList Configuration
```typescript
<FlatList
  data={combinedFriends}
  keyExtractor={(item) => item.friendshipId}
  renderItem={({ item }) => <FriendCard friend={item} variant={item.variant} />}
  ListHeaderComponent={<SectionHeader />}
  ItemSeparatorComponent={<ConditionalSeparator />}
  ListFooterComponent={<CelebrationBanner />}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
/>
```

---

## Implementation Phases

### Phase 1: Foundation ✅
- [x] Create `src/constants/friendsArea.ts`
- [x] Update `src/types/community.ts` (add FriendWithVariant)

### Phase 2: New Components 🔄
- [ ] Create `TimerBadge.tsx`
- [ ] Create `CelebrationBanner.tsx`

### Phase 3: Update FriendCard 🔄
- [ ] Change props: `isPending` → `variant`
- [ ] Remove "✓ Helped today" text
- [ ] Reduce font sizes (12px/10px)
- [ ] Add streak celebration logic
- [ ] Add karma star visualization
- [ ] Ensure both variants are 76px

### Phase 4: Update FriendsAreaView 🔄
- [ ] Combine friend lists
- [ ] Replace ScrollView with FlatList
- [ ] Add timer with urgency states
- [ ] Add separator logic
- [ ] Add celebration banner
- [ ] Remove old sections

### Phase 5: Polish & Test 📋
- [ ] Test all timer states
- [ ] Test empty states
- [ ] Test celebration banner
- [ ] Test scroll performance
- [ ] Verify haptics
- [ ] Test on various screen sizes

---

## Testing Checklist

### Visual States
- [ ] No friends (empty state)
- [ ] All friends pending
- [ ] All friends completed (celebration banner)
- [ ] Mix of pending and completed
- [ ] Single friend (no separator)
- [ ] Timer at 10h (calm)
- [ ] Timer at 4h (moderate)
- [ ] Timer at 1h (urgent)
- [ ] Timer at 10m (critical)

### Interactions
- [ ] Tap avatar → profile
- [ ] Tap name/streak → message
- [ ] Tap Vote button → voting
- [ ] Pull to refresh
- [ ] Smooth scrolling

### Edge Cases
- [ ] Very long names (truncation)
- [ ] Streak = 0
- [ ] Karma = 0
- [ ] Karma = 100+
- [ ] 20+ friends (performance)

---

## Color Palette

### Card Backgrounds
- Pending: `#FFFFFF`
- Completed: `#F8FAFC`

### Timer States
- Plenty: `#64748B` on `#F8FAFC`
- Moderate: `#F59E0B` on `#FFFBEB`
- Urgent: `#F43F5E` on `#FFF1F2`
- Critical: `#DC2626` on `#FEE2E2`

### Karma Tiers
- Diamond (20+): `#8B5CF6`
- Gold (15-19): `#D97706`
- Silver (10-14): `#C0C0C0`
- Bronze (5-9): `#CD7F32`
- Gray (0-4): `#94A3B8`

### Streak Glow (10+)
- Background: `#FEF3C7`
- Border: `#FCD34D`

---

## Files Modified

### New Files
- `src/constants/friendsArea.ts`
- `src/components/community/TimerBadge.tsx`
- `src/components/community/CelebrationBanner.tsx`

### Updated Files
- `src/types/community.ts`
- `src/components/community/FriendCard.tsx`
- `src/components/community/FriendsAreaView.tsx`

---

## Dependencies

```bash
# If not already installed
npm install expo-linear-gradient
```

---

## Accessibility

### Screen Reader Labels
- Vote button: "Help {name} find a match"
- Timer: "Time remaining: {hours} hours {minutes} minutes"
- Completed card: "{name}, {streak} day streak, {assists} assists, already helped today"

### Focus Order
1. Timer
2. Pending friends (in order)
3. Completed friends (in order)

### Touch Targets
- All interactive elements: Minimum 44x44px
- Vote button: 40x68px with larger hit area

---

## Success Metrics

- [ ] Faster scan time (users can quickly see who needs help)
- [ ] Clearer visual hierarchy (name > details)
- [ ] More celebratory feel (streaks and assists are fun!)
- [ ] Better performance (FlatList vs ScrollView)
- [ ] Cleaner interface (removed visual clutter)

---

## Notes

- DEV test state toolbar can remain during development for easy testing
- Confetti animation should be subtle and delightful, not overwhelming
- Timer pulse should be gentle, not anxiety-inducing
- All animations should use native driver for 60fps performance
