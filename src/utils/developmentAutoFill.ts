/**
 * Development Auto-Fill Utility
 *
 * Generates random onboarding data for quick testing
 * 🚨 DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION
 */

import { OnboardingData } from '../types';

// Sample data pools
const FIRST_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery',
  'Quinn', 'Reese', 'Skylar', 'Finley', 'Rowan', 'Sage', 'Charlie', 'Drew',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Taylor',
];

const JOBS = [
  'Software Engineer', 'Product Manager', 'Designer', 'Marketing Manager',
  'Data Scientist', 'Sales Director', 'Consultant', 'Teacher', 'Nurse',
  'Financial Analyst', 'Writer', 'Photographer', 'Architect', 'Chef',
  'Entrepreneur', 'Lawyer', 'Doctor', 'Artist',
];

const SCHOOLS = [
  'Harvard University', 'Stanford University', 'MIT', 'Yale University',
  'Columbia University', 'Princeton University', 'UC Berkeley', 'UCLA',
  'NYU', 'Boston University', 'Northwestern', 'Cornell', 'Duke',
];

const HOMETOWNS = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Boston, MA',
  'San Francisco, CA', 'Seattle, WA', 'Austin, TX', 'Denver, CO',
  'Miami, FL', 'Portland, OR', 'Philadelphia, PA', 'San Diego, CA',
];

const INTERESTS = [
  'Photography', 'Hiking', 'Cooking', 'Travel', 'Reading', 'Yoga',
  'Music', 'Art', 'Running', 'Coffee', 'Wine', 'Dancing', 'Gaming',
  'Cycling', 'Swimming', 'Meditation', 'Movies', 'Concerts', 'Theater',
  'Podcasts', 'Fitness', 'Volunteering', 'Writing', 'Painting',
];

const VALUES = [
  'Authenticity', 'Family', 'Adventure', 'Growth', 'Kindness',
  'Ambition', 'Creativity', 'Honesty', 'Humor', 'Intelligence',
  'Compassion', 'Balance', 'Curiosity', 'Loyalty', 'Open-mindedness',
];

const ETHNICITIES = [
  'Asian', 'Black', 'Hispanic/Latino', 'White', 'Middle Eastern',
  'Pacific Islander', 'Mixed', 'Other',
];

const RELIGIONS = [
  'Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian',
  'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Other',
];

// Helper functions
const randomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const randomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const randomAge = () => Math.floor(Math.random() * 15) + 22; // 22-36

const randomHeight = () => {
  const feet = Math.floor(Math.random() * 2) + 5; // 5-6 feet
  const inches = Math.floor(Math.random() * 12); // 0-11 inches
  return `${feet}'${inches}"`;
};

const randomGender = (): string[] => {
  const genders = ['Male', 'Female', 'Non-binary'];
  return [randomItem(genders)];
};

const randomPronouns = (): string[] => {
  const pronounSets = [
    ['he', 'him', 'his'],
    ['she', 'her', 'hers'],
    ['they', 'them', 'theirs'],
  ];
  return randomItem(pronounSets);
};

const randomInterestedIn = (): string[] => {
  const options = ['Men', 'Women', 'Everyone'];
  return [randomItem(options)];
};

/**
 * Generate random onboarding data
 *
 * 🚨 DEVELOPMENT ONLY - Use for testing profile screens
 */
export const generateRandomOnboardingData = (): Partial<OnboardingData> => {
  const firstName = randomItem(FIRST_NAMES);
  const lastName = randomItem(LAST_NAMES);
  const age = randomAge();
  const gender = randomGender();
  const pronounsList = randomPronouns();
  const interestedInGenders = randomInterestedIn();

  console.log('🎲 Generating random onboarding data for development testing...');

  return {
    // Basic Info
    firstName,
    lastName,
    age,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,

    // Gender & Preferences
    gender,
    pronounsList,
    interestedInGenders,

    // Education & Work
    currentJob: randomItem(JOBS),
    educationLevel: randomItem([
      'high_school',
      'some_college',
      'bachelors',
      'masters',
      'phd',
    ] as const),
    school: randomItem(SCHOOLS),

    // Physical
    height: randomHeight(),

    // Background
    ethnicity: randomItem(ETHNICITIES),
    preferredEthnicities: randomItems(ETHNICITIES, Math.floor(Math.random() * 3) + 2),
    religion: randomItem(RELIGIONS),
    hometown: randomItem(HOMETOWNS),
    location: 'New York, NY', // Default to NYC

    // Politics
    politicalLeaning: randomItem([
      'very_liberal',
      'liberal',
      'moderate',
      'conservative',
      'not_political',
    ] as const),

    // Family
    hasChildren: randomItem(['yes', 'no', 'prefer_not_to_say']),
    familyPlans: randomItem([
      'want_children',
      'dont_want_children',
      'open_to_children',
      'have_children',
      'unsure',
    ]),

    // Lifestyle
    drinkingFrequency: randomItem(['never', 'rarely', 'socially', 'regularly']),
    cannabisFrequency: randomItem(['never', 'rarely', 'socially', 'regularly']),
    tobaccoFrequency: randomItem(['never', 'rarely', 'regularly']),
    otherDrugsFrequency: 'never', // Default to never for safety

    // Interests & Values
    interests: randomItems(INTERESTS, Math.floor(Math.random() * 5) + 5), // 5-9 interests
    values: randomItems(VALUES, Math.floor(Math.random() * 3) + 5), // 5-7 values

    // Partner Preferences (double-tap values)
    partnerLifestylePreferences: {
      drinking: randomItem(['never', 'rarely', 'socially', 'regularly']),
      cannabis: randomItem(['never', 'rarely', 'socially', 'regularly']),
      tobacco: randomItem(['never', 'rarely', 'regularly']),
      otherDrugs: 'never',
    },

    // Match Preferences
    preferences: {
      ageMin: age - 5,
      ageMax: age + 5,
      gender: randomItem(['male', 'female', 'both'] as const),
      lookingFor: randomItem(['relationship', 'casual', 'friendship', 'unsure'] as const),
    },

    // Deep Questions (3 random answers)
    deepQuestions: [
      {
        questionId: 1,
        tier: 1,
        question: 'What makes you feel most alive?',
        answer: randomItem([
          'Exploring new places and trying new things',
          'Deep conversations with people I care about',
          'Creating something meaningful',
          'Helping others and making a difference',
        ]),
      },
      {
        questionId: 2,
        tier: 1,
        question: 'What are you most passionate about?',
        answer: randomItem([
          'Building my career and growing professionally',
          'My relationships and spending time with loved ones',
          'Personal growth and self-discovery',
          'Making an impact on the world',
        ]),
      },
      {
        questionId: 3,
        tier: 1,
        question: 'What do you value most in a relationship?',
        answer: randomItem([
          'Honesty and open communication',
          'Shared values and life goals',
          'Chemistry and physical connection',
          'Mutual respect and support',
        ]),
      },
    ],

    // Photos - placeholder (would need actual images)
    photos: [],
  };
};

/**
 * Check if auto-fill should be triggered
 */
export const shouldAutoFillOnboarding = (featureEnabled: boolean): boolean => {
  if (!featureEnabled) return false;

  // Auto-fill on every new sign-in/sign-up during development
  console.log('🚨 DEVELOPMENT MODE: Auto-fill onboarding enabled');
  return true;
};

/**
 * Merge auto-filled data with user's existing data
 * User's data always takes precedence
 */
export const mergeAutoFillData = (
  existingData: Partial<OnboardingData>,
  autoFillData: Partial<OnboardingData>
): Partial<OnboardingData> => {
  return {
    ...autoFillData,
    ...existingData, // User data overrides auto-fill
  };
};
