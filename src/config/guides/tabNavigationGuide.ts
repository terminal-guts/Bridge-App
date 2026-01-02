/**
 * Tab Navigation Overview Guide
 *
 * Introduces users to the 3-page Community tab structure.
 * Shows the Daily Grid → Proposals → Friends flow.
 */

import { GuideDefinition } from '../../types/guides';

export const tabNavigationGuide: GuideDefinition = {
  id: 'tab_navigation_overview',
  name: 'Tab Navigation Overview',
  description: 'Introduction to the Community tab structure and daily flow',
  triggerCondition: 'first_visit',
  screenName: 'Community',
  priority: 1,

  steps: [
    {
      id: 'welcome',
      highlightType: 'none',
      tooltipPosition: 'center',
      title: 'Welcome to Community!',
      message:
        "This is where the magic happens. The community helps you find matches through a daily ritual - no endless swiping.\n\nTakes just 5 minutes a day. Let's walk through it.",
      primaryButtonText: 'Show Me How',
      secondaryButtonText: 'Skip',
    },

    {
      id: 'three_pages',
      targetElement: 'page-indicator',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'bottom',
      message:
        'Swipe to navigate 3 pages:\n\n• Daily Grid - Propose 1 match (for someone else)\n• Proposals - Vote on 3 community picks\n• Friends Area - Help friends & see your matches\n\nComplete pages 1 & 2 to unlock Friends Area.',
      primaryButtonText: 'Next',
    },

    {
      id: 'daily_tasks',
      targetElement: 'daily-grid-page',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 16,
      tooltipPosition: 'bottom',
      title: 'Your daily ritual',
      message:
        "Every day at 8am, you get fresh tasks:\n1. Pick someone for another person's grid\n2. Vote on 3 proposals the community made\n\nIt's thoughtful, not addictive.",
      primaryButtonText: 'Next',
    },

    {
      id: 'friends_matches',
      targetElement: 'friends-area-locked',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'top',
      title: 'Help friends find love',
      message:
        "Once you complete your tasks, unlock Friends Area to:\n• Help friends with their grids\n• See matches & proposals\n• Chat with matches\n\nLet's start with your Daily Grid!",
      primaryButtonText: 'Start My Day',
    },
  ],
};
