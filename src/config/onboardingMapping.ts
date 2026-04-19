/**
 * Onboarding Step Mapping Configuration
 *
 * Maps each onboarding step to its database table and column(s).
 * Used by saveOnboardingStep() to persist answers incrementally.
 *
 * IMPORTANT NOTES:
 * 1. Every onboarding step is required (no skip buttons)
 * 2. Finishing onboarding = profile_completed = true = in matching pool
 * 3. profile_completed is one-way: never reverts to false
 *
 * Active mappingKeys: name, age, role, gender, height, ethnicity,
 * religion, politics, lifestyle, interests, values, photos.
 *
 * Collected optionally post-onboarding (profile area only):
 * - deep questions, extra photos
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
    table: 'user_profiles',
    columns: ['gender', 'interested_in_genders'],
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
      // Mirror interested_in_genders into user_preferences too — matching
      // queries join on user_preferences.interested_in_genders, so an
      // abandoned-onboarding user with only the user_profiles copy gets
      // excluded from match generation.
      return {
        profiles: {
          gender: mapGender(data.gender || []),
          interested_in_genders: mappedInterestedIn,
        },
        preferences: {
          interested_in_genders: mappedInterestedIn,
        },
      };
    },
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

  // Ethnicity (yours + preferences — combined on one screen)
  ethnicity: {
    key: 'ethnicity',
    type: 'complex',
    table: 'user_profiles',
    columns: ['ethnicity'],
    transform: (data: any) => ({
      profiles: {
        ethnicity: data.ethnicity || '',
      },
      preferences: {
        preferred_ethnicities: data.preferredEthnicities || [],
      },
    }),
  },

  // Religion — saves own religion + auto-sets partner preference
  religion: {
    key: 'religion',
    type: 'complex',
    table: 'user_profiles',
    columns: ['religion'],
    transform: (data: any) => ({
      profiles: { religion: data.religion || '' },
      preferences: { preferred_religions: data.preferredReligions || [] },
    }),
  },

  // Politics — saves own politics + auto-sets partner preference
  politics: {
    key: 'politics',
    type: 'complex',
    table: 'user_profiles',
    columns: ['political_leaning'],
    transform: (data: any) => ({
      profiles: { political_leaning: data.politicalLeaning || '' },
      preferences: { preferred_politics: data.preferredPolitics || [] },
    }),
  },

  // Lifestyle — saves own habits + auto-sets partner preferences
  lifestyle: {
    key: 'lifestyle',
    type: 'complex',
    table: 'user_profiles',
    columns: ['drinking_frequency', 'cannabis_frequency', 'tobacco_frequency', 'other_drugs_frequency'],
    transform: (data: any) => ({
      profiles: {
        drinking_frequency: data.drinkingFrequency,
        cannabis_frequency: data.cannabisFrequency,
        tobacco_frequency: data.tobaccoFrequency,
        other_drugs_frequency: data.otherDrugsFrequency,
      },
      preferences: {
        partner_drinking: data.partnerLifestylePreferences?.drinking || [],
        partner_cannabis: data.partnerLifestylePreferences?.cannabis || [],
        partner_tobacco: data.partnerLifestylePreferences?.tobacco || [],
        partner_other_drugs: data.partnerLifestylePreferences?.otherDrugs || [],
      },
    }),
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

  // Matchmaker Roles
  role: {
    key: 'role',
    type: 'single_choice',
    table: 'user_profiles',
    columns: ['role'],
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
