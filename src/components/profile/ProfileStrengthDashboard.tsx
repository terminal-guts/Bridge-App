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
import { View, TouchableOpacity, Text } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card } from '../ui';
import { UserProfile } from '../../types';
import { calculateProfileStrengthBreakdown } from '../../utils/profileCompleteness';
import { createLogger } from '../../utils/secureLogger';
import { EvaIcon } from '../icons';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { FONTS } from '../../constants/typography';
import { successHaptic } from '../../utils/haptics';

const logger = createLogger('ProfileStrengthDashboard');

interface ProfileStrengthDashboardProps {
  profile: UserProfile;
  onSectionPress?: (section: string) => void;
  className?: string;
}

interface SectionScore {
  name: string;
  icon: string;
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
  if (!(profile.gender && profile.gender.length > 0)) aboutSuggestions.push('Add your gender');
  if (!profile.religion) aboutSuggestions.push('Add your religion');
  if (!profile.politicalLeaning) {
    aboutSuggestions.push('Add political views');
  }
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
    icon: 'person',
    score: breakdown.sections.aboutMe.score,
    maxScore: breakdown.sections.aboutMe.maxScore,
    suggestions: aboutSuggestions.slice(0, 2),
    color: COLORS.primaryAccent,
    displayPercentage: breakdown.sections.aboutMe.percentage,
  });

  // 2. Match Preferences - Map from centralized calculation
  const preferencesSuggestions: string[] = [];
  if (!profile.preferences?.lookingFor?.trim()) preferencesSuggestions.push("Set looking for");
  if (!(profile.interestedInGenders && profile.interestedInGenders.length > 0)) preferencesSuggestions.push('Set gender preferences');
  if (!(profile.preferences?.ageMin && profile.preferences?.ageMax)) preferencesSuggestions.push('Set age range');
  if (!(profile.preferences?.heightMin && profile.preferences?.heightMax)) preferencesSuggestions.push('Set height preference');
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
    icon: 'heart',
    score: breakdown.sections.matchPreferences.score,
    maxScore: breakdown.sections.matchPreferences.maxScore,
    suggestions: preferencesSuggestions.slice(0, 2),
    color: '#8B5CF6',
    displayPercentage: breakdown.sections.matchPreferences.percentage,
  });

  // 3. Photos - Map from centralized calculation
  const photosSuggestions: string[] = [];
  const photoCount = breakdown.sections.photos.count;
  if (photoCount === 0) {
    photosSuggestions.push('Add at least 1 profile photo');
  } else if (photoCount < 3) {
    photosSuggestions.push(`Add ${3 - photoCount} more photo${3 - photoCount > 1 ? 's' : ''}`);
  }

  sections.push({
    name: 'Photo',
    icon: 'camera',
    score: breakdown.sections.photos.score,
    maxScore: breakdown.sections.photos.maxScore,
    suggestions: photosSuggestions,
    color: COLORS.success,
    displayPercentage: breakdown.sections.photos.percentage,
  });

  // 4. Deep Questions - Map from centralized calculation
  const questionsSuggestions: string[] = [];
  const displayedCount = breakdown.sections.deepQuestions.displayedCount;
  const answeredCount = breakdown.sections.deepQuestions.answeredCount;

  if (displayedCount === 0 && answeredCount === 0) {
    questionsSuggestions.push('Answer 3 questions to strengthen your profile');
  } else if (displayedCount === 0 && answeredCount > 0) {
    questionsSuggestions.push('Star 3 questions to strengthen your profile');
  } else if (displayedCount < 3) {
    questionsSuggestions.push(`Star ${3 - displayedCount} more to strengthen your profile`);
  }

  sections.push({
    name: 'Questions',
    icon: 'message-circle',
    score: breakdown.sections.deepQuestions.score,
    maxScore: breakdown.sections.deepQuestions.maxScore,
    suggestions: questionsSuggestions.slice(0, 2),
    color: COLORS.amber,
    displayPercentage: breakdown.sections.deepQuestions.percentage,
  });

  return { overall: breakdown.overall, sections };
};

/**
 * Get strength level and message.
 * Profile is COMPLETE after onboarding — strength just encourages adding
 * more photos, questions, and optional fields to stand out.
 */
const getStrengthLevel = (score: number): { level: string; message: string; color: string } => {
  if (score >= 100) return { level: 'Complete', message: 'Your profile is at full strength', color: COLORS.success };
  if (score >= 80) return { level: 'Strong', message: 'Add photos or questions to max out', color: COLORS.primaryAccent };
  if (score >= 60) return { level: 'Good', message: 'A few more details and you\'ll stand out', color: COLORS.amber };
  return { level: 'Getting Started', message: 'Stronger profiles get better matches', color: COLORS.error };
};

export const ProfileStrengthDashboard: React.FC<ProfileStrengthDashboardProps> = React.memo(({
  profile,
  onSectionPress,
  className = '',
}) => {
  const { overall, sections } = calculateStrength(profile);
  const { level, color } = getStrengthLevel(overall);
  const isComplete = overall === 100;

  // Fire success haptic when crossing milestone thresholds
  const prevOverallRef = React.useRef(overall);
  React.useEffect(() => {
    const prev = prevOverallRef.current;
    prevOverallRef.current = overall;
    const thresholds = [25, 50, 75, 100];
    for (const t of thresholds) {
      if (prev < t && overall >= t) {
        successHaptic();
        break;
      }
    }
  }, [overall]);

  // Hide the card entirely when profile is 100% complete
  if (isComplete) {
    return null;
  }

  return (
    <Card shadow="lg" variant="elevated" className={`mb-4 ${className}`}>
      {/* Compact Header */}
      <StyledView className="flex-row items-center justify-between mb-3">
        <StyledView className="flex-row items-center">
          <StyledView
            className="w-10 h-10 rounded-lg items-center justify-center mr-3"
            style={{
              backgroundColor: isComplete ? 'rgba(52, 199, 89, 0.12)' : 'rgba(67, 127, 255, 0.12)',
            }}
          >
            <EvaIcon
              name={isComplete ? 'checkmark-circle-2' : 'trending-up'}
              variant="outline"
              size={20}
              color={isComplete ? COLORS.success : COLORS.primaryAccent}
            />
          </StyledView>
          <H3 className="font-semibold text-base">Profile Strength</H3>
        </StyledView>
        <StyledView className="flex-row items-center">
          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              fontFamily: FONTS.bold,
              color,
              padding: 0,
              margin: 0,
            }}
          >
            {overall}
          </Text>
          <Body className="text-3xl font-bold" style={{ color }}>%</Body>
        </StyledView>
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
                <EvaIcon name={section.icon} variant="outline" size={16} color={section.color} />
                <Body className="text-neutral-900 font-semibold text-xs ml-1.5 flex-1" numberOfLines={1}>
                  {section.name}
                </Body>
                {sectionComplete && (
                  <EvaIcon name="checkmark-circle-2" variant="outline" size={14} color={COLORS.success} />
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
