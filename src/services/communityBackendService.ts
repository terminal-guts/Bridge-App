/**
 * Community Backend Service - REAL IMPLEMENTATION
 *
 * Connects to Supabase for friends/matches/karma data
 * and FastAPI for proposal voting/generation.
 */

import { supabase } from '../lib/supabase';
import {
  DailyGrid,
  Proposal,
  ActiveMatch,
  KarmaScore,
  KarmaTier,
  UserProfile,
  CommunityTask,
  FriendWithGridStatus,
  FriendshipTier,
  ACTIVE_MATCH_MINIMUM_DAYS,
} from '../types/community';
import {
  getProposalsForVoting,
  castProposalVote,
  getPendingDecisions,
  decideOnProposal,
  transformBackendProposal,
} from './proposalApiService';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CommunityBackend');

// ============================================================================
// Helpers
// ============================================================================

async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error('Not authenticated');
  return data.user.id;
}

function mapProfileRow(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    age: row.age || 0,
    gender: row.gender || [],
    pronouns: row.pronouns || '',
    height: row.height || '',
    ethnicity: row.ethnicity || '',
    religion: row.religion || '',
    politicalLeaning: row.political_leaning || '',
    location: row.location || row.where_live_now || '',
    currentJob: row.current_job || '',
    companyPosition: row.company_position || '',
    educationLevel: row.education_level || '',
    school: row.school || '',
    photos: (row.photos || []).map((p: any) => ({
      id: p.id || p.url,
      url: p.url,
      isMain: p.is_main ?? p.isMain ?? false,
      order: p.display_order ?? p.order ?? 0,
    })),
    interests: row.interests || [],
    values: row.values || [],
    bio: row.bio || '',
    lifestyle: row.lifestyle || {},
    drinkingFrequency: row.drinking_frequency || '',
    cannabisFrequency: row.cannabis_frequency || '',
    tobaccoFrequency: row.tobacco_frequency || '',
    nonNegotiables: row.non_negotiables || [],
    preferences: row.preferences || {},
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function deriveFriendshipTier(streakDays: number): FriendshipTier {
  if (streakDays >= 10) return 'best';
  if (streakDays >= 3) return 'great';
  return 'good';
}

function deriveKarmaTier(assists: number): KarmaTier {
  if (assists >= 25) return 'elite';
  if (assists >= 10) return 'trusted';
  if (assists >= 3) return 'solid';
  return 'new';
}

// ============================================================================
// Service
// ============================================================================

class CommunityBackendService {

  // Track votes locally for session (also persisted in DB)
  private sessionVoteCount = 0;

  // ========================================================================
  // Proposals (via FastAPI)
  // ========================================================================

  async getProposalsToVote(): Promise<Proposal[]> {
    const userId = await getCurrentUserId();

    try {
      const result = await getProposalsForVoting(userId);
      const rawProposals = result.proposals || [];

      // Transform backend proposals to frontend Proposal type
      return rawProposals.map((raw: any) => {
        const transformed = transformBackendProposal(raw);

        // Build UserProfile objects from enriched profile data
        const userA: UserProfile = raw.user_a_profile
          ? mapProfileRow(raw.user_a_profile)
          : { id: raw.user_a_id, firstName: 'User A' } as UserProfile;

        const userB: UserProfile = raw.user_b_profile
          ? mapProfileRow(raw.user_b_profile)
          : { id: raw.user_b_id, firstName: 'User B' } as UserProfile;

        return {
          ...transformed,
          userA,
          userB,
          endorsements: [],
          votingThreshold: 20,
          baseThreshold: 20,
          proposalDate: raw.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          votingExpiresAt: raw.voting_expires_at || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        } as Proposal;
      });
    } catch (error: any) {
      logger.error('Failed to fetch proposals for voting', error.message);
      return [];
    }
  }

  async submitProposalVote(proposalId: string, vote: 'yes' | 'no' | 'skip', weight?: number): Promise<void> {
    if (vote === 'skip') return;

    const userId = await getCurrentUserId();
    const voteType = vote === 'yes' ? 'YES' : 'NO';

    await castProposalVote(proposalId, userId, voteType as any);
    this.sessionVoteCount++;
  }

  // ========================================================================
  // Grid (legacy - kept for interface compatibility)
  // ========================================================================

  async getTodaysGrid(): Promise<DailyGrid> {
    const userId = await getCurrentUserId();

    // Try to fetch from daily_surveys table
    const today = new Date().toISOString().split('T')[0];
    const { data: survey } = await supabase
      .from('daily_surveys')
      .select('*')
      .eq('user_id', userId)
      .eq('survey_date', today)
      .maybeSingle();

    if (!survey) {
      // Return empty grid - no survey assigned today
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const anchor = profile ? mapProfileRow(profile) : { id: userId, firstName: 'You' } as UserProfile;

      return {
        id: `grid-${today}`,
        anchorUserId: userId,
        anchor,
        candidates: [],
        gridDate: today,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        hasVoted: false,
        hasMatched: false,
      };
    }

    // Fetch candidate profiles
    const candidateIds = survey.candidate_ids || [];
    const candidates: UserProfile[] = [];

    if (candidateIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', candidateIds);

      if (profiles) {
        candidates.push(...profiles.map(mapProfileRow));
      }
    }

    // Fetch anchor profile
    const { data: anchorProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', survey.anchor_id || userId)
      .maybeSingle();

    return {
      id: survey.id,
      anchorUserId: survey.anchor_id || userId,
      anchor: anchorProfile ? mapProfileRow(anchorProfile) : { id: userId, firstName: 'You' } as UserProfile,
      candidates,
      gridDate: today,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: !!survey.submitted_at,
      hasMatched: !!survey.selected_candidate_id,
    };
  }

  async submitDailyGridProposal(candidateId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];

    await supabase
      .from('daily_surveys')
      .update({
        selected_candidate_id: candidateId,
        submitted_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('survey_date', today);
  }

  // ========================================================================
  // Friends (Supabase)
  // ========================================================================

  async getFriendsAsAnchors(): Promise<FriendWithGridStatus[]> {
    const userId = await getCurrentUserId();

    // Get all friendships (both directions)
    const { data: friendships1 } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, created_at')
      .eq('user_id', userId);

    const { data: friendships2 } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, created_at')
      .eq('friend_id', userId);

    const allFriendships = [...(friendships1 || []), ...(friendships2 || [])];

    if (allFriendships.length === 0) return [];

    // Extract friend IDs
    const friendIds = allFriendships.map(f =>
      f.user_id === userId ? f.friend_id : f.user_id
    );

    // Fetch friend profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', friendIds);

    const profileMap = new Map<string, any>();
    (profiles || []).forEach(p => profileMap.set(p.id, p));

    // Build friend list
    return allFriendships.map(f => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      const profile = profileMap.get(friendId);

      return {
        friendshipId: f.id,
        userId,
        friendId,
        friend: profile ? mapProfileRow(profile) : { id: friendId, firstName: 'Friend' } as UserProfile,
        isAnchorToday: true, // All friends show up
        hasCompletedGrid: false,
        addedAt: f.created_at || new Date().toISOString(),
        streakDays: 0,
        assistsCount: 0,
        friendshipTier: 'good' as FriendshipTier,
      };
    });
  }

  async getFriendGrid(friendId: string): Promise<DailyGrid> {
    const today = new Date().toISOString().split('T')[0];

    // Check if there's a survey for this friend
    const { data: survey } = await supabase
      .from('daily_surveys')
      .select('*')
      .eq('anchor_id', friendId)
      .eq('survey_date', today)
      .maybeSingle();

    if (!survey) {
      throw new Error('Friend has no grid today');
    }

    // Fetch candidate profiles
    const candidateIds = survey.candidate_ids || [];
    const candidates: UserProfile[] = [];

    if (candidateIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', candidateIds);

      if (profiles) {
        candidates.push(...profiles.map(mapProfileRow));
      }
    }

    // Fetch friend profile
    const { data: friendProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', friendId)
      .maybeSingle();

    return {
      id: survey.id,
      anchorUserId: friendId,
      anchor: friendProfile ? mapProfileRow(friendProfile) : { id: friendId, firstName: 'Friend' } as UserProfile,
      candidates,
      gridDate: today,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: !!survey.submitted_at,
      hasMatched: !!survey.selected_candidate_id,
    };
  }

  async submitFriendGridProposal(friendId: string, candidateId: string): Promise<void> {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];

    // Record the friend's proposal
    await supabase
      .from('daily_surveys')
      .update({
        selected_candidate_id: candidateId,
        submitted_by_friend_id: userId,
        submitted_at: new Date().toISOString(),
      })
      .eq('anchor_id', friendId)
      .eq('survey_date', today);
  }

  // ========================================================================
  // Pending Match Proposals (FastAPI)
  // ========================================================================

  async getPendingMatchProposals(): Promise<any[]> {
    const userId = await getCurrentUserId();

    try {
      const result = await getPendingDecisions(userId);
      const rawProposals = result.proposals || [];

      return rawProposals.map((raw: any) => {
        const partnerId = raw.user_a_id === userId ? raw.user_b_id : raw.user_a_id;
        const partnerProfile = raw.partner_profile
          ? mapProfileRow(raw.partner_profile)
          : { id: partnerId, firstName: 'Match' } as UserProfile;

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
          compatibilityScore: raw.compatibility_score || 0,
          endorsers: [],
          expiresAt: raw.decision_deadline_at || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          approvedAt: raw.confirmed_at || raw.sent_to_users_at || raw.created_at,
          receivedAt: raw.sent_to_users_at || raw.created_at,
          yourDecision: myDecision || 'pending',
          partnerDecision: theirDecision || 'pending',
          hasResponded: myDecision !== 'pending',
        };
      });
    } catch (error: any) {
      logger.error('Failed to fetch pending decisions', error.message);
      return [];
    }
  }

  async respondToMatchProposal(proposalId: string, accept: boolean): Promise<void> {
    const userId = await getCurrentUserId();
    const decision = accept ? 'accepted' : 'declined';
    await decideOnProposal(proposalId, userId, decision);
  }

  // ========================================================================
  // Active Match (Supabase)
  // ========================================================================

  async getActiveMatch(): Promise<ActiveMatch | null> {
    const userId = await getCurrentUserId();

    // Query matches where this user is involved and status is active
    const { data: matchA } = await supabase
      .from('matches')
      .select('*')
      .eq('user1_id', userId)
      .in('status', ['active', 'accepted'])
      .maybeSingle();

    const { data: matchB } = await supabase
      .from('matches')
      .select('*')
      .eq('user2_id', userId)
      .in('status', ['active', 'accepted'])
      .maybeSingle();

    const match = matchA || matchB;
    if (!match) return null;

    const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;

    // Fetch partner profile
    const { data: partnerRow } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', partnerId)
      .maybeSingle();

    const partnerProfile = partnerRow ? mapProfileRow(partnerRow) : { id: partnerId, firstName: 'Match' } as UserProfile;

    const matchedAt = new Date(match.created_at);
    const now = new Date();
    const daysActive = Math.floor((now.getTime() - matchedAt.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilCanEnd = Math.max(0, ACTIVE_MATCH_MINIMUM_DAYS - daysActive);

    // Count messages
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match.id);

    return {
      id: match.id,
      matchId: match.id,
      proposalId: match.proposal_id,
      matchedUser: partnerProfile,
      partnerProfile,
      matchedAt: match.created_at,
      canEndAt: new Date(matchedAt.getTime() + ACTIVE_MATCH_MINIMUM_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      daysActive,
      daysUntilCanEnd,
      canEndMatch: daysUntilCanEnd <= 0,
      chatId: match.id,
      messagesExchanged: messageCount || 0,
      endorsers: [],
    };
  }

  async endActiveMatch(matchId: string, reason: string): Promise<void> {
    const userId = await getCurrentUserId();

    // Get match details for exit record
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (!match) throw new Error('Match not found');

    const matchedAt = new Date(match.created_at);
    const daysSinceMatch = Math.floor((Date.now() - matchedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceMatch < ACTIVE_MATCH_MINIMUM_DAYS) {
      throw new Error(`Cannot end match for ${ACTIVE_MATCH_MINIMUM_DAYS - daysSinceMatch} more day(s)`);
    }

    // Count messages exchanged
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId);

    // Create exit record
    await supabase.from('match_exits').insert({
      match_id: matchId,
      user_id: userId,
      exit_reason: reason,
      days_since_match: daysSinceMatch,
      messages_exchanged: messageCount || 0,
    });

    // Update match status
    await supabase
      .from('matches')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', matchId);
  }

  // ========================================================================
  // Karma (Supabase)
  // ========================================================================

  async getKarmaScore(): Promise<KarmaScore> {
    const userId = await getCurrentUserId();

    const { data: karma } = await supabase
      .from('karma_scores')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!karma) {
      return {
        userId,
        totalAssists: 0,
        totalProposals: 0,
        badgeTier: 'new',
        proposalSuccessRate: 0,
        votingAccuracyRate: 0,
        slowModeActive: false,
        lastUpdated: new Date().toISOString(),
      };
    }

    const assists = karma.total_assists || 0;
    return {
      userId,
      totalAssists: assists,
      totalProposals: karma.total_proposals || 0,
      badgeTier: deriveKarmaTier(assists),
      proposalSuccessRate: karma.proposal_success_rate || 0,
      votingAccuracyRate: karma.voting_accuracy_rate || 0,
      slowModeActive: karma.slow_mode_active || false,
      lastUpdated: karma.updated_at || new Date().toISOString(),
    };
  }

  // ========================================================================
  // Community Task Progress (Supabase)
  // ========================================================================

  async getCommunityTaskProgress(): Promise<CommunityTask> {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];

    // Count today's votes from the proposal_votes table
    const { count: voteCount } = await supabase
      .from('proposal_votes')
      .select('id', { count: 'exact', head: true })
      .eq('voter_id', userId)
      .gte('created_at', `${today}T00:00:00Z`);

    const votesCompleted = (voteCount || 0) + this.sessionVoteCount;
    const hasVoted = votesCompleted >= 3;

    // Check if user submitted a daily survey today
    const { data: survey } = await supabase
      .from('daily_surveys')
      .select('submitted_at')
      .eq('user_id', userId)
      .eq('survey_date', today)
      .maybeSingle();

    const hasCreatedProposal = !!survey?.submitted_at;
    const allComplete = hasVoted;

    return {
      id: `task-${today}`,
      userId,
      taskDate: today,
      hasVotedOnProposals: hasVoted,
      proposalsVotedCount: Math.min(votesCompleted, 3),
      hasCreatedProposal,
      hasCompletedRandomMatch: hasCreatedProposal,
      allTasksCompleted: allComplete,
      completedAt: allComplete ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ========================================================================
  // Friends Area Aggregate
  // ========================================================================

  async getFriendsAreaData(): Promise<{
    friends: FriendWithGridStatus[];
    pendingProposals: any[];
    activeMatch: ActiveMatch | null;
  }> {
    const [friends, pendingProposals, activeMatch] = await Promise.all([
      this.getFriendsAsAnchors(),
      this.getPendingMatchProposals(),
      this.getActiveMatch(),
    ]);

    return { friends, pendingProposals, activeMatch };
  }

  // ========================================================================
  // Friend Helped Tracking (backend records proposal submission for friend)
  // ========================================================================

  /**
   * Mark a friend as helped today (i.e., the current user submitted a proposal for them).
   * In the real backend this is persisted via the friend_proposal_submissions table.
   * For now it is a no-op stub — the actual persistence happens in submitFriendGridProposal.
   */
  async markFriendAsHelped(_friendId: string): Promise<void> {
    // Real implementation: the daily_surveys row for this friend is already updated
    // by submitFriendGridProposal. No separate record needed.
    logger.info('[Backend] markFriendAsHelped called — persistence handled by submitFriendGridProposal');
  }
}

export const communityBackendService = new CommunityBackendService();
export default communityBackendService;
