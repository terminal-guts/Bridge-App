# Bridge: Complete Vision Document
**The first-ever community-driven dating experience**

**All work in React Native. testing on iOS (primary platform)**

*Last Updated: March 2026*

---

> **Production App — Full Stack**
>
> This is the production codebase deployed to the App Store. Frontend (React Native/Expo) + Backend (Supabase with PostgreSQL, Auth, Edge Functions, Realtime, Storage). All systems are live: proposal generation, community voting, karma points, friend streaks, match lifecycle.

---

# Table of Contents

1. [Part 1: Vision & Values](#part-1-vision--values)
2. [Part 2: The Problem We're Solving](#part-2-the-problem-were-solving)
3. [Part 3: The Community Matching System](#part-3-the-community-matching-system)
4. [Part 4: Features & Experience](#part-4-features--experience)
5. [Part 5: Target Market & GTM Strategy](#part-5-target-market--gtm-strategy)
6. [Part 6: Business Model](#part-6-business-model)
7. [Part 7: Product Roadmap](#part-7-product-roadmap)

---

# Part 1: Vision & Values

## Who We Are

**For:** Our end user is 22-30 busy professionals seeking genuine relationships. We are beta launching at Rice Univsersity to test the app in 3 months though.
**Who:** Are dissatisfied with current dating solutions. Swiping is dead. Online dating is lonely.
**Bridge is:** A dating app that provides a low-time solution for busy people to develop serious relationships
**Unlike:** Hinge, which requires 45+ minutes daily of scrolling and is isolating...
**Bridge:** Takes 5 minutes per day and uses community-driven matching (no swiping/scrolling)

### Tagline
**"The community finds the fit. We Bridge the gap."**

---

## Our Core Identity

Bridge is a **down-to-earth, accessible, community-driven** dating platform. We help real people make real connections through community involvement.

### What We're NOT ❌

- ❌ **NOT pretentious** (like Raya)
- ❌ **NOT exclusive or elitist** (like The League)
- ❌ **NOT gatekeepy or snobby**
- ❌ **NOT about status or VIP access**
- ❌ **NOT shallow or superficial**

### What We ARE ✅

- ✅ **Accessible** - Everyone is welcome
- ✅ **Community-driven** - Your friends help you match
- ✅ **Authentic** - Real people, real connections
- ✅ **Thoughtful** - Quality over quantity
- ✅ **Down-to-earth** - No BS, no pretense
- ✅ **Inclusive** - Diverse, welcoming, warm

---

## Our Competitors

### ✅ Who We Compete With:
- **Hinge** - Thoughtful, intentional dating
- **Stitch** - algorithmic matchmaking

### ❌ Who We're NOT Like:
- **Raya** - Too pretentious, exclusive, celebrity-focused
- **The League** - Too elitist, gatekeepy, status-obsessed

---

## Brand Voice Guidelines

### DO Use These Words: ✅
- Community, authentic, real, genuine
- Thoughtful, intentional, meaningful
- Accessible, welcoming, inclusive
- Down-to-earth, honest, transparent
- Friends, connections, relationships
- Quality, careful, considerate
- curated, individual

### DON'T Use These Words: ❌
- Exclusive, elite, premium, VIP
- Select, privileged, chosen
- High-end, luxury, prestigious
- Members-only, invite-only
- Sophisticated (too stuffy)

### Better Alternatives:
- ❌ "Exclusive community" → ✅ "Welcoming community"
- ❌ "Premium experience" → ✅ "Quality experience"
- ❌ "Elite members" → ✅ "Real people"
- ❌ "Select few" → ✅ "Everyone"

---

## Tone Examples

### ❌ Pretentious (DON'T):
> "Join an exclusive community of elite professionals seeking connections in the most sophisticated way."

### ✅ Down-to-Earth (DO):
> "Real people helping real people find meaningful connections. Your friends already know who you'd vibe with."

---

## Core Philosophy

### 1. Human-Informed Intelligence
- Compatibility is judged by people who see patterns and social nuance
- Algorithm aggregates collective judgments from the community and FRIENDS
- Every match reflects consensus, not one person's swipe

### 2. Scarcity → Significance
- No flooding users with options
- Matches are rare and intentional
- Elevates emotional value of each connection

### 3. Community Over Ego
- Users don't choose partners for themselves
- They matchmake for others, leading to:
  - More objective decisions
  - Less superficiality
  - Reduced jealousy and comparison
  - Calmer psychological environment

### 4. Ritual, Not Addiction
- Daily matchmaking ritual
- Not an infinite scroll
---

## Decision-Making Framework

When writing ANY copy or designing ANY feature, ask:

1. **Would Raya say this?** → If yes, DON'T say it
2. **Is this gatekeepy?** → If yes, change it
3. **Does this feel warm and welcoming?** → If no, rewrite
4. **Would you say this to a friend?** → If no, it's too formal
5. **Does this emphasize community?** → If no, add community angle

---

# Part 2: The Problem We're Solving

## Time Waste

- Average dating app user spends **50 minutes per day** on apps
- Men in our target market spend **45+ minutes per day** swiping
- Current apps commodify relationships through endless scrolling

## Gender Imbalance

- Tinder is **84% male, 16% female**
- Only 16% of men can match with the 16% of women (assuming heterosexual)
- **68% of the male user base is stranded**
- Men become desperate and swipe yes on everyone
- Women become overwhelmed sorting through hundreds of low-quality matches

### Real Example from Customer Research
> "A woman downloaded Hinge before a plane ride and spent 2 hours sorting through over 100 men interested in her by the time she landed 3 hours later."

## Target Audience Insight

> **40+ customer development interviews revealed:** Busy people want to date other busy people. Hard work, ambition, and drive are critical factors in partner selection.

---

# Part 3: The Community Matching System

> **📅 PRODUCT UPDATE - March 2026**
>
> Bridge uses a **single-person proposal model**. The old 3-candidate grid model has been **completely removed**.
>
> **Current Model:**
> - Each user gets **one proposal at a time** — a single candidate pairing generated by the algorithm
> - Community votes on proposals: Yes / No / Not Sure / Recommend to Friend
> - Daily obligation: Vote on 3 community proposals to unlock the Friends Area
> - Friends vote on each other's proposals (one candidate per friend)
> - Proposals persist across days (carryover) with accumulated vote tallies until resolved
>
> **What's Gone:**
> - `daily_surveys` table / 3-candidate grid — fully removed
> - Grid-based selection UI — fully removed
> - `DailyGridView` component — archived

---

## High-Level Goals

Bridge's matching system should:
- Make users feel meaningfully helped by their friends and the community
- Deliver intentional, high-quality matches through community validation
- Stay emotionally safe, non-repetitive, and non-creepy
- Reward thoughtful, prosocial behavior through karma and assists
- Eliminate comparison and shopping behavior
- Feel like real-life matchmaking coordination ("I think X and Y would work")

---

## Core Concepts

### **Proposal**
A suggested pairing: Person A + Person B.
A specific pairing can be proposed **only once ever** in the lifetime of the system.

**How Proposals are Created:**
- **Algorithm generates** most proposals based on compatibility
- **Friends can recommend** people they see during voting to their friends
- Algorithm strongly considers friend recommendations when creating proposals

**User Interaction:**
- Users vote on proposals: "Do you think they'd be a good match?"
- Actions: Yes (Good Match) | No (Not a Fit) | Recommend to Friend
- One proposal shown at a time (no side-by-side comparison)

---

### **Anchor (Internal Concept)**
A user who the system is generating proposals for.
A user in an active match is **removed** from proposal generation (cannot appear as anchor or candidate).

**Important:** This is primarily an internal algorithm concept. Users don't explicitly see "anchors" during voting.

---

### **Daily Grid — REMOVED**
The 3-candidate grid model has been fully removed from the product (March 2026). There is no grid logic anywhere in the system. Each user receives one proposal at a time — a single candidate pairing.

**Archived UI Component:** `src/components/_archived/DailyGridView.tsx` for historical reference only.

---

### **Endorsers**
Anyone who proposed the same pairing.
Displayed as:
- Friend name + "(Anchor's friend)"
- "System-assigned matcher" for random matcher

---

### **Karma** *(live as of March 2026)*
A single numeric score (**karma points**) that reflects how active and accurate you are as a community matchmaker. Karma points are displayed consistently everywhere they appear: your profile, beside your name, and in the Friends Area.

**How Karma Points Increase:**
- **Voting frequently** on friends' proposals (participation)
- **Voting accurately** — proposals you voted "yes" on that become real matches earn more karma; proposals you voted "no" on that get rejected also count as accurate

**What Karma Affects (all backend-only, invisible to user):**
- **Voting power** — higher karma = your vote carries slightly more weight in proposal outcomes
- How often you appear as a **candidate** (capped effect)
- The influence of your endorsements

**What Karma Does NOT Affect:**
- How often you are an **anchor** (anchoring is fair for all)
- Who the system matches you with
- Dating desirability or profile visibility

**Karma Display:**
- Frontend simply displays the karma points number — nothing else
- Shown on your profile, beside your name, and in the Friends Area
- All locations read from the same `karma_scores.karma_points` value
- Tiers and vote multipliers are computed in the backend only — the frontend never needs to know about them

---

### **Assists**
A count of how many successful matches your proposals have created.

**Assists are:**
- Visible to **friends**
- Shown on **match reveal cards** when you endorsed the match
- Not visible during candidacy, anchoring, or to strangers
- Feed into karma but are not displayed publicly to non-friends

**Assists are part of your matchmaking identity, not your dating identity.**

---

### **Friend Superpowers**
Each friend has two global (per week) abilities:
- **"This type is really good for them."**
- **"Please avoid this type for them."**

Anchor approval is required for both.

---

### **Friend Chat**
A private chat between two users who exchanged a secure friend code.
Contains:
- Normal text messages
- System event cards (e.g., "You matched Maya with Ben today")

---

## Eligibility and Active Matches

When a user is in an active match:
- They cannot appear as an anchor
- They cannot appear as a candidate
- They can still message their match and their friends

After a match ends, they re-enter the matching pool.

If Anchor A and Candidate B are ever proposed together:
- They never appear together in a grid again

---

## Match Lifecycle

1. **Proposal passes community voting** → Both users receive the proposal
2. **48-hour acceptance window:** Each user sees the other's full profile and decides to accept or decline
3. **If both accept:** Match becomes "active"
4. **Active match rules:**
   - **3-day minimum commitment:** Neither user can end the match for the first 3 days
   - After 3 days, either user can end the match at any time
   - Active matches can last forever if both parties want to continue
   - During active match, both users are completely removed from all grids
5. **Chat availability:** Users can only message during an active match (not during the 48-hour proposal window)

---

## Proposal Generation

### How It Works
The algorithm generates **one proposal per eligible user** daily at 7PM Central:
- Each proposal is a single pairing: Person A + Person B
- Based on compatibility scoring (see `MATCHING_ALGORITHM.md`)
- Users with active proposals, active matches, or paused accounts are skipped
- Rejected/declined pairs are **permanently blocked** from being re-proposed
- Expired pairs (ran out of time without enough votes) can be retried

### Pairing Rules
- A specific pairing can be proposed **only once** (unless it expired)
- Each user can have **at most one active proposal** at a time
- Users in active matches are excluded from proposal generation entirely

---

## Daily User Flow (Updated March 2026)

### **7PM Central Daily Cycle**
Everything resets at **7PM Central Time** each day via pg_cron (00:00 UTC = 7PM CST / 6PM CDT):

| Time (UTC) | Edge Function | What It Does |
|------------|--------------|--------------|
| 00:00 | `proposal-lifecycle` | Expire/reject/confirm proposals, apply karma on outcomes, freeze/kill streaks, auto-decline past-deadline decisions |
| 00:05 | `generate-proposals` | Create new proposals for eligible users, assign pool voters (up to 6 per proposal) |
| 00:10 | `generate-daily-pairings` | Daily pairing suggestions |

- The 3-proposal voting gate resets (users must vote on 3 new community proposals)

**What does NOT reset at 7PM:**
- Vote tallies on carryover proposals — accumulated votes persist across days
- The proposals themselves — a proposal that hasn't been resolved stays active

### **Primary Daily Obligation:**
Vote on **3 community proposals** to unlock the Friends Area.

**What This Looks Like:**
1. Open Community tab → See a proposal (one candidate pairing)
2. View pairing details, compatibility info
3. Vote: Yes / No / Not Sure / Recommend to Friend
4. Repeat for proposals 2 and 3
5. After 3 votes → Friends Area unlocked

**Time Required:** ~5 minutes per day

### **Secondary Actions (after 3 votes):**
- **Help Friends:** Vote on friends' proposals (see Friends Area below)
- **Friend Chat:** Message friends, discuss matches
- **View Proposals for You:** Check if community approved a match for you

---

## Friend Involvement (Updated March 2026)

### **Friends Area (unlocked after 3 community votes)**

The Friends Area shows your full friends list split into two sections:

#### **"Help Your Friends" Section**
Shows friends who have an **active proposal** (`status = 'pending'`) that you have **never voted on**.
- Tap a friend → see their proposal (one candidate) → vote Yes / No / Not Sure / Recommend
- Once you vote, they move to "Already Helped"
- Carryover proposals (from prior days) appear here if you haven't voted on them yet

#### **"Already Helped" Section**
Shows everyone else:
- Friends whose active proposal you **already voted on** (today or any prior day)
- Friends who currently have an **active match**
- Friends with **no active proposal** (profile incomplete, paused, not enough candidates, timing gap between lifecycle tick and generation)

### **How Friends Help:**
1. **Vote on proposals:** Each friend's proposal has one candidate — you vote on whether it's a good match for them
2. **Recommend during community voting:** If you see someone who'd be perfect for a friend, recommend them
3. **Friend Superpowers:** Type preferences (coming soon)
4. **Friend Chat:** Celebrate matches, give feedback

---

## Proposals (Updated March 2026)

### How Proposals are Created
**Primary Source: Algorithm (`generate-proposals` Edge Function)**
- Algorithm generates one proposal per eligible user based on compatibility scores
- Uses user preferences, values, interests, lifestyle, deep question answers
- Runs daily at 7PM Central via pg_cron
- Each user can have at most one active proposal at a time (enforced by DB constraint)

**Secondary Source: Friend Recommendations**
- During voting, users can recommend someone to a friend
- Algorithm considers these recommendations when creating proposals

### Proposal Lifecycle (5-Day Voting Window)

**Threshold Schedule:**
```
Day 1: 65% yes votes needed to pass
Day 2: 65% yes votes needed
Day 3: 60% yes votes needed
Day 4: 55% yes votes needed
Day 5: auto-send (bypass threshold — proposal passes regardless)
```

**Resolution Rules (checked after every vote AND at 7PM cron):**
- **Immediate cancel:** If the first 6 pool votes are ALL "no" → instantly rejected
- **Rejection floor:** If ≥12 pool votes AND pool yes-rate < 35% → rejected. Also if ≥12 total votes AND combined yes-rate < 35% → rejected
- **Confirmation:** If ≥6 pool votes AND ≥12 total votes AND ≥8 yes votes AND weighted yes% ≥ day threshold → `deciding` (sent to both users)
- **Day 5 auto-send:** Bypasses threshold — proposal passes regardless of percentage
- **Pool eligibility:** Proposal stays in the community queue if pool yes-rate ≥ 35% OR (≥6 friend votes with ≥70% friend yes-rate)
- Vote tallies **persist across days** (carryover proposals keep all accumulated votes)
- Lifecycle is checked **inline in `process-vote`** (instant transitions) AND by `proposal-lifecycle` cron at 7PM Central

**Weighted Voting (live as of March 2026):**
- Every vote is weighted by the voter's karma tier: New=1.0x, Solid=1.1x, Trusted=1.2x, Elite=1.3x
- Friend votes get an additional 1.25x multiplier on top of their tier weight
- Weighted yes/no totals (not raw counts) are what get compared against threshold percentages
- Vote recounting happens from scratch after every vote (source of truth = `proposal_votes` table)

**After Voting → Deciding Phase (48h):**
- Both users see each other's full profile
- Each user independently accepts or declines
- If both accept → match created, all other active proposals for both users cancelled
- If either declines → pairing permanently blocked from re-proposal

### Pairing Rules
- **Rejected/declined pairs**: permanently blocked, never re-proposed
- **Expired pairs** (timed out): can be retried in future
- **One active proposal per user**: enforced by partial unique indexes on `proposals` table

---

## User Experience During Proposals

**Users do NOT see:**
- Their own proposal being voted on
- In-progress vote tallies
- Who voted on their proposal

**They only see:**
- Final matches that pass community voting (pushed to deciding phase)
- The list of endorsing friends (if any)

**Friends cannot see:**
- Whether a user accepted or declined a match
- Whether the user continued chatting
- Any private actions the user takes

---

## Friend Superpowers (Global Per Week)

### "Good Type"
Friend flags someone in the grid as an excellent fit.
Anchor receives:

> "Maya thinks this type of person could be great for you. Accept suggestion?"

Anchor choices:
- Accept
- Override
- Toggle this friend off from receiving their grids

If accepted, similar profiles appear more often for that anchor.

### "Avoid Type"
Friend flags someone as a bad fit.

Anchor receives:

> "Ethan suggests avoiding this type. Accept or override?"

Anchor can:
- Accept
- Override
- Toggle friend off

If accepted, similar profiles appear less often.

---

## Friend Influence Controls

Anchors may globally toggle off any friend from receiving their daily grid.

Overrides to suggestions are private; friends are not notified.

---

## Karma System (Detailed)

Karma is a **single numeric point value** displayed prominently on your profile, beside your name, and in the Friends Area. All locations use the same calculated value from `karma_scores.karma_points`.

### How Karma Points Are Earned
- **+1 point** for each proposal vote cast (participation reward)
- **+3 bonus points** if a proposal you voted "yes" on becomes a real match (accurate yes)
- **+2 bonus points** if a proposal you voted "no" on gets rejected (accurate no)
- **+10 points** when a proposal you created becomes a successful match (assist bonus)

### How Karma Points Decrease
- **-1 point** if a proposal you voted "yes" on gets rejected (inaccurate yes)
- **-1 point** if a proposal you voted "no" on becomes a match (inaccurate no)
- Karma points have a floor of 0 (cannot go negative)

### Backend-Only: Tiers and Vote Weight
Tiers and voting multipliers are computed entirely in the backend. The frontend never sees or uses them — it only displays the raw karma points number.

**Tiers (derived from points):**
- New: 0-49 points (1.0x vote weight)
- Solid: 50-149 points (1.1x vote weight)
- Trusted: 150-499 points (1.2x vote weight)
- Elite: 500+ points (1.3x vote weight)

### What Karma Does *Affect* (backend only)
- Vote weight (slight multiplier based on tier)
- How often you appear as a candidate (capped effect)
- How your proposals are prioritized
- Weight of your endorsements

### What Karma Does *Not* Affect
- How often you are an anchor
- Who the system matches you with
- Dating desirability or profile visibility

---

## Assists System (Detailed)

### What Counts as an Assist
You earn an assist when:
- A proposal you submitted
- Passes community review
- And becomes a real match delivered to the two users

### Assist Visibility
**Assists are visible:**
- To your friends
- On match reveal cards when you endorsed that match

**Assists are NOT visible:**
- In candidacy
- In anchoring
- To strangers
- During proposal reviews
- On the public dating profile

**Assists are part of your matchmaking identity, not your dating identity.**

### Assist & Karma Relationship
Each assist yields +10 karma points. Higher assist count = higher karma tier = stronger voting weight.

---

## Streaks System (Detailed) *(live as of March 2026)*

A streak tracks **consecutive days that you and a specific friend have voted on each other's proposals**. Streaks are per-friendship (you can have different streak counts with different friends).

### How Streaks Work
- Each day both you and a friend vote on each other's active proposal, the streak increments by 1
- The streak is displayed on friend cards in the Friends Area

### Streak Freeze vs. Streak Death
- **Streak FREEZES (paused, not lost)** if either friend **has no active proposal** to vote on that day. You can't help if there's nothing to help with. The streak counter stays where it is.
- **Streak DIES (resets to 0)** if a friend **has an active proposal** and you **could have voted but chose not to** before the next 7PM cycle.

### What Streaks Affect
- Displayed as a number on friend cards (gamification / engagement)
- Streaks do NOT affect voting weight or match outcomes

---

## Matching System — Technical Flow (March 2026)

**End-to-end flow for a single proposal:**

1. **7PM — `generate-proposals`**: Algorithm scores all eligible user pairs across 13 categories (age 18%, distance 15%, lifestyle 12%, values 8%, interests 8%, family 8%, religion 6%, politics 6%, height 5%, ethnicity 5%, deep questions 5%, education 3%, career 1%). Pairs scoring ≥25 get proposals. Each proposal gets up to 6 random pool voters assigned.

2. **User opens app → Community tab**: Must vote on 3 community pool proposals to unlock Friends Area. Each vote calls `process-vote` edge function.

3. **`process-vote`**: Records vote → +1 karma → full recount of all votes with karma-tier weighting → inline lifecycle cascade (expiry → immediate cancel → rejection floor → confirmation → pool eligibility). Proposals can transition status instantly after any vote without waiting for cron.

4. **Friends Area (after 3 votes)**: "Help Your Friends" shows friends with active proposals you haven't voted on. Voting on a friend's proposal also calls `process-vote` + triggers `update_friend_streak()`.

5. **Proposal passes** (weighted yes% ≥ threshold with enough votes): Status → `deciding`. Both users see each other's full profile. 48-hour acceptance window.

6. **`process-decision`**: If both accept → match created, proposer gets +10 karma, accurate voters rewarded. All other proposals for both users cancelled. If either declines → pair permanently blocked.

7. **7PM — `proposal-lifecycle`**: Batch-checks all pending proposals (same logic as inline). Awards karma on rejected proposals. Runs `freeze_inactive_streaks()` then `kill_dead_streaks()`. Auto-declines past-deadline decisions.

8. **Match ends**: User re-enters matchmaking pool. Expired proposals (timed out, not rejected) allow the same pair to be retried.

**Key DB tables**: `proposals`, `proposal_votes`, `pool_vote_assignments`, `matches`, `karma_scores`, `friends`
**Key edge functions**: `generate-proposals`, `process-vote`, `proposal-lifecycle`, `process-decision`
**Key DB functions**: `increment_karma_for_vote`, `apply_karma_on_outcome`, `compute_karma_tier` (trigger), `update_friend_streak`, `freeze_inactive_streaks`, `kill_dead_streaks`, `increment_total_proposals`

---

## Friend Chat & Messaging

### Who You Can Message
You can message only:
- Friends you have added via secure friend code
- People you are in an **active match** with

**No messaging:**
- Strangers
- Candidates from grids
- People tied to proposals
- Matches that failed

### Friend Chat Logs
Friend chats contain:
- Normal text messages
- System event cards, such as:
  - "You matched Maya with Ben today."
  - "Saul accepted your suggestion about this type."
  - "Your proposal created a match — you earned an assist."

**Friends cannot see:**
- Vote results
- Whether the anchor liked or disliked a match
- Anchor's private decisions

---

## Summary of Key Guardrails

- Active matches → user removed from all matchmaking pools (proposals, pairings)
- Rejected/declined pairings → permanently blocked, never re-proposed
- Expired pairings (timed out) → can be retried
- One active proposal per user at any time (DB enforced)
- Each user can only vote once per proposal (DB enforced: `UNIQUE(proposal_id, voter_user_id)`)
- Vote tallies persist across days on carryover proposals
- 3 community votes required daily to unlock Friends Area
- Karma affects **candidate visibility**, not proposal generation
- Assists are visible only to friends + match reveals
- Friend endorsements lower voting threshold
- High karma friends have stronger endorsement weight
- Friends have global weekly superpowers requiring anchor approval
- User may toggle off a friend entirely
- No DMs to strangers—only friends and active matches

---

# Part 4: Features & Experience

## Deep Questions & Profile System

### Deep Questions Selection (Version 1)
- Users can answer up to 36 deep questions across 3 tiers
- **Profile Requirement:** Users must answer at least 1 question from each tier (3 total) to reach 100% profile completion
- Deep questions are accessible from the profile screen after onboarding is complete
- All answered questions are used by the matching algorithm for better match quality
- Users can answer additional questions beyond the 3 minimum to improve match quality
- Questions are displayed on user profiles to help potential matches understand them better

### Non-Negotiables System
- Users can select multiple non-negotiables from predefined options
- Non-negotiable options include: Smokers, Doesn't Want Kids, Has Kids, Drug Use, Different Religion, Different Politics, No Pets
- **Critical Matching Rule:** Users will NEVER receive prospective candidates who match any of their non-negotiables
- Non-negotiables are saved with match preferences
- UI provides clear visual feedback (red highlights) when non-negotiables are selected

---

## Friend Features

### Friend Connections
- Add friends through a unique, secure code
- Send friends profiles of prospective matches
- Help friends find matches easily
- View friend badges: "Great Matcher," "Algorithm Buster," etc.
- See friend match history (not chat logs)

### Match Recommendation System
- When users pass on a match, they're prompted to recommend it to a friend
- Users can select from their friend list to send recommendations
- Helps friends discover potential matches and strengthens community engagement
- Friends can share both rejected matches and survey candidates they think would be perfect for their friends

---

## Safety & Quality Systems

### Strike System

**Violations:**
- Lying about personal info (age, name, photos, job) → Strike
- Harassment or abuse → Strike or ban
- Threatening behavior → Ban
- Sending inappropriate content or nudes → Ban

**Consequences:**
- 3 strikes → Permanent removal
- Protects community quality and safety, especially for women

### Anti-Ghosting Structure

**Rejection Accountability:**
- Must provide reason when rejecting a match (structured menu)
- Algorithm treats patterns (chronic rejecting/leaving) as signals

**Chat & Pool Mechanics:**
- Chat only available when in a match
- When chatting, you're removed from dating pool
- You don't receive new matches
- You don't appear in other surveys
- To re-enter pool, must submit reason for leaving the match
- **Makes ghosting impossible**

### Optional Enhancements
- **Bridge Break:** Reject 5 straight real matches → frozen 1 week
- **Conversation Starters:** Generated from survey overlap
- **Mini-games:** "2 Truths & a Lie" to break ice

---

## Profile & Algorithm Design

### Profile Notifications
Send daily notifications about mutual interests to drive engagement:
- "You both love Tarantino films."
- "You both go to Barry's 5x/week."
- "Both are the oldest sibling."

Lead with these during prospective match reveals.

### Algorithm Weighting
The algorithm considers:
- Physical attraction
- Values alignment
- Personality fit
- Lifestyle compatibility
- Non-negotiables
- Gender-specific preference patterns

### Anti-Superficial Design
- Users NEVER see their own profile
- Users ONLY see same-gender candidates in comparison context
- No "like," "pass," or "browse" features
- Men cannot chase unilaterally
- Women cannot browse for "the hottest guy"
- **Bridge is curated, not consumer-driven**

---

# Part 5: Target Market & GTM Strategy

## Primary Beachhead

**24-30-year-old busy New Yorkers working in:**
- Finance
- Consulting
- Law
- Medicine

### Why This Market?
- Work long hours → suffer most from time-demanding swiping models
- Age 30 is a psychological milestone for settling down
- People actively seeking serious relationships
- Strong network effects in NYC professional communities
- Values ambition and hard work in partners

### Market Size & Opportunity
This is a saturated market, but AI and community-driven models create new opportunities.

---

## Competitive Landscape

### Hinge (Dominant Player)
**Strengths:** Serious platform for purposeful dating
**Weaknesses:**
- Scrolling commodifies relationships
- Not totally serious environment
- Must filter matches manually
- Requires 45 minutes daily

**What we take:** Better prompt design, conversation starters

### Cuffed
**Strengths:**
- Serious matchmaking with algorithm
- NYC-only exclusivity strategy
- One-at-a-time matching

**Weaknesses:**
- No community element
- No matching surveys
- No low-time premise

**What we take:** Exclusivity and single-stream matching

### Sitch
**Strengths:** AI matchmaker concept

**Weaknesses:**
- Not low time
- No community
- AI model lacks training data from matching surveys
- Not same level of machine learning depth

### OKCupid
**What we take:** Deep structural questionnaires, strong onboarding

### Breeze
**What we take:** Quick offline transitions, potential venue partnerships, no endless chat

### Bumble/Tinder
**Their weaknesses are our direction:**
- Too many choices → Bridge gives few
- Too addictive → Bridge is once/day
- Too superficial → Bridge is curated
- Too loud → Bridge is quiet and intentional

---

## Go-to-Market Strategy

### Acquisition Channels
1. **Waitlist signups** (currently in progress)
   - Cold emails
   - Customer development interviews
   - Word of mouth
2. **Post-v1 launch:**
   - Word of mouth virality (driven by pricing incentives)
   - Paid advertisements
   - Social media campaigns
3. **Leverage NYC professional networks** (finance, consulting, law, medicine)

### Retention Strategy
- Daily matchmaking ritual creates habit
- Community involvement keeps users engaged
- Friend features add social accountability
- Quality matches reduce churn from poor experiences

---

# Part 6: Business Model

## Primary Revenue: Pay-Per-Match
- Users pay only when both accept a match (after 48-hour window)
- Price dynamically adjusts based on gender ratio
- Creates sustainable revenue tied to successful outcomes

## Secondary Revenue: Restaurant Partnerships
- Partner with restaurants to recommend them to matched couples
- Restaurants pay to advertise on platform
- Aligns with offline date transition

## Cost Structure
- Monthly app maintenance and hosting
- Algorithm development and improvement
- Customer support and safety moderation
- Marketing and user acquisition

---

## Dynamic Pricing Model (not for bridge beta launch at rice)

### Market Hours Pricing
Bridge uses a live pricing system modeled after financial markets to maintain gender balance.

**Hours:** 9:30 AM - 4:00 PM (Eastern Time)
**Display:** Home screen shows current match price for men and women

### How It Works
- Prices adjust dynamically based on gender ratio in the active matchmaking pool
- If one gender is oversupplied → their match price increases
- If one gender is undersupplied → their price decreases
- When balanced (≈1:1) → prices equalize

### Why It Exists
- Ensures fair 1:1 matchmaking ecosystem
- Protects accuracy of community-driven algorithm
- Prevents flooding from one gender
- Creates transparency and premium feel for NYC professionals
- System is curated and structured, not chaotic

### Viral Growth Mechanism
**Word-of-mouth virality:** Men recommend the app to women to drive down their own prices, and vice versa. Users maintain platform balance through organic growth.

### Key Principles
- Users only pay when both accept a match
- Payment never affects match outcomes
- Prices update live during market hours
- Matches still arrive at designated times regardless of price changes

---

# Part 7: Product Roadmap

## V1 Core Features (Community Matching System)

**Current Priority:** Community Matching System v2

1. User authentication and onboarding
2. Profile creation with deep questions
3. **Proposal System:**
   - Algorithm generates one proposal per user daily at 7PM Central
   - Community voting (3 votes per day to unlock Friends Area)
   - 5-day voting window with relaxing thresholds
   - 48-hour deciding window after passing
   - One active proposal per user (DB enforced)
   - Permanent pair blocking for rejected/declined proposals
4. **Karma & Assists:**
   - Karma badges (New, Solid, Trusted, Elite)
   - Assist tracking for successful matches
5. **Active Match System:**
   - 3-day minimum commitment
   - Chat functionality
   - Match can last forever after 3 days
   - Matched users removed from all matchmaking pools
6. **Friend System:**
   - Secure friend codes
   - Friends Area: "Help Your Friends" / "Already Helped" split
   - Vote on each friend's proposal (one candidate per friend)
   - Friend superpowers (weekly type signals)
   - Friend chat with system event cards
7. **7PM Central Daily Cycle:**
   - pg_cron triggers: proposal-lifecycle, generate-proposals, generate-daily-pairings
   - 3-proposal gate resets
   - Vote tallies on carryover proposals persist
8. Payment integration (pay-per-match)

---

## V2 Enhancements

1. Advanced friend features (sharing, badges, history)
2. Strike system and safety reporting
3. Anti-ghosting reason collection
4. Community score display
5. Notification system for mutual interests
6. Algorithm refinement (ML-based compatibility)

---

## V3 Future Features

1. **Dynamic pricing** display and implementation
2. Bridge Break freeze system
3. Mini-games and conversation starters
4. Bridge Stories
5. Restaurant partnership integration
6. Advanced analytics and algorithm refinement
7. Match countdown dashboard (shows decreasing pool)

---

## V4 Polish & Accessibility

### 1. Accessibility Implementation
**Goal:** Make Bridge fully accessible to users with disabilities, following WCAG 2.1 AA guidelines.

**Key Components:**
- **Screen Reader Support:**
  - Add `accessibilityLabel` to all interactive components (buttons, touchables, inputs)
  - Add `accessibilityRole` to identify component types (button, link, image, etc.)
  - Add `accessibilityHint` for complex interactions
  - Ensure logical focus order for keyboard/screen reader navigation

- **Touch Targets:**
  - Ensure all interactive elements meet minimum 44x44px touch target (already defined in constants)
  - Add spacing or hit slop areas for small icons

- **Color & Contrast:**
  - Verify all text meets WCAG contrast ratios
  - Don't rely on color alone for critical information

- **High Priority Areas:**
  - Main navigation (tab bar, back buttons)
  - All form inputs (onboarding, profile editing, match preferences)
  - Critical actions (accept/decline matches, send proposals, friend codes)
  - Match proposal cards and voting interface

**Example Implementation:**
```typescript
<TouchableOpacity
  accessibilityLabel="Accept match with Sarah"
  accessibilityRole="button"
  accessibilityHint="Double tap to accept this match and start chatting"
  style={{ minHeight: MIN_TOUCH_TARGET }}
>
  <Text>Accept</Text>
</TouchableOpacity>
```

---

### 2. Skeleton Loading Screens
**Goal:** Replace loading spinners with content-aware skeleton screens to improve perceived performance and reduce user anxiety.

**Core Screens to Implement:**
1. **ProfileScreen** - Profile photo, name, stats, questions
2. **CommunityScreen** - Friend cards, proposal cards
3. **MatchProposalScreen** - Match reveal card structure
4. **ChatScreen** - Message bubbles
5. **ProfileEditScreen** - Form fields

**Skeleton Components to Build:**
- `SkeletonAvatar` - Circular shimmer for profile photos
- `SkeletonText` - Lines with varying widths
- `SkeletonCard` - Card-shaped container with shimmer
- `SkeletonButton` - Button-shaped placeholder

**Animation Style:**
- Subtle shimmer/pulse effect (use FADE_DURATION from constants)
- Light gray base with white shimmer overlay
- Matches existing card/component shapes

**Benefits:**
- Users see immediate visual feedback that content is loading
- Reduces perceived wait time
- Creates professional, polished feel
- Maintains layout structure during loading (no layout shift)

**Example:**
```
┌─────────────────────────┐
│  ┌───┐  ████████████   │  <- Avatar + Name skeleton
│  └───┘  ████████       │
│                         │
│  ████████████████████  │  <- Stats skeleton
│  ████████  ████████    │
│                         │
│  ████████████████      │  <- Question skeleton
│  ████████████████████  │
└─────────────────────────┘
```

---

# Key Differentiators Summary

| Feature | Traditional Apps | Bridge |
|---------|-----------------|--------|
| **Time Required** | 45+ min/day | 5 min/day |
| **User Action** | Endless swiping | 3 votes + help friends |
| **Match Selection** | Self-selected | Community-driven |
| **Match Frequency** | Constant flood | Rare & intentional |
| **Gender Balance** | Highly imbalanced | Fair anchoring for all |
| **Community** | None | Friend matchmaking & validation |
| **Psychology** | Addictive scroll | Calm ritual |
| **Quality Control** | Minimal | Strike system & anti-ghosting |


**This is the complete vision for Bridge. All agents and developers should reference this document to understand the full concept and philosophy.**
