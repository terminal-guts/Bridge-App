/**
 * AwaitingResponseCard Component
 *
 * Shows a match proposal where YOU have accepted but the partner hasn't responded yet.
 * Displays:
 * - Partner's photo (larger, prominent)
 * - Partner's first initial, age, and location
 * - "✓ You accepted [timestamp]" indicator
 * - Expiration countdown timer
 * - "Waiting for them to respond..." message
 *
 * Design: Warm yellow/gold color scheme (different from pink pending proposals)
 * State: partial_accepted (userDecision === true, partnerDecision === null)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { MatchProposal } from '../../types/community';
import {
  formatExpirationTime,
  formatRelativeTime,
} from '../../utils/communityHelpers';

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledImage = styled(Image) as typeof Image;

interface AwaitingResponseCardProps {
  proposal: MatchProposal;
}

export function AwaitingResponseCard({ proposal }: AwaitingResponseCardProps) {
  const [expirationData, setExpirationData] = useState(
    formatExpirationTime(proposal.expiresAt)
  );

  // Update expiration time every minute
  useEffect(() => {
    const updateExpiration = () => {
      setExpirationData(formatExpirationTime(proposal.expiresAt));
    };

    updateExpiration();
    const interval = setInterval(updateExpiration, 60000);

    return () => clearInterval(interval);
  }, [proposal.expiresAt]);

  // Calculate when user accepted (use decidedAt if available, otherwise fall back to approvedAt)
  const acceptedTime = proposal.decidedAt || proposal.approvedAt;
  const acceptedTimeAgo = formatRelativeTime(acceptedTime);

  return (
    <StyledView
      className="rounded-3xl p-6"
      style={{
        backgroundColor: '#FFFBEB', // Soft yellow
        borderWidth: 3,
        borderColor: '#FEF3C7', // Warm gold
        shadowColor: '#F59E0B', // Amber shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
      }}
    >
      {/* Header */}
      <StyledView className="flex-row items-center mb-4">
        <Ionicons name="time-outline" size={24} color="#F59E0B" style={{ marginRight: 8 }} />
        <StyledText
          className="text-xl font-semibold"
          style={{ color: '#92400E' }} // Dark amber
        >
          Awaiting Their Response
        </StyledText>
      </StyledView>

      {/* Partner Photo - Larger and prominent */}
      <StyledView className="items-center mb-5">
        <StyledImage
          source={{
            uri: proposal.partnerProfile.photos?.[0]?.url,
          }}
          className="w-32 h-32 rounded-full mb-3"
          style={{
            borderWidth: 4,
            borderColor: '#FCD34D', // Warm gold
          }}
        />

        {/* Partner Info */}
        <StyledText className="text-2xl font-bold mb-1" style={{ color: '#92400E' }}>
          {proposal.partnerProfile.firstName.charAt(0)}, {proposal.partnerProfile.age}
        </StyledText>

      </StyledView>

      {/* Acceptance Indicator */}
      <StyledView
        className="rounded-2xl p-4 mb-4 items-center"
        style={{ backgroundColor: '#FEF3C7' }} // Warm gold background
      >
        <StyledView className="flex-row items-center mb-2">
          <Ionicons name="checkmark-circle" size={24} color="#10B981" style={{ marginRight: 8 }} />
          <StyledText className="text-base font-semibold" style={{ color: '#92400E' }}>
            You accepted {acceptedTimeAgo}
          </StyledText>
        </StyledView>

        <StyledText
          className="text-sm text-center"
          style={{ color: '#78716C', lineHeight: 20 }}
        >
          Waiting for them to respond...
        </StyledText>
      </StyledView>

      {/* Expiration Timer */}
      <StyledView className="flex-row items-center justify-center">
        <Ionicons name="hourglass-outline" size={18} color="#F59E0B" />
        <StyledText
          className="text-sm ml-2 font-medium"
          style={{ color: '#D97706' }}
        >
          ⏰ Expires in {expirationData.text}
        </StyledText>
      </StyledView>
    </StyledView>
  );
}

export default AwaitingResponseCard;
