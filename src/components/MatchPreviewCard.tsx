/**
 * MatchPreviewCard Component
 *
 * Displays a prospective match with privacy restrictions:
 * - NO name (first initial + age like "S, 27")
 * - NO school
 * - NO company/job title
 * - Photos have slight blur overlay
 * - SHOWS: age, interests, values, community score, expiration timer, bio/prompts
 */

import React, { useState, useEffect } from 'react';
import { View, Image, Platform } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, H3, Body, Button, Card, Avatar } from './ui';
import { UserProfile, Match } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from './ui';

const StyledView = styled(View);
const StyledImage = styled(Image);

interface MatchPreviewCardProps {
  match: Match;
  profile: UserProfile;
  onAccept: () => void;
  onPass: () => void;
  onViewFullProfile: () => void;
  isSubmitting?: boolean;
}

/**
 * Get urgency level based on hours remaining
 */
const getUrgencyLevel = (hoursLeft: number): 'normal' | 'warning' | 'urgent' | 'critical' => {
  if (hoursLeft <= 1) return 'critical';
  if (hoursLeft <= 3) return 'urgent';
  if (hoursLeft <= 12) return 'warning';
  return 'normal';
};

/**
 * Get color styles based on urgency
 */
const getUrgencyStyles = (level: ReturnType<typeof getUrgencyLevel>) => {
  switch (level) {
    case 'critical':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: '#EF4444' };
    case 'urgent':
      return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '#F97316' };
    case 'warning':
      return { bg: 'bg-amber-100', text: 'text-amber-700', icon: '#F59E0B' };
    default:
      return { bg: 'bg-neutral-100', text: 'text-neutral-700', icon: '#6B7280' };
  }
};

/**
 * Format time remaining in a human-readable way
 */
const formatTimeRemaining = (expiresAt: string): { text: string; hoursLeft: number } => {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) {
    return { text: 'Expired', hoursLeft: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { text: `${days}d ${hours % 24}h left`, hoursLeft: hours };
  }

  if (hours >= 1) {
    return { text: `${hours}h ${minutes}m left`, hoursLeft: hours };
  }

  return { text: `${minutes}m left`, hoursLeft: hours };
};

export const MatchPreviewCard: React.FC<MatchPreviewCardProps> = ({
  match,
  profile,
  onAccept,
  onPass,
  onViewFullProfile,
  isSubmitting = false,
}) => {
  const [timeInfo, setTimeInfo] = useState(formatTimeRemaining(match.expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(formatTimeRemaining(match.expiresAt));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [match.expiresAt]);

  const urgency = getUrgencyLevel(timeInfo.hoursLeft);
  const urgencyStyles = getUrgencyStyles(urgency);

  // Privacy: Get first initial + age format (e.g., "S, 27")
  const firstInitial = profile.firstName?.charAt(0)?.toUpperCase() || '?';
  const displayName = `${firstInitial}, ${profile.age}`;

  // Limit interests and values for preview
  const previewInterests = profile.interests?.slice(0, 4) || [];
  const previewValues = profile.values?.slice(0, 3) || [];

  // Get first deep question answer if available
  const firstPrompt = profile.deepQuestions?.[0];

  return (
    <Card elevation={3} variant="premium" className="p-0 overflow-hidden">
      {/* Community Score Banner */}
      <StyledView
        className="bg-primary-500 px-5 py-4"
        style={{
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <StyledView className="flex-row items-center justify-between">
          <StyledView className="flex-row items-center">
            <StyledView className="bg-white/20 rounded-full px-3 py-1.5 flex-row items-center">
              <Ionicons name="people" size={16} color="#FFFFFF" />
              <Body className="text-white font-semibold ml-1.5">
                {match.communityScore}
              </Body>
            </StyledView>
            <Body className="text-white/90 text-sm ml-3">
              friends think you'd be a great match
            </Body>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Card Content */}
      <StyledView className="p-5">
        {/* Profile Photo with Blur */}
        <StyledView className="items-center mb-5">
          <StyledView className="relative">
            <Avatar
              uri={profile.photos?.[0]?.url}
              size={140}
              rounded="2xl"
              blurRadius={6}
            />
            {/* Slight overlay for additional privacy */}
            <StyledView
              className="absolute inset-0 rounded-2xl"
              style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
            />
          </StyledView>

          {/* Name/Age Badge (Privacy: Initial + Age only) */}
          <StyledView
            className="bg-white px-4 py-2 rounded-full -mt-4 border border-neutral-200"
            style={{
              shadowColor: '#2E1810',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <H3 className="text-neutral-900">{displayName}</H3>
          </StyledView>
        </StyledView>

        {/* Timer Badge */}
        <StyledView
          className={`${urgencyStyles.bg} rounded-full px-4 py-2 self-center mb-5 flex-row items-center`}
          style={{
            shadowColor: urgencyStyles.icon,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: urgency === 'critical' ? 0.3 : urgency === 'urgent' ? 0.25 : 0.18,
            shadowRadius: urgency === 'critical' ? 8 : 6,
            elevation: urgency === 'critical' ? 5 : 3,
          }}
        >
          <Ionicons name="timer-outline" size={16} color={urgencyStyles.icon} />
          <Body className={`${urgencyStyles.text} font-semibold ml-1.5 text-sm`}>
            {timeInfo.text}
          </Body>
        </StyledView>

        {/* Interests Preview */}
        {previewInterests.length > 0 && (
          <StyledView className="mb-4">
            <Body className="text-neutral-500 text-xs uppercase tracking-wide mb-2">
              Interests
            </Body>
            <StyledView className="flex-row flex-wrap -m-1">
              {previewInterests.map((interest, i) => (
                <StyledView key={i} className="m-1">
                  <Chip label={interest} size="sm" />
                </StyledView>
              ))}
            </StyledView>
          </StyledView>
        )}

        {/* Values Preview */}
        {previewValues.length > 0 && (
          <StyledView className="mb-4">
            <Body className="text-neutral-500 text-xs uppercase tracking-wide mb-2">
              Values
            </Body>
            <StyledView className="flex-row flex-wrap -m-1">
              {previewValues.map((value, i) => (
                <StyledView key={i} className="m-1">
                  <Chip label={value} size="sm" variant="partner" />
                </StyledView>
              ))}
            </StyledView>
          </StyledView>
        )}

        {/* Bio/Prompt Preview */}
        {firstPrompt && (
          <StyledView className="bg-neutral-50 rounded-xl p-4 mb-5">
            <Body className="text-neutral-500 text-xs mb-1.5">
              {firstPrompt.question}
            </Body>
            <Body className="text-neutral-900 text-sm leading-relaxed" numberOfLines={3}>
              {firstPrompt.answer}
            </Body>
          </StyledView>
        )}

        {/* View Full Profile CTA */}
        <Button
          onPress={onViewFullProfile}
          variant="secondary"
          fullWidth
          className="mb-4"
        >
          <StyledView className="flex-row items-center justify-center">
            <Ionicons name="eye-outline" size={18} color="#437FFF" />
            <Body className="text-primary-500 font-semibold ml-2">View Full Profile</Body>
          </StyledView>
        </Button>

        {/* Decision Buttons */}
        <StyledView className="flex-row -mx-2">
          <StyledView className="flex-1 px-2">
            <Button
              onPress={onPass}
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Pass'}
            </Button>
          </StyledView>
          <StyledView className="flex-1 px-2">
            <Button
              onPress={onAccept}
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Accept'}
            </Button>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Info Footer */}
      <StyledView className="bg-primary-50 px-5 py-3 border-t border-primary-100">
        <StyledView className="flex-row items-center">
          <Ionicons name="shield-checkmark-outline" size={16} color="#437FFF" />
          <Body className="text-primary-700 text-xs ml-2 flex-1">
            Accept to unlock full profile and start chatting
          </Body>
        </StyledView>
      </StyledView>
    </Card>
  );
};
