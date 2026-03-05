/**
 * Onboarding Step Mapping Configuration
 *
 * Maps each onboarding step to its database table and column(s).
 * Used by saveOnboardingStep() to persist answers incrementally.
 *
 * IMPORTANT NOTES:
 * 1. Onboarding does NOT need to collect all mandatory fields
 * 2. Users can skip many steps and enter the app with incomplete profiles
 * 3. Users CANNOT enter matching pool until ALL mandatory fields are complete
 * 4. Mandatory fields not collected in onboarding must be completed in-app
 *
 * MANDATORY FIELDS NOT IN ONBOARDING:
 * - preferredEthnicities (Match Preferences - collected post-onboarding)
 * - preferredPolitics (Match Preferences - collected post-onboarding)
 * - partnerLifestylePreferences (Match Preferences - collected post-onboarding)
 * - displayedQuestions (Deep Questions - collected post-onboarding)
 * - Additional photos (Onboarding collects 1, need 3 total for matching pool)
 */

export type StepType = 'text' | 'single_choice' | 'multi_choice' | 'complex';

export interface StepMapping {
  key: string;
  type: StepType;
  table: 'user_profiles' | 'user_preferences' | 'user_photos' | 'deep_question_answers';
  columns: string[]; // Column name(s) in database
  transform?: (value: any, allData?: any) => Record<string, any>; // Optional data transformation
}

/**
 * Central mapping of onboarding steps to database schema.
 * Order matches the onboarding flow in OnboardingScreen.tsx
 */
export const ONBOARDING_STEP_MAPPING: Record<string, StepMapping> = {
  // Step 0: Phone Number
  phone_number: {
    key: 'phone_number',
    type: 'text',
    table: 'user_profiles',
    columns: ['phone_number'],
  },

  // Step 1: Name (First + Last)
  name: {
    key: 'name',
    type: 'text',
    table: 'user_profiles',
    columns: ['first_name', 'last_name'],
    transform: (data: any) => ({
      first_name: data.firstName,
      last_name: data.lastName,
    }),
  },

  // Step 2: Age (includes my age + partner age range)
  age: {
    key: 'age',
    type: 'complex',
    table: 'user_profiles', // Primary table, but also updates user_preferences
    columns: ['age'], // Plus age_min/age_max in user_preferences
    transform: (data: any) => {
      // Returns data for both tables
      return {
        profiles: { age: data.age },
        preferences: {
          age_min: data.preferences?.ageMin,
          age_max: data.preferences?.ageMax,
        },
      };
    },
  },

  // Step 3: Gender (my gender + interested in + preference)
  gender: {
    key: 'gender',
    type: 'complex',
    table: 'user_profiles', // Primary table, but also updates user_preferences
    columns: ['gender', 'interested_in_genders'], // Plus preferred_gender in user_preferences
    transform: (data: any) => {
      // Map frontend labels to database values
      const mapGender = (arr: string[]): string[] => {
        if (!arr) return [];
        return arr.map(g => {
          const map: Record<string, string> = {
            'man': 'male',
            'woman': 'female',
            'male': 'male',
            'female': 'female',
          };
          return map[g.toLowerCase()] || g;
        });
      };

      const mappedInterestedIn = mapGender(data.interestedInGenders || []);
      return {
        profiles: {
          gender: mapGender(data.gender || []),
          interested_in_genders: mappedInterestedIn,
        },
      };
    },
  },

  // Step 4: Pronouns
  pronouns: {
    key: 'pronouns',
    type: 'multi_choice',
    table: 'user_profiles',
    columns: ['pronouns_list'],
    transform: (data: any) => ({
      pronouns_list: data.pronounsList || [],
    }),
  },

  // Step 5: Height (my height + partner height range)
  height: {
    key: 'height',
    type: 'complex',
    table: 'user_profiles',
    columns: ['height_inches'],
    transform: (data: any) => {
      // Parse height string (e.g., "5'11\"") to inches
      const parseHeight = (heightStr: string): number | null => {
        if (!heightStr) return null;
        const match = heightStr.match(/(\d+)'(\d+)"/);
        if (match) {
          return parseInt(match[1], 10) * 12 + parseInt(match[2], 10);
        }
        return null;
      };

      return {
        profiles: {
          height_inches: parseHeight(data.height),
        },
        preferences: {
          preferred_height_min_inches: data.preferences?.heightMin,
          preferred_height_max_inches: data.preferences?.heightMax,
        },
      };
    },
  },

  // Step 7: Ethnicity (my ethnicity only - preferred ethnicities NOT collected in onboarding)
  ethnicity: {
    key: 'ethnicity',
    type: 'single_choice',
    table: 'user_profiles',
    columns: ['ethnicity'],
    transform: (data: any) => ({
      ethnicity: data.ethnicity || '',
    }),
  },

  // Step 9: Children & Family Plans (both collected on same page)
  children: {
    key: 'children',
    type: 'complex',
    table: 'user_profiles',
    columns: ['has_children', 'family_plans'],
    transform: (data: any) => ({
      has_children: data.hasChildren,
      family_plans: data.familyPlans,
    }),
  },

  // Step 10: Current Job
  current_job: {
    key: 'current_job',
    type: 'text',
    table: 'user_profiles',
    columns: ['current_job'],
    transform: (data: any) => ({
      current_job: data.currentJob,
    }),
  },

  // REMOVED FROM ONBOARDING: Company/Position (still available in profile edit)
  // REMOVED FROM ONBOARDING: Education Level (still available in profile edit)
  // REMOVED FROM ONBOARDING: School (still available in profile edit)

  // Step 14: Religion
  religion: {
    key: 'religion',
    type: 'single_choice',
    table: 'user_profiles',
    columns: ['religion'],
  },

  // Step 15: Political Beliefs
  political_beliefs: {
    key: 'political_beliefs',
    type: 'single_choice',
    table: 'user_profiles',
    columns: ['political_leaning'],
    transform: (data: any) => ({
      political_leaning: data.politicalLeaning,
    }),
  },

  // Step 14: Lifestyle (user's own habits only - partner preferences NOT collected in onboarding)
  lifestyle: {
    key: 'lifestyle',
    type: 'complex',
    table: 'user_profiles',
    columns: ['drinking_frequency', 'cannabis_frequency', 'tobacco_frequency', 'other_drugs_frequency'],
    transform: (data: any) => {
      return {
        profiles: {
          drinking_frequency: data.drinkingFrequency,
          cannabis_frequency: data.cannabisFrequency,
          tobacco_frequency: data.tobaccoFrequency,
          other_drugs_frequency: data.otherDrugsFrequency,
        },
      };
    },
  },

  // Step 17: Values (my values + partner values)
  values: {
    key: 'values',
    type: 'complex',
    table: 'user_profiles',
    columns: ['values'],
    transform: (data: any) => {
      return {
        profiles: {
          values: data.values || [],
        },
      };
    },
  },

  // Step 18: Interests (my interests + partner interests)
  interests: {
    key: 'interests',
    type: 'complex',
    table: 'user_profiles',
    columns: ['interests'],
    transform: (data: any) => {
      return {
        profiles: {
          interests: data.interests || [],
        },
      };
    },
  },

  // Step 19: Photos
  photos: {
    key: 'photos',
    type: 'complex',
    table: 'user_photos',
    columns: ['storage_path', 'is_main', 'display_order'],
    // Photos are handled separately via photoService
  },

  // REMOVED FROM ONBOARDING: Deep Questions (still available in profile edit)
  // Non-Negotiables: SCRAPPED from product entirely

  // Step 22: Preferences (Commitment Level)
  preferences: {
    key: 'preferences',
    type: 'single_choice',
    table: 'user_preferences',
    columns: ['looking_for'],
    transform: (data: any) => ({
      looking_for: data.preferences?.lookingFor || 'relationship',
    }),
  },

  // Step 23: Welcome to Bridge (no save needed)
  welcome: {
    key: 'welcome',
    type: 'text',
    table: 'user_profiles',
    columns: [],
    // No save - this is just a confirmation screen
  },
};

/**
 * Get step mapping by index (matches OnboardingScreen steps array)
 */
export const getStepMappingByIndex = (stepIndex: number): StepMapping | null => {
  const keys = Object.keys(ONBOARDING_STEP_MAPPING);
  const key = keys[stepIndex];
  return key ? ONBOARDING_STEP_MAPPING[key] : null;
};
