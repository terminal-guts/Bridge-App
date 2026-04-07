# Bridge Color Philosophy v3 — "Less Is More"

## Research Foundation

We studied Hinge, BeReal, Duolingo, Partiful, Spotify, Airbnb, and Instagram. Every successful consumer app follows the same principle: **the less color you use, the more each color means.**

| App | Neutral % | Accent % | Text Grays | Accent Colors |
|-----|-----------|----------|------------|---------------|
| Hinge | 90% | 10% | 2 | 1 (purple) |
| BeReal | 93% | 7% | 2 | 0 |
| Duolingo | 78% | 22% | 3 | 1 (green) |
| Partiful | 90% | 10% | 3 | 1 (purple) |
| **Bridge target** | **~80%** | **~15%** | **3** | **1 (blue)** |

We're targeting Duolingo-level restraint: warm, friendly, one accent color that means "tap here," personality through content and copy rather than UI chrome.

---

## The New Palette

### Foundation: 3 Neutrals (~80% of every screen)

These are the backbone. Most of what the user sees is these 3 text colors on a warm white background.

| Token | Hex | Role | When to use |
|-------|-----|------|-------------|
| `text.primary` | #1E293B | Near-black. Headings, names, anything bold. | Screen titles, user names, card titles, button labels, any text that anchors a section |
| `text.secondary` | #64748B | Medium gray. Everything that isn't a heading. | Body text, descriptions, labels, metadata, secondary info |
| `text.tertiary` | #94A3B8 | Light gray. Background-level text. | Timestamps, placeholders, disabled text, "X ago", input hints |

**That's it for text.** 3 levels. No `text.warm`, no `text.body` vs `text.primary` distinction. If text isn't a heading, it's secondary. If it's a placeholder or timestamp, it's tertiary.

### Background: 2 Colors

| Token | Hex | Role |
|-------|-----|------|
| `screenBackground` | #FDFAF7 | Every screen. Our signature warm off-white. |
| `card` | #FFFFFF | Cards, modals, sheets, input fields, elevated surfaces. |

**That's it.** No `backgroundWarm`, `backgroundNeutral`, `backgroundBlue`, `backgroundGrayMedium`. If something needs a tinted background (like a success banner), use the status color at 8-10% opacity inline.

### Borders: 2 Colors

| Token | Hex | Role |
|-------|-----|------|
| `border` | #E2E8F0 | Standard card borders, input borders, dividers |
| `borderLight` | #F0F0F0 | Very subtle separators (barely visible) |

**That's it.** No warm borders, blue borders, gray borders. One border color. When in doubt, use whitespace instead of a border.

### The Accent: 1 Blue (the "Duolingo Green" of Bridge)

| Token | Hex | Role |
|-------|-----|------|
| `primary` | #2563EB | CTA buttons, active tab indicator, links, progress bars, selected states |
| `primaryAccent` | #437FFF | Nav active tint (LOCKED), lighter blue accents |
| `primaryLight` | #EFF6FF | Subtle blue card/section backgrounds |
| `primaryTint` | rgba(67,127,255,0.06) | Barely-there blue wash for backgrounds |

**Blue is Bridge's single accent color.** Use it for buttons, CTAs, progress bars, links, selected states, and any element that benefits from visual emphasis or hierarchy. Blue can appear on non-interactive elements (section icons, accent bars, tinted backgrounds) when it adds clarity or warmth.

### Status: 3 Colors (only when communicating state)

| Token | Hex | When it appears |
|-------|-----|-----------------|
| `success` | #34C759 | Match confirmed, profile complete, positive vote outcome |
| `error` | #EF4444 | Destructive actions, validation errors, report confirmations |
| `amber` | #F59E0B | Timer warnings, pending states, "almost expired" |

**Status colors are invisible 90% of the time.** They only appear when the app needs to communicate a specific state. They never appear as decoration.

### Special-purpose (kept but scoped)

| Token | Hex | Scoped to |
|-------|-----|-----------|
| `podiumGold` | #FFD700 | Leaderboard 1st place only |
| `podiumSilver` | #C0C0C0 | Leaderboard 2nd place only |
| `podiumBronze` | #CD7F32 | Leaderboard 3rd place only |

No other special-purpose colors. Tier colors (tier1/tier2/tier3), purple, pink, rose, violet, indigo, etc. are removed from the system. If a screen needs to differentiate categories, use icons or labels — not color.

---

## What Changes From Current System

### Removed (~40 tokens)

**Text:** `text.body` (merge into primary/secondary), `text.warm` (use secondary)
**Backgrounds:** `backgroundWarm`, `backgroundNeutral`, `backgroundBlue`, `backgroundGrayMedium` — all removed
**Borders:** `borderWarm`, `borderBlue`, `borderGray` — all removed
**Status:** `emerald` (merge with success), `danger` (merge with error), `warmOrange` (merge with amber)
**Tier system:** All 15 tier1/tier2/tier3 tokens — removed entirely
**Decorative:** `purple`, `pink` — removed
**Semantic/screen-specific:** `scoreBlue`, `passButton`, `systemGray`, `systemPurple`, `amberText`, `matchReasonGreen`, `purpleDeep`, `indigo`, `violet`, `grayIcon`, `emeraldText`, `rankUp`, `rose`, `blueText`, `paginationInactive` — all removed or inlined

**Match/mismatch/warning objects:** Simplified. `match.icon`/`mismatch.icon` use `success`/`error`. Background tints computed inline.

### Kept (~20 tokens)

```
primary, primaryAccent, primaryButton, primaryButtonDisabled
text.primary, text.secondary, text.tertiary
screenBackground, card
border, borderLight
success, error, amber
navInactiveIcon
skeletonBone, skeletonOverlay
podiumGold, podiumSilver, podiumBronze
toast.success, toast.info, toast.warning, toast.error
overlay.light, overlay.medium, overlay.heavy
```

### Token count: 63 → ~25 (60% further reduction)

---

## Screen-by-Screen Application

### Voting Screen (ProposalReviewView)
**Before:** 6 accent hues (cyan, blue, purple, amber, orange, green) + warm beige pills + colored section borders
**After:** Black headings, gray body text, white cards, ONE blue CTA ("Yes" button). Match % badges use status colors sparingly. Interest/value pills are light gray on white. No colored section titles, no colored left borders.

### Community Screen
**Before:** Blue headers, green karma pills, colored friend status badges
**After:** Black header, gray secondary text. Karma shown as plain text (no colored pill — the number speaks for itself, or use the blue accent sparingly). Friend cards are white with gray text. Section headers are visually differentiated: action sections ("Waiting on you", "FRIEND REQUESTS") use blue accent bars and blue count badges, while informational sections ("Your crew") use gray accent bars and gray count badges — so users instantly see what needs attention vs. what's just context.

### Profile Screen
**Before:** Multiple background tints, warm text colors, colored strength indicators
**After:** Warm off-white background, white cards, black headings, gray body. Profile strength progress bar is blue (it's interactive — tapping it navigates). Section cards are clean white with black titles and gray subtitles.

### Match Screen
**Before:** Blue lock view, colored timer badges, status-colored borders
**After:** Clean white/warm-white. Timer uses amber ONLY when urgency is real (<4 hours). Lock view is clean with a blue CTA to complete profile. The match card itself is photo-forward — the UI chrome around it is neutral.

### Chat Screen
**Before:** Blue-tinted backgrounds, colored action buttons
**After:** Warm off-white background. Messages are white cards (sent) and light gray cards (received). Blue only on the send button. No colored backgrounds or tinted surfaces.

---

## The Principles (for CLAUDE.md)

1. **Color is information, not decoration.** Every use of color must communicate: "tap here" (blue), "this succeeded" (green), "something's wrong" (red), or "be careful" (amber). If it doesn't communicate one of these, it should be gray or black.

2. **3 grays, 1 blue, 3 status.** That's the entire palette. If you're reaching for a color that isn't one of these 7, stop and reconsider.

3. **Content is the color.** User photos, profile text, and community activity provide visual richness. The UI chrome should be invisible — warm off-white, clean white cards, gray text. Photos pop because the frame is neutral.

4. **Blue is the accent.** Use it wherever visual emphasis or hierarchy helps — buttons, icons, progress bars, accent borders, tinted backgrounds. Not restricted to interactive elements.

5. **Status colors are invisible until needed.** Green, red, and amber appear only in response to state changes (match confirmed, error occurred, timer expiring). They never appear as permanent decoration.

6. **When in doubt, use gray.** If you're unsure whether something should be colored or gray, choose gray. You can always add color later, but removing it after users expect it is harder.

---

## Migration Impact

This is a significant visual change. Every screen will become cleaner and more neutral. The app will feel more premium, more intentional, and more photo-forward.

**What users will notice:**
- Screens feel cleaner and less busy
- Blue now clearly signals "tap here" everywhere
- Photos and user content stand out more
- Match % and status badges feel more meaningful (because color is rare)

**What users won't notice (but will feel):**
- Reduced cognitive load from fewer competing colors
- Faster visual scanning (hierarchy is clearer)
- More professional, trustworthy feel
