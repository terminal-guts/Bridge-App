export const COLORS = {
    // ── Primary ──────────────────────────────────────────────
    // #2563EB — used for action buttons (accept/heart), loading indicators,
    //           section headings, verify badges, progress fills on ProfileMatchScreen
    primary: '#2563EB',
    // #437FFF — nav bar active tint (LOCKED in AppNavigator), header backgrounds,
    //           progress bars, edit/pencil icons, chevron accents on DeepQuestionsScreen
    primaryAccent: '#437FFF',
    // #2B65F9 — button blue used in ProposalReviewView banner, vote-active borders,
    //           fire-icon color on UserRow
    primaryButton: '#2B65F9',

    // ── Text ─────────────────────────────────────────────────
    text: {
        // #0F172A — primary body text
        primary: '#0F172A',
        // #1E293B — bold headings / dark emphasis
        heading: '#1E293B',
        // #010101 — near-black used in proposal review, tag text, question titles
        black: '#010101',
        // #111111 — used for friend-row names
        dark: '#111111',
        // #4A4540 — warm neutral for profile info text (anchor sections, proposal profile)
        warmNeutral: '#4A4540',
        // #64748B — secondary / muted labels
        secondary: '#64748B',
        // #475569 — slightly darker secondary (instructions, info text)
        muted: '#475569',
        // #94A3B8 — light / placeholder text
        light: '#94A3B8',
        // #78716C — subtle detail text (waiting messages, lifestyle labels)
        subtle: '#78716C',
        // #6B7280 — label text in proposal review
        label: '#6B7280',
        // #6B5B4F — warm info labels in anchor sections
        warmInfo: '#6B5B4F',
        // #737373 — muted text on friend rows
        dimmed: '#737373',
        // #9CA3AF — disabled / inactive text
        disabled: '#9CA3AF',
        // #98A2B3 — unstarred icon color
        placeholder: '#98A2B3',
        // #A8A29E — empty-state placeholder
        ghost: '#A8A29E',
    },

    // ── Status / Semantic ────────────────────────────────────
    match: {
        text: '#166534',
        bg: '#DCFCE7',
        icon: '#22C55E',
    },
    mismatch: {
        text: '#991B1B',
        bg: '#FEE2E2',
        icon: '#EF4444',
    },
    warning: {
        // #92400E — dark amber text
        text: '#92400E',
        // #FEF3C7 — warm gold background
        bg: '#FEF3C7',
        // #F59E0B — amber icon / accent
        icon: '#F59E0B',
    },
    // #34C759 — success green used in karma badge, ProposalReviewView YES indicator
    success: '#34C759',
    // #3ECC62 — streak / community success green (UserRow streak badges)
    successAlt: '#3ECC62',
    // #10B981 — emerald for checkmarks, "complete" badges, toast success
    emerald: '#10B981',
    // #EF4444 — error / destructive red (delete icons, required asterisks, mismatch)
    error: '#EF4444',
    // #FF383C — reject red in ProposalReviewView
    rejectRed: '#FF383C',
    // #FF6B6B — urgent / expiring proposal countdown
    urgentRed: '#FF6B6B',
    // #FDB022 — star / gold accent (starred questions)
    starGold: '#FDB022',
    // #D97706 — dark amber expiration text
    darkAmber: '#D97706',
    // #D4AA01 — waiting badge text
    waitingAmber: '#D4AA01',
    // #FFA629 — warning icon in ProposalReviewView
    warningIcon: '#FFA629',
    // #FFCC00 — bright amber in ProposalReviewView
    brightAmber: '#FFCC00',

    // ── Tier / Category Accents ──────────────────────────────
    tier1: {
        bg: '#DBEAFE',
        border: '#93C5FD',
        icon: '#3B82F6',
        text: '#1E40AF',
        lightBg: '#EFF6FF',
    },
    tier2: {
        bg: '#E0E7FF',
        border: '#A5B4FC',
        icon: '#6366F1',
        text: '#4338CA',
        lightBg: '#EEF2FF',
    },
    tier3: {
        bg: '#EDE9FE',
        border: '#C4B5FD',
        icon: '#A855F7',
        text: '#7E22CE',
        lightBg: '#FAF5FF',
    },

    // ── Decorative / Category Icons ──────────────────────────
    purple: '#7C3AED',
    violet: '#8B5CF6',
    indigo: '#6366F1',
    pink: '#EC4899',
    rose: '#F43F5E',

    // ── Background ───────────────────────────────────────────
    // #FDFAF7 — universal screen background (warm off-white)
    screenBackground: '#FDFAF7',
    background: '#F8FAFC',
    // #F9FAFB — subtle off-white for unanswered cards
    backgroundSubtle: '#F9FAFB',
    // #F0F7FF — info card blue tint
    backgroundInfoBlue: '#F0F7FF',
    // #E0F2FE — light cyan info box
    backgroundInfoCyan: '#E0F2FE',
    // #FBF9F6 — warm cream background (anchor, profile sections)
    backgroundWarmCream: '#FBF9F6',
    // #FFFBEB — soft yellow (awaiting response card)
    backgroundSoftYellow: '#FFFBEB',
    // #F4F7FF — proposal review top banner
    backgroundBlueTint: '#F4F7FF',
    // #E8F0FF — icon circle background
    backgroundIconBlue: '#E8F0FF',
    // #F3F4F6 — neutral gray background (buttons, tags, badges)
    backgroundGray: '#F3F4F6',
    // #E5E7EB — medium gray background (placeholder avatars, disabled)
    backgroundGrayMedium: '#E5E7EB',
    // #F2F4F7 — progress bar track
    backgroundProgressTrack: '#F2F4F7',
    // #EEF3FF — friend row active background
    backgroundFriendActive: '#EEF3FF',
    // #EDFCF2 — success badge background
    backgroundSuccessBadge: '#EDFCF2',
    // #F3E8FF — purple tag background
    backgroundPurpleTag: '#F3E8FF',
    // #FFE8DD — amber tag background
    backgroundAmberTag: '#FFE8DD',
    // #DBEAFE — interest tag bg / tier1 highlight
    backgroundInterestTag: '#DBEAFE',
    // #D1FAE5 — values tag background
    backgroundValuesTag: '#D1FAE5',

    // ── Card / Surface ───────────────────────────────────────
    card: '#FFFFFF',

    // ── Border ───────────────────────────────────────────────
    border: '#E2E8F0',
    // #BFDBFE — medium blue border (answered question cards, info cards)
    borderBlue: '#BFDBFE',
    // #93C5FD — highlighted card border (starred, tier1)
    borderBlueBright: '#93C5FD',
    // #FCD34D — warm gold border (awaiting response photo)
    borderGold: '#FCD34D',
    // #E0EAFF — light blue border (friend rows)
    borderLightBlue: '#E0EAFF',
    // #D1D5DB — neutral gray border (dashed unanswered, disabled buttons)
    borderGray: '#D1D5DB',
    // #F0F0F0 — very light border (footer separator)
    borderLight: '#F0F0F0',
    // #F1F5F9 — subtle border (friend card divider)
    borderSubtle: '#F1F5F9',
    // #FFB8B8 — pinkish border (expiring proposal)
    borderPink: '#FFB8B8',
    // #E7DED4 — warm border (anchor bottom section)
    borderWarm: '#E7DED4',

    // ── Nav Bar (LOCKED — see CLAUDE.md) ─────────────────────
    navActiveIcon: '#437FFF',
    navInactiveIcon: '#667085',
    navIndicator: '#437FFF',

    // ── Misc / Special ───────────────────────────────────────
    // #101828 — onboarding back arrow
    onboardingIcon: '#101828',
    // #D9D9D9 — inactive pagination dot / placeholder avatar
    paginationInactive: '#D9D9D9',
    // #2B6BE6 — score value color (ProfileMatchScreen community score)
    scoreBlue: '#2B6BE6',
    // #0F1724 — card title on ProfileMatchScreen
    cardTitleDark: '#0F1724',
    // #053763 — dark navy icon
    navyIcon: '#053763',
    // #565164 — pass button background
    passButton: '#565164',
    // #8B4545 — dark red text (expiring proposal details)
    darkRedText: '#8B4545',
    // #065F46 — dark green text (values tags)
    darkGreenText: '#065F46',

    // ── Toast Backgrounds ────────────────────────────────────
    toast: {
        success: '#10B981',
        info: '#437FFF',
        warning: '#F59E0B',
        error: '#EF4444',
    },

    // ── Modal Overlays ─────────────────────────────────────────
    overlay: {
        light: 'rgba(0, 0, 0, 0.35)',
        medium: 'rgba(0, 0, 0, 0.50)',
        heavy: 'rgba(0, 0, 0, 0.65)',
    },
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};
