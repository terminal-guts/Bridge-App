/**
 * Daily Grid Guide
 *
 * Explains how the triangle grid works and how to propose matches.
 * Covers anchor, candidates, and proposal submission.
 */

import { GuideDefinition } from '../../types/guides';

export const dailyGridGuide: GuideDefinition = {
  id: 'daily_grid_explained',
  name: 'Daily Grid Explained',
  description: 'How to use the triangle grid to propose matches',
  triggerCondition: 'first_visit',
  screenName: 'CommunityDailyGrid',
  priority: 2,

  steps: [
    {
      id: 'meet_anchor',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      customSpotlightRegion: {
        top: 0,
        left: 0,
        width: '100%',
        height: '50%',
        borderRadius: 24,
      },
      tooltipPosition: 'bottom',
      title: "This is today's anchor",
      message:
        "You're helping them find a match. Everyone helps each other - no one picks for themselves!",
      primaryButtonText: 'Next',
    },

    {
      id: 'candidates',
      targetElement: 'triangle-grid',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 8,
      tooltipPosition: 'bottom-left',
      title: 'These are potential matches',
      message: 'The community surfaced people who might be a strong fit.',
      primaryButtonText: 'Next',
    },

    {
      id: 'how_to_pick',
      targetElement: 'triangle-grid',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'bottom-left',
      title: 'Choose who fits best',
      message: 'Tap a candidate to learn more. Trust your instincts.',
      primaryButtonText: 'Got It',
    },
  ],
};
