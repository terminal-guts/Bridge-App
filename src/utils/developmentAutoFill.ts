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
  'Running', 'Coffee', 'Cocktails', 'Dancing', 'Video Games',
  'Meditation', 'Film', 'Live Music', 'Theater',
  'Podcasts', 'Lifting', 'Tennis', 'Golf', 'Brunch',
];

const VALUES = [
  'Authenticity', 'Family', 'Adventure', 'Kindness',
  'Ambition', 'Creativity', 'Honesty', 'Trust',
  'Empathy', 'Growth Mindset', 'Health', 'Integrity',
  'Communication', 'Respect', 'Career',
];

const ETHNICITIES = [
  'Asian', 'Black', 'Hispanic/Latino', 'White', 'Middle Eastern',
  'Pacific Islander', 'Other',
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
        question: 'Given the choice of anyone alive or dead, whom would you want as a dinner guest?',
        answer: randomItem([
          'My grandmother — I have so many questions I never got to ask her',
          'Leonardo da Vinci. The ultimate polymath and creative mind',
          'Obama. I want to know what the hardest decision really felt like',
          'Anthony Bourdain. Best dinner conversation guaranteed',
        ]),
      },
      {
        questionId: 9,
        tier: 2,
        question: "When you're overwhelmed or stressed, what actually helps you feel supported?",
        answer: randomItem([
          'Honestly just someone sitting with me without trying to fix it',
          'A long phone call with my best friend back home',
          'Going for a run and then talking it out after',
          'Cooking something from scratch — it forces me to slow down',
        ]),
      },
      {
        questionId: 14,
        tier: 3,
        question: "Is there something you've dreamed of doing for a long time? Why haven't you done it?",
        answer: randomItem([
          'Traveling solo through Southeast Asia. School keeps pushing it back',
          'Writing a screenplay. I have the ideas but never carve out the time',
          'Learning to surf. I keep saying next summer',
          'Starting a nonprofit. Still building the skills and network for it',
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
