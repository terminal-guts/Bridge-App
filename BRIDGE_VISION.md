# Bridge: Complete Vision Document
**The first-ever community-driven dating experience**

**All work in React Native. testing on iOS (primary platform)**

*Last Updated: December 2025*

---

> **⚠️ IMPORTANT: FRONTEND-ONLY DEVELOPMENT PROJECT ⚠️**
>
> **This project is a UI/UX prototype with dummy data only. There is NO backend, NO database, NO Supabase, and NO real user authentication.** All data is mocked for demonstration and testing purposes. The goal is to build and validate the frontend experience so testers can tap through all screens and features to evaluate the concept, idea, and design.
>
> **When the frontend is complete, this app will be deployed for user testing to gather feedback on the UI/UX before any backend development begins.**

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

## High-Level Goals

Bridge's matching system should:
- Make users feel meaningfully helped by their friends and the community
- Deliver intentional, high-quality matches using a daily matching mechanic
- Stay emotionally safe, non-repetitive, and non-creepy
- Reward thoughtful, prosocial behavior through karma and assists
- Keep anchoring fair and equal for all users

---

## Core Concepts

### **Anchor**
A user who the system is matching for on a given day.
Each anchor gets at most one daily grid.
A user in an active match is **removed** from grids entirely (cannot appear as anchor or candidate).

**Important:** Everyone is an anchor every day (unless they're in an active match). There is no separate anchor selection process—all eligible users automatically have a grid generated for them daily.

---

### **Daily Grid**
A **triangle of 3 candidates** positioned around 1 anchor, chosen by the matching model.
All matchers for an anchor see the *same* daily grid.

**Visual Layout:**
```
        [ANCHOR]
       /    |    \
   [C1]   [C2]   [C3]
```

---

### **Matcher**
Someone who proposes a candidate for the anchor.
Two types:
- **Random community matcher** (mandatory once per day per user)
- **Friends** (optional, can do multiple friends per day)

---

### **Proposal**
A suggested pairing: Anchor X + Candidate Y.
A specific pairing can be proposed **only once ever** in the lifetime of the system.

---

### **Endorsers**
Anyone who proposed the same pairing.
Displayed as:
- Friend name + "(Anchor's friend)"
- "System-assigned matcher" for random matcher

---

### **Karma**
A public tiered reputation score that reflects how good you are at:
- Proposing successful matches
- Voting thoughtfully
- Showing up for friends

**Karma Tiers:**
- **New Matchmaker** (0 assists) 🌱
- **Solid Matchmaker** (3+ assists) ⭐
- **Trusted Matchmaker** (10+ assists) 💎
- **Elite Matchmaker** (25+ assists) 👑

**Karma affects:**
- How often you appear as a **candidate** (capped effect)
- The influence of your endorsements
- Whether you enter "slow mode" when voting

**Karma does NOT affect:**
- How often you are an **anchor** (anchoring is fair for all)
- Who the system matches you with
- Dating desirability or profile visibility

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

## Daily Grid Generation

### Per Anchor
Each anchor receives a daily grid reflecting:
- Their past matches
- Who friends and matchers propose for them
- Their onboarding preferences
- ML-based candidate similarity modeling (implement at later stage)

All matchers for an anchor see the same grid.

### Candidate Repetition Rules
- A candidate can reappear for the same anchor only after a cooldown
- But if a pairing has ever been proposed, the candidate never reappears for that anchor
- A candidate may appear in many other anchors' grids that same day

---

## Roles and Daily Obligations

### Every User (Random Matcher Flow)

Each user must complete:

1. **One mandatory random grid**
   - They are assigned as the matcher for a random anchor
   - They must submit exactly one proposal for that anchor

2. **Three proposal reviews**
   - Users vote Yes/No on three proposals

Only after completing both can they access the **Friends' Grids** screen.

### Every User as Anchor

- Anchoring frequency is equal for all eligible users
- The daily grid is created only if the user is not in an active match
- One random matcher + any number of friends may propose

---

## Friends as Matchers

### Friend Grid Access
- Friends always have a daily grid for each friend anchor
- They choose whether to open it
- They may propose one candidate per friend per day

### Matching for Multiple Friends
If you have three friends who are anchors today, you may propose for all three.

No daily cap—this is part of Bridge's "friends helping friends" engine.

### Shared Grid
All friends and the random matcher see the *same* daily grid for that anchor.

---

## Proposals

### Creation
A proposal is created when:
- The random matcher selects someone for the anchor
- A friend selects someone from the anchor's grid

### Merging
If multiple matchers select the same candidate:
- One proposal is created
- All endorsers are attached to it

**This expedites matchmaking:** Proposals with multiple friend endorsements rank higher and reach community voting faster, accelerating the path to an active match.

### Endorser Weight
Friend endorsers with higher karma contribute stronger signals.

### Pairing Uniqueness
Once a pairing is proposed:
- It is never proposed again
- The pair never reappears together in a grid

---

## Proposal Selection & Community Voting

Not all proposals go to community voting—only the top-ranked ones.

### Ranking Inputs
- Number of friend endorsers
- Karma of endorsers
- Compatibility score
- Assist history of endorsers (internal weight only)

### Voting Threshold
- Baseline threshold applies
- More friend endorsers → lowered threshold
- Higher karma endorsers → stronger lowering effect

### Outcome
If a proposal passes → match delivered.
If a proposal fails → pairing is permanently retired.

---

## Anchor Experience

**Anchors do NOT see:**
- Their grids
- Their proposal pool
- In-progress votes

**They only see:**
- Final matches that pass
- The list of endorsing friends (if any)

**Anchors can also see:**
- Which friends completed their grid today
- Which did not

**Friends cannot see:**
- Whether the anchor liked or disliked a match
- Whether the anchor continued chatting
- Any private actions the anchor takes

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

Karma is a public **prominent badge** shown on your profile (visible to friends and matches).

**Karma reflects:**
- Proposal success rate
- Voting accuracy
- Thoughtfulness of participation
- Helping friends

### Karma Gains
- Your proposal becomes a successful match (assist)
- Your Yes vote aligns with successful matches
- Your No vote aligns with rejected matches

### Karma Losses
- Your proposals fail repeatedly
- Your votes consistently misalign with community outcomes
- Very low participation
- Low accuracy → negative karma → slow mode

### Slow Mode
If karma drops below a threshold:
- 30-second lock when reviewing proposals
- Encourages thoughtful voting
- Does not affect anchoring frequency

### What Karma Does *Affect*
- How often you appear as a **candidate** (capped effect)
- How your proposals are prioritized in the daily ranking
- Weight of your endorsements in merged proposals

### What Karma Does *Not* Affect
- How often you are an **anchor**
- Who the system matches you with
- Dating desirability or profile visibility in dating contexts

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
Each assist yields a meaningful karma increase.

Higher assist count → higher likelihood that your endorsements are weighted more strongly internally.

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

- Active matches → user removed from all grids
- Pairings can be proposed once, ever
- Anchoring frequency is equal for all
- Karma affects **candidate visibility**, not anchoring
- Assists are visible only to friends + match reveals
- Friend endorsements lower voting threshold
- High karma friends have stronger endorsement weight
- Proposals merge when multiple matchers choose the same candidate
- Friends have global weekly superpowers requiring anchor approval
- Anchor may toggle off a friend entirely
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
3. **Daily Grid System:**
   - Triangle grid (3 candidates around 1 anchor)
   - Everyone is anchor daily (unless in active match)
   - Random matcher assignment (mandatory)
   - Friend grid access (optional)
4. **Proposal System:**
   - Proposal creation and merging
   - Community voting (3 votes per day)
   - 48-hour acceptance window
5. **Karma & Assists:**
   - Karma badges (New, Solid, Trusted, Elite)
   - Assist tracking for successful matches
6. **Active Match System:**
   - 3-day minimum commitment
   - Chat functionality
   - Match can last forever after 3 days
7. **Friend System:**
   - Secure friend codes
   - Friend grids
   - Friend superpowers (weekly type signals)
   - Friend chat with system event cards
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
| **User Action** | Endless swiping | One daily grid + 3 votes |
| **Match Selection** | Self-selected | Community-driven |
| **Match Frequency** | Constant flood | Rare & intentional |
| **Gender Balance** | Highly imbalanced | Fair anchoring for all |
| **Community** | None | Friend matchmaking & validation |
| **Psychology** | Addictive scroll | Calm ritual |
| **Quality Control** | Minimal | Strike system & anti-ghosting |


**This is the complete vision for Bridge. All agents and developers should reference this document to understand the full concept and philosophy.**
