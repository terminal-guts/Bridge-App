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

export type ProposalStatus = 'voting' | 'candidate_match' | 'confirmed' | 'rejected' | 'expired_sent' | 'accepted' | 'declined' | 'pending' | 'deciding';

export interface Proposal {
  id: string;
  userA: UserProfile;
  userB: UserProfile;
  status: ProposalStatus;

  // Vote tallies (pool + friend separated)
  poolYesVotes: number;
  poolNoVotes: number;
  friendYesVotes: number;
  friendNoVotes: number;

  // Derived totals (for convenience)
  yesVotes: number;       // poolYes + friendYes
  noVotes: number;        // poolNo + friendNo
  totalVotes: number;     // all counted votes

  // Compatibility
  compatibilityScore: number;  // 0-100
  categoryScores?: Record<string, number>;

  // Legacy fields (kept for backward compat)
  votingThreshold: number;
  baseThreshold: number;
  endorsements: Endorsement[];
  proposalDate: string;

  // Lifecycle timestamps
  votingStartedAt?: string;
  votingExpiresAt: string;    // When community voting ends
  communityDecidedAt?: string; // When community vote reached resolution

  passedToUsersAt?: string;   // When it moved to Deciding state
  sentToUsersAt?: string;    // Alias used by proposalApiService
  decisionDeadlineAt?: string; // When users must decide by

  userADecision?: 'pending' | 'accepted' | 'declined';
  userBDecision?: 'pending' | 'accepted' | 'declined';
  userADecidedAt?: string;
  userBDecidedAt?: string;

  confirmedAt?: string;       // When both users have accepted (passed to match)
  rejectedAt?: string;        // When community rejects
  declinedAt?: string;        // When at least one user declines
  expiredAt?: string;         // When time runs out at any stage

  createdAt: string;
  updatedAt: string;

  // Enriched fields from API
  voteContext?: 'pool' | 'friend';
  isFriendVote?: boolean;
  userAProfile?: Partial<UserProfile>;
  userBProfile?: Partial<UserProfile>;
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

export type ProposalVoteType = 'YES' | 'NO' | 'UNSURE' | 'RECOMMEND';

export interface ProposalVote {
  id: string;
  proposalId: string;
  voterUserId: string;
  voteType: ProposalVoteType;
  isFriendVote: boolean;
  friendOf?: 'user_a' | 'user_b' | 'both' | null;
  recommendToId?: string;
  createdAt: string;
}

export interface VoteResult {
  proposalId: string;
  yourVote: ProposalVoteType;
  isFriendVote: boolean;
  proposalStatus: ProposalStatus;
  poolYesVotes: number;
  poolNoVotes: number;
  friendYesVotes: number;
  friendNoVotes: number;
}

// ==================== Karma & Assists Types ====================

export type KarmaTier = 'new' | 'solid' | 'trusted' | 'elite';

export interface KarmaScore {
  userId: string;
  karmaPoints: number;
  totalAssists: number;
  totalProposals: number;
  totalVotes?: number;
  accurateVotes?: number;
  totalInaccurateVotes?: number;
  badgeTier: KarmaTier;
  proposalSuccessRate: number; // Percentage
  votingAccuracyRate: number; // Percentage
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
  isMatched?: boolean; // Friend currently has an active match
  karmaScore?: KarmaScore;
  addedAt: string;
  streakDays: number; // Days in a row both users filled out grids for each other
  assistsCount: number; // Total successful setups this friend has made
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
  endorsers: Endorsement[];
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
  expiresAt?: string;
  canEndAt?: string;
  daysActive?: number;
  canEndMatch?: boolean; // True after 3 days
  daysUntilCanEnd: number; // Days remaining in 3-day minimum
  chatId?: string;
  endorsers?: Endorsement[];
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

// ==================== Match Ended Events ====================

/** Passed from communityService → MatchesScreen to drive the one-time popup */
export interface MatchEndedEvent {
  type: 'expired' | 'you_rejected' | 'they_rejected' | 'match_ended';
  /** Unique per-event ID used for AsyncStorage "seen once" tracking */
  eventId: string;
  /** Partner name for display in the popup */
  partnerName: string;
  /** Partner photo URL for display in the popup */
  partnerPhotoUrl?: string;
  /** Optional reason text (for match_ended variant) */
  endReason?: string;
}

// ==================== Constants ====================

export const KARMA_TIERS: Record<KarmaTier, KarmaBadge> = {
  new: {
    tier: 'new',
    label: 'New Matchmaker',
    icon: 'star', // Eva Icon name
    color: '#94A3B8',
    bgColor: '#F1F5F9',
  },
  solid: {
    tier: 'solid',
    label: 'Solid',
    icon: 'star',
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
  trusted: {
    tier: 'trusted',
    label: 'Trusted',
    icon: 'award',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
  elite: {
    tier: 'elite',
    label: 'Elite',
    icon: 'award',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
};

export const VOTES_NEEDED_PER_DAY = 3;
export const PROPOSAL_VOTING_DAYS = 5;         // Max days a proposal is in voting
export const DECISION_DEADLINE_HOURS = 48;      // Hours to accept/decline after confirmed
export const POOL_VOTERS_PER_DAY = 6;           // ~6 pool votes per proposal per day
export const MAX_POOL_VOTES = 30;               // Max pool votes over 5 days
export const FRIEND_VOTE_WEIGHT = 1.25;         // Friend votes weighted 1.25x in percentage
export const CONFIRMATION_MIN_POOL_VOTES = 6;   // Min pool votes to confirm
export const CONFIRMATION_MIN_TOTAL_VOTES = 12; // Min total votes to confirm
export const CONFIRMATION_MIN_YES_VOTES = 8;    // Min YES votes to confirm
export const ACTIVE_MATCH_MINIMUM_DAYS = 0;
export const CANDIDATE_COOLDOWN_DAYS = 7;

// Threshold relaxation schedule (5-day window)
export const THRESHOLD_SCHEDULE: Record<number, number | null> = {
  1: 0.65, 2: 0.65,
  3: 0.60, 4: 0.55,
  5: null, // bypass — auto-send
};
