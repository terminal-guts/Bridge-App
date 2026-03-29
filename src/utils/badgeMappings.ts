/**
 * Badge to Tag Mappings
 *
 * Maps badge icon names to their corresponding Profile Values or Interests.
 * This allows the UI to display "verified" badges next to profile tags.
 */

export const BADGE_TO_TAG_MAP: Record<string, string[]> = {
  // Character & Heart
  'loyal-char-001': ['Loyalty', 'Friendship First'],
  'honest-char-002': ['Honesty', 'Authenticity'],
  'trustworthy-char-003': ['Trust', 'Integrity'],
  'generous-char-004': ['Generosity'],
  'kind-char-005': ['Kindness', 'Compassion'],
  'humble-char-006': ['Authenticity'],
  'patient-char-007': ['Kindness'],
  'brave-char-008': ['Adventure', 'Ambition'],
  'resilient-char-009': ['Growth Mindset'],
  'determined-char-010': ['Ambition', 'Growth Mindset'],

  // Social & Energy
  'funny-char-011': ['Humor'],
  'life-of-the-party-char-012': ['Social', 'Dancing'],
  'great-listener-char-013': ['Communication', 'Empathy'],
  'supportive-char-014': ['Community', 'Kindness'],
  'encouraging-char-015': ['Growth Mindset', 'Communication'],
  'hype-person-char-016': ['Social', 'Live Music'],
  'peacemaker-char-017': ['Communication', 'Spirituality'],
  'inclusive-char-018': ['Diversity', 'Social Justice'],
  'warm-char-019': ['Kindness', 'Empathy'],
  'charismatic-char-020': ['Leadership', 'Social'],

  // Reliability
  'always-there-char-021': ['Commitment', 'Family'],
  'dependable-char-022': ['Trust', 'Stability'],
  'on-time-char-023': ['Integrity', 'Career'],
  'keeps-promises-char-024': ['Honesty', 'Integrity'],
  'ride-or-die-char-025': ['Loyalty', 'Friendship First'],
  'rock-solid-char-026': ['Stability', 'Integrity'],
  'consistent-char-027': ['Stability', 'Commitment'],
  'got-your-back-char-028': ['Trust', 'Loyalty'],

  // Intelligence & Growth
  'wise-char-029': ['Growth Mindset', 'Spirituality'],
  'creative-char-030': ['Creativity', 'Art'],
  'problem-solver-char-031': ['Innovation', 'Startups'],
  'curious-char-032': ['Curiosity', 'Reading'],
  'deep-thinker-char-033': ['Spirituality', 'Curiosity'],
  'big-picture-char-034': ['Innovation', 'Leadership'],
  'street-smart-char-035': ['Independence', 'Adventure'],

  // Relationship Qualities
  'romantic-char-036': ['Romance', 'Intimacy'],
  'thoughtful-gifter-char-037': ['Kindness', 'Generosity'],
  'great-communicator-char-038': ['Communication', 'Partnership'],
  'emotionally-aware-char-039': ['Empathy', 'Communication'],
  'good-with-families-char-040': ['Family'],
  'adventurous-dater-char-041': ['Adventure', 'Romance'],
  'best-wingman-char-042': ['Friendship First', 'Community'],

  // Wellness & Mind
  'cognitive-8926637': ['Innovation', 'Creativity'],
  'counseling-8926640': ['Respect', 'Empathy'],
  'empathy-8926643': ['Empathy', 'Compassion'],
  'meditation-8926645': ['Meditation', 'Spirituality'],
  'mental-health-8926647': ['Health'],
  'observation-8926650': ['Curiosity'],
  'open-minded-8926651': ['Open-Mindedness', 'Diversity'],

  // Sports & Fitness
  'american-football-5303238': ['Live Sports', 'Watching Sports'],
  'basketball-5303247': ['Basketball'],
  'bicycle-5303248': ['Cycling'],
  'climbing-5303254': ['Climbing'],
  'golf-5303258': ['Golf'],
  'podium-5303268': ['Leadership', 'Ambition'],
  'running-5303272': ['Running'],
  'swim-5303278': ['Swimming'],
  'tennis-5303280': ['Tennis'],
  'torch-5303281': ['Passion'],
  'weightlifting-5303285': ['Lifting', 'Health'],

  // Hobbies & Home
  'breakfast-2037371': ['Brunch', 'Cooking'],
  'coffee-break-2037367': ['Coffee'],
  'cooking-2037366': ['Cooking'],
  'couple-conversation-2037365': ['Communication', 'Partnership'],
  'family-protection-2037362': ['Family', 'Stability'],
  'guitar-2037350': ['Music', 'Art'],
  'listening-to-music-2037357': ['Music'],
  'painting-2037352': ['Art', 'Creativity'],
  'planting-2037351': ['Gratitude', 'Health'],
  'playing-video-game-2037349': ['Video Games'],
  'podcast-2037347': ['Podcasts'],
  'reading-newspaper-2037346': ['Reading'],
  'trading-stock-2037337': ['Investing'],
  'treadmill-2037332': ['Fitness', 'Health'],
  'writing-a-diary-2037331': ['Writing', 'Authenticity'],
  'yoga-pose-2037330': ['Yoga', 'Wellbeing'],
};

/**
 * Returns a Set of tag names that are verified by the given list of badge icon names.
 */
export function getVerifiedTags(badgeIconNames: string[]): Set<string> {
  const verified = new Set<string>();
  badgeIconNames.forEach(iconName => {
    const tags = BADGE_TO_TAG_MAP[iconName];
    if (tags) {
      tags.forEach(tag => verified.add(tag.toLowerCase()));
    }
  });
  return verified;
}
