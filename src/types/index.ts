// Core types for the Bridge dating application

import { FriendBadge } from './badges';
export * from './badges';

// ============================================================================
// Common Type Aliases
// ============================================================================

/** ISO 8601 date string format */
export type ISODateString = string;

/** UUID string */
export type UUID = string;

/** Political leaning options */
export type PoliticalLeaning =
  | 'very_liberal'
  | 'liberal'
  | 'moderate'
  | 'conservative'
  | 'very_conservative'
  | 'not_political'
  | 'prefer_not_to_say';

/** Education level options */
export type EducationLevel =
  | 'no_high_school'
  | 'high_school'
  | 'some_college'
  | 'trade_school'
  | 'associates'
  | 'bachelors'
  | 'masters'
  | 'beyond_masters'
  | 'phd'
  | 'professional';

/** Frequency options for lifestyle habits */
export type FrequencyOption = 'never' | 'socially' | 'sometimes' | 'often' | 'regularly' | 'daily' | 'irrelevant';

/** Question tier (1-3) */
export type QuestionTier = 1 | 2 | 3;

/** Match status */
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

/** Notification type */
export type NotificationType =
  | 'survey_ready'
  | 'match_received'
  | 'match_accepted'
  | 'message_received'
  | 'match_expiring';

// ============================================================================
// User and Profile Types
// ============================================================================

export interface User {
  id: UUID;
  phone?: string;  // Phone number used for authentication
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DeepQuestionAnswer {
  questionId: number;
  tier: QuestionTier;
  question: string;
  answer: string;
  isFeatured?: boolean;
  updatedAt?: ISODateString;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string[]; // Array of gender identities (can select multiple)
  pronouns: 'he/him' | 'she/her' | 'they/them' | 'custom' | 'prefer_not_to_say';
  customPronouns?: string; // Only if pronouns is 'custom'
  pronounsList?: string[]; // Array of up to 4 individual pronouns (e.g., ["she", "her", "hers"])
  customMyGender?: string; // Custom gender description when user selects "Prefer to self-describe"
  interestedInGenders?: string[]; // Array of genders user is interested in matching with
  customInterestedIn?: string; // Custom description for interested in genders
  preferredEthnicities?: string[]; // Array of ethnicities user is interested in matching with
  preferredReligions?: string[]; // Array of religions user is interested in matching with
  preferredPolitics?: string[]; // Array of political preferences user is interested in matching with
  preferenceVisibility?: Record<string, boolean>; // Which preference sections are visible on profile
  maxDistance?: number | null; // Maximum distance in miles (denormalized from preferences for mock data)
  currentJob?: string; // Current job title
  companyPosition?: string; // Company/position combined
  company?: string; // Company name
  education?: string; // Education degree/major (e.g., "Computer Science", "MBA")
  educationLevel: EducationLevel | 'other' | string;
  customEducationLevel?: string; // Custom education level when 'other' is selected
  school: string;
  height: string;
  ethnicity: string;
  religion: string;
  politicalLeaning: PoliticalLeaning | 'other' | string;
  customPoliticalLeaning?: string; // Custom political leaning when 'other' is selected
  location?: string; // Archived — not collected at Rice beta launch
  hometown?: string; // Archived — not collected at Rice beta launch
  hasChildren?: string; // Whether user currently has children
  familyPlans?: string; // User's family planning goals
  drinkingFrequency?: string; // Frequency of alcohol consumption
  cannabisFrequency?: string; // Frequency of cannabis use
  tobaccoFrequency?: string; // Frequency of tobacco/vaping use
  otherDrugsFrequency?: string; // Frequency of other drug use
  photos: Photo[];
  interests: string[];
  values: string[];
  lifestyle: LifestylePreferences;
  nonNegotiables: NonNegotiable[];
  preferences: MatchPreferences;
  deepQuestions?: DeepQuestionAnswer[];
  displayedQuestions?: number[]; // Question IDs to display on profile (max 3, one per tier)
  sectionVisibility?: Record<string, boolean>; // Which sections are visible to others (does not affect edit view)
  isPaused?: boolean; // Whether profile is paused
  isVerified?: boolean; // Whether the profile has been verified by the team
  profileCompleted?: boolean; // True when all required fields are filled — set by backend, gates matching pool
  matchmakingOnly?: boolean; // When true, user gets matched but doesn't participate in pool voting
  // Partner preferences (collected in Match Preferences screen)
  // Arrays to support multiple selections (e.g., ["yes", "sometimes"])
  // Also supports legacy string format for backward compatibility
  partnerLifestylePreferences?: {
    drinking: string | string[];
    cannabis: string | string[];
    tobacco: string | string[];
    otherDrugs: string | string[];
  };
  // Community Matching System
  karma?: { karma_points: number; badge_tier: string; total_assists: number };
  bio?: string; // User bio/about me

  // Suspension status
  isSuspended?: boolean;
  suspensionReason?: string | null;

  // Feature Role
  role?: 'dater' | 'matchmaker';

  // Guide completion tracking (frontend-only for now)
  hasCompletedTabNavigationGuide?: boolean;
  hasCompletedDailyGridGuide?: boolean;
  hasCompletedProposalsGuide?: boolean;
  hasCompletedFriendsGuide?: boolean;
  hasCompletedProfileGuide?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  url: string;
  isMain: boolean;
  order: number;
  blurhash?: string;
}

export interface LifestylePreferences {
  // DEPRECATED: Use separate *Frequency fields instead (drinkingFrequency, weedFrequency, etc.)
  // This interface is kept for backward compatibility but should not be used for new data
  drinking?: 'never' | 'socially' | 'often' | string;
  smoking?: 'never' | 'sometimes' | 'regularly' | string;
  exercise?: 'never' | 'sometimes' | 'often' | 'daily' | string;
  children?: 'want' | 'dont_want' | 'have' | 'open' | string;
  pets?: string[];
  diet?: string[];
  religion?: string;
  politics?: string;
}

export interface NonNegotiable {
  id: string;
  type: string;
  value: string | number | boolean | string[];
}

export interface MatchPreferences {
  ageMin: number;
  ageMax: number;
  gender: 'male' | 'female' | 'both';
  lookingFor: 'relationship' | 'casual' | 'friendship' | 'unsure';
  heightMin?: number; // Minimum height in inches (e.g., 60 = 5'0")
  heightMax?: number; // Maximum height in inches (e.g., 84 = 7'0")
  maxDistance?: number | null; // Maximum distance in miles, null = no limit
}

// Survey Types
// ============================================================================
// Match Types
// ============================================================================

export interface Match {
  id: UUID;
  user1Id: UUID;
  user2Id: UUID;
  user1Profile?: UserProfile;
  user2Profile?: UserProfile;
  status: MatchStatus;
  communityScore: number;
  matchedAt: ISODateString;
  expiresAt: ISODateString;
  acceptedAt?: ISODateString;
  rejectedAt?: ISODateString;
  rejectionReason?: string;
  currentUserId?: UUID;

  // Match exit data
  unmatchedAt?: ISODateString;
  unmatchSurveyResponse?: string;
  exitReason?: string;
  messagesExchanged?: number;
  daysSinceMatch?: number;

  // Development: auto-open profile modal flag
  autoOpenProfileModal?: boolean;
}

export interface PartialMatch {
  id: string;
  profile: PartialProfile;
  communityScore: number;
  expiresAt: string;
  timeRemaining: string;
}

export interface PartialProfile {
  firstName: string;
  age: number;
  occupation: string;
  photos: Photo[]; // Photos will be blurred
  interests: string[]; // Only show 75% of data
  values: string[];
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageType = 'text' | 'audio' | 'image';

export interface Message {
  id: UUID;
  matchId: UUID;
  senderId: UUID;
  type: MessageType;
  content: string;      // Text content OR the URL to the audio/image file
  duration?: number;    // Audio duration in milliseconds
  waveformData?: number[]; // For rendering visual waveforms
  sentAt: ISODateString;
  readAt?: ISODateString;
}

export interface Conversation {
  id: UUID;
  match: Match;
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
}

// ============================================================================
// Friend Types
// ============================================================================

export interface Friend {
  id: UUID;
  userId: UUID;
  friendId: UUID;
  friendProfile?: UserProfile;
  friendCode?: string;
  badges: FriendBadge[];
  addedAt: ISODateString;
}

// ============================================================================
// Pricing Types
// ============================================================================

export interface PricingData {
  malePrice: number;
  femalePrice: number;
  lastUpdated: ISODateString;
  marketOpen: boolean;
  nextUpdateIn?: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  data?: unknown;
  readAt?: ISODateString;
  createdAt: ISODateString;
}

// ============================================================================
// Navigation Types
// ============================================================================
export type RootStackParamList = {
  // Auth Stack
  Welcome: undefined;
  Login: undefined;
  EmailVerification: {
    email: string;
    fromOnboarding?: boolean;
    onboardingData?: Partial<OnboardingData>;
  };
  Onboarding: {
    isRoleSwitch?: boolean;
    initialData?: Partial<OnboardingData>;
  } | undefined;

  // Main Stack
  MainTabs: { screen?: string; params?: Record<string, unknown> } | undefined;
  MatchmakerTabs: undefined;
  MatchProposal: { match?: Match; profile?: UserProfile; proposalId?: string };
  ProposalProfile: {
    partnerProfile: UserProfile;
    communityScore: number;
    endorsers: import('./community').Endorsement[];
    screenState: 'awaiting_you' | 'awaiting_them' | 'neither_voted';
    proposalId: string;
  };
  Chat: {
    matchId?: string;
    friendshipId?: string;
    recipientName: string;
    recipientId?: string;
    recipientPhoto?: string;
    isFriendChat?: boolean
  };
  ProfileEdit: undefined;
  EditPhotos: undefined;
  EditBasics: undefined;
  EditAbout: undefined;
  EditInterests: undefined;
  EditLifestyle: undefined;
  ProfilePreview: { previewProfile?: UserProfile } | undefined;
  ProfileView: { userId: string; profile?: UserProfile; showActions?: boolean; onAccept?: () => void; onPass?: () => void };
  Settings: undefined;
  FriendProposal: { friendId: string; friendName: string; friendPhotoUrl?: string; friendAge?: number; friendJob?: string };
  MatchPreferences: undefined;
  BlockedUsers: undefined;
  PauseProfile: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  HelpSupport: undefined;
  SupportChat: undefined;
  Leaderboard: undefined;
  Stats: undefined;
  SuggestMatch: undefined;
  Suspended: undefined;
  ContactInvite: { autoAddCode?: string } | undefined;
};

export type MainTabParamList = {
  Community: { initialPage?: 0 | 1 | 2 } | undefined;
  Matches: undefined;
  Profile: { initialTab?: 'about' | 'badges' | 'questions' } | undefined;
};

export type MatchmakerTabParamList = {
  Community: { initialPage?: 0 | 1 | 2 } | undefined;
  Profile: { initialTab?: 'about' | 'badges' | 'questions' } | undefined;
};

// Onboarding Types
export interface OnboardingData {
  phoneNumber?: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string[]; // Array of gender identities (can select multiple)
  customMyGender?: string; // Custom gender description when "Prefer to self-describe" is selected
  interestedInGenders: string[];
  customInterestedIn?: string; // Custom interested in gender description
  pronounsList?: string[]; // Array of individual pronouns (up to 4)
  email: string;
  password: string;
  photos: Photo[];
  currentJob?: string; // Current job title
  companyPosition?: string; // Company/position combined
  educationLevel?: 'high_school' | 'some_college' | 'associates' | 'bachelors' | 'masters' | 'phd' | 'professional' | 'trade_school';
  school?: string;
  height: string;
  ethnicity: string; // Single selection only (either predefined or custom)
  preferredEthnicities: string[];
  ethnicityPreference?: string[]; // Alternative name used in EthnicityStep
  hasChildren: string;
  familyPlans: string;
  hometown?: string; // Archived
  location?: string; // Archived
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  religion: string;
  politicalLeaning: 'very_liberal' | 'liberal' | 'moderate' | 'conservative' | 'very_conservative' | 'not_political' | 'prefer_not_to_say';
  drinkingFrequency: string;
  cannabisFrequency?: string; // Frequency of cannabis use (new field name)
  weedFrequency?: string; // Legacy field name, prefer cannabisFrequency
  tobaccoFrequency: string;
  otherDrugsFrequency?: string; // Frequency of other drug use (new field name)
  drugsFrequency?: string; // Legacy field name, prefer otherDrugsFrequency
  interests: string[];
  values: string[];
  bio?: string;
  lifestyle: LifestylePreferences;
  preferences: MatchPreferences;
  deepQuestions?: DeepQuestionAnswer[];
  nonNegotiables?: NonNegotiable[];

  // Partner Preferences (collected via double-tap in onboarding)
  partnerLifestylePreferences?: {
    drinking: string;
    cannabis?: string; // New field name
    weed?: string; // Legacy field name, prefer cannabis
    tobacco: string;
    otherDrugs?: string; // New field name
    drugs?: string; // Legacy field name, prefer otherDrugs
  };

  // Onboarding progress
  signupMethod?: 'phone' | 'email';
  birthday?: string;
  friendsAdded?: string[];
  displayedQuestions?: number[];
  phoneVerified?: boolean;
  emailVerified?: boolean;
  verificationCode?: string;

  // Matchmaking role
  role?: 'dater' | 'matchmaker';
  matchmakingOnly?: boolean;
  matchmakerFirstAction?: 'invite' | 'build';

  // Legacy fields (kept for backward compatibility)
  pronouns?: 'he/him' | 'she/her' | 'they/them' | 'custom';
  customPronouns?: string;
}

// API Response Types
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Community types should be imported directly from './community' to avoid circular dependencies
// Example: import { DailyGrid, Proposal } from '../types/community'
