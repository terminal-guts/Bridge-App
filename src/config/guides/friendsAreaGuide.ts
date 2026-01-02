/**
 * Friends Area Guide
 *
 * Explains the Friends tab with match status, friend grids, and leaderboard.
 * Covers all 3 sections from top to bottom.
 */

import { GuideDefinition } from '../../types/guides';

export const friendsAreaGuide: GuideDefinition = {
  id: 'friends_area_explained',
  name: 'Friends Area Explained',
  description: 'Your match hub, friend grids, and leaderboard',
  triggerCondition: 'first_visit',
  screenName: 'CommunityFriends',
  priority: 4,

  steps: [
    {
      id: 'match_status',
      targetElement: 'match-status-section',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'bottom',
      title: 'Your match status',
      message:
        "When the community finds your match, it appears here! You'll see status changes as proposals move through voting and acceptance.",
      primaryButtonText: 'Next',
    },

    {
      id: 'friends_grids',
      targetElement: 'grids-section-header',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 8,
      tooltipPosition: 'bottom',
      title: 'Help friends today',
      message:
        'Friends who need matchmaking help appear here. Tap to open their grid and propose someone. Grids refresh daily at 8am.',
      primaryButtonText: 'Next',
    },

    {
      id: 'leaderboard',
      targetElement: 'leaderboard-section',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'top',
      title: 'Matchmaking streaks',
      message:
        "Friends ranked by their helping streak! Flame icons show consecutive days they've helped others.",
      primaryButtonText: 'Next',
    },

    {
      id: 'daily_cycle',
      targetElement: 'timer-display',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 8,
      tooltipPosition: 'bottom',
      title: 'Daily refresh at 8am',
      message:
        'New grid assignment, new proposals to vote on, fresh friend grids. Come back daily for your 5-minute ritual!',
      primaryButtonText: "I'm Ready!",
    },
  ],
};
