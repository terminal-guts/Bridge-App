/**
 * Match Insights Components
 *
 * Displays compatibility information, shared interests, and match highlights
 * to help users understand WHY they were matched.
 */

import React from 'react';
import { View } from 'react-native';
import { styled } from 'nativewind';
import { H3, Body } from './ui';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types';

const StyledView = styled(View);

interface MatchInsightsProps {
  recipientProfile: UserProfile;
  currentUserProfile?: UserProfile;
  communityScore: number;
}

/**
 * Main Match Insights Component
 * Shows why two people were matched
 */
export const MatchInsights: React.FC<MatchInsightsProps> = ({
  recipientProfile,
  currentUserProfile,
  communityScore,
}) => {
  const sharedInterests = currentUserProfile?.interests?.filter(interest =>
    recipientProfile.interests?.includes(interest)
  ) || [];

  const sharedValues = currentUserProfile?.values?.filter(value =>
    recipientProfile.values?.includes(value)
  ) || [];

  const hasLifestyleAlignment = checkLifestyleAlignment(currentUserProfile, recipientProfile);

  return (
    <StyledView className="space-y-3">
      {/* Community Score */}
      <CompatibilityScore score={communityScore} />

      {/* Shared Values */}
      {sharedValues.length > 0 && (
        <InsightCard
          icon="heart"
          iconColor="#437FFF"
          iconBg="bg-primary-100"
          title="Shared Values"
          items={sharedValues.slice(0, 3)}
        />
      )}

      {/* Common Interests */}
      {sharedInterests.length > 0 && (
        <InsightCard
          icon="sparkles"
          iconColor="#8B5CF6"
          iconBg="bg-purple-100"
          title="Common Interests"
          items={sharedInterests.slice(0, 3)}
        />
      )}

      {/* Lifestyle Alignment */}
      {hasLifestyleAlignment && (
        <InsightCard
          icon="leaf"
          iconColor="#12B981"
          iconBg="bg-success/20"
          title="Lifestyle Alignment"
          description="Similar preferences for social activities and lifestyle choices"
        />
      )}
    </StyledView>
  );
};

/**
 * Compatibility Score Display
 * Shows the community match score with visual representation
 */
interface CompatibilityScoreProps {
  score: number;
  label?: string;
}

export const CompatibilityScore: React.FC<CompatibilityScoreProps> = ({
  score,
  label = 'Community Match Score',
}) => {
  const scoreColor = score >= 90 ? '#12B981' : score >= 75 ? '#437FFF' : '#8B5CF6';
  const scoreLabel = score >= 90 ? 'Excellent' : score >= 75 ? 'Great' : 'Good';

  return (
    <StyledView className="bg-white rounded-2xl p-4 border border-neutral-200">
      <StyledView className="flex-row items-center justify-between">
        <StyledView className="flex-1">
          <Body className="text-neutral-600 text-sm mb-1">{label}</Body>
          <H3 style={{ color: scoreColor }}>{scoreLabel} Match</H3>
        </StyledView>

        {/* Circular Score */}
        <StyledView className="relative w-16 h-16">
          {/* Background circle */}
          <StyledView
            className="absolute inset-0 rounded-full border-4"
            style={{ borderColor: `${scoreColor}20` }}
          />
          {/* Score circle - would be animated in production */}
          <StyledView
            className="absolute inset-0 rounded-full border-4 items-center justify-center"
            style={{
              borderColor: scoreColor,
              borderTopColor: `${scoreColor}20`,
              borderRightColor: `${scoreColor}20`,
              transform: [{ rotate: `${(score / 100) * 360}deg` }],
            }}
          />
          {/* Score text */}
          <StyledView className="absolute inset-0 items-center justify-center">
            <Body className="font-bold" style={{ color: scoreColor }}>
              {score}%
            </Body>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Progress bar */}
      <StyledView className="mt-3">
        <StyledView className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <StyledView
            className="h-full rounded-full"
            style={{ width: `${score}%`, backgroundColor: scoreColor }}
          />
        </StyledView>
      </StyledView>
    </StyledView>
  );
};

/**
 * Insight Card Component
 * Reusable card for displaying match insights
 */
interface InsightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  items?: string[];
  description?: string;
}

const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  iconColor,
  iconBg,
  title,
  items,
  description,
}) => {
  return (
    <StyledView className="bg-white rounded-2xl p-4 border border-neutral-200">
      <StyledView className="flex-row items-start">
        {/* Icon */}
        <StyledView
          className={`w-10 h-10 rounded-full ${iconBg} items-center justify-center mr-3`}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </StyledView>

        {/* Content */}
        <StyledView className="flex-1">
          <Body className="font-semibold text-neutral-900 mb-1">{title}</Body>

          {/* Items list */}
          {items && items.length > 0 && (
            <StyledView className="flex-row flex-wrap -mx-1">
              {items.map((item, index) => (
                <StyledView key={index} className="px-1 mb-1">
                  <StyledView className="bg-neutral-100 px-2 py-1 rounded-full">
                    <Body className="text-neutral-700 text-xs">{item}</Body>
                  </StyledView>
                </StyledView>
              ))}
            </StyledView>
          )}

          {/* Description */}
          {description && (
            <Body className="text-neutral-600 text-sm">{description}</Body>
          )}
        </StyledView>
      </StyledView>
    </StyledView>
  );
};

/**
 * Match Highlights Compact
 * Compact version showing top 3 highlights
 */
interface MatchHighlightsCompactProps {
  highlights: string[];
}

export const MatchHighlightsCompact: React.FC<MatchHighlightsCompactProps> = ({
  highlights,
}) => {
  if (!highlights || highlights.length === 0) return null;

  return (
    <StyledView className="space-y-2">
      {highlights.slice(0, 3).map((highlight, index) => (
        <StyledView key={index} className="flex-row items-start">
          <StyledView className="w-5 h-5 rounded-full bg-primary-100 items-center justify-center mr-2 mt-0.5">
            <Ionicons name="checkmark" size={12} color="#437FFF" />
          </StyledView>
          <Body className="text-neutral-700 text-sm flex-1">{highlight}</Body>
        </StyledView>
      ))}
    </StyledView>
  );
};

/**
 * Helper function to check lifestyle alignment
 */
const checkLifestyleAlignment = (
  profile1?: UserProfile,
  profile2?: UserProfile
): boolean => {
  if (!profile1 || !profile2) return false;

  // Check drinking frequency alignment
  const drinkingMatch = profile1.drinkingFrequency === profile2.drinkingFrequency;

  // Check similar lifestyle preferences
  const lifestyleMatch =
    profile1.lifestyle?.exercise === profile2.lifestyle?.exercise ||
    profile1.lifestyle?.pets?.some(pet => profile2.lifestyle?.pets?.includes(pet));

  return drinkingMatch || (lifestyleMatch ?? false);
};

/**
 * Generate match highlights based on profiles
 */
export const generateMatchHighlights = (
  recipientProfile: UserProfile,
  currentUserProfile?: UserProfile,
  communityScore?: number
): string[] => {
  const highlights: string[] = [];

  if (!currentUserProfile) return highlights;

  // Shared interests
  const sharedInterests = currentUserProfile.interests?.filter(interest =>
    recipientProfile.interests?.includes(interest)
  );
  if (sharedInterests && sharedInterests.length > 0) {
    highlights.push(
      `You both love ${sharedInterests.slice(0, 2).join(' and ')}`
    );
  }

  // Shared values
  const sharedValues = currentUserProfile.values?.filter(value =>
    recipientProfile.values?.includes(value)
  );
  if (sharedValues && sharedValues.length > 0) {
    highlights.push(
      `Both value ${sharedValues.slice(0, 2).join(' and ')}`
    );
  }

  // Education alignment
  if (currentUserProfile.educationLevel === recipientProfile.educationLevel) {
    highlights.push('Similar educational background');
  }

  // Community consensus
  if (communityScore && communityScore >= 80) {
    highlights.push(
      `${communityScore}% community agreement - strong match!`
    );
  }

  return highlights;
};
