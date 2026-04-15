# Bridge — TODO

Actionable work items only. Completed items removed — check git history.

---

## Priority Screens

| Priority | Screen | File |
|----------|--------|------|
| 1 | Community | `src/screens/main/CommunityScreen.tsx` |
| 2 | Match Proposal | `src/screens/match/MatchProposalScreen.tsx` |
| 3 | Matches | `src/screens/match/MatchesScreen.tsx` |
| 4 | Onboarding | `src/screens/onboarding/OnboardingScreen.tsx` |
| 5 | Friend Proposal | `src/screens/community/FriendProposalScreen.tsx` |

---

## Bugs

- [ ] Leaderboard: rank gap when anonymous users tie. Root cause: SQL RANK() skips numbers on ties + edge function assigns duplicate anon IDs causing FlashList to drop a row. Fix: use DENSE_RANK() + unique anon IDs.
- [ ] BUG-1: Add OfflineBanner to ScreenWrapper or 13+ screens that lack it
- [ ] BUG-2: Add double-tap debounce guard to AnimatedPressable/Button
- [ ] `deciding` notification tap does nothing — server sends `deciding`, client handles `proposal_deciding`. Add `'deciding'` to type check. File: `src/navigation/AppNavigator.tsx:472`
- [ ] `vote_reminder` notification tap does nothing — no handler. Route to Community tab. File: `src/navigation/AppNavigator.tsx`

---

## Security — P1

- [ ] SEC-2: Add Twilio signature verification to `receive-support-reply` (prevents spoofed admin messages)
- [ ] SEC-4: Tighten `proposal_votes` RLS to `auth.uid() = voter_user_id` (currently any user can see all votes)
- [ ] SEC-5: Re-enable RLS on `daily_surveys` table (missed during tier re-enablement)
- [ ] SEC-6: Move hardcoded PII to env vars — phone in `receive-support-reply`/`send-support-message`, email in `notify-report`
- [ ] SEC-8: Add rate limiting to `validate-reviewer-access` (currently unlimited brute-force attempts)
- [ ] SEC-9: Add server-side rate limiting to `send-email-verification` (client-side limit trivially bypassed)
- [ ] SEC-10: Replace raw Postgres error messages with generic errors in 5+ edge functions
- [ ] SEC-13: Consider fail-closed for `moderate-text` (currently returns `is_safe: true` on any error)
- [ ] SEC-14: Add blocked-user check in `getFullUserProfileById` / `ProfileMatchScreen`

## Security — P2

- [ ] `friend_grid_completions` RLS disabled — check if table still used, re-enable if so
- [ ] `proposals` table exposes `compatibility_score` to all authenticated users via RLS
- [ ] Replace `.select('*')` with explicit column lists on sensitive tables
- [ ] Add input length validation on `exit_reason`, `rejection_reason` in edge functions
- [ ] Add `maxLength` to onboarding TextInputs (name, school, job)

---

## Performance — P1

- [ ] PERF-3: Add URL caching (stablePhotoUrlsRef) to ProfileMatchScreen (re-signs every render)
- [ ] PERF-4: Extract inline renderItem callbacks to useCallback (5 locations: MatchProposalScreen, ProfileScreen.questions, PhotoCarousel, LeaderboardScreen, UserRow)
- [ ] PERF-5: Add visibility gates to infinite pulse animations (UserRow, MatchCard, SkeletonLoader)
- [ ] PERF-6: Add `useReducedMotion()` checks to 5+ animation components
- [ ] PERF-7: Pause Lottie animations when tab loses focus (Community empty state)

## Performance — P2

- [ ] Remove unused Tailwind color palettes (~100KB CSS bloat)
- [ ] Profile queries: consolidate 4 round-trips into joined select
- [ ] Implement image presets (avatar 256px, card 600px) to reduce memory for small containers
- [ ] Pre-load confetti JSON at module init (prevents jank on first vote)
- [ ] Add cleanup to WelcomeScreen mesh orb animations on unmount
- [ ] Add `recyclingKey` to all list-rendered images

---

## Notifications

**Status as of 2026-04-15:** All 8 notification edge functions are deployed. Only transactional notifications (match, message, deciding, shared celebration) are actually firing — they use DB triggers. The 6 cron-based notification jobs (vote reminder, ice breaker, morning leaderboard, streak at risk, dormant users, match expiring) were **never added to pg_cron**. The functions exist and work, but nothing calls them.

### Cron jobs to create
- [ ] `notify-vote-reminder` — 8 PM Central (`0 1 * * *`)
- [ ] `notify-ice-breaker` — every 4h (`15 */4 * * *`)
- [ ] `notify-morning-leaderboard` — 8:30 AM Central (`30 13 * * *`)
- [ ] `notify-streak-at-risk` — 6 PM Central (`0 23 * * *`)
- [ ] `notify-dormant-users` — 12 PM Central (`0 17 * * *`)
- [ ] `notify-match-expiring` — every 4h (`0 */4 * * *`)

### Other notification fixes
- [ ] `send-weekly-summary` bypasses `send-push.ts` — no preference gating, no logging, no dedup. Rewrite to use shared `sendPush`. File: `supabase/functions/send-weekly-summary/index.ts`
- [ ] `send-weekly-summary` has no cron job — `snapshot-weekly-karma` runs but doesn't chain to it
- [ ] `pref_nudges_enabled` not exposed in Settings — users can't opt out of nudge notifications. File: `src/screens/profile/SettingsScreen.tsx`
- [ ] Preference `syncToServer` is fire-and-forget — can silently revert on next app open. File: `src/services/notificationPreferencesService.ts`
- [ ] Create `karma_scores` row during onboarding — if proposal step is skipped, matchmaker has no row. File: `src/services/profileService.onboarding.ts`

---

## Tests to Write

- `__tests__/services/streakTrackingService.test.ts`
- `__tests__/services/nudgeService.test.ts`
- `__tests__/services/notificationEngagement.test.ts`

---

## Deferred Features (Post-Launch — not scheduled)

| Feature | Notes |
|---------|-------|
| Google Auth | Not started |
| Dark Mode | Requires ~150+ dark color variants, full design pass |
| Hot Take Prompts | Revisit once campus engagement data exists |
| Instagram In-App Photos | Pull via IG API (like Hinge). Larger engineering effort |
| Import Real Badge Icons | Replace 42 placeholder SVGs with real icon assets |
| Recommend-to-Friend | See `_deferred/suggest-a-match/DEFERRED.md` |

---

## Ideas (Not Approved — Brainstorm Only)

These are feature ideas that haven't been approved or scheduled. Kept here as a reference.

### Engagement
- **Social proof counters** — "X votes cast today", "3 friends voted", blurred friend votes
- **Leaderboard promotion card** — Preview card in Community tab (rank + weekly karma + gap to #1)
- **FOMO cards** — Grayed-out missed proposals: "[Friend]'s match decided without you"
- **Matchmaker profile/stats** — Accuracy rate, total votes, assists, all streaks
- **Shared celebrations UI** — Group celebration when friends helped a match happen (notification wired, UI not)
- **Streak milestone celebrations** — Toast + haptic when crossing 7/14/30 day streaks
- **Streak death toast** — Toast when a streak drops to 0
- **Friend edge 2x callout** — "Your vote counts 2x" when voting on a friend's proposal
- **Reframe percentages as vibes** — Replace "25% Match" with "Different vibes" / "Good match" / "Soulmates"
- **Live real-time vote count** — Supabase Realtime so vote bar updates live
- **Friend milestones** — Progressive benefits at friend count thresholds (1/3/5/10 friends)

### UX Enhancements
- **Bridge Break** — Reject 5 straight matches → frozen 1 week (anti-chronic-rejector)
- **Conversation Starters** — Auto-generated from profile overlap ("You both love Tarantino")
- **Mini-games** — "2 Truths & a Lie" to break ice in chat
- **Mutual interest notifications** — Daily push: "You both love Tarantino films"
- **"The Reveal"** — Cinematic match delivery (blur → pulse → slow photo reveal with haptics)
- **"Accuracy Reveal"** — Post-match scoreboard showing voters their accuracy
- **"The Ripple"** — Social proof voting feedback ("You and 4 others voted Yes")
- **"Friend Accuracy Rankings"** — Show each friend's voting accuracy on your proposals
- **"Matchmaker Moments"** — Shareable story cards when a match happens
- **"The Drop"** — 7PM countdown theater before new proposals
- **"Blind Spot"** — Hidden question reveal (answer the same question to unlock)
- **"What Happened While You Were Gone"** — Return screen after 24h+ absence
