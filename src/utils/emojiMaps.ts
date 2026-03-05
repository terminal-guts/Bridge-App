/**
 * Shared emoji maps for values and interests displayed on profiles.
 * Used across all profile view screens — NOT in edit/onboarding flows.
 */

export const VALUES_EMOJI: Record<string, string> = {
  // Personal
  'Honesty': '💛',
  'Integrity': '💎',
  'Trust': '🔒',
  'Respect': '🌟',
  'Authenticity': '🪞',
  'Kindness': '💗',
  'Empathy': '🧡',
  // Relationship
  'Communication': '💬',
  'Commitment': '💍',
  'Independence': '🦅',
  'Romance': '🌹',
  // Life
  'Family': '👨‍👩‍👧',
  'Career': '💼',
  'Ambition': '🎯',
  'Work-Life Balance': '⚖️',
  'Adventure': '🌍',
  'Stability': '🏡',
  'Growth Mindset': '🌱',
  'Creativity': '🎨',
  // Social
  'Community': '🏘️',
  'Social Justice': '✊',
  'Environmentalism': '🌿',
  'Diversity': '🌈',
  // Personal Growth
  'Spirituality': '🙏',
  'Health': '💪',
  // Extended / older profile data
  'Loyalty': '🤝',
  'Innovation': '💡',
  'Leadership': '👑',
  'Humor': '😄',
  'Curiosity': '🔍',
  'Passion': '🔥',
  'Open-Mindedness': '🌐',
  'Gratitude': '🙌',
};

export const INTERESTS_EMOJI: Record<string, string> = {
  // Activities
  'Tennis': '🎾',
  'Golf': '⛳',
  'Running': '🏃',
  'Yoga': '🧘',
  'Hiking': '🥾',
  'Skiing': '⛷️',
  'Basketball': '🏀',
  'Lifting': '🏋️',
  'Live Sports': '🏟️',
  'Watching Sports': '📺',
  // Culture & Entertainment
  'Museums': '🏛️',
  'Theater': '🎭',
  'Live Music': '🎵',
  'Comedy Shows': '😂',
  'Film': '🎬',
  'Reading': '📖',
  'Photography': '📷',
  // Food & Drink
  'Cooking': '🍳',
  'Coffee': '☕',
  'Cocktails': '🍸',
  'Fine Dining': '🍽️',
  'Brunch': '🥞',
  // Travel & Adventure
  'Travel': '✈️',
  'Camping': '⛺',
  // Lifestyle
  'Startups': '🚀',
  'Investing': '📈',
  'Real Estate': '🏠',
  'Fashion': '👗',
  'Meditation': '🧘',
  'Podcasts': '🎙️',
  // Social
  'Dinner Parties': '🥂',
  'Game Nights': '🎲',
  'Dancing': '💃',
  'Trivia Nights': '🧠',
  'Poker': '🃏',
  'Video Games': '🎮',
  // Extended / older profile data
  'Volunteering': '🤲',
  'Art': '🖼️',
  'Music': '🎸',
  'Writing': '✍️',
  'Fitness': '💪',
  'Swimming': '🏊',
  'Cycling': '🚴',
  'Climbing': '🧗',
};

/**
 * Returns the emoji for a value or interest, falling back to '•' if not found.
 * Case-insensitive lookup.
 */
export function getEmoji(text: string, map: Record<string, string>): string {
  const key = Object.keys(map).find(k => k.toLowerCase() === text.toLowerCase());
  return key ? map[key] : '•';
}

/** Convenience wrappers */
export const valueEmoji = (v: string) => getEmoji(v, VALUES_EMOJI);
export const interestEmoji = (i: string) => getEmoji(i, INTERESTS_EMOJI);
