/**
 * PendingProposalCard Component (Enhanced)
 *
 * Shows a match proposal awaiting user acceptance with:
 * - Large partner photo (100px), first initial + age
 * - Community score (percentage)
 * - Endorser photo stack (overlapping circles)
 * - Smart endorser text formatting
 * - Urgency indicators (<6h warning, <3h urgent with pulse)
 * - Proposal timestamp ("Proposed 14 hours ago")
 * - "Expiring Soon" badge for urgent proposals
 * - "View Profile" button
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon } from '../../../components/icons';
import { MatchProposal } from '../../../types/community';
import { lightHaptic } from '../../../utils/haptics';
import {
  formatExpirationTime,
  formatRelativeTime,
  getUrgencyColor,
} from '../../../utils/communityHelpers';

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledImage = styled(Image) as typeof Image;
const StyledTouchable = styled(TouchableOpacity) as typeof TouchableOpacity;

interface PendingProposalCardProps {
  proposal: MatchProposal;
  onViewProfile: () => void;
}

export function PendingProposalCard({ proposal, onViewProfile }: PendingProposalCardProps) {
  const [expirationData, setExpirationData] = useState(
    formatExpirationTime(proposal.expiresAt)
  );
  const [pulseAnim] = useState(new Animated.Value(1));

  // Update expiration time
  useEffect(() => {
    const updateExpiration = () => {
      setExpirationData(formatExpirationTime(proposal.expiresAt));
    };

    updateExpiration();
    const interval = setInterval(updateExpiration, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [proposal.expiresAt]);

  // Pulsing animation for urgent proposals
  useEffect(() => {
    if (expirationData.urgencyLevel === 'urgent') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [expirationData.urgencyLevel, pulseAnim]);

  const handleViewProfile = () => {
    lightHaptic();
    onViewProfile();
  };

  // Format endorsers text
  const formatEndorsers = () => {
    if (proposal.endorsers.length === 0) {
      return 'The community thinks you\'ll click';
    }

    const friendEndorsers = proposal.endorsers.filter(
      (e) => e.endorsementType?.includes('friend')
    );

    if (friendEndorsers.length === 0) {
      return 'The community thinks you\'ll click';
    }

    if (friendEndorsers.length === 1) {
      return `Your friend ${friendEndorsers[0].endorserProfile.firstName} thinks you'll click`;
    }

    if (friendEndorsers.length === 2) {
      return `Your friends ${friendEndorsers[0].endorserProfile.firstName} and ${friendEndorsers[1].endorserProfile.firstName} think you'll click`;
    }

    // 3 or more
    const firstTwo = friendEndorsers.slice(0, 2).map((e) => e.endorserProfile.firstName);
    const remaining = friendEndorsers.length - 2;
    return `Your friends ${firstTwo.join(', ')} and ${remaining} ${remaining === 1 ? 'other' : 'others'} think you'll click`;
  };

  // Get friend endorsers
  const friendEndorsers = proposal.endorsers.filter((e) =>
    e.endorsementType?.includes('friend')
  );

  // Warm, inviting styling
  const borderColor =
    expirationData.urgencyLevel === 'urgent'
      ? '#FF6B6B'
      : expirationData.urgencyLevel === 'warning'
      ? '#FFB84D'
      : '#FFE5E5';

  const bgColor =
    expirationData.urgencyLevel === 'urgent'
      ? '#FFF5F5'
      : expirationData.urgencyLevel === 'warning'
      ? '#FFF9F0'
      : '#FFFBFB';

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulseAnim }],
        backgroundColor: bgColor,
        borderRadius: 16,
        borderWidth: 2,
        borderColor,
        padding: 16, // Standardized padding
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      {/* Top Row: Photo + Info + Badge */}
      <StyledView className="flex-row items-start mb-2">
        {/* Partner Photo - Left */}
        <StyledImage
          source={{
            uri: proposal.partnerProfile.photos?.[0]?.url,
          }}
          className="w-16 h-16 rounded-full mr-3"
          style={{
            borderWidth: 2,
            borderColor: '#FFB8B8',
          }}
        />

        {/* Info - Center */}
        <StyledView className="flex-1">
          {/* Prominent Community Score */}
          <StyledView className="flex-row items-center mb-2">
            <StyledText className="text-3xl font-bold" style={{ color: '#FF6B6B' }}>
              {Math.round(proposal.communityScore)}%
            </StyledText>
            <StyledText className="text-sm font-semibold ml-2" style={{ color: '#8B4545' }}>
              match
            </StyledText>
          </StyledView>

          {/* Endorser Text */}
          <StyledText
            className="text-xs font-medium"
            style={{ color: '#8B4545' }}
            numberOfLines={2}
          >
            {formatEndorsers()}
          </StyledText>
        </StyledView>

        {/* Expiring Soon Badge - Right */}
        {expirationData.urgencyLevel === 'urgent' && (
          <StyledView
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: '#FF6B6B' }}
          >
            <StyledText className="text-[10px] text-white font-bold">
              ⏰
            </StyledText>
          </StyledView>
        )}
      </StyledView>

      {/* Expiration Timer - Compact */}
      <StyledView className="flex-row items-center mb-2">
        <EvaIcon name="clock-outline"
          size={12}
          color={getUrgencyColor(expirationData.urgencyLevel)}
        />
        <StyledText
          className="text-xs ml-1 font-medium"
          style={{ color: getUrgencyColor(expirationData.urgencyLevel) }}
        >
          Expires in {expirationData.text}
        </StyledText>
      </StyledView>

      {/* View Profile Button - Compact */}
      <StyledTouchable
        onPress={handleViewProfile}
        className="rounded-xl py-2.5 items-center justify-center"
        style={{
          backgroundColor: '#FF6B6B',
          shadowColor: '#FF6B6B',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 3,
        }}
        activeOpacity={0.85}
      >
        <StyledText className="text-white font-bold text-sm">
          View Profile
        </StyledText>
      </StyledTouchable>
    </Animated.View>
  );
}

export default PendingProposalCard;
