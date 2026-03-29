/**
 * AnchorPhotoSection Component
 *
 * Top-left quadrant: Large, inviting photo of the anchor person.
 * Fills the entire quadrant (50% width, 50% height).
 * No name - just the warm, prominent photo.
 */

import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { getOptimizedPhotoUrl } from '../../../utils/imageUtils';
import { styled } from 'nativewind';
import { UserProfile, Photo } from '../../../types';
import { createLogger } from '../../../utils/secureLogger';
import { SHADOWS } from '../../../theme/shadows';
import { COLORS } from '../../../theme/colors';

const logger = createLogger('AnchorPhotoSection');

const StyledView = styled(View);

interface AnchorPhotoSectionProps {
  anchor: UserProfile;
}

export function AnchorPhotoSection({ anchor }: AnchorPhotoSectionProps) {
  // Get primary photo
  const mainPhoto = anchor.photos?.find((p: Photo) => p.isMain) || anchor.photos?.[0];

  // Debug: Log anchor photo data
  logger.info('[AnchorPhotoSection] anchor.photos:', anchor.photos);
  logger.info('[AnchorPhotoSection] mainPhoto:', mainPhoto);
  logger.info('[AnchorPhotoSection] mainPhoto?.url:', mainPhoto?.url);

  return (
    <StyledView style={{
      flex: 1,
      backgroundColor: COLORS.backgroundWarmCream, // Warm cream background
      borderRadius: 24, // Generous rounded corners
      overflow: 'hidden',
      margin: 8,
      ...SHADOWS.xl,
      borderWidth: 1,
      borderColor: 'rgba(251, 249, 246, 0.8)', // Subtle warm border for glow effect
    }}>
      <Image
        source={mainPhoto?.url ? { uri: getOptimizedPhotoUrl(mainPhoto.url, 'profile') } : null}
        style={{ width: '100%', height: '100%', backgroundColor: COLORS.backgroundGrayMedium }}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
    </StyledView>
  );
}

export default AnchorPhotoSection;
