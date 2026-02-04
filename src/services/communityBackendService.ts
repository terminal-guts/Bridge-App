/**
 * Community Backend Service - Supabase Direct Integration
 *
 * Provides real community matching functionality via Supabase.
 * Replaces the previous mock implementation.
 */

import {
  DailyGrid,
  Proposal,
  ProposalStatus,
  ActiveMatch,
  KarmaScore,
  KarmaTier,
  UserProfile,
  CommunityTask,
} from '../types/community';

import { supabase } from '../lib/supabase';
import { requireAuth } from '../utils/auth';
import { inchesToHeight } from '../utils/proposalMatching';

/**
 * Map a DB profile row to a UserProfile for community display
 */
function mapDbRowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    age: row.age || 0,
    gender: row.gender || [],
    pronouns: row.pronouns || 'prefer_not_to_say',
    height: row.height_inches ? inchesToHeight(row.height_inches) : '',
    ethnicity: row.ethnicity || '',
    religion: row.religion || '',
    politicalLeaning: row.political_leaning || '',
    location: row.location || '',
    currentJob: row.current_job || '',
    companyPosition: row.company_position || '',
    educationLevel: row.education_level || '',
    school: row.school || '',
    photos: (row.user_photos || []).map((p: any) => ({
      id: p.id,
      url: p.url,
      isMain: p.is_main,
      order: p.display_order,
    })),
    interests: row.interests || [],
    values: row.values || [],
    bio: row.bio || '',
    lifestyle: { pets: [] },
    drinkingFrequency: row.drinking_frequency,
    cannabisFrequency: row.cannabis_frequency,
    tobaccoFrequency: row.tobacco_frequency,
    nonNegotiables: [],
    preferences: {
      ageMin: 18,
      ageMax: 99,
      gender: 'both',
      lookingFor: 'relationship',
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as UserProfile;
}

class CommunityBackendService {
  /**
   * Get today's daily grid for the current user
   */
  async getTodaysGrid(): Promise<DailyGrid> {
    const userId = await requireAuth();
    console.log('[COMMUNITY] Fetching today\'s grid');

    // Query daily grid assignments for today's anchor
    const today = new Date().toISOString().split('T')[0];

    // For the grid, we look at the user's own proposals as anchor
    // and find candidates assigned to them
    const { data: assignments, error } = await supabase
      .from('daily_proposal_assignments')
      .select(`
        *,
        proposal:proposals(
          *,
          user_a:profiles!proposals_user_a_id_fkey(*, user_photos(*)),
          user_b:profiles!proposals_user_b_id_fkey(*, user_photos(*))
        )
      `)
      .eq('user_id', userId)
      .eq('assignment_date', today);

    if (error) {
      console.error('[COMMUNITY] Error fetching grid:', error);
      throw new Error(error.message);
    }

    // Get user's own profile for anchor
    const { data: anchorData } = await supabase
      .from('profiles')
      .select('*, user_photos(*)')
      .eq('id', userId)
      .single();

    const anchor = anchorData ? mapDbRowToProfile(anchorData) : {} as UserProfile;

    // Extract candidates from assigned proposals
    const candidates: UserProfile[] = [];
    const scorePairings: any[] = [];

    for (const assignment of assignments || []) {
      const proposal = assignment.proposal;
      if (!proposal) continue;

      // The candidate is the other person in the proposal (not the anchor)
      const candidateData = proposal.user_a_id === userId
        ? proposal.user_b
        : proposal.user_a;

      if (candidateData) {
        const candidate = mapDbRowToProfile(candidateData);
        candidates.push(candidate);
        scorePairings.push({
          candidateId: candidate.id,
          totalScore: proposal.match_score || 0,
          categoryScores: {},
        });
      }
    }

    const hasVoted = (assignments || []).every((a: any) => a.has_voted);

    return {
      id: `grid-${today}`,
      anchorUserId: userId,
      anchor,
      candidates,
      gridDate: today,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted,
      hasMatched: false,
      scorePairings,
    };
  }

  /**
   * Submit a daily grid proposal
   */
  async submitDailyGridProposal(candidateId: string): Promise<void> {
    const userId = await requireAuth();
    console.log('[COMMUNITY] Submitting grid proposal for candidate:', candidateId);

    // Normalize pair order: smaller UUID first
    const [userAId, userBId] = userId < candidateId
      ? [userId, candidateId]
      : [candidateId, userId];

    const votingExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const proposalExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('proposals')
      .insert({
        user_a_id: userAId,
        user_b_id: userBId,
        status: 'voting',
        voting_expires_at: votingExpires,
        proposal_expires_at: proposalExpires,
      });

    if (error) {
      console.error('[COMMUNITY] Error creating proposal:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get proposals assigned for the current user to vote on today
   */
  async getProposalsToVote(): Promise<Proposal[]> {
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];
    console.log('[COMMUNITY] Fetching proposals to vote on');

    const { data: assignments, error } = await supabase
      .from('daily_proposal_assignments')
      .select(`
        *,
        proposal:proposals(
          *,
          user_a:profiles!proposals_user_a_id_fkey(*, user_photos(*)),
          user_b:profiles!proposals_user_b_id_fkey(*, user_photos(*))
        )
      `)
      .eq('user_id', userId)
      .eq('assignment_date', today)
      .eq('has_voted', false);

    if (error) {
      console.error('[COMMUNITY] Error fetching proposals:', error);
      throw new Error(error.message);
    }

    return (assignments || [])
      .filter((a: any) => a.proposal)
      .map((a: any) => {
        const p = a.proposal;
        return {
          id: p.id,
          userA: mapDbRowToProfile(p.user_a),
          userB: mapDbRowToProfile(p.user_b),
          status: p.status as ProposalStatus,
          yesVotes: p.yes_votes || 0,
          noVotes: p.no_votes || 0,
          votingThreshold: 10,
          baseThreshold: 10,
          endorsements: [],
          proposalDate: new Date(p.created_at).toISOString().split('T')[0],
          votingExpiresAt: p.voting_expires_at,
          proposalExpiresAt: p.proposal_expires_at,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        } as Proposal;
      });
  }

  /**
   * Submit a vote on a proposal
   */
  async submitProposalVote(proposalId: string, vote: 'yes' | 'no' | 'skip', weight?: number): Promise<void> {
    const userId = await requireAuth();
    console.log('[COMMUNITY] Submitting vote:', proposalId, vote);

    if (vote === 'skip') {
      // Mark assignment as voted without creating a vote record
      await supabase
        .from('daily_proposal_assignments')
        .update({ has_voted: true })
        .eq('proposal_id', proposalId)
        .eq('user_id', userId);
      return;
    }

    const voteType = vote === 'yes' ? 'YES' : 'NO';

    // Insert vote (DB trigger auto-updates proposal aggregates)
    const { error: voteError } = await supabase
      .from('proposal_votes')
      .insert({
        proposal_id: proposalId,
        voter_id: userId,
        vote_type: voteType,
        vote_weight: weight || 1.0,
      });

    if (voteError) {
      // UNIQUE constraint violation means already voted
      if (voteError.code === '23505') {
        console.warn('[COMMUNITY] Already voted on this proposal');
        return;
      }
      throw new Error(voteError.message);
    }

    // Mark assignment as voted
    await supabase
      .from('daily_proposal_assignments')
      .update({ has_voted: true })
      .eq('proposal_id', proposalId)
      .eq('user_id', userId);
  }

  /**
   * Get friends as anchors (with their daily grids)
   */
  async getFriendsAsAnchors(): Promise<any[]> {
    const userId = await requireAuth();
    console.log('[COMMUNITY] Fetching friends as anchors');

    // Query friendships and friend profiles
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        *,
        friend:profiles!friendships_friend_id_fkey(*, user_photos(*))
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.warn('[COMMUNITY] Error fetching friends:', error.message);
      return [];
    }

    return (friendships || []).map((f: any) => ({
      friendshipId: f.id,
      userId: f.user_id,
      friendId: f.friend_id,
      friend: f.friend ? mapDbRowToProfile(f.friend) : null,
      isAnchorToday: true,
      hasCompletedGrid: false,
      karmaScore: {
        userId: f.friend_id,
        totalAssists: 0,
        totalProposals: 0,
        badgeTier: 'new' as KarmaTier,
        proposalSuccessRate: 0,
        votingAccuracyRate: 0,
        slowModeActive: false,
        lastUpdated: new Date().toISOString(),
      },
      addedAt: f.created_at,
      streakDays: 0,
      assistsCount: 0,
      friendshipTier: 'new' as const,
    }));
  }

  /**
   * Get a specific friend's grid
   */
  async getFriendGrid(friendId: string): Promise<DailyGrid> {
    console.log('[COMMUNITY] Getting friend grid for:', friendId);

    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('*, user_photos(*)')
      .eq('id', friendId)
      .single();

    if (!friendProfile) {
      throw new Error(`Friend ${friendId} not found`);
    }

    const anchor = mapDbRowToProfile(friendProfile);

    // Get proposals involving this friend
    const today = new Date().toISOString().split('T')[0];
    const { data: proposals } = await supabase
      .from('proposals')
      .select(`
        *,
        user_a:profiles!proposals_user_a_id_fkey(*, user_photos(*)),
        user_b:profiles!proposals_user_b_id_fkey(*, user_photos(*))
      `)
      .or(`user_a_id.eq.${friendId},user_b_id.eq.${friendId}`)
      .eq('status', 'voting')
      .limit(3);

    const candidates: UserProfile[] = (proposals || []).map((p: any) => {
      const candidateData = p.user_a_id === friendId ? p.user_b : p.user_a;
      return mapDbRowToProfile(candidateData);
    });

    return {
      id: `friend-grid-${friendId}-${today}`,
      anchorUserId: friendId,
      anchor,
      candidates,
      gridDate: today,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: false,
      hasMatched: false,
      scorePairings: candidates.map(c => ({
        candidateId: c.id,
        totalScore: 0,
        categoryScores: {},
      })),
    };
  }

  /**
   * Submit a friend grid proposal
   */
  async submitFriendGridProposal(friendId: string, candidateId: string): Promise<void> {
    console.log('[COMMUNITY] Friend proposal submitted for:', friendId, candidateId);

    const [userAId, userBId] = friendId < candidateId
      ? [friendId, candidateId]
      : [candidateId, friendId];

    const votingExpires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const proposalExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('proposals')
      .insert({
        user_a_id: userAId,
        user_b_id: userBId,
        status: 'voting',
        voting_expires_at: votingExpires,
        proposal_expires_at: proposalExpires,
      });

    if (error && error.code !== '23505') {
      // Ignore duplicate pair constraint, throw others
      throw new Error(error.message);
    }
  }

  /**
   * Get pending match proposals for the current user
   */
  async getPendingMatchProposals(): Promise<any[]> {
    const userId = await requireAuth();
    console.log('[COMMUNITY] Fetching pending match proposals');

    const { data, error } = await supabase
      .from('candidate_matches')
      .select(`
        *,
        proposal:proposals(
          *,
          user_a:profiles!proposals_user_a_id_fkey(*, user_photos(*)),
          user_b:profiles!proposals_user_b_id_fkey(*, user_photos(*))
        )
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'pending');

    if (error) {
      console.error('[COMMUNITY] Error fetching pending proposals:', error);
      throw new Error(error.message);
    }

    return (data || []).map((cm: any) => {
      const proposal = cm.proposal;
      const isUserA = cm.user_a_id === userId;
      const partnerData = isUserA ? proposal?.user_b : proposal?.user_a;
      const partnerProfile = partnerData ? mapDbRowToProfile(partnerData) : null;

      return {
        id: cm.id,
        proposalId: cm.proposal_id,
        partnerProfile,
        matchedUser: partnerProfile,
        status: cm.status,
        communityScore: cm.community_score,
        compatibilityScore: cm.community_score,
        endorsers: [],
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        approvedAt: cm.created_at,
        receivedAt: cm.created_at,
        yourDecision: 'pending',
        partnerDecision: 'pending',
        hasResponded: false,
      };
    });
  }

  /**
   * Respond to a match proposal (accept or decline)
   */
  async respondToMatchProposal(proposalId: string, accept: boolean): Promise<void> {
    const userId = await requireAuth();
    console.log('[COMMUNITY] Responding to proposal:', proposalId, accept ? 'accept' : 'decline');

    const newStatus = accept ? 'accepted' : 'declined';

    const { error } = await supabase
      .from('candidate_matches')
      .update({ status: newStatus })
      .eq('proposal_id', proposalId)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    if (error) throw new Error(error.message);

    // If declined, add to rejected_pairs
    if (!accept) {
      const { data: match } = await supabase
        .from('candidate_matches')
        .select('user_a_id, user_b_id')
        .eq('proposal_id', proposalId)
        .single();

      if (match) {
        await supabase
          .from('rejected_pairs')
          .insert({
            user_a_id: match.user_a_id,
            user_b_id: match.user_b_id,
            rejection_source: 'user_declined',
          });
      }
    }
  }

  /**
   * Get active match for the current user
   */
  async getActiveMatch(): Promise<ActiveMatch | null> {
    const userId = await requireAuth();
    console.log('[COMMUNITY] Fetching active match');

    const { data, error } = await supabase
      .from('candidate_matches')
      .select(`
        *,
        proposal:proposals(
          *,
          user_a:profiles!proposals_user_a_id_fkey(*, user_photos(*)),
          user_b:profiles!proposals_user_b_id_fkey(*, user_photos(*))
        )
      `)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const proposal = data.proposal;
    const isUserA = data.user_a_id === userId;
    const partnerData = isUserA ? proposal?.user_b : proposal?.user_a;
    const partnerProfile = partnerData ? mapDbRowToProfile(partnerData) : undefined;

    const matchedAt = new Date(data.created_at);
    const daysActive = Math.floor((Date.now() - matchedAt.getTime()) / (1000 * 60 * 60 * 24));
    const canEndAt = new Date(matchedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const daysUntilCanEnd = Math.max(0, Math.ceil((canEndAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return {
      id: data.id,
      matchId: data.id,
      proposalId: data.proposal_id,
      matchedUser: partnerProfile,
      partnerProfile,
      matchedAt: matchedAt.toISOString(),
      canEndAt: canEndAt.toISOString(),
      daysActive,
      daysUntilCanEnd,
      canEndMatch: daysUntilCanEnd === 0,
      chatId: `chat-${data.id}`,
      endorsers: [],
    };
  }

  /**
   * End an active match
   */
  async endActiveMatch(matchId: string, reason: string): Promise<void> {
    console.log('[COMMUNITY] Ending match:', matchId, reason);

    const { error } = await supabase
      .from('candidate_matches')
      .update({ status: 'declined' })
      .eq('id', matchId);

    if (error) throw new Error(error.message);
  }

  /**
   * Get karma score for the current user
   */
  async getKarmaScore(): Promise<KarmaScore> {
    const userId = await requireAuth();

    // Count votes and proposals
    const { count: voteCount } = await supabase
      .from('proposal_votes')
      .select('*', { count: 'exact', head: true })
      .eq('voter_id', userId);

    const { count: proposalCount } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    const totalAssists = (voteCount || 0) + (proposalCount || 0);
    let badgeTier: KarmaTier = 'new';
    if (totalAssists >= 25) badgeTier = 'elite';
    else if (totalAssists >= 10) badgeTier = 'trusted';
    else if (totalAssists >= 3) badgeTier = 'solid';

    return {
      userId,
      totalAssists,
      totalProposals: proposalCount || 0,
      badgeTier,
      proposalSuccessRate: 0,
      votingAccuracyRate: 0,
      slowModeActive: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get community task progress for today
   */
  async getCommunityTaskProgress(): Promise<CommunityTask> {
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];

    // Count today's votes
    const { count: votedCount } = await supabase
      .from('daily_proposal_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('assignment_date', today)
      .eq('has_voted', true);

    // Check if user created a proposal today
    const { count: proposalCount } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);

    const proposalsVoted = votedCount || 0;
    const hasCreatedProposal = (proposalCount || 0) > 0;
    const hasVotedEnough = proposalsVoted >= 3;

    return {
      id: `task-${today}`,
      userId,
      taskDate: today,
      hasVotedOnProposals: hasVotedEnough,
      proposalsVotedCount: proposalsVoted,
      hasCreatedProposal,
      hasCompletedRandomMatch: hasCreatedProposal,
      allTasksCompleted: hasVotedEnough && hasCreatedProposal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get all friends area data in one call
   */
  async getFriendsAreaData(): Promise<{
    friends: any[];
    pendingProposals: any[];
    activeMatch: any | null;
  }> {
    const [friends, pendingProposals, activeMatch] = await Promise.all([
      this.getFriendsAsAnchors(),
      this.getPendingMatchProposals(),
      this.getActiveMatch(),
    ]);

    return {
      friends,
      pendingProposals,
      activeMatch,
    };
  }
}

export const communityBackendService = new CommunityBackendService();
export default communityBackendService;
