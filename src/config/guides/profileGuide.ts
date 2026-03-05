/**
 * Profile Completion Guide
 *
 * Explains profile requirements and encourages completion.
 * Covers 100% requirement, deep questions, and photos.
 */

import { GuideDefinition } from '../../types/guides';

export const profileGuide: GuideDefinition = {
  id: 'profile_completion',
  name: 'Profile Completion Guide',
  description: 'Complete your profile to receive matches',
  triggerCondition: 'first_visit',
  screenName: 'Profile',
  priority: 5,

  steps: [
    {
      id: 'match_eligibility',
      targetElement: 'profile-strength-card',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 12,
      tooltipPosition: 'bottom',
      title: 'Complete your profile to match',
      message:
        'You need 100% profile completion to receive proposals.\n\nFill out:\n• All basic info\n• 3 deep questions (one per tier)\n• 3 photos minimum\n\nLet\'s make you matchable!',
      primaryButtonText: 'Next',
    },

    {
      id: 'deep_questions',
      targetElement: 'questions-tab',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 8,
      tooltipPosition: 'bottom',
      title: 'Answer deep questions',
      message:
        "These help the community understand who'd be great for you.\n\nChoose 3 questions (one easy, one medium, one deep) that show your personality.",
      primaryButtonText: 'Next',
    },

    {
      id: 'photos_matter',
      targetElement: 'photos-section',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 8,
      tooltipPosition: 'bottom',
      title: 'Show your authentic self',
      message:
        'Upload 3 photos that show different sides of you:\n• Clear face shots\n• Hobbies & interests\n• Social moments\n• Natural expressions\n\nBe real, not perfect.',
      primaryButtonText: 'Complete Profile',
    },
  ],
};
