/**
 * Proposal Review — Pure helpers, interfaces, and similarity maps.
 * Extracted from ProposalReviewView.tsx for maintainability.
 */

import { MatchResult } from '../../../utils/proposalMatching';

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface DeepQuestionData {
  questionId: number;
  questionText: string;
  userAAnswer?: string;
  userBAnswer?: string;
}

export interface SmartPillResult {
  greenPairs: { item: string }[];
  yellowPairs: { itemA: string; itemB: string }[];
  greyA: string[];
  greyB: string[];
  percentMatch: number;
}

// ─── Pure helpers ────────────────────────────────────────────────────────────
export const countMatch = (results: MatchResult[]) =>
  results.filter(r => r.status === 'both_happy').length;

export const countKnown = (results: MatchResult[]) =>
  results.filter(r => r.status !== 'unknown').length;

// ─── Smart pill matching ─────────────────────────────────────────────────────
export function computeSmartPills(
  tagsA: string[],
  tagsB: string[],
  similarityMap: Record<string, string[]>,
): SmartPillResult {
  const setB = new Set(tagsB);
  const setA = new Set(tagsA);

  // Green: exact matches
  const greenPairs: { item: string }[] = [];
  const usedA = new Set<string>();
  const usedB = new Set<string>();

  for (const item of tagsA) {
    if (setB.has(item)) {
      greenPairs.push({ item });
      usedA.add(item);
      usedB.add(item);
    }
  }

  // Yellow: similar matches (only for items not already green-matched)
  const yellowPairs: { itemA: string; itemB: string }[] = [];
  for (const itemA of tagsA) {
    if (usedA.has(itemA)) continue;
    const similars = similarityMap[itemA] || [];
    for (const sim of similars) {
      if (setB.has(sim) && !usedB.has(sim)) {
        yellowPairs.push({ itemA, itemB: sim });
        usedA.add(itemA);
        usedB.add(sim);
        break;
      }
    }
  }

  // Grey: unmatched items
  const greyA = tagsA.filter(t => !usedA.has(t));
  const greyB = tagsB.filter(t => !usedB.has(t));

  // Percentage
  const maxLen = Math.max(tagsA.length, tagsB.length, 1);
  const score = (greenPairs.length * 1.0 + yellowPairs.length * 0.5) / maxLen * 100;
  const percentMatch = Math.round(score);

  return { greenPairs, yellowPairs, greyA, greyB, percentMatch };
}

// ─── Similarity maps ─────────────────────────────────────────────────────────
export const INTERESTS_SIMILARITY: Record<string, string[]> = {
  'Baking': ['Cooking'],
  'Cooking': ['Baking'],
  'Lifting': ['Yoga', 'Pilates', 'Climbing', 'Swimming', 'Running', 'Cycling', 'Fitness'],
  'Yoga': ['Lifting', 'Pilates', 'Wellness', 'Fitness'],
  'Pilates': ['Lifting', 'Yoga', 'Wellness', 'Fitness'],
  'Climbing': ['Lifting', 'Hiking', 'Skiing', 'Fitness'],
  'Swimming': ['Lifting', 'Fitness'],
  'Running': ['Lifting', 'Cycling', 'Fitness'],
  'Cycling': ['Lifting', 'Running', 'Fitness'],
  'Fitness': ['Lifting', 'Yoga', 'Pilates', 'Climbing', 'Swimming', 'Running', 'Cycling'],
  'Live Sports': ['Watching Sports', 'Soccer', 'Basketball', 'Tennis', 'Golf'],
  'Watching Sports': ['Live Sports', 'Soccer', 'Basketball', 'Tennis', 'Golf'],
  'Soccer': ['Live Sports', 'Watching Sports', 'Basketball', 'Tennis', 'Golf'],
  'Basketball': ['Live Sports', 'Watching Sports', 'Soccer', 'Tennis', 'Golf'],
  'Tennis': ['Live Sports', 'Watching Sports', 'Soccer', 'Basketball', 'Golf'],
  'Golf': ['Live Sports', 'Watching Sports', 'Soccer', 'Basketball', 'Tennis'],
  'Coffee': ['Fine Dining', 'Dinner Parties'],
  'Fine Dining': ['Coffee', 'Dinner Parties'],
  'Dinner Parties': ['Coffee', 'Fine Dining'],
  'Travel': ['International Travel', 'Weekend Trips', 'Camping', 'Hiking'],
  'International Travel': ['Travel', 'Weekend Trips', 'Camping', 'Hiking'],
  'Weekend Trips': ['Travel', 'International Travel', 'Camping', 'Hiking'],
  'Camping': ['Travel', 'International Travel', 'Weekend Trips', 'Hiking'],
  'Hiking': ['Travel', 'International Travel', 'Weekend Trips', 'Camping', 'Skiing', 'Climbing'],
  'Karaoke': ['Live Music', 'Concerts', 'Music', 'Dancing'],
  'Live Music': ['Karaoke', 'Concerts', 'Music', 'Dancing'],
  'Concerts': ['Karaoke', 'Live Music', 'Music', 'Dancing'],
  'Music': ['Karaoke', 'Live Music', 'Concerts', 'Dancing'],
  'Dancing': ['Karaoke', 'Live Music', 'Concerts', 'Music'],
  'Game Nights': ['Video Games', 'Poker'],
  'Video Games': ['Game Nights', 'Poker'],
  'Poker': ['Game Nights', 'Video Games'],
  'Art Galleries': ['Museums', 'Photography', 'Film'],
  'Museums': ['Art Galleries', 'Photography', 'Film'],
  'Photography': ['Art Galleries', 'Museums', 'Film'],
  'Film': ['Art Galleries', 'Museums', 'Photography'],
  'Reading': ['Writing'],
  'Writing': ['Reading'],
  'Wellness': ['Yoga', 'Pilates'],
  'Skiing': ['Hiking', 'Climbing'],
};

export const VALUES_SIMILARITY: Record<string, string[]> = {
  'Honesty': ['Integrity', 'Authenticity', 'Trust', 'Respect'],
  'Integrity': ['Honesty', 'Authenticity', 'Trust', 'Respect'],
  'Authenticity': ['Honesty', 'Integrity', 'Trust'],
  'Trust': ['Honesty', 'Integrity', 'Authenticity', 'Loyalty'],
  'Loyalty': ['Commitment', 'Trust', 'Friendship First'],
  'Commitment': ['Loyalty', 'Trust', 'Stability', 'Friendship First'],
  'Friendship First': ['Loyalty', 'Commitment', 'Community', 'Kindness'],
  'Independence': ['Ambition', 'Career', 'Leadership'],
  'Ambition': ['Independence', 'Career', 'Leadership', 'Growth Mindset', 'Success'],
  'Career': ['Independence', 'Ambition', 'Leadership', 'Success'],
  'Leadership': ['Independence', 'Ambition', 'Career'],
  'Empathy': ['Kindness', 'Emotional Intelligence', 'Communication'],
  'Kindness': ['Empathy', 'Emotional Intelligence', 'Communication', 'Community', 'Friendship First'],
  'Emotional Intelligence': ['Empathy', 'Kindness', 'Communication'],
  'Communication': ['Empathy', 'Kindness', 'Emotional Intelligence', 'Romance'],
  'Growth Mindset': ['Self-Improvement', 'Ambition'],
  'Self-Improvement': ['Growth Mindset', 'Ambition'],
  'Stability': ['Work-Life Balance', 'Health', 'Commitment'],
  'Work-Life Balance': ['Stability', 'Health'],
  'Health': ['Stability', 'Work-Life Balance'],
  'Community': ['Friendship First', 'Kindness'],
  'Adventure': ['Creativity'],
  'Creativity': ['Adventure', 'Innovation'],
  'Romance': ['Communication'],
  'Success': ['Ambition', 'Career'],
  'Respect': ['Integrity', 'Honesty'],
  'Innovation': ['Creativity'],
};
