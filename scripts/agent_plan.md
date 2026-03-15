# Implementation Plan — Invite, Shadow, Press Depth, Dark Mode, Suggest-a-Friend

**Date:** 2026-03-14
**Status:** Active

---

## Phase 1: Codebase Audit — Complete

### 1.1 Invite System

**Current state:** Single SMS template in `contactsService.ts:314-323`:
```
"Hey it's {name}! I'm on Bridge — it's a new app where you help your friends find their person. Come join my crew!"
```

**Issues:**
- Generic startup referral copy — doesn't spark curiosity
- "Come join my crew" is juvenile/forced
- No social proof, no emotional pull
- No message variants for different contexts
- Invite-redirect landing page is well-designed but tagline ("Your friends pick who you date") could be stronger
- 10-invite limit only enforced client-side (AsyncStorage) — noted but not in scope

**Architecture is solid:** Deep links, friend codes, contact detection, Rice email heuristic all work well. The weakness is purely copy/messaging.

### 1.2 Shadow/Theme Architecture

**Current state:**
- Primary system: `src/theme/shadows.ts` — 5 elevation levels (sm→xxl), 6 accent glows, overlay constants, `glowShadow()` helper with caching
- Legacy system: `src/utils/shadows.ts` — dual-layer shadow approach, **zero imports** (dead code)
- Card component maps `elevation: 0|1|2|3` → SHADOWS presets
- Hardcoded overlay values in GuideOverlay (`rgba(0,0,0,0.55)`) and InfoModal (`rgba(0,0,0,0.6)`) bypass OVERLAYS constants

**Issues:**
- No `shadow` prop on Card (must use numeric elevation or spread styles)
- Legacy shadow file is dead code
- Overlay usage inconsistent
- No component-level shadow API (`<Card shadow="lg">`)

### 1.3 Press/Animation System

**Current state:**
- `AnimatedPressable` is the master pressable component — Reanimated v4, UI-thread, gesture-handler
- Press feedback is scale-only (0.985–0.92) + optional opacity
- Well-organized animation tokens in `constants/animations.ts`
- Reduced motion support via `useMotionConfig` hook
- No animated shadow/elevation changes on press

**Components needing press depth:**
- Card.tsx (highest priority) — only scale today
- Button.tsx — only scale + haptic
- CollapsibleCard.tsx — uses legacy TouchableOpacity
- MatchCard.tsx — uses native Pressable

### 1.4 Dark Mode

**Current state:** Not implemented. Zero dark mode support anywhere:
- No dark palette in COLORS
- No `useColorScheme()` or Appearance listener
- No dark mode in Tailwind config
- StatusBar hardcoded to `dark-content`
- Every component hardcodes light-mode colors

**Assessment:** Dark mode is a **massive undertaking** that touches every component, the entire color system, Tailwind config, shadows, overlays, and StatusBar. It should NOT be implemented now — doing so hastily in a production app would create visual regressions everywhere.

**Decision: DEFER dark mode.** Rationale:
- The color system would need ~150+ dark variants
- Every component with inline bg colors needs conditional logic
- NativeWind dark mode requires configuration + className changes app-wide
- Shadow colors (warm browns) need dark-aware alternatives
- Risk of regression on production screens is too high without a dedicated design pass
- No Figma dark mode designs exist to reference

**What we CAN do now:** Ensure the shadow system and new components are dark-mode-ready (accept theme-aware colors, avoid hardcoding where possible).

### 1.5 Suggest-a-Friend Feature

**Current state:** Two distinct features:

1. **"Suggest a Friend" (SuggestMatchScreen)** — FULLY IMPLEMENTED
   - 3-step wizard: pick friend A → pick friend B → confirm
   - Backend: queued in `friend_suggestions`, converted to `creation_type: 'friend_proposal'` at 7PM
   - Suggester auto-votes YES, earns karma
   - Clean architecture, proper validation

2. **"Recommend to Friend" (voting flow)** — PARTIALLY IMPLEMENTED
   - During community voting, user can recommend a candidate to a friend
   - Stored in `friend_recommendations` table
   - Used as algorithmic boost in `generate-proposals`
   - **UX gap:** Recommendation is invisible to recipient — no notification, no badge, no "you were recommended" indicator

**Strategic assessment:**
- "Suggest a Friend" is high-value, aligns perfectly with Bridge's community-driven model. **KEEP.**
- "Recommend to Friend" is architecturally sound but the UX gap weakens its perceived value. Users think they're "sending" a recommendation but it's a silent algorithmic signal. **KEEP but note the UX gap for future improvement** (notification system should surface these).

**Decision: Keep both features. No changes needed now.** The UX gap in "Recommend to Friend" is a notification system concern, not a structural one.

---

## Phase 2: Implementation Decisions

### 2.1 Invite Message Redesign ✅ IMPLEMENT

**Strategy:**
- Rewrite `buildInviteMessage()` with curiosity-driven, personal copy
- Add context-aware message variants (first invite vs. reminder)
- Improve invite-redirect landing page tagline
- Align with Bridge brand voice (warm, down-to-earth, community)

**Copy principles (from referral psychology):**
- Lead with the friend relationship, not the app
- Create a curiosity gap ("your friends pick who you date")
- Imply social proof without being spammy
- Keep it short — SMS messages over 160 chars get split

### 2.2 Component-Level Shadow API ✅ IMPLEMENT

**Design:**
```typescript
// New API
<Card shadow="lg">        // Direct shadow level
<Card shadow="accentBlue"> // Accent glow
<Card elevation={2}>       // Keep backward-compatible

// shadow prop accepts: ShadowLevel | keyof typeof SHADOWS
type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
```

- `shadow` prop takes precedence over `elevation` when both provided
- Backward compatible — existing `elevation` prop still works
- Expose `SHADOW_LEVELS` type for consumers

### 2.3 Animated Press Depth ✅ IMPLEMENT

**Design:**
- Enhance `AnimatedPressable` with optional `animateDepth` prop
- On press-in: shadow transitions from resting → one level lower (less depth = pressed into surface)
- On press-out: springs back to resting shadow
- iOS only (Android elevation doesn't support animation)
- Respects reduced motion

**Technical approach:**
- Animate `shadowOpacity` and `shadowRadius` via Reanimated shared values
- On press: reduce opacity/radius by ~40% (card "sinks" into surface)
- Spring config: `SPRINGS.snappy` for press, `SPRINGS.responsive` for release
- Card component opts in via `animateDepth` prop

### 2.4 Legacy Shadow Cleanup ✅ IMPLEMENT

- Delete `src/utils/shadows.ts` (zero imports, fully dead)
- Replace hardcoded overlay values in GuideOverlay and InfoModal with OVERLAYS constants

### 2.5 Dark Mode ❌ DEFER

Documented above. Not safe for production without dedicated design pass.

### 2.6 Suggest-a-Friend ❌ NO CHANGES

Feature is solid. Keep as-is. The "Recommend to Friend" UX gap is a notification concern for future work.

---

## Phase 3: Implementation Order

1. **Delete legacy shadows** (zero risk, immediate cleanup)
2. **Component-level shadow API** (Card.tsx enhancement)
3. **Animated press depth** (AnimatedPressable + Card integration)
4. **Standardize overlay usage** (GuideOverlay, InfoModal)
5. **Invite message redesign** (copy + invite-redirect page)
6. **Add research links to RESOURCES.md**
7. **Validation** (lint, TypeScript, regression check)

---

## Phase 4: Risks & Rollback

| Change | Risk | Rollback |
|--------|------|----------|
| Shadow API | Low — additive, backward-compatible | Revert Card.tsx |
| Animated depth | Low — opt-in prop, iOS only | Remove `animateDepth` prop |
| Legacy shadow delete | None — zero imports | Git revert |
| Overlay constants | Low — visual only | Revert to hardcoded values |
| Invite copy | Low — text only | Revert buildInviteMessage |
| Invite-redirect page | Low — HTML only | Revert edge function |

No database changes. No backend logic changes. No breaking API changes.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/AnimatedPressable.tsx` | Add `animateDepth` + shadow animation |
| `src/components/ui/Card.tsx` | Add `shadow` prop, integrate animated depth |
| `src/theme/shadows.ts` | Export shadow level types |
| `src/constants/animations.ts` | Add depth animation constants |
| `src/services/contactsService.ts` | Rewrite invite message copy |
| `supabase/functions/invite-redirect/index.ts` | Improve landing page copy |
| `src/components/guides/GuideOverlay.tsx` | Use OVERLAYS constant |
| `src/components/ui/InfoModal.tsx` | Use OVERLAYS constant |
| `src/utils/shadows.ts` | DELETE (dead code) |
| `RESOURCES.md` | Add research links |
