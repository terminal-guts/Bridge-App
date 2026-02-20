/**
 * Question Tiers Utility
 *
 * Centralized logic for managing deep question tiers.
 * Questions are organized into 3 tiers based on their ID ranges.
 */

export type QuestionTier = 1 | 2 | 3;

/**
 * Get the tier for a given question ID
 *
 * Tier 1 (Getting to Know You): Questions 1-7
 * Tier 2 (Going Deeper): Questions 8-14
 * Tier 3 (Building Connection): Questions 15-21
 */
export const getQuestionTier = (questionId: number): QuestionTier => {
  if (questionId >= 1 && questionId <= 7) return 1;
  if (questionId >= 8 && questionId <= 14) return 2;
  return 3;
};

/**
 * Tier configuration for UI display
 * Warm, inviting palette harmonized with app's blue theme
 */
export const TIER_CONFIG = {
  1: {
    emoji: '👋',
    name: 'Getting to Know You',
    bg: '#DBEAFE',      // Sky blue
    border: '#93C5FD',  // Sky blue border
    iconBg: 'bg-sky-400',
    iconColor: '#38BDF8',
    color: '#0284C7',   // Deep sky blue for shadows
  },
  2: {
    emoji: '💭',
    name: 'Going Deeper',
    bg: '#D1FAE5',      // Emerald/teal green - VERY DIFFERENT from blue
    border: '#6EE7B7',  // Bright emerald border
    iconBg: 'bg-emerald-400',
    iconColor: '#34D399',
    color: '#059669',   // Deep emerald for shadows
  },
  3: {
    emoji: '💜',
    name: 'Building Connection',
    bg: '#FCE7F3',      // Pink
    border: '#F9A8D4',  // Pink border
    iconBg: 'bg-fuchsia-400',
    iconColor: '#E879F9',
    color: '#C026D3',   // Deep fuchsia for shadows
  },
} as const;

/**
 * Calculate tier statistics from answered questions
 */
export const calculateTierStats = (answeredQuestions: Array<{ tier: number }>) => {
  return {
    1: answeredQuestions.filter(q => q.tier === 1).length,
    2: answeredQuestions.filter(q => q.tier === 2).length,
    3: answeredQuestions.filter(q => q.tier === 3).length,
  };
};

/**
 * Count how many questions from each tier are in the displayed list
 */
export const countDisplayedByTier = (displayedIds: number[]): Record<QuestionTier, number> => {
  const counts: Record<QuestionTier, number> = { 1: 0, 2: 0, 3: 0 };

  displayedIds.forEach(id => {
    const tier = getQuestionTier(id);
    counts[tier]++;
  });

  return counts;
};

/**
 * Validate tier distribution for displayed questions
 * Returns { valid: true } or { valid: false, error: string, tier?: number }
 */
export const validateTierDistribution = (displayedIds: number[]):
  | { valid: true }
  | { valid: false; error: string; tier?: QuestionTier } => {

  if (displayedIds.length > 3) {
    return {
      valid: false,
      error: 'Maximum 3 questions can be displayed',
    };
  }

  const tierCounts = countDisplayedByTier(displayedIds);

  // Check if any tier has more than 1 question
  for (const tier of [1, 2, 3] as QuestionTier[]) {
    if (tierCounts[tier] > 1) {
      return {
        valid: false,
        error: `Only 1 question per tier can be displayed`,
        tier,
      };
    }
  }

  return { valid: true };
};

/**
 * Get the total number of questions per tier
 * Tier 1: 7 questions
 * Tier 2: 7 questions
 * Tier 3: 7 questions
 */
export const QUESTIONS_PER_TIER = 7;

/**
 * Get the total number of questions across all tiers
 * 21 total questions (7 per tier)
 */
export const TOTAL_QUESTIONS = 21;
