/**
 * AnchorCard Component
 *
 * Displays the friend you're matching for in the Daily Grid.
 * Larger than candidate cards with full name, photo, and optional karma badge.
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import { styled } from 'nativewind';
import { UserProfile, KarmaScore } from '../../types/community';
import { KarmaBadge } from './KarmaBadge';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);

interface AnchorCardProps {
  anchor: UserProfile;
  karma?: KarmaScore;
  isRandomMatcher?: boolean; // If true, show "Find a match for [Name]" context
}

export function AnchorCard({ anchor, karma, isRandomMatcher = false }: AnchorCardProps) {
  // Get primary photo
  const mainPhoto = anchor.photos.find((p) => p.isMain) || anchor.photos[0];

  return (
    <StyledView
      className="bg-neutral-50 rounded-xl p-4 items-center"
      style={{
        width: 120,
        shadowColor: '#FF9678',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      {/* Karma Badge (top-right corner) */}
      {karma && (
        <StyledView className="absolute top-2 right-2 z-10">
          <KarmaBadge points={karma.karmaPoints} />
        </StyledView>
      )}

      {/* Photo */}
      <StyledImage
        source={{ uri: mainPhoto?.url || 'https://via.placeholder.com/100' }}
        className="rounded-full bg-neutral-200"
        style={{ width: 100, height: 100 }}
        resizeMode="cover"
      />

      {/* Context Text (if random matcher) */}
      {isRandomMatcher && (
        <StyledText className="text-xs text-neutral-600 mt-3 text-center">
          Find a match for
        </StyledText>
      )}

      {/* Name */}
      <StyledText className="text-neutral-900 font-semibold text-base mt-2 text-center">
        {anchor.firstName}
      </StyledText>

      {/* Age */}
      <StyledText className="text-neutral-600 text-sm">{anchor.age}</StyledText>

    </StyledView>
  );
}

export default AnchorCard;
