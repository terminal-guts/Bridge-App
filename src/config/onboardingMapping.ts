/**
 * Onboarding Step Mapping Configuration
 *
 * Maps each onboarding step to its database table and column(s).
 * Used by saveOnboardingStep() to persist answers incrementally.
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

      return {
        profiles: {
          gender: mapGender(data.gender || []),
          interested_in_genders: mapGender(data.interestedInGenders || []),
        },
        preferences: {
          preferred_gender: data.preferences?.gender || 'both',
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
          return parseInt(match[1]) * 12 + parseInt(match[2]);
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

  // Step 6: Ethnicity (my ethnicity + preferred ethnicities)
  ethnicity: {
    key: 'ethnicity',
    type: 'complex',
    table: 'user_profiles',
    columns: ['ethnicity', 'preferred_ethnicities'],
    transform: (data: any) => ({
      ethnicity: data.ethnicity || '',
      preferred_ethnicities: data.preferredEthnicities || data.ethnicityPreference || [],
    }),
  },

  // Step 7: Dating Distance
  dating_distance: {
    key: 'dating_distance',
    type: 'single_choice',
    table: 'user_preferences',
    columns: ['max_distance'],
    transform: (data: any) => ({
      max_distance: data.preferences?.maxDistance !== undefined ? data.preferences.maxDistance : null,
    }),
  },

  // Step 8: Children & Family
  children: {
    key: 'children',
    type: 'single_choice',
    table: 'user_profiles',
    columns: ['has_children', 'family_plans'],
    transform: (data: any) => ({
      has_children: data.hasChildren,
      family_plans: data.familyPlans,
    }),
  },

  // Step 8: Hometown
  hometown: {
    key: 'hometown',
    type: 'text',
    table: 'user_profiles',
    columns: ['hometown'],
  },

  // Step 9: Current Location
  location: {
    key: 'location',
    type: 'text',
    table: 'user_profiles',
    columns: ['location'],
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

  // Step 11: Company/Position
  company_position: {
    key: 'company_position',
    type: 'text',
    table: 'user_profiles',
    columns: ['company_position'],
    transform: (data: any) => ({
      company_position: data.companyPosition,
    }),
  },

  // Step 12: Education Level
  education_level: {
    key: 'education_level',
    type: 'single_choice',
    table: 'user_profiles',
    columns: ['education_level'],
    transform: (data: any) => ({
      education_level: data.educationLevel,
    }),
  },

  // Step 13: School
  school: {
    key: 'school',
    type: 'text',
    table: 'user_profiles',
    columns: ['school'],
  },

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

  // Step 16: Lifestyle (drinking, cannabis, tobacco, other drugs + partner preferences)
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
        preferences: {
          partner_drinking_preference: data.partnerLifestylePreferences?.drinking,
          partner_cannabis_preference: data.partnerLifestylePreferences?.cannabis,
          partner_tobacco_preference: data.partnerLifestylePreferences?.tobacco,
          partner_other_drugs_preference: data.partnerLifestylePreferences?.otherDrugs,
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

  // Step 20: Deep Questions
  deep_questions: {
    key: 'deep_questions',
    type: 'complex',
    table: 'deep_question_answers',
    columns: ['answers', 'displayed_question_ids'],
    transform: (data: any) => {
      // Convert array format to JSONB object format
      const answersObject: Record<string, any> = {};
      (data.deepQuestions || []).forEach((q: any) => {
        answersObject[q.questionId.toString()] = {
          tier: q.tier,
          question: q.question,
          answer: q.answer,
        };
      });

      return {
        answers: answersObject,
        displayed_question_ids: data.displayedQuestions || [],
      };
    },
  },

  // Step 21: Dealbreakers
  dealbreakers: {
    key: 'dealbreakers',
    type: 'multi_choice',
    table: 'user_preferences',
    columns: ['dealbreakers'],
    transform: (data: any) => ({
      dealbreakers: (data.dealbreakers || []).map((d: any) => d.type || d),
    }),
  },

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
