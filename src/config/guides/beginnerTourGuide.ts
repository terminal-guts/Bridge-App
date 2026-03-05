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
        "We're excited to have you here. Let's take a quick 30-second tour of how Bridge works.",
      primaryButtonText: "Let's Go!",
    },
    {
      id: 'matching_gates',
      targetElement: 'matching-gates',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'bottom',
      title: 'The Three Matching Gates',
      message:
        'To enter the community, you first help others by voting on 3 potential matches. This keeps Bridge community-driven!',
      primaryButtonText: 'Got It',
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
        "Once you're in, use this button to add your friends. Your friends help you find matches and vice versa!",
      primaryButtonText: 'Next',
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
        "Click here to see people the community has picked for you. Tap the Matches icon to continue.",
      primaryButtonText: 'Next',
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
        "And finally, your profile. Keep it updated to get better matches! Tap the Profile icon to finish the tour.",
      primaryButtonText: 'Finish',
      interactive: true,
    },
  ],
};
