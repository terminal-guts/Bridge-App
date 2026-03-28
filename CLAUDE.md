# Bridge App — Claude Code Instructions

## Codebase Status

This is the **production codebase** for Bridge — the app being deployed to the App Store. It contains both the frontend (React Native/Expo) and backend (Supabase, in the `supabase/` subdirectory). Treat all code here as production-quality.

**Notable removals:**
- `src/screens/profile/BadgeManagementScreen.tsx` — deleted. Badge management is now fully in-modal via `BadgeAwardModal.tsx`.
- Railway has been fully removed (2026-03-23). Content moderation runs in `supabase/functions/moderate-text/index.ts`.

**Deferred features (not in the live app, backend tables still exist):**
- **Suggest a Match** (suggest two friends as a match) and **Recommend to Friend** (recommend someone during voting) — both fully built but pulled from UI pre-launch. See `_deferred/suggest-a-match/DEFERRED.md` for what was removed and how to re-enable. Do not reference these as live features.

**React Compiler:** `babel-plugin-react-compiler` is active — it auto-memoizes components and hooks. Do not add manual `useMemo`/`useCallback` solely for performance unless there's a specific reason.

## App Store Reviewer Bypass — Permanent, Do Not Remove

The reviewer bypass (`EXPO_PUBLIC_REVIEWER_PASSWORD` and the `isReviewerBypassEmail` logic in `src/services/authService.ts`) is a **permanent feature** that must stay in the app. It exists so Apple reviewers can log in without a Rice email address on every future update submission.

**Do not remove or flag this as a bug.** The app is accepted to the App Store and the bypass must be kept for all future review cycles.

**How it works:** `reviewer@bridgedate.app` is the hardcoded reviewer email. The password is validated server-side by the `validate-reviewer-access` Supabase edge function — the actual auth credentials are never in the app bundle. This is secure.

**Note:** `EXPO_PUBLIC_ENABLE_REVIEWER_BYPASS` is referenced in tests but is not read by the app code — the bypass is always active for the reviewer email. Do not add a runtime check on that flag without testing it end-to-end.

## LOCKED: Bottom Navigation Bar

The bottom nav bar values in `src/navigation/AppNavigator.tsx` (`CustomTabBar`) are **finalized and must not be changed** without explicit user instruction. Do not adjust any of the following:

- `contentHeight = Math.round(screenHeight * 0.057)` — bar height as % of screen
- `iconSize = Math.round(contentHeight * 0.65)` — icon size proportional to bar
- `iconPaddingTop = Math.round(contentHeight * 0.25)` — icon vertical placement proportional to bar
- `top: 0` on the blue indicator — keeps it flush at the top border
- Indicator dimensions: `width: 40, height: 3`, color `#437FFF`
- Active tint: `#437FFF`, inactive tint: `#667085`

These were tuned to match the Figma design and confirmed by the user. Leave them alone.

## LOCKED: Compatibility Score Display

Any compatibility percentage badge shown to users in the UI (e.g. in `ProposalReviewView`, match cards, or any future screen) **must always use the hash-based 70–99 decorative value**. Do not replace this with `proposal.compatibilityScore`, any database column, or any algorithmic output.

Rules:
- The score is **display-only and intentionally decorative** — it has no connection to the matchmaking algorithm
- It is **seeded by the proposal/match ID** so it is stable across renders and sessions for the same proposal
- Each new proposal or match gets its own fixed score derived from its ID — a new proposal always gets a new number, but that number never changes for the life of that proposal
- The formula is: `70 + (id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 30)`
- The `compatibility_score` column on the `proposals` table is for internal backend/algorithm use only and must never be surfaced in the UI

This is a deliberate product decision. Do not "fix" this.

## Typography System — Plus Jakarta Sans

The entire app uses **Plus Jakarta Sans** (Google Fonts, OFL license). This is a deliberate design decision — do not switch to another font or reintroduce system fonts.

### Architecture (3 layers)

1. **`src/constants/typography.ts`** — single source of truth. Exports:
   - `FONTS` — font family constants (`regular`, `medium`, `semiBold`, `bold`, `extraBold`)
   - `FONT_SIZES` — 12-step size scale (11px–40px)
   - `LINE_HEIGHTS` — matching line-height scale
   - `TEXT_STYLES` — 18 semantic presets (display, heading, body, label, caption, button)

2. **`src/components/ui/Typography.tsx`** — shared text components (`H1`, `H2`, `H3`, `Body`, `BodySmall`, `Label`, `Caption`, `Display`). Each resolves the correct `fontFamily` from NativeWind `font-bold`/`font-semibold`/`font-medium` classes via `resolveFontFamily()`.

3. **`src/utils/setDefaultFonts.ts`** — global fallback that patches `Text.render` (or `defaultProps`) to map `fontWeight` → correct PlusJakartaSans variant. Imported in `App.tsx` after fonts load.

### Rules for new code

- **Always set `fontFamily`** when using inline styles with `fontWeight`. Use `FONTS.bold` etc., never raw strings.
- **Import `FONTS`** from `src/constants/typography` — never hardcode `'PlusJakartaSans_700Bold'` in components.
- **Typography components** handle font resolution automatically — prefer `<Body className="font-bold">` over manual fontFamily.
- **Font loading** happens in `App.tsx` via `useFonts` from `expo-font` directly. Individual TTF files are `require()`d by path (e.g. `@expo-google-fonts/plus-jakarta-sans/400Regular/...ttf`) — do NOT import from the package root index, which bundles all 16 variants (~1MB wasted assets).
- **Weight mapping**:
  - `FONTS.regular` = 400 (body text, descriptions)
  - `FONTS.medium` = 500 (labels, secondary emphasis)
  - `FONTS.semiBold` = 600 (subheadings, buttons)
  - `FONTS.bold` = 700 (headings, names)
  - `FONTS.extraBold` = 800 (hero text, large numbers)
- **Do not** use `Outfit`, `Satoshi`, `Inter`, or any other font family — these have been fully removed.
- **Do not** rely on `fontWeight` alone — React Native with custom fonts requires the specific font file via `fontFamily`.
- **Tailwind config** (`tailwind.config.js`) maps `font-sans` etc. to PlusJakartaSans variants.

## Shadow & Depth System

The app uses a centralized shadow system at **`src/theme/shadows.ts`**. This is the single source of truth for all elevation, depth, and overlay values.

### Architecture

1. **`src/theme/shadows.ts`** — exports:
   - `SHADOWS` — neutral elevation presets (`none`, `sm`, `md`, `lg`, `xl`, `xxl`) + accent glows (`accentBlue`, `accentGreen`, `accentRed`, `accentGold`, `accentSilver`, `accentBronze`)
   - `ShadowLevel` / `ShadowKey` types — for component APIs
   - `resolveShadow(key)` — resolves any `ShadowKey` to its `ViewStyle`
   - `DEPTH_PARAMS` / `DEPTH_PRESS_FACTOR` — constants for animated press depth (iOS)
   - `glowShadow(color, intensity)` — dynamic colored glow helper with caching
   - `OVERLAYS` — modal backdrop opacity levels (`light`, `medium`, `heavy`)

2. **`src/components/ui/Card.tsx`** — Card component with two shadow APIs:
   - `shadow` prop (preferred): accepts any `ShadowKey` — e.g., `<Card shadow="lg">`, `<Card shadow="accentBlue">`
   - `elevation` prop (legacy, still works): numeric `0|1|2|3` mapped to shadow presets
   - `animateDepth` prop: enables animated shadow transitions on press (iOS only)

3. **`src/components/ui/AnimatedPressable.tsx`** — master pressable component:
   - `animateDepth` + `depthLevel` props: animates shadowOpacity/shadowRadius/shadowOffset on press-in (card sinks) and release (springs back)
   - Scale animation (always active), shadow depth animation (opt-in, iOS only)

### Rules for new code

- **Use `SHADOWS` constants** from `src/theme/shadows` — never hardcode shadow values inline
- **Prefer `shadow` prop** on Card over `elevation` — it's more expressive and accepts accent glows
- **Use `OVERLAYS` constants** for modal/overlay backdrops — never hardcode `rgba(0,0,0,...)` overlay values
- **Do not** use `src/utils/shadows.ts` — this legacy file has been removed
- Shadow colors use warm brown palette on iOS (`#4A3428`, `#3D2817`, `#2E1810`) for natural depth
- Android uses numeric `elevation` (no color support) — this is a platform limitation

## Communication Style

The user is a non-technical business student. When explaining or discussing code:
- Use plain English — no CS jargon without explanation
- When pasting a terminal command, explain in one sentence what it does and why
- When an error occurs, describe what went wrong in plain language before fixing it
- Don't assume familiarity with programming concepts

## Invite System

SMS invite messages use **rotating variants** defined in `contactsService.ts`. The `buildInviteMessage()` function cycles through 4 message templates to keep batch invites from feeling copy-pasted.

### Rules
- Invite copy must align with Bridge brand voice: warm, down-to-earth, curiosity-driven
- **Never use the word "dating"** in invite messages or the landing page — it's too intimidating. Use "find your person", "match", "connect" instead.
- Never use words from the "DON'T" list in BRIDGE_VISION.md (exclusive, elite, premium, etc.)
- Messages must stay under 160 chars (before link) to avoid SMS splitting
- The invite-redirect landing page (`supabase/functions/invite-redirect/index.ts`) is the web fallback — keep it clean and aligned
