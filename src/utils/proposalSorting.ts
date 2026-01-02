/**
 * Proposal Sorting Utilities
 *
 * Smart ordering of proposals based on endorsement strength,
 * karma levels, and friend relationships.
 */

import { Proposal, Endorsement, KARMA_TIERS } from '../types/community';

/**
 * Calculate endorsement score for a proposal
 * Higher score = better endorsements = shown first
 */
export function calculateEndorsementScore(proposal: Proposal): number {
  let score = 0;

  proposal.endorsements.forEach((endorsement) => {
    const isFriend = endorsement.endorsementType.includes('friend');
    const isSystemMatcher = endorsement.endorsementType === 'random_matcher';

    // Base points for each endorsement type
    if (isFriend) {
      score += 100; // Friends get high base score
    } else if (isSystemMatcher) {
      score += 30; // System matchers get moderate score
    }

    // Karma bonus (for friends only)
    if (isFriend && endorsement.endorserProfile.karma) {
      const karmaBonus = getKarmaBonus(endorsement.endorserProfile.karma.badgeTier);
      score += karmaBonus;
    }

    // Bonus for endorsement reason (shows thoughtfulness)
    if (endorsement.endorsementReason) {
      score += 20;
    }
  });

  // Bonus for multiple endorsements
  if (proposal.endorsements.length > 1) {
    score += proposal.endorsements.length * 15;
  }

  // Bonus for friend_of_both (mutual friend)
  const hasMutualFriend = proposal.endorsements.some(
    (e) => e.endorsementType === 'friend_of_both'
  );
  if (hasMutualFriend) {
    score += 50;
  }

  return score;
}

/**
 * Get karma bonus points based on tier
 */
function getKarmaBonus(tier: string): number {
  switch (tier) {
    case 'elite':
      return 60;
    case 'trusted':
      return 40;
    case 'solid':
      return 20;
    case 'new':
      return 0;
    default:
      return 0;
  }
}

/**
 * Sort proposals by endorsement strength
 * Higher quality endorsements appear first
 */
export function sortProposalsByEndorsementStrength(proposals: Proposal[]): Proposal[] {
  if (!proposals || proposals.length === 0) {
    return [];
  }
  return [...proposals].sort((a, b) => {
    const scoreA = calculateEndorsementScore(a);
    const scoreB = calculateEndorsementScore(b);

    // Sort descending (highest score first)
    return scoreB - scoreA;
  });
}

/**
 * Check if proposal is "highly recommended"
 * Criteria:
 * - Has at least one friend endorsement with Solid+ karma
 * - OR has 2+ friend endorsements
 * - OR has friend_of_both endorsement
 */
export function isHighlyRecommended(proposal: Proposal): boolean {
  const friendEndorsements = proposal.endorsements.filter((e) =>
    e.endorsementType.includes('friend')
  );

  // Check for high-karma friend endorsement
  const hasHighKarmaFriend = friendEndorsements.some((e) => {
    const karma = e.endorserProfile.karma;
    if (!karma) return false;
    return karma.badgeTier === 'solid' || karma.badgeTier === 'trusted' || karma.badgeTier === 'elite';
  });

  // Check for multiple friend endorsements
  const hasMultipleFriends = friendEndorsements.length >= 2;

  // Check for mutual friend
  const hasMutualFriend = proposal.endorsements.some(
    (e) => e.endorsementType === 'friend_of_both'
  );

  return hasHighKarmaFriend || hasMultipleFriends || hasMutualFriend;
}

/**
 * Get the highest karma tier among endorsers
 */
export function getHighestEndorserKarma(proposal: Proposal): string {
  const tiers = ['new', 'solid', 'trusted', 'elite'];
  let highestTierIndex = 0;

  proposal.endorsements.forEach((endorsement) => {
    if (endorsement.endorserProfile.karma) {
      const tierIndex = tiers.indexOf(endorsement.endorserProfile.karma.badgeTier);
      if (tierIndex > highestTierIndex) {
        highestTierIndex = tierIndex;
      }
    }
  });

  return tiers[highestTierIndex];
}

/**
 * Get endorsement summary text for display
 */
export function getEndorsementSummary(proposal: Proposal): string {
  const friendCount = proposal.endorsements.filter((e) =>
    e.endorsementType.includes('friend')
  ).length;

  const systemCount = proposal.endorsements.filter(
    (e) => e.endorsementType === 'random_matcher'
  ).length;

  if (friendCount > 1) {
    return `${friendCount} friends recommend this match`;
  } else if (friendCount === 1) {
    const friend = proposal.endorsements.find((e) => e.endorsementType.includes('friend'));
    return `${friend?.endorserProfile.firstName} recommends this match`;
  } else if (systemCount > 0) {
    return 'System-matched';
  }

  return 'No endorsements';
}
