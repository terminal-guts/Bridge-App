# Bridge — TODO

Everything remaining across all planning docs, consolidated here. Completed items have been removed — check git history for historical planning docs.

---

## Priority Screens

These are the most important screens in the app. All work (polish, bugs, features) should prioritize these first.

| Priority | Screen | File |
|----------|--------|------|
| 1 | Community | `src/screens/main/CommunityScreen.tsx` |
| 2 | Match Proposal | `src/screens/match/MatchProposalScreen.tsx` |
| 3 | Matches | `src/screens/match/MatchesScreen.tsx` |
| 4 | Onboarding | `src/screens/onboarding/OnboardingScreen.tsx` |
| 5 | Friend Proposal | `src/screens/community/FriendProposalScreen.tsx` |

---

## Beta Feedback (Unresolved)

### TODO
- Onboarding: transition from code entry to name entry is unnatural (Leif)
- Onboarding: lifestyle page should indicate more buttons to scroll to beneath cannabis (Leif)
- Onboarding: page transition polish — Leif likes haptics but not the transitions
- Audio proposal not working — audio recording/playback only exists in match chat, never implemented for proposals. Clarify if this feature is still wanted.

### Resolved
- ~~Profile strength 100% gating~~ — Done. `profile_completed` flag gates matchmaking in both edge functions + frontend.
- ~~Beginner explanation system~~ — Done. Full guide system: `GuideContext`, `GuideOverlay`, 5 guide configs (beginner tour, proposals, profile, tabs, friends area).
- ~~Friend code clickable/copyable~~ — Done. `FriendCodeCard` with clipboard + haptic + "Copied!" feedback.
- ~~"Already helped" bug~~ — Done.
- ~~Confetti on Yes votes~~ — Done. LottieView confetti fires on yes vote in ProposalReviewView.
- ~~Post-vote crowd reveal~~ — Scrapped. Static messages removed.
- ~~Loading screen blurry~~ — Done. Generated proper 1284x2778 splash.png with icon centered at native resolution. Switched from `contain` to `cover`.
- ~~Photos upload before "get started"~~ — Done. Background upload starts immediately after PhotoUploadStep; `completeOnboarding` uses pre-uploaded URLs.
- ~~Profile edit delay~~ — Done. SectionScreenWrapper now navigates back immediately; Supabase save runs in background. Alert shown only on failure.

---

## Engagement Features (Not Implemented)

### Addiction Blueprint — Remaining Items
From the engagement research (Hook Model, variable reinforcement, network effects). See `NOTIFICATION_SYSTEM_SPEC.md` for the notification tier system (implemented).

| Feature | Description | Status |
|---------|-------------|--------|
| Post-vote crowd reveal | "You and X others voted Yes!" / "Bold call — only 23% agree" | Scrapped |
| Confetti on Yes votes | Wire existing `Confetti.tsx` on Yes votes | **Done** |
| Social proof counters | "X votes cast today", "3 friends voted", blurred friend votes | Not done |
| Leaderboard promotion card | Preview card in Community tab (rank + weekly karma + gap to #1) | Not done |
| FOMO cards | Grayed-out missed proposals — "[Friend]'s match decided without you" | Not done |
| Weekly summary | Sunday 7PM: "This week: X votes, Y matches, Z accuracy" | Not done |
| Matchmaker profile/stats | Accuracy rate, total votes, assists, all streaks | Not done |
| Shared celebrations (UI) | Group celebration when friends helped a match happen (notification is wired, UI is not) | Not done |
| Streak milestone celebrations | Toast + haptic when crossing 7/14/30 day streaks | Not done |
| Streak death toast | Toast when a streak drops to 0 | Not done |
| Streak callback wiring | Wire `onStreakMilestone`/`previousStreakDays` props from `FriendsAreaView`/`CommunityScreen` into `UserRow` | Not done |
| Settings notification subtitles | Update `SettingsScreen.tsx` notification toggle subtitles to reflect tier system | Not done |
| Friend edge 2x callout | "Your vote counts 2x" when voting on a friend's proposal | Not done (held) |
| Reframe percentages as vibes | Replace "25% Match" with labels like "Different vibes" / "Good match" / "Soulmates" with color coding | Not done (held) |
| Live real-time vote count | Supabase Realtime subscriptions so vote bar updates live when others vote | Not done (held) |

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

## Engagement Ideas — Brainstorm (Not Approved)

Creative engagement concepts organized by implementation effort. These are ideas only — none are approved or scheduled.

### Tier 1 — High-Impact, Buildable Now

| # | Idea | Description |
|---|------|-------------|
| 1 | **"The Reveal" — Cinematic Match Delivery** | When a proposal passes, don't just show a card. Full-screen cinematic: blur → pulse → slow photo reveal with haptics. Make receiving a match feel like opening a gift. The 3-second delay before showing who it is creates anticipation dopamine. |
| 2 | **"Accuracy Reveal" — Post-Match Scoreboard** | After a match is accepted/rejected, show voters their accuracy: "You voted Yes — and they matched! +3 karma." Delayed feedback loop keeps voters invested in outcomes days after voting. |
| 3 | **"The Ripple" — Social Proof Voting Feedback** | After casting a vote, show a ripple animation with: "You and 4 others voted Yes" or "Bold call — only 23% agree." Variable social validation — sometimes you're with the crowd, sometimes you're the outlier. Both feel rewarding. |
| 4 | **"Friend Accuracy Rankings"** | In the Friends Area, show each friend's voting accuracy on YOUR proposals: "Carter: 3/4 accurate." Creates friendly competition and makes friends care more about voting thoughtfully. |
| 5 | **"Matchmaker Moments" — In-App Stories** | When a match happens, generate a shareable story card: "[Friend] helped match [Name]! 🎉 They voted Yes on Day 2." Celebrates the matchmaker, not just the couple. Drives word-of-mouth when shared outside the app. |

### Tier 2 — Medium Effort, High Payoff

| # | Idea | Description |
|---|------|-------------|
| 6 | **"The Drop" — 7PM Countdown Theater** | 60-second countdown on Community tab before new proposals drop. Screen dims, countdown pulses, haptic ticks at 10s. When it hits zero: confetti burst + new proposal slides in. Turns the daily cycle into an event. |
| 7 | **"Blind Spot" — Hidden Question Reveal** | One deep question answer is hidden behind a blur. To reveal it, you must answer the same question about yourself first. Creates reciprocity and curiosity gap — "What did they say about their biggest fear?" |
| 8 | **"Vote Streak Multiplier"** | Voting on all 3 daily proposals triggers a "Perfect Day" badge + 2x karma for the next day's first vote. Rewards completionism without punishing casual users. |
| 9 | **"What Happened While You Were Gone"** | Return screen after 24h+ absence: "While you were away: 2 friends got proposals, Carter's streak hit 7 days, 47 votes were cast in your circle." FOMO-driven re-engagement without guilt-tripping. |

### Tier 3 — Wild / Unconventional

| # | Idea | Description |
|---|------|-------------|
| 10 | **"The Whisper" — Anonymous Micro-Feedback** | After voting, optionally leave a 1-word anonymous note for the person: "adventurous", "genuine", "funny." Recipient sees: "A voter called you 'genuine'." Tiny ego boost that makes people check back. |
| 11 | **"Gut Check" — Speed Round Voting** | Optional 10-second speed round: see just the photo + name, vote purely on gut feeling. Then see the full profile and vote again. If your votes match, bonus karma. Tests and rewards intuition. |
| 12 | **"The Coin Flip" — Deadlocked Proposal Tiebreaker** | When votes are exactly split at expiry, show a dramatic coin flip animation instead of auto-resolving. Both outcomes feel earned rather than algorithmic. |
| 13 | **"First Impression Flash" — 1-Second Photo Reaction** | Before the full proposal loads, flash the main photo for exactly 1 second then blur it. Ask: "First impression?" with emoji reactions (🔥 😊 🤔). Creates a priming moment and gives the proposee anonymous crowd sentiment. |

---

## Deferred Feature Ideas (Post-Launch)

| Feature | Notes |
|---------|-------|
| Hot Take Prompts | "Hot Take of the Day" card on Community tab (not in voting flow). One prompt/day, inline card with live results. Revisit once campus engagement data exists. |
| Vote Before Profile | Let new users vote during onboarding. Needs steady proposal flow (10+ active proposals). |
| Instagram In-App Photos | Pull via IG API (like Hinge) instead of linking out. Larger engineering effort. |
| Google Auth | Not started (Phase 3) |
| Online Now Tags | On hold |
| Import Real Badge Icons | Replace 42 placeholder character trait SVGs with real icon assets. Source from icon pack, place in `assets/icons/badges/`, run `scripts/generate-badge-registry.js`. |
| Badge Award Notification | Push notification when someone awards you a badge (variable reward timing). Low priority — may not need. |
| Recommend-to-Friend | Feature fully deferred pre-launch. See `_deferred/suggest-a-match/DEFERRED.md` to re-enable both Recommend to Friend (voting) and Suggest a Match (two friends). Backend tables live. | Deferred |
| Dark Mode | Deferred — requires ~150+ dark color variants, NativeWind dark config, conditional component styling, dark shadow palette, Figma designs. Not safe without dedicated design pass. See `scripts/agent_plan.md`. |

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
9. **LeaderboardScreen** — rank display, prize callout *(skeleton loader done, FlashList migration done, live data)*
10. **StatsScreen** — stat cards, data visualization, empty states

### ProposalReviewView Refinement Plan

Target: `src/components/community/proposal/ProposalReviewView.tsx`. Uses Reanimated. Compatibility badge is LOCKED.

**Remaining:**
| Item | What |
|------|------|
| Extract StyleSheet | Modal content inline styles (step 1/2 headings, person selection cards, friend list items). Major blocks done. |
| Off-grid spacing | 10px margins in pill sections → `SPACING` constants |

---

## Tests to Write

- `__tests__/services/streakTrackingService.test.ts`
- `__tests__/services/nudgeService.test.ts`
- `__tests__/services/notificationEngagement.test.ts`

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
