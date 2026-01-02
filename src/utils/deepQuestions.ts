/**
 * Deep Questions for Profile
 *
 * 21 questions users can answer to display on their profile and inform matching.
 * Users select any 3 to display publicly, but can answer more to improve match quality.
 */

export interface DeepQuestion {
  id: number;
  question: string;
}

export const DEEP_QUESTIONS: DeepQuestion[] = [
  {
    id: 1,
    question: "Given the choice of anyone alive or dead, whom would you want as a dinner guest?",
  },
  {
    id: 2,
    question: "Would you like to be famous? Why?",
  },
  {
    id: 3,
    question: "Before making a telephone call, do you ever rehearse what you are going to say? Why?",
  },
  {
    id: 4,
    question: "When did you last sing to yourself? To someone else?",
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
    id: 7,
    question: "What would constitute a perfect day for you?",
  },
  {
    id: 8,
    question: "You are going to live until 90. Would you rather have the mind or body of your thirty year old self for the last 60 years of your life?",
  },
  {
    id: 9,
    question: "When you're overwhelmed or stressed, what actually helps you feel supported?",
  },
  {
    id: 10,
    question: "What are three qualities you value most in your closest friendships?",
  },
  {
    id: 11,
    question: "What are you most grateful for?",
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
    id: 17,
    question: "What are three things you hope to have in common with your future partner?",
  },
  {
    id: 18,
    question: "What qualities do you find most attractive in a potential partner, and why?",
  },
  {
    id: 19,
    question: "What would be important for someone to know about you if they were going to become a close friend or partner?",
  },
  {
    id: 20,
    question: "Complete this sentence: \"I wish I had someone with whom I could share...\"",
  },
  {
    id: 21,
    question: "Share an embarrassing moment that taught you something about yourself.",
  },
];

export const TOTAL_QUESTIONS = 21;
export const MAX_DISPLAYED_QUESTIONS = 3;

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
