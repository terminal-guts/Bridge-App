# Bridge — TODO

Everything remaining across all planning docs, consolidated here. Completed items have been removed — check git history for historical planning docs.

---

## Beta Feedback (Unresolved)

### In Progress
- Profile strength 100% at 1 photo → triggers `profile_completed` → enters matchmaking pool (gate matchmaking on `profile_completed = true`)
- Beginner explanation system (Risus asked what the timer was) — friend working on it

### TODO
- Friend code needs to be clickable/copyable when sent
- Onboarding: transition from code entry to name entry is unnatural (Leif)
- Onboarding: lifestyle page should indicate more buttons to scroll to beneath cannabis (Leif)
- Onboarding: page transition polish — Leif likes haptics but not the transitions
- Onboarding: photos/profile should be uploaded before hitting "get started" button (Leif)
- Load profile changes locally before pushing to Supabase — delay is annoying (Leif)
- "Already helped" bug — says user helped a friend even though they didn't (Leif)
- Loading screen is a little blurry (Leif)
- Audio proposal not working (general bug)

---

## Engagement Features (Not Implemented)

### Addiction Blueprint — Remaining Items
From the engagement research (Hook Model, variable reinforcement, network effects). See `NOTIFICATION_STRATEGY.md` for the notification tier system (implemented).

| Feature | Description | Status |
|---------|-------------|--------|
| Post-vote crowd reveal | "You and X others voted Yes!" / "Bold call — only 23% agree" | Not done |
| Confetti on Yes votes | Wire existing `Confetti.tsx` on Yes votes + 3rd vote gate unlock | Not done |
| Vote flash micro-celebrations | Color flash overlay (green/red/amber) on vote cast | Not done |
| Social proof counters | "X votes cast today", "3 friends voted", blurred friend votes | Not done |
| Leaderboard promotion card | Preview card in Community tab (rank + weekly karma + gap to #1) | Not done |
| FOMO cards | Grayed-out missed proposals — "[Friend]'s match decided without you" | Not done |
| Weekly summary | Sunday 7PM: "This week: X votes, Y matches, Z accuracy" | Not done |
| Matchmaker profile/stats | Accuracy rate, total votes, assists, all streaks | Not done |
| Shared celebrations (UI) | Group celebration when friends helped a match happen (notification is wired, UI is not) | Not done |
| Streak milestone celebrations | Toast + haptic when crossing 7/14/30 day streaks | Not done |
| Streak death toast | Toast when a streak drops to 0 | Not done |
| `streakTrackingService.ts` | AsyncStorage persistence for cross-session streak detection (was built but reverted, needs re-creation) | Not done |
| Streak callback wiring | Wire `onStreakMilestone`/`previousStreakDays` props from `FriendsAreaView`/`CommunityScreen` into `UserRow` | Not done |
| Settings notification subtitles | Update `SettingsScreen.tsx` notification toggle subtitles to reflect tier system | Not done |
| Friend edge 2x callout | "Your vote counts 2x" when voting on a friend's proposal | Not done (held) |
| Reframe percentages as vibes | Replace "25% Match" with labels like "Different vibes" / "Good match" / "Soulmates" with color coding | Not done (held) |
| Animated proposal entrance | Photos slide in from left/right with parallax when proposal loads | Not done (held) |
| Live real-time vote count | Supabase Realtime subscriptions so vote bar updates live when others vote | Not done (held) |

### What's Already Done (Engagement)
- Streak visual overhaul (4-tier system in `UserRow.tsx`: legendary/hot/warm/new/none with sublabels, glow, pulse)
- Smart notification sequence (tiered cap system in `notificationService.ts`: 3/day Tier 2 cap, cooldowns)
- Accuracy karma notifications (realtime channel, 6h cooldown)
- Friend nudge (NudgeButton + send-nudge edge function, deployed)
- Notification strategy documented (`NOTIFICATION_STRATEGY.md`)

### Friend Milestones (Proposal — Not Approved)

Progressive benefits at friend count thresholds. Design principles: never gate core functionality, reward density don't punish scarcity, benefits should be natural consequences.

| Milestone | Benefits |
|-----------|----------|
| **1 friend** — "Getting Started" | Core access: receive proposals, vote on theirs |
| **3 friends** — "Your Crew" | Voting insights (Yes/No counts after resolution), streak leaderboard visibility |
| **5 friends** — "Connected" | Weekly matchmaker stats, "recommend to friend" during voting, leaderboard eligibility |
| **10 friends** — "Inner Circle" | Proposal boost (priority in generation queue), detailed match insights, profile flair |

**What to avoid:** Don't gate voting. Don't add extra proposals. Don't stack karma multipliers. Don't create have/have-not splits at a small campus.

---

## Onboarding Compression (Deferred)

Compress 20 onboarding steps → 8-10 screens (2-4 related fields per screen). Needs hands-on user involvement.

**Proposed grouping:**
1. Matchmaking Mode (keep)
2. Sign Up — email + verification (keep)
3. **About You** — name + birthday + gender + pronouns
4. **Your Details** — height + ethnicity + religion + children
5. **Your Life** — education + job + political beliefs + lifestyle
6. **What You're Into** — interests + values (2 multi-selects)
7. Photos (keep)
8. Preferences (keep)
9. Add Friends (keep)
10. Welcome (keep)

Also consider: defer children, political beliefs, lifestyle to post-first-vote profile completion prompt.

---

## Deferred Feature Ideas (Post-Launch)

| Feature | Notes |
|---------|-------|
| Hot Take Prompts | "Hot Take of the Day" card on Community tab (not in voting flow). One prompt/day, inline card with live results. Revisit once campus engagement data exists. |
| Vote Before Profile | Let new users vote during onboarding. Needs steady proposal flow (10+ active proposals). |
| Instagram In-App Photos | Pull via IG API (like Hinge) instead of linking out. Larger engineering effort. |
| Anonymous Friend-to-Friend Proposals | Queued suggestion system respecting 7PM cycle. Approved with redesign — needs `friend_suggestions` table, rewritten edge function, generate-proposals integration. |
| Google Auth | Not started (Phase 3) |
| Online Now Tags | On hold |

---

## V3 Features — Status

| Feature | Decision |
|---------|----------|
| Ban System | Merged + deployed. Auto-suspends at 3+ reports. |
| Friend Nudge | Merged + deployed. NudgeButton + send-nudge edge function. |
| Hot Take Prompts | Deferred — don't interrupt voting flow |
| Vote Before Profile | Deferred — no proposals for new users at small launch |
| Instagram Link | Dropped — pulls users off-app. Future: in-app IG API integration |
| Anonymous Friend Proposals | Approved with major redesign (queued system) — not built yet |

---

## Screen-by-Screen Polish Queue

Priority order. Use established design system (4px grid, COLORS constants, FONTS/TEXT_STYLES, 44px touch targets, WCAG contrast).

1. **ProposalReviewView** — detailed refinement plan below
2. **MatchRevealScreen** — animation polish, partner info layout, reveal drama
3. **MatchesScreen** — active match card, past matches, empty states, expiry timer
4. **ChatScreen** — bubbles, input bar, audio messages, typing indicators
5. **ProfileScreen** — photo carousel, info sections, endorsements, deep questions
6. **ProfileEditScreen** — hub layout, section navigation, auto-save feedback
7. **OnboardingScreen** — transitions, progress indicator, field styling
8. **SettingsScreen** — section cards, navigation items, destructive actions
9. **LeaderboardScreen** — rank display, prize callout, user rows (mock data Phase 1)
10. **StatsScreen** — stat cards, data visualization, empty states

### ProposalReviewView Refinement Plan

Target: `src/components/community/proposal/ProposalReviewView.tsx` (~2082 lines). Constraints: uses Animated API (not Reanimated), compatibility badge is LOCKED, do NOT touch icons.

**Tier 1 — High-Impact, Low-Effort:**
| Item | What |
|------|------|
| Vote button hierarchy | Yes button too short (46px) vs secondary (63px). Fix: Yes→52px with glow, secondary→48px horizontal layout |
| Hardcoded colors → tokens | Replace `BLUE=#2563EB` etc. with `COLORS.primary`, `COLORS.success`, `COLORS.rejectRed` from theme |
| Typography tokens | Replace hardcoded font sizes with `FONT_SIZES` / `TEXT_STYLES` from typography constants |
| Empty state | Use existing `EmptyState` component with illustration instead of plain text |
| Progress dots | Active dot pulse animation, clearer completed color, "1 of 3" label |

**Tier 2 — High-Impact, Medium-Effort:**
| Item | What |
|------|------|
| Photo responsive sizing | `PHOTO_HEIGHT = Math.max(220, Math.min(screenHeight * 0.36, 340))` — test SE through Pro Max |
| Extract StyleSheet | ~150 inline styles → `StyleSheet.create` in 4 phases (sub-components → main render). Keep Animated styles inline |
| Section card accents | 3px colored left-border per section type (blue/emerald/purple/amber), padding 12→16 |
| Smart pill spacing | Gap 6→8px, add column headers, increase divider margin. Fix colorblind accessibility |
| Scroll-to-top after vote | `scrollTo({ y: 0 })` on advance timeout |
| Badge positioning | Sit in divider gap between photos, fix "87 %" → "87%" |

**Tier 3 — Medium-Impact, Higher-Effort:**
| Item | What |
|------|------|
| Sub-component extraction | Split into `proposal/` directory: PhotoCard, LiveVoteBar, QuestionCarousel, SmartPillCloud, SectionCard, ComparisonRows, ForFriendModal, proposalUtils |
| Entrance animation | Opacity 0→1 + translateX 30→0 over 250ms |
| Vote micro-interactions | Scale spring on press. Yes: pulse 1.03. No: horizontal shake. Not Sure: tilt |

**Cross-cutting:** Spacing audit (off-grid values → `SPACING` constants). WCAG contrast fixes (secondary button opacity 0.5→0.6, LiveVoteBar label color).

**Implementation order:** Colors+typography → Buttons+empty+dots → StyleSheet A+B → Photo+badge+scroll → Section cards+pills → StyleSheet C+D → Sub-component extraction → Animations.

---

## Tests to Write

- `__tests__/services/streakTrackingService.test.ts`
- `__tests__/services/nudgeService.test.ts`
- `__tests__/services/notificationEngagement.test.ts`

---

## Cleanup

- [ ] RESOURCES.md: remove Sarah Tavel link (Medium 403) and Coffee Meets Bagel / CIO Dive link (JS-only)

---

## Engagement Strategy Context

### Hook Model (Nir Eyal)
4-phase cycle: Trigger → Action → Variable Reward → Investment. Bridge needs all 4 phases working.

### Variable Ratio Reinforcement (UND Paper, Larson 2024)
Unpredictable rewards trigger stronger dopamine than predictable ones (slot machine effect). Applied via: accuracy bonus (random timing), crowd reveal (variable percentages), karma popups.

### Network Effects (NFX Bible)
Personal network effects (friends) are strongest. Bridge needs density per user — each friend added makes the product better for everyone in that cluster.

### Choice Overload (Behavioral Science, 2024, n=804)
30% buy from small selection vs 3% from large — validates Bridge's single-proposal model.

### Three Growth Loops
1. **Daily Engagement**: 7PM trigger → Vote 3 → Variable reward → Unlock Friends → Help friends → Streak grows → 7PM next day
2. **Friend Recruitment**: Join → Add friends → Vote → Friend matched → Word of mouth → New users
3. **Social Status**: Vote accurately → Karma grows → Leaderboard rank → Competition → More voting

### Metrics Targets
- Votes/user/day: 5+ (currently ~3)
- 7PM open rate: 60%+
- D7 retention: 50%+
- Average streak length: 14+ days
- Notification opt-in: 70%+
- Friends/user: 4+
