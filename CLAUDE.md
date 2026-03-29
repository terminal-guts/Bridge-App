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
- **Always use `TEXT_STYLES` presets** when a semantic match exists (e.g., `TEXT_STYLES.headingSm` instead of manually composing `fontFamily` + `fontSize` + `lineHeight`). Only compose raw styles when no preset fits.
- **Never use raw numbers** for `fontSize` or `lineHeight` — always reference `FONT_SIZES` and `LINE_HEIGHTS` constants. If the scale doesn't have the size you need, add a new entry to the scale rather than hardcoding a magic number.
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

## Color System

The app uses a centralized color system at **`src/theme/colors.ts`**. This is the single source of truth for all colors.

### Rules for new code

- **Always use `COLORS` constants** — never hardcode hex values inline (e.g., use `COLORS.text.secondary` not `'#64748B'`).
- **Screen backgrounds must be `COLORS.screenBackground`** (`#FDFAF7`, warm off-white) — never use pure `#FFFFFF` or `bg-white` for screen-level backgrounds. Cards and surfaces can be white (`COLORS.card`).
- **Use semantic color tokens** over raw palette values. `COLORS.text.heading` is better than `COLORS.text.black` because it communicates intent, not appearance.
- **If a color doesn't exist in the system**, add it to `src/theme/colors.ts` with a comment explaining its purpose — don't hardcode it in the component.
- **Border colors** follow the warm palette: `COLORS.borderWarm` (`#E7DED4`) for warm contexts, `COLORS.border` (`#E2E8F0`) for neutral. Never use `COLORS.borderSubtle` (`#F1F5F9`) as a divider — it's nearly invisible.

## Icon System

The app uses **EvaIcon** (`src/components/icons/EvaIcon.tsx`) as the single icon library. See `src/components/icons/README.md` for full documentation.

### Rules for new code

- **Always use `EvaIcon`** — never import from `@expo/vector-icons`, `Ionicons`, `MaterialIcons`, or any other icon library.
- **Import from `@/components/icons`** — not directly from eva-icons.
- **Standard sizes**: 16px (inline/small), 20px (default), 24px (navigation/header), 32px (hero/empty state).
- **Use semantic color names** on EvaIcon (`color="primary"`, `color="text"`) — not raw hex strings.
- **Default variant is `outline`** — use `variant="fill"` only for active/selected states (e.g., filled heart for liked).
- Custom SVG icons (WineGlassIcon, CigaretteIcon, etc.) and BadgeIcon are exceptions — imported from `src/components/icons/`.

## Touch Targets

All interactive elements must meet iOS Human Interface Guidelines minimum touch target sizes.

### Rules for new code

- **Minimum touch target: 44x44 points** — this is non-negotiable for any tappable element (buttons, icons, links, checkboxes).
- If the visual element is smaller than 44px (e.g., a 24px icon), use `padding`, `hitSlop`, or a wrapper `View` to expand the tappable area to at least 44x44.
- **`hitSlop`** is preferred for icon buttons: `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`.
- Test touch targets on the **smallest supported device** (iPhone SE, 375pt width).

## Loading, Empty & Error States

Every screen and data-dependent component must handle three states: loading, empty, and error.

### Rules for new code

- **Loading**: Use `SkeletonLoader` components that match the final layout shape and dimensions. Never use a bare `ActivityIndicator` spinner as the primary loading state — spinners give no perception of progress or layout.
- **Empty states**: Show a helpful message + illustration/icon + a CTA pointing the user toward action. Never show a blank screen or just a single line of gray text.
- **Error states**: Show inline error cards with a retry button. **Never use `Alert.alert()` for recoverable errors** — system alerts are hostile and jarring. Reserve `Alert.alert()` only for destructive confirmations (delete account, block user).
- **Skeleton fidelity**: Skeleton loaders must match the real layout — same avatar sizes, same padding, same section structure. A skeleton that doesn't match causes a visible layout jump when data loads.
- **Background colors**: Skeletons must use `COLORS.screenBackground` (`#FDFAF7`), not `bg-white`, to prevent a white-to-cream flash on load.

## Animation & Motion System

The app uses centralized animation tokens at **`src/constants/animations.ts`**. This defines durations, easing curves, spring configs, and press scales.

### Architecture

- `DURATIONS` — `micro` (150ms), `normal` (280ms), `slow` (400ms), `emphasis` (600ms)
- `EASINGS` — `enter` (decelerate), `exit` (accelerate), `standard` (symmetric), `emphasized` (pronounced)
- `SPRINGS` — `snappy` (buttons), `responsive` (cards), `gentle` (modals), `bouncy` (celebrations)
- `PRESS_SCALES` — `subtle` (0.985, cards), `standard` (0.96, buttons), `pronounced` (0.92, icon buttons)

### Rules for new code

- **Use `DURATIONS` constants** — never hardcode timing values like `200` or `300`. Use `DURATIONS.micro` for button feedback, `DURATIONS.normal` for transitions, `DURATIONS.emphasis` for celebrations.
- **Use `SPRINGS` presets** — never hardcode `damping`/`stiffness`/`mass`. Use `SPRINGS.snappy` for button press, `SPRINGS.responsive` for card interactions, `SPRINGS.gentle` for modals, `SPRINGS.bouncy` for celebrations.
- **Use `PRESS_SCALES`** via `AnimatedPressable` — prefer `scale="standard"` over custom scale values.
- **Respect `useReducedMotion()`** — check the Reanimated hook and skip non-essential animations when the user has enabled reduced motion in iOS Settings.
- **Entrance animations** should use `FadeIn` or `SlideInRight` from Reanimated with `DURATIONS.normal`. Exit animations should be faster (`DURATIONS.micro`).
- **Don't animate everything** — routine actions (scrolling, typing, tapping) should be instant. Reserve animation for state changes, reveals, and celebrations.

## Shared UI Components

Before building custom UI, check `src/components/ui/` for existing components. **Always prefer these over raw primitives.**

### Must-use components (never reinvent)

| Instead of... | Use this | Why |
|---------------|----------|-----|
| `<View>` with manual shadow | `<Card shadow="md">` | Centralized shadow system, depth animation support |
| `<TouchableOpacity>` | `<AnimatedPressable>` | Scale animation, haptic feedback, depth press built in |
| `<Text>` with manual fontFamily | `<Body>`, `<H1>`, `<H2>`, `<H3>`, `<Label>`, `<Caption>`, `<Display>` | Auto font resolution, consistent hierarchy |
| `<TextInput>` with manual styling | `<Input>` | Consistent border states (focus, error, success), label, placeholder |
| `<SafeAreaView>` wrapper | `<ScreenWrapper>` | Handles safe area, warm background, offline banner slot |
| Manual loading spinner | `<SkeletonLoader>` or `<LoadingState>` | Layout-matching skeletons, consistent loading patterns |
| Blank screen when no data | `<EmptyState>` | Icon + message + CTA pattern, consistent empty states |
| `Alert.alert()` for errors | `<ErrorState>` | Inline error card with retry button |
| Manual chip/tag buttons | `<Chip>` or `<SimpleChip>` | Spring animation, selection state, haptic feedback |
| Manual selection buttons | `<OptionButton>` | Consistent selection styling with active/inactive states |
| Manual collapsible sections | `<CollapsibleCard>` | Animated expand/collapse with consistent styling |
| Manual avatar rendering | `<Avatar>` | Optimized image loading, fallback initials, size presets |

### Other available components

- **`Button`** — primary/secondary/ghost variants with loading state
- **`InfoModal`** — bottom sheet info modal with consistent styling
- **`OfflineBanner`** — network status banner (used inside `ScreenWrapper`)
- **`FriendCard`** — friend display card with avatar, name, actions
- **`ToastConfig`** — toast notification styling (success, error, info, warning)
- **`ErrorBoundary`** — React error boundary with fallback UI

## NativeWind vs Inline Styles

The codebase uses both NativeWind (Tailwind) classes and inline `style` props. Follow these rules to keep it consistent:

### Use NativeWind `className` for:
- **Layout** — `flex-1`, `flex-row`, `items-center`, `justify-between`
- **Spacing** — `px-4`, `py-3`, `mb-2`, `gap-2`
- **Backgrounds** — `bg-white`, `bg-neutral-50`
- **Borders** — `border`, `border-neutral-200`, `rounded-xl`
- **Text styling** — `text-sm`, `text-neutral-600`, `font-semibold`

### Use inline `style` for:
- **Design system tokens** — `style={{ ...SHADOWS.md }}`, `style={{ fontFamily: FONTS.bold }}`
- **Dynamic values** — `style={{ width: screenWidth * 0.5 }}`, `style={{ paddingTop: insets.top }}`
- **Colors from COLORS** — `style={{ color: COLORS.text.heading }}` (when the NativeWind class doesn't match the exact token)
- **Complex/conditional styles** — when a style depends on props or state

### General rule
If Tailwind has a class that maps exactly to what you need, use `className`. If you need a design system constant (`FONTS`, `SHADOWS`, `COLORS`, `FONT_SIZES`) or a dynamic value, use `style`. Don't mix — prefer one or the other per property. Never set the same property in both `className` and `style` on the same element.

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
