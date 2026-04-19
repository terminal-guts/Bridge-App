# Bridge — Agent Operating Rules

Rules for autonomous development agents working in the Bridge codebase. This is a **production app** deployed to the App Store. Every change must meet production standards.

---

## 1. Mandatory Workflow

Every task follows this sequence. No exceptions.

### 1.1 Understand Before Acting

1. **Read the task fully.** Identify what is being asked — feature, bug fix, refactor, polish, or research.
2. **Read all relevant source files** before proposing changes. Never modify code you haven't read.
3. **Check CLAUDE.md** for locked values and system constraints. Violating a LOCKED section is a critical error.
4. **Check TODO.md** for priority order, existing plans, and what's already done. Do not re-implement completed work.
5. **Check BRIDGE_VISION.md** when the task involves product logic, user-facing copy, or feature design.
6. **Check docs/notifications/SPEC.md** when touching notifications, push, cron jobs, or engagement features.

### 1.2 Explore the Codebase

Before writing code:

- Search for existing implementations of what you're building. Use grep/glob, not guesses.
- Identify shared components, constants, and utilities that already solve part of the problem.
- Check `src/components/ui/` for reusable UI primitives (Card, AnimatedPressable, Typography, etc.).
- Check `src/constants/` and `src/theme/` for design tokens.
- Check `src/services/` for existing service patterns.
- Check `supabase/functions/_shared/` for backend utilities.
- Trace data flow end-to-end: screen → hook → service → Supabase table/edge function.

### 1.3 Write an Implementation Plan

For any task that touches more than one file or involves non-trivial logic:

1. Write a plan **before writing code**.
2. Store plans in `scripts/agent_plan.md` (overwrite — this is a scratch file, not a log).
3. Plans must include: files to modify, approach, risks, and anything that needs user confirmation.
4. For tasks touching the database, list exact table/column/RLS changes.
5. For tasks touching edge functions, specify which functions change and how.

Skip planning only for single-file, obvious changes (typo fixes, constant updates, style tweaks).

### 1.4 Implement

- Make changes file by file. Test incrementally when possible.
- Keep diffs minimal. Change only what the task requires.
- If a change reveals a pre-existing bug, note it but don't fix it unless asked.

### 1.5 Verify

- Re-read modified files to confirm correctness.
- Check for TypeScript errors (`npx tsc --noEmit` on relevant files if uncertain).
- Run existing tests if the changed code has test coverage. See **TODO.md § Tests to Write** for pending test priorities.
- For UI changes, verify the component tree renders correctly with the existing design system.

---

## 2. Architecture Discipline

### 2.1 Directory Structure

```
src/
  components/       # Reusable UI components (organized by domain)
    ui/              # Shared primitives: Card, Typography, AnimatedPressable, etc.
    community/       # Community/voting UI
    matches/         # Match-related UI
    friends/         # Friend-related UI
    profile/         # Profile UI
    guides/          # Onboarding guides
  screens/           # Screen-level components (one per route)
  services/          # Data access, business logic, API calls
  hooks/             # Custom React hooks
  constants/         # Static values: colors, typography, spacing
  theme/             # Design system tokens: shadows, depth
  contexts/          # React contexts
  navigation/        # React Navigation configuration
  types/             # TypeScript type definitions
  utils/             # Pure utility functions
  config/            # App configuration
  lib/               # Third-party library wrappers

supabase/
  functions/         # Edge functions (Deno)
    _shared/         # Shared utilities (scoring, push, etc.)
  migrations/        # SQL migrations

scripts/             # Dev scripts, test seeders, diagnostics
```

### 2.2 Rules

- **Never create new top-level directories** without explicit permission.
- **Never create new files** when an existing file can be extended.
- **Component extraction**: only extract a sub-component when it has 3+ props or is reused across screens. Don't extract for the sake of extraction.
- **Services**: all Supabase calls go through `src/services/`. Screens never call Supabase directly.
- **Types**: shared types go in `src/types/`. Component-local types stay in the component file.
- **Edge functions**: each function gets its own directory under `supabase/functions/`. Shared logic goes in `_shared/`.

### 2.3 Import Conventions

- Use absolute imports from `src/` (configured via `tsconfig.json` paths).
- Import design tokens from their canonical sources:
  - Colors: `src/constants/colors.ts`
  - Typography: `src/constants/typography.ts`
  - Shadows: `src/theme/shadows.ts`
  - Spacing: `src/constants/spacing.ts` (if it exists, otherwise use the 4px grid directly)
- Never import from a file marked as legacy or deleted in CLAUDE.md.

---

## 3. Code Quality Standards

### 3.1 TypeScript

- Strict mode. No `any` unless interfacing with an untyped third-party API, and annotate why.
- All function parameters and return types must be inferable or explicit.
- Use discriminated unions over `type` fields with `string`.
- Prefer `interface` for object shapes, `type` for unions and mapped types.
- No unused imports, variables, or parameters. Clean up what you touch.

### 3.2 React Native / Expo

- **Functional components only.** No class components.
- **Hooks**: follow rules of hooks. No conditional hook calls.
- **Memoization**: use `useMemo`/`useCallback` only when there's a measurable performance reason (large lists, expensive computations, passing callbacks to memoized children). Don't pre-optimize.
- **FlatList** for any list >20 items. Never use `.map()` inside ScrollView for long lists.
- **Platform-specific code**: use `Platform.OS` checks. Shadow depth animations are iOS-only (document why).
- **Accessibility**: all interactive elements need `accessibilityLabel`. Images need `accessibilityRole="image"`.
- **Touch targets**: minimum 44px per Apple HIG.

### 3.3 Styling

- Prefer `StyleSheet.create` for static styles.
- Keep Reanimated/Gesture animated styles inline (they must be).
- Use NativeWind/Tailwind classes for layout when the component already uses them. Don't mix paradigms within a single component without reason.
- Follow the **4px grid** for all spacing values: 4, 8, 12, 16, 20, 24, 32, 40, 48, etc.
- Never hardcode colors — use `COLORS` constants.

### 3.4 State Management

- Local state (`useState`) for component-scoped data.
- React Context for cross-component state that doesn't change frequently.
- Supabase Realtime for live data (votes, messages, streaks).
- No Redux, Zustand, or MobX — this project doesn't use them.

### 3.5 Error Handling

- Service functions should return errors, not throw them, unless the error is truly exceptional.
- Edge functions: always return proper HTTP status codes with JSON error bodies.
- Never swallow errors silently. Log them or surface them to the user.
- Database operations in edge functions must handle connection errors gracefully.

---

## 4. Design System Compliance

These rules are non-negotiable. Breaking them degrades the product.

### 4.1 Typography

See **CLAUDE.md § Typography System** for the full 3-layer architecture and weight mapping. Key rules:

- **Font**: Plus Jakarta Sans only. Import `FONTS` from `src/constants/typography`.
- **Always set `fontFamily`** alongside `fontWeight` in inline styles. Use `FONTS.bold`, never raw font strings.
- **Prefer Typography components** (`<Body>`, `<H1>`, `<Label>`, etc.) over raw `<Text>`.
- **Never introduce** Outfit, Satoshi, Inter, or system fonts.

### 4.2 Shadows & Depth

See **CLAUDE.md § Shadow & Depth System** for the full architecture and exports. Key rules:

- **Use `SHADOWS` from `src/theme/shadows.ts`** — never hardcode shadow values.
- **Card component**: use `shadow` prop (e.g., `<Card shadow="lg">`), not numeric `elevation`.
- **Overlays**: use `OVERLAYS` constants for backdrop opacity. Never hardcode `rgba(0,0,0,...)`.
- **AnimatedPressable**: use `animateDepth` + `depthLevel` for interactive depth.
- Shadow colors: warm brown palette on iOS. Android uses numeric elevation only.
- `src/utils/shadows.ts` is **deleted** — never reference it.

### 4.3 Colors

- All colors come from `COLORS` in `src/constants/colors.ts`.
- Active tint: `#437FFF`. Inactive tint: `#667085`. These are locked values.
- Accent glows for badges: `accentBlue`, `accentGreen`, `accentRed`, `accentGold`, `accentSilver`, `accentBronze`.

### 4.4 Animation

- **Library**: Reanimated 3 for all animations. No `Animated` from React Native core.
- **Accessibility**: respect `useReducedMotion()`. Disable non-essential animations when reduced motion is on.
- **Haptics**: use `expo-haptics`. Light impact for taps, medium for confirmations, heavy for destructive actions.
- **Durations**: micro-interactions 100-200ms, transitions 250-350ms, emphasis 400-600ms.
- **Easing**: `Easing.out` for entrances, `Easing.in` for exits, spring for interactive elements.

---

## 5. Product & UX Alignment

### 5.1 Brand Voice

Every piece of user-facing text must follow Bridge's brand voice. See **BRIDGE_VISION.md § Brand Voice Guidelines** for full word lists, tone examples, and the 5-question decision framework.

Quick reference:
- **DO**: community, authentic, real, genuine, thoughtful, intentional, accessible, welcoming, down-to-earth
- **DON'T**: exclusive, elite, premium, VIP, select, privileged, sophisticated, members-only, invite-only
- **NEVER use "dating"** in user-facing copy. Use "find your person", "match", "connect".
- When unsure, apply the test: "Would Raya say this?" If yes, rewrite.

### 5.2 Locked Features

These are deliberate product decisions documented in CLAUDE.md. Do not modify without explicit instruction:

- **Bottom navigation bar** — all dimensions, colors, and positions are finalized.
- **Compatibility score display** — always uses hash-based 70-99 decorative value, never the DB column.

### 5.3 Scrapped Features

Do not implement or reference:

- Non-negotiables system
- Friend Superpowers
- Friendship tiers
- Daily surveys / 3-candidate grid
- `DailyGridView` component

### 5.4 Feature Decisions

Before building any new feature, check:

1. Is it in TODO.md? If marked "Deferred" or "Not Approved", do not build it.
2. Does it align with Bridge's philosophy of scarcity, community, and ritual?
3. Does it add complexity without clear user benefit?
4. Does it create a have/have-not split on a small campus?

If a requested feature conflicts with the product philosophy, flag the conflict. Don't silently build something that undermines the product.

---

## 6. Safety Constraints

### 6.1 Protected Contributors

Code authored by **LivingW123** or **A-Arav0307** is off-limits. Before modifying any file:

1. Run `git log --follow <file>` to check authorship.
2. If their code must change, ask for explicit permission.

### 6.2 Secrets & Environment

- **Never commit** `.env`, `credentials.json`, API keys, or service role keys.
- **Never log** secrets, tokens, or user PII to console.
- Scripts that need the service role key read it from `.env` — never hardcode it.
- The Supabase JWT is embedded directly in cron commands. If the key rotates, crons must be re-created.

### 6.3 Database Safety

- **Default to read-only.** Never write to the database without explicit permission.
- **No psql access** — use `scripts/supabase-exec.sh` or `scripts/supabase-query.sh`.
- **Migrations**: write SQL migration files in `supabase/migrations/`. Do NOT run `supabase db push` — use `exec_sql` RPC instead.
- **Never DROP tables** or columns without explicit permission and a backup plan.
- **RLS**: every new table must have Row Level Security enabled with appropriate policies.
- **Test migrations** against existing data mentally before applying. Consider foreign keys, NOT NULL constraints, and default values.

### 6.4 Edge Function Deployment

- `supabase functions deploy <name>` works. Use it for individual function deploys.
- Test edge functions locally with `supabase functions serve` before deploying.
- Edge functions that modify the database must handle errors gracefully — a notification failure must never block a parent INSERT/UPDATE.

### 6.5 Git Safety

- **Never force-push.**
- **Never amend published commits.**
- **Never delete branches** without permission.
- **Never use `--no-verify`** to skip hooks.
- Commit messages should describe what changed and why, not just "fix bug".

### 6.6 Destructive Operations

Before performing any of these, ask for confirmation:

- Deleting files or directories
- Dropping database objects
- Removing or downgrading dependencies
- Resetting git state
- Modifying cron jobs
- Changing RLS policies on existing tables

---

## 7. Research & Documentation

### 7.1 When to Research

Research before implementing when:

- The task involves a pattern you haven't seen in this codebase before.
- You're unsure about React Native/Expo/Supabase best practices for a specific scenario.
- The task involves animation, haptics, accessibility, or platform-specific behavior.
- The task involves a third-party library integration.

### 7.2 RESOURCES.md

`RESOURCES.md` is the reference library for design, product, and engineering resources relevant to Bridge.

**When to update:**
- You discover a resource that directly informs a Bridge feature or pattern.
- A resource in the file returns a 403/404 (mark for removal).
- A resource is outdated and a better alternative exists.

**Rules:**
- Only add resources that are directly relevant to Bridge's tech stack, product model, or target market.
- Include a one-line description explaining why the resource matters.
- Organize under the existing section headings. Create a new section only if none fit.
- Do not add generic programming tutorials or beginner-level content.

### 7.3 Documentation Boundaries

Each markdown file has a distinct responsibility. Do not create overlap.

| File | Responsibility |
|------|---------------|
| `CLAUDE.md` | Agent-facing technical constraints: locked values, system architecture, coding rules |
| `BRIDGE_VISION.md` | Product vision, philosophy, feature specs, matching system, business model |
| `TODO.md` | Active work items, priorities, polish queue, deferred features |
| `docs/notifications/SPEC.md` | Notification types, copy, triggers, cron schedule, anti-fatigue rules |
| `RESOURCES.md` | External reference links organized by topic |
| `.claude/AGENT_RULES.md` | This file — agent operating workflow and quality standards |

**If you need to add documentation:**
- Technical constraints or coding rules → CLAUDE.md
- Product decisions or feature specs → BRIDGE_VISION.md
- Work items or status tracking → TODO.md
- External references → RESOURCES.md
- Agent workflow rules → this file

Never duplicate information across files. Reference the canonical source instead.

---

## 8. Evaluating Existing Code

When reviewing or modifying existing code:

1. **Don't refactor what you weren't asked to refactor.** A bug fix is not an invitation to restructure the file.
2. **Don't add comments, docstrings, or type annotations** to code you didn't change.
3. **Don't "improve" working code** unless the improvement is part of the task.
4. **Do fix TypeScript errors** you introduce.
5. **Do clean up imports** in files you modify (remove unused ones you created).
6. **Do note pre-existing issues** without fixing them — mention them to the user.
7. **Respect the screen priority order** in TODO.md when choosing what to work on.

---

## 9. Finishing Work

### 9.1 Before Declaring Done

- [ ] All modified files compile without TypeScript errors.
- [ ] No hardcoded colors, shadows, fonts, or overlay values.
- [ ] No `any` types introduced without justification.
- [ ] No unused imports or variables left behind.
- [ ] Design system tokens used correctly (FONTS, SHADOWS, COLORS, OVERLAYS).
- [ ] Accessibility labels on new interactive elements.
- [ ] Touch targets ≥ 44px on new buttons/pressables.
- [ ] User-facing copy follows brand voice (no forbidden words).
- [ ] No secrets or PII in logs or committed files.
- [ ] Changes respect LOCKED sections in CLAUDE.md.
- [ ] Plan in `scripts/agent_plan.md` updated or cleaned up.

### 9.2 Communicating Results

- Report what changed, what files were modified, and any decisions made.
- If the task was ambiguous, explain the interpretation you chose and why.
- Flag any follow-up work or risks discovered during implementation.
- Do not pad responses with summaries of what the user already knows.

---

## 10. Test IDs & Environment

For testing and debugging, use these known user IDs:

| Name | UUID |
|------|------|
| Saul | `f2007ea8-c145-4ccc-bf5c-0e5db2258283` |
| Carter | `8d24c252-d636-44c8-86ad-72e7381482b8` |
| Shyla | `66ac610c-b164-43a7-afd8-82d6f9dd07fa` |
| Mo | `db0bd2fd-9fb8-41ef-bdf6-0bddf0661458` |
| Sam | `156e5f79-3950-482e-99a4-d858d6084794` |
| Molly | `3ae08fed-c47f-4044-a5ca-f67be336ef90` |
| Oneal | `e0238639-7c48-413f-a39c-9c2a04ae4812` |
| Ava | `d909b1d9-60f6-4a9a-b4b7-e945e8208e87` |
| Abby | `d8aa2e79-f4cf-4d52-b5aa-03a0c13a0c88` |

The old IDs (`f4985c2c`, `82d7199b`, `b853df7d`, `66264173`) do not exist.

For database access rules, see **section 6.3**.

---

*This document governs all autonomous agent behavior in the Bridge repository. When in doubt, read the code, check the docs, and ask before acting.*
