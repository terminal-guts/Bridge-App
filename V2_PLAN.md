# Bridge V2 — Implementation Plan

## Status Overview

| Feature | Status | Owner |
|---------|--------|-------|
| Report Button + Ban System | 90% built — needs wiring | **Claude agent (Prompt 1)** |
| Live Chat / Feedback System | Ready to build | **Claude agent (Prompt 1)** |
| RLS Security Audit | Ready to build | **Claude agent (Prompt 2)** |
| Icon Package | In progress | **Team (LivingW123/A-Arav0307)** |
| Matchmaker-Only Mode | In progress | **Team (LivingW123/A-Arav0307)** |
| Audio Ask-Out Fix | On hold | Later |
| Online Now Tags | On hold | Later |
| Google Auth | Not started | Phase 3 |
| Anonymous Matchmaking | Needs design discussion | Phase 4 |
| Proposal Screen Redesign | Needs design discussion | Phase 4 |

---

## PROMPT 1: Live Chat + Feedback System + Report Button Wiring

Copy everything below the line and send to a Claude coding agent.

---

### BEGIN PROMPT

You are building two features for the Bridge dating app (React Native/Expo + Supabase backend). Read CLAUDE.md before starting. This is a production app — write clean, shippable code.

**IMPORTANT: Before modifying any file, run `git log --follow <file>` and check for commits by authors LivingW123 or A-Arav0307. Do NOT modify their code. Only change lines written by Jules or Claude agents. Ask for permission if a fix requires changing their code.**

---

#### FEATURE A: Wire Up Existing Report Button (Quick Fix)

The report UI already exists in `src/screens/match/ChatScreen.tsx` but is not connected. Do these three things:

**A1. Add "Report" to the three-dot menu (around line 707):**

In the menu card (`<View style={cs.menuCard}>`), add a third menu item after "End Match":

```
<View style={cs.menuDivider} />
<TouchableOpacity style={cs.menuItem} onPress={openReportModal}>
  <Ionicons name="flag-outline" size={18} color="#D92D20" />
  <Text style={[cs.menuItemText, { color: '#D92D20' }]}>Report</Text>
</TouchableOpacity>
```

The `openReportModal` function already exists at line 366. Red color differentiates it as a safety action.

**A2. Wire `handleReportConfirm` to Supabase (around line 397):**

Replace the current `handleReportConfirm` (which only shows an Alert) with a real implementation:

```typescript
const handleReportConfirm = async () => {
  if (!reportReason || !currentUserId) return;
  try {
    const { error } = await supabase.from('user_reports').insert({
      reporter_id: currentUserId,
      reported_user_id: recipientId,
      reason: reportReason,
      details: reportDetails.trim() || '',
    });
    if (error) throw error;
    setReportModalVisible(false);
    setReportReason('');
    setReportDetails('');
    Alert.alert('Report Submitted', 'Thank you. Our team will review this shortly.');
  } catch (err) {
    Alert.alert('Error', 'Could not submit report. Please try again.');
  }
};
```

**A3. Keyboard handling on the report modal:**

The report modal (lines 789-848) has a TextInput for details. Ensure the modal content is wrapped in a `KeyboardAvoidingView` (behavior="padding" on iOS) so the keyboard doesn't cover the text input or submit button. The end match modal nearby is a good reference for the pattern.

**The `user_reports` table already exists** (migration `20260306000001_user_reports.sql`) with columns: `id`, `reporter_id`, `reported_user_id`, `reason`, `details`, `status`, `created_at`, `reviewed_at`. RLS policies are already enabled.

---

#### FEATURE B: Live Chat / Feedback System (Full Build)

Users can chat with the Bridge team from Settings. Messages route to the founder's phone via Twilio SMS. The founder replies via SMS and it appears in-app in real time.

##### B1. Database Migration

Create `supabase/migrations/20260310_support_chat.sql`:

```sql
-- Support chat system

CREATE TABLE IF NOT EXISTS support_conversations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    has_unread_admin BOOLEAN DEFAULT FALSE,
    has_unread_user BOOLEAN DEFAULT FALSE,
    raffle_tickets INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 1000),
    sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
    is_auto_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_messages_user ON support_messages(user_id, created_at);
CREATE INDEX idx_support_conversations_last ON support_conversations(last_message_at DESC);

-- RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can read/create their own conversation
CREATE POLICY "Users own their conversation"
    ON support_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own messages
CREATE POLICY "Users read own messages"
    ON support_messages FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users send messages"
    ON support_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id AND sender = 'user');

-- Enable realtime for support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
```

##### B2. Edge Function: `send-support-message/index.ts`

Create `supabase/functions/send-support-message/index.ts`:

- Accepts POST with `{ content: string }` (auth required — get user_id from JWT)
- Validates content length <= 1000 characters
- **Rate limiting:** Max 10 messages per hour per user. Query `support_messages` for count in last 60 minutes. Return 429 if exceeded. This prevents raffle ticket spam.
- Upserts into `support_conversations` (creates on first message)
- Inserts message into `support_messages` (sender = 'user')
- **Keyword auto-reply logic** — check message content and insert a second message (sender = 'admin', is_auto_reply = true):

| Keywords (case-insensitive) | Auto-reply |
|---|---|
| bug, crash, broken, error, glitch, not working | "Thanks for flagging this! We're looking into it and will follow up." |
| suggestion, idea, feature, should, could you add, wish | "Love the idea! We've noted it down. If it makes it in, you'll hear from us." |
| slow, lag, loading, freeze, stuck | "Sorry about that! We're working on performance improvements. Which screen is giving you trouble?" |
| help, how do I, confused, can't find | "Happy to help! Can you tell us more about what you're trying to do?" |
| No match | "Got it — we'll get back to you soon!" |

- **Twilio SMS forwarding** — after inserting, send SMS to `+16466236536` via Twilio REST API:
  ```
  [Bridge] {first_name} (#{user_id first 4 chars}):
  "{message content}"
  ```
  - Twilio Account SID, Auth Token, and From Number should be read from environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
  - Use `fetch()` to POST to `https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json` with Basic auth
  - If Twilio fails, log the error but don't fail the request — the message is still saved in DB

##### B3. Edge Function: `receive-support-reply/index.ts`

Create `supabase/functions/receive-support-reply/index.ts`:

- This is a **Twilio webhook** — receives POST with form-encoded body (`Body`, `From`, `To`)
- Validate that `From` is `+16466236536` (only accept replies from the founder's number)
- Parse the reply format: `#abcd Your reply message here`
  - `#abcd` = first 4 chars of user_id
  - Look up user by matching: `SELECT user_id FROM support_conversations WHERE user_id::text LIKE 'abcd%' ORDER BY last_message_at DESC LIMIT 1`
- Insert message into `support_messages` (sender = 'admin', is_auto_reply = false)
- Update `support_conversations` set `has_unread_admin = true`, `last_message_at = now()`
- **Push notification:** Send Expo push notification to the user:
  - Read push token from `user_settings` where `user_id` matches
  - POST to `https://exp.host/--/api/v2/push/send` with `{ to: token, title: "Bridge Team", body: "New message from Bridge support", data: { screen: "SupportChat" } }`
  - Note: The `push_token` column may need to be added to `user_settings` — check the schema. If missing, add it in the migration:
    ```sql
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_token TEXT;
    ```
- Return TwiML response: `<Response></Response>` (empty — no auto-reply back to founder)
- This endpoint must NOT require auth (Twilio can't send JWTs). Instead validate the `From` number and optionally validate Twilio's `X-Twilio-Signature` header.

##### B4. Frontend Service: `src/services/supportChatService.ts`

Create a service with:

- `getSupportMessages()` — fetch all messages for current user, ordered by created_at ASC
- `sendSupportMessage(content: string)` — call `send-support-message` edge function
- `subscribeToSupportMessages(callback)` — Supabase Realtime subscription on `support_messages` table filtered by `user_id = currentUser.id`. When new row arrives with sender = 'admin', call callback. Return cleanup function.
- `markAdminMessagesRead()` — update `support_conversations` set `has_unread_admin = false`

Follow patterns in existing `src/services/messageService.ts`.

##### B5. Frontend Screen: `src/screens/support/SupportChatScreen.tsx`

Create an iMessage-style chat screen:

**Layout:**
- Header with back button and title "Bridge Support"
- Message list (FlatList, inverted=false, scrolls to bottom on new message)
- Text input bar at bottom with send button
- KeyboardAvoidingView wrapping everything (behavior="padding" on iOS)

**Messages:**
- User messages: blue bubbles (#437FFF), right-aligned, white text
- Admin messages: light gray bubbles (#F2F4F7), left-aligned, dark text
- Auto-reply messages: same as admin but with a small "Auto-reply" label above
- Timestamps grouped by day ("Today", "Yesterday", "Mar 8")
- Individual message timestamps shown in small gray text below bubbles

**Preloaded welcome message:**
On first open (no messages in DB), show a single admin-style bubble with this text:

"Welcome to Bridge Support! Every week we raffle off $50. Each valid bug report or improvement suggestion earns you a raffle ticket. Submit something brilliant and we'll pay you $50 on the spot. What's on your mind?"

This message is rendered client-side (not stored in DB). Once the user sends their first message, it remains visible as the first item in the chat.

**Character counter:** Show remaining characters (out of 1000) near the text input when user is typing. Gray text, turns red under 50 remaining.

**Offline queue:** If message send fails (network error), keep the message in the input field and show a small red "Failed to send. Tap to retry." banner. Do NOT clear the input on failure.

**Real-time:** Subscribe to `support_messages` via Realtime on mount. New admin messages appear instantly with a subtle animation.

**Empty state:** Just the welcome message bubble. No other empty state needed.

##### B6. Navigation Wiring

1. Add to `src/types/index.ts` in `RootStackParamList`:
   ```typescript
   SupportChat: undefined;
   ```

2. In `src/navigation/AppNavigator.tsx`:
   - Lazy-load: `const SupportChatScreen = withSuspense(React.lazy(() => import('../screens/support/SupportChatScreen').then(m => ({ default: m.SupportChatScreen }))));`
   - Add `<Stack.Screen name="SupportChat" component={SupportChatScreen} />` near other support screens

3. In `src/screens/profile/SettingsScreen.tsx`:
   - Add a new SettingRow at the TOP of the Account card (before "Edit Profile"):
   ```tsx
   <SettingRow
     icon="chatbubble-ellipses-outline"
     title="Chat with Us"
     subtitle="Bug reports, ideas, feedback"
     onPress={() => navigation.navigate('SupportChat')}
   />
   ```

##### B7. Environment Variables

The following need to be set in Supabase Edge Function secrets:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (the Twilio phone number you purchased)

These are set via: `supabase secrets set TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx TWILIO_FROM_NUMBER=+1xxxxxxxxxx`

##### B8. Twilio Webhook Configuration

After deploying `receive-support-reply`, configure Twilio to POST to:
`https://ikyiwnydgedwbmcdzgbe.supabase.co/functions/v1/receive-support-reply`

Set this as the "A MESSAGE COMES IN" webhook URL on your Twilio phone number configuration page.

---

### END PROMPT

---

## PROMPT 2: RLS Security Audit (Separate Agent)

Copy everything below the line and send to a separate Claude coding agent.

---

### BEGIN PROMPT

You are performing a Row Level Security (RLS) audit on the Bridge dating app's Supabase PostgreSQL database. This is a **production app on the App Store with real users.** A mistake here silently breaks the app — queries return empty results instead of errors. Move slowly and verify everything.

Read CLAUDE.md before starting.

**IMPORTANT: Before modifying any file, run `git log --follow <file>` and check for commits by authors LivingW123 or A-Arav0307. Do NOT modify their code. Ask for permission if a fix requires changing their code.**

---

#### HARD RULES — DO NOT VIOLATE

1. **DO NOT enable RLS on a table without also adding complete policies in the same migration.** Enabling RLS with no policies = every query returns zero rows. This will break the app instantly.
2. **DO NOT assume column names.** Before writing any policy for a table, you MUST read the migration file that created that table and confirm the exact column names. Document them.
3. **DO NOT apply any migration to production.** Your output is migration FILES ONLY. The founder will review and deploy manually.
4. **DO NOT modify any frontend code.** If a frontend query will break, document it in the impact report but do not change it.
5. **DO NOT write a policy that references a column that doesn't exist.** This will cause the migration to fail.
6. **DO NOT combine all tiers into one migration.** Output 3 separate migration files so they can be deployed and tested independently.

---

#### Step 1: Full Audit — Read Before You Write

Before writing a single line of SQL, do ALL of the following:

**1A. Read every migration file** in `supabase/migrations/` and build a catalog:

For EACH table, document:
- Table name
- Exact column names (especially any user-referencing columns like `user_id`, `user1_id`, `sender_id`, `reporter_id`, etc.)
- Whether RLS is already enabled
- What RLS policies already exist (if any)
- Whether the table is referenced in `ALTER PUBLICATION supabase_realtime`

Output this as a markdown table in a comment at the top of each migration file.

**1B. Read every frontend service file** in `src/services/` and grep for `supabase.from(`:

For EACH query found, document:
- File path and line number
- Table being queried
- Operation (select, insert, update, delete)
- What columns/filters are used
- Whether it uses the anon key (frontend client) or service role key

This tells you exactly which frontend queries will be affected by RLS. Any query using the anon key WILL be subject to your new policies.

**1C. Read every edge function** in `supabase/functions/`:

Confirm each uses `createAdminClient()` (service role key). Service role bypasses RLS entirely, so these are safe. If any edge function uses a non-admin client, FLAG IT — that function will break.

**STOP HERE. Present your full audit findings before writing any policies. Do not proceed to Step 2 until the audit is complete and documented.**

---

#### Step 2: Tier 1 Migration — Most Sensitive Tables

File: `supabase/migrations/20260310_rls_tier1_sensitive.sql`

Tables (implement in this order):

1. **`messages`** — users must only read/write messages in matches they belong to
   - This table likely has a `match_id` column. The policy needs a subquery: user can access messages WHERE match_id IN (SELECT id FROM matches WHERE user1_id = auth.uid() OR user2_id = auth.uid())
   - OR if messages has sender_id/receiver_id columns, use those directly
   - **YOU MUST VERIFY THE ACTUAL SCHEMA BEFORE WRITING THE POLICY**

2. **`matches`** — users must only see matches they're part of
   - Likely has `user1_id` and `user2_id` — policy checks both

3. **`user_profiles`** — all authenticated users can SELECT (needed for viewing proposals/matches), only own user can UPDATE
   - Check what the primary key / user reference column is called

4. **`user_photos`** — all authenticated users can SELECT, only own user can INSERT/UPDATE/DELETE

5. **`user_settings`** — users can only SELECT/UPDATE their own row

**For each table in this file:**
- Add a comment block showing: table schema, existing RLS status, frontend queries that hit this table
- Enable RLS if not already enabled
- Write granular policies: separate SELECT, INSERT, UPDATE, DELETE (not a single ALL policy — too risky)
- Name policies descriptively: `"users_select_own_matches"` not `"policy_1"`

**Frontend Impact Report (Tier 1):**
At the bottom of the migration file, add a SQL comment block listing every frontend query that touches these 5 tables, whether it will still work under the new policies, and what changes are needed if not.

---

#### Step 3: Tier 2 Migration — Important Tables

File: `supabase/migrations/20260310_rls_tier2_important.sql`

Tables:

6. **`proposals`** — Complex access pattern. Users need to see:
   - Proposals where they are the `candidate_id` (their own proposal)
   - Proposals they are assigned to vote on (requires checking `pool_vote_assignments`)
   - **Read the proposal query in the frontend services carefully** — the SELECT policy must not break the voting flow

7. **`proposal_votes`** — users can INSERT their own votes, SELECT votes on proposals they can see
   - Check what columns reference the voter vs the proposal

8. **`friends`** — users see friendships where they are `user_id` or `friend_id` (verify actual column names)

9. **`friend_messages`** — users see messages in friendships they belong to
   - Similar to messages — may need subquery through friends table, or may have direct user columns

10. **`karma_scores`** — all authenticated users can SELECT (for leaderboard/display), only system (service role) can INSERT/UPDATE
    - This means NO insert/update policy for anon key — only service role (edge functions) can write

**Frontend Impact Report (Tier 2):**
Same format as Tier 1. The proposals/voting queries are the most critical — get these wrong and the core app loop breaks.

---

#### Step 4: Tier 3 Migration — Lower Risk Tables

File: `supabase/migrations/20260310_rls_tier3_general.sql`

Tables:

11. **`endorsements`** — all authenticated can SELECT, users can INSERT/UPDATE/DELETE their own
12. **`deep_question_answers`** — all authenticated can SELECT, users can INSERT/UPDATE/DELETE their own
13. **`friend_codes`** — all authenticated can SELECT (needed for friend code lookup), users can INSERT/UPDATE their own
14. **`friend_recommendations`** — users can see recommendations where they are involved
15. **`pool_vote_assignments`** — users can see their own assignments only

**Frontend Impact Report (Tier 3):**
Same format.

---

#### Step 5: Final Verification Checklist

After writing all 3 migration files, go through this checklist:

- [ ] Every `ENABLE ROW LEVEL SECURITY` has at least one SELECT policy in the same file
- [ ] Every column referenced in a policy actually exists (cross-checked against migration schema)
- [ ] Every frontend `supabase.from()` query is accounted for in an impact report
- [ ] No edge function uses a non-admin client
- [ ] Tables that already have RLS enabled are not re-enabled (idempotent — use `ALTER TABLE IF NOT EXISTS` patterns or check first)
- [ ] Existing RLS policies are not duplicated or conflicted with
- [ ] Realtime subscriptions still work (Realtime respects RLS — the subscription filters must align with SELECT policies)

---

#### Output

Deliver exactly these files:
1. `supabase/migrations/20260310_rls_tier1_sensitive.sql`
2. `supabase/migrations/20260310_rls_tier2_important.sql`
3. `supabase/migrations/20260310_rls_tier3_general.sql`
4. A summary comment (can be at the top of each file or in a separate `RLS_AUDIT_NOTES.md`) listing:
   - All frontend queries that need follow-up changes
   - Any tables you chose NOT to add RLS to and why
   - Any edge functions that don't use admin client (if found)
   - Recommended deployment order and testing steps

**Deployment order:** Tier 1 first → test the app thoroughly → Tier 2 → test again → Tier 3 → final test. Never deploy all 3 at once.

### END PROMPT

---

## Team-Owned Features (Hands Off)

The following are being handled by LivingW123 / A-Arav0307. Do not build or interfere:
- **Icon Package** — replacing emojis with IconScout icon set
- **Matchmaker-Only Mode** — users skip onboarding and join purely as voters

## Phase 4 Discussion — Pending

The following features need design discussion before any code is written:
- **Anonymous Matchmaking** — anonymously suggest yourself for a friend, or pair two friends
- **Proposal Screen Redesign** — rethink voting screen information hierarchy

These will be scoped after Phases 1-3 ship.
