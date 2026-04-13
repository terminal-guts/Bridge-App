# Demo & Reviewer Accounts — The Demo Bubble

> **STOP.** Read this entire document before modifying any demo or reviewer data.
> Breaking the isolation rules below will expose synthetic users to real Bridge users.

## Purpose

These accounts exist **solely for Apple App Store review**. They allow the Apple reviewer to test all app features (voting, matches, chat, report/block, friends) without a .edu email address.

All demo data lives in a **sealed bubble** — real users never see demo users, and demo users never interact with real users.

---

## The 7 Bubble Rules

1. **All demo users MUST have `profile_completed = false`.** This is the primary mechanism keeping them out of the real matchmaking pool (`generate-proposals/index.ts:32` filters on `profile_completed = true`). Never set this to `true` on any demo account.

2. **Demo users MUST only interact with other demo users and the reviewer.** No friend connections, matches, proposals, endorsements, votes, or messages involving real @rice.edu users. Ever.

3. **No real user should ever see a demo user.** Not in proposals, not in matches, not in friends, not on the leaderboard, not in campus stats — nowhere. The bubble is one-way sealed.

4. **All demo emails use `@demo.bridgedate.app`.** This domain is NOT in `allowed_email_domains`. Demo users cannot log in through the app. Do not add this domain to the allowed list.

5. **Proposals in the demo bubble are ONLY between demo users.** Never create a proposal where one side is a demo user and the other is a real user. Never assign a real user as a voter on a demo proposal.

6. **The reviewer's `profile_completed` must stay `false`.** A guard in `src/services/profileService.ts:454-455` prevents it from being auto-set to `true` when profile strength reaches 100%. Do not remove this guard.

7. **Use the existing demo user UUIDs.** Don't create additional accounts unless absolutely necessary. The current 6 demo users + reviewer cover all app features.

---

## Account Registry

### Reviewer Account

| Field | Value |
|-------|-------|
| Email | `reviewer@bridgedate.app` |
| Auth ID | `8b63fbb9-9b91-46eb-9d45-7ad0942affc6` |
| Password | Validated server-side by `supabase/functions/validate-reviewer-access/index.ts` |
| `profile_completed` | `false` (MUST STAY FALSE) |
| Purpose | Apple reviewer login |

### Demo Users

| Name | Email | Auth ID | Role in Demo |
|------|-------|---------|-------------|
| Emma W. | `emma@demo.bridgedate.app` | `d0000001-de10-4000-a000-000000000001` | Reviewer's match partner + friend |
| Jordan T. | `jordan@demo.bridgedate.app` | `d0000002-de10-4000-a000-000000000002` | Reviewer's friend + endorser + proposal subject |
| Sophie L. | `sophie@demo.bridgedate.app` | `d0000003-de10-4000-a000-000000000003` | Reviewer's friend + endorser + proposal subject |
| Marcus R. | `marcus@demo.bridgedate.app` | `d0000004-de10-4000-a000-000000000004` | Endorser + proposal subject |
| Lily C. | `lily@demo.bridgedate.app` | `d0000005-de10-4000-a000-000000000005` | Proposal subject |
| Alex K. | `alex@demo.bridgedate.app` | `d0000006-de10-4000-a000-000000000006` | Proposal subject |

**All 6 demo users have `profile_completed = false`.**

### Fixed Resource IDs

| Resource | ID | Description |
|----------|----|-------------|
| Match | `b0000001-de10-4000-a000-000000000010` | Reviewer <-> Emma active match |
| Match proposal | `c0000001-de10-4000-a000-000000000001` | Proposal linked to the match (status: passed_to_match) |
| Votable proposal 1 | `c0000002-de10-4000-a000-000000000002` | Jordan + Lily |
| Votable proposal 2 | `c0000003-de10-4000-a000-000000000003` | Alex + Sophie |
| Votable proposal 3 | `c0000004-de10-4000-a000-000000000004` | Marcus + Lily |

---

## Isolation Mechanisms

| Layer | What It Blocks | Location |
|-------|---------------|----------|
| `profile_completed = false` on ALL demo users | Demo users entering matchmaking pool | `supabase/functions/generate-proposals/index.ts:32` |
| profileService reviewer guard | Reviewer's `profile_completed` ever becoming `true` | `src/services/profileService.ts:454-455` |
| `@demo.bridgedate.app` not in allowed domains | Anyone logging in as a demo user | `allowed_email_domains` table |
| All SQL scoped to demo UUIDs | Real user data being touched | WHERE clauses in seed/reset scripts |
| `pool_eligible = false` on demo proposals | Real users seeing demo proposals in voting | `supabase/functions/get-proposals-for-voting/index.ts` filters on `pool_eligible` |
| Pre-assigned `pool_vote_assignments` | Reviewer can still see demo proposals | Assignment bypass in `get-proposals-for-voting` |
| No friend connections to real users | Real users seeing demo people in friends | All friends are demo-to-reviewer only |

### Known Gaps (Low Risk, Post-Submission Fix)

| Gap | Risk | Mitigation |
|-----|------|------------|
| Leaderboard RPC (`get_leaderboard_data`) has no `profile_completed` filter | LOW | Demo users have 0 karma (invisible on any leaderboard) |
| Campus stats RPC (`get_campus_stats`) counts all users | LOW | Inflated by ~7 out of hundreds (invisible) |
| `getFullUserProfileById` has no demo guard | LOW | Requires knowing the demo UUID; no real user would have it |

### Resolved Gaps (Fixed)

| Gap | Fix | Location |
|-----|-----|----------|
| Voter pool assignment included incomplete profiles | Added `.eq('profile_completed', true)` filter | `generate-proposals/index.ts:39-43`, `generate-proposal-for-user/index.ts:340-344` |
| Demo proposals visible to real users | Added `pool_eligible` filter + pre-assignment bypass | `get-proposals-for-voting/index.ts` |

**Future hardening:** Add `is_demo BOOLEAN DEFAULT FALSE` column to `user_profiles` and filter on it in all user-facing queries.

---

## Scripts

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `scripts/seed-reviewer-data.sql` | Creates demo users, profiles, friends, karma | Once (idempotent, safe to re-run) |
| `scripts/reset-reviewer-demo.sql` | Refreshes match, proposals, messages, vote assignments | Before every App Store submission |

### How to Run

```bash
# Via supabase-exec.sh (preferred)
cat scripts/seed-reviewer-data.sql | ./scripts/supabase-exec.sh
cat scripts/reset-reviewer-demo.sql | ./scripts/supabase-exec.sh

# Or paste directly into Supabase SQL Editor at:
# https://supabase.com/dashboard/project/ikyiwnydgedwbmcdzgbe/sql
```

---

## Pre-Submission Checklist

Run this before every App Store submission:

- [ ] Run `reset-reviewer-demo.sql` in Supabase SQL Editor
- [ ] Upload stock photos for demo users (if not already uploaded)
- [ ] Log in as `reviewer@bridgedate.app` on a real device
- [ ] **Community tab**: See 3 proposals -> vote on all 3 -> gate clears -> friends show
- [ ] **Match tab**: See active match with Emma -> tap -> chat loads -> can send message
- [ ] **Match card**: "Matched by" avatars visible (Jordan, Sophie, Marcus)
- [ ] **Report**: Chat menu -> Report -> select reason -> submit
- [ ] **Block**: Chat menu -> Block -> confirm
- [ ] **Profile tab**: Shows complete profile (100% strength)
- [ ] Verify proposal expiry dates are 4+ days in the future
- [ ] Update Review Notes in App Store Connect (see template below)
- [ ] Log in as a REAL @rice.edu user -> confirm zero demo users visible anywhere

---

## App Store Connect Review Notes Template

```
DEMO ACCOUNT:
Email: reviewer@bridgedate.app
Password: [provided in demo account fields above]

WALKTHROUGH:

1. SIGN IN: Enter the demo credentials. This special account
   bypasses the .edu email requirement.

2. COMMUNITY TAB (Voting): You'll see 3 proposals to vote on.
   Tap Yes or No on each card. After voting on all 3, the
   friends area appears.

3. COMMUNITY TAB (Friends): See your friends under "Your crew."
   Tap any friend to view their profile.

4. MATCH TAB: You have an active match with "Emma." Tap the
   match card to open the chat.

5. CHAT: Read the conversation and send a new message.

6. REPORT: In chat, tap the menu icon (top right) -> "Report."
   You can also report from any profile via the three-dot menu.

7. BLOCK: Same menu -> "Block." A confirmation dialog appears.

8. PROFILE TAB: View and edit your profile.

NOTES:
- Bridge is a closed campus community (Rice University). The demo
  account bypasses the .edu requirement.
- Content moderation (AI-powered), report/block, and rate limiting
  are all active.
- Voting resets daily at 7PM Central. If proposals appear already
  voted on, contact us for an immediate refresh.
```

---

## Anti-Patterns (DO NOT)

- **DO NOT** set `profile_completed = true` on any demo/reviewer account
- **DO NOT** create proposals pairing demo users with real @rice.edu users
- **DO NOT** add `demo.bridgedate.app` to `allowed_email_domains`
- **DO NOT** create friend connections between demo users and real users
- **DO NOT** remove the reviewer guard in `profileService.ts:454-455`
- **DO NOT** reference real user IDs (Carter, Ava, Oneal, etc.) in demo scripts — those TestFlight accounts may be deleted
- **DO NOT** remove the `pool_eligible` filter in `get-proposals-for-voting` — it prevents demo proposals from appearing to real users
- **DO NOT** deploy edge function changes beyond the existing `pool_eligible` filter without reviewing demo isolation impact
