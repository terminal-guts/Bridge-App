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

export const MAX_PROPOSAL_DAYS = 5;
export const DECISION_DEADLINE_HOURS = 48;

export const THRESHOLD_SCHEDULE: Record<number, number | null> = {
  1: 0.65, 2: 0.65,
  3: 0.60, 4: 0.55,
  5: null, // bypass — auto-send
};

export const CONFIRMATION_MIN_POOL_VOTES = 3;
export const CONFIRMATION_MIN_TOTAL_VOTES = 3;
export const CONFIRMATION_MIN_YES_VOTES = 3;

export const REJECTION_FLOOR_YES_RATE = 0.35;
export const REJECTION_FLOOR_MIN_VOTES = 8;

export const IMMEDIATE_CANCEL_POOL_VOTES = 6;

export const MAX_POOL_VOTES = 30;

// Friend recommendation scoring boost (added per recommendation, capped)
export const RECOMMENDATION_BOOST_PER = 5.0;   // +5 points per unique recommendation
export const RECOMMENDATION_BOOST_CAP = 15.0;  // max +15 total boost
