/**
 * Shared icon maps for values and interests displayed on profiles.
 * Used across all profile view screens — NOT in edit/onboarding flows.
 */

import React from 'react';
import { EvaIcon, IconScoutIcon } from '../components/icons';

// Map to either IconScoutName or { type: 'eva', name: EvaIconName }
export type IconDef =
  | string // IconScout icon name
  | { type: 'eva'; name: string; color?: string }
  | { type: 'custom'; name: string; color?: string };

export const VALUES_ICONS: Record<string, IconDef> = {
  // Personal
  'Honesty': 'honesty',
  'Integrity': 'integrity',
  'Trust': 'trust',
  'Respect': 'respect',
  'Authenticity': 'authenticity',
  'Kindness': 'kindness',
  'Empathy': 'empathy',
  // Relationship
  'Communication': 'communication',
  'Commitment': 'commitment',
  'Independence': 'independence',
  'Romance': 'romance',
  // Life
  'Family': 'family',
  'Career': 'career',
  'Ambition': 'ambitious',
  'Work-Life Balance': 'work-life-balance',
  'Adventure': 'adventure',
  'Stability': 'stability',
  'Growth Mindset': 'growth',
  'Creativity': 'creativity',
  // Social
  'Community': 'comminity',
  'Social Justice': 'social-justice',
  'Environmentalism': 'environmentalism',
  'Diversity': 'diversity',
  // Personal Growth
  'Spirituality': 'spirituality',
  'Health': 'health',
  // Extended / older profile data
  'Loyalty': 'loyalty',
  'Innovation': 'startup',
  'Leadership': 'ambitious',
  'Humor': { type: 'eva', name: 'smiling-face' },
  'Curiosity': { type: 'eva', name: 'search' },
  'Passion': 'romance',
  'Open-Mindedness': 'diversity',
  'Gratitude': 'kindness',
};

export const INTERESTS_ICONS: Record<string, IconDef> = {
  // Activities
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
  // Culture & Entertainment
  'Museums': 'museums',
  'Theater': 'theater',
  'Live Music': 'live-music',
  'Comedy Shows': 'comedy-shows',
  'Film': 'film',
  'Reading': 'reading',
  'Photography': 'photography',
  // Food & Drink
  'Cooking': 'cooking',
  'Coffee': 'coffee',
  'Cocktails': 'cocktail',
  'Fine Dining': 'fine-dining',
  'Brunch': 'brunch',
  // Travel & Adventure
  'Travel': 'travel',
  'Camping': 'camping',
  // Lifestyle
  'Startups': 'startup',
  'Investing': 'investing',
  'Real Estate': 'real-estate',
  'Fashion': 'fashion',
  'Meditation': 'meditation',
  'Podcasts': 'podcast',
  // Social
  'Dinner Parties': 'dinner-parties',
  'Game Nights': 'game-nights',
  'Dancing': 'dance',
  'Trivia Nights': 'trivia-nights',
  'Poker': 'poker',
  'Video Games': 'video-game',
  // Extended / older profile data
  'Volunteering': 'generosity',
  'Art': 'creativity',
  'Music': 'live-music',
  'Writing': 'reading',
  'Fitness': 'lifting',
  'Swimming': 'health',
  'Cycling': 'running',
  'Climbing': 'hiking',
};

/**
 * Returns the icon definition for a value or interest.
 * Case-insensitive lookup.
 */
export function getIconDef(text: string, map: Record<string, IconDef>): IconDef | undefined {
  const key = Object.keys(map).find(k => k.toLowerCase() === text.toLowerCase());
  return key ? map[key] : undefined;
}

/** Convenience wrappers returning IconDef */
export const getValueIconDef = (v: string) => getIconDef(v, VALUES_ICONS);
export const getInterestIconDef = (i: string) => getIconDef(i, INTERESTS_ICONS);

export interface RenderIconProps {
  iconDef: IconDef | undefined;
  size?: number;
  color?: string;
  style?: any;
}

export function RenderIcon({ iconDef, size = 16, color, style }: RenderIconProps) {
  if (!iconDef) return null;

  if (typeof iconDef === 'string') {
    return <IconScoutIcon name={iconDef} size={size} color={color} style={style} />;
  }

  if (iconDef.type === 'eva') {
    return <EvaIcon name={iconDef.name} size={size} color={iconDef.color || color} style={style} variant="fill" />;
  }

  // Optional support for custom SVGs if implemented later
  if (iconDef.type === 'custom') {
    // If you need custom icons like FireIcon, you would import and render them here.
    // For now we will return an EvaIcon fallback or null
    return <EvaIcon name="star" size={size} color={iconDef.color || color} style={style} variant="fill" />;
  }

  return null;
}

// Keeping these for backwards compatibility until all usages are replaced
// But they will return an empty string to force text components to not render emojis
export const VALUES_EMOJI: Record<string, string> = {};
export const INTERESTS_EMOJI: Record<string, string> = {};
export function getEmoji(text: string, map: Record<string, string>): string { return ''; }
export const valueEmoji = (v: string) => '';
export const interestEmoji = (i: string) => '';
