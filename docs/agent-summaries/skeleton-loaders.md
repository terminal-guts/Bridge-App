# Agent Summary — Skeleton Loader Coverage

**Session date:** 2026-04-19
**Branch:** `plan/proposal-gate-overhaul`
**Trigger:** User reported Settings felt laggy ("thought the app glitched") and asked whether PR #32 should be merged into the feature branch, plus an independent audit of skeleton coverage.

---

## TL;DR

1. **PR #32 is merged** into `plan/proposal-gate-overhaul` (real 2-parent merge at `8f9c21e`). PR is closed on GitHub.
2. **Follow-up commit `14198c1`** adds 4 more skeletons (Settings, Chat, MatchPreferences, Badges) and fixes the Settings flicker the user reported.
3. Nothing deployed to prod. All changes are frontend-only and ride the normal EAS build review gate.
4. **Not yet visually tested in simulator** — only type-checked. Next step should be `npx expo start -c` and navigating into each screen.

---

## Part 1 — Merging PR #32

### PR #32 background
- Title: "Replace bare ActivityIndicator with layout-matching skeletons"
- Author: Jules bot (automated)
- Base: `main`, so ~30+ commits behind the current feature branch
- Touched 8 files, added 6 new skeleton components:
  - `BlockedUsersSkeleton`, `SuggestMatchSkeleton`, `ContactInviteSkeleton`, `ProfileMatchSkeleton`, `FriendListSkeleton`, `ProposalReviewSkeleton`

### Merge mechanics
- Clean merge except for one conflict in `src/screens/onboarding/steps/OnboardingProposalStep.tsx`: HEAD had a newer "no proposals available — here's how Bridge works" explainer that PR didn't know about.
- Resolution: keep HEAD's explainer for the empty-state path, adopt PR's `ProposalReviewSkeleton` for the loading-state path.

### History note (one piece of cruft)
There's a stale commit `e584f85` earlier in the branch titled "Merge PR #32: layout-matching skeleton loaders" that only contains the conflict resolution for `OnboardingProposalStep` — not a real merge. It's a residue from the first merge attempt where `git commit --no-edit` failed and dropped `MERGE_HEAD`. The actual merge is `8f9c21e`. Harmless, but noise if you read the log.

---

## Part 2 — My own gap audit

After the PR merged, I grepped `ActivityIndicator` across `src/screens` and classified each usage as:
- **Primary loading state** — blocks the whole screen until data arrives. These need skeletons.
- **Inline / button indicator** — small spinner inside a button or row while an action runs. These stay as `ActivityIndicator`.

### Gaps PR #32 did NOT cover

| Screen / component | Severity | Fix applied |
|---|---|---|
| `SettingsScreen.tsx` | High (user-reported flicker) | Added `SettingsSkeleton` + gated render on both `profileLoaded && prefsLoaded` so matchmaker-only rows and toggle values don't pop in |
| `ChatScreen.tsx:452–462` | Medium | Replaced "Opening your conversation..." spinner with `ChatSkeleton` (alternating bubbles) |
| `MatchPreferencesScreen.tsx` | Medium | Replaced generic `LoadingState` with `MatchPreferencesSkeleton` (6 section-card placeholders) |
| `ProfileScreen.sections.tsx:232` | Low | Replaced bare `ActivityIndicator` in Badges tab with `BadgesSkeleton` |

### Deliberately NOT changed (correctly inline spinners)

- `BadgeAwardModal.tsx` — submit button spinner
- `FriendRequestCard.tsx` — accept/reject processing spinner
- `ShareMatchSheet.tsx` — "Creating your card..." preview spinner
- `ChatScreen.tsx:570` — send-message button spinner
- `SupportChatScreen.tsx:270` — send-message button spinner
- `AudioPlayer.tsx:110` — audio buffering spinner
- `MatchPreferencesScreen.tsx:374` — "Saving..." indicator
- `OnboardingScreen.tsx:701` — "Creating your profile..." blocking modal spinner (blocking flow, spinner is appropriate)
- `EditPhotosScreen.tsx:294` — per-thumbnail upload indicator
- `BlockedUsersScreen.tsx:242` — add-block button spinner
- `ContactInviteScreen.components.tsx:105` — add-friend button spinner
- `SuggestMatchScreen.tsx:208` — submit button spinner
- `ProfileMatchScreen.tsx:670` — like button spinner
- `EmailVerificationScreen.tsx:236` / `EmailSignUpVerificationStep.tsx:184` — "Verifying..." during OTP check

### Gaps also NOT covered (low priority, left alone)

- `OnboardingScreen.tsx:94` — `StepLoadingFallback` for Suspense boundary during step code-split. Briefly visible during step transitions. Could use a skeleton but the spinner is fine given how quickly steps resolve.

---

## Part 3 — Settings flicker fix (the user's actual report)

The user said Settings felt like "the app glitched." Root cause was not a missing skeleton — it was that `SettingsScreen` had **no loading state at all** and rendered immediately with defaults:

- `userRole` defaulted to `'dater'` → matchmaker-only rows ("Switch to Standard") rendered hidden, then popped in if the user is actually a matchmaker
- `prefsLoaded = false` → all 4 notification toggles rendered OFF, then flicked to their real values when `notificationPreferencesService.getPreferences()` resolved

Fix (`src/screens/profile/SettingsScreen.tsx`):
1. Added `profileLoaded` state, flipped to `true` in the `getUserProfile().then()` handler.
2. Added `isReady = profileLoaded && prefsLoaded` gate.
3. Render `<SettingsSkeleton />` while `!isReady`, real UI once both are loaded.

---

## Files changed

### From PR #32 (via merge commit `8f9c21e`)
```
src/components/ui/SkeletonLoader.tsx
src/components/ui/index.ts
src/components/community/proposal/ProposalReviewView.components.tsx
src/screens/community/SuggestMatchScreen.tsx
src/screens/friends/ContactInviteScreen.components.tsx
src/screens/onboarding/steps/OnboardingProposalStep.tsx  (conflict-resolved)
src/screens/profile/BlockedUsersScreen.tsx
src/screens/profile/ProfileMatchScreen.tsx
```

### From follow-up commit `14198c1`
```
src/components/ui/SkeletonLoader.tsx        (+4 new skeletons)
src/components/ui/index.ts                  (export new skeletons)
src/screens/profile/SettingsScreen.tsx      (skeleton + flicker fix)
src/screens/match/ChatScreen.tsx            (replace spinner)
src/screens/profile/MatchPreferencesScreen.tsx  (replace LoadingState)
src/screens/main/ProfileScreen.sections.tsx (replace badges spinner)
```

---

## Verification status

- [x] TypeScript: `npx tsc --noEmit -p tsconfig.json` — no new errors from the touched files. (Pre-existing test-file errors unrelated.)
- [ ] **Not run**: visual verification in simulator. Recommended next step: `npx expo start -c` and navigate:
  - Profile → Settings — confirm skeleton → settled UI, no toggle flicker
  - Match → any chat — confirm bubble skeleton on open
  - Profile → Match Preferences — confirm section-card skeleton
  - Profile → Badges tab — confirm 3-row badge skeleton

---

## Git history (last 5 commits on branch)

```
14198c1 feat(ui): add Settings / Chat / MatchPreferences / Badges skeletons  ← my follow-up
1021515 fix(local-db): profile-photos bucket must be public to match prod    ← other session
8f9c21e Merge PR #32: layout-matching skeleton loaders                       ← real merge
94af64d feat(local-db): harden prod→local sync + Rule B signup-block migration  ← other session
e584f85 Merge PR #32: layout-matching skeleton loaders                       ← stale residue, see note above
```

---

## What's NOT part of this work

- No Supabase changes (no migrations, no RPC/policy edits, no function deploys, no secret rotation).
- No changes to production. Everything ships via EAS build → App Store review.
- No new tests added. Existing test suite has pre-existing errors unrelated to this work.
- GitHub PR #32 closed (it was auto-generated by Jules bot; content reaches main via the feature-branch merge, not via the PR).
