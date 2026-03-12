/**
 * Tests for communityHelpers utility functions
 */

import {
  formatExpirationTime,
  formatRelativeTime,
  formatFriendshipDuration,
  getMatchMilestone,
  shouldShowCelebration,
  getMatchMilestoneIcon,
  getFriendBadge,
  getUrgencyColor,
  getMatchProgress,
  getMatchProgressColor,
  formatMatchDuration,
  truncateName,
  getPhotoUrl,
  getInitials,
} from '../../src/utils/communityHelpers';

// ============================================================================
// TIME FORMATTING
// ============================================================================

describe('formatExpirationTime', () => {
  it('returns "Expired" for past dates', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    const result = formatExpirationTime(past);
    expect(result.text).toBe('Expired');
    expect(result.urgencyLevel).toBe('urgent');
  });

  it('returns minutes when less than 1 hour', () => {
    const soon = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const result = formatExpirationTime(soon);
    expect(result.text).toMatch(/\d+ minutes?/);
    expect(result.urgencyLevel).toBe('urgent');
  });

  it('returns hours for multi-hour expiration', () => {
    const later = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
    const result = formatExpirationTime(later);
    expect(result.text).toMatch(/\d+ hours?/);
    expect(result.urgencyLevel).toBe('normal');
  });

  it('marks < 3 hours as urgent', () => {
    const urgent = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(formatExpirationTime(urgent).urgencyLevel).toBe('urgent');
  });

  it('marks 3-6 hours as warning', () => {
    const warning = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    expect(formatExpirationTime(warning).urgencyLevel).toBe('warning');
  });

  it('marks > 6 hours as normal', () => {
    const normal = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    expect(formatExpirationTime(normal).urgencyLevel).toBe('normal');
  });

  it('uses singular "hour" for exactly 1 hour', () => {
    const oneHour = new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString();
    const result = formatExpirationTime(oneHour);
    expect(result.text).toBe('1 hour');
  });

  it('uses singular "minute" for exactly 1 minute', () => {
    const oneMin = new Date(Date.now() + 1.5 * 60 * 1000).toISOString();
    const result = formatExpirationTime(oneMin);
    expect(result.text).toBe('1 minute');
  });
});

describe('formatRelativeTime', () => {
  it('returns "Just now" for recent timestamps', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('Just now');
  });

  it('returns minutes for < 1 hour', () => {
    const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMin)).toBe('5 minutes ago');
  });

  it('returns singular "minute" for 1 minute', () => {
    const oneMin = new Date(Date.now() - 90 * 1000).toISOString();
    expect(formatRelativeTime(oneMin)).toBe('1 minute ago');
  });

  it('returns hours for < 24 hours', () => {
    const threeHrs = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeHrs)).toBe('3 hours ago');
  });

  it('returns "Yesterday" for 1 day ago', () => {
    const yesterday = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(yesterday)).toBe('Yesterday');
  });

  it('returns "X days ago" for 2-6 days', () => {
    const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeDays)).toBe('3 days ago');
  });

  it('returns formatted date for > 7 days', () => {
    const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(twoWeeks);
    // Should be something like "Feb 26"
    expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}/);
  });
});

describe('formatFriendshipDuration', () => {
  it('returns days for < 1 week', () => {
    const fiveDays = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatFriendshipDuration(fiveDays)).toBe('Friends for 5 days');
  });

  it('returns weeks for 1-4 weeks', () => {
    const twoWeeks = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatFriendshipDuration(twoWeeks)).toBe('Friends for 2 weeks');
  });

  it('returns months for 30+ days', () => {
    const twoMonths = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatFriendshipDuration(twoMonths)).toBe('Friends for 2 months');
  });

  it('uses singular forms', () => {
    const oneDay = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatFriendshipDuration(oneDay)).toBe('Friends for 1 day');
  });
});

// ============================================================================
// MATCH MILESTONES
// ============================================================================

describe('getMatchMilestone', () => {
  it('returns message at day 3', () => {
    expect(getMatchMilestone(3)).toContain('3 days');
  });

  it('returns message at day 7', () => {
    expect(getMatchMilestone(7)).toContain('One week');
  });

  it('returns message at day 14', () => {
    expect(getMatchMilestone(14)).toContain('Two weeks');
  });

  it('returns message at day 30', () => {
    expect(getMatchMilestone(30)).toContain('One month');
  });

  it('returns null for non-milestone days', () => {
    expect(getMatchMilestone(5)).toBeNull();
    expect(getMatchMilestone(10)).toBeNull();
  });
});

describe('shouldShowCelebration', () => {
  it('returns true for milestone days', () => {
    expect(shouldShowCelebration(3)).toBe(true);
    expect(shouldShowCelebration(7)).toBe(true);
    expect(shouldShowCelebration(14)).toBe(true);
    expect(shouldShowCelebration(30)).toBe(true);
  });

  it('returns false for non-milestone days', () => {
    expect(shouldShowCelebration(1)).toBe(false);
    expect(shouldShowCelebration(15)).toBe(false);
  });
});

describe('getMatchMilestoneIcon', () => {
  it('returns star for 30+ days', () => {
    expect(getMatchMilestoneIcon(30)).toBe('star');
    expect(getMatchMilestoneIcon(45)).toBe('star');
  });

  it('returns award for 7-13 days', () => {
    expect(getMatchMilestoneIcon(7)).toBe('award');
    expect(getMatchMilestoneIcon(13)).toBe('award');
  });

  it('returns heart for < 7 days', () => {
    expect(getMatchMilestoneIcon(3)).toBe('heart');
    expect(getMatchMilestoneIcon(1)).toBe('heart');
  });
});

// ============================================================================
// FRIEND STATISTICS
// ============================================================================

describe('getFriendBadge', () => {
  it('returns "Top Matcher" for top matchers', () => {
    expect(getFriendBadge({ topMatcher: true, totalAssists: 10 } as any)).toBe('Top Matcher');
  });

  it('returns "Rising Star" for 5+ assists', () => {
    expect(getFriendBadge({ topMatcher: false, totalAssists: 5 } as any)).toBe('Rising Star');
  });

  it('returns null for low stats', () => {
    expect(getFriendBadge({ topMatcher: false, totalAssists: 2 } as any)).toBeNull();
  });
});

// ============================================================================
// URGENCY & COLORS
// ============================================================================

describe('getUrgencyColor', () => {
  it('returns red for urgent', () => {
    expect(getUrgencyColor('urgent')).toBe('#EF4444');
  });

  it('returns amber for warning', () => {
    expect(getUrgencyColor('warning')).toBe('#F59E0B');
  });

  it('returns neutral for normal', () => {
    expect(getUrgencyColor('normal')).toBe('#667085');
  });
});

// ============================================================================
// MATCH PROGRESS
// ============================================================================

describe('getMatchProgress', () => {
  it('returns 0% for day 0', () => {
    expect(getMatchProgress({ daysActive: 0 } as any)).toBe(0);
  });

  it('returns 100% at day 3', () => {
    expect(getMatchProgress({ daysActive: 3 } as any)).toBe(100);
  });

  it('caps at 100%', () => {
    expect(getMatchProgress({ daysActive: 10 } as any)).toBe(100);
  });

  it('handles undefined daysActive', () => {
    expect(getMatchProgress({} as any)).toBe(0);
  });
});

describe('getMatchProgressColor', () => {
  it('returns green for 3+ days', () => {
    expect(getMatchProgressColor(3)).toBe('#10B981');
  });

  it('returns amber for 2 days', () => {
    expect(getMatchProgressColor(2)).toBe('#F59E0B');
  });

  it('returns primary blue for < 2 days', () => {
    expect(getMatchProgressColor(1)).toBe('#437FFF');
  });
});

describe('formatMatchDuration', () => {
  it('returns hours for same-day matches', () => {
    const recent = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(formatMatchDuration(recent)).toMatch(/\d+ hours?/);
  });

  it('returns days for multi-day matches', () => {
    const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatMatchDuration(threeDays)).toBe('3 days');
  });

  it('uses singular "day"', () => {
    const oneDay = new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatMatchDuration(oneDay)).toBe('1 day');
  });
});

// ============================================================================
// VALIDATION & EDGE CASES
// ============================================================================

describe('truncateName', () => {
  it('returns short names unchanged', () => {
    expect(truncateName('Alice')).toBe('Alice');
  });

  it('truncates long names with ellipsis', () => {
    const longName = 'Bartholomew Weatherington III';
    expect(truncateName(longName)).toBe('Bartholomew Wea...');
  });

  it('respects custom max length', () => {
    expect(truncateName('Alexander', 5)).toBe('Alexa...');
  });
});

describe('getPhotoUrl', () => {
  it('returns main photo URL', () => {
    const photos = [
      { url: 'other.jpg', isMain: false },
      { url: 'main.jpg', isMain: true },
    ];
    expect(getPhotoUrl(photos)).toBe('main.jpg');
  });

  it('returns first photo if no main', () => {
    const photos = [{ url: 'first.jpg' }, { url: 'second.jpg' }];
    expect(getPhotoUrl(photos)).toBe('first.jpg');
  });

  it('returns fallback for empty array', () => {
    expect(getPhotoUrl([])).toBe('');
    expect(getPhotoUrl([], 'default.jpg')).toBe('default.jpg');
  });

  it('returns fallback for null/undefined', () => {
    expect(getPhotoUrl(null as any, 'fallback.jpg')).toBe('fallback.jpg');
  });
});

describe('getInitials', () => {
  it('returns two initials for full name', () => {
    expect(getInitials('John', 'Doe')).toBe('JD');
  });

  it('returns one initial for first name only', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('returns ? for empty name', () => {
    expect(getInitials('')).toBe('?');
  });

  it('uppercases initials', () => {
    expect(getInitials('john', 'doe')).toBe('JD');
  });
});
