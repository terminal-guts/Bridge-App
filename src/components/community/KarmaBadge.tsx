/**
 * KarmaBadge Component
 *
 * Displays karma tier badge with icon and optional label.
 * Tiers: New (star), Solid (star filled), Trusted (award), Elite (award filled)
 * Shows tooltip on press with assists progress.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon } from '../icons';
import { KARMA_TIERS, KarmaTier } from '../../types/community';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledPressable = styled(Pressable);

interface KarmaBadgeProps {
  tier: KarmaTier;
  assists?: number;
  compact?: boolean;
}

export function KarmaBadge({ tier, assists = 0, compact = false }: KarmaBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badge = KARMA_TIERS[tier];

  // Calculate next tier progress
  const getNextTierProgress = () => {
    const tiers = ['new', 'solid', 'trusted', 'elite'] as KarmaTier[];
    const currentIndex = tiers.indexOf(tier);

    if (currentIndex === tiers.length - 1) {
      // Already at max tier
      return {
        current: assists,
        needed: assists,
        nextTier: null,
        isMaxTier: true,
      };
    }

    const nextTier = tiers[currentIndex + 1];
    const nextBadge = KARMA_TIERS[nextTier];

    return {
      current: assists,
      needed: nextBadge.minAssists,
      nextTier: nextBadge.label,
      isMaxTier: false,
    };
  };

  const progress = getNextTierProgress();

  const handlePress = () => {
    if (assists !== undefined) {
      setShowTooltip(true);
    }
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

      {/* Tooltip Modal */}
      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <StyledPressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={() => setShowTooltip(false)}
        >
          <StyledPressable
            className="bg-white rounded-2xl p-6 mx-6 max-w-sm"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Badge Header */}
            <StyledView className="flex-row items-center mb-4">
              <EvaIcon
                name={badge.icon}
                variant={tier === 'new' ? 'outline' : 'fill'}
                color={badge.color}
                size={32}
              />
              <StyledText className="text-xl font-semibold text-neutral-900" style={{ marginLeft: 8 }}>
                {badge.label}
              </StyledText>
            </StyledView>

            {/* Progress Info */}
            {progress.isMaxTier ? (
              <StyledView className="mb-4">
                <StyledText className="text-base text-neutral-700 mb-2">
                  You've reached the highest tier!
                </StyledText>
                <StyledText className="text-sm text-neutral-600">
                  Total assists: <StyledText className="font-semibold">{assists}</StyledText>
                </StyledText>
              </StyledView>
            ) : (
              <StyledView className="mb-4">
                <StyledText className="text-base text-neutral-700 mb-2">
                  Progress to <StyledText className="font-semibold">{progress.nextTier}</StyledText>
                </StyledText>
                <StyledText className="text-sm text-neutral-600 mb-3">
                  {progress.current}/{progress.needed} assists
                </StyledText>

                {/* Progress bar */}
                <StyledView className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <StyledView
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: badge.color,
                      width: `${Math.min((progress.current / progress.needed) * 100, 100)}%`,
                    }}
                  />
                </StyledView>
              </StyledView>
            )}

            {/* Assists Definition */}
            <StyledView className="bg-neutral-50 rounded-lg p-3 mb-4">
              <StyledText className="text-xs text-neutral-600 leading-5">
                <StyledText className="font-semibold">Assists</StyledText> are earned when your match proposals
                become successful connections.
              </StyledText>
            </StyledView>

            {/* Close Button */}
            <StyledTouchableOpacity
              className="bg-primary-500 rounded-lg py-3 px-4"
              onPress={() => setShowTooltip(false)}
              activeOpacity={0.8}
            >
              <StyledText className="text-white text-center font-semibold">Got it</StyledText>
            </StyledTouchableOpacity>
          </StyledPressable>
        </StyledPressable>
      </Modal>
    </>
  );
}

export default KarmaBadge;
