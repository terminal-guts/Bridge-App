/**
 * Icon maps for values and interests displayed on profiles.
 * Maps to IconScout registry names for premium SVG rendering.
 * Legacy emoji exports kept for backward compatibility.
 */

/** Maps value names → IconScout registry keys */
export const VALUES_ICONS: Record<string, string> = {
  'Honesty': 'honesty',
  'Integrity': 'medal-5303266',
  'Trust': 'trust',
  'Respect': 'counseling-8926640',
  'Authenticity': 'authenticity',
  'Kindness': 'kindness',
  'Empathy': 'empathy-8926643',
  'Communication': 'communication',
  'Commitment': 'commitment',
  'Independence': 'independence',
  'Romance': 'romance',
  'Family': 'family',
  'Career': 'career',
  'Ambition': 'ambitious',
  'Work-Life Balance': 'work-life-balance',
  'Adventure': 'adventure',
  'Stability': 'stability',
  'Growth Mindset': 'growth',
  'Creativity': 'creativity',
  'Community': 'community',
  'Social': 'community',
  'Social Justice': 'social-justice',
  'Environmentalism': 'environmentalism',
  'Diversity': 'olympic-5303267',
  'Spirituality': 'spirituality',
  'Health': 'health',
  'Wellbeing': 'health',
  'Loyalty': 'loyalty',
  'Innovation': 'cognitive-8926637',
  'Leadership': 'podium-5303268',
  'Humor': 'singing-2037342',
  'Curiosity': 'observation-8926650',
  'Passion': 'torch-5303281',
  'Open-Mindedness': 'open-minded-8926651',
  'Gratitude': 'planting-2037351',
  'Compassion': 'compassion',
  'Generosity': 'generosity',
  'Friendship First': 'friendship-first',
  'Intimacy': 'intimacy',
  'Partnership': 'partnership',
};

/** Maps interest names → IconScout registry keys */
export const INTERESTS_ICONS: Record<string, string> = {
  'Tennis': 'tennis',
  'Golf': 'golf',
  'Running': 'running',
  'Yoga': 'yoga',
  'Hiking': 'hiking',
  'Skiing': 'skiing',
  'Basketball': 'basketball',
  'Lifting': 'lifting',
  'Live Sports': 'live-sports',
  'Watching Sports': 'watching-sports',
  'Museums': 'museums',
  'Theater': 'theater',
  'Live Music': 'live-music',
  'Comedy Shows': 'comedy-shows',
  'Film': 'film',
  'Reading': 'reading',
  'Photography': 'photography',
  'Cooking': 'cooking',
  'Coffee': 'coffee',
  'Cocktails': 'cocktail',
  'Fine Dining': 'fine-dining',
  'Brunch': 'breakfast-2037371',
  'Travel': 'travel',
  'Camping': 'camping',
  'Startups': 'startup',
  'Investing': 'investing',
  'Real Estate': 'real-estate',
  'Fashion': 'fashion',
  'Meditation': 'meditation',
  'Podcasts': 'podcast',
  'Dinner Parties': 'dinner-parties',
  'Game Nights': 'game-nights',
  'Dancing': 'dance',
  'Trivia Nights': 'trivia-nights',
  'Poker': 'poker',
  'Video Games': 'video-game',
  'Volunteering': 'couple-conversation-2037365',
  'Art': 'painting-2037352',
  'Music': 'guitar-2037350',
  'Writing': 'writing-a-diary-2037331',
  'Fitness': 'treadmill-2037332',
  'Swimming': 'swim-5303278',
  'Cycling': 'bicycle-5303248',
  'Climbing': 'climbing-5303254',
};

/**
 * Look up the IconScout name for a value or interest.
 * Case-insensitive. Returns undefined if no match.
 */
export function getIconName(text: string, map: Record<string, string>): string | undefined {
  const key = Object.keys(map).find(k => k.toLowerCase() === text.toLowerCase());
  return key ? map[key] : undefined;
}

export const valueIconName = (v: string) => getIconName(v, VALUES_ICONS);
export const interestIconName = (i: string) => getIconName(i, INTERESTS_ICONS);

// ── Legacy emoji exports (backward compat) ──

export const VALUES_EMOJI: Record<string, string> = {
  'Honesty': '💛', 'Integrity': '💎', 'Trust': '🔒', 'Respect': '🌟',
  'Authenticity': '🪞', 'Kindness': '💗', 'Empathy': '🧡',
  'Communication': '💬', 'Commitment': '💍', 'Independence': '🦅', 'Romance': '🌹',
  'Family': '👨‍👩‍👧', 'Career': '💼', 'Ambition': '🎯', 'Work-Life Balance': '⚖️',
  'Adventure': '🌍', 'Stability': '🏡', 'Growth Mindset': '🌱', 'Creativity': '🎨',
  'Community': '🏘️', 'Social Justice': '✊', 'Environmentalism': '🌿', 'Diversity': '🌈',
  'Spirituality': '🙏', 'Health': '💪', 'Loyalty': '🤝', 'Innovation': '💡',
  'Leadership': '👑', 'Humor': '😄', 'Curiosity': '🔍', 'Passion': '🔥',
  'Open-Mindedness': '🌐', 'Gratitude': '🙌',
};

export const INTERESTS_EMOJI: Record<string, string> = {
  'Tennis': '🎾', 'Golf': '⛳', 'Running': '🏃', 'Yoga': '🧘', 'Hiking': '🥾',
  'Skiing': '⛷️', 'Basketball': '🏀', 'Lifting': '🏋️', 'Live Sports': '🏟️',
  'Watching Sports': '📺', 'Museums': '🏛️', 'Theater': '🎭', 'Live Music': '🎵',
  'Comedy Shows': '😂', 'Film': '🎬', 'Reading': '📖', 'Photography': '📷',
  'Cooking': '🍳', 'Coffee': '☕', 'Cocktails': '🍸', 'Fine Dining': '🍽️',
  'Brunch': '🥞', 'Travel': '✈️', 'Camping': '⛺', 'Startups': '🚀',
  'Investing': '📈', 'Real Estate': '🏠', 'Fashion': '👗', 'Meditation': '🧘',
  'Podcasts': '🎙️', 'Dinner Parties': '🥂', 'Game Nights': '🎲', 'Dancing': '💃',
  'Trivia Nights': '🧠', 'Poker': '🃏', 'Video Games': '🎮', 'Volunteering': '🤲',
  'Art': '🖼️', 'Music': '🎸', 'Writing': '✍️', 'Fitness': '💪',
  'Swimming': '🏊', 'Cycling': '🚴', 'Climbing': '🧗',
};

export function getEmoji(text: string, map: Record<string, string>): string {
  const key = Object.keys(map).find(k => k.toLowerCase() === text.toLowerCase());
  return key ? map[key] : '•';
}

export const valueEmoji = (v: string) => getEmoji(v, VALUES_EMOJI);
export const interestEmoji = (i: string) => getEmoji(i, INTERESTS_EMOJI);
