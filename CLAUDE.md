# Bridge App — Claude Code Instructions

## Codebase Status

This is the **production codebase** for Bridge — the app being deployed to the App Store. It contains both the frontend (React Native/Expo) and backend (Supabase, in the `supabase/` subdirectory). Treat all code here as production-quality.

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
