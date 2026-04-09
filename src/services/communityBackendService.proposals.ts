/**
 * Community Backend Service - Proposal operations
 *
 * Extracted from communityBackendService.ts for file-size management.
 * Contains: fetchProposalsToVote, fetchPendingMatchProposals standalone functions.
 */

import { supabase } from '../lib/supabase';
import {
  Proposal,
  UserProfile,
} from '../types/community';
import {
  getProposalsForVoting,
  getPendingDecisions,
  transformBackendProposal,
} from './proposalApiService';
import { getBlockedUserIds } from './blockService';
import { createLogger } from '../utils/secureLogger';
import { mapProfileRow, resolveProfilePhotos, getCurrentUserId } from './communityBackendService.helpers';

const logger = createLogger('CommunityBackend');

// ============================================================================
// Proposals for voting
// ============================================================================

export async function fetchProposalsToVote(): Promise<Proposal[]> {
  const userId = await getCurrentUserId();

  try {
    const [result, blockedIds] = await Promise.all([
      getProposalsForVoting(userId),
      getBlockedUserIds(userId)
    ]);

    const rawProposals = result.proposals || [];

    // Filter out proposals involving blocked users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    const filteredProposals = rawProposals.filter((raw: Record<string, any>) => {
      return !blockedIds.includes(raw.user_a_id as string) && !blockedIds.includes(raw.user_b_id as string);
    });

    // Build UserProfile objects from enriched profile data
    const profilesToResolve: UserProfile[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    const transformedProposals = filteredProposals.map((raw: Record<string, any>) => {
      const transformed = transformBackendProposal(raw);

      const userA: UserProfile = raw.user_a_profile
        ? mapProfileRow(raw.user_a_profile as Record<string, any>)
        : { id: raw.user_a_id, userId: raw.user_a_id, firstName: 'User A', photos: [] } as unknown as UserProfile;

      const userB: UserProfile = raw.user_b_profile
        ? mapProfileRow(raw.user_b_profile as Record<string, any>)
        : { id: raw.user_b_id, userId: raw.user_b_id, firstName: 'User B', photos: [] } as unknown as UserProfile;


      profilesToResolve.push(userA, userB);

      return {
        ...transformed,
        userA,
        userB,
        endorsements: [],
        votingThreshold: 20,
        baseThreshold: 20,
        proposalDate: (raw.created_at as string)?.split('T')[0] || new Date().toISOString().split('T')[0],
        votingExpiresAt: (raw.voting_expires_at as string) || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      } as Proposal;
    });

    // Resolve all photos in parallel
    await resolveProfilePhotos(profilesToResolve);

    return transformedProposals;
  } catch (error: unknown) {
    logger.error('Failed to fetch proposals for voting', error instanceof Error ? error.message : String(error));
    // Re-throw so the caller can show an error state instead of silently showing zero proposals
    throw error;
  }
}

// ============================================================================
// Pending Match Proposals
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- returns dynamic DB-derived objects
export async function fetchPendingMatchProposals(): Promise<any[]> {
  const userId = await getCurrentUserId();

  try {
    const [result, blockedIds] = await Promise.all([
      getPendingDecisions(userId),
      getBlockedUserIds(userId)
    ]);
    const rawProposals = result.proposals || [];


    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    const filteredRaw = rawProposals.filter((raw: Record<string, any>) => {
      const partnerId = raw.user_a_id === userId ? raw.user_b_id : raw.user_a_id;
      return !blockedIds.includes(partnerId);
    });

    const profilesToResolve: UserProfile[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic shape
    const proposals = filteredRaw.map((raw: Record<string, any>) => {
      const partnerId = raw.user_a_id === userId ? raw.user_b_id : raw.user_a_id;
      const partnerProfile = raw.partner_profile
        ? mapProfileRow(raw.partner_profile as Record<string, any>)
        : { id: partnerId, firstName: 'Match', photos: [] } as unknown as UserProfile;

      profilesToResolve.push(partnerProfile);

      const myDecision = raw.user_a_id === userId ? raw.user_a_decision : raw.user_b_decision;
      const theirDecision = raw.user_a_id === userId ? raw.user_b_decision : raw.user_a_decision;

      const totalVotes = (raw.pool_yes_votes || 0) + (raw.pool_no_votes || 0) +
                        (raw.friend_yes_votes || 0) + (raw.friend_no_votes || 0);
      const yesVotes = (raw.pool_yes_votes || 0) + (raw.friend_yes_votes || 0);
      const communityScore = totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0;

      return {
        id: raw.id,
        proposalId: raw.id,
        partnerProfile,
        matchedUser: partnerProfile,
        status: myDecision === 'pending' ? 'pending' : 'decided',
        communityScore,
        compatibilityScore: (() => {
          const s = raw.compatibility_score || 0;
          // Normalize: old proposals stored 0–1 decimal, new ones store 70–99 integer
          return s > 0 && s < 1 ? Math.round(s * 100) : Math.round(s);
        })(),
        endorsers: [] as Array<{ endorserProfile: UserProfile }>,
        expiresAt: raw.decision_deadline_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        approvedAt: raw.confirmed_at || raw.sent_to_users_at || raw.created_at,
        receivedAt: raw.sent_to_users_at || raw.created_at,
        yourDecision: myDecision || 'pending',
        partnerDecision: theirDecision || 'pending',
        hasResponded: myDecision !== 'pending',
      };
    });

    // Fetch yes-voter profiles to populate endorsers (photo avatars shown on proposal card)
    const proposalIds = proposals.map((p) => p.proposalId as string);
    let voterProfiles: UserProfile[] = [];
    let yesVotes: Array<{ proposal_id: string; voter_user_id: string }> = [];

    if (proposalIds.length > 0) {
      const { data: votes } = await supabase
        .from('proposal_votes')
        .select('proposal_id, voter_user_id')
        .in('proposal_id', proposalIds)
        .eq('vote_type', 'YES');
      yesVotes = votes || [];

      if (yesVotes.length > 0) {
        const uniqueVoterIds = [...new Set(yesVotes.map((v) => v.voter_user_id))];
        const [{ data: voterRows }, { data: voterPhotos }] = await Promise.all([
          supabase.from('user_profiles').select('user_id, first_name, last_name, profile_photo_path, photos').in('user_id', uniqueVoterIds),
          supabase.from('user_photos').select('user_id, storage_path, is_main').in('user_id', uniqueVoterIds).eq('is_main', true),
        ]);

        if (voterRows && voterRows.length > 0) {
          voterProfiles = voterRows.map(mapProfileRow);

          if (voterPhotos && voterPhotos.length > 0) {
            const mainPhotoByUser = new Map<string, string>();
            for (const p of voterPhotos) {
              if (!mainPhotoByUser.has(p.user_id)) mainPhotoByUser.set(p.user_id, p.storage_path);
            }
            for (const profile of voterProfiles) {
              if (profile.photos.length === 0 && mainPhotoByUser.has(profile.userId)) {
                const path = mainPhotoByUser.get(profile.userId)!;
                profile.photos = [{ id: path, url: path, isMain: true, order: 0 }];
              }
            }
          }
        }
      }
    }

    // Sign ALL photos in one batch — partners + endorsers together
    await resolveProfilePhotos([...profilesToResolve, ...voterProfiles]);

    if (yesVotes.length > 0 && voterProfiles.length > 0) {
      const voterMap = new Map(voterProfiles.map(p => [p.userId, p]));

      // Group yes-voter IDs by proposal
      const votesByProposal = new Map<string, string[]>();
      for (const vote of yesVotes) {
        const list = votesByProposal.get(vote.proposal_id) ?? [];
        list.push(vote.voter_user_id);
        votesByProposal.set(vote.proposal_id, list);
      }

      // Assign first 3 endorsers to each proposal
      for (const proposal of proposals) {
        const voterIds = votesByProposal.get(proposal.proposalId) ?? [];
        proposal.endorsers = voterIds
          .slice(0, 3)
          .map((vid: string) => ({ endorserProfile: voterMap.get(vid) }))
          .filter((e): e is { endorserProfile: UserProfile } => !!e.endorserProfile);
      }
    }

    return proposals;
  } catch (error: unknown) {
    logger.error('Failed to fetch pending decisions', error instanceof Error ? error.message : String(error));
    return [];
  }
}
