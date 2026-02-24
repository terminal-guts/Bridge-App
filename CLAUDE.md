# Bridge App — Claude Code Instructions

## LOCKED: Bottom Navigation Bar

The bottom nav bar values in `src/navigation/AppNavigator.tsx` (`CustomTabBar`) are **finalized and must not be changed** without explicit user instruction. Do not adjust any of the following:

- `contentHeight = Math.round(screenHeight * 0.057)` — bar height as % of screen
- `iconSize = Math.round(contentHeight * 0.65)` — icon size proportional to bar
- `iconPaddingTop = Math.round(contentHeight * 0.25)` — icon vertical placement proportional to bar
- `top: 0` on the blue indicator — keeps it flush at the top border
- Indicator dimensions: `width: 40, height: 3`, color `#437FFF`
- Active tint: `#437FFF`, inactive tint: `#667085`

These were tuned to match the Figma design and confirmed by the user. Leave them alone.
