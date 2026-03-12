import React from 'react';
import { EvaIcon } from '../components/icons';
import { IconScoutIcon } from '../components/icons/IconScoutIcon';
import { FireIcon } from '../components/icons/Icons';

export type IconDef =
  | string
  | { type: 'eva'; name: string; color?: string }
  | { type: 'custom'; name: string; color?: string };

export const VALUES_ICONS: Record<string, IconDef> = {
  'Honesty': 'honesty',
  'Integrity': 'integrity',
  'Trust': 'trust',
  'Respect': 'respect',
  'Authenticity': 'authenticity',
  'Kindness': 'kindness',
  'Empathy': 'empathy',
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
  'Social Justice': 'social-justice',
  'Environmentalism': 'environmentalism',
  'Diversity': 'diversity',
  'Spirituality': 'spirituality',
  'Health': 'health',
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
  'Brunch': 'brunch',
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
  'Volunteering': 'generosity',
  'Art': 'creativity',
  'Music': 'live-music',
  'Writing': 'reading',
  'Fitness': 'lifting',
  'Swimming': 'health',
  'Cycling': 'running',
  'Climbing': 'hiking',
};

export function getIconDef(text: string, map: Record<string, IconDef>): IconDef | undefined {
  const key = Object.keys(map).find(k => k.toLowerCase() === text.toLowerCase());
  return key ? map[key] : undefined;
}

export const getValueIconDef = (v: string) => getIconDef(v, VALUES_ICONS);
export const getInterestIconDef = (i: string) => getIconDef(i, INTERESTS_ICONS);

export interface RenderIconProps {
  iconDef: IconDef | undefined;
  size?: number;
  color?: string;
  style?: any;
}

export const RenderIcon = React.memo(function RenderIcon({ iconDef, size = 16, color, style }: RenderIconProps) {
  if (!iconDef) return null;

  if (typeof iconDef === 'string') {
    return <IconScoutIcon name={iconDef} size={size} color={color} style={style} />;
  }

  if (iconDef.type === 'eva') {
    return <EvaIcon name={iconDef.name as any} size={size} color={iconDef.color || color} style={style} variant="fill" />;
  }

  if (iconDef.type === 'custom' && iconDef.name === 'flash') {
    return <FireIcon size={size} color={iconDef.color || color} />;
  }

  return null;
});

export const VALUES_EMOJI: Record<string, string> = {};
export const INTERESTS_EMOJI: Record<string, string> = {};
export function getEmoji(text: string, map: Record<string, string>): string { return ''; }
export const valueEmoji = (v: string) => '';
export const interestEmoji = (i: string) => '';
