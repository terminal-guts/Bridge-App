# Bridge Launch Plan — March 27 to March 30

## Current State
- **Accepted build**: 1.0.0 (20), uploaded March 16 — approved, held for manual release
- **Current work**: Matchmaker mode implementation + all changes since accepted build
- **Branch**: `session/security-perf-bugfix` (5 commits ahead of main + uncommitted changes)
- **No outside testers** — internal only
- **Backend deployed**: `get-proposals-for-voting` updated (matchmakers can vote)

---

## Friday Night (March 27) — TONIGHT

### 8:30 PM - 10:30 PM: Core Implementation (DONE)
- [x] Phase 9: Dead code cleanup (delete MatchmakerHomeScreen, ghost profile screens, matchmakerService)
- [x] Phase 1: Backend (remove matchmaker voting block, deployed to Supabase)
- [x] Phase 2: Onboarding (matchmaker step array, progress bar animation, route params for role switch)
- [x] Phase 3: Community (remove 3 voting gate bypasses)
- [x] Phase 5: ProfileMatchScreen (minimal matchmaker card when viewing matchmaker profiles)
- [x] Phase 8: Exclude matchmakers from proposals (UserRow, friendProposalService)
- [x] Phase 7: Notification routing (role-aware: MatchmakerTabs vs MainTabs)
- [x] Phase 6: Settings (hide Pause Profile, add Switch to Dater with confirmation + onboarding re-entry)
- [x] Phase 4: Profile screen (verified — existing matchmaker rendering intact)
- [x] Phase 10: Edge case fixes (no dangling imports, guide check preserved, profileCompleted verified)

### 10:30 PM - 12:00 AM: Build Verification
- [ ] Run `npx tsc --noEmit` — verify no TypeScript errors
- [ ] Fix any compilation issues
- [ ] Review all changes in `git diff` for correctness
- [ ] Commit all changes

**Goal**: All implementation complete, code compiles clean

---

## Saturday Morning (March 28)

### 8:00 AM - 10:00 AM: Manual Testing — Matchmaker Flows
Test on simulator or physical device via Expo Dev Client.

**Matchmaker Onboarding (Critical Path):**
1. [ ] Fresh signup → Email → Verify → Name → select "Help my friends" → progress bar animates smoothly from ~21 to 7 segments → First Votes step loads proposals → vote on 1 → Photo step → skip photo → Add Friends → lands on MatchmakerTabs
2. [ ] Repeat but add a photo during MatchmakerProfileStep → photo persists
3. [ ] On role step: select matchmaker → switch back to dater → switch to matchmaker again → no crash, progress bar animates each time
4. [ ] Select "Find my person" (dater) → full 21-step onboarding proceeds normally
5. [ ] Force-quit app during matchmaker onboarding → reopen → verify no crash

**Matchmaker Community Tab:**
6. [ ] Matchmaker lands on Community → sees voting gate with proposals
7. [ ] Vote yes on a proposal → vote bar updates in real time
8. [ ] Vote no on a proposal → vote bar updates
9. [ ] Complete 3 votes → gate clears → friends area visible
10. [ ] ProfileCompletionBanner does NOT appear for matchmakers
11. [ ] Zero friends state → empty state with invite code + invite button
12. [ ] Add a friend via code → friend appears in list

**Matchmaker Profile Tab:**
13. [ ] "Matchmaker" badge visible with lock icon
14. [ ] "You're not in the dating pool. Your friends are." subtext visible
15. [ ] "Change Photo" button visible and works
16. [ ] No "Edit Profile" or "Preview Profile" buttons
17. [ ] No About/Badges/Questions tabs rendered

**Matchmaker Settings:**
18. [ ] Navigate to Settings → "Pause Profile" row is NOT visible
19. [ ] "Switch to Dater" card is visible with "Join the dating pool yourself" subtitle
20. [ ] Tap "Switch to Dater" → confirmation alert appears
21. [ ] Cancel → stays in settings
22. [ ] Confirm → navigates to onboarding starting at AgeStep
23. [ ] Complete all demographic steps → role updates to dater → MainTabs with Matches tab

### 10:00 AM - 12:00 PM: Manual Testing — Dater Regression
Ensure all existing dater flows are unchanged.

**Dater Onboarding:**
24. [ ] Full dater onboarding: Email → Verify → Name → Role (select dater) → First Votes → Age → Gender → ... → Welcome → MainTabs
25. [ ] All demographic steps collect data correctly
26. [ ] PhotoUploadStep uploads photos to Supabase storage
27. [ ] PreferencesStep saves match preferences

**Dater Community:**
28. [ ] Voting gate appears → vote on proposals → gate clears
29. [ ] Proposal card expands → ProposalReviewView renders correctly
30. [ ] Compatibility score shows hash-based 70-99 value (not raw DB score)
31. [ ] "Suggest a Match" (SuggestMatchScreen) works → pick friend A → pick friend B → confirm
32. [ ] Friends area shows friend list with streaks, karma, vote buttons

**Dater Matches:**
33. [ ] Matches tab shows matches (if any exist)
34. [ ] Match card displays correctly
35. [ ] Chat opens from match card → can send messages
36. [ ] Match expiry timer renders

**Dater Profile:**
37. [ ] Profile tab shows full profile with About/Badges/Questions tabs
38. [ ] Edit profile button works → ProfileEditScreen loads
39. [ ] Preview profile button works → shows profile as others see it
40. [ ] Profile completion ring shows in tab bar when incomplete

**Dater Settings:**
41. [ ] "Pause Profile" visible
42. [ ] "Switch to Dater" NOT visible (daters don't see this)
43. [ ] All notification toggles work
44. [ ] Sign out works cleanly
45. [ ] Delete account shows confirmation

---

## Saturday Afternoon

### 12:00 PM - 2:00 PM: Stress Testing
Push the app to its limits to find edge cases and crashes.

**Navigation Stress:**
46. [ ] Rapid tab switching (Community → Profile → Community) 20 times fast → no crash
47. [ ] Deep navigation: Community → Leaderboard → back → Settings → back → Profile → no stack corruption
48. [ ] Background app → foreground → navigate → no stale state
49. [ ] Kill app → cold start → correct role routing (matchmaker → MatchmakerTabs, dater → MainTabs)
50. [ ] Kill app → cold start with NO network → app shows offline banner, no crash

**Onboarding Stress:**
51. [ ] Start matchmaker onboarding → force-quit on step 4 (role) → reopen → no zombie state
52. [ ] Start dater onboarding → complete 10 steps → go back 10 steps → go forward again → data preserved
53. [ ] OnboardingProposalStep with 0 available proposals → auto-skips without crash
54. [ ] Double-tap "Continue" on any onboarding step → only advances once (guard against double-submit)

**Voting Stress:**
55. [ ] Vote on a proposal → immediately swipe to next → no race condition
56. [ ] Open proposal detail → rotate device (if applicable) → no layout break
57. [ ] Vote → kill app → reopen → vote persisted (not lost)

**Profile Viewing Stress:**
58. [ ] View a matchmaker friend's profile → back → view a dater friend's profile → correct rendering each time
59. [ ] View profile with no photos → placeholder shown, no crash
60. [ ] View profile with very long bio/answers → text doesn't overflow or clip

**Role Switch Stress:**
61. [ ] Switch to Dater flow: complete 5 steps → go back 5 steps → complete again → no duplicate data
62. [ ] Switch to Dater: force-quit mid-flow → reopen → app is in consistent state
63. [ ] After switch: verify MainTabs renders with 3 tabs (Community, Matches, Profile)
64. [ ] After switch: verify notification routing now uses MainTabs

**Notification Stress:**
65. [ ] Receive push notification as matchmaker → tap → routes to MatchmakerTabs Community
66. [ ] Receive push notification as dater → tap → routes to MainTabs Matches/Community correctly
67. [ ] Notification received while app is killed → cold start → routes correctly

**Data Integrity:**
68. [ ] Create matchmaker account → verify `role = 'matchmaker'` in database
69. [ ] Verify matchmaker does NOT appear in `generate-proposals` output
70. [ ] Verify matchmaker DOES appear in `get-proposals-for-voting` voter assignments
71. [ ] Switch to dater → verify `role = 'dater'` updated in database
72. [ ] After switch → verify user now appears in proposal pool

### 2:00 PM - 4:00 PM: Bug Triage + Fixes
- [ ] Categorize any bugs found: P0 (blocker), P1 (major), P2 (minor), P3 (cosmetic)
- [ ] Fix all P0 and P1 bugs
- [ ] Document P2/P3 for post-launch

### 4:00 PM - 6:00 PM: Build + TestFlight
- [ ] Commit all changes (implementation + fixes)
- [ ] Run `npx tsc --noEmit` final check
- [ ] Start EAS build: `eas build --platform ios --profile production`
- [ ] Build processing (~15-30 min)
- [ ] Push to TestFlight (internal testers)

**Goal**: TestFlight build live

---

## Saturday Night

### 6:00 PM - 10:00 PM: TestFlight Device Testing
- [ ] Install TestFlight build on your iPhone
- [ ] Run through critical path tests on real hardware:
  - Matchmaker onboarding (tests 1-5)
  - Matchmaker community voting (tests 6-9)
  - Matchmaker profile (tests 13-17)
  - Dater regression (tests 24, 28-29, 33-34, 37)
  - Cold start (test 49)
- [ ] Note any device-specific issues (keyboard, safe area, gestures)
- [ ] Fix any showstopper bugs found on device
- [ ] Rebuild + re-push to TestFlight if fixes were needed

**Goal**: TestFlight build verified on real device

---

## Sunday Morning (March 29)

### 8:00 AM - 12:00 PM: Final Verification + Polish
- [ ] Second pass through all critical tests on TestFlight build
- [ ] Verify reviewer bypass still works (Apple test account login)
- [ ] Check all edge functions are deployed and responding
- [ ] Any final bug fixes → rebuild if needed

**Goal**: Ship-ready build on TestFlight

---

## Sunday Afternoon

### 12:00 PM - 2:00 PM: Submit App Store Update
- [ ] Open App Store Connect
- [ ] Create new version (or update existing)
- [ ] Upload latest build from TestFlight
- [ ] Select **"Manually release this version"**
- [ ] Include reviewer bypass credentials in "Notes for Review"
- [ ] Verify screenshots and App Store metadata are current
- [ ] Submit for review

**Goal**: App Store update submitted

---

## Sunday Evening

### 2:00 PM - 11:00 PM: Monitor Review
- Monitor App Store Connect for review status
- **If approved**: Click "Release This Version" → live within 30-60 min
- **If not yet approved**: Wait — typical update review is 12-24 hrs

---

## Monday (March 30) — Contingency

### Morning: Monitor
- Check App Store Connect
- Apple reviews Mon-Fri during US Pacific business hours
- Sunday afternoon submissions usually clear by Monday morning/midday

### Afternoon: Release
- **If approved**: Release manually → go live

### Evening (HARD DEADLINE):
- **If approved**: Verify app is live and functioning
- **If NOT approved**:
  - **Option A**: Release the current accepted build (1.0.0 build 20) as-is — it's already approved
  - **Option B**: Request expedited review (reason: "time-sensitive campus launch")
  - **Do NOT delay launch waiting for the update** — the accepted build is the fallback

---

## Timing Assumptions

| Step | Best Case | Typical | Worst Case |
|---|---|---|---|
| EAS build | 15 min | 30 min | 2 hr |
| TestFlight processing | 10 min | 20 min | 2 hr |
| App Store update review | 1-4 hr | 12-24 hr | 2-5 days |
| Manual release after approval | 15 min | 30 min | 2 hr |

## Decision Gates

| Gate | When | Criteria |
|---|---|---|
| Feature complete | Friday night | All 10 phases implemented |
| Build compiles | Friday night / Sat morning | `tsc --noEmit` passes |
| Manual QA pass | Saturday noon | Tests 1-45 pass |
| Stress test pass | Saturday 2 PM | Tests 46-72 pass, no P0 bugs |
| EAS build green | Saturday 6 PM | Build succeeds |
| TestFlight verified | Saturday night | Device testing clean |
| Ship ready | Sunday noon | Second pass clean |
| Submit update | Sunday 2 PM | No P0 bugs remaining |
| Go live | Sunday night or Monday | Apple approves + manual release |

## Fallback
The currently accepted build (1.0.0 build 20) is approved and held for manual release. If the new build doesn't pass review in time, release the accepted build to go live on schedule. Submit the matchmaker update afterward.

## Test Summary
- **72 total test cases**
- Tests 1-23: Matchmaker-specific flows (onboarding, community, profile, settings)
- Tests 24-45: Dater regression (onboarding, community, matches, profile, settings)
- Tests 46-72: Stress testing (navigation, onboarding, voting, profile, role switch, notifications, data integrity)
