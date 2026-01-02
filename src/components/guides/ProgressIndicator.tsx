/**
 * ProgressIndicator Component
 *
 * Displays current step progress and skip button for guides.
 * Shows "Step 2 of 5" with a Skip button.
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Caption } from '../ui/Typography';
import { mediumHaptic } from '../../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProgressIndicatorProps {
  /** Current step (1-indexed for display) */
  current: number;

  /** Total number of steps */
  total: number;

  /** Callback when skip button pressed */
  onSkip: () => void;

  /** Optional callback for back button (shown if current > 1) */
  onBack?: () => void;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  onSkip,
  onBack,
}) => {
  const insets = useSafeAreaInsets();

  const handleSkip = () => {
    mediumHaptic();
    onSkip();
  };

  const handleBack = () => {
    mediumHaptic();
    onBack?.();
  };

  // Convert to 1-indexed for display
  const displayStep = current + 1;

  return (
    <StyledView
      className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-6"
      style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}
    >
      {/* Back button (or spacer) */}
      {current > 0 && onBack ? (
        <StyledTouchableOpacity onPress={handleBack} className="py-3" activeOpacity={0.7}>
          <Caption className="text-white font-medium">Back</Caption>
        </StyledTouchableOpacity>
      ) : (
        <StyledView className="w-16" />
      )}

      {/* Step counter */}
      <StyledView className="px-4 py-2 bg-white/20 rounded-full">
        <Caption className="text-white font-semibold">
          Step {displayStep} of {total}
        </Caption>
      </StyledView>

      {/* Skip button */}
      <StyledTouchableOpacity onPress={handleSkip} className="py-3" activeOpacity={0.7}>
        <Caption className="text-white font-medium">Skip</Caption>
      </StyledTouchableOpacity>
    </StyledView>
  );
};
