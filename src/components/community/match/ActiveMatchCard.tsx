/**
 * ActiveMatchCard Component (Enhanced)
 *
 * Shows current active match with:
 * - Partner photo, name/age, days active
 * - Progress bar showing days in match (visual timeline)
 * - Mini-milestones: "2 days together", "1 week together"
 * - Message count: "15 messages exchanged"
 * - Days until can end (if < 3 days)
 * - Celebration UI when hitting 3 days
 * - "End Match" button (enabled after 3 days)
 * - "Message" button (always available)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { ActiveMatch } from '../../../types/community';
import { mediumHaptic, lightHaptic } from '../../../utils/haptics';
import {
  getMatchProgress,
  getMatchProgressColor,
  getMatchMilestone,
  getMatchMilestoneIcon,
} from '../../../utils/communityHelpers';
import { FONTS } from '../../../constants/typography';
import { SHADOWS } from '../../../theme/shadows';
import { EvaIcon } from '../../icons';

const StyledView = styled(View) as typeof View;
const StyledText = styled(Text) as typeof Text;
const StyledImage = styled(Image) as typeof Image;
const StyledTouchable = styled(TouchableOpacity) as typeof TouchableOpacity;

interface ActiveMatchCardProps {
  match: ActiveMatch;
  onMessage: () => void;
  onEndMatch?: () => void;
}

export function ActiveMatchCard({ match, onMessage, onEndMatch }: ActiveMatchCardProps) {
  if (!match.partnerProfile) return null;

  const handleMessage = () => {
    lightHaptic();
    onMessage();
  };

  const handleEndMatch = () => {
    if (match.canEndMatch && onEndMatch) {
      mediumHaptic();
      onEndMatch();
    }
  };

  // Calculate progress and milestones
  const daysActive = match.daysActive ?? 0;
  const progress = getMatchProgress({ ...match, daysActive });
  const progressColor = getMatchProgressColor(daysActive);
  const milestone = getMatchMilestone(daysActive);
  const milestoneIcon = getMatchMilestoneIcon(daysActive);

  return (
    <StyledView
      className="rounded-2xl shadow-lg border-2"
      style={{
        backgroundColor: '#FFF1F2', // Warm rose background
        borderColor: '#FFE4E6',
        ...SHADOWS.accentRed,
        padding: 16, // Standardized padding
      }}
    >
      {/* Top Section: Photo + Header + Info */}
      <StyledView className="flex-row items-start mb-3">
        {/* Partner Photo with Heart Badge - Top Left */}
        <StyledView className="relative mr-3">
          <StyledImage
            source={{
              uri:
                match.partnerProfile.photos?.[0]?.url ||
                'https://i.pravatar.cc/100',
            }}
            className="w-16 h-16 rounded-full border-3 border-rose-200"
          />
          {/* Heart Badge */}
          <StyledView
            className="absolute -bottom-1 -right-1 bg-rose-500 rounded-full w-6 h-6 items-center justify-center"
            style={SHADOWS.accentRed}
          >
            <EvaIcon name="heart" variant="outline" size={12} color="#FFFFFF" />
          </StyledView>
        </StyledView>

        {/* Right Side: Header + Partner Info */}
        <StyledView className="flex-1">
          {/* "You have a match!" - Top Right */}
          <StyledText className="text-sm font-bold text-rose-900 mb-2" style={{ fontFamily: FONTS.bold }}>
            You have a match!
          </StyledText>

          {/* Partner Name & Age */}
          <StyledText className="text-lg font-bold text-rose-900 mb-1" style={{ fontFamily: FONTS.bold }}>
            {match.partnerProfile.firstName}, {match.partnerProfile.age}
          </StyledText>

          {/* Days Together */}
          <StyledView className="flex-row items-center">
            <StyledText className="text-sm mr-1">{milestoneIcon}</StyledText>
            <StyledText className="text-xs font-medium text-rose-700" style={{ fontFamily: FONTS.medium }}>
              {daysActive} {daysActive === 1 ? 'day' : 'days'} together
            </StyledText>
          </StyledView>
        </StyledView>
      </StyledView>

      {/* Milestone Celebration Banner */}
      {milestone && (
        <StyledView className="bg-rose-100 border border-rose-200 rounded-xl p-2 mb-3">
          <StyledText className="text-center text-rose-800 font-bold text-sm" style={{ fontFamily: FONTS.bold }}>
            {milestoneIcon} {milestone}
          </StyledText>
        </StyledView>
      )}

      {/* Buttons */}
      <StyledView className="flex-row items-center">
        {/* Message Button - Prominent */}
        <StyledTouchable
          onPress={handleMessage}
          className="flex-1 rounded-xl py-3 items-center justify-center"
          style={{
            backgroundColor: '#F43F5E',
            ...SHADOWS.accentRed,
          }}
          activeOpacity={0.8}
        >
          <StyledView className="flex-row items-center">
            <EvaIcon name="message-circle" variant="outline" size={16} color="#FFFFFF" />
            <StyledText className="text-white font-bold ml-2 text-sm" style={{ fontFamily: FONTS.bold }}>
              Message
            </StyledText>
          </StyledView>
        </StyledTouchable>

        {/* End Match - Subtle Text Link */}
        {match.canEndMatch && onEndMatch && (
          <StyledTouchable
            onPress={handleEndMatch}
            className="ml-3 py-3 px-2"
            activeOpacity={0.6}
          >
            <StyledText className="text-xs text-rose-400 underline">
              End
            </StyledText>
          </StyledTouchable>
        )}
      </StyledView>

      {/* Subtle 3-day notice (only if not yet at 3 days) */}
      {!match.canEndMatch && match.daysUntilCanEnd > 0 && (
        <StyledText className="text-[10px] text-rose-300 text-center mt-2">
          {match.daysUntilCanEnd}d until you can end this match
        </StyledText>
      )}
    </StyledView>
  );
}

export default ActiveMatchCard;
