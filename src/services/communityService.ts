/**
 * Community Service - Mock Implementation
 *
 * Provides mock data for the Community Matching System during frontend development.
 * This service will be replaced with real API calls in Phase 3 (Integration).
 *
 * Features:
 * - Realistic mock data generation
 * - Developer-friendly testing utilities
 * - Time travel and fast-forward capabilities
 * - State management for testing flows
 */

import { createLogger } from '../utils/secureLogger';

const logger = createLogger('CommunityService');

import {
  DailyGrid,
  Proposal,
  ProposalStatus,
  FriendAnchor,
  PendingMatchProposal,
  ActiveMatch,
  KarmaScore,
  KarmaTier,
  UserProfile,
  Endorsement,
  RandomMatchAssignment,
  CommunityTask,
  KARMA_TIERS,
} from '../types/community';

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const MOCK_FIRST_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery',
  'Charlie', 'Quinn', 'Dakota', 'Skylar', 'Reese', 'Blake', 'Emerson',
  'Maya', 'Ethan', 'Sophia', 'Liam', 'Olivia', 'Noah', 'Emma', 'Ava',
  'Isabella', 'Mia', 'Lucas', 'Oliver', 'Benjamin', 'Amelia', 'Harper'
];

const MOCK_BIOS = [
  'Coffee enthusiast ☕ | Hiking on weekends | Love deep conversations',
  'Bookworm 📚 | Trying every ramen spot in the city | Dog person',
  'Amateur photographer 📸 | Rock climbing addict | Always planning the next trip',
  'Yoga instructor 🧘 | Plant parent | Passionate about sustainability',
  'Software engineer 💻 | Board game nights | Cooking experiments',
  'Graphic designer 🎨 | Live music lover | Vintage fashion collector',
  'Teacher by day, musician by night 🎸 | Love trying new restaurants',
  'Running marathons 🏃 | Science nerd | Documentary binge-watcher',
  'Architect | Urban explorer | Weekend baker',
  'Marketing manager | Wine tasting enthusiast | Trivia night champion'
];

const MOCK_LOCATIONS = [
  'Brooklyn, NY', 'San Francisco, CA', 'Austin, TX', 'Seattle, WA',
  'Portland, OR', 'Denver, CO', 'Chicago, IL', 'Boston, MA',
  'Los Angeles, CA', 'Philadelphia, PA'
];

const MOCK_PHOTOS = [
  'https://i.pravatar.cc/300?img=1',
  'https://i.pravatar.cc/300?img=2',
  'https://i.pravatar.cc/300?img=3',
  'https://i.pravatar.cc/300?img=5',
  'https://i.pravatar.cc/300?img=6',
  'https://i.pravatar.cc/300?img=7',
  'https://i.pravatar.cc/300?img=8',
  'https://i.pravatar.cc/300?img=9',
  'https://i.pravatar.cc/300?img=10',
  'https://i.pravatar.cc/300?img=11',
];

let mockUserIdCounter = 1000;

/**
 * Generate a realistic mock user profile with diverse characteristics
 */
function generateMockUser(overrides?: Partial<UserProfile>): UserProfile {
  const id = `mock-user-${mockUserIdCounter++}`;
  const firstName = MOCK_FIRST_NAMES[Math.floor(Math.random() * MOCK_FIRST_NAMES.length)];
  const lastName = 'Smith'; // Mock last name
  const age = 24 + Math.floor(Math.random() * 12); // 24-35
  const photoUrl = MOCK_PHOTOS[Math.floor(Math.random() * MOCK_PHOTOS.length)];

  // Mock job titles
  const jobs = ['Software Engineer', 'Product Manager', 'Designer', 'Consultant', 'Teacher', 'Doctor'];
  const schools = ['NYU', 'Columbia', 'Harvard', 'Stanford', 'MIT', 'Yale'];
  const allInterests = ['Coffee', 'Hiking', 'Reading', 'Yoga', 'Photography', 'Music', 'Travel', 'Cooking', 'Sports', 'Art'];
  const allValues = ['Authenticity', 'Growth', 'Kindness', 'Ambition', 'Family', 'Adventure', 'Creativity', 'Honesty'];

  // Generate varied characteristics
  const heights = ["5'4\"", "5'6\"", "5'8\"", "5'10\"", "6'0\"", "6'2\""];
  const ethnicities = ['Asian', 'White', 'Black / African American', 'Hispanic / Latino', 'Middle Eastern', 'South Asian'];
  const religions = ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Agnostic', 'Atheist', 'Spiritual'];
  const politicalLeanings = ['very_liberal', 'liberal', 'moderate', 'conservative', 'very_conservative', 'apolitical'];
  const lifestyleFrequencies = ['yes', 'sometimes', 'no'];

  const randomHeight = heights[Math.floor(Math.random() * heights.length)];
  const randomEthnicity = ethnicities[Math.floor(Math.random() * ethnicities.length)];
  const randomReligion = religions[Math.floor(Math.random() * religions.length)];
  const randomPolitics = politicalLeanings[Math.floor(Math.random() * politicalLeanings.length)];
  const randomDrinking = lifestyleFrequencies[Math.floor(Math.random() * lifestyleFrequencies.length)];
  const randomCannabis = lifestyleFrequencies[Math.floor(Math.random() * lifestyleFrequencies.length)];
  const randomTobacco = lifestyleFrequencies[Math.floor(Math.random() * lifestyleFrequencies.length)];

  // Generate varied preferences
  const ageRange = 6 + Math.floor(Math.random() * 8); // Range of 6-13 years
  const ageMin = 22 + Math.floor(Math.random() * 8); // Start between 22-29
  const ageMax = ageMin + ageRange;

  // Height preferences in inches
  const heightInches = parseInt(randomHeight.split("'")[0]) * 12 + parseInt(randomHeight.split("'")[1].replace('"', ''));
  const heightMin = Math.max(60, heightInches - 6); // 6 inches shorter
  const heightMax = Math.min(78, heightInches + 6); // 6 inches taller

  // Generate partner lifestyle preferences as arrays
  const generatePartnerPreference = () => {
    const rand = Math.random();
    if (rand < 0.2) return ["don't care"]; // 20% don't care
    if (rand < 0.4) return [lifestyleFrequencies[Math.floor(Math.random() * lifestyleFrequencies.length)]]; // 20% single preference
    // 60% multiple preferences
    const prefs: string[] = [];
    if (Math.random() > 0.5) prefs.push('yes');
    if (Math.random() > 0.5) prefs.push('sometimes');
    if (Math.random() > 0.5) prefs.push('no');
    return prefs.length > 0 ? prefs : ['yes']; // Default to yes if none selected
  };

  // Randomize interest and value selection
  const shuffledInterests = [...allInterests].sort(() => Math.random() - 0.5);
  const shuffledValues = [...allValues].sort(() => Math.random() - 0.5);
  const selectedInterests = shuffledInterests.slice(0, 3 + Math.floor(Math.random() * 4)); // 3-6 interests
  const selectedValues = shuffledValues.slice(0, 3 + Math.floor(Math.random() * 3)); // 3-5 values

  return {
    id,
    userId: id,
    firstName,
    lastName,
    age,
    gender: ['male'],
    pronouns: 'he/him',
    height: randomHeight,
    ethnicity: randomEthnicity,
    religion: randomReligion,
    politicalLeaning: randomPolitics,
    location: MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)],
    currentJob: jobs[Math.floor(Math.random() * jobs.length)],
    companyPosition: `${jobs[Math.floor(Math.random() * jobs.length)]} at TechCo`,
    educationLevel: 'bachelors',
    school: schools[Math.floor(Math.random() * schools.length)],
    photos: [
      {
        id: `photo-${id}-1`,
        url: photoUrl,
        isMain: true,
        order: 0,
      },
      {
        id: `photo-${id}-2`,
        url: MOCK_PHOTOS[Math.floor(Math.random() * MOCK_PHOTOS.length)],
        isMain: false,
        order: 1,
      },
    ],
    interests: selectedInterests,
    values: selectedValues,
    lifestyle: {},
    nonNegotiables: [],
    preferences: {
      ageMin,
      ageMax,
      gender: 'both',
      lookingFor: 'relationship',
      heightMin,
      heightMax,
      maxDistance: Math.random() > 0.3 ? 10 + Math.floor(Math.random() * 40) : null, // 70% have distance preference, 30% no limit
    },
    preferredEthnicities: Math.random() > 0.4
      ? ethnicities.filter(() => Math.random() > 0.5) // 60% have ethnicity preferences
      : [], // 40% open to all
    partnerLifestylePreferences: {
      drinking: generatePartnerPreference(),
      cannabis: generatePartnerPreference(),
      tobacco: generatePartnerPreference(),
      otherDrugs: ['no'], // Most people prefer no hard drugs
    },
    drinkingFrequency: randomDrinking,
    cannabisFrequency: randomCannabis,
    tobaccoFrequency: randomTobacco,
    otherDrugsFrequency: 'no',
    hometown: MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)],
    hasChildren: 'no',
    familyPlans: ['want_children', 'open_to_children', 'dont_want_children', 'not_sure'][Math.floor(Math.random() * 4)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock karma score
 */
function generateMockKarma(assists: number): KarmaScore {
  let tier: KarmaTier = 'new';
  if (assists >= 25) tier = 'elite';
  else if (assists >= 10) tier = 'trusted';
  else if (assists >= 3) tier = 'solid';

  const totalProposals = assists + Math.floor(Math.random() * 10);

  return {
    userId: 'current-user',
    totalAssists: assists,
    totalProposals,
    badgeTier: tier,
    proposalSuccessRate: totalProposals > 0 ? assists / totalProposals : 0,
    votingAccuracyRate: 0.7 + Math.random() * 0.25, // 70-95%
    slowModeActive: false,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// MOCK STATE (for testing and development)
// ============================================================================

// ============================================================================
// DEV STATE TYPES (exported for DevStateToggle)
// ============================================================================

export type MockMatchState =
  | 'empty'          // No match, no proposals
  | 'new_match'      // Proposal exists, neither voted
  | 'awaiting_you'   // Partner voted yes, you haven't
  | 'awaiting_them'  // You voted yes, partner hasn't
  | 'active_match';  // Both said yes

export type MockFriendsState =
  | 'empty'          // No friends in community
  | 'with_friends';  // Friends list populated

interface MockState {
  dailyTasksCompleted: boolean;
  gridProposalSubmitted: boolean;
  votesSubmitted: number;
  friendsAreaUnlocked: boolean;
  mockDataEnabled: true;
  timeRestrictionDisabled: boolean;
  fastForwardMode: boolean;
  currentKarmaAssists: number;
  helpedFriends: string[];
  matchState: MockMatchState;
  friendsState: MockFriendsState;
  proposalDecisions: {
    [proposalId: string]: {
      userDecision: boolean | null;
      partnerDecision: boolean | null;
      status: 'pending' | 'partial_accepted' | 'matched' | 'declined' | 'expired';
      decidedAt?: string;
    };
  };
}

let mockState: MockState = {
  dailyTasksCompleted: false,
  gridProposalSubmitted: false,
  votesSubmitted: 3,  // Always bypass the voting gate in dev mode
  friendsAreaUnlocked: true,
  mockDataEnabled: true,
  timeRestrictionDisabled: true,
  fastForwardMode: false,
  currentKarmaAssists: 5,
  helpedFriends: [],
  matchState: 'empty',
  friendsState: 'empty',
  proposalDecisions: {},
};

// ============================================================================
// MOCK DATA: DAILY GRID
// ============================================================================

const mockAnchor = generateMockUser({
  id: 'anchor-user-1',
  firstName: 'Jamie',
  age: 28,
  location: 'Brooklyn, NY',
  bio: 'Art curator | Coffee snob | Always looking for the next adventure',
});

const mockCandidates: UserProfile[] = [
  generateMockUser({
    id: 'candidate-1',
    firstName: 'Alex',
    age: 27,
    location: 'Brooklyn, NY',
    bio: 'Software engineer | Loves hiking | Board game enthusiast',
  }),
  generateMockUser({
    id: 'candidate-2',
    firstName: 'Sam',
    age: 29,
    location: 'Queens, NY',
    bio: 'Teacher | Bookworm | Weekend chef',
  }),
  generateMockUser({
    id: 'candidate-3',
    firstName: 'Jordan',
    age: 26,
    location: 'Brooklyn, NY',
    bio: 'Graphic designer | Yoga lover | Plant parent',
  }),
];

const mockDailyGrid: DailyGrid = {
  id: 'grid-001',
  anchorUserId: mockAnchor.id,
  anchor: mockAnchor,
  candidates: mockCandidates,
  gridDate: new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  hasVoted: false,
  hasMatched: false,
  randomMatchAssignment: {
    matcherId: 'current-user',
    matcherUserId: 'current-user',
    anchorId: mockAnchor.id,
    anchorUserId: mockAnchor.id,
    assignedAt: new Date().toISOString(),
    hasCompleted: false,
    completed: false,
  },
};

// ============================================================================
// MOCK DATA: PROPOSALS
// ============================================================================

function generateMockProposals(): Proposal[] {
  const p = (url: string, id: string) => [
    { id: `photo-${id}-1`, url, isMain: true, order: 0 },
  ];
  const now = Date.now();
  const ts = (offsetHours: number) => new Date(now + offsetHours * 3600000).toISOString();

  // ── Proposal 1: Jack & Leslie — High compatibility ──────────────────────
  // Same religion, close politics, shared values & interests
  const jack = generateMockUser({
    id: 'jack-001',
    firstName: 'Jack',
    age: 29,
    currentJob: 'Architect',
    school: 'Columbia',
    location: 'Brooklyn, NY',
    height: "6'1\"",
    ethnicity: 'White',
    religion: 'Catholic',
    politicalLeaning: 'moderate',
    drinkingFrequency: 'sometimes',
    cannabisFrequency: 'no',
    tobaccoFrequency: 'no',
    values: ['Creativity', 'Honesty', 'Ambition', 'Family', 'Growth'],
    interests: ['Travel', 'Music', 'Coffee', 'Hiking', 'Art'],
    photos: p('https://randomuser.me/api/portraits/men/75.jpg', 'jack'),
  });

  const leslie = generateMockUser({
    id: 'leslie-001',
    firstName: 'Leslie',
    age: 27,
    currentJob: 'Designer',
    school: 'NYU',
    location: 'Brooklyn, NY',
    height: "5'6\"",
    ethnicity: 'White',
    religion: 'Catholic',
    politicalLeaning: 'liberal',
    drinkingFrequency: 'yes',
    cannabisFrequency: 'no',
    tobaccoFrequency: 'no',
    values: ['Creativity', 'Honesty', 'Kindness', 'Family', 'Adventure'],
    interests: ['Travel', 'Music', 'Coffee', 'Photography', 'Art'],
    photos: p('https://randomuser.me/api/portraits/women/44.jpg', 'leslie'),
  });

  // ── Proposal 2: Marcus & Priya — Mixed compatibility ────────────────────
  // Different religion & ethnicity, shared ambition & interests partially
  const marcus = generateMockUser({
    id: 'marcus-001',
    firstName: 'Marcus',
    age: 31,
    currentJob: 'Software Engineer',
    school: 'MIT',
    location: 'Manhattan, NY',
    height: "5'11\"",
    ethnicity: 'Black / African American',
    religion: 'Christian',
    politicalLeaning: 'liberal',
    drinkingFrequency: 'yes',
    cannabisFrequency: 'sometimes',
    tobaccoFrequency: 'no',
    values: ['Ambition', 'Growth', 'Authenticity', 'Kindness'],
    interests: ['Hiking', 'Reading', 'Sports', 'Cooking', 'Travel'],
    photos: p('https://randomuser.me/api/portraits/men/32.jpg', 'marcus'),
  });

  const priya = generateMockUser({
    id: 'priya-001',
    firstName: 'Priya',
    age: 29,
    currentJob: 'Doctor',
    school: 'Harvard',
    location: 'Queens, NY',
    height: "5'4\"",
    ethnicity: 'South Asian',
    religion: 'Hindu',
    politicalLeaning: 'moderate',
    drinkingFrequency: 'sometimes',
    cannabisFrequency: 'no',
    tobaccoFrequency: 'no',
    values: ['Ambition', 'Family', 'Honesty', 'Kindness'],
    interests: ['Yoga', 'Cooking', 'Reading', 'Photography', 'Travel'],
    photos: p('https://randomuser.me/api/portraits/women/28.jpg', 'priya'),
  });

  // ── Proposal 3: Tyler & Sofia — Low compatibility ────────────────────────
  // Different religion, politics, lifestyle — interesting tension
  const tyler = generateMockUser({
    id: 'tyler-001',
    firstName: 'Tyler',
    age: 26,
    currentJob: 'Teacher',
    school: 'Yale',
    location: 'Bronx, NY',
    height: "5'10\"",
    ethnicity: 'Hispanic / Latino',
    religion: 'Catholic',
    politicalLeaning: 'conservative',
    drinkingFrequency: 'sometimes',
    cannabisFrequency: 'yes',
    tobaccoFrequency: 'no',
    values: ['Family', 'Adventure', 'Creativity', 'Humor'],
    interests: ['Sports', 'Music', 'Travel', 'Cooking', 'Art'],
    photos: p('https://randomuser.me/api/portraits/men/56.jpg', 'tyler'),
  });

  const sofia = generateMockUser({
    id: 'sofia-001',
    firstName: 'Sofia',
    age: 30,
    currentJob: 'Lawyer',
    school: 'Stanford',
    location: 'Manhattan, NY',
    height: "5'7\"",
    ethnicity: 'White',
    religion: 'Jewish',
    politicalLeaning: 'very_liberal',
    drinkingFrequency: 'yes',
    cannabisFrequency: 'no',
    tobaccoFrequency: 'no',
    values: ['Authenticity', 'Growth', 'Honesty', 'Ambition'],
    interests: ['Reading', 'Coffee', 'Yoga', 'Photography', 'Art'],
    photos: p('https://randomuser.me/api/portraits/women/63.jpg', 'sofia'),
  });

  const makeProposal = (
    id: string,
    userA: UserProfile,
    userB: UserProfile,
    yesVotes: number,
    noVotes: number,
  ): Proposal => ({
    id,
    userA,
    userB,
    status: 'pending' as ProposalStatus,
    yesVotes,
    noVotes,
    totalVotes: yesVotes + noVotes,
    poolYesVotes: yesVotes,
    poolNoVotes: noVotes,
    friendYesVotes: 0,
    friendNoVotes: 0,
    poolEligible: true,
    compatibilityScore: Math.round((yesVotes / (yesVotes + noVotes)) * 100),
    votingThreshold: 15,
    baseThreshold: 20,
    endorsements: [],
    proposalDate: new Date(now).toISOString().split('T')[0],
    votingStartedAt: ts(-6),
    votingExpiresAt: ts(18),
    decisionDeadlineAt: ts(66),
    createdAt: ts(-6),
    updatedAt: ts(0),
  });

  return [
    makeProposal('proposal-jack-leslie',   jack,   leslie, 18, 3),
    makeProposal('proposal-marcus-priya',  marcus, priya,  11, 7),
    makeProposal('proposal-tyler-sofia',   tyler,  sofia,   6, 10),
  ];
}

// ============================================================================
// MOCK DATA: FRIENDS
// ============================================================================

function generateMockFriends(): FriendAnchor[] {
  const friends: FriendAnchor[] = [];

  // Friend 1: Has grid, not completed
  friends.push({
    id: 'friend-anchor-1',
    friendId: 'friend-maya',
    friendName: 'Maya',
    friendPhotoUrl: MOCK_PHOTOS[0],
    hasGridToday: true,
    hasProposedToday: false,
    karmaScore: generateMockKarma(8),
    grid: {
      id: 'grid-friend-1',
      anchorUserId: 'friend-maya',
      anchor: generateMockUser({
        id: 'friend-maya',
        firstName: 'Maya',
        photos: [{ id: 'photo-maya', url: MOCK_PHOTOS[0], isMain: true, order: 0 }],
      }),
      candidates: [
        generateMockUser({ firstName: 'Chris' }),
        generateMockUser({ firstName: 'Pat' }),
        generateMockUser({ firstName: 'Drew' }),
      ],
      gridDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: false,
      hasMatched: false,
    },
  });

  // Friend 2: Has grid, already proposed
  friends.push({
    id: 'friend-anchor-2',
    friendId: 'friend-ethan',
    friendName: 'Ethan',
    friendPhotoUrl: MOCK_PHOTOS[1],
    hasGridToday: true,
    hasProposedToday: true,
    karmaScore: generateMockKarma(12),
    grid: {
      id: 'grid-friend-ethan',
      anchorUserId: 'friend-ethan',
      anchor: generateMockUser({
        id: 'friend-ethan',
        firstName: 'Ethan',
        photos: [{ id: 'photo-ethan', url: MOCK_PHOTOS[1], isMain: true, order: 0 }],
      }),
      candidates: [
        generateMockUser({ firstName: 'Alex' }),
        generateMockUser({ firstName: 'Jordan' }),
        generateMockUser({ firstName: 'Taylor' }),
      ],
      gridDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: false,
      hasMatched: false,
    },
  });

  // Friend 3: No grid (in active match)
  friends.push({
    id: 'friend-anchor-3',
    friendId: 'friend-sophia',
    friendName: 'Sophia',
    friendPhotoUrl: MOCK_PHOTOS[2],
    hasGridToday: false,
    hasProposedToday: false,
    karmaScore: generateMockKarma(15),
  });

  // Friend 4: Has grid, not completed
  friends.push({
    id: 'friend-anchor-4',
    friendId: 'friend-liam',
    friendName: 'Liam',
    friendPhotoUrl: MOCK_PHOTOS[3],
    hasGridToday: true,
    hasProposedToday: false,
    karmaScore: generateMockKarma(4),
    grid: {
      id: 'grid-friend-2',
      anchorUserId: 'friend-liam',
      anchor: generateMockUser({
        id: 'friend-liam',
        firstName: 'Liam',
        photos: [{ id: 'photo-liam', url: MOCK_PHOTOS[3], isMain: true, order: 0 }],
      }),
      candidates: [
        generateMockUser({ firstName: 'Jamie' }),
        generateMockUser({ firstName: 'Kai' }),
        generateMockUser({ firstName: 'Sage' }),
      ],
      gridDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: false,
      hasMatched: false,
    },
  });

  // Friend 5: Has grid, already proposed
  friends.push({
    id: 'friend-anchor-5',
    friendId: 'friend-olivia',
    friendName: 'Olivia',
    friendPhotoUrl: MOCK_PHOTOS[4],
    hasGridToday: true,
    hasProposedToday: true,
    karmaScore: generateMockKarma(20),
    grid: {
      id: 'grid-friend-olivia',
      anchorUserId: 'friend-olivia',
      anchor: generateMockUser({
        id: 'friend-olivia',
        firstName: 'Olivia',
        photos: [{ id: 'photo-olivia', url: MOCK_PHOTOS[4], isMain: true, order: 0 }],
      }),
      candidates: [
        generateMockUser({ firstName: 'Morgan' }),
        generateMockUser({ firstName: 'Riley' }),
        generateMockUser({ firstName: 'Quinn' }),
      ],
      gridDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hasVoted: false,
      hasMatched: false,
    },
  });

  return friends;
}

// ============================================================================
// MOCK DATA: PENDING PROPOSAL
// ============================================================================

const mockPendingProposal: PendingMatchProposal = {
  id: 'pending-001',
  proposalId: 'proposal-approved-001',
  matchedUser: generateMockUser({
    id: 'matched-user-1',
    firstName: 'Blake',
    age: 27,
    location: 'Brooklyn, NY',
    bio: 'Photographer | Coffee addict | Love live music',
  }),
  endorsers: [
    {
      id: 'endorsement-pending-1',
      proposalId: 'proposal-approved-001',
      userId: 'friend-maya',
      matcherType: 'friend',
      friendName: 'Maya',
      relationship: "Your friend",
      karmaScore: generateMockKarma(8),
      endorsedAt: new Date().toISOString(),
    },
  ],
  compatibilityScore: 0.89,
  receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
  expiresAt: new Date(Date.now() + 43 * 60 * 60 * 1000).toISOString(), // 43 hours left
  hasResponded: false,
};

// ============================================================================
// MOCK DATA: ACTIVE MATCH
// ============================================================================

const mockActiveMatch: ActiveMatch = {
  id: 'active-match-001',
  matchedUser: generateMockUser({
    id: 'active-match-user',
    firstName: 'Reese',
    age: 26,
    location: 'Queens, NY',
    bio: 'Musician | Foodie | Always exploring new neighborhoods',
  }),
  matchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  canEndAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
  daysUntilCanEnd: 1,
  chatId: 'chat-001',
  endorsers: [
    {
      id: 'endorsement-active-1',
      proposalId: 'proposal-approved-002',
      userId: 'friend-ethan',
      matcherType: 'friend',
      friendName: 'Ethan',
      relationship: "Your friend",
      karmaScore: generateMockKarma(12),
      endorsedAt: new Date().toISOString(),
    },
  ],
};

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

class CommunityService {
  /**
   * Get today's daily grid (random matcher assignment)
   */
  async getTodaysGrid(): Promise<DailyGrid> {
    // Simulate network delay
    await this.delay(500);

    return {
      ...mockDailyGrid,
      hasVoted: mockState.gridProposalSubmitted,
    };
  }

  /**
   * Submit proposal for today's grid
   */
  async submitDailyGridProposal(candidateId: string): Promise<void> {
    await this.delay(300);

    logger.info('[Mock] Submitting proposal for candidate:', candidateId);
    mockState.gridProposalSubmitted = true;

    // Check if daily tasks are now complete
    this.checkDailyTasksComplete();
  }

  /**
   * Get proposals to vote on (always 3)
   */
  async getProposalsToVote(): Promise<Proposal[]> {
    await this.delay(500);

    const allProposals = generateMockProposals();
    return allProposals.slice(0, 3);
  }

  /**
   * Submit vote on a proposal
   */
  async submitProposalVote(proposalId: string, vote: 'yes' | 'no' | 'skip', weight?: number): Promise<void> {
    await this.delay(300);

    logger.info('[Mock] Voting on proposal:', proposalId, '-', vote, weight !== undefined ? `(weight: ${weight})` : '');

    // Only count votes with weight > 0 toward task progress
    if (vote !== 'skip' && (weight === undefined || weight > 0)) {
      mockState.votesSubmitted += 1;
    }

    // Check if daily tasks are now complete
    this.checkDailyTasksComplete();
  }

  /**
   * Get friends who are anchors today
   */
  async getFriendsAsAnchors(): Promise<FriendAnchor[]> {
    await this.delay(500);

    // Only return if daily tasks are complete (or in testing mode)
    if (!mockState.friendsAreaUnlocked && !mockState.timeRestrictionDisabled) {
      throw new Error('Complete daily tasks to access Friends Area');
    }

    return generateMockFriends();
  }

  /**
   * Get friend's grid
   */
  async getFriendGrid(friendId: string): Promise<DailyGrid> {
    await this.delay(500);

    const friends = generateMockFriends();
    const friend = friends.find(f => f.friendId === friendId);

    if (!friend?.grid) {
      throw new Error('Friend has no grid today');
    }

    return friend.grid;
  }

  /**
   * Submit proposal for friend's grid
   */
  async submitFriendGridProposal(friendId: string, candidateId: string): Promise<void> {
    await this.delay(300);

    logger.info('[Mock] Submitting proposal for friend:', friendId, 'candidate:', candidateId);
  }

  /**
   * Get pending match proposals (awaiting acceptance)
   */
  async getPendingMatchProposals(): Promise<PendingMatchProposal[]> {
    await this.delay(500);

    // Return 1 pending proposal for testing
    return [mockPendingProposal];
  }

  /**
   * Accept or decline a match proposal
   */
  async respondToMatchProposal(proposalId: string, accept: boolean): Promise<void> {
    await this.delay(300);

    logger.info('[Mock] Responding to proposal:', proposalId, accept ? 'ACCEPT' : 'DECLINE');

    // Initialize proposal decision if it doesn't exist
    if (!mockState.proposalDecisions[proposalId]) {
      mockState.proposalDecisions[proposalId] = {
        userDecision: null,
        partnerDecision: null,
        status: 'pending',
      };
    }

    // Record user's decision
    mockState.proposalDecisions[proposalId].userDecision = accept;
    mockState.proposalDecisions[proposalId].decidedAt = new Date().toISOString();

    // MOCK: Simulate partner decision (in real app, this would come from the partner)
    // For testing, let's auto-accept for the partner 70% of the time
    if (mockState.proposalDecisions[proposalId].partnerDecision === null) {
      const partnerAccepts = Math.random() > 0.3; // 70% chance of partner accepting
      mockState.proposalDecisions[proposalId].partnerDecision = partnerAccepts;
      logger.info('[Mock] Partner decision simulated:', partnerAccepts ? 'ACCEPT' : 'DECLINE');
    }

    const decision = mockState.proposalDecisions[proposalId];

    // Check if both have decided
    if (decision.userDecision !== null && decision.partnerDecision !== null) {
      // Both decided - determine final status
      if (decision.userDecision && decision.partnerDecision) {
        // Both accepted - create match!
        decision.status = 'matched';
        logger.info('[Mock] 🎉 IT\'S A MATCH! Both users accepted. Creating active match...');

        // In real implementation, this would:
        // 1. Create ActiveMatch in database
        // 2. Send notifications to both users
        // 3. Remove from pending proposals

      } else {
        // At least one declined
        decision.status = 'declined';
        logger.info('[Mock] Proposal declined by', !decision.userDecision ? 'user' : 'partner');
      }
    } else if (decision.userDecision !== null) {
      // Only user decided, waiting for partner
      decision.status = 'partial_accepted';
      logger.info('[Mock] Waiting for partner to respond...');
    }

    logger.info('[Mock] Proposal status:', decision.status);
  }

  /**
   * Get current active match (if any)
   */
  async getActiveMatch(): Promise<ActiveMatch | null> {
    await this.delay(500);

    // Return mock active match for testing
    // In production, return null if no active match
    return mockActiveMatch;
  }

  /**
   * End an active match
   */
  async endActiveMatch(matchId: string, reason: string): Promise<void> {
    await this.delay(300);

    const match = await this.getActiveMatch();
    if (!match) {
      throw new Error('No active match');
    }

    if (match.daysUntilCanEnd > 0) {
      throw new Error(`Cannot end match for ${match.daysUntilCanEnd} more day(s)`);
    }

    logger.info('[Mock] Ending active match:', matchId);
    logger.info('[Mock] Reason for ending:', reason);
    // TODO: In production, send reason to backend for analytics
  }

  /**
   * Get user's karma score
   */
  async getKarmaScore(): Promise<KarmaScore> {
    await this.delay(300);

    return generateMockKarma(mockState.currentKarmaAssists);
  }

  /**
   * Get community task progress
   */
  async getCommunityTaskProgress(): Promise<CommunityTask> {
    await this.delay(200);

    // Always bypass the voting gate — dev toggle controls community state directly
    const hasVoted = mockState.votesSubmitted >= 3;

    return {
      id: 'task-current',
      userId: 'current-user',
      taskDate: new Date().toISOString().split('T')[0],
      hasVotedOnProposals: hasVoted,
      proposalsVotedCount: mockState.votesSubmitted,
      hasCreatedProposal: mockState.gridProposalSubmitted,
      hasCompletedRandomMatch: mockState.gridProposalSubmitted,
      allTasksCompleted: mockState.dailyTasksCompleted,
      completedAt: mockState.dailyTasksCompleted ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get friends area data (for FriendsAreaView)
   */
  async getFriendsAreaData(): Promise<{
    friends: any[];
    pendingProposals: any[];
    activeMatch: any | null;
  }> {
    await this.delay(500);

    // Helper to derive friendship tier from streak
    const getFriendshipTier = (streakDays: number): 'good' | 'great' | 'best' => {
      if (streakDays <= 3) return 'good';
      if (streakDays <= 10) return 'great';
      return 'best';
    };

    // ── Friends list ────────────────────────────────────────────────────────
    // Empty state: return no friends
    if (mockState.friendsState === 'empty') {
      return { friends: [], pendingProposals: [], activeMatch: null };
    }

    // Generate mock friends with grid status
    const friends = [
      {
        friendshipId: 'friendship-1',
        userId: 'current-user',
        friendId: 'friend-maya',
        friend: generateMockUser({
          id: 'friend-maya',
          firstName: 'Maya',
          age: 26,
          currentJob: 'Designer',
          photos: [{ id: 'photo-maya', url: MOCK_PHOTOS[0], isMain: true, order: 0 }],
        }),
        isAnchorToday: true,
        hasCompletedGrid: false,
        karmaScore: generateMockKarma(8),
        addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        candidatePreviews: [
          { id: 'c1', photo: MOCK_PHOTOS[5] },
          { id: 'c2', photo: MOCK_PHOTOS[6] },
          { id: 'c3', photo: MOCK_PHOTOS[7] },
        ],
        streakDays: 5,
        assistsCount: 12,
        friendshipTier: getFriendshipTier(5),
      },
      {
        friendshipId: 'friendship-2',
        userId: 'current-user',
        friendId: 'friend-ethan',
        friend: generateMockUser({
          id: 'friend-ethan',
          firstName: 'Ethan',
          age: 28,
          currentJob: 'Consultant',
          photos: [{ id: 'photo-ethan', url: MOCK_PHOTOS[1], isMain: true, order: 0 }],
        }),
        isAnchorToday: true,
        hasCompletedGrid: true,
        karmaScore: generateMockKarma(12),
        addedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        candidatePreviews: [
          { id: 'c4', photo: MOCK_PHOTOS[8] },
          { id: 'c5', photo: MOCK_PHOTOS[9] },
          { id: 'c6', photo: MOCK_PHOTOS[10] },
        ],
        streakDays: 12,
        assistsCount: 18,
        friendshipTier: getFriendshipTier(12),
      },
      {
        friendshipId: 'friendship-3',
        userId: 'current-user',
        friendId: 'friend-liam',
        friend: generateMockUser({
          id: 'friend-liam',
          firstName: 'Liam',
          age: 27,
          currentJob: 'Software Engineer',
          photos: [{ id: 'photo-liam', url: MOCK_PHOTOS[3], isMain: true, order: 0 }],
        }),
        isAnchorToday: true,
        hasCompletedGrid: false,
        karmaScore: generateMockKarma(4),
        addedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        candidatePreviews: [
          { id: 'c7', photo: MOCK_PHOTOS[11] },
          { id: 'c8', photo: MOCK_PHOTOS[12] },
          { id: 'c9', photo: MOCK_PHOTOS[13] },
        ],
        streakDays: 2,
        assistsCount: 5,
        friendshipTier: getFriendshipTier(2),
      },
      {
        friendshipId: 'friendship-4',
        userId: 'current-user',
        friendId: 'friend-sophia',
        friend: generateMockUser({
          id: 'friend-sophia',
          firstName: 'Sophia',
          age: 25,
          currentJob: 'Teacher',
          photos: [{ id: 'photo-sophia', url: MOCK_PHOTOS[2], isMain: true, order: 0 }],
        }),
        isAnchorToday: false, // Not an anchor (in active match)
        hasCompletedGrid: false,
        karmaScore: generateMockKarma(15),
        addedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        streakDays: 15,
        assistsCount: 22,
        friendshipTier: getFriendshipTier(15),
      },
      {
        friendshipId: 'friendship-5',
        userId: 'current-user',
        friendId: 'friend-olivia',
        friend: generateMockUser({
          id: 'friend-olivia',
          firstName: 'Olivia',
          age: 29,
          currentJob: 'Product Manager',
          photos: [{ id: 'photo-olivia', url: MOCK_PHOTOS[4], isMain: true, order: 0 }],
        }),
        isAnchorToday: true,
        hasCompletedGrid: true,
        karmaScore: generateMockKarma(20),
        addedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        candidatePreviews: [
          { id: 'c10', photo: MOCK_PHOTOS[14] },
          { id: 'c11', photo: MOCK_PHOTOS[15] },
          { id: 'c12', photo: MOCK_PHOTOS[16] },
        ],
        streakDays: 20,
        assistsCount: 30,
        friendshipTier: getFriendshipTier(20),
      },
    ].map(f => ({
      ...f,
      // If the user voted a match for this friend, mark them as helped
      hasCompletedGrid: f.hasCompletedGrid || mockState.helpedFriends.includes(f.friendId),
    }));

    // ── Shared proposal partner ──────────────────────────────────────────────
    const partnerProfile = generateMockUser({
      id: 'partner-blake',
      firstName: 'Blake',
      age: 27,
      currentJob: 'Photographer',
      location: 'Brooklyn, NY',
      photos: [{ id: 'photo-blake', url: MOCK_PHOTOS[5], isMain: true, order: 0 }],
    });

    const endorserMaya = generateMockUser({
      id: 'friend-maya-e',
      firstName: 'Maya',
      age: 26,
      currentJob: 'Designer',
      photos: [{ id: 'photo-maya-e', url: MOCK_PHOTOS[0], isMain: true, order: 0 }],
    });

    const baseProposal = {
      id: 'pending-proposal-1',
      proposalId: 'proposal-approved-001',
      partnerProfile,
      status: 'pending',
      communityScore: 82,
      endorsers: [
        {
          id: 'endorsement-1',
          proposalId: 'proposal-approved-001',
          endorserUserId: 'friend-maya-e',
          endorserProfile: endorserMaya,
          endorsementType: 'friend_of_a',
          selectedCandidateId: partnerProfile.id,
          createdAt: new Date().toISOString(),
        },
      ],
      expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
      approvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    };

    // ── Active match partner ─────────────────────────────────────────────────
    const activeMatchPartner = generateMockUser({
      id: 'active-match-partner',
      firstName: 'Reese',
      age: 26,
      currentJob: 'Musician',
      location: 'Queens, NY',
      photos: [{ id: 'photo-reese', url: MOCK_PHOTOS[7], isMain: true, order: 0 }],
    });

    const activeMatchData = {
      matchId: 'active-match-1',
      proposalId: 'proposal-approved-002',
      partnerProfile: activeMatchPartner,
      matchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      daysActive: 2,
      canEndMatch: false,
      daysUntilCanEnd: 1,
      messagesExchanged: 15,
    };

    // ── Build pendingProposals and activeMatch from mockState.matchState ──────
    let pendingProposals: any[] = [];
    let activeMatch: any = null;

    switch (mockState.matchState) {
      case 'empty':
        break;
      case 'new_match':
        pendingProposals = [{ ...baseProposal, yourDecision: 'pending', partnerDecision: 'pending' }];
        break;
      case 'awaiting_you':
        pendingProposals = [{ ...baseProposal, yourDecision: 'pending', partnerDecision: 'accepted' }];
        break;
      case 'awaiting_them':
        pendingProposals = [{ ...baseProposal, yourDecision: 'accepted', partnerDecision: 'pending' }];
        break;
      case 'active_match':
        activeMatch = activeMatchData;
        break;
    }

    return { friends, pendingProposals, activeMatch };
  }

  // ==========================================================================
  // DEVELOPER TESTING UTILITIES
  // ==========================================================================

  /**
   * Reset all community state (for testing)
   */
  async resetCommunityState(): Promise<void> {
    logger.info('[Mock] Resetting all community state...');

    mockState = {
      dailyTasksCompleted: false,
      gridProposalSubmitted: false,
      votesSubmitted: 0,
      friendsAreaUnlocked: false,
      mockDataEnabled: true,
      timeRestrictionDisabled: true,
      fastForwardMode: false,
      currentKarmaAssists: 5,
      proposalDecisions: {},
    };

    logger.info('[Mock] State reset complete');
  }

  /**
   * Skip daily tasks (for testing)
   */
  async skipDailyTasks(): Promise<void> {
    logger.info('[Mock] Skipping daily tasks...');

    mockState.gridProposalSubmitted = true;
    mockState.votesSubmitted = 3;
    mockState.dailyTasksCompleted = true;
    mockState.friendsAreaUnlocked = true;

    logger.info('[Mock] Daily tasks skipped');
  }

  /**
   * Fast forward time (for testing proposal expiration)
   */
  async fastForwardTime(): Promise<void> {
    logger.info('[Mock] Fast forward mode enabled');
    mockState.fastForwardMode = true;
  }

  /**
   * Set karma assists (for testing karma tiers)
   */
  async setKarmaAssists(assists: number): Promise<void> {
    logger.info('[Mock] Setting karma assists to:', assists);
    mockState.currentKarmaAssists = assists;
  }

  /**
   * Mark a friend as helped (voted on their match proposal)
   */
  async markFriendAsHelped(friendId: string): Promise<void> {
    if (!mockState.helpedFriends.includes(friendId)) {
      mockState.helpedFriends.push(friendId);
      logger.info('[Mock] Friend marked as helped:', friendId);
    }
  }

  /**
   * Toggle time restrictions
   */
  async toggleTimeRestrictions(disabled: boolean): Promise<void> {
    logger.info('[Mock] Time restrictions:', disabled ? 'DISABLED' : 'ENABLED');
    mockState.timeRestrictionDisabled = disabled;
  }

  // ==========================================================================
  // DEV STATE TOGGLE API
  // ==========================================================================

  private stateChangeListeners: Array<() => void> = [];

  /** Subscribe to mock state changes. Returns an unsubscribe function. */
  onStateChange(listener: () => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
    };
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(l => l());
  }

  setMatchState(state: MockMatchState): void {
    mockState.matchState = state;
    this.notifyStateChange();
  }

  setFriendsState(state: MockFriendsState): void {
    mockState.friendsState = state;
    mockState.helpedFriends = []; // reset helped friends when switching states
    this.notifyStateChange();
  }

  getCurrentMatchState(): MockMatchState {
    return mockState.matchState;
  }

  getCurrentFriendsState(): MockFriendsState {
    return mockState.friendsState;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private checkDailyTasksComplete(): void {
    if (mockState.gridProposalSubmitted && mockState.votesSubmitted >= 3) {
      mockState.dailyTasksCompleted = true;
      mockState.friendsAreaUnlocked = true;
      logger.info('[Mock] Daily tasks complete! Friends Area unlocked.');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const communityService = new CommunityService();
export default communityService;
