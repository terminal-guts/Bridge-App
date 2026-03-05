/**
 * Beginner Tour Guide
 *
 * A step-by-step introduction to the app for first-time users.
 * Explains matching gates, adding friends, and main navigation tabs.
 */

import { GuideDefinition } from '../../types/guides';

export const beginnerTourGuide: GuideDefinition = {
  id: 'beginner_tour',
  name: 'Beginner Tour',
  description: 'A quick tour of the app for new users',
  triggerCondition: 'first_visit',
  screenName: 'Community',
  priority: 1,

  steps: [
    {
      id: 'community_welcome',
      highlightType: 'none',
      tooltipPosition: 'center',
      title: 'Welcome to Bridge!',
      message:
        "Take a quick 30-second tour to see how community-driven matchmaking works.",
      primaryButtonText: "Let's Go",
    },
    {
      id: 'matching_gates',
      highlightType: 'none',
      tooltipPosition: 'center',
      title: 'Unlock Friends',
      message:
        'Before helping your friends, help others on Bridge. Takes about 2 minutes!',
      image: require('../../../assets/guide-voting-example.png'),
      primaryButtonText: 'Got it',
    },
    {
      id: 'add_friend',
      targetElement: 'add-friend-button',
      highlightType: 'spotlight',
      spotlightShape: 'circle',
      spotlightPadding: 8,
      tooltipPosition: 'bottom',
      title: 'Add Your Friends',
      message:
        "Friends can suggest and validate matches for you. If you help others, you'll receive more frequent matches.",
      primaryButtonText: 'Great',
    },
    {
      id: 'matches_tab',
      targetElement: 'tab-matches',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'top',
      title: 'Your Matches',
      message:
        "Here you'll see matches verified by your friends and the Bridge community.",
      primaryButtonText: 'Fantastic',
      interactive: true,
    },
    {
      id: 'profile_tab',
      targetElement: 'tab-profile',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'top',
      title: 'Your Profile',
      message:
        "You can vote anytime, but to receive matches you'll need 100% profile strength.",
      primaryButtonText: 'Finish',
      interactive: true,
    },
  ],
};
