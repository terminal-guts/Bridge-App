/**
 * Community Matching System Types
 *
 * Type definitions for the Bridge Community Matching System v2
 */

import type { UserProfile } from './index';

// Re-export UserProfile for convenience
export type { UserProfile };

// ==================== Grid Types ====================

export interface DailyGrid {
  id: string;
  anchorUserId: string;
  anchor: UserProfile;
  candidates: UserProfile[]; // Always 3 candidates
  gridDate: string; // ISO date string
  createdAt?: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  hasVoted: boolean;
  hasMatched: boolean; // Did user create a proposal for this grid?
  randomMatchAssignment?: RandomMatchAssignment;
  scorePairings?: ScorePairing[]; // Compatibility scores between anchor and each candidate
}

export interface ScorePairing {
  candidateId: string;
  totalScore: number;
  categoryScores: {
    ageRange: number;
    distance: number;
    lifestyleSubstances: number;
    values: number;
    interests: number;
    family: number;
    religion: number;
    politics: number;
    height: number;
    ethnicity: number;
    education: number;
    career: number;
  };
}

export interface RandomMatchAssignment {
  id?: string;
  matcherId: string; // Alias for matcherUserId
  matcherUserId: string;
  anchorId: string; // Alias for anchorUserId
  anchorUserId: string;
  assignedAnchor?: UserProfile;
  assignedAt: string; // Alias for assignmentDate
  assignmentDate?: string;
  hasCompleted: boolean;
  completed: boolean; // Alias for hasCompleted
  completedAt?: string;
}

// ==================== Proposal Types ====================

export type ProposalStatus = 'voting' | 'approved' | 'rejected' | 'accepted' | 'declined' | 'expired';

export interface Proposal {
  id: string;
  userA: UserProfile;
  userB: UserProfile;
  status: ProposalStatus;
  yesVotes: number;
  noVotes: number;
  votingThreshold: number;
  baseThreshold: number; // Starting threshold before friend adjustments
  endorsements: Endorsement[];
  proposalDate: string;
  votingExpiresAt: string; // 24 hours from creation
  proposalExpiresAt: string; // 48 hours for both to accept
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type EndorsementType = 'random_matcher' | 'friend_of_a' | 'friend_of_b' | 'friend_of_both';

export interface Endorsement {
  id: string;
  proposalId: string;
  endorserUserId: string;
  endorserProfile: UserProfile;
  endorsementType: EndorsementType;
  selectedCandidateId: string;
  endorsementReason?: string;
  createdAt: string;
}

// ==================== Voting Types ====================

export interface ProposalVote {
  id: string;
  proposalId: string;
  voterUserId: string;
  vote: boolean; // true = yes, false = no
  voteWeight: number; // Default 1.0, can be adjusted by karma
  createdAt: string;
}

export interface VoteResult {
  proposalId: string;
  yourVote: boolean;
  currentYesVotes: number;
  currentNoVotes: number;
  votingThreshold: number;
  status: ProposalStatus;
}

// ==================== Karma & Assists Types ====================

export type KarmaTier = 'new' | 'solid' | 'trusted' | 'elite';

export interface KarmaScore {
  userId: string;
  totalAssists: number;
  totalProposals: number;
  totalVotes?: number;
  accurateVotes?: number;
  badgeTier: KarmaTier;
  proposalSuccessRate: number; // Percentage
  votingAccuracyRate: number; // Percentage
  slowModeActive?: boolean;
  lastUpdated?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KarmaBadge {
  tier: KarmaTier;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  minAssists: number;
}

export type AssistType = 'creator' | 'endorser' | 'voter';

export interface Assist {
  id: string;
  userId: string;
  proposalId: string;
  matchId: string;
  assistType: AssistType;
  assistDate: string;
  createdAt: string;
}

// ==================== Friend Superpower Types ====================

export type SignalType = 'good_type' | 'avoid_type';
export type SignalStatus = 'pending' | 'approved' | 'rejected';

export interface FriendSuperpower {
  id: string;
  senderFriendId: string;
  senderProfile: UserProfile;
  anchorUserId: string;
  signalType: SignalType;
  subjectUserId: string;
  subjectProfile: UserProfile;
  signalReason?: string;
  signalWeek: string; // Week start date
  status: SignalStatus;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== Community Task Types ====================

export interface CommunityTask {
  id: string;
  userId: string;
  taskDate: string;
  hasVotedOnProposals: boolean;
  proposalsVotedCount: number; // Must reach 3
  hasCreatedProposal: boolean;
  hasCompletedRandomMatch: boolean;
  allTasksCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTaskStatus {
  date: string;
  hasVoted: boolean;
  votesCompleted: number;
  votesNeeded: number; // Always 3
  hasCreatedProposal: boolean;
  hasCompletedRandomMatch: boolean;
  allTasksCompleted: boolean;
  completedAt?: string;
}

// ==================== Friend Grid Types ====================

export type FriendshipTier = 'good' | 'great' | 'best';

export interface FriendGrid {
  friendId: string;
  friend: UserProfile;
  grid: DailyGrid;
  hasProposed: boolean;
  proposedCandidateId?: string;
  hasCompletedGrid: boolean;
}

// Alias type for backward compatibility
export interface FriendAnchor {
  id: string;
  friendId: string;
  friendName: string;
  friendPhotoUrl: string;
  hasGridToday: boolean;
  hasProposedToday: boolean;
  karmaScore?: KarmaScore;
  grid?: DailyGrid;
}

export interface FriendWithGridStatus {
  friendshipId: string;
  userId: string;
  friendId: string;
  friend: UserProfile;
  isAnchorToday: boolean;
  hasCompletedGrid: boolean;
  karmaScore?: KarmaScore;
  addedAt: string;
  streakDays: number; // Days in a row both users filled out grids for each other
  assistsCount: number; // Total successful setups this friend has made
  friendshipTier: FriendshipTier; // Derived from streakDays
}

// Extended type for UI rendering with variant (pending vs completed)
export interface FriendWithVariant extends FriendWithGridStatus {
  variant: 'pending' | 'completed';
}

// ==================== Match Proposal Types ====================

export interface MatchProposal {
  id: string; // Proposal ID
  proposalId: string;
  partnerProfile: UserProfile;
  status: 'pending' | 'expired';
  communityScore: number; // Percentage of yes votes
  endorsers: Endorsement[];
  expiresAt: string; // 48 hours from approval
  approvedAt: string;
  yourDecision?: 'pending' | 'accepted' | 'declined';
  partnerDecision?: 'pending' | 'accepted' | 'declined';
  decidedAt?: string; // When user made their decision
}

// Alias type for pending match proposals
export interface PendingMatchProposal {
  id: string;
  proposalId: string;
  matchedUser: UserProfile;
  endorsers: any[];
  compatibilityScore: number;
  receivedAt: string;
  expiresAt: string;
  hasResponded: boolean;
}

// ==================== Active Match Types ====================

export interface ActiveMatch {
  id: string; // Alias for matchId
  matchId?: string;
  proposalId?: string;
  matchedUser?: UserProfile; // Alias for partnerProfile
  partnerProfile?: UserProfile;
  matchedAt: string;
  canEndAt?: string;
  daysActive?: number;
  canEndMatch?: boolean; // True after 3 days
  daysUntilCanEnd: number; // Days remaining in 3-day minimum
  chatId?: string;
  endorsers?: any[];
  messagesExchanged?: number;
}

// ==================== Friend Chat Types ====================

export type FriendMessageType = 'text' | 'system_event' | 'signal_notification';
export type FriendEventType = 'assist_earned' | 'badge_upgrade' | 'signal_sent' | 'signal_approved' | 'proposal_created';

export interface FriendChatMessage {
  id: string;
  friendshipId: string;
  senderUserId: string;
  messageText?: string;
  messageType: FriendMessageType;
  eventType?: FriendEventType;
  eventData?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ==================== Community Service Response Types ====================

export interface GetDailyGridResponse {
  grid: DailyGrid | null;
  randomMatchAssignment?: RandomMatchAssignment;
  taskStatus: DailyTaskStatus;
}

export interface GetProposalsToVoteResponse {
  proposals: Proposal[];
  votingProgress: {
    votesCompleted: number;
    votesNeeded: number;
    hasCompletedVoting: boolean;
  };
}

export interface GetFriendsAreaResponse {
  friends: FriendWithGridStatus[];
  pendingProposals: MatchProposal[];
  activeMatch: ActiveMatch | null;
  friendSuperpowers: FriendSuperpower[];
}

// ==================== Constants ====================

export const KARMA_TIERS: Record<KarmaTier, KarmaBadge> = {
  new: {
    tier: 'new',
    label: 'New Matchmaker',
    icon: 'star', // Eva Icon name
    color: '#94A3B8',
    bgColor: '#F1F5F9',
    minAssists: 0,
  },
  solid: {
    tier: 'solid',
    label: 'Solid',
    icon: 'star',
    color: '#10B981',
    bgColor: '#ECFDF5',
    minAssists: 3,
  },
  trusted: {
    tier: 'trusted',
    label: 'Trusted',
    icon: 'award',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    minAssists: 10,
  },
  elite: {
    tier: 'elite',
    label: 'Elite',
    icon: 'award',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    minAssists: 25,
  },
};

export const VOTES_NEEDED_PER_DAY = 3;
export const PROPOSAL_EXPIRATION_HOURS = 48;
export const VOTING_EXPIRATION_HOURS = 24;
export const ACTIVE_MATCH_MINIMUM_DAYS = 3;
export const CANDIDATE_COOLDOWN_DAYS = 7;
