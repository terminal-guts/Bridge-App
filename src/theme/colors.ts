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
    // #93B4FF — disabled primary button background
    primaryButtonDisabled: '#93B4FF',

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
    // #F97316 — warm orange for end-match icon
    warmOrange: '#F97316',
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
    pink: '#EC4899',

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

    // ── Skeleton / Shimmer ────────────────────────────────────
    // #E8E2DB — warm skeleton bone color (matches warm off-white palette)
    skeletonBone: '#E8E2DB',
    // rgba(255,255,255,0.15) — translucent overlay for skeleton placeholders on dark surfaces
    skeletonOverlay: 'rgba(255,255,255,0.15)',

    // ── Misc / Special ───────────────────────────────────────
    // #D9D9D9 — inactive pagination dot / placeholder avatar
    paginationInactive: '#D9D9D9',
    // #2B6BE6 — score value color (ProfileMatchScreen community score)
    scoreBlue: '#2B6BE6',
    // #0F1724 — card title on ProfileMatchScreen
    cardTitleDark: '#0F1724',
    // #565164 — pass button background
    passButton: '#565164',
    // #D0D5DD — light divider / chevron / radio-off color
    borderDivider: '#D0D5DD',
    // #101828 — near-black headings / close buttons
    textDarkHeading: '#101828',
    // #344054 — medium dark text (secondary emphasis, stat values)
    textGray800: '#344054',
    // #374151 — dark gray inline edit text
    textGray700: '#374151',
    // #E4E7EC — neutral gray border (inputs, pills, text areas)
    borderNeutral: '#E4E7EC',
    // #D1DEFF — light periwinkle border (invite banners, add-friend buttons)
    borderPeriwinkle: '#D1DEFF',
    // #FAFBFC — very subtle off-white background (text areas)
    backgroundOffWhite: '#FAFBFC',
    // #FFF4ED — warm peach background (end match icon)
    backgroundWarmPeach: '#FFF4ED',
    // #FEF3F2 — soft red background (report icon)
    backgroundSoftRed: '#FEF3F2',
    // #FEF2F2 — lighter soft red (recording bar background)
    backgroundRecordingRed: '#FEF2F2',
    // #FECACA — red-200 border (recording bar border)
    borderRecordingRed: '#FECACA',
    // #F0F4FF — light blue card background (date proposal, impact card)
    backgroundLightBlue: '#F0F4FF',
    // #D0DBFF — medium blue border (date proposal card)
    borderMediumBlue: '#D0DBFF',
    // #8E8E93 — system gray (no match state)
    systemGray: '#8E8E93',
    // #FF9500 — system orange (stats icons, category accents)
    systemOrange: '#FF9500',
    // #AF52DE — system purple (stats icons, active voters)
    systemPurple: '#AF52DE',
    // #E8EEFF — light periwinkle background (rank card gradient stop)
    backgroundPeriwinkle: '#E8EEFF',
    // #EBF2FF — light blue icon badge background
    backgroundBlueBadge: '#EBF2FF',
    // #FDE68A — warm gold border for featured badges
    borderGoldLight: '#FDE68A',
    // #2952CC — deep blue shadow (invite button, about me card)
    shadowBlue: '#2952CC',
    // #0284C7 — sky blue shadow (progress header)
    shadowSky: '#0284C7',
    // #B45309 — dark amber text for interest tags / featured badges
    amberText: '#B45309',
    // #059669 — match reason green text
    matchReasonGreen: '#059669',
    // #6B21A8 — deep purple compatibility text
    purpleDeep: '#6B21A8',
    // #4F46E5 — indigo tier 2 icon color
    indigo: '#4F46E5',
    // #8B5CF6 — violet accent icons
    violet: '#8B5CF6',
    // #4B5563 — muted gray icon color
    grayIcon: '#4B5563',
    // #065F46 — dark emerald text for values tags
    emeraldText: '#065F46',
    // #DC2626 — danger / needs attention red
    danger: '#DC2626',
    // #16A34A — positive rank change green
    rankUp: '#16A34A',
    // #F43F5E — rose accent for bio/question icons
    rose: '#F43F5E',
    // #1D4ED8 — blue-700 text for match mutual interests
    blueText: '#1D4ED8',
    // #B91C1C — critical red (getting started level)
    criticalRed: '#B91C1C',

    // ── Podium / Leaderboard ──────────────────────────────────
    // #FFD700 — gold ring border (1st place)
    podiumGold: '#FFD700',
    // #C0C0C0 — silver ring border (2nd place)
    podiumSilver: '#C0C0C0',
    // #CD7F32 — bronze ring border (3rd place)
    podiumBronze: '#CD7F32',

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
