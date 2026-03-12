# ProposalReviewView — UI Refinement Plan

## Context
ProposalReviewView is Bridge's most-used screen (voting on match proposals). At 2082 lines with all inline styles, hardcoded colors, and inconsistent spacing, it needs a systematic polish pass. The goal: make the voting experience feel as polished as Hinge/Bumble while preserving all existing functionality. Research-backed by Laws of UX, Apple HIG, and dating app benchmarks.

**Key constraints**:
- Uses Animated API (not Reanimated) — don't switch
- Compatibility score badge is LOCKED (decorative hash-based 70-99)
- **Do NOT touch icons** — a separate agent handles all icon work

---

## TIER 1: High-Impact, Low-Effort (Do First)

### 1.1 Vote Button Hierarchy Fix
- **Problem**: Yes button = 46px tall (full-width). No/Recommend/Not Sure = 63px tall each. Primary action is *shorter* than secondary — inverted hierarchy.
- **Fix**:
  - Yes: increase to 52px (`BUTTON_HEIGHT_LG`), add `SHADOWS.accentBlue` glow, use `FONTS.semiBold`
  - Secondary row: reduce from 63px to 48px, switch from vertical (icon-above-text) to horizontal (icon-beside-text) to prevent "Recommend" truncation on narrow screens
- **Why**: Fitts's Law — primary action needs largest touch target. Current sizing creates decision friction.
- **Lines**: ~1696-1792 (vote button container)

### 1.2 Replace Hardcoded Colors with Theme Constants
- **Problem**: Module-level `BLUE=#2563EB, GREEN=#34C759, RED=#FF383C, AMBER=#FFCC00` + dozens of inline hex values duplicate `COLORS` from `src/theme/colors.ts`
- **Fix**: Import `COLORS`, replace all hardcoded hex with tokens:
  - `BLUE` → `COLORS.primary`, `GREEN` → `COLORS.success`, `RED` → `COLORS.rejectRed`, `AMBER` → `COLORS.brightAmber`
  - `'#6B7280'` → `COLORS.text.label`, `'#9CA3AF'` → `COLORS.text.disabled`, `'#F4F7FF'` → `COLORS.backgroundBlueTint`, etc.
- **Why**: Single source of truth. Theme changes propagate correctly.
- **Complexity**: Low — search and replace, zero behavioral changes.

### 1.3 Typography Token Alignment
- **Problem**: Hardcoded font sizes (11, 12, 13, 14, 15, 16, 18, 20, 22, 28) — some off the `FONT_SIZES` scale
- **Fix**: Replace with `FONT_SIZES` tokens from `src/constants/typography.ts`: 11→xs, 12→sm, 13→md, 14→base, 16→xl, 18→2xl, 20→3xl, 28→5xl. Use `TEXT_STYLES` presets where applicable.
- **Why**: Miller's Law — consistent type scale reduces cognitive load.

### 1.4 Empty State Enhancement
- **Problem**: "No proposals today" is plain text on white (lines ~1416-1427). No illustration, no delight.
- **Fix**: Use existing `EmptyState` component (`src/components/ui/EmptyState.tsx`, `variant="illustrated"`) with icon and optional "Explore Community" action button.
- **Why**: Peak-End Rule — when user opens app to no proposals, this IS the session. Needs to be delightful, not disappointing.

### 1.5 Progress Dots Enhancement
- **Problem**: 8px tall, 40px wide dots. Completed (#93C5FD) vs upcoming (#DBEAFE) too similar. No "you are here" emphasis.
- **Fix**: Active dot gets subtle pulse animation. Completed dot uses `COLORS.primaryAccent` for clearer contrast. Increase height to 10px. Add "1 of 3" label in `FONT_SIZES.xs`.
- **Lines**: ~1390-1404

---

## TIER 2: High-Impact, Medium-Effort

### 2.1 Photo Area Responsive Sizing
- **Problem**: `PHOTO_HEIGHT=300` is fixed. On iPhone SE (667pt), vote buttons pushed below fold. On Pro Max (932pt), photos feel small.
- **Fix**: `PHOTO_HEIGHT = Math.max(220, Math.min(Math.round(SCREEN_HEIGHT * 0.36), 340))`. Scale gradient overlay height proportionally: `Math.round(PHOTO_HEIGHT * 0.43)`.
- **Why**: Fitts's Law — vote buttons (primary action) must be reachable without scrolling on smaller devices.
- **Requires**: Testing across iPhone SE, 15, 15 Pro Max.

### 2.2 Extract StyleSheet (Incremental, 4 Phases)
- **Problem**: ~150+ inline style objects recreated every render. Defeats `React.memo` shallow comparison, creates GC pressure.
- **Approach**:
  - **Phase A**: Sub-component static styles (MatchBadge, PercentBadge, SectionCard, pills) — ~40 style objects
  - **Phase B**: ProposalPhotoCard, RevealCardInline (conditional styles need variants)
  - **Phase C**: Main render body (vote buttons, overlays, modal) — use `[styles.base, condition && styles.variant]`
  - **Phase D**: QuestionCarousel, LiveVoteBar
- **Keep inline**: All Animated.View dynamic/animated styles must stay inline.

### 2.3 Section Card Visual Separation
- **Problem**: All SectionCard instances look identical (white bg, same border). No visual differentiation.
- **Fix**: Add 3px colored left-border accent per section (Questions=blue, Interests=emerald, Values=purple, Lifestyle=amber). Increase padding 12→16 (`CARD_PADDING`). Replace manual shadows with `SHADOWS.md`. Increase marginBottom 16→20. (No icon changes — separate agent handles icons.)
- **Why**: Miller's Law — distinct visual chunks reduce cognitive load. Apple HIG card patterns.
- **Lines**: SectionCard definition ~304-343

### 2.4 Smart Pill Spacing & Accessibility
- **Problem**: 6px gap between pills, crowded. Color is the *only* differentiator (green/yellow/grey) — fails colorblind users.
- **Fix**: Increase gap 6→8px. Add column headers ("Both share" / "Similar" / person names) in `FONT_SIZES.xs`. Increase column divider `marginHorizontal` 10→16.
- **Why**: WCAG — color alone must not be the only differentiator.

### 2.5 Scroll-to-Top After Vote
- **Problem**: 1000ms delay between vote and next proposal. User stares at voted proposal's scroll position.
- **Fix**: Add `scrollViewRef`, call `scrollTo({ y: 0, animated: true })` when advance timeout fires. Consider brief opacity fade during transition.
- **Why**: Peak-End Rule — transition between proposals is a "mini-ending" that must feel intentional.

### 2.6 Compatibility Badge Positioning
- **Problem**: Badge at `top: '40%'` absolute — on shorter photos, overlaps name text. "87 %" has an extra space.
- **Fix**: Position badge to sit in divider gap between photos. Fix string to "87%" (no space). Ensure `zIndex: 10`.

---

## TIER 3: Medium-Impact, Higher Effort (Do Last)

### 3.1 Sub-Component Extraction to Separate Files
- **Problem**: 20+ components in one 2082-line file.
- **Fix**: Extract to `src/components/community/proposal/` directory:
  - `ProposalPhotoCard.tsx` (~lines 528-631)
  - `LiveVoteBar.tsx` (~lines 850-1014)
  - `QuestionCarousel.tsx` + `RevealCardInline.tsx` (~lines 634-847)
  - `SmartPillCloud.tsx` (pills + cloud section, ~lines 377-525)
  - `SectionCard.tsx` (~lines 304-343)
  - `ComparisonRows.tsx` (ValueBox, EthnicityRow, ~lines 346-464)
  - `ForFriendModal.tsx` (~lines 1796-2026)
  - `proposalUtils.ts` (computeSmartPills, similarity maps, countMatch/countKnown)
- Main file becomes ~400-500 line orchestrator.

### 3.2 Entrance Animation for New Proposals
- Opacity 0→1 + translateX 30→0 over 250ms when advancing. Creates "card deck" feel.
- Uses existing Animated API. Needs coordination with `key={proposal.id}` remount behavior.

### 3.3 Vote Button Micro-Interactions
- Scale animation on press (0.97 → 1.0 spring). Yes: pulse to 1.03 before confetti. No: horizontal shake. Not Sure: tilt.
- **Why**: Variable rewards (gamification) — each vote type feels distinct.

---

## Cross-Cutting: Spacing Audit
Replace off-grid values: 6→8, 10→12, 14→16. Use `SPACING` from `src/constants/dimensions.ts` (xs:4, sm:8, md:12, lg:16, xl:20, 2xl:24, 3xl:32).

## Cross-Cutting: WCAG Contrast
- Secondary button text `opacity: 0.5` on #010101 = ~4.6:1 — **fails AA for normal text**. Fix: increase to 0.6 or use `COLORS.text.muted` (#475569, 5.9:1).
- LiveVoteBar label: BLUE on white = 4.6:1. Use `COLORS.text.heading` for small text.

---

## Critical Files
| File | Role |
|------|------|
| `src/components/community/proposal/ProposalReviewView.tsx` | The 2082-line target file |
| `src/theme/colors.ts` | `COLORS` constants (replace hardcoded hex) |
| `src/constants/typography.ts` | `FONTS`, `FONT_SIZES`, `TEXT_STYLES` tokens |
| `src/constants/dimensions.ts` | `SPACING`, `BUTTON_HEIGHT_LG`, `CARD_PADDING`, `MIN_TOUCH_TARGET` |
| `src/theme/shadows.ts` | `SHADOWS` presets for cards and buttons |
| `src/components/ui/EmptyState.tsx` | Reuse for empty state (1.4) |

## Implementation Sequence (9 PRs)
1. Color tokens (1.2) + Typography (1.3) — pure refactor, screenshot-verify
2. Vote buttons (1.1) + Empty state (1.4) + Progress dots (1.5) — visible wins
3. StyleSheet Phase A+B (2.2) — sub-component styles
4. Photo sizing (2.1) + Badge (2.6) + Scroll-to-top (2.5) — layout changes
5. Section cards (2.3) + Smart pills (2.4) — content area polish
6. StyleSheet Phase C+D (2.2) — main render styles
7. Sub-component extraction (3.1) — architecture
8. Entrance animation (3.2) + Vote micro-interactions (3.3)
9. LiveVoteBar labels (future, if needed)

## Verification
- `npx tsc --noEmit` after each PR — no type errors
- `npm test` — existing tests pass
- Screenshot comparison before/after on iPhone SE + iPhone 15 Pro Max
- Manual test: vote Yes/No/Recommend/Not Sure on all states (first proposal, middle, last, empty)
- Verify karma popup, confetti, vote flash, question reveal animations unchanged
- Test with 0, 1, 3 proposals to verify progress dots and empty state
