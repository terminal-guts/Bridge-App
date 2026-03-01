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
import { calculateProfileStrengthBreakdown } from '../utils/profileCompleteness';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('ProfileStrengthDashboard');

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
 * Calculate profile strength metrics using centralized calculation
 * This ensures 100% consistency with all other components
 */
const calculateStrength = (profile: UserProfile): {
  overall: number;
  sections: SectionScore[];
} => {
  // Use centralized calculation - SINGLE SOURCE OF TRUTH
  const breakdown = calculateProfileStrengthBreakdown(profile);

  const sections: SectionScore[] = [];

  // 1. About Me - Map from centralized calculation
  const aboutSuggestions: string[] = [];
  if (!profile.firstName?.trim()) aboutSuggestions.push('Add first name');
  if (!profile.lastName?.trim()) aboutSuggestions.push('Add last name');
  if (!profile.age) aboutSuggestions.push('Add your age');
  if (!profile.height) aboutSuggestions.push('Add your height');
  if (!profile.ethnicity) aboutSuggestions.push('Add your ethnicity');
  if (!profile.currentJob) aboutSuggestions.push('Add your occupation');
  if (!((profile.pronounsList?.length ?? 0) > 0) && !(profile.pronouns && profile.pronouns !== 'prefer_not_to_say')) {
    aboutSuggestions.push('Add your pronouns');
  }
  if (!(profile.gender && profile.gender.length > 0)) aboutSuggestions.push('Add your gender');
  if (!profile.religion) aboutSuggestions.push('Add your religion');
  if (!(profile.politicalLeaning && profile.politicalLeaning !== 'prefer_not_to_say')) {
    aboutSuggestions.push('Add political views');
  }
  if (profile.hasChildren === undefined || profile.hasChildren === null) aboutSuggestions.push('Answer children status');
  if (!profile.familyPlans) aboutSuggestions.push('Add family plans');
  if (!profile.drinkingFrequency) aboutSuggestions.push('Add drinking habits');
  if (!profile.cannabisFrequency) aboutSuggestions.push('Add cannabis habits');
  if (!profile.tobaccoFrequency) aboutSuggestions.push('Add tobacco/vaping habits');
  if (!profile.otherDrugsFrequency) aboutSuggestions.push('Add other drugs habits');

  const interestCount = profile.interests?.length || 0;
  const valueCount = profile.values?.length || 0;
  if (interestCount < 3) aboutSuggestions.push(`Add ${Math.max(0, 3 - interestCount)} more interests`);
  if (valueCount < 3) aboutSuggestions.push(`Add ${Math.max(0, 3 - valueCount)} more values`);

  sections.push({
    name: 'About Me',
    icon: 'person-outline',
    score: breakdown.sections.aboutMe.score,
    maxScore: breakdown.sections.aboutMe.maxScore,
    suggestions: aboutSuggestions.slice(0, 2),
    color: '#437FFF',
    displayPercentage: breakdown.sections.aboutMe.percentage,
  });

  // 2. Match Preferences - Map from centralized calculation
  const preferencesSuggestions: string[] = [];
  if (!profile.preferences?.lookingFor?.trim()) preferencesSuggestions.push("Set looking for");
  if (!(profile.interestedInGenders && profile.interestedInGenders.length > 0)) preferencesSuggestions.push('Set gender preferences');
  if (!(profile.preferences?.ageMin && profile.preferences?.ageMax)) preferencesSuggestions.push('Set age range');
  if (!(profile.preferences?.heightMin && profile.preferences?.heightMax)) preferencesSuggestions.push('Set height preference');
  if (profile.preferences?.maxDistance === undefined) preferencesSuggestions.push('Set dating distance');
  if (!(profile.preferredEthnicities && profile.preferredEthnicities.length > 0)) preferencesSuggestions.push('Set ethnicity preferences');
  if (!(profile.preferredPolitics && profile.preferredPolitics.length > 0)) preferencesSuggestions.push('Set political preferences');
  if (!(profile.partnerLifestylePreferences?.drinking &&
        profile.partnerLifestylePreferences?.cannabis &&
        profile.partnerLifestylePreferences?.tobacco &&
        profile.partnerLifestylePreferences?.otherDrugs)) {
    preferencesSuggestions.push('Set lifestyle preferences');
  }

  sections.push({
    name: 'Match Preferences',
    icon: 'heart-outline',
    score: breakdown.sections.matchPreferences.score,
    maxScore: breakdown.sections.matchPreferences.maxScore,
    suggestions: preferencesSuggestions.slice(0, 2),
    color: '#7C3AED',
    displayPercentage: breakdown.sections.matchPreferences.percentage,
  });

  // 3. Photos - Map from centralized calculation
  const photosSuggestions: string[] = [];
  const photoCount = breakdown.sections.photos.count;
  if (photoCount === 0) {
    photosSuggestions.push('Add profile photos (3 required)');
  } else if (photoCount < 3) {
    photosSuggestions.push(`Add ${3 - photoCount} more photo${3 - photoCount > 1 ? 's' : ''}`);
  }

  sections.push({
    name: 'Photos',
    icon: 'camera-outline',
    score: breakdown.sections.photos.score,
    maxScore: breakdown.sections.photos.maxScore,
    suggestions: photosSuggestions,
    color: '#10B981',
    displayPercentage: breakdown.sections.photos.percentage,
  });

  // 4. Deep Questions - Map from centralized calculation
  const questionsSuggestions: string[] = [];
  const displayedCount = breakdown.sections.deepQuestions.displayedCount;
  const answeredCount = breakdown.sections.deepQuestions.answeredCount;

  if (displayedCount === 0 && answeredCount === 0) {
    questionsSuggestions.push('Answer 3 questions to enter matching pool');
  } else if (displayedCount === 0 && answeredCount > 0) {
    questionsSuggestions.push('Star 3 questions to enter matching pool');
  } else if (displayedCount < 3) {
    questionsSuggestions.push(`Star ${3 - displayedCount} more to enter matching pool`);
  }

  sections.push({
    name: 'Questions',
    icon: 'chatbubble-ellipses-outline',
    score: breakdown.sections.deepQuestions.score,
    maxScore: breakdown.sections.deepQuestions.maxScore,
    suggestions: questionsSuggestions.slice(0, 2),
    color: '#F59E0B',
    displayPercentage: breakdown.sections.deepQuestions.percentage,
  });

  logger.info('DASHBOARD using centralized calculation:', breakdown.overall + '%');

  return { overall: breakdown.overall, sections };
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

export const ProfileStrengthDashboard: React.FC<ProfileStrengthDashboardProps> = React.memo(({
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
              key={section.name || `section-${index}`}
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
});
