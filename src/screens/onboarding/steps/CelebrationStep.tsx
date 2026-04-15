import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H2, Body } from '../../../components/ui';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';
import { lightHaptic } from '../../../utils/haptics';

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);

interface CelebrationStepProps {
  onNext: () => void;
  onBack: () => void;
  message?: string;
}

/**
 * A brief celebration interstitial that auto-advances after 1.5 seconds.
 * Used between onboarding sections to break up the flow and encourage completion.
 * Implemented as a real step component (not a setTimeout overlay) to avoid
 * timer-related freezes in React Native dev mode.
 */
export const CelebrationStep: React.FC<CelebrationStepProps> = ({ onNext, message }) => {
  useEffect(() => {
    lightHaptic();
    const timer = setTimeout(() => {
      onNext();
    }, 1125);
    return () => clearTimeout(timer);
  }, []);

  return (
    <StyledSafeAreaView edges={['top', 'bottom']} className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.screenBackground }}>
      <StyledView className="items-center px-8">
        <StyledView className="w-14 h-14 rounded-full items-center justify-center mb-5" style={{ backgroundColor: '#E8F5E9' }}>
          <EvaIcon name="checkmark-circle-2" variant="fill" size={32} color={COLORS.success} />
        </StyledView>
        <H2 style={{ textAlign: 'center', color: COLORS.text.primary }}>
          {message || "Looking good!"}
        </H2>
      </StyledView>
    </StyledSafeAreaView>
  );
};
