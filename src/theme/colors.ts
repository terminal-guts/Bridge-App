/**
 * Bridge Color System v3 — "Less Is More"
 *
 * ~25 tokens. 3 text grays, 1 blue accent, 3 status colors.
 * 80% neutral, 15% blue, 5% status.
 *
 * Rule: For every blue pixel, ask "Can the user tap this?"
 * If no, make it gray or black.
 */

export const COLORS = {
    // ── Primary Accent (the ONE color) ──────────────────────────
    // #2563EB — all buttons, CTAs, progress bars, links, selected states
    primary: '#2563EB',
    // #437FFF — nav bar active tint (LOCKED), lighter interactive accents
    primaryAccent: '#437FFF',
    // #93B4FF — disabled primary button background
    primaryDisabled: '#93B4FF',
    // #4A7FDB — secondary section headers (e.g. "Your crew"), distinct from primary action blue
    primaryMuted: '#4A7FDB',
    // #EFF6FF — very subtle blue tint for card/section backgrounds
    primaryLight: '#EFF6FF',
    // rgba(67, 127, 255, 0.06) — barely-there blue wash for backgrounds
    primaryTint: 'rgba(67, 127, 255, 0.06)',

    // ── Text (3 levels — that's it) ─────────────────────────────
    text: {
        // #1E293B — headings, names, card titles, anything bold
        primary: '#1E293B',
        // #64748B — body text, descriptions, labels, metadata
        secondary: '#64748B',
        // #64748B — timestamps, placeholders, input hints.
        // Darkened from #94A3B8 on 2026-04-19 to meet WCAG AA (4.5:1) on
        // screenBackground #FDFAF7. For purely decorative/disabled text use
        // `text.disabled` below — which intentionally stays light.
        tertiary: '#64748B',
        // #94A3B8 — disabled/decorative text only. Fails WCAG AA on
        // screenBackground; never use for information the user must read.
        disabled: '#94A3B8',
    },

    // ── Backgrounds (2 colors) ──────────────────────────────────
    // #FDFAF7 — every screen. Our signature warm off-white.
    screenBackground: '#FDFAF7',
    // #FFFFFF — cards, modals, sheets, elevated surfaces
    card: '#FFFFFF',

    // ── Borders (2 colors) ──────────────────────────────────────
    // #E2E8F0 — standard borders, input borders, card borders, dividers
    border: '#E2E8F0',
    // #F0F0F0 — very subtle separators (barely visible)
    borderLight: '#F0F0F0',
    // #E7DED4 — warm-toned borders for cozy/soft contexts (zero-state cards, etc.)
    borderWarm: '#E7DED4',

    // ── Status (3 colors — only when communicating state) ───────
    // #34C759 — match confirmed, profile complete, positive outcomes
    success: '#34C759',
    // #EF4444 — destructive actions, validation errors, report confirmations
    error: '#EF4444',
    // #F59E0B — timer warnings, pending states, "almost expired"
    amber: '#F59E0B',

    // ── Nav Bar (LOCKED — see CLAUDE.md) ────────────────────────
    // Active icon/indicator uses primaryAccent (#437FFF)
    // #667085 — inactive tab icons
    navInactiveIcon: '#667085',

    // ── Skeleton / Shimmer ──────────────────────────────────────
    // #E8E2DB — warm skeleton bone color
    skeletonBone: '#E8E2DB',
    // rgba(255,255,255,0.15) — skeleton overlay on dark surfaces
    skeletonOverlay: 'rgba(255,255,255,0.15)',

    // ── Leaderboard Podium (scoped to 1 screen) ─────────────────
    podiumGold: '#FFD700',
    podiumSilver: '#C0C0C0',
    podiumBronze: '#CD7F32',

    // ── Toast (system-level feedback) ────────────────────────────
    toast: {
        success: '#10B981',
        info: '#437FFF',
        warning: '#F59E0B',
        error: '#EF4444',
    },

    // ── Modal Overlays ──────────────────────────────────────────
    overlay: {
        light: 'rgba(0, 0, 0, 0.35)',
        medium: 'rgba(0, 0, 0, 0.50)',
        heavy: 'rgba(0, 0, 0, 0.65)',
    },
};
