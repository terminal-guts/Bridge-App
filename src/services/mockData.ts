import {
  UserProfile,
  DailySurvey,
  Match,
  PartialMatch,
  Message,
  Conversation,
  Friend,
  PricingData,
  Photo,
  LifestylePreferences,
  MatchPreferences,
  Notification,
} from '../types';

// Mock user profiles for surveys and matches
export const mockProfiles: UserProfile[] = [
  {
    id: '1',
    userId: 'user1',
    firstName: 'Sarah',
    lastName: 'Chen',
    age: 27,
    gender: ['Woman'],
    pronouns: 'she/her',
    pronounsList: ['She', 'Her', 'Hers'],
    interestedInGenders: ['Man'],
    ethnicity: 'Asian',
    currentJob: 'Investment Banking Analyst',
    companyPosition: 'Analyst at Goldman Sachs',
    educationLevel: "Master's Degree",
    school: 'Harvard Business School',
    height: "5'6\"",
    location: 'Manhattan, NY',
    hometown: 'San Francisco, CA',
    religion: 'Jewish',
    politicalLeaning: 'Moderate',
    hasChildren: 'No',
    familyPlans: 'Want children',
    drinkingFrequency: 'Sometimes',
    cannabisFrequency: 'No',
    tobaccoFrequency: 'No',
    otherDrugsFrequency: 'No',
    bio: 'Finance professional who loves trying new restaurants and staying active. Looking for someone who values ambition but knows how to have fun. Pilates enthusiast and wine lover.',
    photos: [
      { id: 'p1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=85', isMain: true, order: 1 },
      { id: 'p2', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=85', isMain: false, order: 2 },
      { id: 'p3', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=85', isMain: false, order: 3 },
      { id: 'p1_4', url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=85', isMain: false, order: 4 },
      { id: 'p1_5', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=85', isMain: false, order: 5 },
      { id: 'p1_6', url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=85', isMain: false, order: 6 },
    ],
    interests: ['Pilates', 'Wine Tasting', 'Travel', 'Fine Dining', 'Art Galleries', 'Running'],
    values: ['Ambition', 'Loyalty', 'Family', 'Growth Mindset', 'Integrity', 'Balance'],
    lifestyle: {
      drinking: 'Sometimes',
      smoking: 'No',
      exercise: 'often',
      diet: ['Pescatarian'],
      religion: 'Jewish',
      politics: 'Moderate',
      children: 'want',
      pets: ['Dogs'],
    },
    nonNegotiables: [
      { id: 'd1', type: 'smoking', value: true },
      { id: 'd2', type: 'children', value: 'dont_want' },
    ],
    preferences: {
      ageMin: 26,
      ageMax: 34,
      gender: 'male',
      lookingFor: 'relationship',
      heightMin: 68, // 5'8"
      heightMax: 78, // 6'6"
    },
    preferredEthnicities: ['Asian', 'White / Caucasian'],
    preferredPolitics: ['Moderate', 'Liberal'],
    maxDistance: 10, // Miles
    preferenceVisibility: {
      ethnicity: true,
      politics: true,
      lifestyle: true,
    },
    partnerLifestylePreferences: {
      drinking: 'Sometimes',
      cannabis: 'No',
      tobacco: 'No',
      otherDrugs: 'No',
    },
    deepQuestions: [
      {
        questionId: 11,
        tier: 1 as const,
        question: 'What are you most grateful for?',
        answer: 'My family and the opportunities they gave me to pursue my career in finance.',
      },
      {
        questionId: 15,
        tier: 2 as const,
        question: 'What is your greatest accomplishment?',
        answer: 'Making it to Goldman Sachs and building strong relationships with mentors who believed in me.',
      },
      {
        questionId: 18,
        tier: 3 as const,
        question: 'What qualities do you find most attractive in a potential partner, and why?',
        answer: "Ambition and drive, but also someone who values work-life balance. I want a partner who understands the demands of a career but also knows when to disconnect and enjoy life.",
      },
    ],
    displayedQuestions: [11, 15, 18],
    sectionVisibility: {
      religion: true,
      politics: true,
      family: true,
      lifestyle: true,
    },
    isPaused: false,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    userId: 'user2',
    firstName: 'Michael',
    lastName: 'Rodriguez',
    age: 29,
    gender: ['Man'],
    pronouns: 'he/him',
    pronounsList: ['He', 'Him', 'His'],
    interestedInGenders: ['Woman'],
    ethnicity: 'Hispanic / Latino',
    currentJob: 'Management Consultant',
    companyPosition: 'Senior Associate at McKinsey & Company',
    educationLevel: "Master's Degree",
    school: 'Wharton School of Business',
    height: "6'1\"",
    location: 'Brooklyn, NY',
    hometown: 'Austin, TX',
    religion: 'Agnostic',
    politicalLeaning: 'Liberal',
    hasChildren: 'No',
    familyPlans: "Don't want children",
    drinkingFrequency: 'Sometimes',
    cannabisFrequency: 'Sometimes',
    tobaccoFrequency: 'No',
    otherDrugsFrequency: 'No',
    bio: 'Strategy consultant who loves cooking experiments and finding the best cocktail bars. Equally comfortable in the gym or reading a good book. Looking for someone authentic and adventurous.',
    photos: [
      { id: 'p4', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85', isMain: true, order: 1 },
      { id: 'p5', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=85', isMain: false, order: 2 },
      { id: 'p6', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=85', isMain: false, order: 3 },
      { id: 'p2_4', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=85', isMain: false, order: 4 },
      { id: 'p2_5', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=85', isMain: false, order: 5 },
      { id: 'p2_6', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=800&q=85', isMain: false, order: 6 },
    ],
    interests: ['Running', 'Cooking', 'Golf', 'Reading', 'Cocktail Bars', 'Basketball'],
    values: ['Integrity', 'Adventure', 'Humor', 'Intelligence', 'Authenticity', 'Growth Mindset'],
    lifestyle: {
      drinking: 'Sometimes',
      smoking: 'No',
      exercise: 'daily',
      diet: [],
      religion: 'Agnostic',
      politics: 'Liberal',
      children: 'open',
      pets: ['Dogs', 'Cats'],
    },
    nonNegotiables: [
      { id: 'd3', type: 'smoking', value: true },
    ],
    preferences: {
      ageMin: 24,
      ageMax: 32,
      gender: 'female',
      lookingFor: 'relationship',
      heightMin: 62, // 5'2"
      heightMax: 70, // 5'10"
    },
    preferredEthnicities: ['White / Caucasian', 'Hispanic / Latino', 'Asian'],
    preferredPolitics: ['Liberal', 'Moderate'],
    maxDistance: 15, // Miles
    preferenceVisibility: {
      ethnicity: true,
      politics: true,
      lifestyle: true,
    },
    partnerLifestylePreferences: {
      drinking: 'Sometimes',
      cannabis: 'Sometimes',
      tobacco: 'No',
      otherDrugs: 'No',
    },
    deepQuestions: [
      {
        questionId: 7,
        tier: 1 as const,
        question: 'What would constitute a perfect day for you?',
        answer: 'Morning run in Central Park, brunch with friends, afternoon working on a challenging case, evening cooking dinner and watching a good documentary.',
      },
      {
        questionId: 10,
        tier: 2 as const,
        question: 'What are three qualities you value most in your closest friendships?',
        answer: 'Honesty, loyalty, and the ability to be yourself without judgment. Those are non-negotiable for me.',
      },
      {
        questionId: 19,
        tier: 3 as const,
        question: 'What would be important for someone to know about you if they were going to become a close friend or partner?',
        answer: "I'm ambitious but also deeply value balance. Work is important but relationships come first. I need someone who understands that duality.",
      },
    ],
    displayedQuestions: [7, 10, 19],
    sectionVisibility: {
      religion: true,
      politics: true,
      family: true,
      lifestyle: true,
    },
    isPaused: false,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: '3',
    userId: 'user3',
    firstName: 'Emily',
    lastName: 'Williams',
    age: 26,
    gender: ['Woman'],
    pronouns: 'she/her',
    pronounsList: ['She', 'Her', 'Hers'],
    interestedInGenders: ['Man'],
    ethnicity: 'White / Caucasian',
    currentJob: 'Corporate Attorney',
    companyPosition: 'Associate at Cravath, Swaine & Moore',
    educationLevel: 'Beyond Masters',
    school: 'Columbia Law School',
    height: "5'7\"",
    location: 'Manhattan, NY',
    hometown: 'Seattle, WA',
    religion: 'Spiritual',
    politicalLeaning: 'Liberal',
    hasChildren: 'No',
    familyPlans: 'Want children',
    drinkingFrequency: 'Sometimes',
    cannabisFrequency: 'No',
    tobaccoFrequency: 'No',
    otherDrugsFrequency: 'No',
    bio: 'Corporate lawyer finding balance through yoga and mindfulness. Wine enthusiast and museum lover. Seeking someone who values both success and inner peace.',
    photos: [
      { id: 'p7', url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=85', isMain: true, order: 1 },
      { id: 'p8', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=85', isMain: false, order: 2 },
      { id: 'p9', url: 'https://images.unsplash.com/photo-1502767089517-fd68ae7c5f94?w=800&q=85', isMain: false, order: 3 },
      { id: 'p3_4', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=85', isMain: false, order: 4 },
      { id: 'p3_5', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=85', isMain: false, order: 5 },
      { id: 'p3_6', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=85', isMain: false, order: 6 },
    ],
    interests: ['Yoga', 'Meditation', 'Wine', 'Museums', 'Hiking', 'Reading'],
    values: ['Balance', 'Mindfulness', 'Success', 'Authenticity', 'Integrity', 'Growth Mindset'],
    lifestyle: {
      drinking: 'Sometimes',
      smoking: 'No',
      exercise: 'daily',
      diet: ['Vegetarian'],
      religion: 'Spiritual',
      politics: 'Liberal',
      children: 'want',
      pets: ['Cats'],
    },
    nonNegotiables: [
      { id: 'd4', type: 'smoking', value: true },
    ],
    preferences: {
      ageMin: 26,
      ageMax: 35,
      gender: 'male',
      lookingFor: 'relationship',
      heightMin: 68, // 5'8"
      heightMax: 78, // 6'6"
    },
    preferredEthnicities: ['White / Caucasian', 'Asian'],
    preferredPolitics: ['Liberal'],
    maxDistance: 10, // Miles
    preferenceVisibility: {
      ethnicity: true,
      politics: true,
      lifestyle: true,
    },
    partnerLifestylePreferences: {
      drinking: 'Sometimes',
      cannabis: 'No',
      tobacco: 'No',
      otherDrugs: 'No',
    },
    deepQuestions: [
      {
        questionId: 8,
        tier: 1 as const,
        question: 'You are going to live until 90. Would you rather have the mind or body of your thirty year old self for the last 60 years of your life?',
        answer: 'Mind, definitely. Physical health is important but mental clarity and wisdom are everything.',
      },
      {
        questionId: 15,
        tier: 2 as const,
        question: 'What is your greatest accomplishment?',
        answer: 'Winning my first case at the firm and calling my parents to tell them. They sacrificed so much for my education.',
      },
      {
        questionId: 13,
        tier: 3 as const,
        question: "What's something you're actively trying to improve about yourself right now?",
        answer: 'Work-life balance. I tend to overwork and I\'m learning to set better boundaries and prioritize my mental health.',
      },
    ],
    displayedQuestions: [8, 15, 13],
    sectionVisibility: {
      religion: true,
      politics: true,
      family: true,
      lifestyle: true,
    },
    isPaused: false,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
  },
  {
    id: '4',
    userId: 'user4',
    firstName: 'James',
    lastName: 'Thompson',
    age: 30,
    gender: ['Man'],
    pronouns: 'he/him',
    pronounsList: ['He', 'Him', 'His'],
    interestedInGenders: ['Woman'],
    ethnicity: 'Black / African American',
    currentJob: 'Emergency Medicine Resident',
    companyPosition: 'Resident at Mount Sinai Hospital',
    educationLevel: 'Beyond Masters',
    school: 'Johns Hopkins School of Medicine',
    height: "5'11\"",
    location: 'Upper East Side, NY',
    hometown: 'Atlanta, GA',
    religion: 'Christian',
    politicalLeaning: 'Moderate',
    hasChildren: 'No',
    familyPlans: 'Want children',
    drinkingFrequency: 'Sometimes',
    cannabisFrequency: 'No',
    tobaccoFrequency: 'No',
    otherDrugsFrequency: 'No',
    bio: 'ER doctor committed to serving others. Basketball player, documentary watcher, and amateur chef. Looking for someone compassionate with a strong sense of family.',
    photos: [
      { id: 'p10', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=800&q=85', isMain: true, order: 1 },
      { id: 'p11', url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&q=85', isMain: false, order: 2 },
      { id: 'p12', url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&q=85', isMain: false, order: 3 },
      { id: 'p4_4', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=800&q=85', isMain: false, order: 4 },
      { id: 'p4_5', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=85', isMain: false, order: 5 },
      { id: 'p4_6', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=85', isMain: false, order: 6 },
    ],
    interests: ['Fitness', 'Coffee', 'Basketball', 'Travel', 'Documentaries', 'Cooking'],
    values: ['Compassion', 'Drive', 'Family', 'Service', 'Integrity', 'Loyalty'],
    lifestyle: {
      drinking: 'Sometimes',
      smoking: 'No',
      exercise: 'often',
      diet: [],
      religion: 'Christian',
      politics: 'Moderate',
      children: 'want',
      pets: ['Dogs'],
    },
    nonNegotiables: [
      { id: 'd5', type: 'smoking', value: true },
      { id: 'd6', type: 'drugs', value: true },
    ],
    preferences: {
      ageMin: 24,
      ageMax: 32,
      gender: 'female',
      lookingFor: 'relationship',
      heightMin: 60, // 5'0"
      heightMax: 70, // 5'10"
    },
    preferredEthnicities: ['Black / African American', 'Hispanic / Latino'],
    preferredPolitics: ['Moderate', 'Liberal'],
    maxDistance: 10, // Miles
    preferenceVisibility: {
      ethnicity: true,
      politics: true,
      lifestyle: true,
    },
    partnerLifestylePreferences: {
      drinking: 'Sometimes',
      cannabis: 'No',
      tobacco: 'No',
      otherDrugs: 'No',
    },
    deepQuestions: [
      {
        questionId: 2,
        tier: 1 as const,
        question: 'Would you like to be famous? Why?',
        answer: 'Not really interested in fame, but I would like to be known for making a real difference in emergency medicine.',
      },
      {
        questionId: 14,
        tier: 2 as const,
        question: "Is there something you've dreamed of doing for a long time? Why haven't you done it?",
        answer: "Starting a free clinic in underserved communities. Haven't done it yet because residency takes all my time, but it's definitely in my future plans.",
      },
      {
        questionId: 9,
        tier: 3 as const,
        question: "When you're overwhelmed or stressed, what actually helps you feel supported?",
        answer: 'Talking to my family and spending time in prayer. Also, going for a long run helps me clear my head and put things in perspective.',
      },
    ],
    displayedQuestions: [2, 14, 9],
    sectionVisibility: {
      religion: true,
      politics: true,
      family: true,
      lifestyle: true,
    },
    isPaused: false,
    createdAt: '2024-01-25T10:00:00Z',
    updatedAt: '2024-01-25T10:00:00Z',
  },
];

// Current user profile (the logged-in user)
// This is used as a default mock profile in development mode
export const currentUserProfile: UserProfile = {
  id: 'current',
  userId: 'currentUser',

  // Basic Info
  firstName: 'Alex',
  lastName: 'Johnson',
  age: 28,
  gender: ['Man'],
  pronouns: 'he/him',
  pronounsList: ['He', 'Him', 'His'],
  interestedInGenders: ['Woman'],

  // Physical Attributes
  height: "5'10\"",
  ethnicity: 'White / Caucasian',

  // Education & Career
  currentJob: 'Private Equity Associate',
  companyPosition: 'Associate at KKR',
  educationLevel: "Master's Degree",
  school: 'Stanford Graduate School of Business',

  // Location
  location: 'Manhattan, NY',
  hometown: 'Boston, MA',

  // Beliefs & Politics
  religion: 'Agnostic',
  politicalLeaning: 'Moderate',

  // Family
  hasChildren: 'No',
  familyPlans: 'Want children',

  // Lifestyle Frequencies
  drinkingFrequency: 'Sometimes',
  cannabisFrequency: 'No',
  tobaccoFrequency: 'No',
  otherDrugsFrequency: 'No',

  // Bio
  bio: 'PE investor who loves staying active and exploring NYC. Tennis player, wine enthusiast, and podcast addict. Seeking someone ambitious yet grounded.',

  // Photos (6 required for 100% profile strength)
  photos: [
    { id: 'cp1', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=85', isMain: true, order: 1 },
    { id: 'cp2', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=85', isMain: false, order: 2 },
    { id: 'cp3', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85', isMain: false, order: 3 },
    { id: 'cp4', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=800&q=85', isMain: false, order: 4 },
    { id: 'cp5', url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&q=85', isMain: false, order: 5 },
    { id: 'cp6', url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&q=85', isMain: false, order: 6 },
  ],

  // Interests & Values
  interests: ['Tennis', 'Skiing', 'Wine Tasting', 'Travel', 'Startups', 'Running', 'Podcasts', 'Cooking'],
  values: ['Ambition', 'Adventure', 'Honesty', 'Growth Mindset', 'Family', 'Integrity', 'Balance'],

  // Partner Preferences (double-tap selections from onboarding)
  partnerLifestylePreferences: {
    drinking: 'Sometimes',
    cannabis: 'No',
    tobacco: 'No',
    otherDrugs: 'No',
  },

  // Legacy lifestyle object (deprecated but kept for backward compatibility)
  lifestyle: {
    drinking: 'Sometimes',
    smoking: 'No',
    exercise: 'often',
    diet: [],
    religion: 'Agnostic',
    politics: 'Moderate',
    children: 'open',
    pets: ['Dogs'],
  },

  // Non-Negotiables
  nonNegotiables: [
    { id: 'cd1', type: 'smoking', value: true },
    { id: 'cd2', type: 'drugs', value: true },
  ],

  // Match Preferences
  preferences: {
    ageMin: 24,
    ageMax: 32,
    gender: 'female',
    lookingFor: 'relationship',
    heightMin: 60, // 5'0"
    heightMax: 72, // 6'0"
  },
  preferredEthnicities: ['Asian', 'White / Caucasian', 'Hispanic / Latino'],
  preferredPolitics: ['Moderate', 'Liberal'],
  maxDistance: 15, // Miles
  preferenceVisibility: {
    ethnicity: true,
    politics: true,
    lifestyle: true,
  },

  // Deep Questions
  deepQuestions: [
    {
      questionId: 5,
      tier: 1 as const,
      question: 'If you could wake up tomorrow having gained any one quality or ability, what would it be?',
      answer: 'The ability to be more present in the moment instead of always thinking about the next deal. I find myself constantly planning ahead, but some of life\'s best moments are happening right now.',
    },
    {
      questionId: 17,
      tier: 2 as const,
      question: 'What are three things you hope to have in common with your future partner?',
      answer: "Ambition balanced with values, a love for adventure and trying new things, and the ability to have deep conversations about what really matters in life.",
    },
    {
      questionId: 6,
      tier: 3 as const,
      question: 'Your house catches fire. What one item would you save?',
      answer: 'A photo album my grandmother made for me. It has irreplaceable memories and handwritten notes from family members who have passed. Material things can be replaced, but those memories and her handwriting are gone forever.',
    },
  ],
  displayedQuestions: [5, 17, 6], // Question IDs to display on profile

  // Section Visibility
  sectionVisibility: {
    religion: true,
    politics: true,
    family: true,
    lifestyle: true,
  },

  // Profile Status
  isPaused: false,

  // Timestamps
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
};

// Mock daily survey — expiresAt computed at call time to prevent stale timestamps
export const getMockDailySurvey = (): DailySurvey => ({
  id: 'survey1',
  recipientProfile: mockProfiles[0], // Sarah
  candidates: [mockProfiles[1], mockProfiles[2], mockProfiles[3]], // Michael, Emily, James
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  completedAt: undefined,
  rankings: undefined,
});

// Legacy compat — callers that imported the old constant get a fresh copy each time
export const mockDailySurvey: DailySurvey = getMockDailySurvey();

// Mock partial match (for match reveal)
export const mockPartialMatch: PartialMatch = {
  id: 'pm1',
  profile: {
    firstName: mockProfiles[0].firstName,
    age: mockProfiles[0].age,
    occupation: mockProfiles[0].currentJob || '',
    photos: mockProfiles[0].photos.map(p => ({ ...p, url: p.url + '&blur=10' })), // Simulate blurred photos
    interests: mockProfiles[0].interests.slice(0, 3), // Only show 75%
    values: mockProfiles[0].values.slice(0, 3),
  },
  communityScore: 87,
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  timeRemaining: '47:32:15',
};

// Mock accepted matches
// Profiles are shallow-copied so consumers cannot mutate the shared module-level objects
export const mockMatches: Match[] = [
  {
    id: 'match1',
    user1Id: 'currentUser',
    user2Id: 'user1',
    user1Profile: { ...currentUserProfile },
    user2Profile: { ...mockProfiles[0] },
    status: 'accepted',
    communityScore: 87,
    matchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    currentUserId: 'currentUser',
    // Active match - no unmatch data
  },
  {
    id: 'match2',
    user1Id: 'currentUser',
    user2Id: 'user2',
    user1Profile: { ...currentUserProfile },
    user2Profile: { ...mockProfiles[1] },
    status: 'pending',
    communityScore: 92,
    matchedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    currentUserId: 'currentUser',
    // Pending match - no unmatch data yet
  },
  {
    id: 'match3',
    user1Id: 'currentUser',
    user2Id: 'user3',
    user1Profile: { ...currentUserProfile },
    user2Profile: { ...mockProfiles[2] },
    status: 'accepted',
    communityScore: 78,
    matchedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    currentUserId: 'currentUser',
    // Ended match with feedback
    unmatchedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    unmatchSurveyResponse: "We had great conversations and shared a lot of interests, but I realized we're looking for different things in a relationship right now. They wanted something more casual while I'm looking for something long-term. No hard feelings!",
    exitReason: 'different_values',
    messagesExchanged: 47,
    daysSinceMatch: 7,
  },
];

// Mock messages
export const mockMessages: Message[] = [
  {
    id: 'msg1',
    matchId: 'match1',
    senderId: 'currentUser',
    type: 'text' as const,
    content: 'Hey Sarah! I see we both love exploring the NYC food scene. Have you tried that new omakase spot in West Village?',
    sentAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    readAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg2',
    matchId: 'match1',
    senderId: 'user1',
    type: 'text' as const,
    content: 'Hi Alex! Yes, I went there last week and it was incredible! The otoro was amazing. Are you into Japanese food?',
    sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    readAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg3',
    matchId: 'match1',
    senderId: 'currentUser',
    type: 'text' as const,
    content: 'Absolutely! I actually lived in Tokyo for a summer during college. Would love to grab dinner sometime and swap travel stories.',
    sentAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    readAt: undefined,
  },
];

// Mock conversations
export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    match: mockMatches[0],
    messages: mockMessages,
    lastMessage: mockMessages[mockMessages.length - 1],
    unreadCount: 0,
  },
];

// Mock friends
export const mockFriends: Friend[] = [
  {
    id: 'friend1',
    userId: 'currentUser',
    friendId: 'friend1',
    friendProfile: {
      ...mockProfiles[2],
      id: 'friend1',
      userId: 'friend1',
    },
    friendCode: 'BRIDGE123',
    badges: [
      { id: 'b1', type: 'great_matcher', earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    ],
    addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock pricing data
export const mockPricingData: PricingData = {
  malePrice: 12.50,
  femalePrice: 10.00,
  lastUpdated: new Date().toISOString(),
  marketOpen: true,
  nextUpdateIn: '14:32',
};

// Mock notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    userId: 'currentUser',
    type: 'survey_ready',
    title: 'Your daily survey is ready!',
    body: 'Complete your 8 PM matchmaking survey',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    readAt: undefined,
  },
  {
    id: 'notif2',
    userId: 'currentUser',
    type: 'match_received',
    title: 'You have a new match!',
    body: 'The community thinks you and Sarah are perfect for each other',
    data: { matchId: 'match1' },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    readAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper functions to simulate API calls
export const mockApiDelay = () => new Promise(resolve => setTimeout(resolve, 800));

export const getMockDailySurveyAsync = async (): Promise<DailySurvey | null> => {
  await mockApiDelay();
  const now = new Date();
  const surveyHour = 20; // 8 PM

  if (now.getHours() >= surveyHour - 1 && now.getHours() <= surveyHour + 1) {
    return mockDailySurvey;
  }
  return null;
};

export const getMockMatches = async (): Promise<Match[]> => {
  await mockApiDelay();
  return mockMatches;
};

export const getMockConversations = async (): Promise<Conversation[]> => {
  await mockApiDelay();
  return mockConversations;
};

export const getMockPricing = async (): Promise<PricingData> => {
  await mockApiDelay();
  return mockPricingData;
};

export const getMockFriends = async (): Promise<Friend[]> => {
  await mockApiDelay();
  return mockFriends;
};

export const getMockNotifications = async (): Promise<Notification[]> => {
  await mockApiDelay();
  return mockNotifications;
};