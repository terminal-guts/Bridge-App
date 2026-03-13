# Bridge Notification System — V2 Spec

## Overview

12 notifications total. Every notification that matters is server-side push. Client-side local notifications are removed for all scheduled/engagement triggers.

---

## The 12 Notifications

### Category 1: Always Send (Transactional — No Cap)

These are the highest-value moments. Always send immediately. Server-side push.

#### 1. New Match
- **Trigger**: `matches` INSERT (server-side DB trigger → edge function)
- **Timing**: Immediate
- **Copy variants**:
  1. Title: `"It's official"` / Body: `"💘 You and {name} matched. Say hi."`
  2. Title: `"Match made"` / Body: `"💘 You and {name}. Your friends saw it coming."`
  3. Title: `"It happened"` / Body: `"💘 {name} is waiting. Don't keep them hanging."`
- **Deep link**: Matches screen
- **Preference gate**: `matchesEnabled`

#### 2. New Message
- **Trigger**: `messages` INSERT where `receiver_id = user` (server-side DB trigger → edge function)
- **Timing**: Immediate
- **Copy**: Title: `"{senderName}"` / Body: `"{preview}"` (plain text, audio: "Sent you a voice note", image: "Sent you a photo")
- **Batching**: After 3rd unread from same sender, batch to `"{name} sent {N} messages"`
- **Deep link**: Chat screen for that match
- **Preference gate**: `messagesEnabled`

#### 3. Proposal Deciding
- **Trigger**: `proposals` UPDATE → status = `'deciding'` (server-side DB trigger → edge function)
- **Timing**: Immediate
- **Copy variants**:
  1. Title: `"Your community has spoken"` / Body: `"Your friends approved {name} for you. Time to decide."`
  2. Title: `"The votes are in"` / Body: `"{N} friends said yes to {name}. Your call now."`
  3. Title: `"Decision time"` / Body: `"Your community thinks you and {name} could be something. What do you think?"`
- **Deep link**: Matches screen → proposal detail
- **Preference gate**: `matchesEnabled`

#### 4. Match Expiring
- **Trigger**: Server-side cron — proposal in `'deciding'` status for 36+ hours with at least one `'pending'` decision
- **Timing**: 36 hours after `passed_to_users_at`
- **Copy variants**:
  1. Title: `"{name} is waiting"` / Body: `"You have until tomorrow to accept or pass. Don't let this one slip."`
  2. Title: `"Clock's ticking"` / Body: `"Your match with {name} needs a decision soon."`
- **Deep link**: Matches screen → proposal detail
- **Preference gate**: `matchesEnabled`
- **Note**: Only sent to the user(s) whose decision is still `'pending'`

---

### Category 2: Daily Social Loop (Engagement — 3/day Cap)

These activate social obligation. Must name a friend.

#### 5. Friend Needs Your Vote
- **Trigger**: Server-side cron at 8 PM Central (01:00 UTC)
- **Timing**: 8 PM Central daily
- **Logic**:
  1. For each user: find friends who have an active (`pending`) proposal
  2. Check if the user has NOT voted on that proposal
  3. Pick the friend with the longest streak (if tied, pick alphabetically)
  4. If no streak, pick any unvoted friend proposal
  5. Skip if user already voted on all available friend proposals today
- **Copy variants**:
  1. Title: `"{friendName} needs you"` / Body: `"They have a proposal waiting. Your vote matters."`
  2. Title: `"Don't leave {friendName} hanging"` / Body: `"Their proposal is still open and you haven't voted."`
  3. Title: `"Be a good friend"` / Body: `"{friendName}'s match could depend on your vote tonight."`
- **Deep link**: Community screen
- **Preference gate**: `nudgesEnabled`
- **Cap**: Counts toward 3/day Tier 2 cap

#### 6. Friend Nudge
- **Trigger**: A friend taps the nudge button → `send-nudge` edge function (already deployed)
- **Timing**: Immediate (when friend nudges)
- **Copy variants**:
  1. Title: `"{name} nudged you"` / Body: `"They're waiting for your vote. Don't leave them hanging."`
  2. Title: `"Incoming nudge"` / Body: `"👉 {name} wants you to vote. Take 30 seconds."`
  3. Title: `"Hey, {name} called you out"` / Body: `"They nudged you to vote. Your move."`
- **Deep link**: Community screen
- **Preference gate**: `nudgesEnabled`
- **Cooldown**: 24h per friend pair
- **Cap**: Counts toward 3/day Tier 2 cap

#### 7. Shared Celebration
- **Trigger**: `matches` INSERT → look up voters who voted YES on that proposal (server-side)
- **Timing**: 15 minutes after match notification (delay so match notif lands first)
- **Copy variants**:
  1. Title: `"You called it"` / Body: `"You and {friends} helped {A} and {B} match. Nice work."`
  2. Title: `"Matchmaker moment"` / Body: `"🎉 {A} and {B} matched — and you helped make it happen."`
- **Deep link**: Community screen
- **Preference gate**: `matchesEnabled`
- **Cap**: Counts toward 3/day Tier 2 cap. 1 per match event.
- **Note**: Sent to voters, not to the matched users (they get #1)

---

### Category 3: Conversion & Ritual (Scheduled)

#### 8. Ice Breaker (18–48h post-match, no messages)
- **Trigger**: Server-side cron every 4 hours — checks matches created 18–48h ago with zero messages
- **Timing**: Within 18–48 hours of match creation (checked every 4h)
- **Logic**:
  1. Find matches where `created_at` is 18–48 hours ago
  2. Check if any messages exist for that match (via `match_id`)
  3. If zero messages → nudge both users
  4. Dedup: only one ice-breaker per match per user (via notification_log metadata)
- **Copy variants**:
  1. Title: `"{name} is waiting"` / Body: `"Say something — even just hi."`
  2. Title: `"Break the ice"` / Body: `"You and {name} matched but neither of you has said a word yet. Someone's gotta go first."`
  3. Title: `"Don't overthink it"` / Body: `"{name} is right there. Send a message — it doesn't have to be perfect."`
- **Deep link**: Chat screen for that match
- **Preference gate**: `matchesEnabled`
- **Cap**: Counts toward 3/day Tier 2 engagement cap
- **Rationale**: Fills the critical match→conversation conversion gap. Many users freeze after matching — this reduces first-message anxiety.

#### 9. Morning Leaderboard (8:30 AM)
- **Trigger**: Server-side cron at 8:30 AM Central (13:30 UTC)
- **Timing**: 8:30 AM Central
- **Logic**:
  1. Get the current #1 on the leaderboard (name + karma)
  2. Get the current user's rank and karma
  3. Calculate gap to #1
  4. Skip if user is #1 (send different copy: "You're #1")
  5. Skip if user has no karma activity (brand new user, no votes ever)
- **Copy variants (not #1)**:
  1. Title: `"{leaderName} is #1"` / Body: `"They have {leaderKarma} karma. You're {gap} behind. Vote tonight to close the gap."`
  2. Title: `"Leaderboard update"` / Body: `"📊 {leaderName} leads with {leaderKarma} karma. You're #{userRank} — {gap} points back."`
- **Copy variants (user IS #1)**:
  1. Title: `"You're on top"` / Body: `"🏆 You're #1 with {karma} karma. {secondName} is {gap} behind you."`
  2. Title: `"Still #1"` / Body: `"🏆 {karma} karma. Keep voting to hold your lead over {secondName}."`
- **Deep link**: Leaderboard screen
- **Preference gate**: `nudgesEnabled`
- **Does NOT count toward Tier 2 cap** (ritual anchor, separate budget)

---

### Category 4: Loss Prevention (Re-engagement — Separate Budget)

These fire for at-risk users only.

#### 10. Streak at Risk (6 PM)
- **Trigger**: Server-side cron at 6 PM Central (23:00 UTC)
- **Timing**: 6 PM Central — 1 hour before proposal-lifecycle kills streaks at 7 PM
- **Logic**:
  1. For each user with streak_days > 0 on any friendship:
  2. Check if that friend has an active (`pending`) proposal
  3. Check if the user has NOT voted on that proposal
  4. If both true → this streak dies at 7 PM when `kill_dead_streaks()` runs
  5. Pick the friend with the longest streak at risk
  6. Send ONE notification per user (the highest-risk streak)
- **Copy variants**:
  1. Title: `"Your streak is on the line"` / Body: `"⚠️ Your {N}-day streak with {friendName} ends at 7 PM if you don't vote."`
  2. Title: `"{N} days with {friendName}"` / Body: `"⚠️ Vote before 7 PM or your streak resets tonight."`
- **Deep link**: Community screen
- **Preference gate**: `nudgesEnabled`
- **Cooldown**: 24h
- **Does NOT count toward Tier 2 cap** (loss prevention, separate budget)

#### 11. You've Been Away (Dormant Escalation)
- **Trigger**: Server-side cron — check `app_sessions.ended_at` or `user_profiles.updated_at` for inactivity
- **Timing**: Varies by dormancy tier
- **Escalation schedule**:

| Days Inactive | Frequency | Copy |
|---|---|---|
| 2-6 days | 1 per 3 days | Title: `"Your friends are voting"` / Body: `"They voted {N} times since you left. They could use your help tonight."` |
| 7-13 days | 1 per 5 days | Title: `"You missed {N} proposals"` / Body: `"{friendName} had a proposal and you weren't there."` |
| 14-29 days | 1 per 7 days | Title: `"Your streaks are frozen"` / Body: `"Come back and {friendName} will be glad to see you."` |
| 30-44 days | 1 per 14 days | Title: `"We'll stop sending these soon"` / Body: `"Bridge is better with you, but we won't keep bugging you."` |
| 45+ days | Stop | No more push notifications. |

- **Deep link**: Community screen
- **Preference gate**: `nudgesEnabled`
- **Does NOT count toward Tier 2 cap**

---

### Category 5: Weekly

#### 12. Weekly Recap
- **Trigger**: Server-side cron — Sunday 7 PM Central (Monday 00:00 UTC) via `send-weekly-summary` edge function (already deployed)
- **Timing**: Sunday 7 PM Central
- **Copy variants**:
  1. Title: `"This week on Bridge"` / Body: `"{matches} matches, {votes} votes. {winner} won $100 with {karma} karma."`
  2. Title: `"Week in review"` / Body: `"🏆 {winner} took home $100. {matches} new matches this week. New leaderboard is live."`
  3. (No activity) Title: `"New week on Bridge"` / Body: `"Leaderboard just reset. Vote for your friends to climb the ranks and win $100."`
- **Deep link**: Leaderboard screen
- **Preference gate**: `matchesEnabled`

---

## Anti-Fatigue Safeguards

### Hard Caps

| Scope | Limit |
|---|---|
| Tier 2 (engagement) per day | 3 max |
| Total push notifications per day (all tiers) | 6 max (including transactional) |
| Ritual anchors per day | 1 max |
| Friend nudges received per day | 1 max |
| Same copy variant per type | Cannot repeat within 7 days |

### Cooldowns

| Type | Cooldown |
|---|---|
| Friend nudge (per pair) | 24h |
| Streak at risk | 24h |
| Dormant nudge | 72h-336h (escalating) |

### Suppression Rules

1. If user opened the app in the last 30 minutes → suppress all Tier 2 and loss prevention
2. If user voted on all available proposals today → suppress vote reminders
3. Quiet hours: 10 PM – 8 AM (transactional still sends)
4. If user ignores 5 consecutive notifications → reduce frequency by 50% for 7 days

---

## Copy Rotation

Each notification type has 2-3 copy variants. The system tracks which variant was last sent per user per type in the `notification_log` table and rotates sequentially.

---

## Database Changes

### New table: `notification_log`

```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  category TEXT NOT NULL,
  copy_variant INT DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMPTZ,
  created_date DATE GENERATED ALWAYS AS (sent_at::date) STORED
);

CREATE INDEX idx_notif_log_user_date ON notification_log(user_id, created_date, category);
CREATE INDEX idx_notif_log_user_type ON notification_log(user_id, notification_type, sent_at DESC);
```

### Sync preferences to `user_settings`

```sql
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS pref_matches_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_messages_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_nudges_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pref_show_name_if_winner BOOLEAN DEFAULT TRUE;
```

**Show Name If Winner**: When enabled (default), the user's first name appears in the weekly summary and morning leaderboard notifications sent to ALL users (e.g., "Carter won $100!"). When disabled, notifications say "a Bridge matchmaker won $100!" instead. This gives users control over their visibility in competitive contexts.

---

## Edge Function Architecture

### New: `send-push` (shared utility)

Located at `supabase/functions/_shared/send-push.ts`. All edge functions call this.

```
sendPush(supabase, {
  userId,
  notificationType,     // 'match', 'message', 'deciding', etc.
  category,             // 'transactional', 'engagement', 'ritual', 'reengagement', 'weekly'
  title,
  body,
  data,                 // deep link info
  copyVariant,          // rotation index
}) → boolean
```

Steps:
1. Look up `push_token` from `user_settings`
2. Check user preferences (`pref_matches_enabled`, etc.)
3. If category is `engagement`: check daily cap from `notification_log`
4. Check cooldown from `notification_log`
5. Select next copy variant (rotate)
6. Send via Expo push API
7. Log to `notification_log`
8. Return success/failure

### New edge functions

| Function | Cron (UTC) | Central Time | Purpose |
|---|---|---|---|
| `notify-streak-at-risk` | `0 23 * * *` | 6:00 PM | Check for streaks that will die at 7 PM |
| `notify-ice-breaker` | `15 */4 * * *` | Every 4h | Nudge silent matches (18–48h, no messages) |
| `notify-vote-reminder` | `0 1 * * *` | 8:00 PM | Friend needs your vote |
| `notify-morning-leaderboard` | `30 13 * * *` | 8:30 AM | Leaderboard standings |
| `notify-match-expiring` | `0 */4 * * *` | Every 4h | Check deciding proposals 36h+ old |
| `notify-dormant-users` | `0 17 * * *` | 12:00 PM | Dormant user escalation |

### Modified edge functions

| Function | Change |
|---|---|
| `send-nudge` | Use shared `sendPush`, log to `notification_log`, enforce daily cap |
| `send-weekly-summary` | Use shared `sendPush`, log to `notification_log` |
| `proposal-lifecycle` | No notification changes — streak kill logic stays the same |

### Server-side push for transactional (match, message, deciding)

Database triggers on `matches`, `messages`, and `proposals` call `net.http_post()` → `notify-transactional` edge function.

**Important:** Triggers read the Supabase URL and service role key from `vault.decrypted_secrets` (not `current_setting`). PostgREST/Supavisor pooled connections don't inherit database-level `app.settings.*` values, so `current_setting()` returns NULL and causes `net.http_post()` to throw — rolling back the parent INSERT/UPDATE. All triggers wrap `net.http_post()` in `BEGIN...EXCEPTION` blocks so a notification failure never blocks the parent operation.

The edge function handles:
- `matches` INSERT → send New Match push to both users
- `messages` INSERT → send New Message push to receiver
- `proposals` UPDATE to `'deciding'` → send Proposal Deciding push to both user_a and user_b

---

## Cron Schedule (Complete)

All times UTC. Bridge's 7 PM Central = 00:00 UTC (CDT) or 01:00 UTC (CST).

| UTC Time | Central Time | Job | Function |
|---|---|---|---|
| `0 23 * * *` | 6:00 PM | Streak at risk check | `notify-streak-at-risk` |
| `15 */4 * * *` | Every 4h | Ice breaker (silent matches) | `notify-ice-breaker` |
| `0 0 * * *` | 7:00 PM | Proposal lifecycle | `proposal-lifecycle` (existing) |
| `5 0 * * *` | 7:05 PM | Generate proposals | `generate-proposals` (existing) |
| `0 1 * * *` | 8:00 PM | Vote reminder | `notify-vote-reminder` |
| `0 */4 * * *` | Every 4h | Lifecycle check + match expiring | `proposal-lifecycle-check` + `notify-match-expiring` |
| `30 13 * * *` | 8:30 AM | Morning leaderboard | `notify-morning-leaderboard` |
| `0 17 * * *` | 12:00 PM | Dormant user check | `notify-dormant-users` |
| `0 0 * * 1` | Sunday 7 PM | Weekly karma snapshot | `snapshot-weekly-karma` (existing) |
| (chained) | (chained) | Weekly summary | `send-weekly-summary` (existing) |

---

## Client-Side Changes

### Remove
- `setupEngagementCadence()` — no more client-side 6:55 PM / 8 AM local schedules
- `checkAndScheduleInactivityNudge()` — server handles dormant users
- `checkAndScheduleProfileReminder()` — no more push for this; in-app banner only
- `checkAndScheduleStreakRiskNudge()` — server handles at 6 PM
- `notifyNewProposal()` — orphaned, never called
- `notifyInactivity()` — server handles
- `notifyProfileIncomplete()` — in-app only
- `notifyStreakAtRisk()` — server handles
- `notifyStreakDeath()` — removed entirely
- `notifyAccuracyBonus()` — removed entirely
- `NOTIF_IDS.ANTICIPATION_655PM` — removed (replaced by server-side ice-breaker)
- `NOTIF_IDS.MORNING_RECAP_8AM` — server handles
- `NOTIF_IDS.DAILY_MATCH_NUDGE_7PM` — legacy, already dead

### Keep
- `registerForPushNotifications()` — still needed for token registration
- `subscribeToRealtimeNotifications()` — keep as **fallback** for when app is foregrounded (server push is primary for backgrounded state)
- `notifyMatchNotice()` — keep for realtime fallback
- `notifyNewMessage()` — keep for realtime fallback
- `notifyProposalDeciding()` — keep for realtime fallback
- `notifyFriendNudge()` — keep for realtime fallback (server sends the real push)
- `notifySharedCelebration()` — keep for realtime fallback
- `addNotificationListener()` — keep
- `addNotificationResponseListener()` — keep
- `scheduleLocalNotification()` — keep (used by fallbacks)
- `clearAll()` — keep
- `getBadgeCount()` / `setBadgeCount()` — keep

### Add
- **Deep link handler**: When user taps a notification, navigate to the correct screen based on `data.screen` and `data.params`
- **Preference sync**: When user toggles a preference in Settings, write to both AsyncStorage AND `user_settings` table

### Simplify `scheduleAppOpenChecks()`
Remove all the checks. The only thing it does now is call `registerForPushNotifications()` to ensure the token is fresh.

---

## Implementation Order

### Phase 1: Database + Shared Infrastructure
1. Create `notification_log` table (migration)
2. Add preference columns to `user_settings` (migration)
3. Build `_shared/send-push.ts` utility
4. Add preference sync to `notificationPreferencesService.ts`

### Phase 2: Server-Side Scheduled Notifications
5. `notify-streak-at-risk` (6 PM)
6. `notify-ice-breaker` (every 4h — silent matches 18–48h)
7. `notify-vote-reminder` (8 PM)
8. `notify-morning-leaderboard` (8:30 AM)
9. `notify-match-expiring` (every 4h)
10. `notify-dormant-users` (daily)

### Phase 3: Server-Side Transactional
11. `notify-transactional` edge function (match, message, deciding)
12. Database triggers or webhooks to call it

### Phase 4: Client Cleanup
13. Remove dead code from `notificationService.ts`
14. Add deep link handler
15. Simplify `scheduleAppOpenChecks()`
16. Update `send-nudge` to use shared `sendPush`
17. Update `send-weekly-summary` to use shared `sendPush`

---

## Streak at Risk — Logic Detail

The `proposal-lifecycle` edge function runs at 7 PM Central (00:00 UTC). It calls:
1. `freeze_inactive_streaks()` — freezes streaks where NEITHER friend had an active proposal (streak survives, just paused)
2. `kill_dead_streaks()` — kills streaks where a friend HAD a proposal AND the user did NOT vote (streak dies)

The `notify-streak-at-risk` function runs at 6 PM Central (1 hour before). It must:

```
FOR each user:
  FOR each friendship where streak_days > 0:
    Check: does this friend have a proposal with status = 'pending'?
    Check: has this user voted on that proposal? (proposal_votes table)
    IF friend has pending proposal AND user has NOT voted:
      → This streak WILL die at 7 PM
      → Add to risk list
  IF risk list is not empty:
    Pick friend with highest streak_days
    Send push notification
```

A streak is NOT at risk if:
- The friend has no active proposal (streak will freeze, not die)
- The user already voted on the friend's proposal (streak is safe)
- The streak is already 0 (nothing to lose)

---

## Match Expiring — Logic Detail

The `DECISION_DEADLINE_HOURS` constant determines when a deciding proposal auto-declines. The notification fires at **36 hours** after `passed_to_users_at`.

```
FOR each proposal WHERE status = 'deciding':
  IF now() - passed_to_users_at >= 36 hours:
    IF user_a_decision = 'pending':
      Send to user_a: "Match with {user_b_name} needs a decision"
    IF user_b_decision = 'pending':
      Send to user_b: "Match with {user_a_name} needs a decision"
  Cooldown: only send once per proposal per user (check notification_log)
```
