/**
 * Deep Questions for Profile
 *
 * 15 curated questions — a mix of lighthearted, relationship, and reflective.
 * Users select any 3 to display publicly, but can answer more to improve match quality.
 *
 * IDs are stable (existing answers in DB reference them). Removed questions (3, 4, 7, 8,
 * 11, 17, 18, 19, 20) are simply absent — old answers with those IDs still render via
 * getQuestionById fallback but won't appear in the selection UI.
 */

export interface DeepQuestion {
  id: number;
  question: string;
}

export const DEEP_QUESTIONS: DeepQuestion[] = [
  // ── Tier 1: Lighthearted ──────────────────────────────────────────────────
  {
    id: 1,
    question: "Given the choice of anyone alive or dead, whom would you want as a dinner guest?",
  },
  {
    id: 2,
    question: "Would you like to be famous? Why?",
  },
  {
    id: 5,
    question: "If you could wake up tomorrow having gained any one quality or ability, what would it be?",
  },
  {
    id: 6,
    question: "Your house catches fire. What one item would you save?",
  },
  {
    id: 22,
    question: "What's the best trip or adventure you've ever been on?",
  },
  // ── Tier 2: Relationship ──────────────────────────────────────────────────
  {
    id: 9,
    question: "When you're overwhelmed or stressed, what actually helps you feel supported?",
  },
  {
    id: 10,
    question: "What are three qualities you value most in your closest friendships?",
  },
  {
    id: 12,
    question: "What do you notice first when you're attracted to someone?",
  },
  {
    id: 13,
    question: "What's something you're actively trying to improve about yourself right now?",
  },
  {
    id: 23,
    question: "What's something you could talk about for hours without getting bored?",
  },
  // ── Tier 3: Reflective ────────────────────────────────────────────────────
  {
    id: 14,
    question: "Is there something you've dreamed of doing for a long time? Why haven't you done it?",
  },
  {
    id: 15,
    question: "What is your greatest accomplishment?",
  },
  {
    id: 16,
    question: "If a crystal ball could tell you the truth about anything, what would you want to know?",
  },
  {
    id: 21,
    question: "Share an embarrassing moment that taught you something about yourself.",
  },
  {
    id: 24,
    question: "What's a belief or opinion you've changed your mind about recently?",
  },
];

/**
 * Get a question by ID
 */
export const getQuestionById = (id: number): DeepQuestion | undefined => {
  return DEEP_QUESTIONS.find(q => q.id === id);
};

/**
 * Get all unanswered questions
 */
export const getUnansweredQuestions = (answeredIds: number[]): DeepQuestion[] => {
  return DEEP_QUESTIONS.filter(q => !answeredIds.includes(q.id));
};
