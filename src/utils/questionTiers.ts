/**
 * Question Tiers Utility
 *
 * Centralized logic for managing deep question tiers.
 * Questions are organized into 3 tiers (5 questions each).
 * IDs are non-contiguous (some were removed), so tiers use explicit sets.
 */

export type QuestionTier = 1 | 2 | 3;

/**
 * Explicit tier membership — source of truth.
 *
 * Tier 1 (Lighthearted): 1, 2, 5, 6, 22
 * Tier 2 (Relationship):  9, 10, 12, 13, 23
 * Tier 3 (Reflective):    14, 15, 16, 21, 24
 */
const TIER_1_IDS = new Set([1, 2, 5, 6, 22]);
const TIER_2_IDS = new Set([9, 10, 12, 13, 23]);
const TIER_3_IDS = new Set([14, 15, 16, 21, 24]);

/**
 * Get the tier for a given question ID
 */
export const getQuestionTier = (questionId: number): QuestionTier => {
  if (TIER_1_IDS.has(questionId)) return 1;
  if (TIER_2_IDS.has(questionId)) return 2;
  return 3;
};

/**
 * Tier configuration for UI display
 * Warm, inviting palette harmonized with app's blue theme
 */
export const TIER_CONFIG = {
  1: {
    emoji: 'smiling-face',
    name: 'Lighthearted',
    bg: '#DBEAFE',      // Sky blue
    border: '#93C5FD',  // Sky blue border
    iconBg: 'bg-sky-400',
    iconColor: '#38BDF8',
    color: '#0284C7',   // Deep sky blue for shadows
  },
  2: {
    emoji: 'message-circle',
    name: 'Relationship',
    bg: '#D1FAE5',      // Emerald/teal green - VERY DIFFERENT from blue
    border: '#6EE7B7',  // Bright emerald border
    iconBg: 'bg-emerald-400',
    iconColor: '#34D399',
    color: '#059669',   // Deep emerald for shadows
  },
  3: {
    emoji: 'heart',
    name: 'Reflective',
    bg: '#FCE7F3',      // Pink
    border: '#F9A8D4',  // Pink border
    iconBg: 'bg-fuchsia-400',
    iconColor: '#E879F9',
    color: '#C026D3',   // Deep fuchsia for shadows
  },
} as const;

