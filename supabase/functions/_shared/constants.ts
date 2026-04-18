/**
 * Shared constants for Bridge Edge Functions
 */

export const FRIEND_VOTE_WEIGHT = 1.25;
export const KARMA_WEIGHTS: Record<string, number> = {
  new: 1.0,
  solid: 1.1,
  trusted: 1.2,
  elite: 1.3,
};

export const MAX_PROPOSAL_DAYS = 3;
export const DECISION_DEADLINE_HOURS = 48;

// ── Daily evaluation rules (proposal-gate-overhaul v2) ─────────────────
// Decisions only happen at the 7PM Central checkpoint in proposal-lifecycle.
// Mid-day rules (immediate cancel, rejection floor, per-vote evaluation)
// are removed — process-vote no longer triggers status changes.
//
// Day 1-2: needs MIN_VOTES_FOR_DECISION to make any call.  Below that → hold.
//          Above that → reject if yes-rate < REJECT_YES_RATE, accept if
//          > ACCEPT_YES_RATE, else hold.
// Day 3+:  force-decide.  Accept if yes-rate >= DAY3_YES_RATE, else reject.
//          No minimum-vote gate on day 3 — 0-vote proposals get rejected.
export const MIN_VOTES_FOR_DECISION = 8;  // day 1-2 absolute-vote floor
export const REJECT_YES_RATE = 0.35;      // day 1-2: yes-rate < 35% → reject
export const ACCEPT_YES_RATE = 0.70;      // day 1-2: yes-rate > 70% → accept
export const DAY3_YES_RATE = 0.50;        // day 3+: yes-rate >= 50% → accept, else reject

// Re-pairing window: proposals that were rejected or expired during the
// community-pending phase become re-eligible after this many days.
// Permanent blocks (declined / passed_to_match) are never re-eligible.
export const REPAIR_AFTER_DAYS = 45;

// Friend recommendation scoring boost (added per recommendation, capped)
export const RECOMMENDATION_BOOST_PER = 5.0;   // +5 points per unique recommendation
export const RECOMMENDATION_BOOST_CAP = 15.0;  // max +15 total boost
