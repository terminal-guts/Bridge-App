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
import { EvaIcon } from '../icons';
import { KARMA_TIERS, KarmaTier } from '../../types/community';
import { KarmaInfoModal } from './KarmaInfoModal';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface KarmaBadgeProps {
  tier: KarmaTier;
  compact?: boolean;
}

export function KarmaBadge({ tier, compact = false }: KarmaBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badge = KARMA_TIERS[tier];

  const handlePress = () => {
    setShowTooltip(true);
  };

  return (
    <>
      <StyledTouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        className="flex-row items-center"
      >
        {compact ? (
          // Compact mode: Icon only
          <StyledView
            className="px-2 py-1 rounded-full flex-row items-center"
            style={{ backgroundColor: badge.bgColor }}
          >
            <EvaIcon
              name={badge.icon}
              variant={tier === 'new' ? 'outline' : 'fill'}
              color={badge.color}
              size={14}
            />
          </StyledView>
        ) : (
          // Full mode: Icon + label
          <StyledView
            className="px-3 py-1.5 rounded-full flex-row items-center"
            style={{ backgroundColor: badge.bgColor }}
          >
            <EvaIcon
              name={badge.icon}
              variant={tier === 'new' ? 'outline' : 'fill'}
              color={badge.color}
              size={14}
            />
            <StyledText
              className="text-xs font-medium"
              style={{ color: badge.color, marginLeft: 4 }}
            >
              {badge.label}
            </StyledText>
          </StyledView>
        )}
      </StyledTouchableOpacity>

      <KarmaInfoModal visible={showTooltip} onClose={() => setShowTooltip(false)} />
    </>
  );
}

export default KarmaBadge;
