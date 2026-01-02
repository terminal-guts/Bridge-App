/**
 * Validation Schemas using Zod
 *
 * SECURITY: This file contains runtime validation schemas for ALL user inputs
 * to prevent injection attacks, XSS, type confusion, and data corruption.
 *
 * All service functions MUST validate inputs using these schemas before
 * processing or sending to the database.
 */

import { z } from 'zod';

// ============================================================================
// BASIC VALIDATION PATTERNS
// ============================================================================

// Phone number validation (E.164 format)
export const phoneNumberSchema = z.string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164 format: +1234567890)');

// Email validation
export const emailSchema = z.string().email('Invalid email address');

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Friend code validation (BRIDGE-XXXX-XXXX format)
export const friendCodeSchema = z.string()
  .regex(/^BRIDGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid friend code format')
  .length(17, 'Friend code must be exactly 17 characters');

// Name validation (letters, spaces, hyphens, apostrophes only)
const nameRegex = /^[a-zA-Z\s'-]+$/;
export const firstNameSchema = z.string()
  .min(1, 'First name is required')
  .max(50, 'First name must be 50 characters or less')
  .regex(nameRegex, 'First name can only contain letters, spaces, hyphens, and apostrophes');

export const lastNameSchema = z.string()
  .min(1, 'Last name is required')
  .max(50, 'Last name must be 50 characters or less')
  .regex(nameRegex, 'Last name can only contain letters, spaces, hyphens, and apostrophes');

// Age validation
export const ageSchema = z.number()
  .int('Age must be a whole number')
  .min(18, 'Must be at least 18 years old')
  .max(100, 'Age must be 100 or less');

// Height validation (in inches)
export const heightInchesSchema = z.number()
  .int('Height must be a whole number')
  .min(48, 'Height must be at least 48 inches (4 feet)')
  .max(96, 'Height must be at most 96 inches (8 feet)');

// Height string validation (e.g., "5'11\"")
export const heightStringSchema = z.string()
  .regex(/^\d{1,2}'(\d{1,2})"?$/, 'Invalid height format (use format like 5\'11")');

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const genderSchema = z.enum(['male', 'female', 'non-binary', 'other'], {
  errorMap: () => ({ message: 'Invalid gender value' }),
});

export const pronounsSchema = z.enum(['he/him', 'she/her', 'they/them', 'other'], {
  errorMap: () => ({ message: 'Invalid pronouns value' }),
});

export const ethnicitySchema = z.string()
  .min(1, 'Ethnicity is required')
  .max(50, 'Ethnicity must be 50 characters or less');

export const religionSchema = z.string()
  .min(1, 'Religion is required')
  .max(50, 'Religion must be 50 characters or less');

export const politicalBeliefSchema = z.enum(
  ['very-liberal', 'liberal', 'moderate', 'conservative', 'very-conservative', 'apolitical', 'other'],
  { errorMap: () => ({ message: 'Invalid political belief value' }) }
);

export const educationLevelSchema = z.enum(
  ['high-school', 'some-college', 'bachelors', 'masters', 'phd', 'other'],
  { errorMap: () => ({ message: 'Invalid education level value' }) }
);

export const drinkingSchema = z.enum(['never', 'rarely', 'socially', 'regularly'], {
  errorMap: () => ({ message: 'Invalid drinking value' }),
});

export const smokingSchema = z.enum(['never', 'socially', 'regularly', 'trying-to-quit'], {
  errorMap: () => ({ message: 'Invalid smoking value' }),
});

export const exerciseSchema = z.enum(['never', 'sometimes', 'regularly', 'daily'], {
  errorMap: () => ({ message: 'Invalid exercise value' }),
});

export const childrenStatusSchema = z.enum(['none', 'have-kids', 'want-kids', 'dont-want', 'open'], {
  errorMap: () => ({ message: 'Invalid children status value' }),
});

export const marriageGoalSchema = z.enum(['soon', 'eventually', 'open', 'not-interested'], {
  errorMap: () => ({ message: 'Invalid marriage goal value' }),
});

export const relationshipTypeSchema = z.enum(['casual', 'relationship', 'open', 'not-sure'], {
  errorMap: () => ({ message: 'Invalid relationship type value' }),
});

export const matchStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'expired'], {
  errorMap: () => ({ message: 'Invalid match status value' }),
});

// ============================================================================
// LIFESTYLE SCHEMA
// ============================================================================

export const lifestyleSchema = z.object({
  drinking: drinkingSchema,
  smoking: smokingSchema,
  exercise: exerciseSchema,
  children: childrenStatusSchema,
  pets: z.array(z.string().max(50)).max(10, 'Too many pets listed'),
});

// ============================================================================
// PREFERENCES SCHEMA
// ============================================================================

export const preferencesSchema = z.object({
  ageMin: z.number().int().min(18).max(100),
  ageMax: z.number().int().min(18).max(100),
  distance: z.number().int().min(1).max(500),
  gender: genderSchema,
  lookingFor: relationshipTypeSchema,
  heightMatters: z.boolean(),
  heightMin: heightInchesSchema.optional(),
  heightMax: heightInchesSchema.optional(),
  acceptDivorced: z.boolean(),
  partnerMarriageGoal: marriageGoalSchema,
  acceptHasKids: z.boolean(),
  partnerWantsKids: childrenStatusSchema,
  educationLevel: educationLevelSchema.or(z.literal('any')),
  partnerActivityLevel: exerciseSchema.or(z.literal('any')),
}).refine(data => data.ageMin <= data.ageMax, {
  message: 'Minimum age cannot be greater than maximum age',
  path: ['ageMin'],
});

// ============================================================================
// PHOTO SCHEMA
// ============================================================================

export const photoSchema = z.object({
  id: uuidSchema,
  url: z.string().url('Invalid photo URL'),
  order: z.number().int().min(0).max(9),
  uploadedAt: z.string().datetime().optional(),
});

export const photosArraySchema = z.array(photoSchema)
  .min(1, 'At least one photo is required')
  .max(6, 'Maximum 6 photos allowed');

// ============================================================================
// DEEP QUESTIONS SCHEMA
// ============================================================================

export const deepQuestionAnswerSchema = z.object({
  questionId: z.string().max(100),
  question: z.string().max(500),
  answer: z.string().min(1, 'Answer is required').max(1000, 'Answer must be 1000 characters or less'),
});

export const deepQuestionsArraySchema = z.array(deepQuestionAnswerSchema)
  .max(10, 'Maximum 10 deep questions allowed');

// ============================================================================
// DEALBREAKERS SCHEMA
// ============================================================================

export const dealbreakerSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(200),
  selected: z.boolean(),
});

export const dealbreakersArraySchema = z.array(dealbreakerSchema)
  .max(20, 'Maximum 20 dealbreakers allowed');

// ============================================================================
// ONBOARDING DATA SCHEMA (COMPREHENSIVE USER PROFILE)
// ============================================================================

export const onboardingDataSchema = z.object({
  // Basic Info
  phoneNumber: phoneNumberSchema.optional(),
  firstName: firstNameSchema,
  lastName: lastNameSchema.optional(),
  age: ageSchema,
  gender: genderSchema,
  pronouns: pronounsSchema.optional(),

  // Physical Attributes
  height: heightStringSchema,
  ethnicity: ethnicitySchema,

  // Location
  whereFrom: z.string().min(1).max(100).optional(),
  whereLiveNow: z.string().min(1).max(100).optional(),

  // Professional
  currentJob: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  educationLevel: educationLevelSchema,
  school: z.string().max(200).optional(),

  // Beliefs
  religion: religionSchema,
  politicalBeliefs: politicalBeliefSchema.optional(),

  // Lifestyle & Interests
  lifestyle: lifestyleSchema,
  values: z.array(z.string().max(50)).max(20),
  interests: z.array(z.string().max(50)).max(30),
  desiredActivities: z.array(z.string().max(100)).max(20),

  // Content
  photos: photosArraySchema.optional(),
  deepQuestions: deepQuestionsArraySchema.optional(),

  // Dealbreakers & Preferences
  dealbreakers: dealbreakersArraySchema.optional(),
  preferences: preferencesSchema,
});

// ============================================================================
// USER PROFILE UPDATE SCHEMA (Partial updates allowed)
// ============================================================================

export const userProfileUpdateSchema = onboardingDataSchema.partial();

// ============================================================================
// FRIEND CODE SCHEMAS
// ============================================================================

export const addFriendByCodeSchema = z.object({
  friendCode: friendCodeSchema,
});

export const generateFriendCodeSchema = z.object({
  userId: uuidSchema,
});

// ============================================================================
// SURVEY SCHEMAS
// ============================================================================

export const surveyRankingSchema = z.object({
  candidate_user_id: uuidSchema,
  rank_position: z.number().int().min(1).max(3),
});

export const submitSurveyRankingsSchema = z.object({
  surveyId: uuidSchema,
  rankings: z.array(surveyRankingSchema)
    .length(3, 'Exactly 3 rankings required')
    .refine(
      (rankings) => {
        const positions = rankings.map(r => r.rank_position).sort();
        return positions[0] === 1 && positions[1] === 2 && positions[2] === 3;
      },
      { message: 'Rankings must include positions 1, 2, and 3' }
    ),
});

// ============================================================================
// MATCH SCHEMAS
// ============================================================================

export const matchActionSchema = z.object({
  matchId: uuidSchema,
  reason: z.string().max(500).optional(),
});

export const createMatchSchema = z.object({
  user1Id: uuidSchema,
  user2Id: uuidSchema,
  score: z.number().min(0).max(100),
});

// ============================================================================
// BLOCK USER SCHEMAS
// ============================================================================

export const blockUserSchema = z.object({
  blockedUserId: uuidSchema,
  reason: z.string().max(500).optional(),
});

export const unblockUserSchema = z.object({
  blockedUserId: uuidSchema,
});

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

export const userSettingsSchema = z.object({
  notifications_enabled: z.boolean(),
  match_notifications: z.boolean(),
  message_notifications: z.boolean(),
  survey_reminders: z.boolean(),
  marketing_emails: z.boolean(),
  profile_visibility: z.enum(['public', 'friends-only', 'private']),
  location_sharing: z.boolean(),
  read_receipts: z.boolean(),
});

export const updateSettingsSchema = userSettingsSchema.partial();

// ============================================================================
// OTP SCHEMAS
// ============================================================================

export const sendOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  token: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

// ============================================================================
// PHOTO UPLOAD SCHEMAS
// ============================================================================

export const uploadPhotoSchema = z.object({
  photoId: uuidSchema,
  userId: uuidSchema,
  base64Data: z.string().min(1, 'Photo data is required'),
  order: z.number().int().min(0).max(9),
});

export const deletePhotoSchema = z.object({
  photoId: uuidSchema,
});

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

// ============================================================================
// HELPER VALIDATION FUNCTIONS
// ============================================================================

/**
 * Safe validation wrapper that returns a typed result
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: z.ZodError;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Sanitize string input to prevent XSS
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input) return '';

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>\"'`]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize all string fields in an object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}

// ============================================================================
// TYPE EXPORTS (for TypeScript)
// ============================================================================

export type OnboardingData = z.infer<typeof onboardingDataSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Lifestyle = z.infer<typeof lifestyleSchema>;
export type Photo = z.infer<typeof photoSchema>;
export type DeepQuestionAnswer = z.infer<typeof deepQuestionAnswerSchema>;
export type Dealbreaker = z.infer<typeof dealbreakerSchema>;
export type SurveyRanking = z.infer<typeof surveyRankingSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
