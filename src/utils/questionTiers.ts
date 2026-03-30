/**
 * Question Tiers Utility
 *
 * Centralized logic for managing deep question tiers.
 * Questions are organized into 3 tiers (5 questions each).
 * IDs are non-contiguous (some were removed), so tiers use explicit sets.
 */

import { COLORS } from '../theme/colors';

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
    bg: COLORS.card,
    border: COLORS.border,
    iconBg: 'bg-sky-400',
    iconColor: '#38BDF8',
    color: COLORS.primary,
  },
  2: {
    emoji: 'message-circle',
    name: 'Relationship',
    bg: COLORS.card,
    border: COLORS.success,
    iconBg: 'bg-emerald-400',
    iconColor: '#34D399',
    color: COLORS.success,
  },
  3: {
    emoji: 'heart',
    name: 'Reflective',
    bg: COLORS.card,
    border: COLORS.border,
    iconBg: 'bg-fuchsia-400',
    iconColor: '#E879F9',
    color: COLORS.primary,
  },
} as const;

