# Bridge Notification Strategy

## Guiding Principles

1. **3/day hard cap** (excluding direct messages and match notifications). Research shows 46% of users opt out at 2-5 notifications/week. We budget ~3/day max on active days, targeting 10-15/week total.
2. **Always personalize** with friend names. Personalized notifications deliver 4x higher open rates.
3. **One emoji per notification** — boosts CTR by up to 85%.
4. **Curiosity gap** — don't reveal everything. "Someone weighed in on your match!" drives more opens than revealing who.
5. **Respect silence** — if a user hasn't opened the app in 7+ days, scale back to 1 notification per 3 days max.
6. **Transactional notifications are sacred** — new match and direct messages always send immediately. Users expect these and never count them as spam.

---

## Notification Categories & User Controls

Three toggle groups in Settings:

| Toggle | Controls | Default |
|--------|----------|---------|
| **Matches & Proposals** | New match, proposal deciding, accuracy bonus, 6:55 PM heads-up, shared celebration | ON |
| **Messages** | New messages, ghosting alerts | ON |
| **Streaks & Reminders** | Streak risk, streak death, friend nudges, 8 AM recap, inactivity, profile reminder | ON |

---

## Notification Schedule

### Tier 1: Transactional (Immediate, No Cap)
These bypass the daily cap — users expect and want them.

| Notification | Trigger | Copy | Cooldown |
|---|---|---|---|
| **New Match** | Realtime INSERT on `matches` | "It's a Match! You and {name} matched!" | None |
| **New Message** | Realtime INSERT on `messages` | "{name}: {preview}" | None |
| **Proposal Deciding** | Realtime UPDATE on `proposals` | "Your friends approved {name} for you!" | None |

### Tier 2: Engagement (Daily Cap Applies, Priority Order)
When multiple Tier 2 notifications compete, the highest-priority one wins. Max 3/day.

| Priority | Notification | Trigger | Time | Copy | Cooldown |
|---|---|---|---|---|---|
| 1 | **Streak at Risk** | App open after 9 PM + unvoted friend proposal | Evening | "{name}'s {N}-day streak is at risk!" | 24h |
| 2 | **6:55 PM Anticipation** | Recurring schedule | 6:55 PM | "New proposals drop in 5 min" | Daily (skip if user already opened today) |
| 3 | **Accuracy Bonus** | Realtime UPDATE on `karma_scores` (delta > 1) | Anytime | "Nice call! +{N} bonus karma" | 6h between accuracy notifications |
| 4 | **Shared Celebration** | Realtime INSERT on `matches` + voter lookup | Anytime | "You and {friends} helped {A} and {B} match!" | 1 per match event |
| 5 | **Friend Nudge** | `send-nudge` edge function | Anytime | "{name} nudged you to vote!" | 24h per friend pair |
| 6 | **8 AM Recap** | Recurring schedule | 8:00 AM | "Last night's votes are in" | Daily (skip if no activity yesterday) |

### Tier 3: Re-engagement (Separate Budget, Max 1/3 days)
Only fires for inactive users. Does NOT count toward the daily cap since user isn't receiving other notifications anyway.

| Notification | Trigger | Copy | Cooldown |
|---|---|---|---|
| **Inactivity Nudge** | App open after 2+ days inactive | "It's been {N} days. Your friends are voting!" | 72h (not 24h) |
| **Profile Incomplete** | App open + profile missing key fields | "Add your {items} to get better matches!" | 72h |
| **Streak Death** | Streak tracking detects drop to 0 | "Your {N}-day streak with {name} ended" | 24h |

### Tier 4: Weekly (Scheduled, 1/week)
| Notification | Trigger | Copy |
|---|---|---|
| **Weekly Summary** | Cron: Sunday 7 PM Central | "{N} matches, {N} votes this week. {winner} won $100!" |

---

## Daily Cap Implementation

```
DAILY_NOTIFICATION_CAP = 3  (for Tier 2 notifications)
Storage key: @bridge_notif_count_{YYYY-MM-DD}

Before sending any Tier 2 notification:
1. Read today's count from AsyncStorage
2. If count >= 3, suppress the notification
3. If count < 3, send and increment
```

Tier 1 (transactional) and Tier 3 (re-engagement for inactive users) bypass this cap.

---

## Smart Scheduling Rules

### 6:55 PM Anticipation
- **Skip if**: user already opened the app today AND voted on proposals
- **Skip if**: user has no friends (nothing to vote on)
- This prevents nagging active users who already did their voting

### 8 AM Recap
- **Skip if**: there was no community activity the previous evening (no votes, no matches)
- **Skip if**: user hasn't opened the app in 7+ days (switch to Tier 3 re-engagement cadence instead)
- This prevents empty "see what happened" notifications when nothing happened

### Streak at Risk (9 PM)
- Highest priority because loss aversion is the strongest motivator
- Only fires once per day, for the friend with the longest streak at risk
- Uses friend's name: "Your 14-day streak with Sarah is at risk!"

### Accuracy Bonus
- 6-hour cooldown between accuracy notifications (prevents spam if multiple proposals resolve at once)
- Uses curiosity gap: doesn't reveal which proposal was accurate

---

## Dormant User Escalation

| Days Inactive | Frequency | Copy Style |
|---|---|---|
| 2-6 days | 1 per 3 days | Friendly: "Your friends voted 8 times. See what happened!" |
| 7-13 days | 1 per 5 days | FOMO: "You missed 3 proposals this week" |
| 14-29 days | 1 per 7 days | Streak loss: "Your streaks are freezing" |
| 30+ days | 1 per 14 days | Final: "We'll stop sending reminders since they don't seem to be working" (Duolingo technique) |
| 45+ days | Stop | No more push notifications |

---

## Copy Guidelines

1. **Always use the friend's first name** — "Sarah's proposal needs your vote!" not "A friend needs your vote!"
2. **One emoji maximum** — place at the start of the body, not the title
3. **Keep titles under 6 words** — they get truncated on lock screens
4. **Body under 80 characters** — full visibility without expansion
5. **Curiosity gap for engagement notifications** — withhold the detail that makes them open the app
6. **No exclamation marks in re-engagement** — sounds desperate. Use periods.

---

## Removed / Disabled Notifications

| Notification | Reason |
|---|---|
| `notifyPendingDecision()` | Duplicate of `notifyProposalDeciding()` — removed |
| `notifyGhosting()` | Not wired to any trigger, aggressive copy — removed |
| `notifyFriendVotedOnYourProposal()` | Unwired, would fire too frequently for active users — removed |

---

## Metrics to Track

- **Opt-out rate**: target < 15% of users disabling notifications in first 30 days
- **Open rate**: target > 8% for engagement notifications (industry avg is 5-7%)
- **D7 retention with push enabled vs disabled**: push should show 2x+ retention lift
- **Notifications/churn correlation**: monitor if users who receive 4+ notifications/day churn faster

---

## Sources

- Braze Push Notification Best Practices & Hinge Case Study
- Business of Apps Push Notification Statistics 2025
- Duolingo's Sleeping/Recovering Bandit Algorithm (KDD 2020)
- CleverTap Emoji & Personalization Research
- Airship 2025 Push Notification Benchmarks
- OneSignal Frequency Capping Documentation
