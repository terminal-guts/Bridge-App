/**
 * Community Backend Service - MOCK VERSION
 *
 * Provides mock data for community matching without backend
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

// Mock user data
const createMockProfile = (id: string, firstName: string, age: number): UserProfile => ({
  id,
  userId: id,
  firstName,
  lastName: 'Mock',
  age,
  gender: ['female'],
  pronouns: 'she_her',
  height: '5\'6"',
  ethnicity: 'asian',
  religion: 'spiritual',
  politicalLeaning: 'moderate',
  location: 'Los Angeles, CA',
  currentJob: 'Designer',
  companyPosition: 'Senior Designer',
  educationLevel: 'bachelors',
  school: 'USC',
  photos: [{
    id: `photo-${id}`,
    url: `https://i.pravatar.cc/400?u=${id}`,
    isMain: true,
    order: 0,
  }],
  interests: ['yoga', 'hiking', 'reading'],
  values: ['honesty', 'kindness', 'growth'],
  bio: '',
  lifestyle: {
    drinkingFrequency: 'socially',
    cannabisFrequency: 'never',
    tobaccoFrequency: 'never',
  },
  drinkingFrequency: 'socially',
  cannabisFrequency: 'never',
  tobaccoFrequency: 'never',
  dealbreakers: [],
  preferences: {
    ageMin: 25,
    ageMax: 35,
    gender: 'male',
    lookingFor: 'relationship',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

class CommunityBackendService {
  private hasCompletedGrid = false;
  private hasVoted = false;
  private pendingProposals: Proposal[] = [];

  async getTodaysGrid(): Promise<DailyGrid> {
    console.log('[MOCK BACKEND] Returning mock daily grid');

    const anchor = createMockProfile('00000000-0000-0000-0000-000000000001', 'You', 28);
    const candidates = [
      createMockProfile('candidate-1', 'Emma', 26),
      createMockProfile('candidate-2', 'Sophia', 27),
      createMockProfile('candidate-3', 'Olivia', 29),
    ];

    return {
      id: 'grid-today',
      anchorUserId: anchor.userId,
      anchor,
      candidates,
      gridDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: this.hasCompletedGrid,
      hasMatched: false,
      randomMatchAssignment: {
        matcherId: anchor.userId,
        matcherUserId: anchor.userId,
        anchorId: anchor.userId,
        anchorUserId: anchor.userId,
        assignedAt: new Date().toISOString(),
        hasCompleted: this.hasCompletedGrid,
        completed: this.hasCompletedGrid,
      },
    };
  }

  async submitDailyGridProposal(candidateId: string): Promise<void> {
    console.log('[MOCK BACKEND] Grid proposal submitted for:', candidateId);
    this.hasCompletedGrid = true;
  }

  async getProposalsToVote(): Promise<Proposal[]> {
    console.log('[MOCK BACKEND] Returning mock proposals to vote');

    // Always return 3 fresh proposals
    return [
      {
        id: 'proposal-1',
        userA: createMockProfile('user-a-1', 'James', 29),
        userB: createMockProfile('user-b-1', 'Lisa', 27),
        status: 'voting' as ProposalStatus,
        yesVotes: 12,
        noVotes: 3,
        votingThreshold: 20,
        baseThreshold: 20,
        endorsements: [],
        proposalDate: new Date().toISOString().split('T')[0],
        votingExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        proposalExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'proposal-2',
        userA: createMockProfile('user-a-2', 'Michael', 30),
        userB: createMockProfile('user-b-2', 'Sarah', 28),
        status: 'voting' as ProposalStatus,
        yesVotes: 8,
        noVotes: 2,
        votingThreshold: 20,
        baseThreshold: 20,
        endorsements: [],
        proposalDate: new Date().toISOString().split('T')[0],
        votingExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        proposalExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'proposal-3',
        userA: createMockProfile('user-a-3', 'David', 31),
        userB: createMockProfile('user-b-3', 'Emily', 29),
        status: 'voting' as ProposalStatus,
        yesVotes: 15,
        noVotes: 1,
        votingThreshold: 20,
        baseThreshold: 20,
        endorsements: [],
        proposalDate: new Date().toISOString().split('T')[0],
        votingExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        proposalExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  async submitProposalVote(proposalId: string, vote: 'yes' | 'no' | 'skip', weight?: number): Promise<void> {
    console.log('[MOCK BACKEND] Vote submitted:', proposalId, vote, weight);
    this.hasVoted = true;
  }

  async getFriendsAsAnchors(): Promise<any[]> {
    console.log('[MOCK BACKEND] Returning mock friends');

    const mockFriends = [
      {
        friendshipId: 'friendship-1',
        userId: '00000000-0000-0000-0000-000000000001',
        friendId: 'friend-1',
        friend: createMockProfile('friend-1', 'Jordan', 27),
        isAnchorToday: true,
        hasCompletedGrid: false,
        karmaScore: {
          userId: 'friend-1',
          totalAssists: 15,
          totalProposals: 8,
          badgeTier: 'trusted' as KarmaTier,
          proposalSuccessRate: 75,
          votingAccuracyRate: 82,
          slowModeActive: false,
          lastUpdated: new Date().toISOString(),
        },
        addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        streakDays: 12,
        assistsCount: 15,
        friendshipTier: 'close' as const,
        grid: {
          id: 'friend-grid-1',
          anchorUserId: 'friend-1',
          anchor: createMockProfile('friend-1', 'Jordan', 27),
          candidates: [
            createMockProfile('candidate-f1', 'Taylor', 26),
            createMockProfile('candidate-f2', 'Casey', 28),
            createMockProfile('candidate-f3', 'Morgan', 27),
          ],
          gridDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          hasVoted: false,
          hasMatched: false,
        },
      },
      {
        friendshipId: 'friendship-2',
        userId: '00000000-0000-0000-0000-000000000001',
        friendId: 'friend-2',
        friend: createMockProfile('friend-2', 'Riley', 29),
        isAnchorToday: true,
        hasCompletedGrid: true,
        karmaScore: {
          userId: 'friend-2',
          totalAssists: 8,
          totalProposals: 5,
          badgeTier: 'solid' as KarmaTier,
          proposalSuccessRate: 60,
          votingAccuracyRate: 70,
          slowModeActive: false,
          lastUpdated: new Date().toISOString(),
        },
        addedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        streakDays: 5,
        assistsCount: 8,
        friendshipTier: 'new' as const,
        grid: {
          id: 'friend-grid-2',
          anchorUserId: 'friend-2',
          anchor: createMockProfile('friend-2', 'Riley', 29),
          candidates: [
            createMockProfile('candidate-r1', 'Alex', 30),
            createMockProfile('candidate-r2', 'Jamie', 28),
            createMockProfile('candidate-r3', 'Drew', 31),
          ],
          gridDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          hasVoted: true,
          hasMatched: false,
        },
      },
    ];

    return mockFriends;
  }

  async getFriendGrid(friendId: string): Promise<DailyGrid> {
    console.log('[MOCK BACKEND] Getting friend grid for:', friendId);

    // Get friends data which includes grids
    const friends = await this.getFriendsAsAnchors();

    // Find the friend by ID
    const friend = friends.find((f: any) => f.friendId === friendId);

    if (!friend) {
      throw new Error(`Friend ${friendId} not found`);
    }

    if (!friend.grid) {
      throw new Error('Friend has no grid today');
    }

    return friend.grid;
  }

  async submitFriendGridProposal(friendId: string, candidateId: string): Promise<void> {
    console.log('[MOCK BACKEND] Friend proposal submitted');
  }

  async getPendingMatchProposals(): Promise<any[]> {
    console.log('[MOCK BACKEND] Returning mock pending proposals');

    const partnerProfile = createMockProfile('match-partner-1', 'Avery', 28);

    return [
      {
        id: 'pending-proposal-1',
        proposalId: 'pending-proposal-1',
        partnerProfile,
        matchedUser: partnerProfile,
        status: 'pending',
        communityScore: 85,
        compatibilityScore: 92,
        endorsers: [
          {
            id: 'endorser-1',
            proposalId: 'pending-proposal-1',
            userId: 'friend-1',
            matcherType: 'friend',
            friendName: 'Jordan',
            relationship: 'Your friend',
            endorsedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'endorser-2',
            proposalId: 'pending-proposal-1',
            userId: 'random-matcher-1',
            matcherType: 'random',
            friendName: 'Alex M.',
            relationship: 'Community member',
            endorsedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        yourDecision: 'pending',
        partnerDecision: 'pending',
        hasResponded: false,
      },
    ];
  }

  async respondToMatchProposal(proposalId: string, accept: boolean): Promise<void> {
    console.log('[MOCK BACKEND] Responded to proposal:', proposalId, accept);
  }

  async getActiveMatch(): Promise<ActiveMatch | null> {
    console.log('[MOCK BACKEND] Returning mock active match');

    const partnerProfile = createMockProfile('active-match-1', 'Sam', 27);
    const matchedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const canEndAt = new Date(matchedAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days after match
    const daysActive = 5;
    const daysUntilCanEnd = Math.max(0, Math.ceil((canEndAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return {
      id: 'active-match-1',
      matchId: 'active-match-1',
      proposalId: 'proposal-active-1',
      matchedUser: partnerProfile,
      partnerProfile,
      matchedAt: matchedAt.toISOString(),
      canEndAt: canEndAt.toISOString(),
      daysActive,
      daysUntilCanEnd,
      canEndMatch: true,
      chatId: 'chat-active-match-1',
      messagesExchanged: 47,
      endorsers: [
        {
          id: 'endorser-active-1',
          proposalId: 'proposal-active-1',
          userId: 'friend-1',
          matcherType: 'friend',
          friendName: 'Jordan',
          relationship: 'Mutual friend',
          karmaScore: {
            userId: 'friend-1',
            totalAssists: 15,
            totalProposals: 8,
            badgeTier: 'trusted' as KarmaTier,
            proposalSuccessRate: 75,
            votingAccuracyRate: 82,
            slowModeActive: false,
            lastUpdated: new Date().toISOString(),
          },
          endorsedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    };
  }

  async endActiveMatch(matchId: string, reason: string): Promise<void> {
    console.log('[MOCK BACKEND] Match ended');
  }

  async getKarmaScore(): Promise<KarmaScore> {
    return {
      userId: '00000000-0000-0000-0000-000000000001',
      totalAssists: 0,
      totalProposals: 0,
      badgeTier: 'new' as KarmaTier,
      proposalSuccessRate: 0,
      votingAccuracyRate: 0,
      slowModeActive: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getCommunityTaskProgress(): Promise<CommunityTask> {
    console.log('[MOCK BACKEND] Returning mock task progress');

    return {
      id: 'task-today',
      userId: '00000000-0000-0000-0000-000000000001',
      taskDate: new Date().toISOString().split('T')[0],
      hasVotedOnProposals: this.hasVoted,
      proposalsVotedCount: this.hasVoted ? 3 : 0,
      hasCreatedProposal: this.hasCompletedGrid,
      hasCompletedRandomMatch: this.hasCompletedGrid,
      allTasksCompleted: this.hasVoted && this.hasCompletedGrid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

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
