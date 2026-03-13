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
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { MatchProposal } from '../../../types/community';
import {
  formatExpirationTime,
  formatRelativeTime,
} from '../../../utils/communityHelpers';
import { COLORS } from '../../../theme/colors';
import { FONTS } from '../../../constants/typography';
import { glowShadow } from '../../../theme/shadows';
import { EvaIcon } from '../../icons';

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledImage = Image;

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
        backgroundColor: COLORS.backgroundSoftYellow,
        borderWidth: 3,
        borderColor: COLORS.warning.bg,
        ...glowShadow(COLORS.warning.icon, 'medium'),
      }}
    >
      {/* Header */}
      <StyledView className="flex-row items-center mb-4">
        <EvaIcon name="clock" variant="outline" size={24} color={COLORS.warning.icon} style={{ marginRight: 8 }} />
        <StyledText
          className="text-xl font-semibold"
          style={{ color: COLORS.warning.text, fontFamily: FONTS.semiBold }}
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
            borderColor: COLORS.borderGold,
          }}
        />

        {/* Partner Info */}
        <StyledText className="text-2xl font-bold mb-1" style={{ color: COLORS.warning.text, fontFamily: FONTS.bold }}>
          {proposal.partnerProfile.firstName.charAt(0)}, {proposal.partnerProfile.age}
        </StyledText>

      </StyledView>

      {/* Acceptance Indicator */}
      <StyledView
        className="rounded-2xl p-4 mb-4 items-center"
        style={{ backgroundColor: COLORS.warning.bg }}
      >
        <StyledView className="flex-row items-center mb-2">
          <EvaIcon name="checkmark-circle-2" variant="outline" size={24} color={COLORS.emerald} style={{ marginRight: 8 }} />
          <StyledText className="text-base font-semibold" style={{ color: COLORS.warning.text, fontFamily: FONTS.semiBold }}>
            You accepted {acceptedTimeAgo}
          </StyledText>
        </StyledView>

        <StyledText
          className="text-sm text-center"
          style={{ color: COLORS.text.subtle, lineHeight: 20 }}
        >
          Waiting for them to respond...
        </StyledText>
      </StyledView>

      {/* Expiration Timer */}
      <StyledView className="flex-row items-center justify-center">
        <EvaIcon name="clock" variant="outline" size={18} color={COLORS.warning.icon} />
        <StyledText
          className="text-sm ml-2 font-medium"
          style={{ color: COLORS.darkAmber, fontFamily: FONTS.medium }}
        >
          Expires in {expirationData.text}
        </StyledText>
      </StyledView>
    </StyledView>
  );
}

export default AwaitingResponseCard;
