/**
 * Proposals Guide
 *
 * Explains the community voting system.
 * Covers proposal cards, endorsers, and voting power.
 */

import { GuideDefinition } from '../../types/guides';

export const proposalsGuide: GuideDefinition = {
  id: 'proposals_explained',
  name: 'Proposals Explained',
  description: 'How community voting works',
  triggerCondition: 'first_visit',
  screenName: 'CommunityProposals',
  priority: 3,

  steps: [
    {
      id: 'community_voting',
      targetElement: 'proposal-card-0',
      highlightType: 'spotlight',
      spotlightShape: 'rounded-rect',
      spotlightPadding: 8,
      tooltipPosition: 'bottom',
      title: 'Vote on community proposals',
      message:
        'These are pairings others proposed. Vote Yes if they seem compatible, No if not. Your thoughtful votes matter!',
      primaryButtonText: 'Next',
    },

    {
      id: 'voting_outcome',
      highlightType: 'none',
      tooltipPosition: 'center',
      title: 'How voting works',
      message:
        "When the community agrees on a match AND both people accept, they connect! If there's no agreement, the proposal gets dumped. Quality over quantity.",
      primaryButtonText: 'Start Voting',
    },
  ],
};
