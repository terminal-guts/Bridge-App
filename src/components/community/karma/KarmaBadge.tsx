/**
 * KarmaBadge Component
 *
 * Displays karma tier badge with icon and optional label.
 * Tiers: New (star), Solid (star filled), Trusted (award), Elite (award filled)
 * Shows tooltip on press with assists progress.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { KarmaInfoModal } from './KarmaInfoModal';
import { FONTS } from '../../../constants/typography';
import { COLORS } from '../../../theme/colors';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface KarmaBadgeProps {
  points?: number;
}

export function KarmaBadge({ points = 0 }: KarmaBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handlePress = () => {
    setShowTooltip(true);
  };

  return (
    <>
      <StyledTouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 9, paddingVertical: 4,
          backgroundColor: 'rgba(52, 199, 89, 0.1)',
          borderWidth: 1, borderColor: COLORS.success,
          borderRadius: 999,
        }}
      >
        <StyledText
          className="text-xs font-semibold"
          style={{ color: COLORS.success, fontFamily: FONTS.semiBold }}
        >
          {points} pts
        </StyledText>
      </StyledTouchableOpacity>

      <KarmaInfoModal visible={showTooltip} onClose={() => setShowTooltip(false)} />
    </>
  );
}

export default KarmaBadge;
