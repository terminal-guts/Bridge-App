/**
 * Profile Strength Dashboard
 *
 * Comprehensive profile quality assessment with:
 * - Overall strength score and progress
 * - Section-by-section breakdown
 * - Actionable improvement suggestions
 * - Gamification elements and rewards
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { H2, H3, Body, Card } from './ui';
import { UserProfile } from '../types';
import { calculateMatchPreferencesCompleteness } from '../utils/profileCompleteness';

interface ProfileStrengthDashboardProps {
  profile: UserProfile;
  onSectionPress?: (section: string) => void;
  className?: string;
}

interface SectionScore {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  score: number;
  maxScore: number;
  suggestions: string[];
  color: string;
  displayPercentage?: number; // Override calculated percentage for display
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * Calculate profile strength metrics - Simplified to 4 categories
 */
const calculateStrength = (profile: UserProfile): {
  overall: number;
  sections: SectionScore[];
} => {
  const sections: SectionScore[] = [];

  // 1. About Me (max 19 points) - All fields equally weighted (1 point each)
  let aboutScore = 0;
  const aboutSuggestions: string[] = [];

  // Basic Demographics (7 fields)
  if (profile.firstName?.trim()) aboutScore += 1; else aboutSuggestions.push('Add first name');
  if (profile.lastName?.trim()) aboutScore += 1; else aboutSuggestions.push('Add last name');
  if (profile.age) aboutScore += 1; else aboutSuggestions.push('Add your age');
  if (profile.height) aboutScore += 1; else aboutSuggestions.push('Add your height');
  if (profile.ethnicity) aboutScore += 1; else aboutSuggestions.push('Add your ethnicity');
  if (profile.location) aboutScore += 1; else aboutSuggestions.push('Add your location');
  if (profile.currentJob) aboutScore += 1; else aboutSuggestions.push('Add your occupation');

  // Identity (4 fields)
  if ((profile.pronounsList && profile.pronounsList.length > 0) ||
      (profile.pronouns && profile.pronouns !== 'prefer_not_to_say')) {
    aboutScore += 1;
  } else {
    aboutSuggestions.push('Add your pronouns');
  }
  if (profile.gender && profile.gender.length > 0) aboutScore += 1; else aboutSuggestions.push('Add your gender');
  if (profile.religion) aboutScore += 1; else aboutSuggestions.push('Add your religion');
  if (profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say') {
    aboutScore += 1;
  } else {
    aboutSuggestions.push('Add political views');
  }

  // Family (2 fields)
  if (profile.hasChildren !== undefined && profile.hasChildren !== null) aboutScore += 1; else aboutSuggestions.push('Answer children status');
  if (profile.familyPlans) aboutScore += 1; else aboutSuggestions.push('Add family plans');

  // Lifestyle/Substances (4 fields - each counts separately)
  if (profile.drinkingFrequency) aboutScore += 1; else aboutSuggestions.push('Add drinking habits');
  if (profile.cannabisFrequency) aboutScore += 1; else aboutSuggestions.push('Add cannabis habits');
  if (profile.tobaccoFrequency) aboutScore += 1; else aboutSuggestions.push('Add tobacco/vaping habits');
  if (profile.otherDrugsFrequency) aboutScore += 1; else aboutSuggestions.push('Add other drugs habits');

  // Personal (2 fields - require 3+ each)
  const interestCount = profile.interests?.length || 0;
  const valueCount = profile.values?.length || 0;
  if (interestCount >= 3) aboutScore += 1;
  else aboutSuggestions.push(`Add ${Math.max(0, 3 - interestCount)} more interests`);
  if (valueCount >= 3) aboutScore += 1;
  else aboutSuggestions.push(`Add ${Math.max(0, 3 - valueCount)} more values`);

  sections.push({
    name: 'About Me',
    icon: 'person-outline',
    score: aboutScore,
    maxScore: 19,
    suggestions: aboutSuggestions.slice(0, 2),
    color: '#437FFF',
  });

  // 2. Match Preferences (max 25 points)
  // All 7 mandatory match preference fields required for 100%
  const matchPrefsCompletion = calculateMatchPreferencesCompleteness(profile);
  const preferencesScore = Math.round((matchPrefsCompletion.percentage / 100) * 25);
  const preferencesSuggestions: string[] = matchPrefsCompletion.missingFields.map(field => `Set ${field.toLowerCase()}`);

  sections.push({
    name: 'Match Preferences',
    icon: 'heart-outline',
    score: preferencesScore,
    maxScore: 25,
    suggestions: preferencesSuggestions.slice(0, 2),
    color: '#7C3AED',
    displayPercentage: matchPrefsCompletion.percentage, // Use exact percentage from calculator
  });

  // 3. Photos (max 25 points)
  // 6 photos = 100% for this section
  let photosScore = 0;
  const photosSuggestions: string[] = [];
  const photoCount = profile.photos?.length || 0;

  if (photoCount >= 6) {
    // 6 photos = full credit (100%)
    photosScore = 25;
  } else if (photoCount > 0) {
    // Partial credit: each photo is worth 1/6 of total points
    photosScore = Math.round((photoCount / 6) * 25);
    photosSuggestions.push(`Add ${6 - photoCount} more photo${6 - photoCount > 1 ? 's' : ''}`);
  } else {
    photosSuggestions.push('Add profile photos (6 recommended)');
  }

  sections.push({
    name: 'Photos',
    icon: 'camera-outline',
    score: photosScore,
    maxScore: 25,
    suggestions: photosSuggestions,
    color: '#10B981',
  });

  // 4. Deep Questions (max 25 points)
  // 3 starred questions = 100% for this section (required to enter matching pool)
  let questionsScore = 0;
  const questionsSuggestions: string[] = [];
  const answeredCount = profile.deepQuestions?.length || 0;
  const displayedCount = profile.displayedQuestions?.length || 0;

  if (displayedCount >= 3) {
    // 3 starred questions = full credit (100%)
    questionsScore = 25;
  } else if (displayedCount > 0) {
    // Partial credit based on starred questions (each starred = 1/3 of full points)
    questionsScore = Math.round((displayedCount / 3) * 25);
    questionsSuggestions.push(`Star ${3 - displayedCount} more to enter matching pool`);
  } else if (answeredCount > 0) {
    // Have answered but none starred - give small credit for answering
    questionsScore = Math.min(Math.round((answeredCount / 3) * 10), 10); // Max 10 points for just answering
    questionsSuggestions.push('Star 3 questions to enter matching pool');
  } else {
    questionsSuggestions.push('Answer 3 questions to enter matching pool');
  }

  sections.push({
    name: 'Deep Questions',
    icon: 'chatbubble-ellipses-outline',
    score: questionsScore,
    maxScore: 25,
    suggestions: questionsSuggestions.slice(0, 2),
    color: '#F59E0B',
  });

  // Calculate overall score
  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);
  const maxTotal = sections.reduce((sum, s) => sum + s.maxScore, 0);
  const overall = Math.round((totalScore / maxTotal) * 100);

  return { overall, sections };
};

/**
 * Get strength level and message
 */
const getStrengthLevel = (score: number): { level: string; message: string; color: string } => {
  if (score >= 90) return { level: 'Excellent', message: 'Your profile stands out!', color: '#10B981' };
  if (score >= 75) return { level: 'Great', message: 'You\'re doing well!', color: '#437FFF' };
  if (score >= 60) return { level: 'Good', message: 'Keep improving!', color: '#F59E0B' };
  if (score >= 40) return { level: 'Fair', message: 'Needs some work', color: '#DC2626' };
  return { level: 'Weak', message: 'Complete your profile', color: '#B91C1C' };
};

export const ProfileStrengthDashboard: React.FC<ProfileStrengthDashboardProps> = ({
  profile,
  onSectionPress,
  className = '',
}) => {
  const { overall, sections } = calculateStrength(profile);
  const { level, color } = getStrengthLevel(overall);
  const isComplete = overall === 100;

  // Hide the card entirely when profile is 100% complete
  if (isComplete) {
    return null;
  }

  return (
    <Card elevation={3} variant="elevated" className={`mb-4 ${className}`}>
      {/* Compact Header */}
      <StyledView className="flex-row items-center justify-between mb-3">
        <StyledView className="flex-row items-center">
          <StyledView
            className="w-9 h-9 rounded-lg items-center justify-center mr-2.5"
            style={{
              backgroundColor: isComplete ? '#D1FAE5' : '#EBF2FF',
              shadowColor: isComplete ? '#10B981' : '#437FFF',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Ionicons
              name={isComplete ? 'checkmark-circle' : 'analytics'}
              size={18}
              color={isComplete ? '#10B981' : '#437FFF'}
            />
          </StyledView>
          <H3 className="text-base">Profile Strength</H3>
        </StyledView>
        <Body className="text-3xl font-bold" style={{ color }}>{overall}%</Body>
      </StyledView>

      {/* Compact 4-Category Grid */}
      <StyledView className="flex-row flex-wrap gap-2">
        {sections.map((section, index) => {
          // Use displayPercentage if provided, otherwise calculate from score
          const percentage = section.displayPercentage ?? Math.round((section.score / section.maxScore) * 100);
          const sectionComplete = percentage === 100;

          return (
            <StyledTouchableOpacity
              key={index}
              onPress={() => onSectionPress?.(section.name)}
              activeOpacity={0.7}
              className="flex-1 min-w-[48%] bg-neutral-50 rounded-lg p-3"
              style={{
                shadowColor: section.color,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: sectionComplete ? 0.25 : 0.15,
                shadowRadius: sectionComplete ? 8 : 6,
                elevation: sectionComplete ? 5 : 3,
              }}
            >
              {/* Category Icon & Name */}
              <StyledView className="flex-row items-center mb-2">
                <Ionicons name={section.icon} size={16} color={section.color} />
                <Body className="text-neutral-900 font-semibold text-xs ml-1.5 flex-1" numberOfLines={1}>
                  {section.name}
                </Body>
                {sectionComplete && (
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                )}
              </StyledView>

              {/* Progress Bar */}
              <StyledView className="bg-neutral-200 rounded-full h-1.5 overflow-hidden mb-1">
                <StyledView
                  className="h-full rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: section.color,
                  }}
                />
              </StyledView>

              {/* Percentage */}
              <Body className="text-neutral-600 text-xs font-medium">{percentage}%</Body>
            </StyledTouchableOpacity>
          );
        })}
      </StyledView>
    </Card>
  );
};
