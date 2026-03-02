/**
 * Shared constants for Bridge Edge Functions
 */

export const FRIEND_VOTE_WEIGHT = 1.25;
export const MAX_PROPOSAL_DAYS = 5;
export const DECISION_DEADLINE_HOURS = 48;

export const THRESHOLD_SCHEDULE: Record<number, number | null> = {
  1: 0.65, 2: 0.65,
  3: 0.60, 4: 0.55,
  5: null, // bypass — auto-send
};

export const CONFIRMATION_MIN_POOL_VOTES = 6;
export const CONFIRMATION_MIN_TOTAL_VOTES = 12;
export const CONFIRMATION_MIN_YES_VOTES = 8;

export const REJECTION_FLOOR_YES_RATE = 0.35;
export const REJECTION_FLOOR_MIN_VOTES = 12;

export const IMMEDIATE_CANCEL_POOL_VOTES = 6;

export const POOL_ELIGIBILITY_POOL_YES_RATE = 0.35;
export const POOL_ELIGIBILITY_FRIEND_MIN_VOTES = 6;
export const POOL_ELIGIBILITY_FRIEND_YES_RATE = 0.70;

export const MAX_POOL_VOTES = 30;
