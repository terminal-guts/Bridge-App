/**
 * Community Helpers - Utility Functions
 *
 * Shared utilities for the Community Matching System:
 * - Time formatting
 * - Friend statistics
 * - Match milestones
 * - Sorting and filtering
 */

import { FriendWithGridStatus, ActiveMatch } from '../types/community';

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format expiration time in a human-readable way
 * Examples:
 * - "23 hours"
 * - "5 hours" (warning level)
 * - "2 hours" (urgent level)
 * - "45 minutes"
 */
export function formatExpirationTime(expiresAt: string): {
  text: string;
  urgencyLevel: 'normal' | 'warning' | 'urgent';
} {
  const now = new Date().getTime();
  const expiration = new Date(expiresAt).getTime();
  const diff = expiration - now;

  if (diff <= 0) {
    return { text: 'Expired', urgencyLevel: 'urgent' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let urgencyLevel: 'normal' | 'warning' | 'urgent' = 'normal';
  if (hours < 3) urgencyLevel = 'urgent';
  else if (hours < 6) urgencyLevel = 'warning';

  if (hours === 0) {
    return {
      text: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`,
      urgencyLevel,
    };
  }

  return {
    text: `${hours} ${hours === 1 ? 'hour' : 'hours'}`,
    urgencyLevel,
  };
}

/**
 * Format relative time for timestamps
 * Examples:
 * - "Just now"
 * - "2 minutes ago"
 * - "3 hours ago"
 * - "Yesterday"
 * - "2 days ago"
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date().getTime();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  // Format as date for older items
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format "friend since" date
 * Examples:
 * - "Friends for 3 months"
 * - "Friends for 2 weeks"
 * - "Friends for 5 days"
 */
export function formatFriendshipDuration(addedAt: string): string {
  const now = new Date().getTime();
  const added = new Date(addedAt).getTime();
  const diff = now - added;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) {
    return `Friends for ${months} ${months === 1 ? 'month' : 'months'}`;
  }
  if (weeks > 0) {
    return `Friends for ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  return `Friends for ${days} ${days === 1 ? 'day' : 'days'}`;
}

// ============================================================================
// MATCH MILESTONES
// ============================================================================

/**
 * Get milestone message for active match
 */
export function getMatchMilestone(daysActive: number): string | null {
  if (daysActive === 3) return '3 days together! You can now end this match if needed.';
  if (daysActive === 7) return 'One week together! 🎉';
  if (daysActive === 14) return 'Two weeks together! Keep it going! 💫';
  if (daysActive === 30) return 'One month together! Amazing! 🌟';
  return null;
}

/**
 * Check if match should show celebration
 */
export function shouldShowCelebration(daysActive: number): boolean {
  return [3, 7, 14, 30].includes(daysActive);
}

/**
 * Get milestone icon for match duration
 */
export function getMatchMilestoneIcon(daysActive: number): string {
  if (daysActive >= 30) return '🌟';
  if (daysActive >= 14) return '💫';
  if (daysActive >= 7) return '🎉';
  if (daysActive >= 3) return '✨';
  return '💙';
}

// ============================================================================
// FRIEND STATISTICS
// ============================================================================

/**
 * Calculate friend's impact score
 */
export interface FriendStats {
  totalAssists: number;
  successRate: number;
  matchesForYou: number;
  totalProposals: number;
  recentActivity: string;
  topMatcher: boolean;
}

export function getFriendStats(friend: FriendWithGridStatus): FriendStats {
  // Mock implementation - will be replaced with real data
  const totalAssists = friend.karmaScore?.totalAssists || 0;
  const totalProposals = friend.karmaScore?.totalProposals || 0;
  const successRate = totalProposals > 0 ? (totalAssists / totalProposals) * 100 : 0;

  return {
    totalAssists,
    successRate,
    matchesForYou: Math.floor(Math.random() * 3), // Mock
    totalProposals,
    recentActivity: 'Helped Jordan match yesterday',
    topMatcher: totalAssists >= 10,
  };
}

/**
 * Get friend badge (Top Matcher, Rising Star, etc.)
 */
export function getFriendBadge(stats: FriendStats): string | null {
  if (stats.topMatcher) return 'Top Matcher';
  if (stats.totalAssists >= 5) return 'Rising Star';
  return null;
}

// ============================================================================
// SORTING & FILTERING
// ============================================================================

/**
 * Sort friends intelligently:
 * 1. Pending grids first
 * 2. Recently completed
 * 3. Alphabetical
 */
export function sortFriendsByStatus(
  friends: FriendWithGridStatus[]
): FriendWithGridStatus[] {
  return [...friends].sort((a, b) => {
    // Anchors first
    if (a.isAnchorToday && !b.isAnchorToday) return -1;
    if (!a.isAnchorToday && b.isAnchorToday) return 1;

    // Among anchors: pending first, then completed
    if (a.isAnchorToday && b.isAnchorToday) {
      if (!a.hasCompletedGrid && b.hasCompletedGrid) return -1;
      if (a.hasCompletedGrid && !b.hasCompletedGrid) return 1;
    }

    // Alphabetical by first name
    return a.friend.firstName.localeCompare(b.friend.firstName);
  });
}

/**
 * Filter friends who are anchors today
 */
export function getAnchorsToday(friends: FriendWithGridStatus[]): FriendWithGridStatus[] {
  return friends.filter((f) => f.isAnchorToday);
}

/**
 * Get count of pending friend grids
 */
export function getPendingGridCount(friends: FriendWithGridStatus[]): number {
  return friends.filter((f) => f.isAnchorToday && !f.hasCompletedGrid).length;
}

// ============================================================================
// URGENCY & STATUS
// ============================================================================

/**
 * Get urgency color for expiration timer
 */
export function getUrgencyColor(urgencyLevel: 'normal' | 'warning' | 'urgent'): string {
  switch (urgencyLevel) {
    case 'urgent':
      return '#EF4444'; // red-500
    case 'warning':
      return '#F59E0B'; // amber-500
    default:
      return '#667085'; // neutral-600
  }
}

/**
 * Check if proposal should show urgent styling
 */
export function isProposalUrgent(expiresAt: string): boolean {
  const { urgencyLevel } = formatExpirationTime(expiresAt);
  return urgencyLevel === 'urgent';
}

/**
 * Check if proposal should show warning styling
 */
export function isProposalWarning(expiresAt: string): boolean {
  const { urgencyLevel } = formatExpirationTime(expiresAt);
  return urgencyLevel === 'warning';
}

// ============================================================================
// MATCH PROGRESS
// ============================================================================

/**
 * Calculate match progress percentage (0-100)
 * Based on 3-day minimum commitment
 */
export function getMatchProgress(match: ActiveMatch): number {
  const MINIMUM_DAYS = 3;
  const progress = (match.daysActive / MINIMUM_DAYS) * 100;
  return Math.min(progress, 100);
}

/**
 * Get progress bar color based on days active
 */
export function getMatchProgressColor(daysActive: number): string {
  if (daysActive >= 3) return '#10B981'; // green-500 (can end)
  if (daysActive >= 2) return '#F59E0B'; // amber-500 (almost there)
  return '#437FFF'; // primary-500 (just started)
}

/**
 * Format match duration for display
 */
export function formatMatchDuration(matchedAt: string): string {
  const now = new Date().getTime();
  const started = new Date(matchedAt).getTime();
  const diff = now - started;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

// ============================================================================
// VALIDATION & EDGE CASES
// ============================================================================

/**
 * Truncate long names elegantly
 */
export function truncateName(name: string, maxLength: number = 15): string {
  if (name.length <= maxLength) return name;
  return `${name.substring(0, maxLength)}...`;
}

/**
 * Validate photo URL and provide fallback
 */
export function getPhotoUrl(photos: any[], fallback: string = ''): string {
  if (!photos || photos.length === 0) return fallback;
  const mainPhoto = photos.find((p) => p.isMain) || photos[0];
  return mainPhoto?.url || fallback;
}

/**
 * Generate initials from name
 */
export function getInitials(firstName: string, lastName?: string): string {
  if (!firstName) return '?';
  if (!lastName) return firstName.charAt(0).toUpperCase();
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
