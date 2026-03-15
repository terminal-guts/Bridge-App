import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { DURATIONS } from '../../../constants/animations';
import { styled } from 'nativewind';
import { H1, Body, H3 } from '../../../components/ui';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';
import { OnboardingLayout } from '../../../components/onboarding/OnboardingLayout';

interface MatchmakerInviteStepProps {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const MatchmakerInviteStep: React.FC<MatchmakerInviteStepProps> = ({
  onNext,
  onBack,
}) => {
  const [selectedOption, setSelectedOption] = useState<'invite' | 'build' | null>(null);

  const handleContinue = () => {
    // In Phase 2, selecting either option will just proceed to the matchmaker home screen for now.
    // Ideally, "Invite" might open a modal or prompt, and "Build" might route to the ghost profile builder.
    // For this MVP onboard flow, passing through finishes onboarding.
    onNext();
  };

  const renderOption = (
    id: 'invite' | 'build',
    icon: string,
    title: string,
    description: string,
    delayMs: number
  ) => {
    const isSelected = selectedOption === id;
    return (
      <Animated.View entering={FadeInUp.duration(DURATIONS.normal).delay(delayMs)}>
        <StyledTouchableOpacity
          onPress={() => setSelectedOption(id)}
          className={`rounded-2xl p-5 mb-4 border-2 ${
            isSelected
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 bg-white'
          }`}
          activeOpacity={0.8}
        >
          <StyledView className="flex-row items-center">
            <StyledView
              className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                isSelected ? 'bg-primary-500' : 'bg-neutral-100'
              }`}
            >
              <EvaIcon
                name={icon}
                variant="outline"
                size={24}
                color={isSelected ? COLORS.card : COLORS.text.label}
              />
            </StyledView>
            <StyledView className="flex-1">
              <H3 className={isSelected ? 'text-primary-700' : 'text-neutral-900'}>
                {title}
              </H3>
              <Body className="text-neutral-500 text-sm mt-1">
                {description}
              </Body>
            </StyledView>
            {isSelected && (
              <StyledView className="ml-2">
                <EvaIcon name="checkmark-circle-2" variant="fill" size={24} color={COLORS.primaryAccent} />
              </StyledView>
            )}
          </StyledView>
        </StyledTouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <OnboardingLayout
      onBack={onBack}
      onContinue={handleContinue}
      continueDisabled={!selectedOption}
      continueLabel="Complete Setup"
      hasTextInput={false}
    >
      <StyledView className="mt-8 flex-1">
        <H1 className="mb-2">Add Your First Person</H1>
        <Body className="text-neutral-500 mb-8">
          Who are you going to set up? You can always add more people later.
        </Body>

        {renderOption(
          'invite',
          'paper-plane',
          'Invite a friend',
          "Send them a link. We'll build their profile together.",
          300
        )}

        {renderOption(
          'build',
          'edit-2',
          'Build their profile for them',
          "Write their bio, upload photos, and set their preferences.",
          450
        )}
      </StyledView>
    </OnboardingLayout>
  );
};
